"use client"

import React from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ApiMetadata } from '@/lib/api';

interface ApiMetadataTooltipProps {
    metadata?: ApiMetadata;
    className?: string;
}

export function ApiMetadataTooltip({ metadata, className }: ApiMetadataTooltipProps) {
    if (!metadata) {
        return null;
    }

    const formatDuration = (ms?: number) => {
        if (!ms) return 'N/A';
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };

    const formatTokens = (tokens?: number) => {
        if (!tokens) return 'N/A';
        return tokens.toLocaleString();
    };

    const formatCost = (cost?: number) => {
        if (!cost) return 'N/A';
        return `$${cost.toFixed(4)}`;
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`h-6 w-6 p-0 ${className || ''}`}
                    >
                        <Info className="h-3 w-3" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-2 text-xs">
                        <div className="font-semibold border-b pb-1">API Call Information</div>

                        {metadata.provider && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Provider:</span>
                                <span className="font-medium">{metadata.provider}</span>
                            </div>
                        )}

                        {metadata.model && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Model:</span>
                                <span className="font-medium">{metadata.model}</span>
                            </div>
                        )}

                        {metadata.responseTimeMs && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Response Time:</span>
                                <span className="font-medium">{formatDuration(metadata.responseTimeMs)}</span>
                            </div>
                        )}

                        {metadata.reasoningEnabled && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Reasoning:</span>
                                <span className="font-medium text-blue-600">Enabled</span>
                            </div>
                        )}

                        {(metadata.inputTokens || metadata.outputTokens || metadata.totalTokens) && (
                            <div className="border-t pt-1">
                                <div className="font-medium mb-1">Token Usage</div>

                                {metadata.inputTokens && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Input:</span>
                                        <span>{formatTokens(metadata.inputTokens)}</span>
                                    </div>
                                )}

                                {metadata.outputTokens && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Output:</span>
                                        <span>{formatTokens(metadata.outputTokens)}</span>
                                    </div>
                                )}

                                {metadata.totalTokens && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Total:</span>
                                        <span className="font-medium">{formatTokens(metadata.totalTokens)}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {metadata.cost && (
                            <div className="flex justify-between border-t pt-1">
                                <span className="text-muted-foreground">Cost:</span>
                                <span className="font-medium">{formatCost(metadata.cost)}</span>
                            </div>
                        )}

                        {metadata.requestId && (
                            <div className="border-t pt-1">
                                <div className="text-muted-foreground">Request ID:</div>
                                <div className="font-mono text-xs break-all">{metadata.requestId}</div>
                            </div>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
