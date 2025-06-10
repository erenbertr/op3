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

    // Debounced reorder handler to prevent rapid successive operations
    const debouncedReorder = useCallback(
        debounce((groupId: string, newIndex: number) => {
            onGroupReorder(groupId, newIndex);
        }, 100),
        [onGroupReorder]
    );

    useEffect(() => {
        if (!listRef.current) return;

        // CRITICAL: Never recreate sortable during drag operations
        if (isDragging) {
            return;
        }

        // Don't recreate sortable instance if one already exists and is initialized
        // This prevents interrupting ongoing drag operations
        if (sortableRef.current && isInitializedRef.current) {
            return;
        }

        // Destroy existing instance if it exists
        if (sortableRef.current) {
            try {
                sortableRef.current.destroy();
            } catch (error) {
                // Ignore errors during destroy - the instance might already be invalid
                console.warn('Error destroying sortable instance:', error);
            }
            sortableRef.current = null;
            isInitializedRef.current = false;
        }

        // Create new sortable instance
        try {
            sortableRef.current = Sortable.create(listRef.current, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                handle: '.drag-handle', // Keep drag handle for groups since they don't have click functionality
                forceFallback: true,
                fallbackClass: 'sortable-fallback',
                onStart: (evt) => {
                    try {
                        const groupId = evt.item.getAttribute('data-group-id');
                        if (groupId && !isDragging) { // Only start if not already dragging
                            setIsDragging(true);
                            setDraggedItemId(groupId);
                        } else if (isDragging) {
                            // Cancel this drag if another is in progress
                            evt.preventDefault();
                            return false;
                        }
                    } catch (error) {
                        handleSortableError(error, 'onStart');
                    }
                },
                onEnd: (evt) => {
                    try {
                        const { oldIndex, newIndex } = evt;

                        // Reset drag state FIRST
                        setIsDragging(false);
                        setDraggedItemId(null);

                        if (oldIndex === undefined || newIndex === undefined) return;
                        if (oldIndex === newIndex) return; // No actual move

                        // Get the group ID from the dragged element
                        const groupId = evt.item.getAttribute('data-group-id');
                        if (!groupId) return;

                        // Call the debounced reorder handler
                        debouncedReorder(groupId, newIndex);
                    } catch (error) {
                        handleSortableError(error, 'onEnd');
                        // Ensure drag state is reset even on error
                        setIsDragging(false);
                        setDraggedItemId(null);
                    }
                }
            });
            isInitializedRef.current = true;
        } catch (error) {
            console.error('Error creating sortable instance:', error);
            isInitializedRef.current = false;
        }

        return () => {
            if (sortableRef.current) {
                try {
                    sortableRef.current.destroy();
                } catch (error) {
                    // Ignore errors during cleanup
                    console.warn('Error during sortable cleanup:', error);
                }
                sortableRef.current = null;
            }
            isInitializedRef.current = false;
            setIsDragging(false);
            setDraggedItemId(null);
        };
    }, [debouncedReorder, handleSortableError, isDragging]); // Re-added isDragging to allow recreation after drag ends

    // Separate effect to handle data changes after drag operations complete
    useEffect(() => {
        if (!isDragging && sortableRef.current && listRef.current && groups.length > 0) {
            // Force a recreation if groups have changed significantly after drag ends
            // This ensures the sortable instance stays in sync with React's virtual DOM
            const domElements = Array.from(listRef.current.children);
            const currentItems = domElements.map(el => el.getAttribute('data-group-id')).filter(Boolean);
            const expectedItems = groups.map(g => g.id);

            // Check if the DOM and data are out of sync
            const isOutOfSync = currentItems.length !== expectedItems.length ||
                currentItems.some((id, index) => id !== expectedItems[index]);

            if (isOutOfSync) {
                try {
                    sortableRef.current.destroy();
                    sortableRef.current = null;
                    isInitializedRef.current = false;
                } catch (error) {
                    console.warn('Error destroying out-of-sync sortable instance:', error);
                }
            }
        }
    }, [groups, isDragging]); // Only run when groups change and not dragging

    return (
        <div ref={listRef} className={`space-y-2 ${isDragging ? 'pointer-events-none' : ''}`}>
            {groups.map((group) => (
                <Card
                    key={group.id}
                    data-group-id={group.id}
                    className={`transition-all duration-200 ${draggedItemId === group.id ? 'opacity-50' : ''}`}
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
