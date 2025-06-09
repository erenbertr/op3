"use client"

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';

interface WorkspaceLayoutProps {
    children: React.ReactNode;
}

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
    const router = useRouter();

    useEffect(() => {
        // Check if user is authenticated
        const user = authService.getCurrentUser();
        if (!user) {
            router.push('/');
            return;
        }

        // Check if user has completed workspace setup
        if (!user.hasCompletedWorkspaceSetup) {
            router.push('/');
            return;
        }
    }, [router]);

    return <>{children}</>;
}
