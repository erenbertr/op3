"use client"

import React from 'react';
import { useRouter } from 'next/navigation';
import { WorkspaceLayout } from './workspace-layout';
import { WorkspaceSetup } from './workspace-setup';
import { authService } from '@/lib/auth';

export function CreateWorkspaceView() {
    const router = useRouter();
    const user = authService.getCurrentUser();

    if (!user) {
        router.push('/');
        return null;
    }

    return (
        <WorkspaceLayout>
            <div className="container mx-auto px-4 py-6">
                <h1 className="text-2xl font-bold mb-6">Create New Workspace</h1>
                <WorkspaceSetup
                    userId={user.id}
                    onComplete={(workspace) => {
                        if (workspace) {
                            router.push(`/ws/${workspace.id}`);
                        } else {
                            router.push('/workspaces');
                        }
                    }}
                />
            </div>
        </WorkspaceLayout>
    );
}
