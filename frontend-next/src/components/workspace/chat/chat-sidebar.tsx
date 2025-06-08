"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, MessageSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient, ChatSession } from '@/lib/api';
import { useToast } from '@/components/ui/toast';

interface ChatSidebarProps {
    className?: string;
    userId: string;
    workspaceId: string;
    onNewChat?: (session: ChatSession) => void;
    onChatSelect?: (session: ChatSession) => void;
    activeChatId?: string;
}

export function ChatSidebar({
    className,
    userId,
    workspaceId,
    onNewChat,
    onChatSelect,
    activeChatId
}: ChatSidebarProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [chats, setChats] = useState<ChatSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreatingChat, setIsCreatingChat] = useState(false);
    const { addToast } = useToast();



    const loadChatSessions = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await apiClient.getChatSessions(userId);
            if (result.success) {
                setChats(result.sessions);
            } else {
                addToast({
                    title: "Error",
                    description: result.message || "Failed to load chat sessions",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error loading chat sessions:', error);
            addToast({
                title: "Error",
                description: "Failed to load chat sessions",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }, [userId, addToast]);

    // Load chat sessions when component mounts or userId changes
    useEffect(() => {
        if (userId) {
            loadChatSessions();
        }
    }, [userId, loadChatSessions]);

    // Filter chats based on search query
    const filteredChats = chats.filter(chat =>
        chat.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleChatClick = (chat: ChatSession) => {
        onChatSelect?.(chat);
    };

    const handleNewChatClick = async () => {
        setIsCreatingChat(true);
        try {
            const result = await apiClient.createChatSession({
                userId,
                workspaceId,
                title: 'New Chat'
            });

            if (result.success && result.session) {
                setChats(prev => [result.session!, ...prev]);
                onNewChat?.(result.session);
            } else {
                addToast({
                    title: "Error",
                    description: result.message || "Failed to create new chat",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error creating new chat:', error);
            addToast({
                title: "Error",
                description: "Failed to create new chat",
                variant: "destructive"
            });
        } finally {
            setIsCreatingChat(false);
        }
    };

    const formatChatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 24) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffInHours < 24 * 7) {
            return date.toLocaleDateString([], { weekday: 'short' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
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
                    disabled={isCreatingChat}
                    className="w-full"
                    size="sm"
                >
                    {isCreatingChat ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Plus className="h-4 w-4 mr-2" />
                    )}
                    New Chat
                </Button>
            </div>

            {/* Chat List - Scrollable */}
            <ScrollArea className="flex-1">
                <div className="px-4 py-2 space-y-1">
                    {isLoading ? (
                        <div className="text-center py-8">
                            <Loader2 className="h-6 w-6 mx-auto text-muted-foreground mb-2 animate-spin" />
                            <p className="text-sm text-muted-foreground">Loading chats...</p>
                        </div>
                    ) : filteredChats.length === 0 ? (
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
                        <div className="space-y-1">
                            {filteredChats.map((chat) => (
                                <button
                                    key={chat.id}
                                    className={cn(
                                        "w-full text-left px-3 py-3 rounded-md transition-colors",
                                        "hover:bg-accent hover:text-accent-foreground",
                                        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                                        activeChatId === chat.id
                                            ? "bg-accent text-accent-foreground"
                                            : "text-foreground"
                                    )}
                                    onClick={() => handleChatClick(chat)}
                                >
                                    <div className="flex items-start gap-3">
                                        <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium truncate">
                                                    {chat.title}
                                                </p>
                                                <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                                    {formatChatTime(chat.updatedAt)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
