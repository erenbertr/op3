"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, MessageSquare, Loader2, Share } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient, ChatSession } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
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
    const [sharingChatId, setSharingChatId] = useState<string | null>(null);
    // Local state for optimistic pin updates to avoid flashing
    const [localPinUpdates, setLocalPinUpdates] = useState<Record<string, boolean>>({});
    const { addToast } = useToast();

    // Simple pin/unpin handler without TanStack Query optimistic updates
    const handlePinToggle = async (chatId: string, currentPinStatus: boolean) => {
        const newPinStatus = !currentPinStatus;

        // Immediately update local state for instant UI feedback
        setLocalPinUpdates(prev => ({
            ...prev,
            [chatId]: newPinStatus
        }));

        try {
            // Make API call in background
            await apiClient.updateChatSessionPinStatus(chatId, { isPinned: newPinStatus });

            // Success - keep the local update, no need to refetch
        } catch {
            // Revert local update on error
            setLocalPinUpdates(prev => {
                const updated = { ...prev };
                delete updated[chatId];
                return updated;
            });

            addToast({
                title: "Error",
                description: `Failed to ${newPinStatus ? 'pin' : 'unpin'} chat. Please try again.`,
                variant: "destructive",
            });
        }
    };

    // Apply local pin updates to chat sessions for instant UI feedback
    const chatsWithLocalUpdates = (chatSessions || []).map(chat => ({
        ...chat,
        isPinned: localPinUpdates.hasOwnProperty(chat.id) ? localPinUpdates[chat.id] : (chat.isPinned || false)
    }));

    // Filter chats based on search query
    const filteredChats = chatsWithLocalUpdates.filter(chat =>
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

                // Note: No need to invalidate queries since we use onSessionsUpdate for optimistic updates

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
            const result = await apiClient.deleteChatSession(chatId, userId);
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

                // Note: No need to invalidate queries since we use onSessionsUpdate for optimistic updates

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

    const handleShareChat = async (chatId: string) => {
        if (sharingChatId === chatId) return; // Prevent multiple clicks
        setSharingChatId(chatId);

        try {
            const result = await apiClient.shareChat(chatId);
            if (result.success && result.shareUrl) {
                // Copy the share URL to clipboard
                const fullUrl = `${window.location.origin}${result.shareUrl}`;
                await navigator.clipboard.writeText(fullUrl);

                addToast({
                    title: "Chat Shared",
                    description: "Share link copied to clipboard!",
                });
            } else {
                addToast({
                    title: "Error Sharing Chat",
                    description: result.message || "Failed to create share link.",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error sharing chat:', error);
            addToast({
                title: "Error",
                description: "Failed to create share link. Please try again.",
                variant: "destructive"
            });
        } finally {
            setSharingChatId(null);
        }
    };

    // Organize chats into hierarchical structure with parent-child relationships
    const organizeChatsHierarchically = (chats: ChatSession[]) => {
        // Separate main chats (no parent) from branched chats (have parent)
        const mainChats = chats.filter(chat => !chat.parentSessionId);
        const branchedChats = chats.filter(chat => chat.parentSessionId);

        // Create a map of parent ID to children for quick lookup
        const childrenMap = new Map<string, ChatSession[]>();
        branchedChats.forEach(chat => {
            if (chat.parentSessionId) {
                if (!childrenMap.has(chat.parentSessionId)) {
                    childrenMap.set(chat.parentSessionId, []);
                }
                childrenMap.get(chat.parentSessionId)!.push(chat);
            }
        });

        // Sort children by creation date (oldest first)
        childrenMap.forEach(children => {
            children.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });

        return { mainChats, childrenMap };
    };

    const groupAndPinChats = (chatsToGroup: ChatSession[]) => {
        const { mainChats, childrenMap } = organizeChatsHierarchically(chatsToGroup);

        const pinnedChats = mainChats.filter(chat => chat.isPinned === true);
        const unpinnedChats = mainChats.filter(chat => chat.isPinned !== true); // Include undefined as unpinned

        // Sort pinned chats by their original updatedAt to maintain some order within pinned items
        // Pinned items should generally appear in the order they were pinned or by recency.
        // For now, let's sort them by updatedAt descending (newest pinned first).
        const sortedPinnedChats = [...pinnedChats].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        const groupedUnpinnedChats = groupChatsByDate(unpinnedChats);

        const result: { [key: string]: { chats: ChatSession[], childrenMap: Map<string, ChatSession[]> } } = {};
        if (sortedPinnedChats.length > 0) {
            result['Pinned'] = { chats: sortedPinnedChats, childrenMap };
        }
        for (const groupName in groupedUnpinnedChats) {
            result[groupName] = { chats: groupedUnpinnedChats[groupName], childrenMap };
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
                                {Object.entries(groupAndPinChats(filteredChats)).map(([groupName, groupData]) => (
                                    <div key={groupName} className="space-y-1">
                                        <h3 className="text-xs font-medium text-muted-foreground px-2 py-1 select-none">
                                            {groupName}
                                        </h3>
                                        <div className="space-y-1">
                                            {groupData.chats.map((chat) => (
                                                <div key={chat.id}>
                                                    {/* Main chat item */}
                                                    <div // Main container for the chat item
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
                                                                        const currentPinStatus = chat.isPinned || false; // Default to false if undefined
                                                                        handlePinToggle(chat.id, currentPinStatus);
                                                                    }}
                                                                    className="cursor-pointer"
                                                                >
                                                                    {(chat.isPinned || false) ? 'Unpin chat' : 'Pin chat'}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={(e) => {
                                                                        e.stopPropagation(); // Prevent chat click
                                                                        if (sharingChatId !== chat.id) { // Prevent action if already sharing this chat
                                                                            handleShareChat(chat.id);
                                                                        }
                                                                    }}
                                                                    disabled={sharingChatId === chat.id}
                                                                    className="cursor-pointer"
                                                                >
                                                                    <Share className="h-4 w-4 mr-2" />
                                                                    {sharingChatId === chat.id ? 'Sharing...' : 'Share'}
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

                                                    {/* Child chats (branches) */}
                                                    {groupData.childrenMap.has(chat.id) && (
                                                        <div className="ml-4 mt-1 space-y-1">
                                                            {groupData.childrenMap.get(chat.id)!.map((childChat) => (
                                                                <div
                                                                    key={childChat.id}
                                                                    className={cn(
                                                                        "group w-full text-left px-3 py-2 rounded-md transition-colors select-none relative flex items-center justify-between cursor-pointer",
                                                                        "hover:bg-accent hover:text-accent-foreground",
                                                                        "border-l-2 border-muted-foreground/20", // Visual indicator for child
                                                                        activeChatId === childChat.id
                                                                            ? "bg-accent text-accent-foreground"
                                                                            : "text-muted-foreground"
                                                                    )}
                                                                    onClick={() => handleChatClick(childChat)}
                                                                >
                                                                    <div
                                                                        className="text-xs font-medium truncate flex-grow mr-2"
                                                                        title={childChat.title}
                                                                    >
                                                                        ↳ {childChat.title}
                                                                    </div>
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-6 w-6 p-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                }}
                                                                            >
                                                                                {deletingChatId === childChat.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <MoreHorizontal className="h-3 w-3" />}
                                                                                <span className="sr-only">Open chat actions</span>
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent
                                                                            align="end"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        >
                                                                            <DropdownMenuItem
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    if (sharingChatId !== childChat.id) {
                                                                                        handleShareChat(childChat.id);
                                                                                    }
                                                                                }}
                                                                                disabled={sharingChatId === childChat.id}
                                                                                className="cursor-pointer"
                                                                            >
                                                                                <Share className="h-3 w-3 mr-2" />
                                                                                {sharingChatId === childChat.id ? 'Sharing...' : 'Share'}
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    if (deletingChatId !== childChat.id) {
                                                                                        handleDeleteChat(childChat.id);
                                                                                    }
                                                                                }}
                                                                                disabled={deletingChatId === childChat.id}
                                                                                className="text-red-600 hover:!text-red-600 focus:!text-red-600 hover:!bg-red-50 focus:!bg-red-50 dark:text-red-500 dark:hover:!text-red-500 dark:focus:!text-red-500 dark:hover:!bg-red-900/50 dark:focus:!bg-red-900/50 cursor-pointer"
                                                                            >
                                                                                {deletingChatId === childChat.id ? 'Deleting...' : 'Delete'}
                                                                            </DropdownMenuItem>
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
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
