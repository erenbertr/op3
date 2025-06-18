"use client"

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface RenameChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentTitle: string;
    onRename: (newTitle: string) => Promise<void>;
    isLoading?: boolean;
}

export function RenameChatModal({
    isOpen,
    onClose,
    currentTitle,
    onRename,
    isLoading = false
}: RenameChatModalProps) {
    const [newTitle, setNewTitle] = useState(currentTitle);
    const [error, setError] = useState('');

    // Reset form when modal opens/closes or currentTitle changes
    useEffect(() => {
        if (isOpen) {
            setNewTitle(currentTitle);
            setError('');
        }
    }, [isOpen, currentTitle]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const trimmedTitle = newTitle.trim();
        if (!trimmedTitle) {
            setError('Chat title cannot be empty');
            return;
        }

        if (trimmedTitle === currentTitle) {
            // No change, just close
            onClose();
            return;
        }

        try {
            await onRename(trimmedTitle);
        } catch (error) {
            setError('Failed to rename chat');
        }
    };

    const handleCancel = () => {
        setNewTitle(currentTitle);
        setError('');
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            handleCancel();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Rename Chat</DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="chat-title">Chat Title</Label>
                        <Input
                            id="chat-title"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter chat title"
                            autoFocus
                            disabled={isLoading}
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                            <p className="text-destructive text-sm">{error}</p>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || !newTitle.trim() || newTitle.trim() === currentTitle}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Saving...
                                </>
                            ) : (
                                'Save'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
