"use client"

import React, { useState, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatInput } from './chat-input';
import { ChatMessageList } from './chat-message';
// Removed ChatMessagesSkeleton import - using simple spinner instead
import { apiClient, ChatMessage, ChatSession, Personality, AIProviderConfig } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { useChatMessages } from '@/lib/hooks/use-query-hooks';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';

interface ChatSessionProps {
    session: ChatSession;
    personalities: Personality[];
    aiProviders: AIProviderConfig[];
    onSessionUpdate?: (session: ChatSession) => void;
    className?: string;
    userId: string;
}

export function ChatSessionComponent({
    session,
    personalities,
    aiProviders,
    onSessionUpdate,
    className,
    userId
}: ChatSessionProps) {
    // Use local state for messages to avoid TanStack Query issues
    const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
    // Disable the query completely for now to prevent it from overriding local state
    const { data: messagesResult, isLoading: isLoadingMessages } = useChatMessages(session?.id || '', false);

    // Always use local messages to prevent query from overriding
    const messages = localMessages;
    const queryClient = useQueryClient();

    // Debug: Log when messages change
    React.useEffect(() => {
        console.log('📨 Messages state changed:', {
            localMessagesCount: localMessages.length,
            queryMessagesCount: messagesResult?.messages?.length || 0,
            finalMessagesCount: messages.length,
            sessionId: session?.id
        });
    }, [messages.length, localMessages.length, messagesResult?.messages?.length, session?.id]);

    // Track current session to prevent unnecessary resets
    const currentSessionRef = useRef<string | null>(null);

    // Load messages from server when session changes
    React.useEffect(() => {
        if (session?.id && currentSessionRef.current !== session.id) {
            console.log('🔄 Loading messages for NEW session:', session.id, 'previous:', currentSessionRef.current);
            currentSessionRef.current = session.id;

            // Check cache first
            const cachedData = queryClient.getQueryData(queryKeys.chats.messages(session.id));
            if (cachedData && (cachedData as any).messages?.length > 0) {
                console.log('📦 Found cached messages:', (cachedData as any).messages.length);
                setLocalMessages((cachedData as any).messages);
                // Stay in local state mode - don't switch to query mode
                console.log('🔒 Using cached messages in local state mode');
            } else {
                // Check server
                apiClient.getChatMessages(session.id).then(result => {
                    if (result.success && result.messages.length > 0) {
                        console.log('📥 Found server messages:', result.messages.length);
                        setLocalMessages(result.messages);
                        // Stay in local state mode - don't switch to query mode
                        console.log('🔒 Using server messages in local state mode');
                    } else {
                        console.log('📝 New chat - using local state');
                        setLocalMessages([]);
                        // Already in local mode
                    }
                }).catch(() => {
                    console.log('❌ Error loading messages - using local state');
                    setLocalMessages([]);
                    // Already in local mode
                });
            }
        } else if (session?.id) {
            console.log('🔄 Same session, keeping current state:', session.id);
        }
    }, [session?.id, queryClient]);

    const [isLoading, setIsLoading] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState<string>('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [pendingUserMessage, setPendingUserMessage] = useState<ChatMessage | null>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const { addToast } = useToast();

    // Clean up state when session changes
    React.useEffect(() => {
        // Only reset if session actually changed (not just component re-mount)
        const currentSessionId = session?.id;
        console.log('🔄 Session effect triggered for:', currentSessionId);

        // Don't clear state if it's the same session
        if (currentSessionId) {
            // Reset streaming states but preserve messages for same session
            setIsLoading(false);
            setStreamingMessage('');
            setIsStreaming(false);
            setPendingUserMessage(null);

            console.log('🔄 Session changed to:', currentSessionId);
        }
    }, [session?.id]);

    // Debug logging
    React.useEffect(() => {
        console.log('📨 Messages data updated:', {
            messagesResult,
            messagesCount: messages.length,
            sessionId: session?.id,
            isLoading: isLoadingMessages,
            pendingUserMessage: !!pendingUserMessage,
            isStreaming,
            timestamp: new Date().toISOString()
        });

        // Log individual messages for debugging
        if (messages.length > 0) {
            console.log('📝 Current messages in state:', messages.map(m => ({
                id: m.id,
                role: m.role,
                content: m.content.substring(0, 50) + '...'
            })));
        }
    }, [messagesResult, messages.length, session?.id, isLoadingMessages, pendingUserMessage, isStreaming]);

    // Auto-scroll to bottom when new messages are added (use useLayoutEffect for DOM manipulation)
    React.useLayoutEffect(() => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    });





    // TanStack Query handles loading messages automatically

    const handleRetryMessage = async (messageId: string) => {
        // Find the message to retry
        const messageToRetry = messages.find(msg => msg.id === messageId);
        if (!messageToRetry) {
            console.warn('Message not found for retry:', messageId);
            return;
        }

        // If it's a user message, resend it
        if (messageToRetry.role === 'user') {
            await handleSendMessage(
                messageToRetry.content,
                messageToRetry.personalityId,
                messageToRetry.aiProviderId
            );
        } else {
            // For AI messages, find the previous user message and resend it
            const messageIndex = messages.findIndex(msg => msg.id === messageId);
            if (messageIndex > 0) {
                const previousUserMessage = messages[messageIndex - 1];
                if (previousUserMessage.role === 'user') {
                    await handleSendMessage(
                        previousUserMessage.content,
                        previousUserMessage.personalityId,
                        previousUserMessage.aiProviderId
                    );
                }
            }
        }
    };

    const handleSettingsChange = async (personalityId?: string, aiProviderId?: string) => {
        if (!session?.id) return;

        try {
            const result = await apiClient.updateChatSessionSettings(session.id, {
                lastUsedPersonalityId: personalityId,
                lastUsedAIProviderId: aiProviderId
            });

            if (result.success && result.session) {
                // Update the session in parent component
                onSessionUpdate?.(result.session);
            }
        } catch (error) {
            console.error('Error updating session settings:', error);
            addToast({
                title: "Error",
                description: "Failed to save session preferences",
                variant: "destructive"
            });
        }
    };

    const handleSendMessage = async (content: string, personalityId?: string, aiProviderId?: string) => {
        if (!content?.trim()) {
            console.warn('Empty message content provided');
            return;
        }

        if (!session?.id) {
            addToast({
                title: "Error",
                description: "No active chat session. Please create a new chat.",
                variant: "destructive"
            });
            return;
        }

        // Create and immediately show user message
        const userMessage: ChatMessage = {
            id: crypto.randomUUID(),
            sessionId: session.id,
            content: content.trim(),
            role: 'user',
            personalityId,
            aiProviderId,
            createdAt: new Date().toISOString()
        };

        // Note: In real app, would use TanStack Query optimistic updates here
        setPendingUserMessage(userMessage);

        setIsLoading(true);
        setIsStreaming(true);
        setStreamingMessage('');

        try {
            await apiClient.streamChatMessage(
                session.id,
                {
                    content: content.trim(),
                    personalityId,
                    aiProviderId,
                    userId
                },
                (chunk) => {
                    // Handle streaming chunks
                    if (chunk.type === 'chunk' && chunk.content) {
                        setStreamingMessage(prev => prev + chunk.content);
                    }
                },
                (aiMessage) => {
                    // Handle completion - keep messages visible by not clearing states immediately
                    console.log('🔄 Streaming completed:', {
                        pendingUserMessage,
                        aiMessage,
                        sessionId: session.id
                    });

                    // Handle completion with optimistic update to prevent message refresh
                    const currentUserMessage = pendingUserMessage;

                    // Use optimistic update to add both messages without refetching
                    if (currentUserMessage && aiMessage) {
                        console.log('📝 Adding messages to cache optimistically:', {
                            userMessage: currentUserMessage,
                            aiMessage: aiMessage
                        });

                        // Use a more robust cache update that prevents overwrites
                        const cacheKey = queryKeys.chats.messages(session.id);

                        // First, cancel any ongoing queries to prevent race conditions
                        queryClient.cancelQueries({ queryKey: cacheKey });

                        // Then update the cache
                        queryClient.setQueryData(cacheKey, (oldData: any) => {
                            console.log('🔄 Updating cache with old data:', oldData);

                            if (!oldData || !oldData.success) {
                                const newData = {
                                    success: true,
                                    message: 'Messages retrieved successfully',
                                    messages: [currentUserMessage, aiMessage]
                                };
                                console.log('📝 Creating new cache data:', newData);
                                return newData;
                            }

                            // Check if messages already exist to prevent duplicates
                            const existingMessages = oldData.messages || [];
                            const userExists = existingMessages.some((m: any) => m.id === currentUserMessage.id);
                            const aiExists = existingMessages.some((m: any) => m.id === aiMessage.id);

                            if (userExists && aiExists) {
                                console.log('📝 Messages already exist in cache, skipping update');
                                return oldData;
                            }

                            // Add new messages to existing ones
                            const newMessages = [...existingMessages];
                            if (!userExists) newMessages.push(currentUserMessage);
                            if (!aiExists) newMessages.push(aiMessage);

                            const updatedData = {
                                ...oldData,
                                messages: newMessages
                            };
                            console.log('📝 Updated cache data:', updatedData);
                            return updatedData;
                        });

                        // Add messages to local state and update cache
                        setLocalMessages(prev => {
                            const newMessages = [...prev, currentUserMessage, aiMessage];
                            console.log('📝 Updated local messages:', newMessages.length);
                            return newMessages;
                        });

                        // Keep using local state - don't switch to query mode yet
                        // The query will be enabled when we reload the session or navigate away and back
                        console.log('🔒 Keeping local state mode to prevent query override');

                        console.log('✅ Messages added to cache successfully');

                        // Log the current cache state
                        const currentCacheData = queryClient.getQueryData(queryKeys.chats.messages(session.id));
                        console.log('📊 Current cache data after update:', currentCacheData);

                    } else {
                        console.log('❌ Missing data for optimistic update:', {
                            hasUserMessage: !!currentUserMessage,
                            hasAiMessage: !!aiMessage
                        });
                    }

                    // Clear states after cache update to prevent race conditions
                    setStreamingMessage('');
                    setIsStreaming(false);
                    setIsLoading(false);
                    setPendingUserMessage(null);

                    // Update session with last used settings and title if needed
                    const updates: any = {};

                    console.log('🔍 Checking session updates:', {
                        personalityId,
                        aiProviderId,
                        currentPersonality: session?.lastUsedPersonalityId,
                        currentProvider: session?.lastUsedAIProviderId,
                        messagesLength: messages.length,
                        sessionTitle: session?.title
                    });

                    // Update last used provider and personality
                    if (personalityId && personalityId !== session?.lastUsedPersonalityId) {
                        updates.lastUsedPersonalityId = personalityId;
                        console.log('📝 Will update personality:', personalityId);
                    }
                    if (aiProviderId && aiProviderId !== session?.lastUsedAIProviderId) {
                        updates.lastUsedAIProviderId = aiProviderId;
                        console.log('📝 Will update AI provider:', aiProviderId);
                    }

                    // Update session title if this is the first message and title is "New Chat"
                    if (messages.length === 0 && session?.title === 'New Chat') {
                        updates.title = content.length > 50 ? content.substring(0, 50) + '...' : content;
                        console.log('📝 Will update title:', updates.title);
                    }

                    // Apply updates if any
                    if (Object.keys(updates).length > 0) {
                        console.log('📝 Updating session with:', updates);
                        apiClient.updateChatSession(session.id, updates).then(updateResult => {
                            if (updateResult.success && updateResult.session && onSessionUpdate) {
                                console.log('✅ Session updated successfully:', updateResult.session);
                                onSessionUpdate(updateResult.session);
                            }
                        }).catch(error => {
                            console.error('❌ Error updating session:', error);
                        });
                    } else {
                        console.log('ℹ️ No session updates needed');
                    }
                },
                (error) => {
                    console.error('Streaming error:', error);
                    setPendingUserMessage(null);
                    addToast({
                        title: "Error",
                        description: error || "Failed to send message",
                        variant: "destructive"
                    });
                    setStreamingMessage('');
                    setIsStreaming(false);
                    setIsLoading(false);
                }
            );
        } catch (error) {
            console.error('Error sending message:', error);
            setPendingUserMessage(null);
            addToast({
                title: "Error",
                description: "Failed to send message. Please try again.",
                variant: "destructive"
            });
            setStreamingMessage('');
            setIsStreaming(false);
            setIsLoading(false);
        }
    };

    return (
        <div className={`flex flex-col h-full ${className || ''}`}>
            {/* Messages area */}
            <div className="flex-1 overflow-hidden">
                {isLoadingMessages && messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted-foreground/20 border-t-muted-foreground/40"></div>
                    </div>
                ) : (
                    <ScrollArea ref={scrollAreaRef} className="h-full">
                        <div className="px-4 max-w-4xl mx-auto">
                            <div className={messages.length === 0 && !pendingUserMessage ? "pt-16 flex justify-center" : ""}>
                                <ChatMessageList
                                    messages={messages}
                                    personalities={personalities}
                                    aiProviders={aiProviders}
                                    streamingMessage={streamingMessage}
                                    isStreaming={isStreaming}
                                    pendingUserMessage={pendingUserMessage}
                                    className={messages.length === 0 && !pendingUserMessage ? "" : "py-4"}
                                    onRetry={handleRetryMessage}
                                />
                            </div>
                        </div>
                    </ScrollArea>
                )}
            </div>

            {/* Input area - Fixed at bottom - ALWAYS the same component */}
            <div className="flex-shrink-0 border-t bg-background">
                <div className="px-4 py-4 max-w-4xl mx-auto">
                    <ChatInput
                        onSendMessage={handleSendMessage}
                        personalities={personalities}
                        aiProviders={aiProviders}
                        isLoading={isLoading}
                        placeholder={messages.length === 0 ? "Start your conversation..." : "Type your message here..."}
                        sessionPersonalityId={session?.lastUsedPersonalityId}
                        sessionAIProviderId={session?.lastUsedAIProviderId}
                        onSettingsChange={handleSettingsChange}
                    />
                </div>
            </div>
        </div>
    );
}

interface EmptyChatStateProps {
    className?: string;
}

export function EmptyChatState({ className }: EmptyChatStateProps) {
    return (
        <div className={`pt-16 flex justify-center ${className || ''}`}>
            <div className="text-center space-y-6 max-w-md">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
                    <svg
                        className="w-8 h-8 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                    </svg>
                </div>

                <div className="space-y-2">
                    <h3 className="text-xl font-semibold">Start a conversation</h3>
                    <p className="text-muted-foreground">
                        Send a message to begin chatting with the AI assistant.
                    </p>
                </div>

                <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span>Choose from different AI personalities</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span>Select your preferred AI provider</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span>Enable search and file attachments</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
