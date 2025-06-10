"use client"

import React from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Kanban, Network, Edit2, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WorkspaceCardProps {
    workspace: {
        id: string;
        name: string;
        templateType: string;
        workspaceRules: string;
        isActive: boolean;
        createdAt: string;
        groupId?: string | null;
        sortOrder?: number;
    };
    onSelect: (workspaceId: string) => void;
    onEdit: (workspace: WorkspaceCardProps['workspace']) => void;
    onDelete: (workspaceId: string) => void;
    isActive?: boolean;
    isDragging?: boolean;
}

export function WorkspaceCard({ workspace, onSelect, onEdit, onDelete, isActive, isDragging }: WorkspaceCardProps) {

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit(workspace);
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(workspace.id);
    };

    const handleCardClick = (e: React.MouseEvent) => {
        // Prevent click during drag operations
        if (isDragging) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        // Check if the click originated from the drag handle or its children
        const target = e.target as HTMLElement;
        if (target.closest('.drag-handle')) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        onSelect(workspace.id);
    };

    const handleDragHandleClick = (e: React.MouseEvent) => {
        // Prevent the drag handle click from bubbling up to the card
        e.stopPropagation();
        e.preventDefault();
    };

    const getTemplateIcon = (templateType: string) => {
        switch (templateType) {
            case 'standard-chat':
                return <MessageSquare className="h-6 w-6" />;
            case 'kanban-board':
                return <Kanban className="h-6 w-6" />;
            case 'node-graph':
                return <Network className="h-6 w-6" />;
            default:
                return <MessageSquare className="h-6 w-6" />;
        }
    };

    const getTemplateLabel = (templateType: string) => {
        switch (templateType) {
            case 'standard-chat':
                return 'Standard Chat';
            case 'kanban-board':
                return 'Kanban Board';
            case 'node-graph':
                return 'Node Graph';
            default:
                return 'Standard Chat';
        }
    };

    return (
        <Card
            className={`workspace-card-inner group/card cursor-pointer transition-all duration-200 hover:shadow-md select-none ${isActive
                ? 'border-primary'
                : 'hover:border-primary/50'
                } ${isDragging ? 'pointer-events-none' : ''}`}
            onClick={handleCardClick}
        >
            <CardHeader className="pb-3 relative">
                <div className="flex items-center gap-3">
                    {/* Drag Handle */}
                    <div
                        className="drag-handle cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded opacity-0 group-hover/card:opacity-100 transition-opacity"
                        onClick={handleDragHandleClick}
                        onMouseDown={handleDragHandleClick}
                    >
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </div>

                    <div className={`p-2 rounded-full ${isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                        }`}>
                        {getTemplateIcon(workspace.templateType)}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                        <CardTitle className="text-base truncate min-w-0" title={workspace.name}>
                            {workspace.name}
                        </CardTitle>
                        <CardDescription>
                            {getTemplateLabel(workspace.templateType)}
                        </CardDescription>
                    </div>
                </div>

                <div className="absolute top-2 right-2 flex items-center space-x-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleEditClick}
                    >
                        <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleDeleteClick}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
        </Card>
    );
}
