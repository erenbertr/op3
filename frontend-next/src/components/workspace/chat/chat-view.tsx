"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WorkspaceLayout } from '../workspace-layout';
import { ChatSidebar } from './chat-sidebar';
import { ChatSessionComponent } from './chat-session';
import { authService } from '@/lib/auth';
import { apiClient, ChatSession, Personality, AIProviderConfig } from '@/lib/api';
import { chatDataCache } from '@/lib/workspace-cache';
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

    // Load workspace-level data (personalities, AI providers, chat sessions) only once
    useEffect(() => {
        const loadWorkspaceData = async () => {
            const user = authService.getCurrentUser();
            if (!user) {
                router.push('/');
                return;
            }

            // Try to get data from cache first
            const cachedData = chatDataCache.get(user.id, workspaceId);
            if (cachedData) {
                setPersonalities(cachedData.personalities);
                setAIProviders(cachedData.aiProviders);
                setChatSessions(cachedData.chatSessions);
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

                const personalities = personalitiesResult.success ? personalitiesResult.personalities : [];
                const aiProviders = aiProvidersResult.success ? aiProvidersResult.providers : [];
                const chatSessions = chatSessionsResult.success ? (chatSessionsResult.sessions || []) : [];

                // Cache the data
                chatDataCache.set(user.id, workspaceId, {
                    personalities,
                    aiProviders,
                    chatSessions
                });

                setPersonalities(personalities);
                setAIProviders(aiProviders);
                setChatSessions(chatSessions);

                if (!aiProvidersResult.success) {
                    console.error('Failed to load AI providers:', aiProvidersResult.message);
                    addToast({
                        title: "Warning",
                        description: "Failed to load AI providers. Please check your configuration.",
                        variant: "destructive"
                    });
                }

                if (!chatSessionsResult.success) {
                    console.error('Failed to load chat sessions:', chatSessionsResult.message);
                    setError('Failed to load chat sessions');
                }
            } catch (error) {
                console.error('Error loading workspace data:', error);
                setError('Failed to load workspace data');
            } finally {
                setIsLoading(false);
            }
        };

        loadWorkspaceData();
    }, [workspaceId, addToast]); // Removed router from dependencies

    // Separate effect to handle chat session changes - this should be fast
    useEffect(() => {
        if (chatSessions.length > 0) {
            const foundSession = chatSessions.find(s => s.id === chatId);
            if (foundSession) {
                setActiveSession(foundSession);
                setError(null);
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
                setActiveSession(null);
            }
        }
    }, [chatId, chatSessions]);

    const handleNewChat = (session: ChatSession) => {
        router.push(`/ws/${workspaceId}/chat/${session.id}`);
    };

    const handleChatSelect = (session: ChatSession) => {
        // Optimistic update - set active session immediately for instant UI feedback
        setActiveSession(session);
        setError(null);

        // Navigate to the chat
        router.push(`/ws/${workspaceId}/chat/${session.id}`);
    };

    const handleSessionUpdate = (updatedSession: ChatSession) => {
        setActiveSession(updatedSession);

        // Update the session in the sessions list
        const updatedSessions = chatSessions.map(s =>
            s.id === updatedSession.id ? updatedSession : s
        );
        setChatSessions(updatedSessions);

        // Update cache
        const user = authService.getCurrentUser();
        if (user) {
            chatDataCache.updateChatSessions(user.id, workspaceId, updatedSessions);
        }

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

    // Only show loading if we're loading workspace data AND don't have any chat sessions yet
    if (isLoading && chatSessions.length === 0) {
        return (
            <WorkspaceLayout currentWorkspaceId={workspaceId}>
                <div className="h-full flex items-center justify-center">
                    <div className="text-center space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto opacity-50" />
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
                                onSessionsUpdate={(sessions) => {
                                    setChatSessions(sessions);
                                    // Update cache when sessions change
                                    if (user) {
                                        chatDataCache.updateChatSessions(user.id, workspaceId, sessions);
                                    }
                                }}
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
