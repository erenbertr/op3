"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Square, RotateCcw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

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
    className
}: StreamingMessageProps) {
    const [displayedContent, setDisplayedContent] = useState('');
    const [showCursor, setShowCursor] = useState(true);
    const contentRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number>();
    const lastContentLength = useRef(0);

    // Enhanced typewriter animation
    useEffect(() => {
        if (!isStreaming || hasError) {
            setDisplayedContent(content);
            setShowCursor(false);
            return;
        }

        if (content.length <= lastContentLength.current) {
            return;
        }

        const newChars = content.slice(lastContentLength.current);
        let charIndex = 0;

        const animateChars = () => {
            if (charIndex < newChars.length) {
                setDisplayedContent(prev => prev + newChars[charIndex]);
                charIndex++;
                
                // Variable speed based on character type
                const char = newChars[charIndex - 1];
                let delay = 30; // Base delay
                
                if (char === ' ') delay = 15; // Faster for spaces
                else if (char === '\n') delay = 50; // Slower for line breaks
                else if (/[.!?]/.test(char)) delay = 100; // Slower for sentence endings
                
                animationRef.current = setTimeout(animateChars, delay);
            }
        };

        animateChars();
        lastContentLength.current = content.length;

        return () => {
            if (animationRef.current) {
                clearTimeout(animationRef.current);
            }
        };
    }, [content, isStreaming, hasError]);

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

    // Auto-scroll to bottom when content updates
    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [displayedContent]);

    const renderContent = () => {
        if (!displayedContent && !hasError) {
            return (
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-xs text-muted-foreground">thinking...</span>
                </div>
            );
        }

        if (hasError) {
            return (
                <div className="space-y-3">
                    {displayedContent && (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                            <div
                                dangerouslySetInnerHTML={{
                                    __html: DOMPurify.sanitize(
                                        marked.parse(displayedContent, {
                                            breaks: true,
                                            gfm: true,
                                        }) as string,
                                        {
                                            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'code', 'pre', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span'],
                                            ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
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

        const contentWithCursor = displayedContent + (showCursor && isStreaming ? '<span class="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5"></span>' : '');

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
                                ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
                            }
                        )
                    }}
                />
            </div>
        );
    };

    return (
        <div className={cn("relative pb-4 mb-4", className)}>
            <div className="space-y-2">
                {/* Status indicator with controls */}
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mb-2 h-6">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                            {isStreaming && !hasError && (
                                <div className="w-1 h-1 bg-primary rounded-full animate-pulse"></div>
                            )}
                            <span>
                                {hasError ? 'Error' : isStreaming ? (displayedContent ? 'typing...' : 'thinking...') : 'completed'}
                            </span>
                        </div>
                    </div>
                    
                    {/* Stream controls */}
                    {(canStop || canRetry) && (
                        <div className="flex items-center gap-1">
                            {canStop && isStreaming && !hasError && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onStop}
                                    className="h-6 px-2 text-xs hover:bg-destructive/10 hover:text-destructive"
                                >
                                    <Square className="h-3 w-3 mr-1" />
                                    Stop
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {/* Message content area */}
                <div className="p-3 rounded-lg min-h-[2rem]">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}
