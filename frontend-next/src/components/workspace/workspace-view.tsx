"use client"

import React from 'react';
import { useRouter } from 'next/navigation';
import { WorkspaceLayout } from './workspace-layout';
import { ChatView } from './chat/chat-view';
import { useSession } from '@/lib/temp-auth';
import { useWorkspaces } from '@/lib/hooks/use-query-hooks';
import { Loader2 } from 'lucide-react';
import { navigationUtils } from '@/lib/hooks/use-pathname';
import { useDelayedSpinner } from '@/lib/hooks/use-delayed-spinner';

interface WorkspaceViewProps {
    workspaceId: string;
}

export function WorkspaceView({ workspaceId }: WorkspaceViewProps) {
    const router = useRouter();
    const { data: session } = useSession();

    // Use delayed spinner for workspace loading
    const { showSpinner: showWorkspaceSpinner, startLoading: startWorkspaceLoading, stopLoading: stopWorkspaceLoading } = useDelayedSpinner(3000);

    // Redirect if no user
    React.useLayoutEffect(() => {
        if (!session?.user) {
            router.push('/');
        }
    }, [session?.user, router]);

    // Use existing TanStack Query hook
    const { data: workspacesResult, isLoading, error } = useWorkspaces(session?.user?.id || '');

    // Derived state
    const workspace = workspacesResult?.workspaces?.find(w => w.id === workspaceId) || null;

    // Manage delayed spinner based on loading state
    React.useEffect(() => {
        if (isLoading && !workspace) {
            startWorkspaceLoading();
        } else {
            stopWorkspaceLoading();
        }
    }, [isLoading, workspace, startWorkspaceLoading, stopWorkspaceLoading]);

    if (showWorkspaceSpinner) {
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
                            onClick={() => navigationUtils.pushState('/workspaces')}
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
                            onClick={() => navigationUtils.pushState('/workspaces')}
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
                <ChatView
                    workspaceId={workspaceId}
                // No chatId provided - will show workspace overview with empty state
                />
            ) : (
                <div className="h-full">
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
                </div>
            )}
        </WorkspaceLayout>
    );
}
