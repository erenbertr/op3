"use client"

import React, { useEffect, useState } from 'react';
import { useDynamicTitle } from '@/lib/hooks/use-dynamic-title';
import { useParams } from 'next/navigation';
import { apiClient, SharedMessage } from '@/lib/api';
import { Loader2, MessageSquare, Copy, Check } from 'lucide-react';
import ReactMarkdown, { Components } from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';

// Component for rendering message content with markdown support
function MessageContent({ content, isAssistant }: { content: string; isAssistant: boolean }) {
    const [copyButtonText, setCopyButtonText] = useState('Copy');
    const { theme } = useTheme();

    if (isAssistant) {
        return (
            <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
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
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={`absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity rounded-md ${theme === 'dark'
                                                ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white'
                                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900'
                                                }`}
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
                    {content}
                </ReactMarkdown>
            </div>
        );
    }

    // For user messages, just show as plain text with line breaks preserved
    return (
        <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="whitespace-pre-wrap break-words">
                {content}
            </div>
        </div>
    );
}

export default function MessageSharePage() {
    const params = useParams();
    const shareId = params.shareId as string;
    const [sharedMessage, setSharedMessage] = useState<SharedMessage | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Use dynamic title hook
    useDynamicTitle();

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
                            <div className={`text-sm font-medium ${sharedMessage.role === 'user'
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
                        <div className={`rounded-lg p-4 ${sharedMessage.role === 'user'
                            ? 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800'
                            : 'bg-muted border border-border'
                            }`}>
                            <MessageContent
                                content={sharedMessage.content}
                                isAssistant={sharedMessage.role === 'assistant'}
                            />
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
