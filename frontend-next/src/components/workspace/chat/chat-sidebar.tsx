"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Plus, MessageSquare, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatItem {
    id: string;
    title: string;
    lastMessage?: string;
    timestamp: string;
    isActive?: boolean;
}

interface ChatSidebarProps {
    className?: string;
    onNewChat?: () => void;
    onChatSelect?: (chatId: string) => void;
    activeChatId?: string;
}

// Mock data for demonstration - this will be replaced with real data later
const mockChats: ChatItem[] = [
    {
        id: '1',
        title: 'Project Planning Discussion',
        lastMessage: 'Let\'s review the timeline for the next sprint...',
        timestamp: '2 min ago',
    },
    {
        id: '2',
        title: 'Code Review Session',
        lastMessage: 'The implementation looks good, but we should...',
        timestamp: '1 hour ago',
    },
    {
        id: '3',
        title: 'API Design Meeting',
        lastMessage: 'We need to consider the authentication flow...',
        timestamp: '3 hours ago',
    },
    {
        id: '4',
        title: 'Bug Investigation',
        lastMessage: 'Found the root cause of the performance issue...',
        timestamp: 'Yesterday',
    },
    {
        id: '5',
        title: 'Feature Requirements',
        lastMessage: 'The user story needs more clarification...',
        timestamp: '2 days ago',
    },
];

export function ChatSidebar({ 
    className, 
    onNewChat, 
    onChatSelect, 
    activeChatId 
}: ChatSidebarProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [chats] = useState<ChatItem[]>(mockChats);

    // Filter chats based on search query
    const filteredChats = chats.filter(chat =>
        chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleChatClick = (chatId: string) => {
        onChatSelect?.(chatId);
    };

    const handleNewChatClick = () => {
        onNewChat?.();
    };

    return (
        <div className={cn(
            "flex flex-col h-full bg-background border-r border-border",
            className
        )}>
            {/* Header with Search */}
            <div className="p-4 border-b border-border">
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search chats..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                
                {/* New Chat Button */}
                <Button 
                    onClick={handleNewChatClick}
                    className="w-full"
                    size="sm"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    New Chat
                </Button>
            </div>

            {/* Chat List */}
            <ScrollArea className="flex-1">
                <div className="p-2 space-y-2">
                    {filteredChats.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">
                                {searchQuery ? 'No chats found' : 'No chats yet'}
                            </p>
                            {!searchQuery && (
                                <p className="text-xs mt-1">
                                    Start a new conversation
                                </p>
                            )}
                        </div>
                    ) : (
                        filteredChats.map((chat) => (
                            <Card
                                key={chat.id}
                                className={cn(
                                    "cursor-pointer transition-all duration-200 hover:shadow-sm",
                                    activeChatId === chat.id
                                        ? "border-primary bg-primary/5"
                                        : "hover:border-primary/50"
                                )}
                                onClick={() => handleChatClick(chat.id)}
                            >
                                <CardContent className="p-3">
                                    <div className="space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <h4 className="text-sm font-medium leading-tight truncate">
                                                {chat.title}
                                            </h4>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                                                <Clock className="h-3 w-3" />
                                                <span>{chat.timestamp}</span>
                                            </div>
                                        </div>
                                        
                                        {chat.lastMessage && (
                                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                {chat.lastMessage}
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
