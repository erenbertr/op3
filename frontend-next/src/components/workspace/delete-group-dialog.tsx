"use client"

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2, FolderMinus, Loader2 } from 'lucide-react';

interface DeleteGroupDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    groupName: string;
    workspaceCount: number;
    onDeleteGroupOnly: () => void;
    onDeleteGroupAndWorkspaces: () => void;
    isDeleting: boolean;
}

export function DeleteGroupDialog({
    open,
    onOpenChange,
    groupName,
    workspaceCount,
    onDeleteGroupOnly,
    onDeleteGroupAndWorkspaces,
    isDeleting
}: DeleteGroupDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Delete Group "{groupName}"</DialogTitle>
                    <DialogDescription>
                        Choose how you want to delete this group. This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">
                            This group contains <strong>{workspaceCount}</strong> workspace{workspaceCount !== 1 ? 's' : ''}.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <Button
                            variant="outline"
                            className="w-full justify-start h-auto p-4"
                            onClick={onDeleteGroupOnly}
                            disabled={isDeleting}
                        >
                            <div className="flex items-start gap-3">
                                <FolderMinus className="h-5 w-5 mt-0.5 text-orange-500" />
                                <div className="text-left">
                                    <div className="font-medium">Remove Group Only</div>
                                    <div className="text-sm text-muted-foreground">
                                        Delete the group but keep all workspaces (they will be moved to ungrouped)
                                    </div>
                                </div>
                            </div>
                        </Button>

                        <Button
                            variant="outline"
                            className="w-full justify-start h-auto p-4 border-destructive/50 hover:bg-destructive/5"
                            onClick={onDeleteGroupAndWorkspaces}
                            disabled={isDeleting}
                        >
                            <div className="flex items-start gap-3">
                                <Trash2 className="h-5 w-5 mt-0.5 text-destructive" />
                                <div className="text-left">
                                    <div className="font-medium text-destructive">Delete Group & All Workspaces</div>
                                    <div className="text-sm text-muted-foreground">
                                        Permanently delete the group and all {workspaceCount} workspace{workspaceCount !== 1 ? 's' : ''} inside it
                                    </div>
                                </div>
                            </div>
                        </Button>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>
                </DialogFooter>

                {isDeleting && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                        <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Deleting...</span>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
