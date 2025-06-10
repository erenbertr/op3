"use client"

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { GripVertical, Folder } from 'lucide-react';

interface SortableGroupItemProps {
    group: {
        id: string;
        name: string;
        sortOrder: number;
        createdAt: string;
        workspaceCount: number;
    };
}

export function SortableGroupItem({ group }: SortableGroupItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: group.id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <Card
            ref={setNodeRef}
            style={style}
            className={`transition-all duration-200 ${isDragging ? 'shadow-lg' : ''}`}
        >
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
                    >
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </div>
                    
                    <div className="p-2 rounded-full bg-muted text-muted-foreground">
                        <Folder className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1">
                        <h4 className="font-medium">{group.name}</h4>
                        <p className="text-sm text-muted-foreground">
                            {group.workspaceCount} workspace{group.workspaceCount !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
