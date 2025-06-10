"use client"

import React from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Kanban, Network, Loader2 } from 'lucide-react';
import { useWorkspaces } from '@/lib/hooks/use-query-hooks';

interface WorkspaceSelectionProps {
    userId: string;
    onWorkspaceSelect: (workspaceId: string) => void;
    currentWorkspaceId?: string | null;
    openWorkspace?: ((workspaceId: string) => void) | null;
}



export function WorkspaceSelection({ userId, onWorkspaceSelect, currentWorkspaceId, openWorkspace }: WorkspaceSelectionProps) {
    // Use TanStack Query for workspace data
    const { data: workspacesResult, isLoading, error } = useWorkspaces(userId, 'WorkspaceSelection');
    const workspaces = workspacesResult?.workspaces || [];

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
                return templateType;
        }
    };

    const handleWorkspaceSelect = async (workspaceId: string) => {
        if (workspaceId === currentWorkspaceId) {
            // If already active, just go back to workspace
            onWorkspaceSelect(workspaceId);
            return;
        }

        try {
            // Use openWorkspace function if available (to add to tabs) or fallback to regular selection
            if (openWorkspace) {
                openWorkspace(workspaceId);
                onWorkspaceSelect(workspaceId);
            } else {
                // Note: Should use TanStack Query mutation here too, but for now keeping minimal change
                onWorkspaceSelect(workspaceId);
            }
        } catch (error) {
            console.error('Error switching workspace:', error);
        }
    };

    // Show loading state
    if (isLoading && workspaces.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                    <p className="text-destructive">{error.message}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Workspace Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workspaces.map((workspace) => (
                    <Card
                        key={workspace.id}
                        className={`cursor-pointer transition-all duration-200 hover:shadow-md select-none ${workspace.id === currentWorkspaceId
                            ? 'border-primary'
                            : 'hover:border-primary/50'
                            }`}
                        onClick={() => handleWorkspaceSelect(workspace.id)}
                    >
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${workspace.id === currentWorkspaceId
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground'
                                    }`}>
                                    {getTemplateIcon(workspace.templateType)}
                                </div>
                                <div className="text-left flex-1 min-w-0">
                                    <CardTitle className="text-base truncate min-w-0" title={workspace.name}>
                                        {workspace.name}
                                    </CardTitle>
                                    <CardDescription className="text-sm">
                                        {getTemplateLabel(workspace.templateType)}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>
                ))}
            </div>

            {workspaces.length === 0 && !isLoading && (
                <div className="text-center py-8">
                    <p className="text-muted-foreground">No workspaces found.</p>
                </div>
            )}
        </>
    );
}
