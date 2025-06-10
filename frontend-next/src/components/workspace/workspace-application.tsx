"use client"

import React, { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WorkspaceTabBar } from '@/components/workspace/workspace-tab-bar';
import { ChatView } from '@/components/workspace/chat/chat-view';
import { WorkspaceSelection } from '@/components/workspace/workspace-selection';
import { WorkspaceSetup } from '@/components/workspace/workspace-setup';
import { PersonalitiesManagement } from '@/components/personalities/personalities-management';

import { WorkspaceSettingsView } from '@/components/workspace/workspace-settings-view';
import { AIProviderSettingsView } from '@/components/workspace/ai-provider-settings-view';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { AuthUser } from '@/lib/auth';
import { usePathname as usePathnameHook, navigationUtils } from '@/lib/hooks/use-pathname';
import { useWorkspaces } from '@/lib/hooks/use-query-hooks';
import { Loader2, Settings, Bot, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WorkspaceApplicationProps {
    currentUser: AuthUser;
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

    // Use TanStack Query for data fetching
    const { data: workspacesResult, isLoading: workspacesLoading, error: workspacesError } = useWorkspaces(currentUser.id, 'WorkspaceApplication');

    // Parse route parameters from pathname (memoized to prevent re-renders)
    const { currentView, routeParams } = React.useMemo(() => {
        const parseRoute = (path: string): { view: string; params: RouteParams } => {
            // Handle workspace routes - treat both workspace and chat routes as 'workspace' view
            const wsMatch = path.match(/^\/ws\/([^\/]+)(?:\/chat\/([^\/]+))?$/);
            if (wsMatch) {
                return {
                    view: 'workspace',
                    params: {
                        workspaceId: wsMatch[1],
                        chatId: wsMatch[2]
                    }
                };
            }

            // Handle settings routes
            if (path.startsWith('/settings')) {
                if (path === '/settings/workspaces') return { view: 'settings-workspaces', params: {} };
                if (path === '/settings/ai-providers') return { view: 'settings-ai-providers', params: {} };
                return { view: 'settings-workspaces', params: {} }; // Default to workspaces
            }

            // Handle other routes
            if (path === '/workspaces') return { view: 'selection', params: {} };
            if (path === '/personalities') return { view: 'personalities', params: {} };
            if (path === '/add/workspace') return { view: 'create', params: {} };

            const addChatMatch = path.match(/^\/add\/chat\/([^\/]+)$/);
            if (addChatMatch) {
                return {
                    view: 'create-chat',
                    params: { workspaceId: addChatMatch[1] }
                };
            }

            // Default to workspace selection if no match
            return { view: 'selection', params: {} };
        };

        const { view, params } = parseRoute(currentPathname);

        return {
            currentView: view,
            routeParams: params
        };
    }, [currentPathname]);

    // Find current workspace separately to avoid workspacesResult dependency in main useMemo
    const currentWorkspace = React.useMemo(() => {
        if (workspacesResult?.success && routeParams.workspaceId) {
            return workspacesResult.workspaces.find(w => w.id === routeParams.workspaceId) || null;
        }
        return null;
    }, [workspacesResult, routeParams.workspaceId]);

    // Navigation functions using the new navigation utils
    const navigateToWorkspace = useCallback((workspaceId: string) => {
        // Force refetch workspace data when navigating to ensure we have the latest data
        queryClient.invalidateQueries({ queryKey: ['workspaces', 'user', currentUser.id] });
        navigationUtils.pushState(`/ws/${workspaceId}`);
    }, [currentUser.id, queryClient]);

    const navigateToWorkspaceSelection = useCallback(() => {
        navigationUtils.pushState('/workspaces');
    }, []);

    // Show loading state
    if (workspacesLoading) {
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
                    currentView={currentView.startsWith('settings') ? 'settings' : currentView as 'workspace' | 'settings' | 'create' | 'selection' | 'personalities' | 'statistics'}
                    currentWorkspaceId={routeParams.workspaceId || null}
                    onRefresh={setRefreshWorkspaces}
                    onOpenWorkspace={(fn) => { openWorkspaceRef.current = fn; }}
                />
            </div>



            {/* Main content */}
            <main className="flex-1 overflow-hidden">
                {currentView === 'workspace' && routeParams.workspaceId && (
                    <>
                        {/* Show loading state while workspace data is loading */}
                        {workspacesLoading ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="text-center space-y-4">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto opacity-50" />
                                    <p className="text-muted-foreground">Loading workspace...</p>
                                </div>
                            </div>
                        ) : currentWorkspace ? (
                            <>
                                {/* If we have a chatId, show the specific chat */}
                                {routeParams.chatId ? (
                                    <ChatViewInternal
                                        workspaceId={routeParams.workspaceId}
                                        chatId={routeParams.chatId}
                                    />
                                ) : (
                                    /* Otherwise show workspace overview */
                                    <>
                                        {currentWorkspace.templateType === 'standard-chat' ? (
                                            <ChatView
                                                workspaceId={routeParams.workspaceId}
                                            // No chatId provided - will show workspace overview with empty state
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
                        ) : (
                            /* Show workspace not found state */
                            <div className="h-full flex items-center justify-center">
                                <div className="text-center space-y-4 max-w-md">
                                    <h2 className="text-2xl font-bold">Workspace Not Found</h2>
                                    <p className="text-muted-foreground">
                                        The workspace you're looking for doesn't exist or hasn't loaded yet.
                                    </p>
                                    <div className="flex gap-2 justify-center">
                                        <Button
                                            onClick={() => window.location.reload()}
                                            variant="outline"
                                        >
                                            Refresh
                                        </Button>
                                        <Button
                                            onClick={() => navigationUtils.pushState('/workspaces')}
                                        >
                                            Back to Workspaces
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {currentView === 'settings-workspaces' && (
                    <SettingsLayout currentView="workspaces">
                        <WorkspaceSettingsView />
                    </SettingsLayout>
                )}

                {currentView === 'settings-ai-providers' && (
                    <SettingsLayout currentView="ai-providers">
                        <AIProviderSettingsView />
                    </SettingsLayout>
                )}

                {currentView === 'selection' && (
                    <div className="container mx-auto px-4 py-6">
                        <div className="max-w-6xl mx-auto">
                            <h1 className="text-2xl font-bold mb-6">Select Workspace</h1>
                            <WorkspaceSelection
                                userId={currentUser.id}
                                currentWorkspaceId={routeParams.workspaceId || null}
                                openWorkspace={openWorkspaceRef.current}
                                onWorkspaceSelect={navigateToWorkspace}
                            />
                        </div>
                    </div>
                )}

                {currentView === 'create' && (
                    <div className="container mx-auto px-4 py-6">
                        <div className="max-w-4xl mx-auto">
                            <h1 className="text-2xl font-bold mb-6">Create New Workspace</h1>
                            <WorkspaceSetup
                                userId={currentUser.id}
                                onComplete={(workspace) => {
                                    if (workspace) {
                                        // Add a small delay to ensure workspace data is properly invalidated and refetched
                                        setTimeout(() => {
                                            // Use openWorkspace to add the workspace to tabs and navigate
                                            if (openWorkspaceRef.current) {
                                                openWorkspaceRef.current(workspace.id);
                                            } else {
                                                // Fallback to regular navigation if openWorkspace is not available
                                                navigateToWorkspace(workspace.id);
                                            }
                                        }, 100);
                                    } else {
                                        navigateToWorkspaceSelection();
                                    }
                                }}
                            />
                        </div>
                    </div>
                )}

                {currentView === 'personalities' && (
                    <div className="container mx-auto px-4 py-6">
                        <div className="max-w-6xl mx-auto">
                            <h1 className="text-2xl font-bold mb-6">AI Personalities</h1>
                            <PersonalitiesManagement userId={currentUser.id} />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

// Internal ChatView component for client-side routing
interface ChatViewInternalProps {
    workspaceId: string;
    chatId: string;
}

function ChatViewInternal({ workspaceId, chatId }: ChatViewInternalProps) {
    // Simplified - just pass through to ChatView which handles all loading and error states
    return (
        <ChatView
            workspaceId={workspaceId}
            chatId={chatId}
        />
    );
}

// Internal SettingsLayout component for client-side routing
interface SettingsLayoutProps {
    children: React.ReactNode;
    currentView: 'workspaces' | 'ai-providers';
}

function SettingsLayout({ children, currentView }: SettingsLayoutProps) {

    const SETTINGS_TABS = [
        {
            id: 'workspaces',
            label: 'Workspaces',
            icon: <Settings className="h-4 w-4" />,
            description: 'Manage your workspaces and settings',
            path: '/settings/workspaces'
        },
        {
            id: 'ai-providers',
            label: 'AI Providers',
            icon: <Bot className="h-4 w-4" />,
            description: 'Configure AI providers and models',
            path: '/settings/ai-providers'
        }
    ];

    const activeTab = SETTINGS_TABS.find(tab => tab.id === currentView);

    const handleTabClick = (path: string) => {
        navigationUtils.pushState(path);
    };

    const handleAddProvider = () => {
        navigationUtils.pushState('/settings/ai-providers?action=add');
    };

    return (
        <div className="h-full flex">
            <div className="container mx-auto h-full flex">
                {/* Vertical Tabs Sidebar */}
                <div className="w-96 h-full overflow-y-auto">
                    <div className="py-6 space-y-2">
                        {SETTINGS_TABS.map((tab) => (
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
                            {currentView === 'ai-providers' && (
                                <Button onClick={handleAddProvider} className="ml-4">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Provider
                                </Button>
                            )}
                        </div>

                        {/* Tab Content */}
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
