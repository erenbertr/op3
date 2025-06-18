"use client"

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient, SharedMessage } from '@/lib/api';
import { Loader2, MessageSquare } from 'lucide-react';

export default function MessageSharePage() {
    const params = useParams();
    const shareId = params.shareId as string;
    const [sharedMessage, setSharedMessage] = useState<SharedMessage | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSharedMessage = async () => {
            if (!shareId) {
                setError('Invalid share link');
                setLoading(false);
                return;
            }

            try {
                const result = await apiClient.getSharedMessage(shareId);
                if (result.success && result.sharedMessage) {
                    setSharedMessage(result.sharedMessage);
                } else {
                    setError(result.message || 'Shared message not found');
                }
            } catch (err) {
                console.error('Error fetching shared message:', err);
                setError('Failed to load shared message');
            } finally {
                setLoading(false);
            }
        };

        fetchSharedMessage();
    }, [shareId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Loading shared message...</p>
                </div>
            </div>
        );
    }

    if (error || !sharedMessage) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center max-w-md mx-auto px-4">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h1 className="text-xl font-semibold mb-2">Message Not Found</h1>
                    <p className="text-muted-foreground mb-6">
                        {error || 'This shared message is no longer available or the link is invalid.'}
                    </p>
                    <div className="text-xs text-muted-foreground/60">
                        Powered by OP3
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <h1 className="text-lg font-semibold">Shared Message</h1>
                    <p className="text-sm text-muted-foreground">
                        {sharedMessage.role === 'user' ? 'User message' : 'AI response'} • 
                        Shared on {new Date(sharedMessage.createdAt).toLocaleDateString()}
                    </p>
                </div>
            </div>

            {/* Message Content */}
            <div className="max-w-4xl mx-auto px-4 py-6">
                <div className="space-y-6">
                    <div className="flex flex-col space-y-2">
                        {/* Message header */}
                        <div className="flex items-center space-x-2">
                            <div className={`text-sm font-medium ${
                                sharedMessage.role === 'user' 
                                    ? 'text-blue-600 dark:text-blue-400' 
                                    : 'text-green-600 dark:text-green-400'
                            }`}>
                                {sharedMessage.role === 'user' ? 'User' : 'Assistant'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {new Date(sharedMessage.createdAt).toLocaleString()}
                            </div>
                        </div>

                        {/* Message content */}
                        <div className={`rounded-lg p-4 ${
                            sharedMessage.role === 'user'
                                ? 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800'
                                : 'bg-muted border border-border'
                        }`}>
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                                <div className="whitespace-pre-wrap break-words">
                                    {sharedMessage.content}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-12 pt-8 border-t border-border text-center">
                    <div className="text-xs text-muted-foreground/60">
                        Powered by <span className="font-medium">OP3</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
