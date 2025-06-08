"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatInput } from './chat-input';
import { ChatMessageList } from './chat-message';
import { apiClient, ChatMessage, ChatSession, Personality, AIProviderConfig } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { websocketService, StreamingChatRequest, AIStreamChunk } from '@/lib/websocket';

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
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(true);
    const [streamingMessage, setStreamingMessage] = useState<string>('');
    const [isStreaming, setIsStreaming] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const { addToast } = useToast();



    // Auto-scroll to bottom when new messages are added
    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }, [messages, streamingMessage]);

    // Connect to WebSocket when component mounts
    useEffect(() => {
        const connectWebSocket = async () => {
            try {
                // Only connect if not already connected to this user
                if (!websocketService.isConnectedToUser(userId)) {
                    const connected = await websocketService.connect(userId);
                    if (!connected) {
                        // Wait a bit and check if connection was established through reconnection
                        setTimeout(() => {
                            if (!websocketService.isConnectedToUser(userId)) {
                                console.warn('WebSocket connection failed, chat functionality may be limited');
                                addToast({
                                    title: "Connection Warning",
                                    description: "Real-time chat service is unavailable. Some features may not work.",
                                    variant: "destructive"
                                });
                            }
                        }, 2000); // Wait 2 seconds before showing warning
                    }
                }
            } catch (error) {
                console.error('Failed to connect to WebSocket:', error);
                // Wait a bit and check if connection was established through reconnection
                setTimeout(() => {
                    if (!websocketService.isConnectedToUser(userId)) {
                        addToast({
                            title: "Connection Error",
                            description: "Failed to connect to real-time chat service. Please check your network connection.",
                            variant: "destructive"
                        });
                    }
                }, 2000); // Wait 2 seconds before showing error
            }
        };

        if (userId) {
            connectWebSocket();
        }

        // Only disconnect on actual unmount, not on re-renders
        return () => {
            // Don't disconnect here as it causes issues with React StrictMode
            // The WebSocket service will handle reconnection as needed
        };
    }, [userId, addToast]);

    const loadMessages = useCallback(async () => {
        if (!session?.id) {
            console.warn('No session ID provided for loading messages');
            setIsLoadingMessages(false);
            return;
        }

        setIsLoadingMessages(true);
        try {
            const result = await apiClient.getChatMessages(session.id);
            if (result.success) {
                setMessages(result.messages || []);
            } else {
                console.error('Failed to load messages:', result.message);
                addToast({
                    title: "Error",
                    description: result.message || "Failed to load messages",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            addToast({
                title: "Error",
                description: "Failed to load chat messages",
                variant: "destructive"
            });
        } finally {
            setIsLoadingMessages(false);
        }
    }, [session?.id, addToast]);

    // Get the last used AI provider for this session
    const getLastUsedAIProvider = useCallback(() => {
        if (!messages || messages.length === 0) return undefined;

        // Find the most recent user message with an AI provider
        for (let i = messages.length - 1; i >= 0; i--) {
            const message = messages[i];
            if (message.role === 'user' && message.aiProviderId) {
                return message.aiProviderId;
            }
        }
        return undefined;
    }, [messages]);

    // Load messages when session changes
    useEffect(() => {
        if (session?.id) {
            loadMessages();
        }
    }, [session?.id, loadMessages]);

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

        if (!websocketService.isConnected()) {
            console.warn('WebSocket not connected, connection state:', websocketService.getConnectionState());
            addToast({
                title: "Connection Error",
                description: "Not connected to chat service. Please refresh the page.",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);
        setIsStreaming(true);
        setStreamingMessage('');

        try {
            const request: StreamingChatRequest = {
                content: content.trim(),
                personalityId,
                aiProviderId,
                sessionId: session.id,
                userId
            };

            websocketService.sendChatMessage(request, {
                onChunk: (chunk: AIStreamChunk) => {
                    if (chunk.type === 'chunk' && chunk.content) {
                        setStreamingMessage(prev => prev + chunk.content);
                    }
                },
                onComplete: (data) => {
                    // Add both messages to the list
                    if (data?.userMessage && data?.aiMessage) {
                        setMessages(prev => [...(prev || []), data.userMessage, data.aiMessage]);
                    }
                    setStreamingMessage('');
                    setIsStreaming(false);
                    setIsLoading(false);

                    // Update session title if this is the first message and title is "New Chat"
                    if (messages.length === 0 && session?.title === 'New Chat') {
                        const newTitle = content.length > 50 ? content.substring(0, 50) + '...' : content;
                        apiClient.updateChatSession(session.id, { title: newTitle }).then(updateResult => {
                            if (updateResult.success && updateResult.session && onSessionUpdate) {
                                onSessionUpdate(updateResult.session);
                            }
                        }).catch(error => {
                            console.error('Error updating session title:', error);
                        });
                    }
                },
                onError: (error) => {
                    console.error('Streaming error:', error);
                    addToast({
                        title: "Error",
                        description: error || "Failed to send message",
                        variant: "destructive"
                    });
                    setStreamingMessage('');
                    setIsStreaming(false);
                    setIsLoading(false);
                }
            });
        } catch (error) {
            console.error('Error sending message:', error);
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

    if (isLoadingMessages) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-sm text-muted-foreground">Loading messages...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-full ${className || ''}`}>
            {/* Messages area */}
            <div className="flex-1 overflow-hidden">
                <ScrollArea ref={scrollAreaRef} className="h-full">
                    <div className="px-4 max-w-4xl mx-auto">
                        <div className={messages.length === 0 ? "pt-16 flex justify-center" : ""}>
                            <ChatMessageList
                                messages={messages}
                                personalities={personalities}
                                aiProviders={aiProviders}
                                streamingMessage={streamingMessage}
                                isStreaming={isStreaming}
                                className={messages.length === 0 ? "" : "py-4"}
                                onRetry={handleRetryMessage}
                            />
                        </div>
                    </div>
                </ScrollArea>
            </div>

            {/* Input area - Fixed at bottom */}
            <div className="flex-shrink-0 border-t bg-background">
                <div className="px-4 py-4 max-w-4xl mx-auto">
                    <ChatInput
                        onSendMessage={handleSendMessage}
                        personalities={personalities}
                        aiProviders={aiProviders}
                        isLoading={isLoading}
                        placeholder={messages.length === 0 ? "Start your conversation..." : "Type your message here..."}
                        defaultAIProviderId={getLastUsedAIProvider()}
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
