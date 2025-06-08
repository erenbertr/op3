"use client"

import React, { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Bot, Brain, Copy, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage as ChatMessageType, Personality, AIProviderConfig } from '@/lib/api';
import { useTheme } from 'next-themes';
import DOMPurify from 'dompurify';

interface ChatMessageProps {
    message: ChatMessageType;
    personality?: Personality;
    aiProvider?: AIProviderConfig;
    className?: string;
    onRetry?: (messageId: string) => void;
}

export function ChatMessage({ message, personality, aiProvider, className, onRetry }: ChatMessageProps) {
    const isUser = message.role === 'user';
    const isAssistant = message.role === 'assistant';
    const [isHovered, setIsHovered] = useState(false);
    const { theme } = useTheme();

    // Copy to clipboard functionality
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message.content);
        } catch (error) {
            console.error('Failed to copy message:', error);
        }
    };

    // Retry functionality
    const handleRetry = () => {
        if (onRetry && message.id) {
            onRetry(message.id);
        }
    };

    // Sanitize and render HTML for AI messages
    const renderContent = () => {
        if (isAssistant) {
            // Sanitize HTML content for AI messages
            const sanitizedHTML = DOMPurify.sanitize(message.content, {
                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'code', 'pre', 'blockquote'],
                ALLOWED_ATTR: ['href', 'target', 'rel']
            });

            return (
                <div
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
                />
            );
        } else {
            // Plain text for user messages
            return (
                <div className="whitespace-pre-wrap break-words">
                    {message.content}
                </div>
            );
        }
    };

    // Determine background color based on theme
    const getUserMessageBg = () => {
        if (theme === 'dark') {
            return '#1b1718';
        } else {
            return '#f8f9fa';
        }
    };

    return (
        <div
            className={cn("flex gap-3 max-w-4xl relative group", className)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Avatar */}
            <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className={cn(
                    isUser ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                )}>
                    {isUser ? (
                        <User className="h-4 w-4" />
                    ) : (
                        <Bot className="h-4 w-4" />
                    )}
                </AvatarFallback>
            </Avatar>

            {/* Message content */}
            <div className="flex-1 space-y-2">
                {/* Message header - only show for AI messages with provider/personality info */}
                {isAssistant && (aiProvider || personality) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {/* AI Provider badge */}
                        {aiProvider && (
                            <Badge variant="outline" className="text-xs">
                                {aiProvider.name || aiProvider.type}
                            </Badge>
                        )}

                        {/* Personality badge */}
                        {personality && (
                            <Badge variant="secondary" className="text-xs">
                                <Brain className="h-3 w-3 mr-1" />
                                {personality.title}
                            </Badge>
                        )}
                    </div>
                )}

                {/* Message content with conditional background */}
                <div
                    className={cn(
                        "p-3 rounded-lg relative",
                        isUser ? "max-w-[80%]" : "max-w-full"
                    )}
                    style={isUser ? { backgroundColor: getUserMessageBg() } : {}}
                >
                    {renderContent()}

                    {/* Hover actions */}
                    {isHovered && (
                        <div className="absolute top-2 right-2 flex gap-1 bg-background border rounded-md shadow-sm">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={handleCopy}
                                title="Copy message"
                            >
                                <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={handleRetry}
                                title="Retry message"
                            >
                                <RotateCcw className="h-3 w-3" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

interface ChatMessageListProps {
    messages: ChatMessageType[];
    personalities: Personality[];
    aiProviders: AIProviderConfig[];
    streamingMessage?: string;
    isStreaming?: boolean;
    className?: string;
    onRetry?: (messageId: string) => void;
}

export function ChatMessageList({
    messages = [],
    personalities = [],
    aiProviders = [],
    streamingMessage,
    isStreaming,
    className,
    onRetry
}: ChatMessageListProps) {
    const getPersonality = (personalityId?: string) => {
        return personalityId && personalities ? personalities.find(p => p?.id === personalityId) : undefined;
    };

    const getAIProvider = (aiProviderId?: string) => {
        return aiProviderId && aiProviders ? aiProviders.find(p => p?.id === aiProviderId) : undefined;
    };

    if (!messages || messages.length === 0) {
        return (
            <div className={cn("text-center space-y-6 max-w-md", className)}>
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
        );
    }

    return (
        <div className={cn("space-y-6 p-4", className)}>
            {(messages || []).map((message) => (
                <ChatMessage
                    key={message.id}
                    message={message}
                    personality={getPersonality(message.personalityId)}
                    aiProvider={getAIProvider(message.aiProviderId)}
                    onRetry={onRetry}
                />
            ))}

            {/* Streaming message */}
            {isStreaming && streamingMessage && (
                <div className="flex gap-3 max-w-4xl relative">
                    {/* Avatar */}
                    <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-secondary text-secondary-foreground">
                            <Bot className="h-4 w-4" />
                        </AvatarFallback>
                    </Avatar>

                    {/* Message content */}
                    <div className="flex-1 space-y-2">
                        {/* Typing indicator */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <div className="w-1 h-1 bg-primary rounded-full animate-pulse"></div>
                                <span>typing...</span>
                            </div>
                        </div>

                        {/* Message content with transparent background */}
                        <div className="p-3 rounded-lg max-w-full">
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                                <div className="whitespace-pre-wrap break-words">
                                    {streamingMessage}
                                    <span className="inline-block w-2 h-4 bg-primary/50 animate-pulse ml-1"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
