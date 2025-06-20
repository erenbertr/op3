"use client"

import React from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Kanban, Network, Edit2, Trash2, MoreHorizontal, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
    onManageFavorites: (workspaceId: string) => void;
    isActive?: boolean;
}

export function WorkspaceCard({ workspace, onSelect, onEdit, onDelete, onManageFavorites, isActive }: WorkspaceCardProps) {

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit(workspace);
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(workspace.id);
    };

    const handleManageFavoritesClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onManageFavorites(workspace.id);
    };

    const handleClick = (e: React.MouseEvent) => {
        // Don't interfere with edit/delete buttons
        const target = e.target as HTMLElement;
        if (target.closest('button')) {
            return;
        }

        onSelect(workspace.id);
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
            className={`workspace-card-inner group/card transition-all duration-200 hover:shadow-md select-none ${isActive
                ? 'border-primary'
                : 'hover:border-primary/50'
                }`}
            onClick={handleClick}
        >
            <CardHeader className="pb-3 relative">
                <div className="flex items-center gap-3">
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

                <div className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={handleManageFavoritesClick} className="gap-2">
                                <Star className="h-4 w-4" />
                                Personality Favorites
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleEditClick} className="gap-2">
                                <Edit2 className="h-4 w-4" />
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleDeleteClick} className="text-destructive gap-2">
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>
        </Card>
    );
}
