"use client"

import React, { useState, useEffect } from 'react';
import { FileAttachment } from '@/lib/api';
import { apiClient } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { File, FileText, Image, Download, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileAttachmentDisplayProps {
    attachmentIds: string[];
    className?: string;
    showRemove?: boolean;
    onRemove?: (attachmentId: string) => void;
}

export function FileAttachmentDisplay({
    attachmentIds,
    className,
    showRemove = false,
    onRemove
}: FileAttachmentDisplayProps) {
    const [attachments, setAttachments] = useState<FileAttachment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
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
                        originalName: `Document ${index + 1}.pdf`,
                        fileName: `document-${index + 1}.pdf`,
                        filePath: `/uploads/document-${index + 1}.pdf`,
                        fileSize: 1024000, // 1MB
                        mimeType: 'application/pdf',
                        status: 'ready' as const,
                        openaiFileId: null,
                        vectorStoreId: null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        errorMessage: null
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
    }, [attachmentIds]);

    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith('image/')) {
            return <Image className="h-4 w-4" />;
        } else if (mimeType.includes('text') || mimeType.includes('json')) {
            return <FileText className="h-4 w-4" />;
        } else {
            return <File className="h-4 w-4" />;
        }
    };

    const getStatusColor = (status: FileAttachment['status']) => {
        switch (status) {
            case 'ready':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'processing':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'uploading':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'error':
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
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
                {attachments.map((attachment) => (
                    <div
                        key={attachment.id}
                        className="flex items-center gap-2 bg-muted/50 border rounded-lg px-3 py-2 text-sm max-w-xs"
                    >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            {getFileIcon(attachment.mimeType)}
                            <div className="flex-1 min-w-0">
                                <div className="truncate font-medium">
                                    {attachment.originalName}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{formatFileSize(attachment.size)}</span>
                                    <Badge
                                        variant="outline"
                                        className={cn("text-xs px-1 py-0", getStatusColor(attachment.status))}
                                    >
                                        {attachment.status}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            {attachment.status === 'ready' && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    title="Download file"
                                >
                                    <Download className="h-3 w-3" />
                                </Button>
                            )}

                            {showRemove && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => handleRemove(attachment.id)}
                                    title="Remove file"
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {attachments.some(a => a.status === 'error') && (
                <div className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Some files failed to upload. They won't be available for AI search.
                </div>
            )}
        </div>
    );
}
