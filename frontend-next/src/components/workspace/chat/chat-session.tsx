"use client"

import React, { useState, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatInput } from './chat-input';
import { ChatMessageList } from './chat-message';
import { StreamingMessage } from './streaming-message';
import { SearchIndicator } from './search-indicator';
// Removed ChatMessagesSkeleton import - using simple spinner instead
import { apiClient, ChatMessage, ChatSession, Personality, StreamingState, StreamingCallbacks } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { truncateText } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';



interface ChatSessionProps {
    session: ChatSession;
    personalities: Personality[];
    onSessionUpdate?: (session: ChatSession) => void;
    className?: string;
    userId: string;
    autoFocusInput?: boolean;
    workspaceId?: string;
}

export function ChatSessionComponent({
    session,
    personalities,
    onSessionUpdate,
    className,
    userId,
    autoFocusInput = false,
    workspaceId
}: ChatSessionProps) {
    const router = useRouter();
    // Simple message state - always managed manually
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);



    // Load messages from server when session changes
    React.useEffect(() => {
        if (session?.id) {
            console.log('🔄 Loading messages for session:', session.id);
            setIsLoadingMessages(true);

            apiClient.getChatMessages(session.id)
                .then(result => {
                    if (result.success) {
                        console.log('📥 Loaded messages from server:', result.messages.length);
                        setMessages(result.messages);
                        // Reset scroll tracking for new session
                        setLastMessageCount(result.messages.length);
                        // Messages will trigger spacer update via useEffect
                    } else {
                        console.log('📝 No messages found, starting fresh');
                        setMessages([]);
                        setLastMessageCount(0);
                    }
                })
                .catch(error => {
                    console.error('❌ Error loading messages:', error);
                    setMessages([]);
                    setLastMessageCount(0);
                })
                .finally(() => {
                    setIsLoadingMessages(false);
                });
        }
    }, [session?.id]);

    const [isLoading, setIsLoading] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState<string>('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingState, setStreamingState] = useState<StreamingState>({
        isStreaming: false,
        canStop: false,
        hasError: false,
        isRetrying: false
    });
    const [abortController, setAbortController] = useState<AbortController | null>(null);
    // Store current streaming provider/personality for immediate display
    const [currentStreamingPersonalityId, setCurrentStreamingPersonalityId] = useState<string | undefined>();
    const [currentStreamingAIProviderId, setCurrentStreamingAIProviderId] = useState<string | undefined>();

    // Search state
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearchPending, setIsSearchPending] = useState(false); // New state for pre-streaming search loading

    // Reasoning state
    const [currentReasoningEnabled, setCurrentReasoningEnabled] = useState(false);
    const [reasoningSteps, setReasoningSteps] = useState<string[]>([]);
    const [isReasoning, setIsReasoning] = useState(false);

    // Current search enabled state for streaming
    const [currentSearchEnabled, setCurrentSearchEnabled] = useState(false);

    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const { addToast } = useToast();

    // Clean up state when session changes
    React.useEffect(() => {
        // Only reset if session actually changed (not just component re-mount)
        const currentSessionId = session?.id;
        console.log('🔄 Session effect triggered for:', currentSessionId);

        // Don't clear state if it's the same session
        if (currentSessionId) {
            // Reset streaming states but preserve messages for same session
            setIsLoading(false);
            setStreamingMessage('');
            setIsStreaming(false);
            setStreamingState({
                isStreaming: false,
                canStop: false,
                hasError: false,
                isRetrying: false
            });
            // Clear current streaming provider/personality
            setCurrentStreamingPersonalityId(undefined);
            setCurrentStreamingAIProviderId(undefined);
            // Clear search states
            setIsSearchPending(false);
            setIsSearching(false);
            setSearchQuery('');
            setSearchResults([]);

            // Clear reasoning states
            setCurrentReasoningEnabled(false);
            setReasoningSteps([]);
            setIsReasoning(false);

            // Clear search enabled state
            setCurrentSearchEnabled(false);

            console.log('🔄 Session changed to:', currentSessionId);
        }
    }, [session?.id]);

    // Cleanup effect for component unmount
    React.useEffect(() => {
        return () => {
            // Cancel any ongoing streaming when component unmounts
            if (abortController) {
                abortController.abort();
            }
        };
    }, [abortController]);

    // Debug logging
    React.useEffect(() => {
        console.log('📨 Messages data updated:', {
            messagesCount: messages.length,
            sessionId: session?.id,
            isLoading: isLoadingMessages,
            isStreaming,
            timestamp: new Date().toISOString()
        });

        // Log individual messages for debugging
        if (messages.length > 0) {
            console.log('📝 Current messages in state:', messages.map(m => ({
                id: m.id,
                role: m.role,
                content: m.content.substring(0, 50) + '...'
            })));
        }
    }, [messages.length, session?.id, isLoadingMessages, isStreaming]);

    // State to track scroll behavior
    const [lastMessageCount, setLastMessageCount] = useState(0);
    const [isUserScrolling, setIsUserScrolling] = useState(false);
    const [isMessagesVisible, setIsMessagesVisible] = useState(false);

    // Function to calculate and update spacer height with proper timing
    const updateSpacerHeight = React.useCallback((isNewMessage = false, skipScroll = false) => {
        if (!scrollAreaRef.current || isUserScrolling) return;

        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        const spacerElement = scrollContainer?.querySelector('#chat-spacer');

        if (!scrollContainer || !spacerElement) {
            console.log('📍 Missing elements for spacer calculation');
            return;
        }

        // Wait for DOM to be fully rendered
        requestAnimationFrame(() => {
            const containerHeight = scrollContainer.clientHeight;
            let contentHeight = 0;

            if (isStreaming) {
                // During streaming: calculate user message + streaming content height
                const messageElements = scrollContainer.querySelectorAll('[data-message-item]');
                const lastTwoElements = Array.from(messageElements).slice(-2); // User message + streaming message

                contentHeight = lastTwoElements.reduce((total, element) => {
                    return total + (element as HTMLElement).offsetHeight;
                }, 0);

                console.log('📍 Streaming mode - calculating spacer for last 2 messages:', {
                    containerHeight,
                    contentHeight,
                    elementsCount: lastTwoElements.length
                });
            } else {
                // Not streaming: calculate based on last user + AI message pair only
                const messageElements = scrollContainer.querySelectorAll('[data-message-item]');

                if (messageElements.length > 0) {
                    // Always use only the last 2 messages (user + AI pair) for old chats
                    const lastTwoElements = Array.from(messageElements).slice(-2);
                    contentHeight = lastTwoElements.reduce((total, element) => {
                        return total + (element as HTMLElement).offsetHeight;
                    }, 0);

                    console.log('📍 Static mode - calculating spacer for last message pair:', {
                        containerHeight,
                        contentHeight,
                        totalMessages: messages.length,
                        elementsUsed: lastTwoElements.length
                    });
                } else {
                    contentHeight = 0;
                }
            }

            // Calculate spacer height (ensure content fits in viewport)
            // Account for existing padding: py-4 (16px) + p-4 (16px) = 32px + additional 32px buffer = 64px total
            const spacerHeight = Math.max(0, containerHeight - contentHeight - 64); // Total padding to prevent cutoff

            console.log('📍 Spacer calculation result:', {
                containerHeight,
                contentHeight,
                spacerHeight,
                isStreaming
            });

            // Update spacer height
            if (!isNewMessage) {
                // For initial loads: disable transition for instant positioning
                const originalTransition = spacerElement.style.transition;
                spacerElement.style.transition = 'none';
                spacerElement.style.height = `${spacerHeight}px`;
                // Force reflow to apply the change immediately
                spacerElement.offsetHeight;
                // Restore transition for future updates
                spacerElement.style.transition = originalTransition;
            } else {
                // For new messages: keep smooth transition
                spacerElement.style.height = `${spacerHeight}px`;
            }

            // Only scroll if not skipping scroll (for post-streaming spacer updates)
            if (!skipScroll) {
                // Wait for spacer transition to complete, then scroll
                const scrollDelay = isNewMessage ? 350 : 50; // Wait for 0.3s spacer transition + buffer
                setTimeout(() => {
                    // Ensure we have the latest scroll height after spacer is applied
                    requestAnimationFrame(() => {
                        if (isNewMessage) {
                            // For new messages: use smooth scrolling
                            scrollContainer.scrollTo({
                                top: scrollContainer.scrollHeight,
                                behavior: 'smooth'
                            });
                            console.log('📍 Smooth scroll for new message');

                            // Show messages immediately for new messages (already visible)
                            setIsMessagesVisible(true);
                        } else {
                            // For initial chat loads: completely disable any scroll behavior
                            // Force instant positioning without any animation
                            const targetScrollTop = scrollContainer.scrollHeight - scrollContainer.clientHeight;

                            // Disable smooth scrolling temporarily
                            const originalScrollBehavior = scrollContainer.style.scrollBehavior;
                            scrollContainer.style.scrollBehavior = 'auto';

                            // Set scroll position instantly
                            scrollContainer.scrollTop = Math.max(0, targetScrollTop);

                            // Restore original scroll behavior
                            scrollContainer.style.scrollBehavior = originalScrollBehavior;

                            console.log('📍 Instant scroll for chat load (forced)');

                            // Show messages with fade-in animation after instant positioning
                            setTimeout(() => {
                                setIsMessagesVisible(true);
                                console.log('✨ Messages now visible with fade-in animation');
                            }, 10); // Very small delay for instant positioning
                        }

                        console.log('📍 Scroll completed:', {
                            scrollHeight: scrollContainer.scrollHeight,
                            scrollTop: scrollContainer.scrollTop,
                            spacerHeight,
                            containerHeight,
                            contentHeight,
                            isNewMessage
                        });
                    });
                }, scrollDelay);
            } else {
                console.log('📍 Spacer updated without scrolling (post-streaming)');
            }
        }); // End of requestAnimationFrame

    }, [isStreaming, messages.length, isUserScrolling]);

    // Track when new messages are added or streaming state changes
    React.useEffect(() => {
        const currentMessageCount = messages.length + (isStreaming ? 1 : 0);

        console.log('🔍 Message/streaming state change:', {
            currentMessageCount,
            lastMessageCount,
            messagesLength: messages.length,
            isStreaming,
            shouldUpdate: currentMessageCount !== lastMessageCount
        });

        // Update spacer when message count changes or streaming state changes
        if (currentMessageCount !== lastMessageCount) {
            console.log('✅ Updating spacer due to message/streaming change');
            // For new messages, keep them visible during streaming
            if (isStreaming || currentMessageCount > 0) {
                setIsMessagesVisible(true);
            }
            // Pass true for new messages (smooth scroll)
            const isNewMessage = currentMessageCount > lastMessageCount;
            updateSpacerHeight(isNewMessage);
        }

        setLastMessageCount(currentMessageCount);
    }, [messages.length, isStreaming, lastMessageCount, updateSpacerHeight]);

    // REMOVED: Update spacer during streaming to prevent content jumping
    // The spacer will be recalculated only after streaming completes

    // Hide messages when session changes
    React.useEffect(() => {
        if (session?.id) {
            setIsMessagesVisible(false);
            console.log('🙈 Messages hidden for new session:', session.id);
        }
    }, [session?.id]);

    // Initial spacer setup when session loads
    React.useEffect(() => {
        if (session?.id && !isLoadingMessages && messages.length > 0) {
            // Longer delay to ensure DOM is fully ready and content is rendered
            setTimeout(() => {
                console.log('📍 Initial spacer setup for session:', session.id);
                updateSpacerHeight(false); // Initial load = instant scroll, no animation
            }, 500); // Increased delay for initial load
        }
    }, [session?.id, isLoadingMessages, messages.length, updateSpacerHeight]);

    // Handle user scroll events to detect manual scrolling
    React.useEffect(() => {
        const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (!scrollContainer) return;

        let scrollTimeout: NodeJS.Timeout;

        const handleScroll = () => {
            setIsUserScrolling(true);

            // Reset spacer when user manually scrolls up (not when auto-scrolling down)
            const spacerElement = scrollContainer.querySelector('#chat-spacer');
            const isScrolledToBottom = scrollContainer.scrollTop >= scrollContainer.scrollHeight - scrollContainer.clientHeight - 50;

            if (spacerElement && spacerElement.style.height !== '0px' && !isScrolledToBottom) {
                spacerElement.style.height = '0px';
                console.log('📍 Reset spacer due to manual scroll up');
            }

            // Clear existing timeout
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }

            // Reset user scrolling flag after scroll ends
            scrollTimeout = setTimeout(() => {
                setIsUserScrolling(false);
                // Re-apply spacer if user is back at bottom
                if (isScrolledToBottom) {
                    setTimeout(() => updateSpacerHeight(), 100);
                }
            }, 300);
        };

        scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            scrollContainer.removeEventListener('scroll', handleScroll);
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
        };
    }, []);





    // TanStack Query handles loading messages automatically

    const handleRetryMessage = async (messageId: string) => {
        // Find the message to retry
        const messageToRetry = messages.find(msg => msg.id === messageId);
        if (!messageToRetry) {
            console.warn('Message not found for retry:', messageId);
            return;
        }

        // If it's a user message, resend it
        if (messageToRetry.role === 'user') {
            await handleSendMessage(
                messageToRetry.content,
                messageToRetry.personalityId,
                messageToRetry.aiProviderId
            );
        } else {
            // For AI messages, find the previous user message and resend it
            const messageIndex = messages.findIndex(msg => msg.id === messageId);
            if (messageIndex > 0) {
                const previousUserMessage = messages[messageIndex - 1];
                if (previousUserMessage.role === 'user') {
                    await handleSendMessage(
                        previousUserMessage.content,
                        previousUserMessage.personalityId,
                        previousUserMessage.aiProviderId
                    );
                }
            }
        }
    };

    const handleSettingsChange = async (personalityId?: string, aiProviderId?: string) => {
        if (!session?.id) return;

        try {
            const result = await apiClient.updateChatSessionSettings(session.id, {
                lastUsedPersonalityId: personalityId,
                lastUsedAIProviderId: aiProviderId
            });

            if (result.success && result.session) {
                // Update the session in parent component
                onSessionUpdate?.(result.session);
            }
        } catch (error) {
            console.error('Error updating session settings:', error);
            addToast({
                title: "Error",
                description: "Failed to save session preferences",
                variant: "destructive"
            });
        }
    };

    const handleSendMessage = async (
        content: string,
        personalityId?: string,
        aiProviderId?: string,
        searchEnabled?: boolean,
        reasoningEnabled?: boolean,
        fileAttachments?: string[],
        attachmentData?: FileAttachment[]
    ) => {
        if (!content?.trim()) {
            console.warn('Empty message content provided');
            return;
        }

        if (!session?.id) {
            addToast({
                title: "Error",
                description: "No active chat session. Please create a new chat.",
                variant: "destructive"
            });
            return;
        }

        // Create and immediately show user message
        const userMessage: ChatMessage = {
            id: crypto.randomUUID(),
            sessionId: session.id,
            content: content.trim(),
            role: 'user',
            personalityId,
            aiProviderId,
            createdAt: new Date().toISOString(),
            fileAttachments,
            attachmentData // Store the attachment data for display
        };

        // Immediately add user message to state
        setMessages(prev => [...prev, userMessage]);
        console.log('📝 Added user message to state');

        // Set search pending state if search is enabled
        if (searchEnabled) {
            setIsSearchPending(true);
            setCurrentSearchEnabled(true);
        } else {
            setCurrentSearchEnabled(false);
        }

        // Set reasoning state if reasoning is enabled
        if (reasoningEnabled) {
            setCurrentReasoningEnabled(true);
            setIsReasoning(true);
            setReasoningSteps([]);
        } else {
            setCurrentReasoningEnabled(false);
        }

        // First, position the user message at the top with smooth animation
        // Wait for the positioning to complete before starting streaming
        setTimeout(async () => {
            setIsLoading(true);
            setIsStreaming(true);
            setStreamingMessage('');

            // Store current streaming provider/personality for immediate display
            setCurrentStreamingPersonalityId(personalityId);
            setCurrentStreamingAIProviderId(aiProviderId);

            // Create abort controller for this request
            const controller = new AbortController();
            setAbortController(controller);

            // Update streaming state
            setStreamingState({
                isStreaming: true,
                canStop: true,
                hasError: false,
                isRetrying: false
            });

            const callbacks: StreamingCallbacks = {
                onChunk: (chunk) => {
                    // Handle streaming chunks
                    if (chunk.type === 'chunk' && chunk.content) {
                        setStreamingMessage(prev => prev + chunk.content);
                        // Clear search pending state when first chunk arrives (streaming has started)
                        setIsSearchPending(false);
                        // Clear reasoning state when content starts streaming
                        setIsReasoning(false);
                    }
                    // Handle reasoning steps (if the backend sends them)
                    if (chunk.type === 'reasoning_step' && chunk.content) {
                        setReasoningSteps(prev => [...prev, chunk.content]);
                    }
                },
                onSearchStart: (query) => {
                    console.log('🔍 Search started:', query);
                    setIsSearchPending(false); // Clear pending state when search actually starts
                    setIsSearching(true);
                    setSearchQuery(query);
                    setSearchResults([]);
                },
                onSearchResults: (query, results) => {
                    console.log('🔍 Search results:', { query, results });
                    setIsSearching(false);
                    setSearchQuery(query);
                    setSearchResults(results || []);
                },
                onComplete: (aiMessage) => {
                    // Handle completion - add AI message to state
                    console.log('🔄 Streaming completed:', {
                        aiMessage,
                        sessionId: session.id
                    });

                    if (aiMessage) {
                        // Add AI message to state
                        setMessages(prev => [...prev, aiMessage]);
                        console.log('📝 Added AI message to state');
                    }

                    // Clear states after completion
                    setStreamingMessage('');
                    setIsStreaming(false);
                    setIsLoading(false);
                    setStreamingState({
                        isStreaming: false,
                        canStop: false,
                        hasError: false,
                        isRetrying: false
                    });
                    // Clear current streaming provider/personality
                    setCurrentStreamingPersonalityId(undefined);
                    setCurrentStreamingAIProviderId(undefined);
                    setAbortController(null);

                    // Clear search state
                    setIsSearching(false);
                    setSearchQuery('');
                    setSearchResults([]);
                    setIsSearchPending(false);

                    // Clear reasoning state
                    setCurrentReasoningEnabled(false);
                    setReasoningSteps([]);
                    setIsReasoning(false);

                    // Clear search enabled state
                    setCurrentSearchEnabled(false);

                    // Recalculate spacer height after streaming completes (without scrolling)
                    setTimeout(() => {
                        updateSpacerHeight(false, true); // skipScroll = true
                    }, 100);

                    // Update session with last used settings and title if needed
                    const updates: any = {};

                    console.log('🔍 Checking session updates:', {
                        personalityId,
                        aiProviderId,
                        currentPersonality: session?.lastUsedPersonalityId,
                        currentProvider: session?.lastUsedAIProviderId,
                        messagesLength: messages.length,
                        sessionTitle: session?.title
                    });

                    // Update last used provider and personality
                    if (personalityId && personalityId !== session?.lastUsedPersonalityId) {
                        updates.lastUsedPersonalityId = personalityId;
                        console.log('📝 Will update personality:', personalityId);
                    }
                    if (aiProviderId && aiProviderId !== session?.lastUsedAIProviderId) {
                        updates.lastUsedAIProviderId = aiProviderId;
                        console.log('📝 Will update AI provider:', aiProviderId);
                    }

                    // Update session title if this is the first message and title is "New Chat"
                    if (messages.length === 0 && session?.title === 'New Chat') {
                        updates.title = truncateText(content, 50);
                        console.log('📝 Will update title:', updates.title);
                    }

                    // Apply updates if any
                    if (Object.keys(updates).length > 0) {
                        console.log('📝 Updating session with:', updates);
                        apiClient.updateChatSession(session.id, updates).then(updateResult => {
                            if (updateResult.success && updateResult.session && onSessionUpdate) {
                                console.log('✅ Session updated successfully:', updateResult.session);
                                onSessionUpdate(updateResult.session);
                            }
                        }).catch(error => {
                            console.error('❌ Error updating session:', error);
                        });
                    } else {
                        console.log('ℹ️ No session updates needed');
                    }
                },
                onError: (error) => {
                    console.error('Streaming error:', error);
                    setStreamingState({
                        isStreaming: false,
                        canStop: false,
                        hasError: true,
                        errorMessage: error,
                        isRetrying: false
                    });
                    setStreamingMessage('');
                    setIsStreaming(false);
                    setIsLoading(false);
                    setAbortController(null);
                    // Clear current streaming provider/personality
                    setCurrentStreamingPersonalityId(undefined);
                    setCurrentStreamingAIProviderId(undefined);
                    // Clear search states
                    setIsSearchPending(false);

                    addToast({
                        title: "Error",
                        description: error || "Failed to send message",
                        variant: "destructive"
                    });
                },
                onStop: () => {
                    console.log('🛑 Streaming stopped by user');
                    setStreamingState({
                        isStreaming: false,
                        canStop: false,
                        hasError: false,
                        isRetrying: false
                    });
                    setIsStreaming(false);
                    setIsLoading(false);
                    setAbortController(null);
                    // Clear current streaming provider/personality
                    setCurrentStreamingPersonalityId(undefined);
                    setCurrentStreamingAIProviderId(undefined);
                    setIsSearchPending(false);
                }
            };

            try {
                await apiClient.streamChatMessage(
                    session.id,
                    {
                        content: content.trim(),
                        personalityId,
                        aiProviderId,
                        userId,
                        searchEnabled,
                        reasoningEnabled,
                        fileAttachments
                    },
                    callbacks,
                    controller
                );
            } catch (error) {
                console.error('Error sending message:', error);
                setStreamingState({
                    isStreaming: false,
                    canStop: false,
                    hasError: true,
                    errorMessage: "Failed to send message. Please try again.",
                    isRetrying: false
                });
                setStreamingMessage('');
                setIsStreaming(false);
                setIsLoading(false);
                setAbortController(null);
                // Clear current streaming provider/personality
                setCurrentStreamingPersonalityId(undefined);
                setCurrentStreamingAIProviderId(undefined);
                setIsSearchPending(false);

                addToast({
                    title: "Error",
                    description: "Failed to send message. Please try again.",
                    variant: "destructive"
                });
            }
        }, 500); // End of setTimeout - delay streaming start to allow positioning animation
    };

    // Interrupt streaming function (for new messages during streaming)
    const handleInterruptStreaming = () => {
        console.log('🔄 Interrupting streaming for new message...');

        if (abortController) {
            abortController.abort();
        }

        // Save the partial message if there's content (same as stop function)
        if (streamingMessage.trim()) {
            try {
                const partialMessage: ChatMessage = {
                    id: crypto.randomUUID(),
                    sessionId: session.id,
                    content: streamingMessage.trim(),
                    role: 'assistant',
                    personalityId: currentStreamingPersonalityId,
                    aiProviderId: currentStreamingAIProviderId,
                    createdAt: new Date().toISOString(),
                    isPartial: true // Mark as partial message
                };

                // Add to local state immediately to prevent flashing
                setMessages(prev => [...prev, partialMessage]);
                console.log('💾 Added partial message to state (interrupted):', partialMessage);

                // Save to database in background
                apiClient.saveChatMessage(partialMessage).catch(error => {
                    console.error('Error saving partial message:', error);
                });
            } catch (error) {
                console.error('Error creating partial message:', error);
            }
        }

        // Reset streaming states immediately
        setIsStreaming(false);
        setIsLoading(false);
        setStreamingMessage('');
        setStreamingState({
            isStreaming: false,
            canStop: false,
            hasError: false,
            isRetrying: false
        });
        setAbortController(null);
        setCurrentStreamingPersonalityId(undefined);
        setCurrentStreamingAIProviderId(undefined);
        setIsSearchPending(false);
    };

    // Stop streaming function
    const handleStopStreaming = async () => {
        console.log('🛑 Stopping streaming...');

        if (abortController) {
            abortController.abort();
        }

        // Save the partial message if there's content
        if (streamingMessage.trim()) {
            try {
                const partialMessage: ChatMessage = {
                    id: crypto.randomUUID(),
                    sessionId: session.id,
                    content: streamingMessage.trim(),
                    role: 'assistant',
                    personalityId: currentStreamingPersonalityId,
                    aiProviderId: currentStreamingAIProviderId,
                    createdAt: new Date().toISOString(),
                    isPartial: true // Mark as partial message
                };

                // Add to local state immediately to prevent flashing
                setMessages(prev => [...prev, partialMessage]);
                console.log('💾 Added partial message to state:', partialMessage);

                // Save to database in background
                apiClient.saveChatMessage(partialMessage).catch(error => {
                    console.error('Error saving partial message:', error);
                });
            } catch (error) {
                console.error('Error creating partial message:', error);
            }
        }

        // Update streaming state to show continue option
        setStreamingState({
            isStreaming: false,
            canStop: false,
            hasError: false,
            isRetrying: false,
            partialContent: streamingMessage.trim()
        });

        setIsStreaming(false);
        setIsLoading(false);
        setStreamingMessage('');
        setIsSearchPending(false);
        // Keep current streaming provider/personality for continue option
    };

    // Continue from partial message
    const handleContinueMessage = async (messageId: string) => {
        console.log('🔄 Continuing message:', messageId);

        // Find the partial message
        const partialMessage = messages.find(m => m.id === messageId && m.isPartial);
        if (!partialMessage) {
            console.error('Partial message not found');
            return;
        }

        // Start streaming from where we left off
        setIsLoading(true);
        setIsStreaming(true);
        setStreamingMessage(partialMessage.content); // Start with existing content

        // Store current streaming provider/personality
        setCurrentStreamingPersonalityId(partialMessage.personalityId);
        setCurrentStreamingAIProviderId(partialMessage.aiProviderId);

        // Create abort controller for this request
        const controller = new AbortController();
        setAbortController(controller);

        // Update streaming state
        setStreamingState({
            isStreaming: true,
            canStop: true,
            hasError: false,
            isRetrying: false
        });

        // Don't remove the partial message - keep it visible during streaming

        try {
            // Continue the conversation with a hidden prompt to continue from where we left off
            const continuePrompt = `Please continue from where you left off. Here's what you were saying: "${partialMessage.content}"`;

            // We need to send this as a system message or handle it differently
            // For now, let's use a special flag to indicate this is a continuation
            await apiClient.streamChatMessage(
                session.id,
                {
                    content: continuePrompt,
                    personalityId: partialMessage.personalityId,
                    aiProviderId: partialMessage.aiProviderId,
                    userId,
                    isContinuation: true // Add this flag to indicate it's a continuation
                },
                {
                    onChunk: (chunk) => {
                        if (chunk.type === 'chunk' && chunk.content) {
                            // Continue from existing content, don't replace it
                            setStreamingMessage(prev => prev + chunk.content);
                        }
                    },
                    onComplete: (aiMessage) => {
                        console.log('🔄 Continue completed:', aiMessage);
                        // Update the existing partial message to be complete
                        setMessages(prev => prev.map(msg =>
                            msg.id === messageId
                                ? { ...msg, content: streamingMessage, isPartial: false, updatedAt: new Date().toISOString() }
                                : msg
                        ));
                        setStreamingMessage('');
                        setIsStreaming(false);
                        setIsLoading(false);
                        setStreamingState({
                            isStreaming: false,
                            canStop: false,
                            hasError: false,
                            isRetrying: false
                        });
                    },
                    onError: (error) => {
                        console.error('Continue error:', error);
                        // Keep the partial message as is, just stop streaming
                        setStreamingState({
                            isStreaming: false,
                            canStop: false,
                            hasError: true,
                            errorMessage: error,
                            isRetrying: false
                        });
                        setStreamingMessage('');
                        setIsStreaming(false);
                        setIsLoading(false);
                    }
                },
                controller
            );
        } catch (error) {
            console.error('Error continuing message:', error);
            // Keep the partial message as is, just stop streaming
            setStreamingState({
                isStreaming: false,
                canStop: false,
                hasError: true,
                errorMessage: 'Failed to continue message',
                isRetrying: false
            });
            setStreamingMessage('');
            setIsStreaming(false);
            setIsLoading(false);
        }
    };

    // Branch conversation from a specific message
    const handleBranchMessage = async (messageId: string, aiProviderId: string) => {
        console.log('🌿 Branching conversation from message:', messageId, 'with provider:', aiProviderId);

        if (!workspaceId) {
            console.error('Workspace ID is required for branching');
            return;
        }

        try {
            // Find the message to branch from
            const branchMessage = messages.find(msg => msg.id === messageId);
            if (!branchMessage) {
                console.error('Message not found for branching:', messageId);
                return;
            }

            // Create a new branched chat session
            const branchTitle = `Branch from "${truncateText(branchMessage.content, 30)}"`;
            const branchResult = await apiClient.createBranchedChatSession({
                userId,
                workspaceId,
                title: branchTitle,
                parentSessionId: session.id,
                branchFromMessageId: messageId
            });

            if (branchResult.success && branchResult.session) {
                console.log('✅ Branch created successfully:', branchResult.session);

                // For user messages: auto-send to the selected AI provider
                if (branchMessage.role === 'user') {
                    // Navigate to the new chat and auto-send the message
                    router.push(`/ws/${workspaceId}/chat/${branchResult.session.id}`);

                    // Wait a bit for navigation, then send the message
                    setTimeout(async () => {
                        try {
                            await apiClient.streamChatMessage(
                                branchResult.session!.id,
                                {
                                    content: branchMessage.content,
                                    aiProviderId: aiProviderId,
                                    userId
                                },
                                {
                                    onChunk: () => { }, // Handle in the new chat session
                                    onComplete: () => { },
                                    onError: (error) => console.error('Branch auto-send error:', error)
                                }
                            );
                        } catch (error) {
                            console.error('Error auto-sending branch message:', error);
                        }
                    }, 500);
                } else {
                    // For AI messages: just navigate to the new chat with copied history
                    router.push(`/ws/${workspaceId}/chat/${branchResult.session.id}`);
                }
            } else {
                console.error('Failed to create branch:', branchResult.message);
            }
        } catch (error) {
            console.error('Error creating branch:', error);
        }
    };

    // Helper functions to get current streaming personality and AI provider
    const getCurrentStreamingPersonality = () => {
        const personalityId = currentStreamingPersonalityId;
        return personalityId && personalities ? personalities.find(p => p?.id === personalityId) : undefined;
    };

    const getCurrentStreamingAIProvider = () => {
        // Remove old provider lookup - now using model configs
        return undefined;
    };

    // Retry streaming function
    const handleRetryStreaming = () => {
        if (streamingState.hasError && streamingState.partialContent) {
            // Find the last user message and retry it
            const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');
            if (lastUserMessage) {
                handleSendMessage(
                    lastUserMessage.content,
                    lastUserMessage.personalityId,
                    lastUserMessage.aiProviderId
                );
            }
        }
    };

    return (
        <div className={`flex flex-col h-full ${className || ''}`}>
            {/* Messages area */}
            <div className="flex-1 overflow-hidden">
                {isLoadingMessages && messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted-foreground/20 border-t-muted-foreground/40"></div>
                    </div>
                ) : (
                    <ScrollArea ref={scrollAreaRef} className="h-full">
                        <div className="px-4 max-w-4xl mx-auto">
                            <div className={messages.length === 0 ? "pt-16 flex justify-center" : ""}>
                                <ChatMessageList
                                    messages={messages}
                                    personalities={personalities}
                                    pendingUserMessage={null}
                                    className={messages.length === 0 ? "" : "py-4"}
                                    onRetry={handleRetryMessage}
                                    onContinue={handleContinueMessage}
                                    onBranch={handleBranchMessage}
                                    isVisible={isMessagesVisible}
                                    streamingMessage={(isStreaming || streamingState.hasError) ? (
                                        <>
                                            {/* Search indicator */}
                                            {(isSearching || searchResults.length > 0) && (
                                                <div className="mb-4">
                                                    <SearchIndicator
                                                        isSearching={isSearching}
                                                        searchQuery={searchQuery}
                                                        searchResults={searchResults}
                                                    />
                                                </div>
                                            )}
                                            <StreamingMessage
                                                content={streamingMessage}
                                                isStreaming={isStreaming}
                                                hasError={streamingState.hasError}
                                                errorMessage={streamingState.errorMessage}
                                                canStop={streamingState.canStop && isStreaming}
                                                canRetry={streamingState.hasError && !streamingState.isRetrying}
                                                onStop={handleStopStreaming}
                                                onRetry={handleRetryStreaming}
                                                className=""
                                                // Pass current streaming personality
                                                personality={getCurrentStreamingPersonality()}
                                                // Pass current streaming AI provider ID
                                                aiProviderId={currentStreamingAIProviderId}
                                                // Pass search pending state
                                                isSearchPending={isSearchPending}
                                                // Pass reasoning state
                                                reasoningEnabled={currentReasoningEnabled}
                                                reasoningSteps={reasoningSteps}
                                                isReasoning={isReasoning}
                                                // Pass search state
                                                searchEnabled={currentSearchEnabled}
                                                isSearching={isSearching}
                                            />
                                        </>
                                    ) : null}
                                />
                            </div>
                        </div>
                    </ScrollArea>
                )}
            </div>

            {/* Input area - Fixed at bottom - ALWAYS the same component */}
            <div className="flex-shrink-0 border-t bg-background">
                <div className="px-4 py-4 max-w-4xl mx-auto">
                    <ChatInput
                        onSendMessage={handleSendMessage}
                        personalities={personalities}
                        isLoading={isLoading}
                        placeholder={messages.length === 0 ? "Start your conversation - Enter to send, Shift+Enter for new line" : undefined}
                        sessionPersonalityId={session?.lastUsedPersonalityId}
                        sessionAIProviderId={session?.lastUsedAIProviderId}
                        onSettingsChange={handleSettingsChange}
                        autoFocus={autoFocusInput}
                        onInterruptStreaming={handleInterruptStreaming}
                        sessionId={session?.id}
                        userId={userId}
                    />
                </div>
            </div>
        </div>
    );
}

interface EmptyChatStateProps {
    className?: string;
}

export function EmptyChatState({ className }: EmptyChatStateProps) {
    return (
        <div className={`pt-16 flex justify-center ${className || ''}`}>
            <div className="text-center space-y-6 max-w-md">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
                    <svg
                        className="w-8 h-8 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                    </svg>
                </div>

                <div className="space-y-2">
                    <h3 className="text-xl font-semibold">Start a conversation</h3>
                    <p className="text-muted-foreground">
                        Send a message to begin chatting with the AI assistant.
                    </p>
                </div>

                <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span>Choose from different AI personalities</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span>Select your preferred AI provider</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span>Enable search and file attachments</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
