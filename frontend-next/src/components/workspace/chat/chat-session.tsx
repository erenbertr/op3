"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatInput } from './chat-input';
import { ChatMessageList } from './chat-message';
import { apiClient, ChatMessage, ChatSession, Personality, AIProviderConfig } from '@/lib/api';
import { useToast } from '@/components/ui/toast';

interface ChatSessionProps {
    session: ChatSession;
    personalities: Personality[];
    aiProviders: AIProviderConfig[];
    onSessionUpdate?: (session: ChatSession) => void;
    className?: string;
}

export function ChatSessionComponent({
    session,
    personalities,
    aiProviders,
    onSessionUpdate,
    className
}: ChatSessionProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(true);
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
    }, [messages]);

    const loadMessages = useCallback(async () => {
        setIsLoadingMessages(true);
        try {
            const result = await apiClient.getChatMessages(session.id);
            if (result.success) {
                setMessages(result.messages);
            } else {
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
    }, [session.id, addToast]);

    // Load messages when session changes
    useEffect(() => {
        loadMessages();
    }, [session.id, loadMessages]);

    const handleSendMessage = async (content: string, personalityId?: string, aiProviderId?: string) => {
        setIsLoading(true);
        try {
            const result = await apiClient.sendMessage(session.id, {
                content,
                personalityId,
                aiProviderId
            });

            if (result.success) {
                // Add both user message and AI response to the messages list
                const newMessages: ChatMessage[] = [];
                if (result.userMessage) {
                    newMessages.push(result.userMessage);
                }
                if (result.aiResponse) {
                    newMessages.push(result.aiResponse);
                }

                setMessages(prev => [...prev, ...newMessages]);

                // Update session title if this is the first message and title is "New Chat"
                if (messages.length === 0 && session.title === 'New Chat') {
                    const newTitle = content.length > 50 ? content.substring(0, 50) + '...' : content;
                    try {
                        const updateResult = await apiClient.updateChatSession(session.id, { title: newTitle });
                        if (updateResult.success && updateResult.session && onSessionUpdate) {
                            onSessionUpdate(updateResult.session);
                        }
                    } catch (error) {
                        console.error('Error updating session title:', error);
                    }
                }
            } else {
                addToast({
                    title: "Error",
                    description: result.message || "Failed to send message",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error sending message:', error);
            addToast({
                title: "Error",
                description: "Failed to send message",
                variant: "destructive"
            });
        } finally {
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
            <ScrollArea ref={scrollAreaRef} className="flex-1 px-4">
                <ChatMessageList
                    messages={messages}
                    personalities={personalities}
                    aiProviders={aiProviders}
                    className="py-4"
                />
            </ScrollArea>

            {/* Input area */}
            <div className="border-t bg-background p-4">
                <ChatInput
                    onSendMessage={handleSendMessage}
                    personalities={personalities}
                    aiProviders={aiProviders}
                    isLoading={isLoading}
                    placeholder={messages.length === 0 ? "Start your conversation..." : "Type your message here..."}
                />
            </div>
        </div>
    );
}

interface EmptyChatStateProps {
    className?: string;
}

export function EmptyChatState({ className }: EmptyChatStateProps) {
    return (
        <div className={`flex-1 flex items-center justify-center ${className || ''}`}>
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
                    <h3 className="text-xl font-semibold">Ready to Chat</h3>
                    <p className="text-muted-foreground">
                        Select a chat from the sidebar or start a new conversation to begin.
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
