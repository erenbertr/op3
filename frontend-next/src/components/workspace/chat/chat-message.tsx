"use client"

import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Bot, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage as ChatMessageType, Personality, AIProviderConfig } from '@/lib/api';

interface ChatMessageProps {
    message: ChatMessageType;
    personality?: Personality;
    aiProvider?: AIProviderConfig;
    className?: string;
}

export function ChatMessage({ message, personality, aiProvider, className }: ChatMessageProps) {
    const isUser = message.role === 'user';
    const isAssistant = message.role === 'assistant';

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className={cn(
            "flex gap-3 max-w-4xl mx-auto",
            isUser ? "flex-row-reverse" : "flex-row",
            className
        )}>
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
            <div className={cn(
                "flex-1 space-y-2",
                isUser ? "items-end" : "items-start"
            )}>
                {/* Message header */}
                <div className={cn(
                    "flex items-center gap-2 text-xs text-muted-foreground",
                    isUser ? "flex-row-reverse" : "flex-row"
                )}>
                    <span className="font-medium">
                        {isUser ? "You" : "Assistant"}
                    </span>

                    {/* Personality badge for assistant messages */}
                    {isAssistant && personality && (
                        <Badge variant="secondary" className="text-xs">
                            <Brain className="h-3 w-3 mr-1" />
                            {personality.title}
                        </Badge>
                    )}

                    {/* AI Provider badge for assistant messages */}
                    {isAssistant && aiProvider && (
                        <Badge variant="outline" className="text-xs">
                            {aiProvider.name || aiProvider.type}
                        </Badge>
                    )}

                    <span>{formatTime(message.createdAt)}</span>
                </div>

                {/* Message bubble */}
                <Card className={cn(
                    "max-w-[80%]",
                    isUser ? "ml-auto bg-primary text-primary-foreground" : "mr-auto"
                )}>
                    <CardContent className="p-3">
                        <div className="whitespace-pre-wrap break-words">
                            {message.content}
                        </div>
                    </CardContent>
                </Card>
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
}

export function ChatMessageList({
    messages,
    personalities,
    aiProviders,
    streamingMessage,
    isStreaming,
    className
}: ChatMessageListProps) {
    const getPersonality = (personalityId?: string) => {
        return personalityId ? personalities.find(p => p.id === personalityId) : undefined;
    };

    const getAIProvider = (aiProviderId?: string) => {
        return aiProviderId ? aiProviders.find(p => p.id === aiProviderId) : undefined;
    };

    if (messages.length === 0) {
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
            {messages.map((message) => (
                <ChatMessage
                    key={message.id}
                    message={message}
                    personality={getPersonality(message.personalityId)}
                    aiProvider={getAIProvider(message.aiProviderId)}
                />
            ))}

            {/* Streaming message */}
            {isStreaming && streamingMessage && (
                <div className="flex gap-3 max-w-4xl mx-auto">
                    {/* Avatar */}
                    <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-secondary text-secondary-foreground">
                            <Bot className="h-4 w-4" />
                        </AvatarFallback>
                    </Avatar>

                    {/* Message content */}
                    <div className="flex-1 space-y-2 items-start">
                        {/* Message header */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium">Assistant</span>
                            <div className="flex items-center gap-1">
                                <div className="w-1 h-1 bg-primary rounded-full animate-pulse"></div>
                                <span>typing...</span>
                            </div>
                        </div>

                        {/* Message bubble */}
                        <Card className="max-w-[80%] mr-auto">
                            <CardContent className="p-3">
                                <div className="whitespace-pre-wrap break-words">
                                    {streamingMessage}
                                    <span className="inline-block w-2 h-4 bg-primary/50 animate-pulse ml-1"></span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
