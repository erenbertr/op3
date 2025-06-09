"use client"

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChatSidebar } from './chat-sidebar';
import { ChatSessionComponent, EmptyChatState } from './chat-session';
import { ChatSession } from '@/lib/api';

import { useChatSessions, usePersonalities, useAIProviders } from '@/lib/hooks/use-query-hooks';

interface StandardChatLayoutProps {
    workspaceId: string;
    userId: string;
    className?: string;
}

// Key for storing active session in localStorage
const ACTIVE_SESSION_KEY = 'op3_active_chat_session';

export function StandardChatLayout({ workspaceId, userId, className }: StandardChatLayoutProps) {
    const router = useRouter();
    const [activeSession, setActiveSession] = useState<ChatSession | null>(null);

    // Use TanStack Query for data fetching
    const { data: chatSessionsResult } = useChatSessions(userId, workspaceId);
    const { data: personalitiesResult } = usePersonalities(userId);
    const { data: aiProvidersResult } = useAIProviders();

    const chatSessions = chatSessionsResult?.sessions || [];
    const personalities = personalitiesResult?.personalities || [];
    const aiProviders = aiProvidersResult?.providers || [];



    // Save active session to localStorage
    const saveActiveSession = useCallback((session: ChatSession | null) => {
        try {
            if (session) {
                localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({
                    id: session.id,
                    userId: session.userId,
                    workspaceId: session.workspaceId,
                    title: session.title,
                    personalityId: session.personalityId,
                    aiProviderId: session.aiProviderId,
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

    // Restore active session from localStorage when chat sessions are loaded
    React.useMemo(() => {
        if (chatSessions.length > 0 && !activeSession) {
            try {
                const savedSessionStr = localStorage.getItem(ACTIVE_SESSION_KEY);
                if (savedSessionStr) {
                    const savedSession = JSON.parse(savedSessionStr);
                    const existingSession = chatSessions.find(s =>
                        s.id === savedSession.id &&
                        s.workspaceId === workspaceId &&
                        s.userId === userId
                    );
                    if (existingSession) {
                        setActiveSession(existingSession);
                    } else {
                        localStorage.removeItem(ACTIVE_SESSION_KEY);
                    }
                }
            } catch (error) {
                console.error('Error restoring active session from localStorage:', error);
                localStorage.removeItem(ACTIVE_SESSION_KEY);
            }
        }
    }, [chatSessions, activeSession, workspaceId, userId]);

    const handleNewChat = (session: ChatSession) => {
        router.push(`/ws/${workspaceId}/chat/${session.id}`);
    };

    const handleSessionSelect = useCallback((session: ChatSession) => {
        setActiveSession(session);
        saveActiveSession(session);
        router.push(`/ws/${workspaceId}/chat/${session.id}`);
    }, [workspaceId, router, saveActiveSession]);

    const handleSessionUpdate = useCallback((updatedSession: ChatSession) => {
        if (activeSession && activeSession.id === updatedSession.id) {
            setActiveSession(updatedSession);
            saveActiveSession(updatedSession);
        }
        // Note: TanStack Query will handle cache updates automatically
    }, [activeSession, saveActiveSession]);



    return (
        <div className={`h-full ${className || ''}`}>
            <div className="container mx-auto h-full px-4">
                <div className="flex h-full">
                    {/* Sidebar */}
                    <div className="w-80 border-r bg-muted/30">
                        <ChatSidebar
                            userId={userId}
                            workspaceId={workspaceId}
                            onNewChat={handleNewChat}
                            onChatSelect={handleSessionSelect}
                            activeChatId={activeSession?.id}
                            chatSessions={chatSessions}
                        />
                    </div>

                    {/* Main chat area */}
                    <div className="flex-1 flex flex-col">
                        {activeSession ? (
                            <ChatSessionComponent
                                key={activeSession.id}
                                session={activeSession}
                                personalities={personalities}
                                aiProviders={aiProviders}
                                onSessionUpdate={handleSessionUpdate}
                                userId={userId}
                                className="h-full"
                            />
                        ) : (
                            <EmptyChatState />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
