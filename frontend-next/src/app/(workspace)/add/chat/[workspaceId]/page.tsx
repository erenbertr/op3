"use client"

import { CreateChatView } from '@/components/workspace/chat/create-chat-view';

interface CreateChatPageProps {
    params: Promise<{ workspaceId: string }>;
}

export default async function CreateChatPage({ params }: CreateChatPageProps) {
    const { workspaceId } = await params;
    
    return <CreateChatView workspaceId={workspaceId} />;
}
