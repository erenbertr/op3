"use client"

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, Copy, RotateCcw, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage as ChatMessageType, Personality, AIProviderConfig } from '@/lib/api';
import { ApiMetadataTooltip } from './api-metadata-tooltip';

import DOMPurify from 'dompurify';
import { marked } from 'marked';

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
    const [justCopied, setJustCopied] = useState(false);

    // Copy to clipboard functionality
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message.content);

            // Show brief visual feedback with check icon
            setJustCopied(true);

            // Reset the copied state after a brief moment
            setTimeout(() => {
                setJustCopied(false);
            }, 1500);
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

    // Convert markdown to HTML and sanitize for AI messages
    const renderContent = () => {
        if (isAssistant) {
            // Convert markdown to HTML first (using sync version)
            const htmlContent = marked.parse(message.content, {
                breaks: true, // Convert line breaks to <br>
                gfm: true, // GitHub Flavored Markdown
            }) as string;

            // Sanitize HTML content for AI messages
            const sanitizedHTML = DOMPurify.sanitize(htmlContent, {
                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'code', 'pre', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
                ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
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
            className={cn("relative group pb-4 mb-4", className)}
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
                <div className={cn("p-3 rounded-lg", !isAssistant && "bg-muted/30")}>
                    {renderContent()}
                </div>

            </div>

            {/* Hover actions - positioned at top-right of container */}
            {isHovered && (
                <div className="absolute top-2 right-2 flex gap-1 bg-background border rounded-md shadow-sm p-1">
                    {/* API metadata tooltip - only for AI messages */}
                    {isAssistant && message.apiMetadata && (
                        <ApiMetadataTooltip metadata={message.apiMetadata} />
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={handleCopy}
                        title={justCopied ? "Copied!" : "Copy message"}
                    >
                        {justCopied ? (
                            <Check className="h-3 w-3 text-green-600" />
                        ) : (
                            <Copy className="h-3 w-3" />
                        )}
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
    pendingUserMessage?: ChatMessageType | null;
    className?: string;
    onRetry?: (messageId: string) => void;
}

export function ChatMessageList({
    messages = [],
    personalities = [],
    aiProviders = [],
    streamingMessage,
    isStreaming,
    pendingUserMessage,
    className,
    onRetry
}: ChatMessageListProps) {
    const getPersonality = (personalityId?: string) => {
        return personalityId && personalities ? personalities.find(p => p?.id === personalityId) : undefined;
    };

    const getAIProvider = (aiProviderId?: string) => {
        return aiProviderId && aiProviders ? aiProviders.find(p => p?.id === aiProviderId) : undefined;
    };

    // Combine saved messages with pending user message
    const allMessages = [...messages];
    if (pendingUserMessage) {
        allMessages.push(pendingUserMessage);
    }

    if (!allMessages || allMessages.length === 0) {
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
            {allMessages.map((message) => (
                <ChatMessage
                    key={message.id}
                    message={message}
                    personality={getPersonality(message.personalityId)}
                    aiProvider={getAIProvider(message.aiProviderId)}
                    onRetry={onRetry}
                />
            ))}

            {/* Loading state when streaming but no content yet */}
            {isStreaming && !streamingMessage && (
                <div className="relative pb-4 mb-4">
                    <div className="space-y-2">
                        {/* Typing indicator */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <div className="flex items-center gap-1">
                                <div className="w-1 h-1 bg-primary rounded-full animate-pulse"></div>
                                <span>thinking...</span>
                            </div>
                        </div>

                        {/* Loading dots */}
                        <div className="p-3 rounded-lg">
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Streaming message */}
            {isStreaming && streamingMessage && (
                <div className="relative pb-4 mb-4">

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
                                <div
                                    dangerouslySetInnerHTML={{
                                        __html: DOMPurify.sanitize(
                                            marked.parse(streamingMessage + '<span class="inline-block w-2 h-4 bg-primary/50 animate-pulse ml-1"></span>', {
                                                breaks: true,
                                                gfm: true,
                                            }) as string,
                                            {
                                                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'code', 'pre', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span'],
                                                ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
                                            }
                                        )
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
