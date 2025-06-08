"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { SetupWizard } from '@/components/setup/setup-wizard';
import { LoginForm } from '@/components/auth/login-form';
import { WorkspaceSetup } from '@/components/workspace/workspace-setup';
import { WorkspaceTabBar } from '@/components/workspace/workspace-tab-bar';
import { WorkspaceManagementPanel } from '@/components/workspace/workspace-management-panel';
import { WorkspaceSelection } from '@/components/workspace/workspace-selection';
import { StandardChatLayout } from '@/components/workspace/chat/standard-chat-layout';
import { PersonalitiesManagement } from '@/components/personalities/personalities-management';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSelector } from '@/components/language-selector';
import { useI18n } from '@/lib/i18n';
import { apiClient, SetupStatusResponse } from '@/lib/api';
import { authService, AuthUser } from '@/lib/auth';
import { Loader2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

type SetupStatus = SetupStatusResponse['setup'];

export function AppWrapper() {
    const { t } = useI18n();
    const [isLoading, setIsLoading] = useState(true);
    const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
    const [showWorkspaceSetup, setShowWorkspaceSetup] = useState(false);
    const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
    const [currentWorkspace, setCurrentWorkspace] = useState<{ id: string; name: string; templateType: string; workspaceRules: string; isActive: boolean; createdAt: string } | null>(null);
    const [currentView, setCurrentView] = useState<'workspace' | 'settings' | 'create' | 'selection' | 'personalities'>('workspace');
    const [, setRefreshWorkspaces] = useState<(() => void) | null>(null);







    const initializeApp = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Check setup status first
            const response = await apiClient.getSetupStatus();

            if (response.success && response.setup) {
                setSetupStatus(response.setup);

                // If setup is completed, check for existing authentication
                if (response.setup.completed) {
                    const user = authService.getCurrentUser();
                    if (user) {
                        setCurrentUser(user);
                        // Check if user needs workspace setup
                        if (!user.hasCompletedWorkspaceSetup) {
                            setShowWorkspaceSetup(true);
                        } else {
                            // Load initial workspace for authenticated user
                            await loadInitialWorkspace(user.id);
                        }
                    }
                }
            } else {
                setError('Failed to check setup status');
            }
        } catch (error) {
            console.error('Error initializing app:', error);
            setError(error instanceof Error ? error.message : 'Unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        initializeApp();
    }, [initializeApp]);

    const handleLogin = async (credentials: { email: string; password: string }) => {
        try {
            setIsLoading(true);
            const result = await authService.login(credentials);

            if (result.success && result.user) {
                setCurrentUser(result.user);

                // Check if user needs workspace setup
                if (!result.user.hasCompletedWorkspaceSetup) {
                    setShowWorkspaceSetup(true);
                } else {
                    // Load initial workspace for authenticated user
                    await loadInitialWorkspace(result.user.id);
                }
            } else {
                setError(result.message || 'Login failed');
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        authService.logout();
        setCurrentUser(null);
        setShowWorkspaceSetup(false);
        setError(null);
    };

    const handleWorkspaceSetupComplete = (workspace: { id: string; name: string; templateType: string; workspaceRules: string; isActive: boolean; createdAt: string } | undefined) => {
        console.log('Workspace setup completed:', workspace);
        setShowWorkspaceSetup(false);

        // Set the current workspace
        if (workspace) {
            setCurrentWorkspaceId(workspace.id);
            setCurrentWorkspace(workspace);
        }

        // Update user state to reflect completed workspace setup
        if (currentUser) {
            const updatedUser = {
                ...currentUser,
                hasCompletedWorkspaceSetup: true
            };
            setCurrentUser(updatedUser);
            authService.updateUser({ hasCompletedWorkspaceSetup: true });
        }
    };

    const loadInitialWorkspace = async (userId: string) => {
        try {
            const result = await apiClient.getUserWorkspaces(userId);
            if (result.success) {
                const activeWorkspace = result.workspaces.find(w => w.isActive);
                if (activeWorkspace) {
                    setCurrentWorkspaceId(activeWorkspace.id);
                    setCurrentWorkspace(activeWorkspace);
                }
            }
        } catch (error) {
            console.error('Error loading initial workspace:', error);
        }
    };

    const loadWorkspaceDetails = async (workspaceId: string): Promise<void> => {
        if (!currentUser) return;

        try {
            const result = await apiClient.getUserWorkspaces(currentUser.id);
            if (result.success) {
                const workspace = result.workspaces.find(w => w.id === workspaceId);
                if (workspace) {
                    setCurrentWorkspace(workspace);
                }
            }
        } catch (error) {
            console.error('Error loading workspace details:', error);
        }
    };

    const handleWorkspaceChange = async (workspaceId: string) => {
        // Always update the workspace, even if it's the same ID
        // This ensures the view switches to 'workspace' and UI updates properly
        setCurrentWorkspaceId(workspaceId);
        setCurrentView('workspace');
        await loadWorkspaceDetails(workspaceId);
        // Note: refreshWorkspaces() is automatically called by useEffect when currentWorkspaceId changes
    };

    const handleShowSettings = () => {
        setCurrentView('settings');
    };

    const handleShowCreateWorkspace = () => {
        setCurrentView('create');
    };

    const handleShowWorkspaceSelection = () => {
        setCurrentView('selection');
    };

    const handleShowPersonalities = () => {
        setCurrentView('personalities');
    };

    const handleBackToWorkspace = () => {
        setCurrentView('workspace');
    };

    if (isLoading) {
        return (
            <div className="h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    <p className="text-muted-foreground">Loading application...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4 max-w-md">
                    <h1 className="text-2xl font-bold text-destructive">Error</h1>
                    <p className="text-muted-foreground">{error}</p>
                    <button
                        onClick={initializeApp}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // If setup is not completed, show setup wizard
    if (!setupStatus?.completed) {
        return (
            <div className="h-screen bg-background">
                {/* Header with theme toggle and language selector */}
                <header className="border-b">
                    <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold">OP3</h1>
                            <span className="text-sm text-muted-foreground">Setup</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <LanguageSelector />
                            <ThemeToggle />
                        </div>
                    </div>
                </header>

                {/* Setup wizard */}
                <main>
                    <SetupWizard />
                </main>
            </div>
        );
    }

    // If user is logged in and needs workspace setup
    if (currentUser && showWorkspaceSetup) {
        return (
            <div className="h-screen bg-background">
                {/* Header with theme toggle and language selector */}
                <header className="border-b">
                    <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold">OP3</h1>
                            <span className="text-sm text-muted-foreground">Workspace Setup</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground">
                                Welcome, {currentUser.email}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleLogout}
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

                {/* Workspace setup */}
                <main>
                    <WorkspaceSetup
                        userId={currentUser.id}
                        onComplete={handleWorkspaceSetupComplete}
                    />
                </main>
            </div>
        );
    }

    // If user is logged in and has completed workspace setup
    if (currentUser && currentUser.hasCompletedWorkspaceSetup) {
        return (
            <div className="h-screen bg-background flex flex-col">
                {/* Header with theme toggle and language selector */}
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
                                onClick={handleLogout}
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
                        currentView={currentView}
                        currentWorkspaceId={currentWorkspaceId}
                        onWorkspaceChange={handleWorkspaceChange}
                        onShowSettings={handleShowSettings}
                        onShowCreateWorkspace={handleShowCreateWorkspace}
                        onShowWorkspaceSelection={handleShowWorkspaceSelection}
                        onShowPersonalities={handleShowPersonalities}
                        onRefresh={setRefreshWorkspaces}
                    />
                </div>

                {/* Main content based on current view */}
                <main className="flex-1 overflow-hidden">
                    {currentView === 'workspace' && (
                        <>
                            {currentWorkspace?.templateType === 'standard-chat' ? (
                                <div className="container mx-auto px-4 h-full">
                                    <StandardChatLayout
                                        workspaceId={currentWorkspaceId || ''}
                                        userId={currentUser?.id || ''}
                                        className="h-full"
                                    />
                                </div>
                            ) : (
                                <div className="container mx-auto px-4 py-8">
                                    <div className="text-center space-y-4">
                                        <h2 className="text-2xl font-bold">Welcome to your workspace!</h2>
                                        <p className="text-muted-foreground">
                                            {currentWorkspace?.templateType
                                                ? `Template: ${currentWorkspace.templateType}. This template will be implemented in the next phase.`
                                                : 'Your workspace has been set up successfully. The actual workspace templates will be implemented in the next phase.'
                                            }
                                        </p>
                                        {currentWorkspaceId && (
                                            <p className="text-sm text-muted-foreground">
                                                Current workspace ID: {currentWorkspaceId}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {currentView === 'settings' && (
                        <div className="container mx-auto px-4 py-6">
                            <div className="max-w-4xl mx-auto">
                                <h1 className="text-2xl font-bold mb-6">Workspace Settings</h1>
                                <WorkspaceManagementPanel
                                    userId={currentUser.id}
                                    workspaces={[]} // Will be loaded by the component
                                    onClose={handleBackToWorkspace}
                                    onWorkspaceUpdated={() => { }}
                                    onWorkspaceDeleted={() => { }}
                                />
                            </div>
                        </div>
                    )}

                    {currentView === 'selection' && (
                        <div className="container mx-auto px-4 py-6">
                            <div className="max-w-6xl mx-auto">
                                <h1 className="text-2xl font-bold mb-6">Select Workspace</h1>
                                <WorkspaceSelection
                                    userId={currentUser.id}
                                    currentWorkspaceId={currentWorkspaceId}
                                    onWorkspaceSelect={async (workspaceId) => {
                                        setCurrentWorkspaceId(workspaceId);
                                        await loadWorkspaceDetails(workspaceId);
                                        // Note: refreshWorkspaces() is automatically called by useEffect when currentWorkspaceId changes
                                        handleBackToWorkspace();
                                    }}
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
                                            setCurrentWorkspaceId(workspace.id);
                                            setCurrentWorkspace(workspace);
                                        }
                                        handleBackToWorkspace();
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

    // If setup is completed but user is not logged in, show login form
    return (
        <div className="h-screen bg-background">
            {/* Header with theme toggle and language selector */}
            <header className="border-b">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold">OP3</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <LanguageSelector />
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            {/* Main application content */}
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-md mx-auto">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold mb-2">{t('login.title')}</h2>
                        <p className="text-muted-foreground">
                            Setup completed successfully! Please sign in to continue.
                        </p>
                    </div>
                    <LoginForm onLogin={handleLogin} isLoading={isLoading} />
                </div>
            </main>
        </div>
    );
}
