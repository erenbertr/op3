"use client"

import React from 'react';
import { WorkspaceLayout } from '../workspace/workspace-layout';
import { PersonalitiesManagement } from './personalities-management';
import { authService } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export function PersonalitiesView() {
    const router = useRouter();
    const user = authService.getCurrentUser();

    if (!user) {
        router.push('/');
        return null;
    }

    return (
        <WorkspaceLayout>
            <div className="container mx-auto px-4 py-6">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-2xl font-bold mb-6">AI Personalities</h1>
                    <PersonalitiesManagement userId={user.id} />
                </div>
            </div>
        </WorkspaceLayout>
    );
}
