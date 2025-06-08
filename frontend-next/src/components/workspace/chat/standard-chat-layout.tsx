"use client"

import React, { useState } from 'react';
import { ChatSidebar } from './chat-sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Sparkles } from 'lucide-react';

interface StandardChatLayoutProps {
    workspaceId?: string;
    className?: string;
}

export function StandardChatLayout({ workspaceId, className }: StandardChatLayoutProps) {
    const [activeChatId, setActiveChatId] = useState<string | null>(null);

    const handleNewChat = () => {
        // TODO: Implement new chat creation
        console.log('Creating new chat...');
        // For now, just clear the active chat
        setActiveChatId(null);
    };

    const handleChatSelect = (chatId: string) => {
        setActiveChatId(chatId);
        console.log('Selected chat:', chatId);
    };

    return (
        <div className={`flex h-full ${className || ''}`}>
            {/* Left Sidebar - Fixed width with container constraints */}
            <div className="w-80 flex-shrink-0 h-full">
                <ChatSidebar
                    onNewChat={handleNewChat}
                    onChatSelect={handleChatSelect}
                    activeChatId={activeChatId || undefined}
                />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full">
                {activeChatId ? (
                    // Chat Interface - This will be implemented in the next phase
                    <div className="flex-1 flex items-center justify-center">
                        <div className="container mx-auto px-4 py-8">
                            <Card className="max-w-md mx-auto">
                                <CardHeader className="text-center">
                                    <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                                        <MessageSquare className="h-8 w-8 text-primary" />
                                    </div>
                                    <CardTitle className="text-xl">Chat Interface</CardTitle>
                                </CardHeader>
                                <CardContent className="text-center space-y-4">
                                    <p className="text-muted-foreground">
                                        Chat interface for conversation ID: <strong>{activeChatId}</strong>
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        The actual chat interface with messages, input field, and AI responses
                                        will be implemented in the next development phase.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                ) : (
                    // Welcome/Empty State
                    <div className="flex-1 flex items-center justify-center">
                        <div className="container mx-auto px-4 py-8">
                            <Card className="max-w-lg mx-auto">
                                <CardHeader className="text-center">
                                    <div className="mx-auto mb-4 p-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full w-fit">
                                        <Sparkles className="h-10 w-10 text-primary" />
                                    </div>
                                    <CardTitle className="text-2xl">Welcome to Standard Chat</CardTitle>
                                </CardHeader>
                                <CardContent className="text-center space-y-6">
                                    <p className="text-muted-foreground leading-relaxed">
                                        Start a new conversation or select an existing chat from the sidebar
                                        to begin your AI-powered discussion.
                                    </p>

                                    <div className="space-y-3 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                                            <span>Browse your chat history in the left sidebar</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                                            <span>Use the search function to find specific conversations</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                                            <span>Click "New Chat" to start a fresh conversation</span>
                                        </div>
                                    </div>

                                    {workspaceId && (
                                        <div className="pt-4 border-t">
                                            <p className="text-xs text-muted-foreground">
                                                Workspace ID: {workspaceId}
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
