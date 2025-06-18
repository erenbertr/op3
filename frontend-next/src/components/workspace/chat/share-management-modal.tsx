"use client"

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { Copy, Share2, RefreshCw, Trash2, ExternalLink } from 'lucide-react';
import { apiClient, GetShareStatusResponse, UpdateShareResponse, RemoveShareResponse } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ShareManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId: string;
    sessionTitle: string;
    onShareStatusChange?: (isShared: boolean) => void;
}

export function ShareManagementModal({
    isOpen,
    onClose,
    sessionId,
    sessionTitle,
    onShareStatusChange
}: ShareManagementModalProps) {
    const [shareStatus, setShareStatus] = useState<GetShareStatusResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
    const { addToast } = useToast();

    // Load share status when modal opens
    useEffect(() => {
        if (isOpen && sessionId) {
            loadShareStatus();
        }
    }, [isOpen, sessionId]);

    const loadShareStatus = async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.getShareStatus(sessionId);
            setShareStatus(response);
        } catch (error) {
            console.error('Error loading share status:', error);
            addToast({
                title: "Error",
                description: "Failed to load share status",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyUrl = async () => {
        if (!shareStatus?.shareUrl) return;

        const fullUrl = `${window.location.origin}${shareStatus.shareUrl}`;
        try {
            await navigator.clipboard.writeText(fullUrl);
            addToast({
                title: "Copied!",
                description: "Share URL copied to clipboard",
            });
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            addToast({
                title: "Error",
                description: "Failed to copy URL to clipboard",
                variant: "destructive",
            });
        }
    };

    const handleOpenShare = () => {
        if (!shareStatus?.shareUrl) return;
        const fullUrl = `${window.location.origin}${shareStatus.shareUrl}`;
        window.open(fullUrl, '_blank');
    };

    const handleUpdateShare = async () => {
        setIsUpdating(true);
        try {
            const response = await apiClient.updateShare(sessionId);
            if (response.success) {
                addToast({
                    title: "Share Updated",
                    description: `Share updated with ${response.messageCount} messages`,
                });
                // Reload share status to get updated info
                await loadShareStatus();
            } else {
                addToast({
                    title: "Error",
                    description: response.message || "Failed to update share",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Error updating share:', error);
            addToast({
                title: "Error",
                description: "Failed to update share",
                variant: "destructive",
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleRemoveShare = async () => {
        setIsRemoving(true);
        try {
            const response = await apiClient.removeShare(sessionId);
            if (response.success) {
                addToast({
                    title: "Share Removed",
                    description: "Chat share has been removed successfully",
                });
                onShareStatusChange?.(false);
                onClose();
            } else {
                addToast({
                    title: "Error",
                    description: response.message || "Failed to remove share",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Error removing share:', error);
            addToast({
                title: "Error",
                description: "Failed to remove share",
                variant: "destructive",
            });
        } finally {
            setIsRemoving(false);
            setShowRemoveConfirm(false);
        }
    };

    const handleCreateShare = async () => {
        setIsUpdating(true);
        try {
            const response = await apiClient.shareChat(sessionId);
            if (response.success) {
                addToast({
                    title: "Share Created",
                    description: "Chat has been shared successfully",
                });
                onShareStatusChange?.(true);
                // Reload share status to get the new share info
                await loadShareStatus();
            } else {
                addToast({
                    title: "Error",
                    description: response.message || "Failed to create share",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Error creating share:', error);
            addToast({
                title: "Error",
                description: "Failed to create share",
                variant: "destructive",
            });
        } finally {
            setIsUpdating(false);
        }
    };

    if (isLoading) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="w-[80vw] h-[80vh] max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Share Management</DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center space-y-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted-foreground/20 border-t-muted-foreground/40 mx-auto"></div>
                            <p className="text-muted-foreground">Loading share status...</p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[80vw] h-[80vh] max-w-4xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                        <Share2 className="h-5 w-5" />
                        <span>Share Management</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 space-y-6">
                    {/* Chat Info */}
                    <div className="space-y-2">
                        <h3 className="text-lg font-medium">Chat Details</h3>
                        <p className="text-sm text-muted-foreground truncate" title={sessionTitle}>
                            {sessionTitle}
                        </p>
                    </div>

                    {shareStatus?.isShared ? (
                        /* Shared Chat Management */
                        <div className="space-y-6">
                            {/* Share URL Section */}
                            <div className="space-y-3">
                                <h3 className="text-lg font-medium">Share URL</h3>
                                <div className="flex space-x-2">
                                    <Input
                                        value={shareStatus.shareUrl ? `${window.location.origin}${shareStatus.shareUrl}` : ''}
                                        readOnly
                                        className="flex-1"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCopyUrl}
                                        className="flex items-center space-x-1"
                                    >
                                        <Copy className="h-4 w-4" />
                                        <span>Copy</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleOpenShare}
                                        className="flex items-center space-x-1"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                        <span>Open</span>
                                    </Button>
                                </div>
                            </div>

                            {/* Share Info */}
                            <div className="space-y-3">
                                <h3 className="text-lg font-medium">Share Information</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Messages included:</span>
                                        <span className="ml-2 font-medium">{shareStatus.messageCount}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Created:</span>
                                        <span className="ml-2 font-medium">
                                            {shareStatus.createdAt ? new Date(shareStatus.createdAt).toLocaleDateString() : 'Unknown'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex space-x-3">
                                <Button
                                    onClick={handleUpdateShare}
                                    disabled={isUpdating}
                                    className="flex items-center space-x-2"
                                >
                                    <RefreshCw className={cn("h-4 w-4", isUpdating && "animate-spin")} />
                                    <span>{isUpdating ? 'Updating...' : 'Update Share'}</span>
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => setShowRemoveConfirm(true)}
                                    disabled={isRemoving}
                                    className="flex items-center space-x-2"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span>Remove Share</span>
                                </Button>
                            </div>

                            {/* Remove Confirmation */}
                            {showRemoveConfirm && (
                                <div className="border border-destructive/20 bg-destructive/5 rounded-lg p-4 space-y-3">
                                    <h4 className="font-medium text-destructive">Confirm Removal</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Are you sure you want to remove this share? The shared URL will no longer be accessible.
                                    </p>
                                    <div className="flex space-x-2">
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={handleRemoveShare}
                                            disabled={isRemoving}
                                        >
                                            {isRemoving ? 'Removing...' : 'Yes, Remove'}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowRemoveConfirm(false)}
                                            disabled={isRemoving}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Create Share Section */
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Create Share</h3>
                            <p className="text-sm text-muted-foreground">
                                This chat is not currently shared. Create a public share link to allow others to view this conversation.
                            </p>
                            <Button
                                onClick={handleCreateShare}
                                disabled={isUpdating}
                                className="flex items-center space-x-2"
                            >
                                <Share2 className="h-4 w-4" />
                                <span>{isUpdating ? 'Creating...' : 'Create Share'}</span>
                            </Button>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
