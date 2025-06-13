"use client"

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, Copy, RotateCcw, Check, Play, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage as ChatMessageType, Personality } from '@/lib/api';
import { useOpenAIModelConfigs } from '@/lib/hooks/use-query-hooks';
import { ApiMetadataTooltip } from './api-metadata-tooltip';
import { FileAttachmentDisplay } from './file-attachment-display';

import ReactMarkdown, { Components } from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
    message: ChatMessageType;
    personality?: Personality;
    className?: string;
    onRetry?: (messageId: string) => void;
    onContinue?: (messageId: string) => void;
}

export function ChatMessage({ message, personality, className, onRetry, onContinue }: ChatMessageProps) {
    const [copyButtonText, setCopyButtonText] = useState('Copy');
    const isAssistant = message.role === 'assistant';
    const [isHovered, setIsHovered] = useState(false);
    const [justCopied, setJustCopied] = useState(false);

    // Get OpenAI model configurations to resolve provider info
    const { data: openaiModelConfigsData } = useOpenAIModelConfigs();
    const openaiModelConfigs = openaiModelConfigsData?.success ? openaiModelConfigsData.data || [] : [];

    // Get provider info from OpenAI model config or API metadata
    const getProviderInfo = () => {
        // First try to get from API metadata (most reliable)
        if (message.apiMetadata?.provider && message.apiMetadata?.model) {
            return {
                name: message.apiMetadata.provider,
                model: message.apiMetadata.model
            };
        }

        // Fall back to OpenAI model config lookup
        if (message.aiProviderId && openaiModelConfigs.length > 0) {
            const modelConfig = openaiModelConfigs.find(config => config.id === message.aiProviderId);
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

    // Copy to clipboard functionality
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message.content);

            // Show brief visual feedback with check icon
            setJustCopied(true);

            // Reset the copied state after a brief moment
            setTimeout(() => {
                setJustCopied(false);
            }, 1500);
        } catch (error) {
            console.error('Failed to copy message:', error);
        }
    };

    // Retry functionality
    const handleRetry = () => {
        if (onRetry && message.id) {
            onRetry(message.id);
        }
    };

    // Continue functionality for partial messages
    const handleContinue = () => {
        if (onContinue && message.id) {
            onContinue(message.id);
        }
    };

    // Convert markdown to HTML for AI messages, with syntax highlighting for code blocks
    const renderContent = () => {
        if (isAssistant) {
            return (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]} // Enable GitHub Flavored Markdown (tables, strikethrough, etc.)
                        components={{
                            // Custom renderer for links to open in new tab
                            a: (props: React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>) => (
                                <a {...props} target="_blank" rel="noopener noreferrer" />
                            ),
                            // Custom renderer for code blocks
                            code: ({ inline, className, children, ...props }: { inline?: boolean; className?: string; children: React.ReactNode;[key: string]: unknown }) => {
                                const match = /language-(\w+)/.exec(className || '');
                                if (!inline && match) {
                                    const codeString = String(children).replace(/\n$/, '');
                                    return (
                                        <div className="relative group bg-background/50 rounded-md overflow-hidden">
                                            <SyntaxHighlighter
                                                style={vscDarkPlus}
                                                customStyle={{ margin: '0', padding: '1em', background: 'transparent' }} // Ensure highlighter background is transparent
                                                language={match[1]}
                                                PreTag="pre"
                                                className="not-prose w-full"
                                                codeTagProps={{ style: { background: 'transparent', padding: '0', color: 'inherit' } }}
                                                {...props} // Pass through other props from react-markdown
                                            >
                                                {codeString}
                                            </SyntaxHighlighter>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-md"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(codeString);
                                                    setCopyButtonText('Copied!');
                                                    setTimeout(() => setCopyButtonText('Copy'), 2000);
                                                }}
                                                title={copyButtonText}
                                            >
                                                {copyButtonText === 'Copy' ? <Copy size={14} /> : <Check size={14} />}
                                            </Button>
                                        </div>
                                    );
                                }
                                // For inline code or if no language match
                                return (
                                    <code className={className} {...props}>
                                        {children}
                                    </code>
                                );
                            }
                        } as Components}
                    >
                        {message.content}
                    </ReactMarkdown>
                </div>
            );
        } else {
            // Plain text for user messages
            return (
                <div className="whitespace-pre-wrap break-words">
                    {message.content}
                </div>
            );
        }
    };



    return (
        <div
            className={cn("relative group pb-4 mb-4", className)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >

            {/* Message content */}
            <div className="space-y-2">
                {/* Status/Header area - show for AI messages with personality or provider info */}
                {isAssistant && (personality || providerInfo) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 h-4">
                        {/* Provider badge */}
                        {providerInfo && (
                            <Badge variant="outline" className="text-xs">
                                <Bot className="h-3 w-3" />
                                {providerInfo.name}
                            </Badge>
                        )}

                        {/* Personality badge */}
                        {personality && (
                            <Badge variant="secondary" className="text-xs">
                                <Brain className="h-3 w-3" />
                                {personality.title}
                            </Badge>
                        )}

                        {/* Orange dot for partial messages */}
                        {message.isPartial && (
                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                        )}
                    </div>
                )}

                {/* Message content */}
                <div className={cn("p-3 rounded-lg", !isAssistant && "bg-muted/30")}>
                    {renderContent()}
                </div>

                {/* File attachments - only show for user messages */}
                {!isAssistant && message.fileAttachments && message.fileAttachments.length > 0 && (
                    <div className="mt-2">
                        <FileAttachmentDisplay
                            attachmentIds={message.fileAttachments}
                            attachments={message.attachmentData}
                            className="ml-3"
                        />
                    </div>
                )}

            </div>

            {/* Hover actions - positioned at top-right of container */}
            {isHovered && (
                <div className="absolute top-2 right-2 flex gap-1 bg-background border rounded-md shadow-sm p-1">
                    {/* API metadata tooltip - only for AI messages */}
                    {isAssistant && message.apiMetadata && (
                        <ApiMetadataTooltip metadata={message.apiMetadata} />
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={handleCopy}
                    >
                        {justCopied ? (
                            <Check className="h-3 w-3 text-green-600" />
                        ) : (
                            <Copy className="h-3 w-3" />
                        )}
                    </Button>

                    {/* Show continue button for partial messages */}
                    {message.isPartial ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-950"
                            onClick={handleContinue}
                            title="Continue message"
                        >
                            <Play className="h-3 w-3" />
                        </Button>
                    ) : (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={handleRetry}
                            title="Retry message"
                        >
                            <RotateCcw className="h-3 w-3" />
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

interface ChatMessageListProps {
    messages: ChatMessageType[];
    personalities: Personality[];
    pendingUserMessage?: ChatMessageType | null;
    className?: string;
    onRetry?: (messageId: string) => void;
    onContinue?: (messageId: string) => void;
    streamingMessage?: React.ReactNode;
    isVisible?: boolean;
}

export function ChatMessageList({
    messages = [],
    personalities = [],
    pendingUserMessage,
    className,
    onRetry,
    onContinue,
    streamingMessage,
    isVisible = true
}: ChatMessageListProps) {
    const getPersonality = (personalityId?: string) => {
        return personalityId && personalities ? personalities.find(p => p?.id === personalityId) : undefined;
    };

    const getAIProvider = (aiProviderId?: string) => {
        // Remove old provider lookup - now using model configs
        return undefined;
    };

    // Combine saved messages with pending user message
    const allMessages = [...messages];
    if (pendingUserMessage) {
        allMessages.push(pendingUserMessage);
    }

    if (!allMessages || allMessages.length === 0) {
        return (
            <div className={cn("text-center space-y-6 max-w-md", className)}>
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
        );
    }

    return (
        <div
            className={cn("p-4", className)}
            style={{
                opacity: isVisible ? 1 : 0,
                userSelect: isVisible ? 'auto' : 'none',
                transition: isVisible ? 'opacity 0.3s ease-in-out' : 'none',
                pointerEvents: isVisible ? 'auto' : 'none'
            }}
        >
            {allMessages.map((message) => (
                <div key={message.id} data-message-item>
                    <ChatMessage
                        message={message}
                        personality={getPersonality(message.personalityId)}
                        onRetry={onRetry}
                        onContinue={onContinue}
                    />
                </div>
            ))}
            {/* Render streaming message inside the same container with data attribute */}
            {streamingMessage && (
                <div data-message-item>
                    {streamingMessage}
                </div>
            )}
            {/* Transparent spacer to push last message to top when needed */}
            <div
                id="chat-spacer"
                style={{
                    height: '0px',
                    transition: 'height 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    pointerEvents: 'none',
                    opacity: 0
                }}
            />
        </div>
    );
}
