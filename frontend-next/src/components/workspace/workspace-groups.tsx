"use client"

import React, { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Button } from '@/components/ui/button';

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

interface WorkspaceGroupsProps {
    userId: string;
    onWorkspaceSelect: (workspaceId: string) => void;
    currentWorkspaceId?: string | null;
    openWorkspace?: ((workspaceId: string) => void) | null;
}



export function WorkspaceGroups({
    userId,
    onWorkspaceSelect,
    currentWorkspaceId,
    openWorkspace
}: WorkspaceGroupsProps) {
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showOrganizeGroups, setShowOrganizeGroups] = useState(false);

    // Queries
    const { data: workspacesResult, isLoading: workspacesLoading } = useWorkspaces(userId, 'WorkspaceGroups');
    const { data: groupsResult, isLoading: groupsLoading } = useWorkspaceGroups(userId);

    // Mutations
    const reorderGroupsMutation = useReorderWorkspaceGroups();
    const moveWorkspaceMutation = useMoveWorkspaceToGroup();

    const workspaces = workspacesResult?.workspaces || [];
    const groups = groupsResult?.groups || [];

    // Organize workspaces by groups
    const { groupedWorkspaces, ungroupedWorkspaces } = useMemo(() => {
        const grouped: Record<string, typeof workspaces> = {};
        const ungrouped: typeof workspaces = [];

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

    const handleDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        // If no destination, do nothing
        if (!destination) return;

        // If dropped in the same position, do nothing
        if (destination.droppableId === source.droppableId && destination.index === source.index) {
            return;
        }

        try {
            // Determine if this is a group or workspace drag based on draggable ID
            if (draggableId.startsWith('group-')) {
                // Reordering groups
                const newGroups = [...groups];
                const [movedGroup] = newGroups.splice(source.index, 1);
                newGroups.splice(destination.index, 0, movedGroup);

                const groupOrders = newGroups.map((group, index) => ({
                    groupId: group.id,
                    sortOrder: index
                }));

                await reorderGroupsMutation.mutateAsync({
                    userId,
                    groupOrders
                });
            } else if (draggableId.startsWith('workspace-')) {
                // Moving workspace (between groups or to/from ungrouped)
                const workspaceId = draggableId.replace('workspace-', '');
                let newGroupId: string | null = null;
                const newSortOrder = destination.index;

                if (destination.droppableId === 'ungrouped') {
                    newGroupId = null;
                } else if (destination.droppableId.startsWith('group-')) {
                    newGroupId = destination.droppableId.replace('group-', '');
                }

                console.log('🚀 Moving workspace:', { workspaceId, newGroupId, newSortOrder });

                await moveWorkspaceMutation.mutateAsync({
                    userId,
                    workspaceId,
                    groupId: newGroupId,
                    sortOrder: newSortOrder
                });
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

            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="space-y-8">
                    {/* Groups */}
                    <Droppable 
                        droppableId="groups" 
                        type="group" 
                        isDropDisabled={false} 
                        isCombineEnabled={false}
                        ignoreContainerClipping={false}
                    >
                        {(provided) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="space-y-6"
                            >
                                {groups.map((group, index) => (
                                    <Draggable
                                        key={group.id}
                                        draggableId={`group-${group.id}`}
                                        index={index}
                                    >
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className={snapshot.isDragging ? 'opacity-50' : ''}
                                            >
                                                <WorkspaceGroupCard
                                                    group={group}
                                                    workspaces={groupedWorkspaces[group.id] || []}
                                                    onWorkspaceSelect={handleWorkspaceSelect}
                                                    currentWorkspaceId={currentWorkspaceId}
                                                    userId={userId}
                                                    dragHandleProps={provided.dragHandleProps}
                                                />
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>

                    {/* Ungrouped workspaces */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-muted-foreground">Ungrouped</h3>
                        <Droppable 
                            droppableId="ungrouped" 
                            type="workspace" 
                            direction="horizontal" 
                            isDropDisabled={false} 
                            isCombineEnabled={false}
                            ignoreContainerClipping={false}
                        >
                            {(provided, snapshot) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 min-h-[120px] p-4 rounded-lg border-2 border-dashed transition-colors ${snapshot.isDraggingOver
                                        ? 'border-primary bg-primary/5'
                                        : 'border-muted-foreground/25'
                                        }`}
                                >
                                    {ungroupedWorkspaces.length === 0 && (
                                        <div className="col-span-full flex items-center justify-center py-8 text-muted-foreground">
                                            <p>Drop workspaces here to ungroup them</p>
                                        </div>
                                    )}
                                    {ungroupedWorkspaces.map((workspace, index) => (
                                        <Draggable
                                            key={workspace.id}
                                            draggableId={`workspace-${workspace.id}`}
                                            index={index}
                                        >
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    className={snapshot.isDragging ? 'opacity-50' : ''}
                                                >
                                                    <WorkspaceCard
                                                        workspace={workspace}
                                                        onSelect={handleWorkspaceSelect}
                                                        isActive={workspace.id === currentWorkspaceId}
                                                    />
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>
                </div>
            </DragDropContext>

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


