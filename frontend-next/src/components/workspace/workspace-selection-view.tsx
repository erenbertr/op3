"use client"

import React, { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { WorkspaceLayout } from './workspace-layout';
import { WorkspaceSelection } from './workspace-selection';
import { authService } from '@/lib/auth';

export function WorkspaceSelectionView() {
    const router = useRouter();
    const user = authService.getCurrentUser();
    const openWorkspaceRef = useRef<((workspaceId: string) => void) | null>(null);

    if (!user) {
        router.push('/');
        return null;
    }

    return (
        <WorkspaceLayout>
            <div className="container mx-auto px-4 py-6">
                <div className="max-w-6xl mx-auto">
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
            </div>
        </WorkspaceLayout>
    );
}
