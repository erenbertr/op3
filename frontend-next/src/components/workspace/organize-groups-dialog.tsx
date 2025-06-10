"use client"

import React, { useState, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SortableGroupList } from './sortable-group-list';
import { useReorderWorkspaceGroups } from '@/lib/hooks/use-workspace-groups';

interface OrganizeGroupsDialogProps {
    userId: string;
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
    userId,
    groups,
    onClose
}: OrganizeGroupsDialogProps) {
    const [localGroups, setLocalGroups] = useState(groups);
    const [hasChanges, setHasChanges] = useState(false);
    const [open] = useState(true);

    const reorderGroupsMutation = useReorderWorkspaceGroups();

    // Update local groups when props change
    React.useEffect(() => {
        setLocalGroups(groups);
        setHasChanges(false);
    }, [groups]);

    const handleGroupReorder = useCallback((groupId: string, newIndex: number) => {
        setLocalGroups((items) => {
            const oldIndex = items.findIndex((item) => item.id === groupId);
            if (oldIndex === -1) return items;

            const newItems = [...items];
            const [movedItem] = newItems.splice(oldIndex, 1);
            newItems.splice(newIndex, 0, movedItem);

            setHasChanges(true);
            return newItems;
        });
    }, []);

    const handleSave = async () => {
        if (!hasChanges) {
            onClose();
            return;
        }

        try {
            const groupOrders = localGroups.map((group, index) => ({
                groupId: group.id,
                sortOrder: index
            }));

            await reorderGroupsMutation.mutateAsync({
                userId,
                groupOrders
            });

            setHasChanges(false);
            onClose();
        } catch (error) {
            console.error('Error reordering groups:', error);
        }
    };

    const handleCancel = () => {
        setLocalGroups(groups);
        setHasChanges(false);
        onClose();
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            onClose();
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Organize Groups</DialogTitle>
                    <DialogDescription>
                        Drag and drop to reorder your workspace groups. The order will be reflected in the main view.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {localGroups.length > 0 ? (
                        <SortableGroupList
                            groups={localGroups}
                            onGroupReorder={handleGroupReorder}
                        />
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>No groups to organize</p>
                            <p className="text-sm">Create some groups first to organize them</p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={reorderGroupsMutation.isPending || !hasChanges}
                    >
                        {reorderGroupsMutation.isPending ? 'Saving...' : 'Save Order'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
