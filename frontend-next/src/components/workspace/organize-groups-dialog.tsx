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
import { Card, CardContent } from '@/components/ui/card';
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

                <div className="py-2">
                    {groups.length > 0 ? (
                        <div className="space-y-1">
                            {groups.map((group, index) => (
                                <Card key={group.id}>
                                    <CardContent className="p-2">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1 rounded-full bg-muted text-muted-foreground">
                                                <Folder className="h-3 w-3" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-sm truncate" title={group.name}>
                                                    {group.name}
                                                </h4>
                                                <p className="text-xs text-muted-foreground">
                                                    {group.workspaceCount} workspace{group.workspaceCount !== 1 ? 's' : ''}
                                                </p>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                #{index + 1}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
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
