"use client"

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Folder } from 'lucide-react';

interface OrganizeGroupsDialogProps {
    groups: Array<{
        id: string;
        name: string;
        sortOrder: number;
        createdAt: string;
        workspaceCount: number;
    }>;
    onClose: () => void;
}

export function OrganizeGroupsDialog({
    groups,
    onClose
}: OrganizeGroupsDialogProps) {
    const [open] = useState(true);

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            onClose();
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Groups Overview</DialogTitle>
                    <DialogDescription>
                        View your workspace groups and their workspace counts.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-1">
                    {groups.length > 0 ? (
                        <div className="space-y-0.5">
                            {groups.map((group, index) => (
                                <div key={group.id} className="flex items-center gap-2 p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors">
                                    <Folder className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <span className="font-medium text-sm truncate block" title={group.name}>
                                            {group.name}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {group.workspaceCount} workspace{group.workspaceCount !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground flex-shrink-0">
                                        #{index + 1}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>No groups found</p>
                            <p className="text-sm">Create some groups first to see them here</p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end">
                    <Button
                        variant="outline"
                        onClick={() => onClose()}
                    >
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
