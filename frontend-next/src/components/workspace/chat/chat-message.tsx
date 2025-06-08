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
    className?: string;
}

export function ChatMessageList({ 
    messages, 
    personalities, 
    aiProviders, 
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
            <div className={cn("flex-1 flex items-center justify-center", className)}>
                <div className="text-center space-y-3">
                    <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                        <Bot className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-medium">Start a conversation</h3>
                        <p className="text-sm text-muted-foreground">
                            Send a message to begin chatting with the AI assistant.
                        </p>
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
        </div>
    );
}
