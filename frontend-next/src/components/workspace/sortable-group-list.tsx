"use client"

import React, { useState } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
    DragOverlay,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    MeasuringStrategy,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { GripVertical, Folder } from 'lucide-react';

interface WorkspaceGroup {
    id: string;
    name: string;
    sortOrder: number;
    createdAt: string;
    workspaceCount: number;
}

interface SortableGroupListProps {
    groups: WorkspaceGroup[];
    onGroupReorder: (groupId: string, newIndex: number) => void;
}

// Sortable group item component
function SortableGroupItem({
    group,
    isDragging,
}: {
    group: WorkspaceGroup;
    isDragging: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging: isSortableDragging,
    } = useSortable({ id: group.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging || isSortableDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            data-group-id={group.id}
        >
            <Card className="hover:shadow-md transition-shadow">
                <CardContent className="px-3 py-1">
                    <div className="flex items-center gap-2">
                        <div
                            className="drag-handle cursor-grab hover:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
                            {...attributes}
                            {...listeners}
                        >
                            <GripVertical className="h-3 w-3" />
                        </div>
                        <Folder className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium text-sm truncate" title={group.name}>
                            {group.name}
                        </span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export function SortableGroupList({ groups, onGroupReorder }: SortableGroupListProps) {
    const [activeId, setActiveId] = useState<string | null>(null);
    // Use groups directly from props for immediate updates

    // Configure sensors for drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Handle drag start
    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
        console.log('Group drag started:', event.active.id);
    };

    // Handle drag over for smooth sorting
    const handleDragOver = (_event: DragOverEvent) => {
        // Visual feedback is handled by @dnd-kit automatically
        // No need to update local state during drag over
    };

    // Handle drag end
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        setActiveId(null);

        if (!over) {
            console.log('Group drag ended: No drop target');
            return;
        }

        const activeId = active.id as string;
        const overId = over.id as string;

        if (activeId !== overId) {
            const oldIndex = groups.findIndex((group: WorkspaceGroup) => group.id === activeId);
            const newIndex = groups.findIndex((group: WorkspaceGroup) => group.id === overId);

            console.log(`Moving group ${activeId} from ${oldIndex} to ${newIndex}`);
            onGroupReorder(activeId, newIndex);
        }
    };

    // Get group IDs for sortable context
    const groupIds = groups.map((g: WorkspaceGroup) => g.id);





    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            measuring={{
                droppable: {
                    strategy: MeasuringStrategy.Always,
                },
            }}
        >
            <SortableContext items={groupIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                    {groups.map((group: WorkspaceGroup) => (
                        <SortableGroupItem
                            key={group.id}
                            group={group}
                            isDragging={activeId === group.id}
                        />
                    ))}
                </div>
            </SortableContext>

            <DragOverlay>
                {activeId ? (
                    <div className="opacity-80">
                        <Card className="hover:shadow-md transition-shadow">
                            <CardContent className="px-3 py-1">
                                <div className="flex items-center gap-2">
                                    <GripVertical className="h-3 w-3 text-muted-foreground" />
                                    <Folder className="h-3 w-3 text-muted-foreground" />
                                    <span className="font-medium text-sm truncate">
                                        {groups.find(g => g.id === activeId)?.name}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
