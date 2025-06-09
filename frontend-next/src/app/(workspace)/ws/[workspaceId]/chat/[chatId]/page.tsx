"use client"

import { ChatView } from '@/components/workspace/chat/chat-view';

interface ChatPageProps {
    params: Promise<{ workspaceId: string; chatId: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
    const { workspaceId, chatId } = await params;
    
    return <ChatView workspaceId={workspaceId} chatId={chatId} />;
}
