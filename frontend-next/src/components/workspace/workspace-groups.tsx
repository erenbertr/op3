"use client"

import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { Plus, Settings2, Loader2 } from 'lucide-react';
import { useWorkspaces, useUpdateWorkspace, useDeleteWorkspace } from '@/lib/hooks/use-query-hooks';
import {
    useWorkspaceGroups,
    useMoveWorkspaceToGroupOptimistic,
} from '@/lib/hooks/use-workspace-groups';
import { WorkspaceGroupCard } from './workspace-group-card';
import { CreateGroupDialog } from './create-group-dialog';
import { OrganizeGroupsDialog } from './organize-groups-dialog';
import { SortableWorkspaceList } from './sortable-workspace-list';
import { navigationUtils } from '@/lib/hooks/use-pathname';
import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    rectIntersection,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';


// Helper type, can be moved to a types file if needed
type Workspace = {
    id: string;
    name: string;
    templateType: string;
    workspaceRules: string;
    isActive: boolean;
    createdAt: string;
    groupId?: string | null;
    sortOrder?: number;
};

interface WorkspaceGroupsProps {
    userId: string;
    onWorkspaceSelect: (workspaceId: string) => void;
    currentWorkspaceId?: string | null;
    openWorkspace?: ((workspaceId: string) => void) | null;
    onWorkspaceUpdated: () => void;
    onWorkspaceDeleted: () => void;
}

export function WorkspaceGroups({
    userId,
    onWorkspaceSelect,
    currentWorkspaceId,
    openWorkspace,
    onWorkspaceUpdated,
    onWorkspaceDeleted
}: WorkspaceGroupsProps) {
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showOrganizeGroups, setShowOrganizeGroups] = useState(false);
    const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
    const [deletingWorkspaceId, setDeletingWorkspaceId] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [activeId, setActiveId] = useState<string | null>(null);

    // Configure sensors for drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Note: Removed constrained drag to allow free movement during dragging



    // Queries
    const { data: workspacesResult, isLoading: workspacesLoading } = useWorkspaces(userId, 'WorkspaceGroups');
    const { data: groupsResult, isLoading: groupsLoading } = useWorkspaceGroups(userId);

    // Mutations
    const moveWorkspaceMutation = useMoveWorkspaceToGroupOptimistic();
    const updateWorkspaceMutation = useUpdateWorkspace();
    const deleteWorkspaceMutation = useDeleteWorkspace();

    const workspaces = useMemo(() => workspacesResult?.workspaces || [], [workspacesResult]);
    const groups = useMemo(() => groupsResult?.groups || [], [groupsResult]);

    // Local state for real-time drag feedback during drag operations only
    const [localWorkspaces, setLocalWorkspaces] = useState(workspaces);
    const [isDragging, setIsDragging] = useState(false);
    const [pendingMoveId, setPendingMoveId] = useState<string | null>(null);

    // Update local workspaces when props change, but only when not dragging and no pending moves
    React.useEffect(() => {
        console.log('🔄 useEffect triggered:', {
            isDragging,
            pendingMoveId,
            workspacesLength: workspaces.length,
            localWorkspacesLength: localWorkspaces.length
        });

        if (!isDragging && !pendingMoveId) {
            console.log('✅ Updating local workspaces from server data');
            console.log('📝 Server workspaces:', workspaces.map(w => `${w.id}:${w.name}:${w.groupId}`));
            setLocalWorkspaces(workspaces);
        } else {
            console.log('⏭️ Skipping local workspace update:', { isDragging, pendingMoveId });
        }
    }, [workspaces, isDragging, pendingMoveId, localWorkspaces.length]);

    // Organize workspaces by groups (using localWorkspaces for real-time updates)
    const { groupedWorkspaces, ungroupedWorkspaces } = useMemo(() => {
        const grouped: Record<string, typeof localWorkspaces> = {};
        const ungrouped: typeof localWorkspaces = [];

        localWorkspaces.forEach(workspace => {
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
    }, [localWorkspaces, groups]);

    // Global drag handlers for cross-group dragging
    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
        setIsDragging(true);
        console.log('Global drag started:', event.active.id);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        console.log('🔄 DRAG OVER:', activeId, '→', overId);

        // Find the active workspace
        const activeWorkspace = localWorkspaces.find(w => w.id === activeId);
        if (!activeWorkspace) {
            console.log('❌ Active workspace not found:', activeId);
            return;
        }

        // Find the over workspace
        const overWorkspace = localWorkspaces.find(w => w.id === overId);
        if (!overWorkspace) {
            console.log('❌ Over workspace not found:', overId);
            return;
        }

        // If they're the same, no need to do anything
        if (activeId === overId) {
            console.log('⏭️ Same workspace, skipping');
            return;
        }

        const activeGroupId = activeWorkspace.groupId;
        const overGroupId = overWorkspace.groupId;

        console.log('📊 Groups:', { activeGroupId, overGroupId });

        // If moving within the same group, reorder
        if (activeGroupId === overGroupId) {
            console.log('🔄 Same group move');
            // Get all workspaces in this group
            const groupWorkspaces = localWorkspaces.filter(w => w.groupId === activeGroupId);
            const activeIndex = groupWorkspaces.findIndex(w => w.id === activeId);
            const overIndex = groupWorkspaces.findIndex(w => w.id === overId);

            console.log('📍 Indices:', { activeIndex, overIndex });

            if (activeIndex !== overIndex) {
                console.log('✅ Reordering within group with arrayMove');
                // Reorder within the group
                const reorderedGroupWorkspaces = arrayMove(groupWorkspaces, activeIndex, overIndex);

                console.log('📝 Before reorder:', groupWorkspaces.map(w => `${w.id}:${w.name}`));
                console.log('📝 After reorder:', reorderedGroupWorkspaces.map(w => `${w.id}:${w.name}`));

                // Update the local workspaces with the new order
                setLocalWorkspaces(prev => {
                    const newWorkspaces = [...prev];
                    // Remove all workspaces from this group
                    const otherWorkspaces = newWorkspaces.filter(w => w.groupId !== activeGroupId);
                    // Add back the reordered group workspaces
                    const result = [...otherWorkspaces, ...reorderedGroupWorkspaces];
                    console.log('🔄 Updated local workspaces:', result.map(w => `${w.id}:${w.name}:${w.groupId}`));
                    return result;
                });
            } else {
                console.log('⏭️ Same position, no reorder needed');
            }
        } else {
            console.log('🔄 Cross-group move');
            // Moving between different groups
            // Move the workspace to the new group at the position of the over workspace

            setLocalWorkspaces(prev => {
                const newWorkspaces = [...prev];
                // Find and update the active workspace's group
                const activeIndex = newWorkspaces.findIndex(w => w.id === activeId);
                if (activeIndex !== -1) {
                    console.log('📝 Updating workspace group:', activeId, 'from', activeGroupId, 'to', overGroupId);
                    newWorkspaces[activeIndex] = { ...newWorkspaces[activeIndex], groupId: overGroupId };
                }

                // Reorder within the target group
                const updatedGroupWorkspaces = newWorkspaces.filter(w => w.groupId === overGroupId);
                const newActiveIndex = updatedGroupWorkspaces.findIndex(w => w.id === activeId);
                const newOverIndex = updatedGroupWorkspaces.findIndex(w => w.id === overId);

                console.log('📍 Cross-group indices:', { newActiveIndex, newOverIndex });

                if (newActiveIndex !== -1 && newOverIndex !== -1) {
                    console.log('✅ Reordering within target group');
                    const reorderedGroupWorkspaces = arrayMove(updatedGroupWorkspaces, newActiveIndex, newOverIndex);
                    // Update the full workspace list
                    const otherWorkspaces = newWorkspaces.filter(w => w.groupId !== overGroupId);
                    const result = [...otherWorkspaces, ...reorderedGroupWorkspaces];
                    console.log('🔄 Updated local workspaces (cross-group):', result.map(w => `${w.id}:${w.name}:${w.groupId}`));
                    return result;
                }

                console.log('🔄 Updated local workspaces (group change only):', newWorkspaces.map(w => `${w.id}:${w.name}:${w.groupId}`));
                return newWorkspaces;
            });
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        console.log('🏁 DRAG END:', active.id, '→', over?.id || 'NO TARGET');

        setActiveId(null);
        setIsDragging(false);

        if (!over) {
            console.log('❌ No drop target - resetting local state');
            setLocalWorkspaces(workspaces);
            return;
        }

        const activeId = active.id as string;
        const overId = over.id as string;

        // If dropping on itself, no change needed
        if (activeId === overId) {
            console.log('⏭️ Dropped on itself, no change needed');
            return;
        }

        // Find the workspace being dragged and the target workspace
        const activeWorkspace = localWorkspaces.find(w => w.id === activeId);
        const overWorkspace = localWorkspaces.find(w => w.id === overId);

        if (!activeWorkspace || !overWorkspace) {
            console.log('❌ Could not find workspaces:', { activeWorkspace: !!activeWorkspace, overWorkspace: !!overWorkspace });
            setLocalWorkspaces(workspaces);
            return;
        }

        const targetGroupId = overWorkspace.groupId || null;
        const currentGroupId = activeWorkspace.groupId || null;

        console.log('📊 Group change:', currentGroupId, '→', targetGroupId);

        // Get the final position from the current local state (after all drag over operations)
        const targetWorkspaces = targetGroupId
            ? localWorkspaces.filter(w => w.groupId === targetGroupId)
            : localWorkspaces.filter(w => !w.groupId);

        console.log('🎯 Target group workspaces:', targetWorkspaces.map(w => `${w.id}:${w.name}`));

        // Find the current position of the active workspace in the target group
        const finalIndex = targetWorkspaces.findIndex(w => w.id === activeId);

        console.log('📍 Final index of dragged workspace:', finalIndex);

        if (finalIndex === -1) {
            console.log('❌ Could not find final position of dragged workspace');
            setLocalWorkspaces(workspaces);
            return;
        }

        // Only make API call if there's an actual change
        const originalActiveWorkspace = workspaces.find(w => w.id === activeId);
        const hasGroupChanged = currentGroupId !== targetGroupId;
        const originalIndex = originalActiveWorkspace ?
            (targetGroupId
                ? workspaces.filter(w => w.groupId === targetGroupId).findIndex(w => w.id === activeId)
                : workspaces.filter(w => !w.groupId).findIndex(w => w.id === activeId)
            ) : -1;
        const hasPositionChanged = finalIndex !== originalIndex;

        console.log('🔍 Change detection:', {
            hasGroupChanged,
            hasPositionChanged,
            originalIndex,
            finalIndex,
            currentGroupId,
            targetGroupId
        });

        if (hasGroupChanged || hasPositionChanged) {
            console.log('✅ MAKING API CALL - Moving workspace:', activeId, 'to group:', targetGroupId, 'at final index:', finalIndex);

            // Set pending move to prevent local state from being overwritten
            setPendingMoveId(activeId);

            // Make the API call with the final position
            handleWorkspaceMove(activeId, finalIndex, targetGroupId);
        } else {
            console.log('⏭️ No actual change detected, resetting local state');
            setLocalWorkspaces(workspaces);
        }
    };

    const handleWorkspaceMove = useCallback(async (workspaceId: string, newIndex: number, targetGroupId?: string | null) => {
        console.log('🚀 API CALL - Moving workspace:', { workspaceId, targetGroupId, newIndex });

        // Prevent multiple simultaneous moves of the same workspace
        if (moveWorkspaceMutation.isPending) {
            console.log('⏳ Move already in progress, skipping...');
            return;
        }

        console.log('📤 Sending mutation with data:', {
            userId,
            workspaceId,
            groupId: targetGroupId || null,
            sortOrder: newIndex
        });

        // Use React Query's optimistic updates - no manual state management needed
        moveWorkspaceMutation.mutate({
            userId,
            workspaceId,
            groupId: targetGroupId || null,
            sortOrder: newIndex
        }, {
            onSuccess: () => {
                console.log('✅ API SUCCESS - Workspace move completed successfully');
                console.log('⏰ Setting timeout to clear pending move in 200ms');
                // Clear pending move to allow local state to sync with server
                setTimeout(() => {
                    console.log('🔄 Clearing pending move, allowing state sync');
                    setPendingMoveId(null);
                }, 200); // Small delay to ensure server data has been refetched
            },
            onError: (error) => {
                console.error('❌ API ERROR - Workspace move failed:', error);
                console.log('🔄 Clearing pending move and resetting to server state');
                // Clear pending move and reset to server state
                setPendingMoveId(null);
                setLocalWorkspaces(workspaces);
            }
        });
    }, [userId, moveWorkspaceMutation, setPendingMoveId, workspaces]);

    const handleWorkspaceSelect = async (workspace: Workspace) => {
        const workspaceId = workspace.id;
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

    const handleEditWorkspace = (workspace: Workspace) => {
        setEditingWorkspace(workspace);
    };

    const handleDeleteWorkspace = (workspace: Workspace) => {
        setDeletingWorkspaceId(workspace.id);
    };

    const handleSaveEdit = async () => {
        if (!editingWorkspace) return;

        if (!editingWorkspace.name.trim()) {
            setError('Workspace name cannot be empty');
            return;
        }

        setError('');

        updateWorkspaceMutation.mutate(
            {
                workspaceId: editingWorkspace.id,
                name: editingWorkspace.name.trim(),
                workspaceRules: editingWorkspace.workspaceRules,
                userId
            },
            {
                onSuccess: (result) => {
                    if (result.success) {
                        setEditingWorkspace(null);
                        onWorkspaceUpdated();
                    } else {
                        setError(result.message || 'Failed to update workspace');
                    }
                },
                onError: (error) => {
                    console.error('Error updating workspace:', error);
                    setError('Failed to update workspace');
                }
            }
        );
    };

    const confirmDelete = async () => {
        if (!deletingWorkspaceId) return;

        if (workspaces.length <= 1) {
            setError('Cannot delete the last workspace. Users must have at least one workspace.');
            setDeletingWorkspaceId(null);
            return;
        }

        setError('');

        deleteWorkspaceMutation.mutate(
            { workspaceId: deletingWorkspaceId, userId },
            {
                onSuccess: (result) => {
                    if (result.success) {
                        setDeletingWorkspaceId(null);
                        onWorkspaceDeleted();
                    } else {
                        setError(result.message || 'Failed to delete workspace');
                    }
                },
                onError: (error) => {
                    console.error('Error deleting workspace:', error);
                    setError('Failed to delete workspace');
                }
            }
        );
    };

    const isLoading = workspacesLoading || groupsLoading;

    if (isLoading && localWorkspaces.length === 0 && groups.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="workspace-container space-y-6">
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
                collisionDetection={rectIntersection}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="space-y-8 relative">
                    {/* Ungrouped workspaces */}
                    <div className="space-y-4">
                        <SortableWorkspaceList
                            workspaces={ungroupedWorkspaces}
                            currentWorkspaceId={currentWorkspaceId}
                            onWorkspaceSelect={handleWorkspaceSelect}
                            onWorkspaceEdit={handleEditWorkspace}
                            onWorkspaceDelete={handleDeleteWorkspace}
                            onWorkspaceMove={handleWorkspaceMove}
                            groupId={null}
                            className="border-transparent hover:border-border"
                        />
                    </div>

                    {/* Groups */}
                    <div className="space-y-6">
                        {groups.map((group) => (
                            <WorkspaceGroupCard
                                key={group.id}
                                group={group}
                                workspaces={groupedWorkspaces[group.id] || []}
                                onWorkspaceSelect={handleWorkspaceSelect}
                                onWorkspaceEdit={handleEditWorkspace}
                                onWorkspaceDelete={handleDeleteWorkspace}
                                onWorkspaceMove={handleWorkspaceMove}
                                currentWorkspaceId={currentWorkspaceId}
                                userId={userId}
                            />
                        ))}
                    </div>
                </div>


            </DndContext>

            {/* Edit Workspace Dialog */}
            <Dialog open={!!editingWorkspace} onOpenChange={(open) => !open && setEditingWorkspace(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Workspace</DialogTitle>
                    </DialogHeader>
                    {editingWorkspace && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="workspace-name">Workspace Name</Label>
                                <Input
                                    id="workspace-name"
                                    value={editingWorkspace.name}
                                    onChange={(e) => setEditingWorkspace({ ...editingWorkspace, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="workspace-rules">Rules/Instructions</Label>
                                <Textarea
                                    id="workspace-rules"
                                    value={editingWorkspace.workspaceRules}
                                    onChange={(e) => setEditingWorkspace({ ...editingWorkspace, workspaceRules: e.target.value })}
                                    className="min-h-[150px]"
                                />
                            </div>
                            {error && <p className="text-sm text-destructive">{error}</p>}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingWorkspace(null)}>Cancel</Button>
                        <Button onClick={handleSaveEdit} disabled={updateWorkspaceMutation.isPending}>
                            {updateWorkspaceMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Workspace Confirmation Dialog */}
            <Dialog open={!!deletingWorkspaceId} onOpenChange={(open) => !open && setDeletingWorkspaceId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Workspace</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this workspace? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    {error && <p className="text-sm text-destructive mt-4">{error}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingWorkspaceId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={deleteWorkspaceMutation.isPending}>
                            {deleteWorkspaceMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <CreateGroupDialog
                open={showCreateGroup}
                onOpenChange={setShowCreateGroup}
                userId={userId}
            />

            {showOrganizeGroups && (
                <OrganizeGroupsDialog
                    groups={groups}
                    onClose={() => setShowOrganizeGroups(false)}
                />
            )}
        </div>
    );
}


