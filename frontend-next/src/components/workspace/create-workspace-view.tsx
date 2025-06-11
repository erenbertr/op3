"use client"

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WorkspaceLayout } from './workspace-layout';
import { WorkspaceSetup } from './workspace-setup';
import { authService } from '@/lib/auth';
import { navigationUtils } from '@/lib/hooks/use-pathname';

export function CreateWorkspaceView() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const user = authService.getCurrentUser();

    // Get groupId from URL parameters
    const groupId = searchParams.get('groupId');

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
                    groupId={groupId}
                    onComplete={(workspace) => {
                        if (workspace) {
                            navigationUtils.pushState(`/ws/${workspace.id}`);
                        } else {
                            navigationUtils.pushState('/workspaces');
                        }
                    }}
                />
            </div>
        </WorkspaceLayout>
    );
}
