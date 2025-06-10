"use client"

import React, { useState } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useUpdateWorkspaceGroup, useDeleteWorkspaceGroup } from '@/lib/hooks/use-workspace-groups';
import { StrictModeDroppable } from './strict-mode-droppable';

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
    currentWorkspaceId?: string | null;
    userId: string;
}

export function WorkspaceGroupCard({
    group,
    workspaces,
    onWorkspaceSelect,
    onWorkspaceEdit,
    onWorkspaceDelete,
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
        <Card className="transition-all duration-200">
            <CardHeader className="pb-3">
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
                            <div className="flex-1">
                                <CardTitle className="text-lg">{group.name}</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}
                                </p>
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
            </CardHeader>

            <CardContent>
                <StrictModeDroppable
                    droppableId={`group-${group.id}`}
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
                            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 min-h-[100px] p-4 rounded-lg border-2 border-dashed transition-colors ${snapshot.isDraggingOver
                                ? 'border-primary bg-primary/10'
                                : 'border-muted-foreground/25'
                                }`}
                        >
                            {workspaces.length === 0 && (
                                <div className="col-span-full flex items-center justify-center py-8 text-muted-foreground">
                                    <p>Drag workspaces here to organize them</p>
                                </div>
                            )}
                            {workspaces.map((workspace, index) => (
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
                                            className={snapshot.isDragging ? 'opacity-50' : ''}
                                        >
                                            <WorkspaceCard
                                                workspace={workspace}
                                                onSelect={onWorkspaceSelect}
                                                onEdit={onWorkspaceEdit}
                                                onDelete={onWorkspaceDelete}
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
            </CardContent>
        </Card>
    );
}
