"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatItem {
    id: string;
    title: string;
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
    },
    {
        id: '2',
        title: 'Code Review Session',
    },
    {
        id: '3',
        title: 'API Design Meeting',
    },
    {
        id: '4',
        title: 'Bug Investigation',
    },
    {
        id: '5',
        title: 'Feature Requirements',
    },
    {
        id: '6',
        title: 'Database Schema Updates',
    },
    {
        id: '7',
        title: 'User Interface Improvements',
    },
    {
        id: '8',
        title: 'Performance Optimization',
    },
    {
        id: '9',
        title: 'Security Audit Discussion',
    },
    {
        id: '10',
        title: 'Mobile App Development',
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
        chat.title.toLowerCase().includes(searchQuery.toLowerCase())
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
            {/* Header with Search and New Chat - Fixed at top */}
            <div className="px-4 py-4 border-b border-border flex-shrink-0">
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

            {/* Chat List - Scrollable */}
            <ScrollArea className="flex-1">
                <div>
                    {filteredChats.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground px-4">
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
                        <div className="divide-y divide-border">
                            {filteredChats.map((chat) => (
                                <div
                                    key={chat.id}
                                    className={cn(
                                        "cursor-pointer transition-colors duration-200 py-3 px-4 hover:bg-muted/50",
                                        activeChatId === chat.id
                                            ? "bg-primary/10 text-primary"
                                            : "text-foreground"
                                    )}
                                    onClick={() => handleChatClick(chat.id)}
                                >
                                    <h4 className="text-sm font-medium truncate">
                                        {chat.title}
                                    </h4>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
