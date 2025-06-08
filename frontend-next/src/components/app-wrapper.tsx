"use client"

import React, { useState, useEffect } from 'react';
import { SetupWizard } from '@/components/setup/setup-wizard';
import { LoginForm } from '@/components/auth/login-form';
import { WorkspaceSetup } from '@/components/workspace/workspace-setup';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSelector } from '@/components/language-selector';
import { useI18n } from '@/lib/i18n';
import { apiClient, SetupStatusResponse } from '@/lib/api';
import { Loader2 } from 'lucide-react';

type SetupStatus = SetupStatusResponse['setup'];

// Mock user interface for demonstration
interface MockUser {
    id: string;
    email: string;
    hasCompletedWorkspaceSetup: boolean;
}

export function AppWrapper() {
    const { t } = useI18n();
    const [isLoading, setIsLoading] = useState(true);
    const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<MockUser | null>(null);
    const [showWorkspaceSetup, setShowWorkspaceSetup] = useState(false);

    useEffect(() => {
        checkSetupStatus();
    }, []);

    const checkSetupStatus = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await apiClient.getSetupStatus();

            if (response.success && response.setup) {
                setSetupStatus(response.setup);
            } else {
                setError('Failed to check setup status');
            }
        } catch (error) {
            console.error('Error checking setup status:', error);
            setError(error instanceof Error ? error.message : 'Unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async (credentials: { email: string; password: string }) => {
        // Mock login logic for demonstration
        console.log('Login attempt:', credentials);

        // Create a mock user (in real implementation, this would come from the backend)
        const mockUser: MockUser = {
            id: 'user-123',
            email: credentials.email,
            hasCompletedWorkspaceSetup: false // This would be checked from the backend
        };

        setCurrentUser(mockUser);

        // Check if user needs workspace setup
        if (!mockUser.hasCompletedWorkspaceSetup) {
            setShowWorkspaceSetup(true);
        }
    };

    const handleWorkspaceSetupComplete = (workspace: { id: string; templateType: string; workspaceRules: string; createdAt: string } | undefined) => {
        console.log('Workspace setup completed:', workspace);
        setShowWorkspaceSetup(false);

        // Update user state to reflect completed workspace setup
        if (currentUser) {
            setCurrentUser({
                ...currentUser,
                hasCompletedWorkspaceSetup: true
            });
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    <p className="text-muted-foreground">Loading application...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4 max-w-md">
                    <h1 className="text-2xl font-bold text-destructive">Error</h1>
                    <p className="text-muted-foreground">{error}</p>
                    <button
                        onClick={checkSetupStatus}
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
            <div className="min-h-screen bg-background">
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
            <div className="min-h-screen bg-background">
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
            <div className="min-h-screen bg-background">
                {/* Header with theme toggle and language selector */}
                <header className="border-b">
                    <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold">OP3</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground">
                                Welcome, {currentUser.email}
                            </span>
                            <LanguageSelector />
                            <ThemeToggle />
                        </div>
                    </div>
                </header>

                {/* Main workspace content */}
                <main className="container mx-auto px-4 py-8">
                    <div className="text-center space-y-4">
                        <h2 className="text-2xl font-bold">Welcome to your workspace!</h2>
                        <p className="text-muted-foreground">
                            Your workspace has been set up successfully. The actual workspace templates will be implemented in the next phase.
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    // If setup is completed but user is not logged in, show login form
    return (
        <div className="min-h-screen bg-background">
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
                    <LoginForm onLogin={handleLogin} />
                </div>
            </main>
        </div>
    );
}
