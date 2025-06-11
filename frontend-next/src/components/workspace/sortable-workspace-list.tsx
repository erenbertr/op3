"use client"

import React, { useRef, useEffect, useState } from 'react';
import Sortable from 'sortablejs';
import { WorkspaceCard } from './workspace-card';

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
    currentWorkspaceId?: string | null;
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

    const DISABLE_SORTABLE = false;
    const listRef = useRef<HTMLDivElement>(null);
    const sortableRef = useRef<Sortable | null>(null);
    const isInitializedRef = useRef(false);
    const [isDragging, setIsDragging] = useState(false);
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

    const isCrossGroupDragRef = useRef(false);
    const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Add a flag to prevent React updates during drag operations
    const isDragOperationRef = useRef(false);

    // Queue for pending move operations
    const pendingMoveRef = useRef<{
        workspaceId: string;
        newIndex: number;
        targetGroupId: string | null;
    } | null>(null);

    useEffect(() => {
        if (!listRef.current) return;

        if (DISABLE_SORTABLE) {
            console.log('SortableJS disabled for testing');
            return;
        }

        if (isDragging || isCrossGroupDragRef.current) {
            console.log('Skipping useEffect due to active drag operation');
            return;
        }

        if (sortableRef.current) {
            console.log('Sortable instance already exists, skipping');
            return;
        }

        try {
            sortableRef.current = Sortable.create(listRef.current, {
                group: 'shared', // Simple string like official example
                animation: 150,
                onStart: (evt) => {
                    console.log('DRAG START:', evt.item.getAttribute('data-workspace-id'));
                    isDragOperationRef.current = true;
                    setIsDragging(true);
                    setDraggedItemId(evt.item.getAttribute('data-workspace-id'));
                },
                onEnd: (evt) => {
                    console.log('DRAG END:', evt.oldIndex, '->', evt.newIndex, 'from:', evt.from, 'to:', evt.to);

                    const workspaceId = evt.item.getAttribute('data-workspace-id');
                    const isActualMove = evt.oldIndex !== evt.newIndex || evt.from !== evt.to;
                    const targetGroupId = evt.to.getAttribute('data-group-id') || null;

                    // Reset drag state immediately for UI responsiveness
                    setIsDragging(false);
                    setDraggedItemId(null);
                    isDragOperationRef.current = false;

                    // SOLUTION: Queue the move operation instead of calling immediately
                    if (isActualMove && workspaceId && evt.newIndex !== undefined) {
                        const newIndex = evt.newIndex;
                        console.log('QUEUING MOVE OPERATION:', workspaceId, 'to index:', newIndex, 'target group:', targetGroupId);

                        // Store the move operation to execute later
                        pendingMoveRef.current = {
                            workspaceId,
                            newIndex,
                            targetGroupId
                        };
                    }
                }
            });
            isInitializedRef.current = true;
            console.log('Sortable instance created successfully');
        } catch (error) {
            console.error('Error creating sortable instance:', error);
            isInitializedRef.current = false;
        }

        return () => {
            if (dragTimeoutRef.current) {
                clearTimeout(dragTimeoutRef.current);
                dragTimeoutRef.current = null;
            }

            if (sortableRef.current) {
                try {
                    sortableRef.current.destroy();
                } catch (error) {
                    console.warn('Error during sortable cleanup:', error);
                }
                sortableRef.current = null;
            }
            isInitializedRef.current = false;
            isCrossGroupDragRef.current = false;
            isDragOperationRef.current = false;
            setIsDragging(false);
            setDraggedItemId(null);
        };
    }, []);

    useEffect(() => {
        if (!isDragging && !isCrossGroupDragRef.current && !isDragOperationRef.current && sortableRef.current) {
            console.log('Workspaces changed, but sortable instance exists and no drag active');
        }
    }, [workspaces, isDragging]);

    // Process pending moves when drag operation is complete
    useEffect(() => {
        if (!isDragging && !isDragOperationRef.current && pendingMoveRef.current) {
            const move = pendingMoveRef.current;
            console.log('EXECUTING QUEUED MOVE:', move.workspaceId, 'to index:', move.newIndex, 'target group:', move.targetGroupId);

            // Clear the pending move first
            pendingMoveRef.current = null;

            // SOLUTION: Execute immediately - query invalidation is now disabled
            console.log('🚀 IMMEDIATE EXECUTION - no query invalidation conflicts');
            onWorkspaceMove(move.workspaceId, move.newIndex, move.targetGroupId);
        }
    }, [isDragging, onWorkspaceMove]);

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
                    className={`${draggedItemId === workspace.id ? 'opacity-50' : ''}`}
                >
                    <WorkspaceCard
                        workspace={workspace}
                        isActive={workspace.id === currentWorkspaceId}
                        onSelect={() => onWorkspaceSelect(workspace)}
                        onEdit={() => onWorkspaceEdit(workspace)}
                        onDelete={() => onWorkspaceDelete(workspace)}
                    />
                </div>
            ))}
        </div>
    );
}