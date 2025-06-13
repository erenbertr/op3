"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Square, RotateCcw, AlertCircle, Brain, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { Personality } from '@/lib/api';

interface StreamingMessageProps {
    content: string;
    isStreaming: boolean;
    hasError: boolean;
    errorMessage?: string;
    canStop: boolean;
    canRetry: boolean;
    onStop?: () => void;
    onRetry?: () => void;
    className?: string;
    // New props for provider/personality info
    personality?: Personality;
    // New prop for search pending state
    isSearchPending?: boolean;
}

export function StreamingMessage({
    content,
    isStreaming,
    hasError,
    errorMessage,
    canStop,
    canRetry,
    onStop,
    onRetry,
    className,
    personality,
    isSearchPending = false
}: StreamingMessageProps) {
    const [showCursor, setShowCursor] = useState(true);
    const contentRef = useRef<HTMLDivElement>(null);

    // Cursor blinking effect
    useEffect(() => {
        if (!isStreaming || hasError) {
            setShowCursor(false);
            return;
        }

        const interval = setInterval(() => {
            setShowCursor(prev => !prev);
        }, 500);

        return () => clearInterval(interval);
    }, [isStreaming, hasError]);

    // Note: Auto-scroll is now handled centrally in chat-session.tsx
    // This prevents conflicting scroll behaviors and ensures consistent UX

    const renderContent = () => {
        if (!content && !hasError) {
            // No loading indicators - just empty space to prevent layout shift
            return (
                <div className="min-h-[1.5rem]">
                    {/* Empty space to maintain layout */}
                </div>
            );
        }

        if (hasError) {
            return (
                <div className="space-y-3">
                    {content && (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                            <div
                                dangerouslySetInnerHTML={{
                                    __html: DOMPurify.sanitize(
                                        marked.parse(content, {
                                            breaks: true,
                                            gfm: true,
                                        }) as string,
                                        {
                                            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'code', 'pre', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span'],
                                            ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
                                            HOOKS: {
                                                afterSanitizeAttributes: function (node) {
                                                    // Add target="_blank" and rel="noopener noreferrer" to all links
                                                    if (node.tagName === 'A' && node.hasAttribute('href')) {
                                                        node.setAttribute('target', '_blank');
                                                        node.setAttribute('rel', 'noopener noreferrer');
                                                    }
                                                }
                                            }
                                        }
                                    )
                                }}
                            />
                        </div>
                    )}
                    <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
                        <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                        <span className="text-sm text-destructive flex-1">{errorMessage || 'Stream interrupted'}</span>
                        {canRetry && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onRetry}
                                className="h-7 px-2 text-xs"
                            >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Try Again
                            </Button>
                        )}
                    </div>
                </div>
            );
        }

        // Show actual content with cursor when streaming
        const contentWithCursor = content + (showCursor && isStreaming ? '<span class="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5"></span>' : '');

        return (
            <div className="prose prose-sm max-w-none dark:prose-invert">
                <div
                    ref={contentRef}
                    dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(
                            marked.parse(contentWithCursor, {
                                breaks: true,
                                gfm: true,
                            }) as string,
                            {
                                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'code', 'pre', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span'],
                                ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
                                HOOKS: {
                                    afterSanitizeAttributes: function (node) {
                                        // Add target="_blank" and rel="noopener noreferrer" to all links
                                        if (node.tagName === 'A' && node.hasAttribute('href')) {
                                            node.setAttribute('target', '_blank');
                                            node.setAttribute('rel', 'noopener noreferrer');
                                        }
                                    }
                                }
                            }
                        )
                    }}
                />
            </div>
        );
    };

    return (
        <div className={cn("relative group pb-4 mb-4", className)}>
            {/* Message content */}
            <div className="space-y-2">
                {/* Status/Header area - maintain consistent spacing with regular messages */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 h-4">
                    {/* Show badges for AI messages with personality info */}
                    {personality ? (
                        <>

                            {/* Personality badge */}
                            {personality && (
                                <Badge variant="secondary" className="text-xs">
                                    <Brain className="h-3 w-3" />
                                    {personality.title}
                                </Badge>
                            )}

                            {/* Stop button positioned right after badges - only show when streaming */}
                            {canStop && isStreaming && !hasError && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onStop}
                                    className={cn(
                                        "h-6 w-6 p-0 transition-colors ml-1",
                                        "hover:bg-destructive/20 dark:hover:bg-red-900/30",
                                        "hover:text-destructive dark:hover:text-red-400"
                                    )}
                                >
                                    <Square className="h-3 w-3" />
                                </Button>
                            )}
                        </>
                    ) : (
                        /* Empty space to maintain consistent height */
                        <div></div>
                    )}
                </div>

                {/* Message content */}
                <div className="p-3 rounded-lg min-h-[2rem]">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}
