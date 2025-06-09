"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatInput } from './chat-input';
import { ChatMessageList } from './chat-message';
// Removed ChatMessagesSkeleton import - using simple spinner instead
import { apiClient, ChatMessage, ChatSession, Personality, AIProviderConfig } from '@/lib/api';
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
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(true);
    const [showSpinner, setShowSpinner] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState<string>('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [, setPendingUserMessage] = useState<ChatMessage | null>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const spinnerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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



    // Load messages when session changes
    useEffect(() => {
        if (session?.id) {
            loadMessages();
        }
    }, [session?.id, loadMessages]);

    // Handle delayed spinner display for message loading
    useEffect(() => {
        if (isLoadingMessages && messages.length === 0) {
            // Reset spinner state when loading starts
            setShowSpinner(false);

            // Set timeout to show spinner after 2.5 seconds
            spinnerTimeoutRef.current = setTimeout(() => {
                setShowSpinner(true);
            }, 2500);
        } else {
            // Clear timeout and hide spinner when loading completes
            if (spinnerTimeoutRef.current) {
                clearTimeout(spinnerTimeoutRef.current);
                spinnerTimeoutRef.current = null;
            }
            setShowSpinner(false);
        }

        // Cleanup timeout on unmount
        return () => {
            if (spinnerTimeoutRef.current) {
                clearTimeout(spinnerTimeoutRef.current);
                spinnerTimeoutRef.current = null;
            }
        };
    }, [isLoadingMessages, messages.length]);

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

        // Add user message immediately to UI
        setMessages(prev => [...(prev || []), userMessage]);
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
                    // Handle completion - add the AI message to the chat
                    setMessages(prev => [...prev, aiMessage]);

                    setPendingUserMessage(null);
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
                (error) => {
                    console.error('Streaming error:', error);
                    // Remove the temporary user message on error
                    setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
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
            // Remove the temporary user message on error
            setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
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
                {isLoadingMessages && messages.length === 0 && showSpinner ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted-foreground/20 border-t-muted-foreground/40 opacity-30"></div>
                    </div>
                ) : isLoadingMessages && messages.length === 0 && !showSpinner ? (
                    <div className="h-full">
                        {/* Blank area - no spinner yet */}
                    </div>
                ) : (
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
