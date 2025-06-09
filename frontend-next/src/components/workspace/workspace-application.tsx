"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { WorkspaceTabBar } from '@/components/workspace/workspace-tab-bar';
import { StandardChatLayout } from '@/components/workspace/chat/standard-chat-layout';
import { WorkspaceManagementPanel } from '@/components/workspace/workspace-management-panel';
import { WorkspaceSelection } from '@/components/workspace/workspace-selection';
import { WorkspaceSetup } from '@/components/workspace/workspace-setup';
import { PersonalitiesManagement } from '@/components/personalities/personalities-management';
import { ChatSidebar } from '@/components/workspace/chat/chat-sidebar';
import { ChatSessionComponent } from '@/components/workspace/chat/chat-session';
import { WorkspaceSettingsView } from '@/components/workspace/workspace-settings-view';
import { AIProviderSettingsView } from '@/components/workspace/ai-provider-settings-view';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSelector } from '@/components/language-selector';
import { authService, AuthUser } from '@/lib/auth';
import { apiClient, ChatSession, Personality, AIProviderConfig } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { Loader2, LogOut, Settings, Bot, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WorkspaceApplicationProps {
    currentUser: AuthUser;
    pathname: string;
    onLogout: () => void;
}

interface RouteParams {
    workspaceId?: string;
    chatId?: string;
}

export function WorkspaceApplication({ currentUser, pathname: initialPathname, onLogout }: WorkspaceApplicationProps) {
    const router = useRouter();
    const [currentPathname, setCurrentPathname] = useState(initialPathname);
    const [currentWorkspace, setCurrentWorkspace] = useState<{ id: string; name: string; templateType: string; workspaceRules: string; isActive: boolean; createdAt: string } | null>(null);
    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [routeParams, setRouteParams] = useState<RouteParams>({});
    const [, setRefreshWorkspaces] = useState<(() => void) | null>(null);
    const openWorkspaceRef = useRef<((workspaceId: string) => void) | null>(null);

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

    useEffect(() => {
        setRouteParams(params);
    }, [params]);

    // Listen for client-side navigation changes
    useEffect(() => {
        const handlePopState = () => {
            setCurrentPathname(window.location.pathname);
        };

        const handlePushState = () => {
            setCurrentPathname(window.location.pathname);
        };

        window.addEventListener('popstate', handlePopState);
        // Listen for our custom navigation events
        window.addEventListener('popstate', handlePushState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('popstate', handlePushState);
        };
    }, []);

    // Load workspace data
    useEffect(() => {
        const loadWorkspaces = async () => {
            try {
                setIsLoading(true);
                const result = await apiClient.getUserWorkspaces(currentUser.id);
                if (result.success) {
                    setWorkspaces(result.workspaces);

                    // If we have a specific workspace ID in the route, load that workspace
                    if (routeParams.workspaceId) {
                        const workspace = result.workspaces.find(w => w.id === routeParams.workspaceId);
                        if (workspace) {
                            setCurrentWorkspace(workspace);
                            // Set as active workspace
                            await apiClient.setActiveWorkspace(routeParams.workspaceId, currentUser.id);
                        } else {
                            // Workspace not found, redirect to selection
                            router.push('/workspaces');
                        }
                    } else {
                        // No specific workspace, find active one
                        const activeWorkspace = result.workspaces.find(w => w.isActive);
                        if (activeWorkspace) {
                            setCurrentWorkspace(activeWorkspace);
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading workspaces:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadWorkspaces();
    }, [currentUser.id, routeParams.workspaceId]); // Removed router from dependencies

    // Navigation functions that update URL without page reload
    const navigateToWorkspace = useCallback((workspaceId: string) => {
        window.history.pushState(null, '', `/ws/${workspaceId}`);
        setCurrentPathname(`/ws/${workspaceId}`);
    }, []);

    const navigateToChat = useCallback((workspaceId: string, chatId: string) => {
        window.history.pushState(null, '', `/ws/${workspaceId}/chat/${chatId}`);
        setCurrentPathname(`/ws/${workspaceId}/chat/${chatId}`);
    }, []);

    const navigateToSettings = useCallback((section: 'workspaces' | 'ai-providers' = 'workspaces') => {
        window.history.pushState(null, '', `/settings/${section}`);
        setCurrentPathname(`/settings/${section}`);
    }, []);

    const navigateToPersonalities = useCallback(() => {
        window.history.pushState(null, '', '/personalities');
        setCurrentPathname('/personalities');
    }, []);

    const navigateToWorkspaceSelection = useCallback(() => {
        window.history.pushState(null, '', '/workspaces');
        setCurrentPathname('/workspaces');
    }, []);

    const navigateToCreateWorkspace = useCallback(() => {
        window.history.pushState(null, '', '/add/workspace');
        setCurrentPathname('/add/workspace');
    }, []);

    if (isLoading) {
        return (
            <div className="h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    <p className="text-muted-foreground">Loading workspace...</p>
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
                    currentView={currentView.startsWith('settings') ? 'settings' : currentView}
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
    const router = useRouter();
    const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
    const [personalities, setPersonalities] = useState<Personality[]>([]);
    const [aiProviders, setAIProviders] = useState<AIProviderConfig[]>([]);
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();

    useEffect(() => {
        const loadChatData = async () => {
            try {
                setIsLoading(true);

                // Load all required data in parallel
                const [personalitiesResult, aiProvidersResult, chatSessionsResult] = await Promise.all([
                    apiClient.getPersonalities(currentUser.id),
                    apiClient.getAIProviders(),
                    apiClient.getChatSessions(currentUser.id, workspaceId)
                ]);

                if (personalitiesResult.success) {
                    setPersonalities(personalitiesResult.personalities);
                }

                if (aiProvidersResult.success) {
                    setAIProviders(aiProvidersResult.providers);
                } else {
                    console.error('Failed to load AI providers:', aiProvidersResult.message);
                    addToast({
                        title: "Warning",
                        description: "Failed to load AI providers. Please check your configuration.",
                        variant: "destructive"
                    });
                }

                if (chatSessionsResult.success) {
                    const sessions = chatSessionsResult.sessions || [];
                    setChatSessions(sessions);

                    // Find the specific chat session
                    const foundSession = sessions.find(s => s.id === chatId);
                    if (foundSession) {
                        setActiveSession(foundSession);
                    } else {
                        setError('Chat session not found');
                    }
                } else {
                    console.error('Failed to load chat sessions:', chatSessionsResult.message);
                    setError('Failed to load chat sessions');
                }
            } catch (error) {
                console.error('Error loading chat data:', error);
                setError('Failed to load chat data');
            } finally {
                setIsLoading(false);
            }
        };

        loadChatData();
    }, [workspaceId, chatId, currentUser.id, addToast]);

    const handleNewChat = (session: ChatSession) => {
        window.history.pushState(null, '', `/ws/${workspaceId}/chat/${session.id}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    const handleChatSelect = (session: ChatSession) => {
        window.history.pushState(null, '', `/ws/${workspaceId}/chat/${session.id}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    const handleSessionUpdate = (updatedSession: ChatSession) => {
        setActiveSession(updatedSession);
    };

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
                        onClick={() => {
                            window.history.pushState(null, '', `/ws/${workspaceId}`);
                            window.dispatchEvent(new PopStateEvent('popstate'));
                        }}
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
                            onSessionsUpdate={setChatSessions}
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
    const router = useRouter();

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
        window.history.pushState(null, '', path);
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    const handleAddProvider = () => {
        window.history.pushState(null, '', '/settings/ai-providers?action=add');
        window.dispatchEvent(new PopStateEvent('popstate'));
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
