"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Kanban, Network } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface WorkspaceSelectionProps {
    userId: string;
    onWorkspaceSelect: (workspaceId: string) => void;
    currentWorkspaceId?: string | null;
    openWorkspace?: ((workspaceId: string) => void) | null;
}

interface Workspace {
    id: string;
    name: string;
    templateType: string;
    workspaceRules: string;
    isActive: boolean;
    createdAt: string;
}

export function WorkspaceSelection({ userId, onWorkspaceSelect, currentWorkspaceId, openWorkspace }: WorkspaceSelectionProps) {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');



    const loadWorkspaces = useCallback(async () => {
        try {
            setIsLoading(true);
            const result = await apiClient.getUserWorkspaces(userId);
            if (result.success) {
                setWorkspaces(result.workspaces);
            } else {
                setError('Failed to load workspaces');
            }
        } catch (error) {
            console.error('Error loading workspaces:', error);
            setError('Failed to load workspaces');
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadWorkspaces();
    }, [userId, loadWorkspaces]);

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
                const result = await apiClient.setActiveWorkspace(workspaceId, userId);
                if (result.success) {
                    onWorkspaceSelect(workspaceId);
                } else {
                    setError(result.message || 'Failed to switch workspace');
                }
            }
        } catch (error) {
            console.error('Error switching workspace:', error);
            setError('Failed to switch workspace');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground">Loading workspaces...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Error Display */}
            {error && (
                <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-destructive text-sm">{error}</p>
                </div>
            )}

            {/* Workspace Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workspaces.map((workspace) => (
                    <Card
                        key={workspace.id}
                        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${workspace.id === currentWorkspaceId
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
                                <div className="text-left">
                                    <CardTitle className="text-base">
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
