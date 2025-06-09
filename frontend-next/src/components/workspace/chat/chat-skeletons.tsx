"use client"

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Individual message skeleton
export function ChatMessageSkeleton({ isUser = false }: { isUser?: boolean }) {
    return (
        <div className="relative group pb-4 mb-4">
            <div className="space-y-2">
                {/* AI message header skeleton */}
                {!isUser && (
                    <div className="flex items-center gap-2 mb-2">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-20" />
                    </div>
                )}

                {/* Message content skeleton */}
                <div className={cn("p-3 rounded-lg space-y-2", !isUser && "bg-muted/30")}>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                    {!isUser && <Skeleton className="h-4 w-3/4" />}
                </div>
            </div>
        </div>
    );
}

// Multiple messages skeleton
export function ChatMessagesSkeleton() {
    return (
        <div className="p-4 space-y-4">
            {/* User message */}
            <ChatMessageSkeleton isUser={true} />

            {/* AI response */}
            <ChatMessageSkeleton isUser={false} />

            {/* User message */}
            <ChatMessageSkeleton isUser={true} />

            {/* AI response */}
            <ChatMessageSkeleton isUser={false} />
        </div>
    );
}

// Chat input skeleton
export function ChatInputSkeleton() {
    return (
        <div className="flex-shrink-0 border-t bg-background">
            <div className="px-4 py-4 max-w-4xl mx-auto">
                <div className="space-y-3">
                    {/* Dropdowns row */}
                    <div className="flex gap-3">
                        <Skeleton className="h-9 w-48" />
                        <Skeleton className="h-9 w-48" />
                        <div className="flex gap-2 ml-auto">
                            <Skeleton className="h-9 w-9" />
                            <Skeleton className="h-9 w-9" />
                        </div>
                    </div>

                    {/* Input area */}
                    <div className="flex gap-3">
                        <Skeleton className="h-20 flex-1" />
                        <Skeleton className="h-20 w-20" />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Chat sidebar skeleton
export function ChatSidebarSkeleton() {
    return (
        <div className="flex flex-col h-full bg-background border-r border-border">
            {/* Header with Search and New Chat */}
            <div className="px-4 py-4 border-b border-border flex-shrink-0">
                <div className="space-y-3">
                    {/* Search input skeleton */}
                    <Skeleton className="h-9 w-full" />

                    {/* New Chat button skeleton */}
                    <Skeleton className="h-8 w-full" />
                </div>
            </div>

            {/* Chat list skeleton */}
            <div className="flex-1 px-4 py-2">
                <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="p-2 space-y-1">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                    ))}
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

// Complete chat layout skeleton
export function ChatLayoutSkeleton() {
    return (
        <div className="h-full">
            <div className="container mx-auto h-full px-4">
                <div className="flex h-full">
                    {/* Left Sidebar Skeleton */}
                    <div className="w-80 flex-shrink-0 h-full border-l border-border">
                        <ChatSidebarSkeleton />
                    </div>

                    {/* Main Content Area Skeleton */}
                    <div className="flex-1 h-full border-r border-border flex flex-col">
                        {/* Messages area skeleton */}
                        <div className="flex-1 overflow-hidden">
                            <ChatMessagesSkeleton />
                        </div>

                        {/* Input area skeleton */}
                        <ChatInputSkeleton />
                    </div>
                </div>
            </div>
        </div>
    );
}
