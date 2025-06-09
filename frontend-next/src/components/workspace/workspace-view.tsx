"use client"

import React from 'react';
import { useRouter } from 'next/navigation';
import { WorkspaceLayout } from './workspace-layout';
import { StandardChatLayout } from './chat/standard-chat-layout';
import { authService } from '@/lib/auth';
import { useWorkspaces } from '@/lib/hooks/use-query-hooks';
import { Loader2 } from 'lucide-react';

interface WorkspaceViewProps {
    workspaceId: string;
}

export function WorkspaceView({ workspaceId }: WorkspaceViewProps) {
    const router = useRouter();
    const user = authService.getCurrentUser();

    // Redirect if no user
    React.useLayoutEffect(() => {
        if (!user) {
            router.push('/');
        }
    }, [user, router]);

    // Use existing TanStack Query hook
    const { data: workspacesResult, isLoading, error } = useWorkspaces(user?.id || '');

    // Derived state
    const workspace = workspacesResult?.workspaces?.find(w => w.id === workspaceId) || null;

    if (isLoading && !workspace) {
        return (
            <WorkspaceLayout currentWorkspaceId={workspaceId}>
                <div className="h-full flex items-center justify-center">
                    <div className="text-center space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto opacity-50" />
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
                        <p className="text-muted-foreground">{error.message}</p>
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
                        <p className="text-muted-foreground">The workspace you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
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
