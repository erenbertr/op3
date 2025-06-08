"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { ChatSidebar } from './chat-sidebar';
import { ChatSessionComponent, EmptyChatState } from './chat-session';
import { apiClient, ChatSession, Personality, AIProviderConfig } from '@/lib/api';
import { useToast } from '@/components/ui/toast';

interface StandardChatLayoutProps {
    workspaceId: string;
    userId: string;
    className?: string;
}

export function StandardChatLayout({ workspaceId, userId, className }: StandardChatLayoutProps) {
    const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
    const [personalities, setPersonalities] = useState<Personality[]>([]);
    const [aiProviders, setAIProviders] = useState<AIProviderConfig[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const { addToast } = useToast();



    const loadInitialData = useCallback(async () => {
        setIsLoadingData(true);
        try {
            // Load personalities and AI providers in parallel
            const [personalitiesResult] = await Promise.all([
                apiClient.getPersonalities(userId),
                // TODO: Add API method to get AI providers
                Promise.resolve({ success: true, data: [] as AIProviderConfig[] })
            ]);

            if (personalitiesResult.success) {
                setPersonalities(personalitiesResult.personalities);
            }

            // For now, use mock AI providers until we implement the API
            setAIProviders([
                {
                    id: '1',
                    type: 'openai',
                    name: 'OpenAI GPT-4',
                    apiKey: 'mock-key',
                    model: 'gpt-4o',
                    isActive: true
                },
                {
                    id: '2',
                    type: 'anthropic',
                    name: 'Claude 3.5 Sonnet',
                    apiKey: 'mock-key',
                    model: 'claude-3-5-sonnet-20241022',
                    isActive: true
                }
            ]);
        } catch (error) {
            console.error('Error loading initial data:', error);
            addToast({
                title: "Error",
                description: "Failed to load application data",
                variant: "destructive"
            });
        } finally {
            setIsLoadingData(false);
        }
    }, [userId, addToast]);

    // Load personalities and AI providers when component mounts
    useEffect(() => {
        loadInitialData();
    }, [userId, loadInitialData]);

    const handleNewChat = (session: ChatSession) => {
        setActiveSession(session);
    };

    const handleChatSelect = (session: ChatSession) => {
        setActiveSession(session);
    };

    const handleSessionUpdate = (updatedSession: ChatSession) => {
        setActiveSession(updatedSession);
    };

    if (isLoadingData) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-center space-y-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-sm text-muted-foreground">Loading chat interface...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex h-full ${className || ''}`}>
            {/* Left Sidebar - Fixed width */}
            <div className="w-80 flex-shrink-0 h-full">
                <ChatSidebar
                    userId={userId}
                    workspaceId={workspaceId}
                    onNewChat={handleNewChat}
                    onChatSelect={handleChatSelect}
                    activeChatId={activeSession?.id}
                />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full">
                {activeSession ? (
                    <ChatSessionComponent
                        session={activeSession}
                        personalities={personalities}
                        aiProviders={aiProviders}
                        onSessionUpdate={handleSessionUpdate}
                    />
                ) : (
                    <EmptyChatState />
                )}
            </div>
        </div>
    );
}
