"use client"

import React, { useState, useCallback, useRef } from 'react';
import { WorkspaceTabBar } from '@/components/workspace/workspace-tab-bar';
import { StandardChatLayout } from '@/components/workspace/chat/standard-chat-layout';
import { WorkspaceSelection } from '@/components/workspace/workspace-selection';
import { WorkspaceSetup } from '@/components/workspace/workspace-setup';
import { PersonalitiesManagement } from '@/components/personalities/personalities-management';
import { ChatSidebar } from '@/components/workspace/chat/chat-sidebar';
import { ChatSessionComponent } from '@/components/workspace/chat/chat-session';
import { WorkspaceSettingsView } from '@/components/workspace/workspace-settings-view';
import { AIProviderSettingsView } from '@/components/workspace/ai-provider-settings-view';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSelector } from '@/components/language-selector';
import { AuthUser } from '@/lib/auth';
import { apiClient, ChatSession } from '@/lib/api';
import { usePathname as usePathnameHook, navigationUtils } from '@/lib/hooks/use-pathname';
import { useWorkspaces, useSetActiveWorkspace } from '@/lib/hooks/use-query-hooks';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/components/ui/toast';
import { Loader2, LogOut, Settings, Bot, Plus } from 'lucide-react';
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
    const currentPathname = usePathnameHook(); // Use the new hook instead of state
    const [currentWorkspace, setCurrentWorkspace] = useState<{ id: string; name: string; templateType: string; workspaceRules: string; isActive: boolean; createdAt: string } | null>(null);
    const [routeParams, setRouteParams] = useState<RouteParams>({});
    const [, setRefreshWorkspaces] = useState<(() => void) | null>(null);
    const openWorkspaceRef = useRef<((workspaceId: string) => void) | null>(null);
    const activeWorkspaceSetRef = useRef<string | null>(null); // Track which workspace we've set as active

    // Use TanStack Query for data fetching
    const { data: workspacesResult, isLoading: workspacesLoading, error: workspacesError } = useWorkspaces(currentUser.id);
    const setActiveWorkspaceMutation = useSetActiveWorkspace();

    // Create a stable callback for setting active workspace
    const setActiveWorkspace = useCallback((workspaceId: string) => {
        if (activeWorkspaceSetRef.current !== workspaceId && !setActiveWorkspaceMutation.isPending) {
            activeWorkspaceSetRef.current = workspaceId;
            setActiveWorkspaceMutation.mutate({
                workspaceId,
                userId: currentUser.id
            });
        }
    }, [setActiveWorkspaceMutation, currentUser.id]);



    // Parse route parameters from pathname
    const parseRoute = useCallback((path: string): { view: string; params: RouteParams } => {
        // Handle workspace routes
        const wsMatch = path.match(/^\/ws\/([^\/]+)(?:\/chat\/([^\/]+))?$/);
        if (wsMatch) {
            return {
                view: wsMatch[2] ? 'chat' : 'workspace',
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
    }, []);

    const { view: currentView, params } = parseRoute(currentPathname);

    // Update route params when they change
    React.useLayoutEffect(() => {
        setRouteParams(params);
    }, [params]);

    // Effect to handle workspace selection
    React.useLayoutEffect(() => {
        if (workspacesResult?.success) {
            const workspaces = workspacesResult.workspaces;

            // If we have a specific workspace ID in the route, load that workspace
            if (routeParams.workspaceId) {
                const workspace = workspaces.find(w => w.id === routeParams.workspaceId);
                if (workspace) {
                    setCurrentWorkspace(workspace);
                } else {
                    // Workspace not found, redirect to selection
                    navigationUtils.pushState('/workspaces');
                }
            } else {
                // No specific workspace, find active one
                const activeWorkspace = workspaces.find(w => w.isActive);
                if (activeWorkspace) {
                    setCurrentWorkspace(activeWorkspace);
                }
            }
        }
    }, [workspacesResult, routeParams.workspaceId]);

    // Separate effect to handle setting active workspace (to avoid circular dependencies)
    React.useLayoutEffect(() => {
        // Reset the active workspace ref when workspace ID changes
        if (activeWorkspaceSetRef.current !== routeParams.workspaceId) {
            activeWorkspaceSetRef.current = null;
        }

        if (workspacesResult?.success && routeParams.workspaceId) {
            const workspace = workspacesResult.workspaces.find(w => w.id === routeParams.workspaceId);

            // Only set active workspace if workspace exists and is not already active
            if (workspace && !workspace.isActive) {
                setActiveWorkspace(routeParams.workspaceId);
            }
        }
    }, [workspacesResult, routeParams.workspaceId, setActiveWorkspace]);

    // Navigation functions using the new navigation utils
    const navigateToWorkspace = useCallback((workspaceId: string) => {
        navigationUtils.pushState(`/ws/${workspaceId}`);
    }, []);

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
                        <span className="text-sm text-muted-foreground">
                            Welcome, {currentUser.email}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onLogout}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </Button>
                        <LanguageSelector />
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
                {currentView === 'workspace' && routeParams.workspaceId && currentWorkspace && (
                    <>
                        {currentWorkspace.templateType === 'standard-chat' ? (
                            <StandardChatLayout
                                workspaceId={routeParams.workspaceId}
                                userId={currentUser.id}
                                className="h-full"
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

                {currentView === 'chat' && routeParams.workspaceId && routeParams.chatId && (
                    <ChatViewInternal
                        workspaceId={routeParams.workspaceId}
                        chatId={routeParams.chatId}
                        currentUser={currentUser}
                    />
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
                                        navigateToWorkspace(workspace.id);
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
    currentUser: AuthUser;
}

function ChatViewInternal({ workspaceId, chatId, currentUser }: ChatViewInternalProps) {
    const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();

    // Use TanStack Query for data fetching
    const { data: personalitiesResult } = useQuery({
        queryKey: ['personalities', currentUser.id],
        queryFn: () => apiClient.getPersonalities(currentUser.id),
    });

    const { data: aiProvidersResult } = useQuery({
        queryKey: ['ai-providers'],
        queryFn: () => apiClient.getAIProviders(),
    });

    const { data: chatSessionsResult, isLoading: chatSessionsLoading } = useQuery({
        queryKey: ['chat-sessions', currentUser.id, workspaceId],
        queryFn: () => apiClient.getChatSessions(currentUser.id, workspaceId),
    });

    // Derived state from queries (memoized to prevent unnecessary re-renders)
    const personalities = React.useMemo(() =>
        personalitiesResult?.success ? personalitiesResult.personalities : [],
        [personalitiesResult]
    );
    const aiProviders = React.useMemo(() =>
        aiProvidersResult?.success ? aiProvidersResult.providers : [],
        [aiProvidersResult]
    );
    const chatSessions = React.useMemo(() =>
        chatSessionsResult?.success ? chatSessionsResult.sessions || [] : [],
        [chatSessionsResult]
    );

    // Handle chat session selection and error handling
    React.useLayoutEffect(() => {
        if (chatSessions.length > 0) {
            // Find the specific chat session
            const foundSession = chatSessions.find((s: ChatSession) => s.id === chatId);
            if (foundSession) {
                setActiveSession(foundSession);
                setError(null);
            } else {
                setError('Chat session not found');
            }
        }
    }, [chatSessions, chatId]);

    // Handle AI providers error
    React.useLayoutEffect(() => {
        if (aiProvidersResult && !aiProvidersResult.success) {
            console.error('Failed to load AI providers');
            addToast({
                title: "Warning",
                description: "Failed to load AI providers. Please check your configuration.",
                variant: "destructive"
            });
        }
    }, [aiProvidersResult, addToast]);

    const handleNewChat = (session: ChatSession) => {
        navigationUtils.pushState(`/ws/${workspaceId}/chat/${session.id}`);
    };

    const handleChatSelect = (session: ChatSession) => {
        navigationUtils.pushState(`/ws/${workspaceId}/chat/${session.id}`);
    };

    const handleSessionUpdate = (updatedSession: ChatSession) => {
        setActiveSession(updatedSession);
    };

    const isLoading = chatSessionsLoading;

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    <p className="text-muted-foreground">Loading chat...</p>
                </div>
            </div>
        );
    }

    if (error || !activeSession) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4 max-w-md">
                    <h2 className="text-2xl font-bold text-destructive">Error</h2>
                    <p className="text-muted-foreground">{error || 'Chat session not found'}</p>
                    <button
                        onClick={() => navigationUtils.pushState(`/ws/${workspaceId}`)}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    >
                        Back to Workspace
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full">
            <div className="container mx-auto h-full px-4">
                <div className="flex h-full">
                    {/* Left Sidebar - Fixed width */}
                    <div className="w-80 flex-shrink-0 h-full border-l border-border">
                        <ChatSidebar
                            userId={currentUser.id}
                            workspaceId={workspaceId}
                            onNewChat={handleNewChat}
                            onChatSelect={handleChatSelect}
                            activeChatId={activeSession.id}
                            chatSessions={chatSessions}
                        />
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 h-full border-r border-border">
                        <ChatSessionComponent
                            session={activeSession}
                            personalities={personalities || []}
                            aiProviders={aiProviders || []}
                            onSessionUpdate={handleSessionUpdate}
                            userId={currentUser.id}
                            className="h-full"
                        />
                    </div>
                </div>
            </div>
        </div>
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
                                className={`w-full justify-start h-auto p-3 ${currentView === tab.id
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
