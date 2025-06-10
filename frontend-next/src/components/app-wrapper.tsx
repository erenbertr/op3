"use client"

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SetupWizard } from '@/components/setup/setup-wizard';
import { LoginForm } from '@/components/auth/login-form';
import { WorkspaceSetup } from '@/components/workspace/workspace-setup';
import { WorkspaceApplication } from '@/components/workspace/workspace-application';

import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { apiClient } from '@/lib/api';
import { authService, AuthUser } from '@/lib/auth';
import { useDelayedSpinner } from '@/lib/hooks/use-delayed-spinner';
import { Loader2 } from 'lucide-react';



export function AppWrapper() {

    // Initialize user state from auth service
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
        return authService.getCurrentUser();
    });

    const [showWorkspaceSetup, setShowWorkspaceSetup] = useState(() => {
        const user = authService.getCurrentUser();
        return user ? !user.hasCompletedWorkspaceSetup : false;
    });

    // Use delayed spinner for setup loading
    const { showSpinner: showSetupSpinner, startLoading: startSetupLoading, stopLoading: stopSetupLoading } = useDelayedSpinner(3000);

    // Use TanStack Query for setup status
    const { data: setupResponse, isLoading: isLoadingSetup, error: setupError } = useQuery({
        queryKey: ['setup-status'],
        queryFn: () => apiClient.getSetupStatus(),
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchInterval: false, // Disable automatic refetching
        refetchIntervalInBackground: false, // Disable background refetching
        retry: 1, // Limit retries to prevent infinite loops
        onSuccess: () => {
            stopSetupLoading();
        },
        onError: () => {
            stopSetupLoading();
        }
    });

    // Start loading when setup query starts
    useEffect(() => {
        if (isLoadingSetup) {
            startSetupLoading();
        } else {
            stopSetupLoading();
        }
    }, [isLoadingSetup, startSetupLoading, stopSetupLoading]);

    // Derived state from query
    const setupStatus = setupResponse?.setup || null;







    // Removed loadInitialWorkspace function - WorkspaceApplication handles its own navigation

    // User state is now initialized directly in useState, no need for additional initialization



    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleLogin = async (credentials: { email: string; password: string }) => {
        setIsLoggingIn(true);

        try {
            const result = await authService.login(credentials);

            if (result.success && result.user) {
                setCurrentUser(result.user);

                // Check if user needs workspace setup
                if (!result.user.hasCompletedWorkspaceSetup) {
                    setShowWorkspaceSetup(true);
                }
                // WorkspaceApplication will handle navigation when rendered
            }
        } catch (error) {
            // Login failed - error will be handled by the login form
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleLogout = () => {
        authService.logout();
        setCurrentUser(null);
        setShowWorkspaceSetup(false);
    };

    const handleWorkspaceSetupComplete = (_workspace: { id: string; name: string; templateType: string; workspaceRules: string; isActive: boolean; createdAt: string } | undefined) => {
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

        // WorkspaceApplication will handle navigation when rendered
    };



    if (showSetupSpinner) {
        return (
            <div className="h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    <p className="text-muted-foreground">Loading application...</p>
                </div>
            </div>
        );
    }

    if (setupError) {
        return (
            <div className="h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4 max-w-md">
                    <h1 className="text-2xl font-bold text-destructive">Error</h1>
                    <p className="text-muted-foreground">{setupError.message}</p>
                    <button
                        onClick={() => window.location.reload()}
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
                            <UserMenu userEmail={currentUser.email} onLogout={handleLogout} />
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

    // If user is logged in and has completed workspace setup, show workspace application
    if (currentUser && currentUser.hasCompletedWorkspaceSetup) {
        return (
            <WorkspaceApplication
                currentUser={currentUser}
                onLogout={handleLogout}
            />
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
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            {/* Main application content */}
            <main className="container mx-auto px-4 py-8">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2">Sign In</h2>
                    <p className="text-muted-foreground">
                        Setup completed successfully! Please sign in to continue.
                    </p>
                </div>
                <div className="max-w-md mx-auto">
                    <LoginForm onLogin={handleLogin} isLoading={isLoggingIn} />
                </div>
            </main>
        </div>
    );
}
