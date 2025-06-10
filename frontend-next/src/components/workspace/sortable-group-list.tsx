"use client"

import React, { useRef, useEffect } from 'react';
import Sortable from 'sortablejs';
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

export function SortableGroupList({ groups, onGroupReorder }: SortableGroupListProps) {
    const listRef = useRef<HTMLDivElement>(null);
    const sortableRef = useRef<Sortable | null>(null);

    useEffect(() => {
        if (!listRef.current) return;

        // Destroy existing sortable instance
        if (sortableRef.current) {
            sortableRef.current.destroy();
        }

        // Create new sortable instance
        sortableRef.current = Sortable.create(listRef.current, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            handle: '.drag-handle',
            forceFallback: true,
            fallbackClass: 'sortable-fallback',
            onEnd: (evt) => {
                const { oldIndex, newIndex } = evt;
                
                if (oldIndex === undefined || newIndex === undefined) return;
                
                // Get the group ID from the dragged element
                const groupId = evt.item.getAttribute('data-group-id');
                if (!groupId) return;

                // Call the reorder handler
                onGroupReorder(groupId, newIndex);
            }
        });

        return () => {
            if (sortableRef.current) {
                sortableRef.current.destroy();
                sortableRef.current = null;
            }
        };
    }, [onGroupReorder]);

    return (
        <div ref={listRef} className="space-y-2">
            {groups.map((group) => (
                <Card
                    key={group.id}
                    data-group-id={group.id}
                    className="transition-all duration-200"
                >
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="drag-handle cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded">
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </div>

                            <div className="p-2 rounded-full bg-muted text-muted-foreground">
                                <Folder className="h-4 w-4" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate min-w-0" title={group.name}>
                                    {group.name}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    {group.workspaceCount} workspace{group.workspaceCount !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
