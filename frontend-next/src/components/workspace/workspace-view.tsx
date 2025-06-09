"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WorkspaceLayout } from './workspace-layout';
import { StandardChatLayout } from './chat/standard-chat-layout';
import { authService } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { Loader2 } from 'lucide-react';

interface WorkspaceViewProps {
    workspaceId: string;
}

export function WorkspaceView({ workspaceId }: WorkspaceViewProps) {
    const router = useRouter();
    const [workspace, setWorkspace] = useState<{ id: string; name: string; templateType: string; workspaceRules: string; isActive: boolean; createdAt: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadWorkspace = async () => {
            const user = authService.getCurrentUser();
            if (!user) {
                router.push('/');
                return;
            }

            try {
                setIsLoading(true);
                const result = await apiClient.getUserWorkspaces(user.id);
                
                if (result.success) {
                    const foundWorkspace = result.workspaces.find(w => w.id === workspaceId);
                    if (foundWorkspace) {
                        setWorkspace(foundWorkspace);
                        // Set as active workspace
                        await apiClient.setActiveWorkspace(workspaceId, user.id);
                    } else {
                        setError('Workspace not found');
                    }
                } else {
                    setError('Failed to load workspace');
                }
            } catch (error) {
                console.error('Error loading workspace:', error);
                setError('Failed to load workspace');
            } finally {
                setIsLoading(false);
            }
        };

        loadWorkspace();
    }, [workspaceId, router]);

    if (isLoading) {
        return (
            <WorkspaceLayout currentWorkspaceId={workspaceId}>
                <div className="h-full flex items-center justify-center">
                    <div className="text-center space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                        <p className="text-muted-foreground">Loading workspace...</p>
                    </div>
                </div>
            </WorkspaceLayout>
        );
    }

    if (error) {
        return (
            <WorkspaceLayout currentWorkspaceId={workspaceId}>
                <div className="h-full flex items-center justify-center">
                    <div className="text-center space-y-4 max-w-md">
                        <h2 className="text-2xl font-bold text-destructive">Error</h2>
                        <p className="text-muted-foreground">{error}</p>
                        <button
                            onClick={() => router.push('/workspaces')}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                        >
                            Go to Workspaces
                        </button>
                    </div>
                </div>
            </WorkspaceLayout>
        );
    }

    if (!workspace) {
        return (
            <WorkspaceLayout currentWorkspaceId={workspaceId}>
                <div className="h-full flex items-center justify-center">
                    <div className="text-center space-y-4 max-w-md">
                        <h2 className="text-2xl font-bold">Workspace Not Found</h2>
                        <p className="text-muted-foreground">The workspace you're looking for doesn't exist or you don't have access to it.</p>
                        <button
                            onClick={() => router.push('/workspaces')}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                        >
                            Go to Workspaces
                        </button>
                    </div>
                </div>
            </WorkspaceLayout>
        );
    }

    const user = authService.getCurrentUser();

    return (
        <WorkspaceLayout currentWorkspaceId={workspaceId}>
            {workspace.templateType === 'standard-chat' ? (
                <StandardChatLayout
                    workspaceId={workspaceId}
                    userId={user?.id || ''}
                    className="h-full"
                />
            ) : (
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center space-y-4">
                        <h2 className="text-2xl font-bold">Welcome to your workspace!</h2>
                        <p className="text-muted-foreground">
                            {workspace.templateType
                                ? `Template: ${workspace.templateType}. This template will be implemented in the next phase.`
                                : 'Your workspace has been set up successfully. The actual workspace templates will be implemented in the next phase.'
                            }
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Current workspace ID: {workspaceId}
                        </p>
                    </div>
                </div>
            )}
        </WorkspaceLayout>
    );
}
