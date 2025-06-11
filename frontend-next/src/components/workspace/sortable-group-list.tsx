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
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
    arrayMove,
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
    const [localGroups, setLocalGroups] = useState(groups);

    // Update local groups when props change
    React.useEffect(() => {
        setLocalGroups(groups);
    }, [groups]);

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
    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        if (activeId !== overId) {
            const activeIndex = localGroups.findIndex(group => group.id === activeId);
            const overIndex = localGroups.findIndex(group => group.id === overId);

            if (activeIndex !== -1 && overIndex !== -1) {
                setLocalGroups(prev => arrayMove(prev, activeIndex, overIndex));
            }
        }
    };

    // Handle drag end
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        setActiveId(null);

        if (!over) {
            console.log('Group drag ended: No drop target');
            setLocalGroups(groups); // Reset to original order
            return;
        }

        const activeId = active.id as string;
        const overId = over.id as string;

        if (activeId !== overId) {
            const oldIndex = groups.findIndex(group => group.id === activeId);
            const newIndex = localGroups.findIndex(group => group.id === overId);

            console.log(`Moving group ${activeId} from ${oldIndex} to ${newIndex}`);
            onGroupReorder(activeId, newIndex);
        } else {
            setLocalGroups(groups); // Reset if no actual move
        }
    };

    // Get group IDs for sortable context
    const groupIds = localGroups.map(g => g.id);





    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={groupIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-1.5">
                    {localGroups.map((group) => (
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
