"use client"

import React, { useState } from 'react';
import { CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoreHorizontal, Edit2, Trash2, Check, X, Pin, PinOff } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SortableWorkspaceList } from './sortable-workspace-list';
import { useUpdateWorkspaceGroup, useDeleteWorkspaceGroup, useDeleteWorkspaceGroupWithWorkspaces, usePinWorkspaceGroup } from '@/lib/hooks/use-workspace-groups';
import { DeleteGroupDialog } from './delete-group-dialog';

type Workspace = {
    id: string;
    name: string;
    workspaceRules: string;
    templateType: string;
    isActive: boolean;
    createdAt: string;
    groupId?: string | null;
    sortOrder?: number;
};

interface WorkspaceGroupCardProps {
    group: {
        id: string;
        name: string;
        sortOrder: number;
        isPinned: boolean;
        createdAt: string;
        workspaceCount: number;
    };
    workspaces: Workspace[];
    onWorkspaceSelect: (workspace: Workspace) => void;
    onWorkspaceEdit: (workspace: Workspace) => void;
    onWorkspaceDelete: (workspace: Workspace) => void;
    onWorkspaceMove: (workspaceId: string, newIndex: number, targetGroupId?: string | null) => void;
    onAddWorkspace?: (groupId: string | null) => void;
    currentWorkspaceId?: string | null;
    userId: string;
}

export function WorkspaceGroupCard({
    group,
    workspaces,
    onWorkspaceSelect,
    onWorkspaceEdit,
    onWorkspaceDelete,
    onWorkspaceMove,
    onAddWorkspace,
    currentWorkspaceId,
    userId
}: WorkspaceGroupCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(group.name);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const updateGroupMutation = useUpdateWorkspaceGroup();
    const deleteGroupMutation = useDeleteWorkspaceGroup();
    const deleteGroupWithWorkspacesMutation = useDeleteWorkspaceGroupWithWorkspaces();
    const pinGroupMutation = usePinWorkspaceGroup();

    const handleSaveEdit = async () => {
        if (editName.trim() && editName.trim() !== group.name) {
            try {
                await updateGroupMutation.mutateAsync({
                    userId,
                    groupId: group.id,
                    name: editName.trim()
                });
            } catch (error) {
                console.error('Error updating group:', error);
            }
        }
        setIsEditing(false);
        setEditName(group.name);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditName(group.name);
    };

    const handleDeleteGroupOnly = async () => {
        try {
            await deleteGroupMutation.mutateAsync({
                userId,
                groupId: group.id
            });
            setShowDeleteDialog(false);
        } catch (error) {
            console.error('Error deleting group:', error);
        }
    };

    const handleDeleteGroupAndWorkspaces = async () => {
        try {
            await deleteGroupWithWorkspacesMutation.mutateAsync({
                userId,
                groupId: group.id
            });
            setShowDeleteDialog(false);
        } catch (error) {
            console.error('Error deleting group with workspaces:', error);
        }
    };

    const handleTogglePin = async () => {
        try {
            await pinGroupMutation.mutateAsync({
                userId,
                groupId: group.id,
                isPinned: !group.isPinned
            });
        } catch (error) {
            console.error('Error toggling group pin:', error);
        }
    };

    return (
        <div className="workspace-group transition-all duration-200">
            <div className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">

                        {isEditing ? (
                            <div className="flex items-center gap-2 flex-1">
                                <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSaveEdit();
                                        } else if (e.key === 'Escape') {
                                            handleCancelEdit();
                                        }
                                    }}
                                    className="h-8"
                                    autoFocus
                                />
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleSaveEdit}
                                    disabled={updateGroupMutation.isPending}
                                >
                                    <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleCancelEdit}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <div className="flex-1 min-w-0">
                                <CardTitle className="text-lg truncate min-w-0" title={group.name}>{group.name}</CardTitle>
                            </div>
                        )}
                    </div>

                    {!isEditing && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onClick={handleTogglePin}
                                    disabled={pinGroupMutation.isPending}
                                >
                                    {group.isPinned ? (
                                        <>
                                            <PinOff className="h-4 w-4" />
                                            Remove from Top Bar
                                        </>
                                    ) : (
                                        <>
                                            <Pin className="h-4 w-4" />
                                            Add to Top Bar
                                        </>
                                    )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                                    <Edit2 className="h-4 w-4" />
                                    Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => setShowDeleteDialog(true)}
                                    className="text-destructive"
                                    disabled={deleteGroupMutation.isPending || deleteGroupWithWorkspacesMutation.isPending}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>

            <div>
                <SortableWorkspaceList
                    workspaces={workspaces}
                    currentWorkspaceId={currentWorkspaceId}
                    onWorkspaceSelect={(workspace) => onWorkspaceSelect(workspace)}
                    onWorkspaceEdit={onWorkspaceEdit}
                    onWorkspaceDelete={onWorkspaceDelete}
                    onWorkspaceMove={onWorkspaceMove}
                    onAddWorkspace={onAddWorkspace}
                    groupId={group.id}
                    className="border-transparent hover:border-border"
                />
            </div>

            <DeleteGroupDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
                groupName={group.name}
                workspaceCount={workspaces.length}
                onDeleteGroupOnly={handleDeleteGroupOnly}
                onDeleteGroupAndWorkspaces={handleDeleteGroupAndWorkspaces}
                isDeleting={deleteGroupMutation.isPending || deleteGroupWithWorkspacesMutation.isPending}
            />
        </div>
    );
}
