"use client"

import React from 'react';
import {
    SortableContext,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
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

// Sortable workspace item component
function SortableWorkspaceItem({
    workspace,
    isActive,
    onSelect,
    onEdit,
    onDelete,
    isDragging,
}: {
    workspace: Workspace;
    isActive: boolean;
    onSelect: () => void;
    onEdit: () => void;
    onDelete: () => void;
    isDragging: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging: isSortableDragging,
    } = useSortable({ id: workspace.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging || isSortableDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            data-workspace-id={workspace.id}
        >
            <WorkspaceCard
                workspace={workspace}
                isActive={isActive}
                onSelect={onSelect}
                onEdit={onEdit}
                onDelete={onDelete}
            />
        </div>
    );
}

export function SortableWorkspaceList({
    workspaces,
    currentWorkspaceId,
    onWorkspaceSelect,
    onWorkspaceEdit,
    onWorkspaceDelete,
    onWorkspaceMove: _onWorkspaceMove, // Handled by parent DndContext
    groupId = null,
    className = ""
}: SortableWorkspaceListProps) {
    // Get workspace IDs for sortable context
    const workspaceIds = workspaces.map(w => w.id);

    // Make this container droppable
    const droppableId = `droppable-${groupId || 'ungrouped'}`;
    const { setNodeRef, isOver } = useDroppable({
        id: droppableId,
        data: {
            type: 'container',
            groupId: groupId
        }
    });



    return (
        <SortableContext items={workspaceIds} strategy={rectSortingStrategy}>
            <div
                ref={setNodeRef}
                id={droppableId}
                data-group-id={groupId}
                className={`workspace-grid min-h-[100px] p-4 rounded-lg border-2 border-dashed transition-all ${className} ${isOver ? 'border-primary bg-primary/5' : ''
                    }`}
            >
                {workspaces.map((workspace) => (
                    <SortableWorkspaceItem
                        key={workspace.id}
                        workspace={workspace}
                        isActive={workspace.id === currentWorkspaceId}
                        onSelect={() => onWorkspaceSelect(workspace)}
                        onEdit={() => onWorkspaceEdit(workspace)}
                        onDelete={() => onWorkspaceDelete(workspace)}
                        isDragging={false}
                    />
                ))}

                {/* Always maintain a shadow element to prevent DOM errors and ensure droppability */}
                <div
                    className={`${workspaces.length === 0 ? 'h-20' : 'hidden'}`}
                    style={{ pointerEvents: 'none' }}
                />
            </div>
        </SortableContext>
    );
}