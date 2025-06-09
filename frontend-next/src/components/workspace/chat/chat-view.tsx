"use client"

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { WorkspaceLayout } from '../workspace-layout';
import { ChatSidebar } from './chat-sidebar';
import { ChatSessionComponent } from './chat-session';
import { authService } from '@/lib/auth';
import { ChatSession } from '@/lib/api';
import { useChatSessions, usePersonalities, useAIProviders } from '@/lib/hooks/use-query-hooks';

import { useToast } from '@/components/ui/toast';
import { Loader2 } from 'lucide-react';

interface ChatViewProps {
    workspaceId: string;
    chatId: string;
}

export function ChatView({ workspaceId, chatId }: ChatViewProps) {
    const router = useRouter();
    const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();

    // Get current user
    const user = authService.getCurrentUser();

    // Use TanStack Query for data fetching - always call hooks
    const {
        data: personalitiesData,
        isLoading: personalitiesLoading,
        error: personalitiesError
    } = usePersonalities(user?.id || '');

    const {
        data: aiProvidersData,
        isLoading: aiProvidersLoading,
        error: aiProvidersError
    } = useAIProviders();

    const {
        data: chatSessionsData,
        isLoading: chatSessionsLoading,
        error: chatSessionsError
    } = useChatSessions(user?.id || '', workspaceId);

    // Extract data from query results
    const personalities = personalitiesData?.success ? personalitiesData.personalities : [];
    const aiProviders = aiProvidersData?.success ? aiProvidersData.providers : [];
    const chatSessions = useMemo(() =>
        chatSessionsData?.success ? (chatSessionsData.sessions || []) : [],
        [chatSessionsData]
    );

    // Handle loading state
    const isLoading = personalitiesLoading || aiProvidersLoading || chatSessionsLoading;

    // Handle chat session changes using callback approach
    const updateActiveSession = useCallback(() => {
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

    // Handle errors from TanStack Query
    useEffect(() => {
        if (aiProvidersError) {
            console.error('Failed to load AI providers:', aiProvidersError);
            addToast({
                title: "Warning",
                description: "Failed to load AI providers. Please check your configuration.",
                variant: "destructive"
            });
        }

        if (chatSessionsError) {
            console.error('Failed to load chat sessions:', chatSessionsError);
            setError('Failed to load chat sessions');
        }

        if (personalitiesError) {
            console.error('Failed to load personalities:', personalitiesError);
        }
    }, [aiProvidersError, chatSessionsError, personalitiesError, addToast]);

    // Update active session when dependencies change
    React.useLayoutEffect(() => {
        updateActiveSession();
    }, [updateActiveSession]);

    // Redirect if no user
    if (!user) {
        router.push('/');
        return null;
    }

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
                        <p className="text-muted-foreground">The chat session you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
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
                                onSessionsUpdate={() => {
                                    // TanStack Query will automatically refetch and update the cache
                                    // No manual state management needed
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
