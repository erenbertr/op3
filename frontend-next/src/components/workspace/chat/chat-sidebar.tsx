"use client"

import React, { useState, useEffect } from 'react';
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
import { MoreHorizontal } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
    onChatDeselect?: () => void; // New callback for deselection
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
    isLoading = false,
    onChatDeselect
}: ChatSidebarProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreatingChat, setIsCreatingChat] = useState(false);
    const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
    const [pinnedChatIds, setPinnedChatIds] = useState<string[]>([]);
    const { addToast } = useToast();
    const queryClient = useQueryClient();

    // Load pinned chats from localStorage on mount
    useEffect(() => {
        const storedPinnedChats = localStorage.getItem(`pinnedChats_${workspaceId}`);
        if (storedPinnedChats) {
            setPinnedChatIds(JSON.parse(storedPinnedChats));
        }
    }, [workspaceId]);

    // Save pinned chats to localStorage when they change
    useEffect(() => {
        // Only save if workspaceId is present to avoid saving with a temporary/null key
        if (workspaceId) {
            localStorage.setItem(`pinnedChats_${workspaceId}`, JSON.stringify(pinnedChatIds));
        }
    }, [pinnedChatIds, workspaceId]);

    const handlePinChat = (chatId: string) => {
        setPinnedChatIds(prev => {
            const newPinned = Array.from(new Set([...prev, chatId]));
            return newPinned;
        });
    };

    const handleUnpinChat = (chatId: string) => {
        setPinnedChatIds(prev => prev.filter(id => id !== chatId));
    };

    const isChatPinned = (chatId: string) => pinnedChatIds.includes(chatId);

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

    const handleDeleteChat = async (chatId: string) => {
        if (deletingChatId === chatId) return; // Prevent multiple clicks
        setDeletingChatId(chatId);
        console.log('Attempting to delete chat:', chatId);

        try {
            const result = await apiClient.deleteChatSession(chatId);
            if (result.success) {
                addToast({
                    title: "Chat Deleted",
                    description: result.message || "The chat session has been successfully deleted.",
                });

                // Optimistically update the UI by removing the chat from the local list
                const updatedSessions = chatSessions.filter(session => session.id !== chatId);
                onSessionsUpdate?.(updatedSessions);

                // If the active chat was deleted, navigate away or select another
                if (activeChatId === chatId) {
                    router.push(`/ws/${workspaceId}`);
                    onChatDeselect?.(); // Signal to parent to clear content
                }

                // Invalidate queries to refetch from server
                queryClient.invalidateQueries({
                    queryKey: queryKeys.chats.byWorkspace(userId, workspaceId)
                });

            } else {
                addToast({
                    title: "Error Deleting Chat",
                    description: result.message || "Failed to delete the chat session.",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error deleting chat session:', error);
            addToast({
                title: "Error",
                description: "An unexpected error occurred while deleting the chat.",
                variant: "destructive"
            });
        } finally {
            setDeletingChatId(null);
        }
    };

    const groupAndPinChats = (chatsToGroup: ChatSession[]) => {
        const pinnedChats = chatsToGroup.filter(chat => isChatPinned(chat.id));
        const unpinnedChats = chatsToGroup.filter(chat => !isChatPinned(chat.id));

        // Sort pinned chats by their original updatedAt to maintain some order within pinned items
        // Pinned items should generally appear in the order they were pinned or by recency.
        // For now, let's sort them by updatedAt descending (newest pinned first).
        const sortedPinnedChats = [...pinnedChats].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        const groupedUnpinnedChats = groupChatsByDate(unpinnedChats);

        const result: { [key: string]: ChatSession[] } = {};
        if (sortedPinnedChats.length > 0) {
            result['Pinned'] = sortedPinnedChats;
        }
        for (const groupName in groupedUnpinnedChats) {
            result[groupName] = groupedUnpinnedChats[groupName];
        }
        return result;
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
            "flex flex-col h-full bg-background border-r border-border w-full",
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
            <div className="flex-1 min-h-0 w-full">
                <ScrollArea className="h-full w-full">
                    <div className="px-4 py-2">
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
                            <div className="space-y-4">
                                {Object.entries(groupAndPinChats(filteredChats)).map(([groupName, groupChats]) => (
                                    <div key={groupName} className="space-y-1">
                                        <h3 className="text-xs font-medium text-muted-foreground px-2 py-1 select-none">
                                            {groupName}
                                        </h3>
                                        <div className="space-y-1">
                                            {groupChats.map((chat) => (
                                                <div // Main container for the chat item
                                                    key={chat.id}
                                                    className={cn(
                                                        "group w-full text-left px-3 py-2.5 rounded-md transition-colors select-none relative flex items-center justify-between cursor-pointer",
                                                        "hover:bg-accent hover:text-accent-foreground",
                                                        "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2", // Use focus-within for better accessibility
                                                        activeChatId === chat.id
                                                            ? "bg-accent text-accent-foreground"
                                                            : "text-foreground"
                                                    )}
                                                    onClick={() => handleChatClick(chat)} // Main click action to select chat
                                                >
                                                    <div // Chat title part
                                                        className="text-sm font-medium truncate flex-grow mr-2" // flex-grow to take available space, mr-2 for spacing
                                                        title={chat.title}
                                                    >
                                                        {chat.title}
                                                    </div>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 p-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" // Adjusted size, padding, added flex-shrink-0
                                                                onClick={(e) => {
                                                                    e.stopPropagation(); // Prevent chat click when clicking dots
                                                                }}
                                                            >
                                                                {deletingChatId === chat.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                                                                <span className="sr-only">Open chat actions</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent 
                                                            align="end" // Align dropdown to the right
                                                            onClick={(e) => e.stopPropagation()} // Prevent chat click when dropdown content is interacted with
                                                        >
                                                            <DropdownMenuItem
                                                                onClick={(e) => {
                                                                    e.stopPropagation(); // Prevent chat click
                                                                    if (isChatPinned(chat.id)) {
                                                                        handleUnpinChat(chat.id);
                                                                    } else {
                                                                        handlePinChat(chat.id);
                                                                    }
                                                                }}
                                                                className="cursor-pointer"
                                                            >
                                                                {isChatPinned(chat.id) ? 'Unpin chat' : 'Pin chat'}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={(e) => {
                                                                    e.stopPropagation(); // Ensure no other click events fire
                                                                    if (deletingChatId !== chat.id) { // Prevent action if already deleting this chat
                                                                        handleDeleteChat(chat.id);
                                                                    }
                                                                }}
                                                                disabled={deletingChatId === chat.id}
                                                                className="text-red-600 hover:!text-red-600 focus:!text-red-600 hover:!bg-red-50 focus:!bg-red-50 dark:text-red-500 dark:hover:!text-red-500 dark:focus:!text-red-500 dark:hover:!bg-red-900/50 dark:focus:!bg-red-900/50 cursor-pointer"
                                                            >
                                                                {deletingChatId === chat.id ? 'Deleting...' : 'Delete'}
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
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
