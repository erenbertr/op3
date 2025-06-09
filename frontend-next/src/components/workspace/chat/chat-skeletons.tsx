"use client"

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Individual message skeleton that matches the real ChatMessage component structure
export function ChatMessageSkeleton({ isUser = false }: { isUser?: boolean }) {
    return (
        <div className="relative group pb-4 mb-4">
            <div className="space-y-2">
                {/* AI message header skeleton - matches the badges structure */}
                {!isUser && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        {/* AI Provider badge skeleton */}
                        <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                            <Skeleton className="h-3 w-16" />
                        </div>
                        {/* Personality badge skeleton */}
                        <div className="inline-flex items-center rounded-md bg-secondary px-2.5 py-0.5 text-xs font-semibold">
                            <Skeleton className="h-3 w-3 mr-1 rounded-full" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                    </div>
                )}

                {/* Message content skeleton - matches the real message structure */}
                <div className={cn("p-3 rounded-lg", !isUser && "bg-muted/30")}>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/5" />
                        {!isUser && <Skeleton className="h-4 w-3/4" />}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Multiple messages skeleton that matches the real ChatMessageList structure
export function ChatMessagesSkeleton() {
    return (
        <div className="px-4 max-w-4xl mx-auto">
            <div className="py-4">
                {/* User message */}
                <ChatMessageSkeleton isUser={true} />

                {/* AI response */}
                <ChatMessageSkeleton isUser={false} />

                {/* User message */}
                <ChatMessageSkeleton isUser={true} />

                {/* AI response */}
                <ChatMessageSkeleton isUser={false} />
            </div>
        </div>
    );
}

// Chat input skeleton that matches the real ChatInput component structure
export function ChatInputSkeleton() {
    return (
        <div className="flex-shrink-0 border-t bg-background">
            <div className="px-4 py-4 max-w-4xl mx-auto">
                <div className="w-full max-w-4xl mx-auto">
                    <div className="space-y-4">
                        {/* Main input area - matches the textarea + send button structure */}
                        <div className="relative border rounded-lg bg-background">
                            <div className="min-h-[60px] p-3 pr-12">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-1/2 mt-2" />
                            </div>
                            {/* Send button skeleton */}
                            <div className="absolute bottom-2 right-2">
                                <Skeleton className="h-8 w-8 rounded-md" />
                            </div>
                        </div>

                        {/* Controls row - matches the personality/provider/buttons structure */}
                        <div className="flex items-center gap-3 text-sm">
                            {/* Personality selection skeleton */}
                            <div className="flex-1">
                                <Skeleton className="h-10 w-full rounded-md" />
                            </div>

                            {/* AI Provider selection skeleton */}
                            <div className="w-48">
                                <Skeleton className="h-10 w-full rounded-md" />
                            </div>

                            {/* Toggle buttons skeleton */}
                            <Skeleton className="h-8 w-8 rounded-md" />
                            <Skeleton className="h-8 w-8 rounded-md" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

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
                            {/* Messages area */}
                            <div className="flex-1 overflow-hidden">
                                <div className="h-full">
                                    <ChatMessagesSkeleton />
                                </div>
                            </div>

                            {/* Input area - Fixed at bottom */}
                            <ChatInputSkeleton />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
