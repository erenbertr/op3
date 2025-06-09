"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WorkspaceLayout } from '../workspace-layout';
import { ChatSidebar } from './chat-sidebar';
import { ChatSessionComponent } from './chat-session';
import { authService } from '@/lib/auth';
import { apiClient, ChatSession, Personality, AIProviderConfig } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { Loader2 } from 'lucide-react';

interface ChatViewProps {
    workspaceId: string;
    chatId: string;
}

export function ChatView({ workspaceId, chatId }: ChatViewProps) {
    const router = useRouter();
    const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
    const [personalities, setPersonalities] = useState<Personality[]>([]);
    const [aiProviders, setAIProviders] = useState<AIProviderConfig[]>([]);
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();

    useEffect(() => {
        const loadChatData = async () => {
            const user = authService.getCurrentUser();
            if (!user) {
                router.push('/');
                return;
            }

            try {
                setIsLoading(true);
                
                // Load all required data in parallel
                const [personalitiesResult, aiProvidersResult, chatSessionsResult] = await Promise.all([
                    apiClient.getPersonalities(user.id),
                    apiClient.getAIProviders(),
                    apiClient.getChatSessions(user.id, workspaceId)
                ]);

                if (personalitiesResult.success) {
                    setPersonalities(personalitiesResult.personalities);
                }

                if (aiProvidersResult.success) {
                    setAIProviders(aiProvidersResult.providers);
                } else {
                    console.error('Failed to load AI providers:', aiProvidersResult.message);
                    addToast({
                        title: "Warning",
                        description: "Failed to load AI providers. Please check your configuration.",
                        variant: "destructive"
                    });
                }

                if (chatSessionsResult.success) {
                    const sessions = chatSessionsResult.sessions || [];
                    setChatSessions(sessions);
                    
                    // Find the specific chat session
                    const foundSession = sessions.find(s => s.id === chatId);
                    if (foundSession) {
                        setActiveSession(foundSession);
                        // Save to localStorage for persistence
                        try {
                            localStorage.setItem('op3_active_chat_session', JSON.stringify({
                                id: foundSession.id,
                                userId: foundSession.userId,
                                workspaceId: foundSession.workspaceId,
                                title: foundSession.title,
                                createdAt: foundSession.createdAt,
                                updatedAt: foundSession.updatedAt
                            }));
                        } catch (error) {
                            console.error('Error saving active session to localStorage:', error);
                        }
                    } else {
                        setError('Chat session not found');
                    }
                } else {
                    console.error('Failed to load chat sessions:', chatSessionsResult.message);
                    setError('Failed to load chat sessions');
                }
            } catch (error) {
                console.error('Error loading chat data:', error);
                setError('Failed to load chat data');
            } finally {
                setIsLoading(false);
            }
        };

        loadChatData();
    }, [workspaceId, chatId, router, addToast]);

    const handleNewChat = (session: ChatSession) => {
        router.push(`/ws/${workspaceId}/chat/${session.id}`);
    };

    const handleChatSelect = (session: ChatSession) => {
        router.push(`/ws/${workspaceId}/chat/${session.id}`);
    };

    const handleSessionUpdate = (updatedSession: ChatSession) => {
        setActiveSession(updatedSession);
        // Update localStorage
        try {
            localStorage.setItem('op3_active_chat_session', JSON.stringify({
                id: updatedSession.id,
                userId: updatedSession.userId,
                workspaceId: updatedSession.workspaceId,
                title: updatedSession.title,
                createdAt: updatedSession.createdAt,
                updatedAt: updatedSession.updatedAt
            }));
        } catch (error) {
            console.error('Error saving active session to localStorage:', error);
        }
    };

    if (isLoading) {
        return (
            <WorkspaceLayout currentWorkspaceId={workspaceId}>
                <div className="h-full flex items-center justify-center">
                    <div className="text-center space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                        <p className="text-muted-foreground">Loading chat...</p>
                    </div>
                </div>
            </WorkspaceLayout>
        );
    }

    if (error) {
        return (
            <WorkspaceLayout currentWorkspaceId={workspaceId}>
                <div className="h-full flex items-center justify-center">
                    <div className="text-center space-y-4 max-w-md">
                        <h2 className="text-2xl font-bold text-destructive">Error</h2>
                        <p className="text-muted-foreground">{error}</p>
                        <button
                            onClick={() => router.push(`/ws/${workspaceId}`)}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                        >
                            Back to Workspace
                        </button>
                    </div>
                </div>
            </WorkspaceLayout>
        );
    }

    if (!activeSession) {
        return (
            <WorkspaceLayout currentWorkspaceId={workspaceId}>
                <div className="h-full flex items-center justify-center">
                    <div className="text-center space-y-4 max-w-md">
                        <h2 className="text-2xl font-bold">Chat Not Found</h2>
                        <p className="text-muted-foreground">The chat session you're looking for doesn't exist or you don't have access to it.</p>
                        <button
                            onClick={() => router.push(`/ws/${workspaceId}`)}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                        >
                            Back to Workspace
                        </button>
                    </div>
                </div>
            </WorkspaceLayout>
        );
    }

    const user = authService.getCurrentUser();

    return (
        <WorkspaceLayout currentWorkspaceId={workspaceId}>
            <div className="h-full">
                <div className="container mx-auto h-full px-4">
                    <div className="flex h-full">
                        {/* Left Sidebar - Fixed width */}
                        <div className="w-80 flex-shrink-0 h-full border-l border-border">
                            <ChatSidebar
                                userId={user?.id || ''}
                                workspaceId={workspaceId}
                                onNewChat={handleNewChat}
                                onChatSelect={handleChatSelect}
                                activeChatId={activeSession.id}
                                chatSessions={chatSessions}
                                onSessionsUpdate={setChatSessions}
                            />
                        </div>

                        {/* Main Content Area */}
                        <div className="flex-1 h-full border-r border-border">
                            <ChatSessionComponent
                                session={activeSession}
                                personalities={personalities || []}
                                aiProviders={aiProviders || []}
                                onSessionUpdate={handleSessionUpdate}
                                userId={user?.id || ''}
                                className="h-full"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </WorkspaceLayout>
    );
}
