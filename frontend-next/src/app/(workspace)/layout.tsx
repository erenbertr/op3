"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';
import { useDelayedSpinner } from '@/lib/hooks/use-delayed-spinner';

interface WorkspaceLayoutProps {
    children: React.ReactNode;
}

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
    const router = useRouter();
    const [isClientReady, setIsClientReady] = useState(false);
    const { showSpinner, startLoading, stopLoading } = useDelayedSpinner(3000);

    // Auth check using useEffect to prevent hydration mismatch
    useEffect(() => {
        startLoading(); // Start the delayed spinner

        const user = authService.getCurrentUser();
        if (!user) {
            stopLoading();
            router.push('/');
            return;
        }

        if (!user.hasCompletedWorkspaceSetup) {
            stopLoading();
            router.push('/');
            return;
        }

        setIsClientReady(true);
        stopLoading();
    }, [router, startLoading, stopLoading]);

    // Show loading while client is initializing to prevent hydration mismatch
    if (!isClientReady && showSpinner) {
        return (
            <div className="h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted-foreground/20 border-t-muted-foreground/40 mx-auto"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
