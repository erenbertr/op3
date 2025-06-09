"use client"

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SetupWizard } from '@/components/setup/setup-wizard';
import { LoginForm } from '@/components/auth/login-form';
import { WorkspaceSetup } from '@/components/workspace/workspace-setup';

import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSelector } from '@/components/language-selector';
import { useI18n } from '@/lib/i18n';
import { apiClient, SetupStatusResponse } from '@/lib/api';
import { authService, AuthUser } from '@/lib/auth';
import { useDelayedSpinner } from '@/lib/hooks/use-delayed-spinner';
import { useAsyncData } from '@/lib/hooks/use-async-data';
import { Loader2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

type SetupStatus = SetupStatusResponse['setup'];

export function AppWrapper() {
    const { t } = useI18n();
    const router = useRouter();
    const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
    const [showWorkspaceSetup, setShowWorkspaceSetup] = useState(false);

    // Use new hooks instead of useEffect patterns
    const { isLoading, showSpinner, startLoading, stopLoading } = useDelayedSpinner(3000);
    const setupDataFetcher = useAsyncData(React.useCallback(() => apiClient.getSetupStatus(), []));







    const loadInitialWorkspace = useCallback(async (userId: string) => {
        try {
            const result = await apiClient.getUserWorkspaces(userId);
            if (result.success && result.workspaces.length > 0) {
                const activeWorkspace = result.workspaces.find(w => w.isActive);
                if (activeWorkspace) {
                    // Navigate to the active workspace (client-side)
                    router.push(`/ws/${activeWorkspace.id}`);
                } else {
                    // Navigate to workspace selection if no active workspace
                    router.push('/workspaces');
                }
            } else {
                // Navigate to create workspace if no workspaces exist
                router.push('/add/workspace');
            }
        } catch (error) {
            console.error('Error loading initial workspace:', error);
            // Fallback to workspace selection
            router.push('/workspaces');
        }
    }, [router]);

    const [hasInitialized, setHasInitialized] = useState(false);

    // Initialize app on mount using useEffect
    React.useEffect(() => {
        if (hasInitialized) return;

        const initializeApp = async () => {
            try {
                startLoading();

                const setupResponse = await apiClient.getSetupStatus();

                if (setupResponse.success && setupResponse.setup) {
                    setSetupStatus(setupResponse.setup);

                    if (setupResponse.setup.completed) {
                        const user = authService.getCurrentUser();
                        if (user) {
                            setCurrentUser(user);
                            if (!user.hasCompletedWorkspaceSetup) {
                                setShowWorkspaceSetup(true);
                            } else {
                                await loadInitialWorkspace(user.id);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error initializing app:', error);
            } finally {
                setHasInitialized(true);
                stopLoading();
            }
        };

        initializeApp();
    }, []);

    const handleLogin = async (credentials: { email: string; password: string }) => {
        startLoading();

        try {
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
            }
        } catch (error) {
            console.error('Login failed:', error);
        } finally {
            stopLoading();
        }
    };

    const handleLogout = () => {
        authService.logout();
        setCurrentUser(null);
        setShowWorkspaceSetup(false);
        setupDataFetcher.reset();
    };

    const handleWorkspaceSetupComplete = (workspace: { id: string; name: string; templateType: string; workspaceRules: string; isActive: boolean; createdAt: string } | undefined) => {
        console.log('Workspace setup completed:', workspace);
        setShowWorkspaceSetup(false);

        // Update user state to reflect completed workspace setup
        if (currentUser) {
            const updatedUser = {
                ...currentUser,
                hasCompletedWorkspaceSetup: true
            };
            setCurrentUser(updatedUser);
            authService.updateUser({ hasCompletedWorkspaceSetup: true });
        }

        // Navigate to the new workspace if created (client-side)
        if (workspace) {
            router.push(`/ws/${workspace.id}`);
        }
    };



    if (isLoading && showSpinner) {
        return (
            <div className="h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    <p className="text-muted-foreground">Loading application...</p>
                </div>
            </div>
        );
    }

    // Show blank screen during initial 3 seconds of loading
    if (isLoading && !showSpinner) {
        return (
            <div className="h-screen bg-background">
                {/* Blank screen - no spinner yet */}
            </div>
        );
    }

    if (setupDataFetcher.error) {
        return (
            <div className="h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4 max-w-md">
                    <h1 className="text-2xl font-bold text-destructive">Error</h1>
                    <p className="text-muted-foreground">{setupDataFetcher.error}</p>
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

    // If user is logged in and has completed workspace setup, redirect to workspaces
    if (currentUser && currentUser.hasCompletedWorkspaceSetup) {
        // Redirect to workspaces page to let the user select or create a workspace
        React.useLayoutEffect(() => {
            const timeoutId = setTimeout(() => {
                router.push('/workspaces');
            }, 100);
            return () => clearTimeout(timeoutId);
        }, []);

        return (
            <div className="h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    <p className="text-muted-foreground">Redirecting to workspace...</p>
                </div>
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
