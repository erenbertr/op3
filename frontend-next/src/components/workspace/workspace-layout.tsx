"use client"

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { WorkspaceTabBar } from '@/components/workspace/workspace-tab-bar';
import { PinnedGroupTabs } from '@/components/workspace/pinned-group-tabs';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { useSession, signOut, User } from '@/lib/temp-auth';
import { useDelayedSpinner } from '@/lib/hooks/use-delayed-spinner';

interface WorkspaceLayoutProps {
    children: React.ReactNode;
    currentWorkspaceId?: string | null;
}

export function WorkspaceLayout({ children, currentWorkspaceId }: WorkspaceLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [isClientReady, setIsClientReady] = useState(false);
    const { showSpinner, startLoading, stopLoading } = useDelayedSpinner(3000);
    const { data: session, isPending: isSessionLoading } = useSession();

    const [, setRefreshWorkspaces] = useState<(() => void) | null>(null);
    const openWorkspaceRef = useRef<((workspaceId: string) => void) | null>(null);

    // Determine current view from pathname
    const currentView = useMemo(() => {
        if (pathname.startsWith('/settings')) return 'settings';
        if (pathname.startsWith('/statistics')) return 'statistics';
        if (pathname === '/workspaces') return 'selection';
        if (pathname === '/personalities') return 'personalities';
        if (pathname === '/add/workspace') return 'create';
        if (pathname.startsWith('/ws/')) return 'workspace';
        return 'workspace';
    }, [pathname]);

    // Initialize user state on client side only to prevent hydration mismatch
    useEffect(() => {
        if (isSessionLoading) {
            startLoading();
            return;
        }

        if (!session?.user) {
            stopLoading();
            router.push('/');
            return;
        }

        setIsClientReady(true);
        stopLoading();
    }, [session, isSessionLoading, router, startLoading, stopLoading]);

    const handleLogout = async () => {
        await signOut();
        router.push('/');
    };

    // Show loading while client is initializing to prevent hydration mismatch
    if (isSessionLoading || (!isClientReady && showSpinner)) {
        return (
            <div className="h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted-foreground/20 border-t-muted-foreground/40 mx-auto"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!session?.user) {
        return null; // Will redirect to login
    }

    return (
        <div className="h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="border-b flex-shrink-0">
                <div className="container mx-auto px-4 py-2 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold">OP3</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <UserMenu userEmail={session.user.email} onLogout={handleLogout} />
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            {/* Workspace Tab Bar */}
            <div className="flex-shrink-0">
                <WorkspaceTabBar
                    userId={session.user.id}
                    currentView={currentView}
                    currentWorkspaceId={currentWorkspaceId}
                    onRefresh={setRefreshWorkspaces}
                    onOpenWorkspace={(fn) => { openWorkspaceRef.current = fn; }}
                />
            </div>

            {/* Pinned Group Tabs */}
            <div className="flex-shrink-0">
                <PinnedGroupTabs
                    userId={session.user.id}
                    currentWorkspaceId={currentWorkspaceId}
                    currentView={currentView}
                />
            </div>

            {/* Main content */}
            <main className="flex-1 overflow-hidden">
                {children}
            </main>
        </div>
    );
}
