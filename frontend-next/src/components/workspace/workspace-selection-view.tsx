"use client"

import React, { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WorkspaceLayout } from './workspace-layout';
import { WorkspaceSelection } from './workspace-selection';
import { authService } from '@/lib/auth';

export function WorkspaceSelectionView() {
    const router = useRouter();
    const user = authService.getCurrentUser();
    const openWorkspaceRef = useRef<((workspaceId: string) => void) | null>(null);

    // Use useEffect to handle navigation on client side only
    useEffect(() => {
        if (!user) {
            router.push('/');
        }
    }, [user, router]);

    // Don't render anything if no user (will redirect)
    if (!user) {
        return null;
    }

    return (
        <WorkspaceLayout>
            <div className="container mx-auto px-4 py-6">
                <h1 className="text-2xl font-bold mb-6">Select Workspace</h1>
                <WorkspaceSelection
                    userId={user.id}
                    currentWorkspaceId={null}
                    openWorkspace={openWorkspaceRef.current}
                    onWorkspaceSelect={async (workspaceId) => {
                        router.push(`/ws/${workspaceId}`);
                    }}
                />
            </div>
        </WorkspaceLayout>
    );
}
