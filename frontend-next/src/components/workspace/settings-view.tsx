"use client"

import React from 'react';
import { WorkspaceLayout } from './workspace-layout';
import { WorkspaceManagementPanel } from './workspace-management-panel';
import { authService } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export function SettingsView() {
    const router = useRouter();
    const user = authService.getCurrentUser();

    if (!user) {
        router.push('/');
        return null;
    }

    return (
        <WorkspaceLayout>
            <div className="h-full">
                <WorkspaceManagementPanel
                    userId={user.id}
                    workspaces={[]} // Will be loaded by the component
                    onClose={() => router.push('/')}
                    onWorkspaceUpdated={() => { }}
                    onWorkspaceDeleted={() => { }}
                />
            </div>
        </WorkspaceLayout>
    );
}
