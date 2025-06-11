"use client"

import React, { useRef, useEffect, useState, useCallback } from 'react';
import Sortable from 'sortablejs';
import { Card, CardContent } from '@/components/ui/card';
import { GripVertical, Folder } from 'lucide-react';

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
    let timeout: NodeJS.Timeout;
    return ((...args: any[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    }) as T;
}

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
    const isInitializedRef = useRef(false);
    const [isDragging, setIsDragging] = useState(false);
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

    // Add error boundary for sortable operations
    const handleSortableError = useCallback((error: any, operation: string) => {
        console.warn(`SortableJS ${operation} error (safely handled):`, error);
        // Reset drag state on any error
        setIsDragging(false);
        setDraggedItemId(null);
    }, []);

    useEffect(() => {
        if (!listRef.current) return;

        // Don't recreate during drag operations
        if (isDragging) {
            return;
        }

        // Only create if not already initialized
        if (sortableRef.current && isInitializedRef.current) {
            return;
        }

        // Destroy existing instance if it exists
        if (sortableRef.current) {
            try {
                sortableRef.current.destroy();
            } catch (error) {
                console.warn('Error destroying sortable instance:', error);
            }
            sortableRef.current = null;
            isInitializedRef.current = false;
        }

        // Create new sortable instance
        try {
            console.log('Creating sortable instance for groups');
            sortableRef.current = Sortable.create(listRef.current, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                handle: '.drag-handle',
                forceFallback: true,
                fallbackClass: 'sortable-fallback',
                onStart: (evt) => {
                    console.log('Group drag started');
                    const groupId = evt.item.getAttribute('data-group-id');
                    if (groupId) {
                        setIsDragging(true);
                        setDraggedItemId(groupId);
                    }
                },
                onEnd: (evt) => {
                    console.log('Group drag ended');
                    const { oldIndex, newIndex } = evt;

                    // Reset drag state
                    setIsDragging(false);
                    setDraggedItemId(null);

                    if (oldIndex === undefined || newIndex === undefined) return;
                    if (oldIndex === newIndex) return; // No actual move

                    // Get the group ID from the dragged element
                    const groupId = evt.item.getAttribute('data-group-id');
                    if (!groupId) return;

                    console.log(`Moving group ${groupId} from ${oldIndex} to ${newIndex}`);
                    // Call the reorder handler directly
                    onGroupReorder(groupId, newIndex);
                }
            });
            isInitializedRef.current = true;
            console.log('Sortable instance created successfully');
        } catch (error) {
            console.error('Error creating sortable instance:', error);
            isInitializedRef.current = false;
        }

        return () => {
            if (sortableRef.current) {
                try {
                    sortableRef.current.destroy();
                } catch (error) {
                    console.warn('Error during sortable cleanup:', error);
                }
                sortableRef.current = null;
            }
            isInitializedRef.current = false;
            setIsDragging(false);
            setDraggedItemId(null);
        };
    }, [groups.length]); // Only depend on groups length



    return (
        <div ref={listRef} className={`space-y-1.5 ${isDragging ? 'pointer-events-none' : ''}`}>
            {groups.map((group) => (
                <Card
                    key={group.id}
                    data-group-id={group.id}
                    className={`transition-all duration-200 ${draggedItemId === group.id ? 'opacity-50' : ''}`}
                >
                    <CardContent className="p-2.5">
                        <div className="flex items-center gap-2.5">
                            <div className="drag-handle cursor-grab active:cursor-grabbing p-0.5 hover:bg-muted rounded">
                                <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>

                            <div className="p-1.5 rounded-full bg-muted text-muted-foreground">
                                <Folder className="h-3.5 w-3.5" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate min-w-0 text-sm" title={group.name}>
                                    {group.name}
                                </h4>
                                <p className="text-xs text-muted-foreground">
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
