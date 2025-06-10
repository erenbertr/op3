"use client"

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateWorkspaceGroup } from '@/lib/hooks/use-workspace-groups';

interface CreateGroupDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userId: string;
}

export function CreateGroupDialog({ open, onOpenChange, userId }: CreateGroupDialogProps) {
    const [groupName, setGroupName] = useState('');
    const [error, setError] = useState('');

    const createGroupMutation = useCreateWorkspaceGroup();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!groupName.trim()) {
            setError('Please enter a group name');
            return;
        }

        try {
            const result = await createGroupMutation.mutateAsync({
                userId,
                name: groupName.trim()
            });

            if (result.success) {
                setGroupName('');
                onOpenChange(false);
            } else {
                setError('Failed to create group');
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to create group');
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setGroupName('');
            setError('');
        }
        onOpenChange(newOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Group</DialogTitle>
                    <DialogDescription>
                        Create a new group to organize your workspaces. You can drag and drop workspaces into groups.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="groupName">Group Name</Label>
                        <Input
                            id="groupName"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="e.g., Work, Personal, Projects"
                            autoFocus
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
                            onClick={() => handleOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={createGroupMutation.isPending || !groupName.trim()}
                        >
                            {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
