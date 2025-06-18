"use client"

import React from 'react';
import { useSession } from '@/lib/temp-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { WorkspaceApplication } from '@/components/workspace/workspace-application';
import { signOut } from '@/lib/temp-auth';

export default function AdminPage() {
    const { data: session, isPending: isSessionLoading } = useSession();
    const router = useRouter();

    // Handle logout
    const handleLogout = async () => {
        await signOut();
        router.push('/');
    };

    // Redirect if not authenticated or not admin
    useEffect(() => {
        if (!isSessionLoading && (!session?.user || session.user.role !== 'admin')) {
            router.push('/workspaces');
        }
    }, [session, isSessionLoading, router]);

    // Show loading while checking authentication
    if (isSessionLoading) {
        return (
            <div className="h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted-foreground/20 border-t-muted-foreground/40 mx-auto"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    // Don't render anything if user is not admin (will be redirected)
    if (!session?.user || session.user.role !== 'admin') {
        return null;
    }

    return (
        <WorkspaceApplication
            currentUser={session.user}
            onLogout={handleLogout}
        />
    );
}
