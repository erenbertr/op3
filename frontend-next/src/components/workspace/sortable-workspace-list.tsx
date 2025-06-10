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
    placeholder?: string;
}

export function SortableWorkspaceList({
    workspaces,
    currentWorkspaceId,
    onWorkspaceSelect,
    onWorkspaceEdit,
    onWorkspaceDelete,
    onWorkspaceMove,
    groupId = null,
    className = "",
    placeholder = "Drop workspaces here"
}: SortableWorkspaceListProps) {
    const listRef = useRef<HTMLDivElement>(null);
    const sortableRef = useRef<Sortable | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

    // Debounced move handler to prevent rapid successive operations
    const debouncedMove = useCallback(
        debounce((workspaceId: string, newIndex: number, targetGroupId: string | null) => {
            onWorkspaceMove(workspaceId, newIndex, targetGroupId);
        }, 100),
        [onWorkspaceMove]
    );

    useEffect(() => {
        if (!listRef.current) return;

        // Destroy existing sortable instance
        if (sortableRef.current) {
            sortableRef.current.destroy();
            sortableRef.current = null;
        }

        // Create new sortable instance
        sortableRef.current = Sortable.create(listRef.current, {
            group: 'workspaces',
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            handle: '.drag-handle', // Only allow dragging from the drag handle
            forceFallback: true,
            fallbackClass: 'sortable-fallback',
            fallbackOnBody: true,
            swapThreshold: 0.65,
            disabled: isDragging, // Prevent multiple simultaneous drags
            onStart: (evt) => {
                const workspaceId = evt.item.getAttribute('data-workspace-id');
                if (workspaceId) {
                    setIsDragging(true);
                    setDraggedItemId(workspaceId);
                }
            },
            onEnd: (evt) => {
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
            }
        });

        return () => {
            if (sortableRef.current) {
                sortableRef.current.destroy();
                sortableRef.current = null;
            }
            setIsDragging(false);
            setDraggedItemId(null);
        };
    }, [workspaces, onWorkspaceMove, isDragging, debouncedMove]); // Include workspaces in dependencies

    return (
        <div
            ref={listRef}
            data-group-id={groupId}
            className={`workspace-grid min-h-[100px] p-4 rounded-lg border-2 border-dashed transition-all ${className} ${isDragging ? 'pointer-events-none' : ''}`}
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
                        isDragging={isDragging}
                    />
                </div>
            ))}
            {workspaces.length === 0 && (
                <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
                    {placeholder}
                </div>
            )}
        </div>
    );
}
