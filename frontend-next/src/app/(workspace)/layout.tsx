"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';

interface WorkspaceLayoutProps {
    children: React.ReactNode;
}

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
    const router = useRouter();
    const [isClientReady, setIsClientReady] = useState(false);

    // Auth check using useEffect to prevent hydration mismatch
    useEffect(() => {
        const user = authService.getCurrentUser();
        if (!user) {
            router.push('/');
            return;
        }

        if (!user.hasCompletedWorkspaceSetup) {
            router.push('/');
            return;
        }

        setIsClientReady(true);
    }, [router]);

    // Show loading while client is initializing to prevent hydration mismatch
    if (!isClientReady) {
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
