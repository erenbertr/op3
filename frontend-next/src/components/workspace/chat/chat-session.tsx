"use client"

import React, { useState, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatInput } from './chat-input';
import { ChatMessageList } from './chat-message';
import { StreamingMessage } from './streaming-message';
// Removed ChatMessagesSkeleton import - using simple spinner instead
import { apiClient, ChatMessage, ChatSession, Personality, AIProviderConfig, StreamingState, StreamingCallbacks } from '@/lib/api';
import { useToast } from '@/components/ui/toast';



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
    // Simple message state - always managed manually
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);



    // Load messages from server when session changes
    React.useEffect(() => {
        if (session?.id) {
            console.log('🔄 Loading messages for session:', session.id);
            setIsLoadingMessages(true);

            apiClient.getChatMessages(session.id)
                .then(result => {
                    if (result.success) {
                        console.log('📥 Loaded messages from server:', result.messages.length);
                        setMessages(result.messages);
                    } else {
                        console.log('📝 No messages found, starting fresh');
                        setMessages([]);
                    }
                })
                .catch(error => {
                    console.error('❌ Error loading messages:', error);
                    setMessages([]);
                })
                .finally(() => {
                    setIsLoadingMessages(false);
                });
        }
    }, [session?.id]);

    const [isLoading, setIsLoading] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState<string>('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingState, setStreamingState] = useState<StreamingState>({
        isStreaming: false,
        canStop: false,
        hasError: false,
        isRetrying: false
    });
    const [abortController, setAbortController] = useState<AbortController | null>(null);
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
            setStreamingState({
                isStreaming: false,
                canStop: false,
                hasError: false,
                isRetrying: false
            });

            // Cancel any ongoing streaming
            if (abortController) {
                abortController.abort();
                setAbortController(null);
            }

            console.log('🔄 Session changed to:', currentSessionId);
        }
    }, [session?.id, abortController]);

    // Debug logging
    React.useEffect(() => {
        console.log('📨 Messages data updated:', {
            messagesCount: messages.length,
            sessionId: session?.id,
            isLoading: isLoadingMessages,
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
    }, [messages.length, session?.id, isLoadingMessages, isStreaming]);

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

        // Immediately add user message to state
        setMessages(prev => [...prev, userMessage]);
        console.log('📝 Added user message to state');

        setIsLoading(true);
        setIsStreaming(true);
        setStreamingMessage('');

        // Create abort controller for this request
        const controller = new AbortController();
        setAbortController(controller);

        // Update streaming state
        setStreamingState({
            isStreaming: true,
            canStop: true,
            hasError: false,
            isRetrying: false
        });

        const callbacks: StreamingCallbacks = {
            onChunk: (chunk) => {
                // Handle streaming chunks
                if (chunk.type === 'chunk' && chunk.content) {
                    setStreamingMessage(prev => prev + chunk.content);
                }
            },
            onComplete: (aiMessage) => {
                // Handle completion - add AI message to state
                console.log('🔄 Streaming completed:', {
                    aiMessage,
                    sessionId: session.id
                });

                if (aiMessage) {
                    // Add AI message to state
                    setMessages(prev => [...prev, aiMessage]);
                    console.log('📝 Added AI message to state');
                }

                // Clear states after completion
                setStreamingMessage('');
                setIsStreaming(false);
                setIsLoading(false);
                setStreamingState({
                    isStreaming: false,
                    canStop: false,
                    hasError: false,
                    isRetrying: false
                });
                setAbortController(null);

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
            onError: (error) => {
                console.error('Streaming error:', error);
                setStreamingState({
                    isStreaming: false,
                    canStop: false,
                    hasError: true,
                    errorMessage: error,
                    isRetrying: false
                });
                setStreamingMessage('');
                setIsStreaming(false);
                setIsLoading(false);
                setAbortController(null);

                addToast({
                    title: "Error",
                    description: error || "Failed to send message",
                    variant: "destructive"
                });
            },
            onStop: () => {
                console.log('🛑 Streaming stopped by user');
                setStreamingState({
                    isStreaming: false,
                    canStop: false,
                    hasError: false,
                    isRetrying: false
                });
                setIsStreaming(false);
                setIsLoading(false);
                setAbortController(null);
            }
        };

        try {
            await apiClient.streamChatMessage(
                session.id,
                {
                    content: content.trim(),
                    personalityId,
                    aiProviderId,
                    userId
                },
                callbacks,
                controller
            );
        } catch (error) {
            console.error('Error sending message:', error);
            setStreamingState({
                isStreaming: false,
                canStop: false,
                hasError: true,
                errorMessage: "Failed to send message. Please try again.",
                isRetrying: false
            });
            setStreamingMessage('');
            setIsStreaming(false);
            setIsLoading(false);
            setAbortController(null);

            addToast({
                title: "Error",
                description: "Failed to send message. Please try again.",
                variant: "destructive"
            });
        }
    };

    // Stop streaming function
    const handleStopStreaming = () => {
        if (abortController) {
            abortController.abort();
        }
    };

    // Retry streaming function
    const handleRetryStreaming = () => {
        if (streamingState.hasError && streamingState.partialContent) {
            // Find the last user message and retry it
            const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');
            if (lastUserMessage) {
                handleSendMessage(
                    lastUserMessage.content,
                    lastUserMessage.personalityId,
                    lastUserMessage.aiProviderId
                );
            }
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
                            <div className={messages.length === 0 ? "pt-16 flex justify-center" : ""}>
                                <ChatMessageList
                                    messages={messages}
                                    personalities={personalities}
                                    aiProviders={aiProviders}
                                    pendingUserMessage={null}
                                    className={messages.length === 0 ? "" : "py-4"}
                                    onRetry={handleRetryMessage}
                                />

                                {/* Enhanced streaming message component */}
                                {(isStreaming || streamingState.hasError) && (
                                    <div className="px-4">
                                        <StreamingMessage
                                            content={streamingMessage}
                                            isStreaming={streamingState.isStreaming}
                                            hasError={streamingState.hasError}
                                            errorMessage={streamingState.errorMessage}
                                            canStop={streamingState.canStop}
                                            canRetry={streamingState.hasError && !streamingState.isRetrying}
                                            onStop={handleStopStreaming}
                                            onRetry={handleRetryStreaming}
                                        />
                                    </div>
                                )}
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
                        placeholder={messages.length === 0 ? "Start your conversation - Enter to send, Shift+Enter for new line" : undefined}
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
