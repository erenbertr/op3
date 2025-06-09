"use client"

import React, { useState, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { WorkspaceTabBar } from '@/components/workspace/workspace-tab-bar';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSelector } from '@/components/language-selector';
import { authService, AuthUser } from '@/lib/auth';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WorkspaceLayoutProps {
    children: React.ReactNode;
    currentWorkspaceId?: string | null;
}

export function WorkspaceLayout({ children, currentWorkspaceId }: WorkspaceLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
    const [isClientReady, setIsClientReady] = useState(false);

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
    React.useEffect(() => {
        const user = authService.getCurrentUser();
        if (user) {
            setCurrentUser(user);
        } else {
            router.push('/');
        }
        setIsClientReady(true);
    }, [router]);



    const handleLogout = () => {
        authService.logout();
        router.push('/');
    };

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

    if (!currentUser) {
        return null; // Will redirect to login
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
                    onRefresh={setRefreshWorkspaces}
                    onOpenWorkspace={(fn) => { openWorkspaceRef.current = fn; }}
                />
            </div>

            {/* Main content */}
            <main className="flex-1 overflow-hidden">
                {children}
            </main>
        </div>
    );
}
