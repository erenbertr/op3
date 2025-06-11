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
            <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg">Delete Group "{groupName}"</DialogTitle>
                    <DialogDescription className="text-sm">
                        Choose how you want to delete this group. This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2 space-y-4">
                    <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">
                            This group contains <strong>{workspaceCount}</strong> workspace{workspaceCount !== 1 ? 's' : ''}.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Button
                            variant="outline"
                            className="w-full justify-start h-auto p-3"
                            onClick={onDeleteGroupOnly}
                            disabled={isDeleting}
                        >
                            <div className="flex items-start gap-3 w-full">
                                <FolderMinus className="h-4 w-4 mt-0.5 text-orange-500 flex-shrink-0" />
                                <div className="text-left flex-1 min-w-0">
                                    <div className="font-medium text-sm">Remove Group Only</div>
                                    <div className="text-xs text-muted-foreground">
                                        Delete the group but keep all workspaces (moved to ungrouped)
                                    </div>
                                </div>
                            </div>
                        </Button>

                        <Button
                            variant="outline"
                            className="w-full justify-start h-auto p-3 border-destructive/50 hover:bg-destructive/5"
                            onClick={onDeleteGroupAndWorkspaces}
                            disabled={isDeleting}
                        >
                            <div className="flex items-start gap-3 w-full">
                                <Trash2 className="h-4 w-4 mt-0.5 text-destructive flex-shrink-0" />
                                <div className="text-left flex-1 min-w-0">
                                    <div className="font-medium text-sm text-destructive">Delete Group & All Workspaces</div>
                                    <div className="text-xs text-muted-foreground">
                                        Permanently delete the group and all {workspaceCount} workspace{workspaceCount !== 1 ? 's' : ''} inside it
                                    </div>
                                </div>
                            </div>
                        </Button>
                    </div>
                </div>

                <DialogFooter className="pt-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isDeleting}
                        size="sm"
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
