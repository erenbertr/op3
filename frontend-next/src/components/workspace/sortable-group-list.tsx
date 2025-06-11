"use client"

import React, { useState } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
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
            className="mb-4"
        >
            <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <div
                            className="drag-handle cursor-grab hover:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
                            {...attributes}
                            {...listeners}
                        >
                            <GripVertical className="h-4 w-4" />
                        </div>
                        <Folder className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                            <h3 className="font-medium">{group.name}</h3>
                            <p className="text-sm text-muted-foreground">
                                {group.workspaceCount} workspace{group.workspaceCount !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export function SortableGroupList({ groups, onGroupReorder }: SortableGroupListProps) {
    const [activeId, setActiveId] = useState<string | null>(null);

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
            const oldIndex = groups.findIndex(group => group.id === activeId);
            const newIndex = groups.findIndex(group => group.id === overId);

            console.log(`Moving group ${activeId} from ${oldIndex} to ${newIndex}`);
            onGroupReorder(activeId, newIndex);
        }
    };

    // Get group IDs for sortable context
    const groupIds = groups.map(g => g.id);





    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={groupIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-1.5">
                    {groups.map((group) => (
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
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                                    <Folder className="h-4 w-4 text-muted-foreground" />
                                    <div className="flex-1">
                                        <h3 className="font-medium">
                                            {groups.find(g => g.id === activeId)?.name}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {groups.find(g => g.id === activeId)?.workspaceCount} workspace
                                            {groups.find(g => g.id === activeId)?.workspaceCount !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
