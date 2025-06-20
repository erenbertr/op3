"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SetupWizard } from '@/components/setup/setup-wizard';
import { LoginForm } from '@/components/auth/login-form';
import { WorkspaceApplication } from '@/components/workspace/workspace-application';

import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { apiClient } from '@/lib/api';
import { useSession, signIn, signUp, signOut } from '@/lib/temp-auth';
import { useDelayedSpinner } from '@/lib/hooks/use-delayed-spinner';
import { useDynamicTitle } from '@/lib/hooks/use-dynamic-title';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';



export function AppWrapper() {

    // Use Better Auth session
    const { data: session, isPending: isSessionLoading } = useSession();
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

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

    // Determine app state for title
    const appState = useMemo(() => {
        if (!isLoadingSetup && !setupStatus?.completed) {
            return 'setup';
        } else if (setupStatus?.completed && !session?.user) {
            return 'login';
        } else {
            return 'workspace';
        }
    }, [isLoadingSetup, setupStatus?.completed, session?.user]);

    // Use dynamic title hook
    useDynamicTitle(undefined, undefined, appState);

    // Removed loadInitialWorkspace function - WorkspaceApplication handles its own navigation

    const handleLogin = async (credentials: { email: string; password: string }) => {
        setIsLoggingIn(true);

        try {
            const result = await signIn.email({
                email: credentials.email,
                password: credentials.password,
            });

            if (result.error) {
                throw new Error(result.error.message || 'Login failed');
            }

            // Session will be updated automatically by Better Auth
            // The useEffect above will handle workspace setup check
        } catch (error) {
            // Login failed - error will be handled by the login form
            throw error;
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleRegister = async (credentials: { email: string; password: string; name?: string }) => {
        setIsLoggingIn(true);

        try {
            const result = await signUp.email({
                email: credentials.email,
                password: credentials.password,
                name: credentials.name,
            });

            if (result.error) {
                throw new Error(result.error.message || 'Registration failed');
            }

            // Session will be updated automatically after successful registration
            // The useEffect above will handle workspace setup check
        } catch (error) {
            // Registration failed - error will be handled by the login form
            throw error;
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleLogout = async () => {
        await signOut();
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







    // If setup is not completed, show setup wizard (but only if we're not still loading)
    if (!isLoadingSetup && !setupStatus?.completed) {
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

    // If user is logged in, show workspace application
    if (session?.user) {
        return (
            <WorkspaceApplication
                currentUser={session.user}
                onLogout={handleLogout}
            />
        );
    }

    // If we're still loading setup status or session, show nothing to prevent flash
    if (isLoadingSetup || isSessionLoading) {
        return null;
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
                        Please sign in to continue.
                    </p>
                </div>
                <div className="max-w-md mx-auto">
                    <LoginForm onLogin={handleLogin} onRegister={handleRegister} isLoading={isLoggingIn} />
                </div>
            </main>
        </div>
    );
}
