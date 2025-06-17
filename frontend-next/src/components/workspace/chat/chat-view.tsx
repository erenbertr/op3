"use client"

import React, { useState, useCallback, useMemo, useEffect } from 'react';
// WorkspaceLayout removed - parent components handle layout wrapping
import { ChatSidebar } from './chat-sidebar';
import { ChatSessionComponent, EmptyChatState } from './chat-session';
import { useSession } from '@/lib/temp-auth';
import { ChatSession } from '@/lib/api';
import { useChatSessions, usePersonalities } from '@/lib/hooks/use-query-hooks';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';

import { useToast } from '@/components/ui/toast';
import { Loader2 } from 'lucide-react';

interface ChatViewProps {
    workspaceId: string;
    chatId?: string; // Made optional to handle workspace overview
}

export function ChatView({ workspaceId, chatId }: ChatViewProps) {
    const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showNotFoundError, setShowNotFoundError] = useState(false);
    const [shouldAutoFocus, setShouldAutoFocus] = useState(false);
    const { addToast } = useToast();
    const queryClient = useQueryClient();

    // Use Better Auth session
    const { data: session, isPending: isSessionLoading } = useSession();
    const user = session?.user;

    // Navigation helper
    const navigate = useCallback((path: string) => {
        if (typeof window !== 'undefined') {
            window.history.pushState({}, '', path);
            window.dispatchEvent(new PopStateEvent('popstate'));
        }
    }, []);

    // Use real API calls with proper error handling
    const {
        data: personalitiesData,
        isLoading: personalitiesLoading,
        error: personalitiesError
    } = usePersonalities(user?.id || '');

    const {
        data: chatSessionsData,
        isLoading: chatSessionsLoading,
        error: chatSessionsError,
        refetch: refetchChatSessions
    } = useChatSessions(user?.id || '', workspaceId);

    // Extract data from query results
    const personalities = personalitiesData?.success ? personalitiesData.personalities : [];
    const chatSessions = useMemo(() =>
        chatSessionsData?.success ? (chatSessionsData.sessions || []) : [],
        [chatSessionsData]
    );

    // Handle loading state
    const isLoading = personalitiesLoading || chatSessionsLoading;

    // Determine if we're waiting for a specific chat to load
    // This prevents the EmptyChatState flash when navigating to a specific chat
    const isWaitingForSpecificChat = chatId && !activeSession && !showNotFoundError && !error && (chatSessionsLoading || chatSessions.length === 0);

    // Handle chat session changes using callback approach
    const updateActiveSession = useCallback(() => {
        if (chatId && chatSessions.length > 0) {
            // Specific chat requested
            const foundSession = chatSessions.find(s => s.id === chatId);
            if (foundSession) {
                setActiveSession(foundSession);
                setError(null);
                setShowNotFoundError(false);
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
                // Don't set error immediately - wait a bit for new chats to be created
                // Only set error if we're not currently loading chat sessions
                if (!chatSessionsLoading) {
                    // Delay showing the error to give time for new chats to be created
                    // Increased delay for branched chats which may take longer to appear
                    setTimeout(() => {
                        // Double-check that the chat still doesn't exist
                        const stillNotFound = !chatSessions.find(s => s.id === chatId);
                        if (stillNotFound) {
                            console.warn(`Chat session ${chatId} not found after delay. Available sessions:`, chatSessions.map(s => s.id));
                            setError('Chat session not found');
                            setActiveSession(null);
                            setShowNotFoundError(true);
                        }
                    }, 2000); // Increased delay to 2 seconds for branched chats
                }
            }
        } else if (!chatId) {
            // Workspace overview - no specific chat, show empty state
            setActiveSession(null);
            setError(null);
            setShowNotFoundError(false);
        } else if (chatId && chatSessions.length === 0 && !chatSessionsLoading) {
            // We have a chatId but no sessions loaded yet - this might be a new session
            // Wait a bit longer before showing error
            setTimeout(() => {
                // Refetch sessions to check for new ones
                refetchChatSessions();
            }, 500);
        }
    }, [chatId, chatSessions, chatSessionsLoading, refetchChatSessions]);

    // Handle errors from TanStack Query
    React.useMemo(() => {
        if (chatSessionsError) {
            console.error('Failed to load chat sessions:', chatSessionsError);
            setError('Failed to load chat sessions');
        }

        if (personalitiesError) {
            console.error('Failed to load personalities:', personalitiesError);
        }
    }, [chatSessionsError, personalitiesError, addToast]);

    // Update active session when dependencies change
    React.useLayoutEffect(() => {
        updateActiveSession();
    }, [updateActiveSession]);

    // Reset auto-focus after it's been used
    useEffect(() => {
        if (shouldAutoFocus && activeSession) {
            // Reset after a short delay to allow the focus to take effect
            const timer = setTimeout(() => {
                setShouldAutoFocus(false);
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [shouldAutoFocus, activeSession]);

    // Redirect if no user - use useEffect to prevent SSR issues
    useEffect(() => {
        if (!isSessionLoading && !user) {
            navigate('/');
        }
    }, [user, navigate, isSessionLoading]);

    // Show loading while session is loading
    if (isSessionLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto opacity-50" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    // Don't render if no user
    if (!user) {
        return null;
    }

    const handleNewChat = (session: ChatSession) => {
        navigate(`/ws/${workspaceId}/chat/${session.id}`);
        // Trigger auto-focus when creating a new chat
        setShouldAutoFocus(true);
    };

    const handleChatSelect = (session: ChatSession) => {
        // Optimistic update - set active session immediately for instant UI feedback
        setActiveSession(session);
        setError(null);

        // Navigate to the chat
        navigate(`/ws/${workspaceId}/chat/${session.id}`);
        // Trigger auto-focus when selecting a chat
        setShouldAutoFocus(true);
    };

    const handleSessionUpdate = (updatedSession: ChatSession) => {
        console.log('🔄 Updating active session:', updatedSession);
        setActiveSession(updatedSession);

        // Update localStorage with complete session data
        try {
            localStorage.setItem('op3_active_chat_session', JSON.stringify(updatedSession));
        } catch (error) {
            console.error('Error saving active session to localStorage:', error);
        }

        // Also update the session in the chat sessions list cache
        queryClient.setQueryData(
            queryKeys.chats.byWorkspace(user?.id || '', workspaceId),
            (oldData: any) => {
                if (!oldData || !oldData.success) return oldData;

                const sessions = oldData.sessions || [];
                const updatedSessions = sessions.map((s: ChatSession) =>
                    s.id === updatedSession.id ? updatedSession : s
                );

                return {
                    ...oldData,
                    sessions: updatedSessions
                };
            }
        );
    };

    // Remove the full-screen loading state - we'll show structure immediately
    // and only load the sidebar content

    if (error) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4 max-w-md">
                    <h2 className="text-2xl font-bold text-destructive">Error</h2>
                    <p className="text-muted-foreground">{error}</p>
                    <button
                        onClick={() => navigate(`/ws/${workspaceId}`)}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    >
                        Back to Workspace
                    </button>
                </div>
            </div>
        );
    }

    // Only show "Chat Not Found" error if we're looking for a specific chat that doesn't exist
    // Add a small buffer to prevent race conditions when creating new chats
    if (chatId && !activeSession && !isLoading && chatSessions.length > 0 && showNotFoundError) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4 max-w-md">
                    <h2 className="text-2xl font-bold">Chat Not Found</h2>
                    <p className="text-muted-foreground">The chat session you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
                    <button
                        onClick={() => navigate(`/ws/${workspaceId}`)}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    >
                        Back to Workspace
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="container mx-auto h-full px-4 flex-1 flex flex-col">
                <div className="flex h-full min-h-0">
                    {/* Left Sidebar - Fixed width */}
                    <div className="w-80 flex-shrink-0 h-full border-l border-border">
                        <ChatSidebar
                            userId={user?.id || ''}
                            workspaceId={workspaceId}
                            onNewChat={handleNewChat}
                            onChatSelect={handleChatSelect}
                            activeChatId={activeSession?.id}
                            chatSessions={chatSessions}
                            isLoading={chatSessionsLoading}
                            onSessionsUpdate={(updatedSessions) => {
                                console.log('📝 onSessionsUpdate called:', {
                                    updatedSessions,
                                    chatId,
                                    currentActiveSession: activeSession?.id
                                });

                                // Update the TanStack Query cache optimistically
                                if (updatedSessions && updatedSessions.length > 0) {
                                    queryClient.setQueryData(
                                        queryKeys.chats.byWorkspace(user?.id || '', workspaceId),
                                        (oldData: any) => {
                                            if (!oldData) {
                                                return {
                                                    success: true,
                                                    message: 'Chat sessions retrieved successfully',
                                                    sessions: updatedSessions
                                                };
                                            }
                                            return {
                                                ...oldData,
                                                sessions: updatedSessions
                                            };
                                        }
                                    );

                                    // If we have a new session and we're navigating to it,
                                    // optimistically set it as active to prevent "Chat Not Found" error
                                    if (chatId) {
                                        const newSession = updatedSessions.find(s => s.id === chatId);
                                        if (newSession) {
                                            console.log('📝 Setting active session optimistically:', newSession);
                                            setActiveSession(newSession);
                                            setError(null);
                                            setShowNotFoundError(false);
                                        }
                                    }
                                }

                                // Refetch chat sessions to get the latest data from the server (but don't wait for it)
                                setTimeout(() => refetchChatSessions(), 100);
                            }}
                        />
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 h-full border-r border-border">
                        {activeSession ? (
                            <ChatSessionComponent
                                session={activeSession}
                                personalities={personalities || []}
                                onSessionUpdate={handleSessionUpdate}
                                userId={user?.id || ''}
                                className="h-full"
                                autoFocusInput={shouldAutoFocus}
                                workspaceId={workspaceId}
                                navigate={navigate}
                            />
                        ) : isWaitingForSpecificChat ? (
                            // Show loading state when waiting for a specific chat to load
                            // This prevents the EmptyChatState flash when navigating to a chat
                            <div className="h-full flex items-center justify-center">
                                <div className="text-center space-y-4">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted-foreground/20 border-t-muted-foreground/40 mx-auto"></div>
                                    <p className="text-muted-foreground">Loading chat...</p>
                                </div>
                            </div>
                        ) : (
                            // Only show empty state when we're truly in workspace overview mode
                            <EmptyChatState />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
