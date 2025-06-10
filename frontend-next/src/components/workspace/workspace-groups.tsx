"use client"

import React, { useState, useMemo } from 'react';
import { DragDropContext, Draggable, DropResult } from 'react-beautiful-dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { Plus, Settings2, Loader2 } from 'lucide-react';
import { useWorkspaces, useUpdateWorkspace, useDeleteWorkspace } from '@/lib/hooks/use-query-hooks';
import {
    useWorkspaceGroups,
    useMoveWorkspaceToGroup,
} from '@/lib/hooks/use-workspace-groups';
import { WorkspaceGroupCard } from './workspace-group-card';
import { WorkspaceCard } from './workspace-card';
import { CreateGroupDialog } from './create-group-dialog';
import { OrganizeGroupsDialog } from './organize-groups-dialog';
import { navigationUtils } from '@/lib/hooks/use-pathname';
import { StrictModeDroppable } from './strict-mode-droppable';


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

    // Note: Removed constrained drag to allow free movement during dragging



    // Queries
    const { data: workspacesResult, isLoading: workspacesLoading } = useWorkspaces(userId, 'WorkspaceGroups');
    const { data: groupsResult, isLoading: groupsLoading } = useWorkspaceGroups(userId);

    // Mutations
    const moveWorkspaceMutation = useMoveWorkspaceToGroup();
    const updateWorkspaceMutation = useUpdateWorkspace();
    const deleteWorkspaceMutation = useDeleteWorkspace();

    const workspaces = useMemo(() => workspacesResult?.workspaces || [], [workspacesResult]);
    const groups = useMemo(() => groupsResult?.groups || [], [groupsResult]);

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

        console.log('🎯 Drag end:', { destination, source, draggableId });
        console.log('📊 Available groups:', groups.map(g => g.id));
        console.log('📊 Available workspaces:', workspaces.map(w => w.id));

        // If no destination, do nothing
        if (!destination) return;

        // If dropped in the same position, do nothing
        if (destination.droppableId === source.droppableId && destination.index === source.index) {
            return;
        }

        try {
            // Moving workspace (between groups or to/from ungrouped)
            const workspaceId = draggableId;
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

    const handleEditWorkspace = (workspace: Workspace) => {
        setEditingWorkspace(workspace);
    };

    const handleDeleteWorkspace = (workspaceId: string) => {
        setDeletingWorkspaceId(workspaceId);
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
            // Maybe show a toast message here
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

    if (isLoading && workspaces.length === 0 && groups.length === 0) {
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

            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="space-y-8 relative">
                    {/* Ungrouped workspaces */}
                    <div className="space-y-4">
                        <StrictModeDroppable
                            droppableId="ungrouped"
                            type="workspace"
                            direction="vertical"
                            isDropDisabled={false}
                            isCombineEnabled={false}
                            ignoreContainerClipping={true}
                        >
                            {(provided, snapshot) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className={`workspace-grid min-h-[100px] p-4 rounded-lg border-2 border-dashed transition-all ${snapshot.isDraggingOver
                                        ? 'bg-primary/5 border-primary/30'
                                        : 'border-transparent'
                                        }`}
                                    style={{
                                        position: 'relative'
                                    }}
                                >
                                    {ungroupedWorkspaces.map((workspace, index) => (
                                        <Draggable
                                            key={workspace.id}
                                            draggableId={workspace.id}
                                            index={index}
                                            isDragDisabled={false}
                                        >
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    className={`workspace-card transition-all ${snapshot.isDragging ? 'opacity-50 z-50 shadow-2xl scale-105' : ''}`}
                                                    style={provided.draggableProps.style}
                                                >
                                                    <WorkspaceCard
                                                        workspace={workspace}
                                                        onSelect={handleWorkspaceSelect}
                                                        onEdit={handleEditWorkspace}
                                                        onDelete={handleDeleteWorkspace}
                                                        isActive={workspace.id === currentWorkspaceId}
                                                    />
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </StrictModeDroppable>
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
                                currentWorkspaceId={currentWorkspaceId}
                                userId={userId}
                            />
                        ))}
                    </div>
                </div>
            </DragDropContext>

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

            {showCreateGroup && (
                <CreateGroupDialog
                    userId={userId}
                    onClose={() => setShowCreateGroup(false)}
                />
            )}

            {showOrganizeGroups && (
                <OrganizeGroupsDialog
                    userId={userId}
                    groups={groups}
                    onClose={() => setShowOrganizeGroups(false)}
                />
            )}
        </div>
    );
}


