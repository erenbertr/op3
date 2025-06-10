"use client"

import React, { useState } from 'react';
import {
    DndContext,
    DragEndEvent,
    PointerSensor,
    useSensor,
    useSensors,
    closestCenter,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SortableGroupItem } from './sortable-group-item';
import { useReorderWorkspaceGroups } from '@/lib/hooks/use-workspace-groups';

interface OrganizeGroupsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userId: string;
    groups: Array<{
        id: string;
        name: string;
        sortOrder: number;
        createdAt: string;
        workspaceCount: number;
    }>;
}

export function OrganizeGroupsDialog({
    open,
    onOpenChange,
    userId,
    groups
}: OrganizeGroupsDialogProps) {
    const [localGroups, setLocalGroups] = useState(groups);
    const [hasChanges, setHasChanges] = useState(false);

    const reorderGroupsMutation = useReorderWorkspaceGroups();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Update local groups when props change
    React.useEffect(() => {
        setLocalGroups(groups);
        setHasChanges(false);
    }, [groups]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setLocalGroups((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);

                const newItems = arrayMove(items, oldIndex, newIndex);
                setHasChanges(true);
                return newItems;
            });
        }
    };

    const handleSave = async () => {
        if (!hasChanges) {
            onOpenChange(false);
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
            onOpenChange(false);
        } catch (error) {
            console.error('Error reordering groups:', error);
        }
    };

    const handleCancel = () => {
        setLocalGroups(groups);
        setHasChanges(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Organize Groups</DialogTitle>
                    <DialogDescription>
                        Drag and drop to reorder your workspace groups. The order will be reflected in the main view.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {localGroups.length > 0 ? (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={localGroups.map(g => g.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-2">
                                    {localGroups.map((group) => (
                                        <SortableGroupItem
                                            key={group.id}
                                            group={group}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
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
