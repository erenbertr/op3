"use client"

import React, { useRef, useEffect, useState, useCallback } from 'react';
import Sortable from 'sortablejs';
import { WorkspaceCard } from './workspace-card';

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
    let timeout: NodeJS.Timeout;
    return ((...args: any[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    }) as T;
}

interface Workspace {
    id: string;
    name: string;
    templateType: string;
    workspaceRules: string;
    isActive: boolean;
    groupId?: string | null;
    sortOrder?: number;
    createdAt: string;
}

interface SortableWorkspaceListProps {
    workspaces: Workspace[];
    currentWorkspaceId?: string;
    onWorkspaceSelect: (workspace: Workspace) => void;
    onWorkspaceEdit: (workspace: Workspace) => void;
    onWorkspaceDelete: (workspace: Workspace) => void;
    onWorkspaceMove: (workspaceId: string, newIndex: number, targetGroupId?: string | null) => void;
    groupId?: string | null;
    className?: string;
}

export function SortableWorkspaceList({
    workspaces,
    currentWorkspaceId,
    onWorkspaceSelect,
    onWorkspaceEdit,
    onWorkspaceDelete,
    onWorkspaceMove,
    groupId = null,
    className = ""
}: SortableWorkspaceListProps) {
    const listRef = useRef<HTMLDivElement>(null);
    const sortableRef = useRef<Sortable | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

    // Add error boundary for sortable operations
    const handleSortableError = useCallback((error: any, operation: string) => {
        console.warn(`SortableJS ${operation} error (safely handled):`, error);
        // Reset drag state on any error
        setIsDragging(false);
        setDraggedItemId(null);
    }, []);

    // Debounced move handler to prevent rapid successive operations
    const debouncedMove = useCallback(
        debounce((workspaceId: string, newIndex: number, targetGroupId: string | null) => {
            onWorkspaceMove(workspaceId, newIndex, targetGroupId);
        }, 100),
        [onWorkspaceMove]
    );

    useEffect(() => {
        if (!listRef.current) return;

        // Don't recreate sortable instance if one already exists and we're not dragging
        // This prevents interrupting ongoing drag operations
        if (sortableRef.current && !isDragging) {
            return;
        }

        // Only destroy if we're not currently dragging
        if (sortableRef.current && !isDragging) {
            try {
                sortableRef.current.destroy();
            } catch (error) {
                // Ignore errors during destroy - the instance might already be invalid
                console.warn('Error destroying sortable instance:', error);
            }
            sortableRef.current = null;
        }

        // Don't create new instance if we're currently dragging
        if (isDragging) return;

        // Create new sortable instance
        try {
            sortableRef.current = Sortable.create(listRef.current, {
                group: {
                    name: 'workspaces',
                    pull: true, // Allow items to be pulled from this list
                    put: true   // Allow items to be put into this list
                },
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                forceFallback: true,
                fallbackClass: 'sortable-fallback',
                fallbackOnBody: true,
                swapThreshold: 0.65,
                // Remove delay to make dragging more responsive
                dragoverBubble: false, // Prevent dragover events from bubbling
                dropBubble: false,     // Prevent drop events from bubbling
                onStart: (evt) => {
                    try {
                        const workspaceId = evt.item.getAttribute('data-workspace-id');
                        if (workspaceId) {
                            setIsDragging(true);
                            setDraggedItemId(workspaceId);
                        }
                    } catch (error) {
                        handleSortableError(error, 'onStart');
                    }
                },
                onEnd: (evt) => {
                    try {
                        const { oldIndex, newIndex, from, to } = evt;

                        // Reset drag state
                        setIsDragging(false);
                        setDraggedItemId(null);

                        if (oldIndex === undefined || newIndex === undefined) return;
                        if (oldIndex === newIndex && from === to) return; // No actual move

                        // Get the workspace ID from the dragged element
                        const workspaceId = evt.item.getAttribute('data-workspace-id');
                        if (!workspaceId) return;

                        // Determine target group ID from the container
                        const targetGroupId = to.getAttribute('data-group-id') || null;

                        // Call the debounced move handler
                        debouncedMove(workspaceId, newIndex, targetGroupId);
                    } catch (error) {
                        handleSortableError(error, 'onEnd');
                    }
                }
            });
        } catch (error) {
            console.error('Error creating sortable instance:', error);
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
            setIsDragging(false);
            setDraggedItemId(null);
        };
    }, [debouncedMove, isDragging, handleSortableError]); // Removed workspaces and onWorkspaceMove from dependencies

    return (
        <div
            ref={listRef}
            data-group-id={groupId}
            className={`workspace-grid min-h-[100px] p-4 rounded-lg border-2 border-dashed transition-all ${className}`}
        >
            {workspaces.map((workspace) => (
                <div
                    key={workspace.id}
                    data-workspace-id={workspace.id}
                    className={`workspace-card ${draggedItemId === workspace.id ? 'opacity-50' : ''}`}
                >
                    <WorkspaceCard
                        workspace={workspace}
                        onSelect={onWorkspaceSelect}
                        onEdit={onWorkspaceEdit}
                        onDelete={onWorkspaceDelete}
                        isActive={workspace.id === currentWorkspaceId}
                    />
                </div>
            ))}

        </div>
    );
}
