"use client"

import { WorkspaceLayout } from '@/components/workspace/workspace-layout';
import { ChatView } from '@/components/workspace/chat/chat-view';
import { use } from 'react';

interface ChatPageProps {
    params: Promise<{ workspaceId: string; chatId: string }>;
}

export default function ChatPage({ params }: ChatPageProps) {
    const { workspaceId, chatId } = use(params);

    return (
        <WorkspaceLayout currentWorkspaceId={workspaceId}>
            <ChatView workspaceId={workspaceId} chatId={chatId} />
        </WorkspaceLayout>
    );
}
