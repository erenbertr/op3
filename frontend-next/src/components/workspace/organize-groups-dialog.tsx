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
import { SortableGroupList } from './sortable-group-list';
import { useReorderWorkspaceGroupsOptimistic } from '@/lib/hooks/use-workspace-groups';

interface OrganizeGroupsDialogProps {
    groups: Array<{
        id: string;
        name: string;
        sortOrder: number;
        createdAt: string;
        workspaceCount: number;
    }>;
    userId: string;
    onClose: () => void;
}

export function OrganizeGroupsDialog({
    groups,
    userId,
    onClose
}: OrganizeGroupsDialogProps) {
    const [open] = useState(true);
    const [localGroups, setLocalGroups] = useState(groups);
    const reorderGroupsMutation = useReorderWorkspaceGroupsOptimistic();

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            onClose();
        }
    };

    const handleGroupReorder = async (groupId: string, newIndex: number) => {
        // Create a copy of the current groups array
        const groupsCopy = [...localGroups];

        // Find the group being moved
        const groupIndex = groupsCopy.findIndex(g => g.id === groupId);
        if (groupIndex === -1) return;

        // Remove the group from its current position
        const [movedGroup] = groupsCopy.splice(groupIndex, 1);

        // Insert it at the new position
        groupsCopy.splice(newIndex, 0, movedGroup);

        // Update local state immediately for visual feedback
        setLocalGroups(groupsCopy);

        // Prepare the API call data
        const groupOrders = groupsCopy.map((group, index) => ({
            groupId: group.id,
            sortOrder: index
        }));

        // Send API request without triggering automatic refetching
        try {
            await reorderGroupsMutation.mutateAsync({
                userId,
                groupOrders
            });
        } catch (error) {
            console.error('Failed to reorder groups:', error);
            // Optionally revert the local state on error
            setLocalGroups(groups);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Groups Overview</DialogTitle>
                    <DialogDescription>
                        View and reorder your workspace groups. Drag and drop to change the order.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-1">
                    {localGroups.length > 0 ? (
                        <SortableGroupList
                            groups={localGroups}
                            onGroupReorder={handleGroupReorder}
                        />
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
