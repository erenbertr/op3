"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, MessageSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient, ChatSession } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';

interface ChatSidebarProps {
    className?: string;
    userId: string;
    workspaceId: string;
    onNewChat?: (session: ChatSession) => void;
    onChatSelect?: (session: ChatSession) => void;
    activeChatId?: string;
    chatSessions?: ChatSession[];
    onSessionsUpdate?: (sessions: ChatSession[]) => void;
    isLoading?: boolean;
}

export function ChatSidebar({
    className,
    userId,
    workspaceId,
    onNewChat,
    onChatSelect,
    activeChatId,
    chatSessions = [],
    onSessionsUpdate,
    isLoading = false
}: ChatSidebarProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreatingChat, setIsCreatingChat] = useState(false);
    const { addToast } = useToast();
    const queryClient = useQueryClient();

    // Filter chats based on search query
    const filteredChats = (chatSessions || []).filter(chat =>
        chat?.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleChatClick = (chat: ChatSession) => {
        // Use Next.js router for consistent navigation
        router.push(`/ws/${workspaceId}/chat/${chat.id}`);
        // Also call the callback for backward compatibility
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
                console.log('✅ Chat created successfully:', result.session);

                // Update parent's sessions list first (this will trigger optimistic update)
                onSessionsUpdate?.([result.session, ...chatSessions]);

                // Navigate to the new chat using Next.js router
                router.push(`/ws/${workspaceId}/chat/${result.session.id}`);

                // Invalidate and refetch chat sessions to get the latest data (delayed)
                setTimeout(() => {
                    queryClient.invalidateQueries({
                        queryKey: queryKeys.chats.byWorkspace(userId, workspaceId)
                    });
                }, 500);

                // Also call the callback for backward compatibility
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
                description: "Failed to create new chat. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsCreatingChat(false);
        }
    };

    const groupChatsByDate = (chats: ChatSession[]) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        const groups: { [key: string]: ChatSession[] } = {
            'Today': [],
            'Yesterday': [],
            'This Week': [],
            'This Month': [],
            'Older': []
        };

        chats.forEach(chat => {
            const chatDate = new Date(chat.updatedAt);
            const chatDay = new Date(chatDate.getFullYear(), chatDate.getMonth(), chatDate.getDate());

            if (chatDay.getTime() === today.getTime()) {
                groups['Today'].push(chat);
            } else if (chatDay.getTime() === yesterday.getTime()) {
                groups['Yesterday'].push(chat);
            } else if (chatDate >= thisWeek) {
                groups['This Week'].push(chat);
            } else if (chatDate >= thisMonth) {
                groups['This Month'].push(chat);
            } else {
                groups['Older'].push(chat);
            }
        });

        // Remove empty groups
        Object.keys(groups).forEach(key => {
            if (groups[key].length === 0) {
                delete groups[key];
            }
        });

        return groups;
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
            <div className="flex-1 min-h-0">
                <ScrollArea className="h-full">
                    <div className="px-4 py-2 min-w-0">
                        {filteredChats.length === 0 ? (
                            // Only show empty state if we're not loading
                            !isLoading ? (
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
                            ) : null
                        ) : (
                            <div className="space-y-4 min-w-0">
                                {Object.entries(groupChatsByDate(filteredChats)).map(([groupName, groupChats]) => (
                                    <div key={groupName} className="space-y-1 min-w-0">
                                        <h3 className="text-xs font-medium text-muted-foreground px-2 py-1 select-none">
                                            {groupName}
                                        </h3>
                                        <div className="space-y-1 min-w-0">
                                            {groupChats.map((chat) => (
                                                <button
                                                    key={chat.id}
                                                    className={cn(
                                                        "w-full text-left px-3 py-3 rounded-md transition-colors select-none min-w-0",
                                                        "hover:bg-accent hover:text-accent-foreground",
                                                        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                                                        activeChatId === chat.id
                                                            ? "bg-accent text-accent-foreground"
                                                            : "text-foreground"
                                                    )}
                                                    onClick={() => handleChatClick(chat)}
                                                >
                                                    <p className="text-sm font-medium truncate min-w-0 max-w-full" title={chat.title}>
                                                        {chat.title}
                                                    </p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
