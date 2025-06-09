"use client"

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Note: ChatMessageSkeleton removed - using simple spinner instead of skeleton for message loading

// Note: ChatMessagesSkeleton removed - using simple spinner instead of skeleton for message loading

// Note: ChatInputSkeleton removed - we now show the real ChatInput component
// with empty data instead of a skeleton, since it doesn't require heavy loading

// Chat sidebar skeleton that matches the real ChatSidebar component structure
export function ChatSidebarSkeleton() {
    return (
        <div className="flex flex-col h-full bg-background border-r border-border">
            {/* Header with Search and New Chat - Fixed at top */}
            <div className="px-4 py-4 border-b border-border flex-shrink-0">
                <div className="relative mb-3">
                    {/* Search input with icon */}
                    <div className="relative">
                        <Skeleton className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2" />
                        <Skeleton className="h-9 w-full pl-10" />
                    </div>
                </div>

                {/* New Chat Button */}
                <Skeleton className="h-8 w-full" />
            </div>

            {/* Chat List - Scrollable */}
            <div className="flex-1">
                <div className="px-4 py-2">
                    <div className="space-y-4">
                        {/* Date group skeleton */}
                        <div className="space-y-1">
                            <Skeleton className="h-4 w-16 px-2 py-1" />
                            <div className="space-y-1">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="px-3 py-3 rounded-md">
                                        <Skeleton className="h-4 w-3/4" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Another date group skeleton */}
                        <div className="space-y-1">
                            <Skeleton className="h-4 w-20 px-2 py-1" />
                            <div className="space-y-1">
                                {Array.from({ length: 2 }).map((_, i) => (
                                    <div key={i} className="px-3 py-3 rounded-md">
                                        <Skeleton className="h-4 w-2/3" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Workspace selection skeleton
export function WorkspaceSelectionSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
                    <div className="grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="text-left space-y-1">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// Workspace management skeleton
export function WorkspaceManagementSkeleton() {
    return (
        <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-8 w-16" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// Complete chat layout skeleton that matches the real StandardChatLayout structure
// Note: ChatInput is NOT included in skeleton - it will be shown separately by the parent component
export function ChatLayoutSkeleton() {
    return (
        <div className="h-full">
            <div className="container mx-auto h-full px-4">
                <div className="flex h-full">
                    {/* Left Sidebar - Fixed width */}
                    <div className="w-80 flex-shrink-0 h-full border-l border-border">
                        <ChatSidebarSkeleton />
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 h-full border-r border-border">
                        <div className="flex flex-col h-full">
                            {/* Messages area - takes full height since input is handled separately */}
                            <div className="flex-1 overflow-hidden">
                                <div className="h-full">
                                    <ChatMessagesSkeleton />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
