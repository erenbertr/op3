"use client"

import React from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Kanban, Network } from 'lucide-react';

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
    isActive?: boolean;
}

export function WorkspaceCard({ workspace, onSelect, isActive }: WorkspaceCardProps) {

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
            className={`cursor-pointer transition-all duration-200 hover:shadow-md select-none ${isActive
                    ? 'border-primary'
                    : 'hover:border-primary/50'
                }`}
            onClick={() => onSelect(workspace.id)}
        >
            <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                        }`}>
                        {getTemplateIcon(workspace.templateType)}
                    </div>
                    <div className="text-left">
                        <CardTitle className="text-base">
                            {workspace.name}
                        </CardTitle>
                        <CardDescription>
                            {getTemplateLabel(workspace.templateType)}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
        </Card>
    );
}
