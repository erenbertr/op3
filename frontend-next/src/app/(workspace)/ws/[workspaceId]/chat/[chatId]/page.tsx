"use client"

import { ChatView } from '@/components/workspace/chat/chat-view';
import { use } from 'react';

interface ChatPageProps {
    params: Promise<{ workspaceId: string; chatId: string }>;
}

export default function ChatPage({ params }: ChatPageProps) {
    const { workspaceId, chatId } = use(params);

    return <ChatView workspaceId={workspaceId} chatId={chatId} />;
}
