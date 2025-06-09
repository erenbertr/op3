"use client"

import React from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';

interface WorkspaceLayoutProps {
    children: React.ReactNode;
}

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
    const router = useRouter();

    // Auth check using useLayoutEffect for immediate redirect
    React.useLayoutEffect(() => {
        const user = authService.getCurrentUser();
        if (!user) {
            router.push('/');
            return;
        }

        if (!user.hasCompletedWorkspaceSetup) {
            router.push('/');
            return;
        }
    }, [router]);

    return <>{children}</>;
}
