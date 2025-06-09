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
    // Use TanStack Query for messages
    const { data: messagesResult, isLoading: isLoadingMessages } = useChatMessages(session?.id || '');
    const messages = messagesResult?.messages || [];

    // Debug logging
    React.useEffect(() => {
        console.log('📨 Messages data updated:', {
            messagesResult,
            messagesCount: messages.length,
            sessionId: session?.id
        });
    }, [messagesResult, messages.length, session?.id]);
    const queryClient = useQueryClient();

    const [isLoading, setIsLoading] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState<string>('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [pendingUserMessage, setPendingUserMessage] = useState<ChatMessage | null>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const { addToast } = useToast();

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

                    // Don't clear states immediately - let the refetch happen first
                    setStreamingMessage('');
                    setIsStreaming(false);
                    setIsLoading(false);

                    // Invalidate and refetch messages, then clear pending state
                    queryClient.invalidateQueries({
                        queryKey: queryKeys.chats.messages(session.id)
                    }).then(() => {
                        // Only clear pending message after refetch is complete
                        console.log('✅ Refetch completed, clearing pending message');
                        setPendingUserMessage(null);
                    }).catch((error) => {
                        console.error('❌ Refetch failed:', error);
                        setPendingUserMessage(null);
                    });

                    // Update session with last used settings and title if needed
                    const updates: any = {};

                    // Update last used provider and personality
                    if (personalityId && personalityId !== session?.lastUsedPersonalityId) {
                        updates.lastUsedPersonalityId = personalityId;
                    }
                    if (aiProviderId && aiProviderId !== session?.lastUsedAIProviderId) {
                        updates.lastUsedAIProviderId = aiProviderId;
                    }

                    // Update session title if this is the first message and title is "New Chat"
                    if (messages.length === 0 && session?.title === 'New Chat') {
                        updates.title = content.length > 50 ? content.substring(0, 50) + '...' : content;
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
                    }
                },
                (error) => {
                    console.error('Streaming error:', error);
                    // Note: Would use TanStack Query to handle error states
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
            // Note: Would use TanStack Query to handle error states
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
