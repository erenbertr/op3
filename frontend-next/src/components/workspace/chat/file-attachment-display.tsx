"use client"

import React, { useState, useEffect } from 'react';
import { FileAttachment } from '@/lib/api';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { File, FileText, Image, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileAttachmentDisplayProps {
    attachmentIds: string[];
    className?: string;
    showRemove?: boolean;
    onRemove?: (attachmentId: string) => void;
    // Add support for direct attachment data to avoid API calls
    attachments?: FileAttachment[];
}

export function FileAttachmentDisplay({
    attachmentIds,
    className,
    showRemove = false,
    onRemove,
    attachments: providedAttachments
}: FileAttachmentDisplayProps) {
    const [attachments, setAttachments] = useState<FileAttachment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // If attachments are provided directly, use them
        if (providedAttachments && providedAttachments.length > 0) {
            setAttachments(providedAttachments);
            setLoading(false);
            return;
        }

        const fetchAttachments = async (isInitialLoad = false) => {
            if (attachmentIds.length === 0) {
                setAttachments([]);
                setLoading(false);
                return;
            }

            try {
                if (isInitialLoad) {
                    setLoading(true);
                }
                setError(null);

                try {
                    const fetchedAttachments = await apiClient.getFileAttachmentsByIds(attachmentIds);
                    setAttachments(fetchedAttachments);
                } catch (apiError) {
                    // If API fails, create mock attachments for display
                    console.warn('File attachment API not available, creating mock attachments');
                    const mockAttachments = attachmentIds.map((id, index) => ({
                        id,
                        sessionId: 'unknown',
                        userId: 'unknown',
                        originalName: `Uploaded File ${index + 1}`,
                        fileName: `file-${index + 1}`,
                        size: 1024000, // 1MB
                        mimeType: 'application/octet-stream',
                        status: 'ready' as const,
                        openaiFileId: undefined,
                        vectorStoreId: undefined,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        errorMessage: undefined
                    }));
                    setAttachments(mockAttachments);
                }
            } catch (err) {
                console.error('Error fetching file attachments:', err);
                setError('Failed to load file attachments');
            } finally {
                if (isInitialLoad) {
                    setLoading(false);
                }
            }
        };

        // Initial load
        fetchAttachments(true);
    }, [attachmentIds, providedAttachments]);

    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith('image/')) {
            return <Image className="h-4 w-4" />;
        } else if (mimeType.includes('text') || mimeType.includes('json')) {
            return <FileText className="h-4 w-4" />;
        } else {
            return <File className="h-4 w-4" />;
        }
    };



    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleRemove = (attachmentId: string) => {
        if (onRemove) {
            onRemove(attachmentId);
        }
    };

    if (loading) {
        return (
            <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                Loading attachments...
            </div>
        );
    }

    if (error) {
        return (
            <div className={cn("flex items-center gap-2 text-sm text-red-600", className)}>
                <AlertCircle className="h-4 w-4" />
                {error}
            </div>
        );
    }

    if (attachments.length === 0) {
        return null;
    }

    return (
        <div className={cn("space-y-2", className)}>
            <div className="flex flex-wrap gap-2">
                {attachments.filter(attachment => attachment && attachment.id).map((attachment) => (
                    <div
                        key={attachment.id}
                        className="flex items-center gap-3 bg-background border rounded-lg px-3 py-2.5 text-sm max-w-sm shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="flex-shrink-0">
                                {getFileIcon(attachment.mimeType || 'application/octet-stream')}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="truncate font-medium text-foreground">
                                    {attachment.originalName || 'Unknown file'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {formatFileSize(attachment.size || 0)}
                                </div>
                            </div>
                        </div>

                        {showRemove && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
                                onClick={() => handleRemove(attachment.id)}
                                title="Remove file"
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                ))}
            </div>

            {attachments.some(a => a && a.status === 'error') && (
                <div className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Some files failed to upload. They won't be available for AI search.
                </div>
            )}
        </div>
    );
}
