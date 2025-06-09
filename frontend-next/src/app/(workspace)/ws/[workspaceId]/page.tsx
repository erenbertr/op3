"use client"

import { WorkspaceView } from '@/components/workspace/workspace-view';

interface WorkspacePageProps {
    params: Promise<{ workspaceId: string }>;
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
    const { workspaceId } = await params;
    
    return <WorkspaceView workspaceId={workspaceId} />;
}
