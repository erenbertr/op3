"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { ChatSidebar } from './chat-sidebar';
import { ChatSessionComponent, EmptyChatState } from './chat-session';
import { ChatLayoutSkeleton } from './chat-skeletons';
import { apiClient, ChatSession, Personality, AIProviderConfig } from '@/lib/api';
import { useToast } from '@/components/ui/toast';

interface StandardChatLayoutProps {
    workspaceId: string;
    userId: string;
    className?: string;
}

// Key for storing active session in localStorage
const ACTIVE_SESSION_KEY = 'op3_active_chat_session';

export function StandardChatLayout({ workspaceId, userId, className }: StandardChatLayoutProps) {
    const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
    const [personalities, setPersonalities] = useState<Personality[]>([]);
    const [aiProviders, setAIProviders] = useState<AIProviderConfig[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const { addToast } = useToast();

    // Save active session to localStorage
    const saveActiveSession = useCallback((session: ChatSession | null) => {
        try {
            if (session) {
                localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({
                    id: session.id,
                    userId: session.userId,
                    workspaceId: session.workspaceId,
                    title: session.title,
                    createdAt: session.createdAt,
                    updatedAt: session.updatedAt
                }));
            } else {
                localStorage.removeItem(ACTIVE_SESSION_KEY);
            }
        } catch (error) {
            console.error('Error saving active session to localStorage:', error);
        }
    }, []);

    // Restore active session from localStorage
    const restoreActiveSession = useCallback(async (sessions: ChatSession[]) => {
        try {
            const savedSessionStr = localStorage.getItem(ACTIVE_SESSION_KEY);
            if (!savedSessionStr) return;

            const savedSession = JSON.parse(savedSessionStr);

            // Check if the saved session still exists in the current workspace
            const existingSession = sessions.find(s =>
                s.id === savedSession.id &&
                s.workspaceId === workspaceId &&
                s.userId === userId
            );

            if (existingSession) {
                setActiveSession(existingSession);
            } else {
                // Session no longer exists, clear localStorage
                localStorage.removeItem(ACTIVE_SESSION_KEY);
            }
        } catch (error) {
            console.error('Error restoring active session from localStorage:', error);
            localStorage.removeItem(ACTIVE_SESSION_KEY);
        }
    }, [workspaceId, userId]);

    const loadInitialData = useCallback(async () => {
        setIsLoadingData(true);
        try {
            // Load personalities, AI providers, and chat sessions in parallel
            const [personalitiesResult, aiProvidersResult, chatSessionsResult] = await Promise.all([
                apiClient.getPersonalities(userId),
                apiClient.getAIProviders(),
                apiClient.getChatSessions(userId, workspaceId)
            ]);

            if (personalitiesResult.success) {
                setPersonalities(personalitiesResult.personalities);
            }

            if (aiProvidersResult.success) {
                setAIProviders(aiProvidersResult.providers);
            } else {
                console.error('Failed to load AI providers:', aiProvidersResult.message);
                addToast({
                    title: "Warning",
                    description: "Failed to load AI providers. Please check your configuration.",
                    variant: "destructive"
                });
            }

            if (chatSessionsResult.success) {
                const sessions = chatSessionsResult.sessions || [];
                setChatSessions(sessions);
                // Try to restore the previously active session
                await restoreActiveSession(sessions);
            } else {
                console.error('Failed to load chat sessions:', chatSessionsResult.message);
            }
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
    }, [userId, workspaceId, addToast, restoreActiveSession]);

    // Load personalities and AI providers when component mounts
    useEffect(() => {
        loadInitialData();
    }, [userId, loadInitialData]);

    const handleNewChat = (session: ChatSession) => {
        setActiveSession(session);
        saveActiveSession(session);
    };

    const handleChatSelect = (session: ChatSession) => {
        setActiveSession(session);
        saveActiveSession(session);
    };

    const handleSessionUpdate = (updatedSession: ChatSession) => {
        setActiveSession(updatedSession);
        saveActiveSession(updatedSession);
    };

    if (isLoadingData) {
        return <ChatLayoutSkeleton />;
    }

    return (
        <div className={`h-full ${className || ''}`}>
            <div className="container mx-auto h-full px-4">
                <div className="flex h-full">
                    {/* Left Sidebar - Fixed width */}
                    <div className="w-80 flex-shrink-0 h-full border-l border-border">
                        <ChatSidebar
                            userId={userId}
                            workspaceId={workspaceId}
                            onNewChat={handleNewChat}
                            onChatSelect={handleChatSelect}
                            activeChatId={activeSession?.id}
                            chatSessions={chatSessions}
                            onSessionsUpdate={setChatSessions}
                        />
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 h-full border-r border-border">
                        {activeSession ? (
                            <ChatSessionComponent
                                session={activeSession}
                                personalities={personalities || []}
                                aiProviders={aiProviders || []}
                                onSessionUpdate={handleSessionUpdate}
                                userId={userId}
                                className="h-full"
                            />
                        ) : (
                            <div className="h-full flex items-center justify-center">
                                <EmptyChatState />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
