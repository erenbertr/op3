"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Square, RotateCcw, AlertCircle, Brain, Loader2, Bot, ChevronDown, ChevronUp, Search, SquareUserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Personality } from '@/lib/api';
import { useOpenAIModelConfigs } from '@/lib/hooks/use-query-hooks';
import ReactMarkdown, { Components } from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useTheme } from 'next-themes';
import 'katex/dist/katex.min.css';
import { useDelayedSpinner } from '@/lib/hooks/use-delayed-spinner';

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
    aiProviderId?: string;
    // New prop for search pending state
    isSearchPending?: boolean;
    // New props for reasoning
    reasoningEnabled?: boolean;
    reasoningSteps?: string[];
    isReasoning?: boolean;
    // New props for search
    searchEnabled?: boolean;
    isSearching?: boolean;
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
    aiProviderId,
    isSearchPending = false,
    reasoningEnabled = false,
    reasoningSteps = [],
    isReasoning = false,
    searchEnabled = false,
    isSearching = false
}: StreamingMessageProps) {
    const [showCursor, setShowCursor] = useState(true);
    const [showReasoningSteps, setShowReasoningSteps] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const { theme } = useTheme();

    // Use delayed spinner for provider badge loading animation
    const { showSpinner: showProviderBadgeLoading, startLoading: startProviderBadgeLoading, stopLoading: stopProviderBadgeLoading } = useDelayedSpinner(300); // Shorter delay for provider badge

    // Get OpenAI model configurations to resolve provider info
    const { data: openaiModelConfigs } = useOpenAIModelConfigs();
    const modelConfigs = openaiModelConfigs || [];

    // Get provider info from OpenAI model config
    const getProviderInfo = () => {
        if (aiProviderId && modelConfigs.length > 0) {
            const modelConfig = modelConfigs.find(config => config.id === aiProviderId);
            if (modelConfig) {
                return {
                    name: modelConfig.customName || modelConfig.modelName,
                    model: modelConfig.modelId
                };
            }
        }
        return null;
    };

    const providerInfo = getProviderInfo();

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

    // Manage provider badge loading animation
    useEffect(() => {
        if (isStreaming && !content) {
            // Start loading animation when streaming begins but no content yet
            startProviderBadgeLoading();
        } else {
            // Stop loading animation when content starts appearing or streaming stops
            stopProviderBadgeLoading();
        }
    }, [isStreaming, content, startProviderBadgeLoading, stopProviderBadgeLoading]);

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
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{
                                    a: (props: React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>) => (
                                        <a {...props} target="_blank" rel="noopener noreferrer" />
                                    ),
                                    code: ({ inline, className, children, ...props }: { inline?: boolean; className?: string; children: React.ReactNode;[key: string]: unknown }) => {
                                        const match = /language-(\w+)/.exec(className || '');
                                        if (!inline && match) {
                                            const codeString = String(children).replace(/\n$/, '');
                                            return (
                                                <div className="relative bg-background/50 rounded-md overflow-hidden">
                                                    <SyntaxHighlighter
                                                        style={theme === 'dark' ? vscDarkPlus : vs}
                                                        customStyle={{
                                                            margin: '0',
                                                            padding: '1em',
                                                            background: 'transparent',
                                                            fontSize: '0.875rem',
                                                            lineHeight: '1.5',
                                                            border: 'none',
                                                            borderTop: 'none',
                                                            borderBottom: 'none'
                                                        }}
                                                        language={match[1]}
                                                        PreTag="pre"
                                                        className="not-prose w-full"
                                                        codeTagProps={{ style: { background: 'transparent', padding: '0' } }}
                                                        {...props}
                                                    >
                                                        {codeString}
                                                    </SyntaxHighlighter>
                                                </div>
                                            );
                                        }
                                        return (
                                            <code className={className} {...props}>
                                                {children}
                                            </code>
                                        );
                                    }
                                } as Components}
                            >
                                {content}
                            </ReactMarkdown>
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
        return (
            <div className="prose prose-sm max-w-none dark:prose-invert">
                <div ref={contentRef}>
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                            a: (props: React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>) => (
                                <a {...props} target="_blank" rel="noopener noreferrer" />
                            ),
                            code: ({ inline, className, children, ...props }: { inline?: boolean; className?: string; children: React.ReactNode;[key: string]: unknown }) => {
                                const match = /language-(\w+)/.exec(className || '');
                                if (!inline && match) {
                                    const codeString = String(children).replace(/\n$/, '');
                                    return (
                                        <div className="relative bg-background/50 rounded-md overflow-hidden">
                                            <SyntaxHighlighter
                                                style={theme === 'dark' ? vscDarkPlus : vs}
                                                customStyle={{
                                                    margin: '0',
                                                    padding: '1em',
                                                    background: 'transparent',
                                                    fontSize: '0.875rem',
                                                    lineHeight: '1.5',
                                                    border: 'none',
                                                    borderTop: 'none',
                                                    borderBottom: 'none'
                                                }}
                                                language={match[1]}
                                                PreTag="pre"
                                                className="not-prose w-full"
                                                codeTagProps={{ style: { background: 'transparent', padding: '0' } }}
                                                {...props}
                                            >
                                                {codeString}
                                            </SyntaxHighlighter>
                                        </div>
                                    );
                                }
                                return (
                                    <code className={className} {...props}>
                                        {children}
                                    </code>
                                );
                            }
                        } as Components}
                    >
                        {content}
                    </ReactMarkdown>
                    {/* Cursor for streaming */}
                    {showCursor && isStreaming && (
                        <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5"></span>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={cn("relative group pb-4 mb-4", className)}>
            {/* Message content */}
            <div className="space-y-2">
                {/* Status/Header area - maintain consistent spacing with regular messages */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 h-4">
                    {/* Show badges for AI messages with personality, provider info, reasoning, or search */}
                    {(personality || providerInfo || reasoningEnabled || searchEnabled) ? (
                        <>
                            {/* Provider badge */}
                            {providerInfo && (
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "text-xs transition-all duration-300 relative",
                                        showProviderBadgeLoading && "provider-badge-loading"
                                    )}
                                >
                                    {showProviderBadgeLoading ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                        <Bot className="h-3 w-3" />
                                    )}
                                    {providerInfo.name}
                                    {showProviderBadgeLoading && (
                                        <span className="text-[10px] opacity-70 ml-1">•••</span>
                                    )}
                                </Badge>
                            )}

                            {/* Personality badge */}
                            {personality && (
                                <Badge variant="secondary" className="text-xs">
                                    <SquareUserRound className="h-3 w-3" />
                                    {personality.title}
                                </Badge>
                            )}

                            {/* Reasoning badge */}
                            {reasoningEnabled && (
                                <Badge variant="outline" className="text-xs border-blue-500 text-blue-600">
                                    <Brain className="h-3 w-3" />
                                    {isReasoning ? (
                                        <>
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            Thinking...
                                        </>
                                    ) : (
                                        'Reasoning'
                                    )}
                                </Badge>
                            )}

                            {/* Search badge */}
                            {searchEnabled && (
                                <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                                    <Search className="h-3 w-3" />
                                    {isSearching || isSearchPending ? (
                                        <>
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            Searching...
                                        </>
                                    ) : (
                                        'Search'
                                    )}
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

                {/* Reasoning steps - show when available */}
                {reasoningSteps.length > 0 && (
                    <div className="mb-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowReasoningSteps(!showReasoningSteps)}
                            className="h-6 text-xs text-muted-foreground hover:text-foreground p-1"
                        >
                            {showReasoningSteps ? (
                                <ChevronUp className="h-3 w-3 mr-1" />
                            ) : (
                                <ChevronDown className="h-3 w-3 mr-1" />
                            )}
                            {showReasoningSteps ? 'Hide' : 'Show'} reasoning steps ({reasoningSteps.length})
                        </Button>

                        {showReasoningSteps && (
                            <div className="mt-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                                <div className="space-y-2">
                                    {reasoningSteps.map((step, index) => (
                                        <div key={index} className="text-sm text-muted-foreground">
                                            <span className="font-medium text-foreground">Step {index + 1}:</span> {step}
                                        </div>
                                    ))}
                                    {isReasoning && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            <span>Thinking...</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Message content */}
                <div className="p-3 rounded-lg min-h-[2rem]">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}
