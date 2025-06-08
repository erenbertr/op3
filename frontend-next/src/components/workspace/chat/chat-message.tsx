"use client"

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, Copy, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage as ChatMessageType, Personality, AIProviderConfig } from '@/lib/api';

import DOMPurify from 'dompurify';

interface ChatMessageProps {
    message: ChatMessageType;
    personality?: Personality;
    aiProvider?: AIProviderConfig;
    className?: string;
    onRetry?: (messageId: string) => void;
}

export function ChatMessage({ message, personality, aiProvider, className, onRetry }: ChatMessageProps) {
    const isAssistant = message.role === 'assistant';
    const [isHovered, setIsHovered] = useState(false);


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



    return (
        <div
            className={cn("relative group pb-4 mb-4 last:mb-0 last:border-b-0 border-b border-border", className)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >

            {/* Message content */}
            <div className="space-y-2">
                {/* Message header - only show for AI messages with provider/personality info */}
                {isAssistant && (aiProvider || personality) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
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

                {/* Message content */}
                <div className="p-3 rounded-lg">
                    {renderContent()}
                </div>

            </div>

            {/* Hover actions - positioned at top-right of container */}
            {isHovered && (
                <div className="absolute top-2 right-2 flex gap-1 bg-background border rounded-md shadow-sm p-1">
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
        <div className={cn("p-4", className)}>
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
                <div className="relative pb-4 mb-4 border-b border-border">

                    {/* Message content */}
                    <div className="space-y-2">
                        {/* Typing indicator */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <div className="flex items-center gap-1">
                                <div className="w-1 h-1 bg-primary rounded-full animate-pulse"></div>
                                <span>typing...</span>
                            </div>
                        </div>

                        {/* Message content */}
                        <div className="p-3 rounded-lg">
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
