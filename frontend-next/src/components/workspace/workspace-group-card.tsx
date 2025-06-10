"use client"

import React, { useState } from 'react';
import { CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoreHorizontal, Edit2, Trash2, Check, X } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { WorkspaceCard } from './workspace-card';
import { SortableWorkspaceList } from './sortable-workspace-list';
import { useUpdateWorkspaceGroup, useDeleteWorkspaceGroup } from '@/lib/hooks/use-workspace-groups';

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
        createdAt: string;
        workspaceCount: number;
    };
    workspaces: Workspace[];
    onWorkspaceSelect: (workspaceId: string) => void;
    onWorkspaceEdit: (workspace: Workspace) => void;
    onWorkspaceDelete: (workspaceId: string) => void;
    onWorkspaceMove: (workspaceId: string, newIndex: number, targetGroupId?: string | null) => void;
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
    currentWorkspaceId,
    userId
}: WorkspaceGroupCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(group.name);

    const updateGroupMutation = useUpdateWorkspaceGroup();
    const deleteGroupMutation = useDeleteWorkspaceGroup();

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

    const handleDelete = async () => {
        if (confirm(`Are you sure you want to delete the group "${group.name}"? Workspaces will be moved to ungrouped.`)) {
            try {
                await deleteGroupMutation.mutateAsync({
                    userId,
                    groupId: group.id
                });
            } catch (error) {
                console.error('Error deleting group:', error);
            }
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
                                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={handleDelete}
                                    className="text-destructive"
                                    disabled={deleteGroupMutation.isPending}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
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
                    onWorkspaceSelect={onWorkspaceSelect}
                    onWorkspaceEdit={onWorkspaceEdit}
                    onWorkspaceDelete={onWorkspaceDelete}
                    onWorkspaceMove={onWorkspaceMove}
                    groupId={group.id}
                    className="border-transparent hover:border-border"
                    placeholder={`Drop workspaces in ${group.name}`}
                />
            </div>
        </div>
    );
}
