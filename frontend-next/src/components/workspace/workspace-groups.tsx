"use client"

import React, { useState, useMemo } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    closestCorners,
    DragOverlay,
    rectIntersection,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    horizontalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Settings2, Loader2 } from 'lucide-react';
import { useWorkspaces } from '@/lib/hooks/use-query-hooks';
import {
    useWorkspaceGroups,
    useCreateWorkspaceGroup,
    useReorderWorkspaceGroups,
    useMoveWorkspaceToGroup,
} from '@/lib/hooks/use-workspace-groups';
import { WorkspaceGroupCard } from './workspace-group-card';
import { WorkspaceCard } from './workspace-card';
import { CreateGroupDialog } from './create-group-dialog';
import { OrganizeGroupsDialog } from './organize-groups-dialog';
import { navigationUtils } from '@/lib/hooks/use-pathname';
import { useDroppable } from '@dnd-kit/core';

interface WorkspaceGroupsProps {
    userId: string;
    onWorkspaceSelect: (workspaceId: string) => void;
    currentWorkspaceId?: string | null;
    openWorkspace?: ((workspaceId: string) => void) | null;
}

interface DragData {
    type: 'workspace' | 'group';
    id: string;
    groupId?: string | null;
}

export function WorkspaceGroups({
    userId,
    onWorkspaceSelect,
    currentWorkspaceId,
    openWorkspace
}: WorkspaceGroupsProps) {
    const [activeId, setActiveId] = useState<string | null>(null);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showOrganizeGroups, setShowOrganizeGroups] = useState(false);

    // Queries
    const { data: workspacesResult, isLoading: workspacesLoading } = useWorkspaces(userId, 'WorkspaceGroups');
    const { data: groupsResult, isLoading: groupsLoading } = useWorkspaceGroups(userId);

    // Mutations
    const createGroupMutation = useCreateWorkspaceGroup();
    const reorderGroupsMutation = useReorderWorkspaceGroups();
    const moveWorkspaceMutation = useMoveWorkspaceToGroup();

    const workspaces = workspacesResult?.workspaces || [];
    const groups = groupsResult?.groups || [];

    // Organize workspaces by groups
    const { groupedWorkspaces, ungroupedWorkspaces } = useMemo(() => {
        const grouped: Record<string, any[]> = {};
        const ungrouped: any[] = [];

        workspaces.forEach(workspace => {
            if (workspace.groupId && groups.find(g => g.id === workspace.groupId)) {
                if (!grouped[workspace.groupId]) {
                    grouped[workspace.groupId] = [];
                }
                grouped[workspace.groupId].push(workspace);
            } else {
                ungrouped.push(workspace);
            }
        });

        // Sort workspaces within each group by sortOrder
        Object.keys(grouped).forEach(groupId => {
            grouped[groupId].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        });

        ungrouped.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        return {
            groupedWorkspaces: grouped,
            ungroupedWorkspaces: ungrouped
        };
    }, [workspaces, groups]);

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 3,
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        console.log('🚀 Drag started:', event.active.id, event.active.data.current);
        setActiveId(event.active.id as string);
    };

    const handleDragOver = (event: DragOverEvent) => {
        // Simple drag over handling - just for visual feedback
        const { active, over } = event;
        if (!over) return;
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        console.log('🎯 Drag ended:', {
            active: active.id,
            activeData: active.data.current,
            over: over?.id,
            overData: over?.data.current
        });
        setActiveId(null);

        if (!over || active.id === over.id) {
            console.log('❌ No valid drop target');
            return;
        }

        const activeData = active.data.current as DragData;
        const overData = over.data.current as DragData;

        try {
            if (activeData?.type === 'workspace') {
                // Moving workspace
                const workspaceId = active.id as string;
                let newGroupId: string | null = null;
                let newSortOrder = 0;

                console.log('📍 Processing workspace drop:', { overData, overId: over.id });

                if (overData?.type === 'group') {
                    // Dropped on a group
                    newGroupId = over.id as string;
                    const groupWorkspaces = groupedWorkspaces[newGroupId] || [];
                    newSortOrder = groupWorkspaces.length;
                    console.log('📦 Dropped on group:', newGroupId);
                } else if (overData?.type === 'workspace') {
                    // Dropped on another workspace
                    const targetWorkspace = workspaces.find(w => w.id === over.id);
                    if (targetWorkspace) {
                        newGroupId = targetWorkspace.groupId || null;
                        newSortOrder = (targetWorkspace.sortOrder || 0) + 1;
                        console.log('🎯 Dropped on workspace:', targetWorkspace.id, 'in group:', newGroupId);
                    }
                } else if (over.id === 'ungrouped-zone' || overData?.type === 'ungrouped-zone') {
                    // Dropped on ungrouped area
                    newGroupId = null;
                    newSortOrder = ungroupedWorkspaces.length;
                    console.log('🏠 Dropped on ungrouped zone');
                } else {
                    console.log('❓ Unknown drop target, defaulting to ungrouped');
                    newGroupId = null;
                    newSortOrder = ungroupedWorkspaces.length;
                }

                console.log('🚀 Moving workspace:', { workspaceId, newGroupId, newSortOrder });

                await moveWorkspaceMutation.mutateAsync({
                    userId,
                    workspaceId,
                    groupId: newGroupId,
                    sortOrder: newSortOrder
                });
            } else if (activeData?.type === 'group' && overData?.type === 'group') {
                // Reordering groups
                const activeGroupIndex = groups.findIndex(g => g.id === active.id);
                const overGroupIndex = groups.findIndex(g => g.id === over.id);

                if (activeGroupIndex !== -1 && overGroupIndex !== -1 && activeGroupIndex !== overGroupIndex) {
                    const newGroups = [...groups];
                    const [movedGroup] = newGroups.splice(activeGroupIndex, 1);
                    newGroups.splice(overGroupIndex, 0, movedGroup);

                    const groupOrders = newGroups.map((group, index) => ({
                        groupId: group.id,
                        sortOrder: index
                    }));

                    await reorderGroupsMutation.mutateAsync({
                        userId,
                        groupOrders
                    });
                }
            }
        } catch (error) {
            console.error('Error handling drag end:', error);
        }
    };

    const handleWorkspaceSelect = async (workspaceId: string) => {
        if (workspaceId === currentWorkspaceId) {
            onWorkspaceSelect(workspaceId);
            return;
        }

        try {
            if (openWorkspace) {
                openWorkspace(workspaceId);
                onWorkspaceSelect(workspaceId);
            } else {
                onWorkspaceSelect(workspaceId);
            }
        } catch (error) {
            console.error('Error selecting workspace:', error);
        }
    };

    const isLoading = workspacesLoading || groupsLoading;

    if (isLoading && workspaces.length === 0 && groups.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with buttons */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Select Workspace</h1>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCreateGroup(true)}
                        className="gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        New Group
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowOrganizeGroups(true)}
                        className="gap-2"
                    >
                        <Settings2 className="h-4 w-4" />
                        Organize
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => navigationUtils.pushState('/add/workspace')}
                        className="gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add Workspace
                    </Button>
                </div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="space-y-8">
                    {/* Groups */}
                    <SortableContext items={groups.map(g => g.id)} strategy={verticalListSortingStrategy}>
                        {groups.map((group) => (
                            <WorkspaceGroupCard
                                key={group.id}
                                group={group}
                                workspaces={groupedWorkspaces[group.id] || []}
                                onWorkspaceSelect={handleWorkspaceSelect}
                                currentWorkspaceId={currentWorkspaceId}
                                userId={userId}
                            />
                        ))}
                    </SortableContext>

                    {/* Ungrouped workspaces */}
                    <UngroupedWorkspacesSection
                        workspaces={ungroupedWorkspaces}
                        onWorkspaceSelect={handleWorkspaceSelect}
                        currentWorkspaceId={currentWorkspaceId}
                    />
                </div>

                <DragOverlay>
                    {activeId ? (
                        <div className="opacity-50">
                            {/* Render dragged item preview */}
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Dialogs */}
            <CreateGroupDialog
                open={showCreateGroup}
                onOpenChange={setShowCreateGroup}
                userId={userId}
            />

            <OrganizeGroupsDialog
                open={showOrganizeGroups}
                onOpenChange={setShowOrganizeGroups}
                userId={userId}
                groups={groups}
            />
        </div>
    );
}

// Ungrouped workspaces section with drop zone
interface UngroupedWorkspacesSectionProps {
    workspaces: any[];
    onWorkspaceSelect: (workspaceId: string) => void;
    currentWorkspaceId?: string | null;
}

function UngroupedWorkspacesSection({
    workspaces,
    onWorkspaceSelect,
    currentWorkspaceId
}: UngroupedWorkspacesSectionProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: 'ungrouped-zone',
        data: {
            type: 'ungrouped-zone'
        }
    });

    if (workspaces.length === 0) {
        return (
            <div
                ref={setNodeRef}
                className={`space-y-4 min-h-[120px] p-6 border-2 border-dashed rounded-lg transition-colors ${isOver
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                    }`}
            >
                <h3 className="text-lg font-semibold text-muted-foreground">Ungrouped</h3>
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <p>Drop workspaces here to ungroup them</p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            className={`space-y-4 p-4 rounded-lg transition-colors ${isOver ? 'bg-primary/5' : ''
                }`}
        >
            <h3 className="text-lg font-semibold text-muted-foreground">Ungrouped</h3>
            <SortableContext items={workspaces.map(w => w.id)} strategy={horizontalListSortingStrategy}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {workspaces.map((workspace) => (
                        <WorkspaceCard
                            key={workspace.id}
                            workspace={workspace}
                            onSelect={onWorkspaceSelect}
                            isActive={workspace.id === currentWorkspaceId}
                        />
                    ))}
                </div>
            </SortableContext>
        </div>
    );
}
