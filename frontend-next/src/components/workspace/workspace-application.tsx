"use client"

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WorkspaceTabBar } from '@/components/workspace/workspace-tab-bar';
import { PinnedGroupTabs } from '@/components/workspace/pinned-group-tabs';
import { ChatView } from '@/components/workspace/chat/chat-view';
import { CreateChatView } from '@/components/workspace/chat/create-chat-view';
import { WorkspaceGroups } from '@/components/workspace/workspace-groups';

import { WorkspaceSetup } from '@/components/workspace/workspace-setup';
import { PersonalitiesManagement } from '@/components/personalities/personalities-management';

import { OpenRouterSettingsView } from '@/components/workspace/openrouter-settings-view';
import { OpenAISettingsView } from '@/components/workspace/openai-settings-view';
import { AccountSettings } from '@/components/account/account-settings';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { usePathname as usePathnameHook, navigationUtils } from '@/lib/hooks/use-pathname';
import { useWorkspaces } from '@/lib/hooks/use-query-hooks';
import { useDelayedSpinner } from '@/lib/hooks/use-delayed-spinner';
import { Loader2, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WorkspaceApplicationProps {
    currentUser: {
        id: string;
        email: string;
        username?: string;
        firstName?: string;
        lastName?: string;
        hasCompletedWorkspaceSetup?: boolean;
        role?: string;
    };
    onLogout: () => void;
}

interface RouteParams {
    workspaceId?: string;
    chatId?: string;
}

export function WorkspaceApplication({ currentUser, onLogout }: WorkspaceApplicationProps) {
    const currentPathname = usePathnameHook();
    const [, setRefreshWorkspaces] = useState<(() => void) | null>(null);
    const openWorkspaceRef = useRef<((workspaceId: string) => void) | null>(null);
    const queryClient = useQueryClient();
    const [showNotFoundAfterDelay, setShowNotFoundAfterDelay] = useState(false);

    // Use delayed spinners for loading states
    const { showSpinner: showWorkspacesSpinner, startLoading: startWorkspacesLoading, stopLoading: stopWorkspacesLoading } = useDelayedSpinner(3000);
    const { showSpinner: showWorkspaceSpinner, startLoading: startWorkspaceLoading, stopLoading: stopWorkspaceLoading } = useDelayedSpinner(3000);

    // Use TanStack Query for data fetching
    const { data: workspacesResult, isLoading: workspacesLoading, error: workspacesError } = useWorkspaces(currentUser.id, 'WorkspaceApplication');

    // Parse route parameters from pathname (memoized to prevent re-renders)
    const { currentView, routeParams, queryParams } = useMemo(() => {
        const parseRoute = (path: string): { view: string; params: RouteParams; queryParams: Record<string, string> } => {
            // Extract query parameters
            const [pathname, search] = path.split('?');
            const urlParams = new URLSearchParams(search || '');
            const queryParams: Record<string, string> = {};
            urlParams.forEach((value, key) => {
                queryParams[key] = value;
            });

            // Handle workspace routes - treat both workspace and chat routes as 'workspace' view
            const wsMatch = pathname.match(/^\/ws\/([^\/]+)(?:\/chat\/([^\/]+))?$/);
            if (wsMatch) {
                return {
                    view: 'workspace',
                    params: {
                        workspaceId: wsMatch[1],
                        chatId: wsMatch[2]
                    },
                    queryParams
                };
            }

            // Handle AI providers routes
            if (pathname.startsWith('/ai-providers')) {
                if (pathname === '/ai-providers/openrouter') {
                    return { view: 'ai-providers-openrouter', params: {}, queryParams };
                }
                if (pathname === '/ai-providers/openai') {
                    return { view: 'ai-providers-openai', params: {}, queryParams };
                }
                // Default to OpenAI (first menu)
                return { view: 'ai-providers-openai', params: {}, queryParams };
            }

            // Handle other routes
            if (pathname === '/workspaces') return { view: 'selection', params: {}, queryParams };
            if (pathname === '/personalities') return { view: 'personalities', params: {}, queryParams };
            if (pathname === '/add/workspace') return { view: 'create', params: {}, queryParams };
            if (pathname === '/account') return { view: 'account', params: {}, queryParams };

            const addChatMatch = pathname.match(/^\/add\/chat\/([^\/]+)$/);
            if (addChatMatch) {
                return {
                    view: 'create-chat',
                    params: { workspaceId: addChatMatch[1] },
                    queryParams
                };
            }

            // Default to workspace selection if no match
            return { view: 'selection', params: {}, queryParams };
        };

        const { view, params, queryParams } = parseRoute(currentPathname);

        return {
            currentView: view,
            routeParams: params,
            queryParams
        };
    }, [currentPathname]);

    // Find current workspace separately to avoid workspacesResult dependency in main useMemo
    const currentWorkspace = useMemo(() => {
        if (workspacesResult?.success && routeParams.workspaceId) {
            return workspacesResult.workspaces.find(w => w.id === routeParams.workspaceId) || null;
        }
        return null;
    }, [workspacesResult, routeParams.workspaceId]);

    // Manage delayed spinners based on loading states
    useEffect(() => {
        if (workspacesLoading) {
            startWorkspacesLoading();
        } else {
            stopWorkspacesLoading();
        }
    }, [workspacesLoading, startWorkspacesLoading, stopWorkspacesLoading]);

    useEffect(() => {
        // Show workspace spinner when loading a specific workspace
        if (currentView === 'workspace' && routeParams.workspaceId && workspacesLoading) {
            startWorkspaceLoading();
        } else {
            stopWorkspaceLoading();
        }
    }, [currentView, routeParams.workspaceId, workspacesLoading, startWorkspaceLoading, stopWorkspaceLoading]);

    // Handle delayed "not found" state to prevent flash during workspace creation
    useEffect(() => {
        if (currentView === 'workspace' && routeParams.workspaceId && !workspacesLoading && !currentWorkspace && !workspacesError) {
            // Reset the timer when workspace ID changes
            setShowNotFoundAfterDelay(false);

            // Set a timer to show "not found" after 3 seconds
            const timer = setTimeout(() => {
                setShowNotFoundAfterDelay(true);
            }, 3000);

            return () => clearTimeout(timer);
        } else {
            setShowNotFoundAfterDelay(false);
        }
    }, [currentView, routeParams.workspaceId, workspacesLoading, currentWorkspace, workspacesError]);

    const handleWorkspaceUpdated = () => {
        queryClient.invalidateQueries({ queryKey: ['workspaces', 'user', currentUser.id] });
    };

    const handleWorkspaceDeleted = () => {
        queryClient.invalidateQueries({ queryKey: ['workspaces', 'user', currentUser.id] });
        // After deletion, it's good practice to navigate away from a potentially non-existent workspace
        if (currentView === 'workspace' || currentView.startsWith('settings')) {
            navigateToWorkspaceSelection();
        }
    };

    // Navigation functions using the new navigation utils
    const navigateToWorkspace = useCallback((workspaceId: string) => {
        // Force refetch workspace data when navigating to ensure we have the latest data
        queryClient.invalidateQueries({ queryKey: ['workspaces', 'user', currentUser.id] });
        navigationUtils.pushState(`/ws/${workspaceId}`);
    }, [currentUser.id, queryClient]);

    const navigateToWorkspaceSelection = useCallback(() => {
        navigationUtils.pushState('/workspaces');
    }, []);

    // Show loading state only after delay
    if (showWorkspacesSpinner) {
        return (
            <div className="h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    <p className="text-muted-foreground">Loading workspaces...</p>
                </div>
            </div>
        );
    }

    // Show error state
    if (workspacesError) {
        return (
            <div className="h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <h2 className="text-2xl font-bold text-destructive">Error</h2>
                    <p className="text-muted-foreground">{workspacesError.message}</p>
                    <Button onClick={() => window.location.reload()}>
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="border-b flex-shrink-0">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold">OP3</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <UserMenu userEmail={currentUser.email} onLogout={onLogout} />
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            {/* Workspace Tab Bar */}
            <div className="flex-shrink-0">
                <WorkspaceTabBar
                    userId={currentUser.id}
                    currentView={currentView.startsWith('ai-providers') ? 'ai-providers' : currentView as 'workspace' | 'ai-providers' | 'create' | 'selection' | 'personalities' | 'statistics'}
                    currentWorkspaceId={routeParams.workspaceId || null}
                    onRefresh={setRefreshWorkspaces}
                    onOpenWorkspace={(fn) => { openWorkspaceRef.current = fn; }}
                />
            </div>

            {/* Pinned Group Tabs */}
            <div className="flex-shrink-0">
                <PinnedGroupTabs
                    userId={currentUser.id}
                    currentWorkspaceId={routeParams.workspaceId || null}
                    currentView={currentView}
                />
            </div>

            {/* Main content */}
            <main className="flex-1 overflow-hidden">
                {currentView === 'workspace' && routeParams.workspaceId && (
                    <>
                        {/* Show loading state while workspace data is loading */}
                        {showWorkspaceSpinner ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="text-center space-y-4">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto opacity-50" />
                                    <p className="text-muted-foreground">Loading workspace...</p>
                                </div>
                            </div>
                        ) : currentWorkspace ? (
                            <>
                                {/* Always render the same ChatView component to prevent remounting */}
                                {currentWorkspace.templateType === 'standard-chat' ? (
                                    <ChatView
                                        workspaceId={routeParams.workspaceId}
                                        chatId={routeParams.chatId} // Pass chatId if available, undefined if not
                                    />
                                ) : (
                                    <div className="container mx-auto px-4 py-8">
                                        <div className="text-center space-y-4">
                                            <h2 className="text-2xl font-bold">Welcome to your workspace!</h2>
                                            <p className="text-muted-foreground">
                                                {currentWorkspace.templateType
                                                    ? `Template: ${currentWorkspace.templateType}. This template will be implemented in the next phase.`
                                                    : 'Your workspace has been set up successfully. The actual workspace templates will be implemented in the next phase.'
                                                }
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Current workspace ID: {routeParams.workspaceId}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : workspacesError ? (
                            /* Show error state if there was an error loading workspaces */
                            <div className="h-full flex items-center justify-center">
                                <div className="text-center space-y-4 max-w-md">
                                    <h2 className="text-2xl font-bold">Error Loading Workspace</h2>
                                    <p className="text-muted-foreground">
                                        There was an error loading your workspace data. Please try refreshing the page.
                                    </p>
                                    <Button
                                        onClick={() => window.location.reload()}
                                        className="mt-4"
                                    >
                                        Refresh Page
                                    </Button>
                                </div>
                            </div>
                        ) : showNotFoundAfterDelay ? (
                            /* Show workspace not found state only after delay */
                            <div className="h-full flex items-center justify-center">
                                <div className="text-center space-y-4 max-w-md">
                                    <h2 className="text-2xl font-bold">Workspace Not Found</h2>
                                    <p className="text-muted-foreground">
                                        The workspace you&apos;re looking for doesn&apos;t exist, or you don&apos;t have access. It may still be being created.
                                    </p>
                                    <div className="flex gap-2 justify-center">
                                        <Button
                                            onClick={() => window.location.reload()}
                                            variant="outline"
                                        >
                                            Refresh
                                        </Button>
                                        <Button
                                            onClick={() => navigateToWorkspaceSelection()}
                                        >
                                            Back to Workspaces
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : showWorkspaceSpinner ? (
                            /* Show loading state to prevent flash during workspace creation */
                            <div className="h-full flex items-center justify-center">
                                <div className="text-center space-y-4">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto opacity-50" />
                                    <p className="text-muted-foreground">Loading workspace...</p>
                                </div>
                            </div>
                        ) : null}
                    </>
                )}

                {currentView === 'ai-providers-openrouter' && (
                    <AIProvidersLayout currentView="openrouter">
                        <OpenRouterSettingsView />
                    </AIProvidersLayout>
                )}

                {currentView === 'ai-providers-openai' && (
                    <AIProvidersLayout currentView="openai">
                        <OpenAISettingsView />
                    </AIProvidersLayout>
                )}



                {currentView === 'selection' && (
                    <div className="h-full overflow-y-auto">
                        <div className="container mx-auto px-4 py-6">
                            <WorkspaceGroups
                                userId={currentUser.id}
                                currentWorkspaceId={routeParams.workspaceId || null}
                                openWorkspace={openWorkspaceRef.current}
                                onWorkspaceSelect={navigateToWorkspace}
                                onWorkspaceUpdated={handleWorkspaceUpdated}
                                onWorkspaceDeleted={handleWorkspaceDeleted}
                            />
                        </div>
                    </div>
                )}

                {currentView === 'create' && (
                    <div className="h-full overflow-y-auto">
                        <div className="container mx-auto px-4 py-6">
                            <div className="max-w-4xl mx-auto">
                                <h1 className="text-2xl font-bold mb-6">Create New Workspace</h1>
                                <WorkspaceSetup
                                    userId={currentUser.id}
                                    groupId={queryParams.groupId || null}
                                    onComplete={async (workspace) => {
                                        if (workspace) {
                                            // Invalidate workspace cache immediately
                                            queryClient.invalidateQueries({ queryKey: ['workspaces', 'user', currentUser.id] });

                                            // Wait for the workspace data to be refetched
                                            try {
                                                await queryClient.refetchQueries({
                                                    queryKey: ['workspaces', 'user', currentUser.id],
                                                    type: 'active'
                                                });
                                            } catch (error) {
                                                console.error('Error refetching workspace data:', error);
                                            }

                                            // Now navigate with the workspace data available
                                            if (openWorkspaceRef.current) {
                                                openWorkspaceRef.current(workspace.id);
                                            } else {
                                                // Fallback to regular navigation if openWorkspace is not available
                                                navigateToWorkspace(workspace.id);
                                            }
                                        } else {
                                            navigateToWorkspaceSelection();
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {currentView === 'personalities' && (
                    <div className="h-full overflow-y-auto">
                        <div className="container mx-auto px-4 py-6">
                            <h1 className="text-2xl font-bold mb-6">AI Personalities</h1>
                            <PersonalitiesManagement userId={currentUser.id} />
                        </div>
                    </div>
                )}

                {currentView === 'create-chat' && routeParams.workspaceId && (
                    <div className="h-full overflow-y-auto">
                        <CreateChatView
                            workspaceId={routeParams.workspaceId}
                            groupId={queryParams.groupId || null}
                        />
                    </div>
                )}

                {currentView === 'account' && (
                    <div className="h-full overflow-y-auto">
                        <AccountSettings currentUser={currentUser} />
                    </div>
                )}
            </main>
        </div>
    );
}



// Internal AIProvidersLayout component for client-side routing
interface AIProvidersLayoutProps {
    children: React.ReactNode;
    currentView: 'openai' | 'openrouter';
}

function AIProvidersLayout({ children, currentView }: AIProvidersLayoutProps) {

    const AI_PROVIDER_TABS = [
        {
            id: 'openai',
            label: 'OpenAI',
            icon: <Bot className="h-4 w-4" />,
            description: 'Configure OpenAI API and models',
            path: '/ai-providers/openai'
        },
        {
            id: 'openrouter',
            label: 'OpenRouter',
            icon: <Bot className="h-4 w-4" />,
            description: 'Configure OpenRouter API and models',
            path: '/ai-providers/openrouter'
        }
    ];

    const activeTab = AI_PROVIDER_TABS.find(tab => tab.id === currentView);

    const handleTabClick = (path: string) => {
        navigationUtils.pushState(path);
    };

    return (
        <div className="h-full">
            <div className="container mx-auto px-4 h-full flex">
                {/* Vertical Tabs Sidebar */}
                <div className="w-96 h-full overflow-y-auto">
                    <div className="py-6 space-y-2">
                        {AI_PROVIDER_TABS.map((tab) => (
                            <Button
                                key={tab.id}
                                variant={currentView === tab.id ? "default" : "ghost"}
                                className={`w-full justify-start h-auto p-3 select-none ${currentView === tab.id
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-muted"
                                    }`}
                                onClick={() => handleTabClick(tab.path)}
                            >
                                <div className="flex items-center gap-3">
                                    {tab.icon}
                                    <div className="text-left">
                                        <div className="font-medium">{tab.label}</div>
                                        <div className="text-xs opacity-70">{tab.description}</div>
                                    </div>
                                </div>
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto">
                    <div className="pl-8 pr-4 py-6">
                        {/* Tab Header */}
                        <div className="mb-6 flex items-start justify-between">
                            <div>
                                <h2 className="text-2xl font-bold">
                                    {activeTab?.label || 'Settings'}
                                </h2>
                                <p className="text-muted-foreground">
                                    {activeTab?.description || 'Manage your application settings'}
                                </p>
                            </div>

                        </div>

                        {/* Tab Content */}
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
