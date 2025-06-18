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
import { Plus } from 'lucide-react';

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
    onWorkspaceManageFavorites: (workspaceId: string) => void;
    onWorkspaceMove: (workspaceId: string, newIndex: number, targetGroupId?: string | null) => void;
    onAddWorkspace?: (groupId: string | null) => void;
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
    onManageFavorites,
    isDragging,
}: {
    workspace: Workspace;
    isActive: boolean;
    onSelect: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onManageFavorites: () => void;
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
                onManageFavorites={onManageFavorites}
            />
        </div>
    );
}

// Add Workspace Card component
function AddWorkspaceCard({ groupId, onAddWorkspace }: { groupId: string | null; onAddWorkspace?: (groupId: string | null) => void }) {
    return (
        <div
            onClick={() => onAddWorkspace?.(groupId)}
            className="workspace-card-inner border border-dashed border-muted-foreground/30 rounded-lg p-4 cursor-pointer hover:border-primary transition-all opacity-60 hover:opacity-80"
        >
            <div className="flex flex-col items-center justify-center h-full min-h-[80px] text-muted-foreground select-none">
                <Plus className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium">Add Workspace</span>
            </div>
        </div>
    );
}

export function SortableWorkspaceList({
    workspaces,
    currentWorkspaceId,
    onWorkspaceSelect,
    onWorkspaceEdit,
    onWorkspaceDelete,
    onWorkspaceManageFavorites,
    onWorkspaceMove: _onWorkspaceMove, // Handled by parent DndContext
    onAddWorkspace,
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
                        onManageFavorites={() => onWorkspaceManageFavorites(workspace.id)}
                        isDragging={false}
                    />
                ))}

                {/* Add Workspace Card */}
                {onAddWorkspace && (
                    <AddWorkspaceCard
                        groupId={groupId}
                        onAddWorkspace={onAddWorkspace}
                    />
                )}

                {/* Always maintain a shadow element to prevent DOM errors and ensure droppability */}
                <div
                    className={`${workspaces.length === 0 ? 'h-20' : 'hidden'}`}
                    style={{ pointerEvents: 'none' }}
                />
            </div>
        </SortableContext>
    );
}