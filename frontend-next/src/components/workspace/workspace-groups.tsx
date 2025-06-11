"use client"

import React, { useState, useMemo, useCallback, useEffect } from 'react';
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



    // Configure sensors for drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Note: Removed constrained drag to allow free movement during dragging



    // Queries with debugging
    const { data: workspacesResult, isLoading: workspacesLoading, dataUpdatedAt } = useWorkspaces(userId, 'WorkspaceGroups');
    const { data: groupsResult, isLoading: groupsLoading } = useWorkspaceGroups(userId);

    // CRITICAL DEBUG: Track when React Query refetches data
    console.log('🔄 REACT QUERY DEBUG:', {
        dataUpdatedAt: new Date(dataUpdatedAt).toISOString(),
        workspacesLoading,
        timestamp: new Date().toISOString()
    });
    // Mutations
    const moveWorkspaceMutation = useMoveWorkspaceToGroupOptimistic();
    const updateWorkspaceMutation = useUpdateWorkspace();
    const deleteWorkspaceMutation = useDeleteWorkspace();

    const serverWorkspaces = useMemo(() => workspacesResult?.workspaces || [], [workspacesResult]);
    const groups = useMemo(() => groupsResult?.groups || [], [groupsResult]);

    // Local state for visual feedback during drag and drop operations
    const [localWorkspacesForDrag, setLocalWorkspacesForDrag] = useState<Workspace[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    // Sync localWorkspacesForDrag with serverWorkspaces when not dragging.
    // This ensures that localWorkspacesForDrag is initialized correctly and updates
    // if serverWorkspaces changes while not in a drag operation.
    useEffect(() => {
        if (!isDragging) {
            setLocalWorkspacesForDrag(serverWorkspaces);
        }
    }, [serverWorkspaces, isDragging, setLocalWorkspacesForDrag]);

    // Organize workspaces by groups using localWorkspacesForDrag for responsive UI during drag operations.
    const { groupedWorkspaces, ungroupedWorkspaces } = useMemo(() => {
        const grouped: Record<string, Workspace[]> = {};
        const ungrouped: Workspace[] = [];

        localWorkspacesForDrag.forEach(workspace => {
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
            grouped[groupId].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        });

        ungrouped.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

        return {
            groupedWorkspaces: grouped,
            ungroupedWorkspaces: ungrouped
        };
    }, [localWorkspacesForDrag, groups]);

    // Global drag handlers for cross-group dragging
    const handleDragStart = (event: DragStartEvent) => {
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
        const activeWorkspace = localWorkspacesForDrag.find(w => w.id === activeId);
        if (!activeWorkspace) {
            console.log('❌ Active workspace not found:', activeId);
            return;
        }

        // Check if we're dropping on a container (empty group)
        if (overId.startsWith('droppable-')) {
            console.log('📦 Dropping on container:', overId);

            // Extract group ID from container ID
            const targetGroupId = overId === 'droppable-ungrouped' ? null : overId.replace('droppable-', '');
            const activeGroupId = activeWorkspace.groupId;

            console.log('📊 Container drop - Groups:', { activeGroupId, targetGroupId });

            // If moving to a different group, update the workspace
            if (activeGroupId !== targetGroupId) {
                console.log('🔄 Moving to different group via container');
                setLocalWorkspacesForDrag(prev => {
                    const newWorkspaces = [...prev];
                    const activeIndex = newWorkspaces.findIndex(w => w.id === activeId);
                    if (activeIndex !== -1) {
                        console.log('📝 Updating workspace group:', activeId, 'from', activeGroupId, 'to', targetGroupId);
                        newWorkspaces[activeIndex] = { ...newWorkspaces[activeIndex], groupId: targetGroupId };
                    }
                    return newWorkspaces;
                });
            }
            return;
        }

        // Find the over workspace (existing logic for workspace-to-workspace drops)
        const overWorkspace = localWorkspacesForDrag.find(w => w.id === overId);
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
            const groupWorkspaces = localWorkspacesForDrag.filter(w => w.groupId === activeGroupId);
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
                setLocalWorkspacesForDrag(prev => {
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

            setLocalWorkspacesForDrag(prev => {
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

        // setIsDragging(false); // Moved to the end of the function

        if (!over) {
            console.log('❌ No drop target - keeping current local state');
            setIsDragging(false); // Ensure isDragging is set on early exit
            return;
        }

        const activeId = active.id as string;
        const overId = over.id as string;

        // If dropping on itself, no change needed
        if (activeId === overId) {
            console.log('⏭️ Dropped on itself, no change needed');
            setIsDragging(false); // Ensure isDragging is set on early exit
            return;
        }

        // Find the workspace being dragged
        const activeWorkspace = localWorkspacesForDrag.find(w => w.id === activeId);
        if (!activeWorkspace) {
            console.log('❌ Active workspace not found:', activeId);
            setIsDragging(false);
            return;
        }

        let targetGroupId: string | null;
        let finalIndex: number;

        // Check if we're dropping on a container (empty group)
        if (overId.startsWith('droppable-')) {
            console.log('📦 Dropped on container:', overId);

            // Extract group ID from container ID
            targetGroupId = overId === 'droppable-ungrouped' ? null : overId.replace('droppable-', '');

            // For container drops, place at the end of the target group
            const targetWorkspaces = targetGroupId
                ? localWorkspacesForDrag.filter(w => w.groupId === targetGroupId)
                : localWorkspacesForDrag.filter(w => !w.groupId);

            finalIndex = targetWorkspaces.length;
            console.log('📍 Container drop - placing at end of group, index:', finalIndex);
        } else {
            // Find the target workspace (existing logic for workspace-to-workspace drops)
            const overWorkspace = localWorkspacesForDrag.find(w => w.id === overId);
            if (!overWorkspace) {
                console.log('❌ Over workspace not found:', overId);
                setIsDragging(false); // Ensure isDragging is set on early exit
                return;
            }

            targetGroupId = overWorkspace.groupId || null;

            // Get the final position from the current local state (after all drag over operations)
            const targetWorkspaces = targetGroupId
                ? localWorkspacesForDrag.filter(w => w.groupId === targetGroupId)
                : localWorkspacesForDrag.filter(w => !w.groupId);

            console.log('🎯 Target group workspaces:', targetWorkspaces.map(w => `${w.id}:${w.name}`));

            // Find the current position of the active workspace in the target group
            finalIndex = targetWorkspaces.findIndex(w => w.id === activeId);

            console.log('📍 Final index of dragged workspace:', finalIndex);

            if (finalIndex === -1) {
                console.log('❌ Could not find final position of dragged workspace');
                setIsDragging(false); // Ensure isDragging is set on early exit
                return;
            }
        }

        const currentGroupId = activeWorkspace.groupId || null;

        console.log('📊 Group change:', currentGroupId, '→', targetGroupId);

        // Only make API call if there's an actual change
        const originalActiveWorkspace = serverWorkspaces.find(w => w.id === activeId);
        const hasGroupChanged = currentGroupId !== targetGroupId;
        const originalIndex = originalActiveWorkspace ?
            (targetGroupId
                ? serverWorkspaces.filter(w => w.groupId === targetGroupId).findIndex(w => w.id === activeId)
                : serverWorkspaces.filter(w => !w.groupId).findIndex(w => w.id === activeId)
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

            // Make the API call with the final position
            handleWorkspaceMove(activeId, finalIndex, targetGroupId);
        } else {
            console.log('⏭️ No actual change detected, keeping current local state');
            // Keep the current local state - don't reset to server state
        }
        setIsDragging(false); // Set at the very end of the function
    };

    const handleAddWorkspace = useCallback((groupId: string | null) => {
        // Navigate to workspace creation with group context
        const url = groupId
            ? `/add/workspace?groupId=${groupId}`
            : '/add/workspace';
        navigationUtils.pushState(url);
    }, []);

    const handleWorkspaceMove = useCallback(async (workspaceId: string, newIndex: number, targetGroupId?: string | null) => {
        if (moveWorkspaceMutation.isPending) return;
        console.log(`🚀 Calling moveWorkspaceMutation: wsId=${workspaceId}, newIdx=${newIndex}, targetGrp=${targetGroupId}`);
        moveWorkspaceMutation.mutate({ userId, workspaceId, groupId: targetGroupId || null, sortOrder: newIndex }, {
            onSuccess: (data) => {
                console.log('✅ Workspace moved successfully (API):', data);
                // Optimistic update in the hook handles cache. No local state management needed here.
            },
            onError: (error: Error) => {
                console.error('❌ Error moving workspace (API):', error);
                setError(`Failed to move workspace: ${error.message}`);
                // Optimistic hook handles rollback in React Query cache.
                // localWorkspacesForDrag will be updated from serverWorkspaces (which reflects rollback) via the useEffect.
            }
        });
    }, [userId, moveWorkspaceMutation, setError]);

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

        if (serverWorkspaces.length <= 1) {
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

    if (isLoading && localWorkspacesForDrag.length === 0 && groups.length === 0) {
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
                <h1 className="text-2xl font-bold">Workspaces</h1>
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
            <div className="space-y-8 relative"> {/* Wrapper for DND content */}
                {/* Ungrouped workspaces */}
                <div className="space-y-4">
                    <SortableWorkspaceList
                        workspaces={ungroupedWorkspaces}
                        currentWorkspaceId={currentWorkspaceId}
                        onWorkspaceSelect={handleWorkspaceSelect}
                        onWorkspaceEdit={handleEditWorkspace}
                        onWorkspaceDelete={handleDeleteWorkspace}
                        onWorkspaceMove={handleWorkspaceMove}
                        onAddWorkspace={handleAddWorkspace}
                        groupId={null} 
                        className="border-transparent hover:border-border"
                    />
                </div>

                {/* Groups */}
                <div className="space-y-6"> {/* This div wraps the mapped groups */}
                    {groups.map((group) => (
                        <WorkspaceGroupCard
                            key={group.id}
                            group={group} 
                            workspaces={groupedWorkspaces[group.id] || []}
                            onWorkspaceSelect={handleWorkspaceSelect}
                            onWorkspaceEdit={handleEditWorkspace}
                            onWorkspaceDelete={handleDeleteWorkspace}
                            onWorkspaceMove={handleWorkspaceMove}
                            onAddWorkspace={handleAddWorkspace}
                            currentWorkspaceId={currentWorkspaceId} 
                            userId={userId} 
                        />
                    ))}
                </div> {/* Closes the "space-y-6" div for groups */}
            </div> {/* Closes "space-y-8 relative" DND content wrapper */}
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
                                    onChange={(e) => setEditingWorkspace(prevWorkspace => 
                                        prevWorkspace ? { ...prevWorkspace, name: e.target.value } : null
                                    )}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="workspace-rules">Rules/Instructions</Label>
                                <Textarea
                                    id="workspace-rules"
                                    value={editingWorkspace.workspaceRules}
                                    onChange={(e) => setEditingWorkspace(prevWorkspace => 
                                        prevWorkspace ? { ...prevWorkspace, workspaceRules: e.target.value } : null
                                    )}
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
                    userId={userId}
                    onClose={() => setShowOrganizeGroups(false)}
                />
            )}
        </div>
    );
}


