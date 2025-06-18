"use client"

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WorkspaceLayout } from './workspace-layout';
import { WorkspaceSetup } from './workspace-setup';
import { useSession } from '@/lib/temp-auth';
import { navigationUtils } from '@/lib/hooks/use-pathname';

export function CreateWorkspaceView() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const [groupIdFromUrl, setGroupIdFromUrl] = useState<string | null>(null);

    // Get groupId from URL parameters using window.location as fallback
    const groupIdFromSearchParams = searchParams.get('groupId');

    // Alternative method using window.location as fallback
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const groupIdFromWindow = urlParams.get('groupId');
            setGroupIdFromUrl(groupIdFromWindow);
        }
    }, []);

    // Use the first available groupId
    const groupId = groupIdFromSearchParams || groupIdFromUrl;

    if (!session?.user) {
        router.push('/');
        return null;
    }

    return (
        <WorkspaceLayout>
            <div className="container mx-auto px-4 py-6">
                <h1 className="text-2xl font-bold mb-6">Create New Workspace</h1>
                <WorkspaceSetup
                    userId={session.user.id}
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
