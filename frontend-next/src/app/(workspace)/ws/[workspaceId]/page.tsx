"use client"

import { WorkspaceView } from '@/components/workspace/workspace-view';
import { use } from 'react';

interface WorkspacePageProps {
    params: Promise<{ workspaceId: string }>;
}

export default function WorkspacePage({ params }: WorkspacePageProps) {
    const { workspaceId } = use(params);

    return <WorkspaceView workspaceId={workspaceId} />;
}
