"use client"

import React, { useRef, useEffect } from 'react';
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

    useEffect(() => {
        if (!listRef.current) return;

        // Destroy existing sortable instance
        if (sortableRef.current) {
            sortableRef.current.destroy();
        }

        // Create new sortable instance
        sortableRef.current = Sortable.create(listRef.current, {
            group: 'workspaces',
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            forceFallback: true,
            fallbackClass: 'sortable-fallback',
            fallbackOnBody: true,
            swapThreshold: 0.65,
            onEnd: (evt) => {
                const { oldIndex, newIndex, from, to } = evt;
                
                if (oldIndex === undefined || newIndex === undefined) return;
                
                // Get the workspace ID from the dragged element
                const workspaceId = evt.item.getAttribute('data-workspace-id');
                if (!workspaceId) return;

                // Determine target group ID from the container
                const targetGroupId = to.getAttribute('data-group-id') || null;
                
                // Call the move handler
                onWorkspaceMove(workspaceId, newIndex, targetGroupId);
            }
        });

        return () => {
            if (sortableRef.current) {
                sortableRef.current.destroy();
                sortableRef.current = null;
            }
        };
    }, [onWorkspaceMove]);

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
                    className="workspace-card"
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
            {workspaces.length === 0 && (
                <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
                    {placeholder}
                </div>
            )}
        </div>
    );
}
