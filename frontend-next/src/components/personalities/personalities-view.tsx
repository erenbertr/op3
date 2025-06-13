"use client"

import React from 'react';
import { WorkspaceLayout } from '../workspace/workspace-layout';
import { PersonalitiesManagement } from './personalities-management';
import { useSession } from '@/lib/temp-auth';
import { useRouter } from 'next/navigation';

export function PersonalitiesView() {
    const router = useRouter();
    const { data: session } = useSession();

    if (!session?.user) {
        router.push('/');
        return null;
    }

    return (
        <WorkspaceLayout>
            <div className="h-full">
                <div className="container mx-auto px-4 py-6">
                    <h1 className="text-2xl font-bold mb-6">AI Personalities</h1>
                    <PersonalitiesManagement userId={session.user.id} />
                </div>
            </div>
        </WorkspaceLayout>
    );
}
