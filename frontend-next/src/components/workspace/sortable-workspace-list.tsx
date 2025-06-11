"use client"

import React, { useState } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
    DragOverlay,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
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
    onWorkspaceMove,
    groupId = null,
    className = ""
}: SortableWorkspaceListProps) {
    const [activeId, setActiveId] = useState<string | null>(null);

    // Configure sensors for drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Handle drag start
    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
        console.log('DRAG START:', event.active.id);
    };

    // Handle drag over (for cross-group drops)
    const handleDragOver = (event: DragOverEvent) => {
        // This allows dropping between different groups
        const { active, over } = event;

        if (!over) return;

        // If dropping over a different container, we'll handle it in dragEnd
        console.log('DRAG OVER:', active.id, 'over:', over.id);
    };

    // Handle drag end
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        setActiveId(null);

        if (!over) {
            console.log('DRAG END: No drop target');
            return;
        }

        const activeId = active.id as string;
        const overId = over.id as string;

        console.log('DRAG END:', activeId, 'to:', overId);

        // Find the workspace being dragged
        const activeWorkspace = workspaces.find(w => w.id === activeId);
        if (!activeWorkspace) return;

        // Determine target group and new index
        let targetGroupId = groupId;
        let newIndex = 0;

        // If dropping over another workspace, find its position
        const overWorkspace = workspaces.find(w => w.id === overId);
        if (overWorkspace) {
            newIndex = workspaces.findIndex(w => w.id === overId);
            targetGroupId = overWorkspace.groupId || null;
        } else {
            // If dropping over the container itself, add to end
            newIndex = workspaces.length;
        }

        // Only move if position or group changed
        const currentIndex = workspaces.findIndex(w => w.id === activeId);
        const currentGroupId = activeWorkspace.groupId || null;

        if (currentIndex !== newIndex || currentGroupId !== targetGroupId) {
            console.log('Moving workspace:', activeId, 'to index:', newIndex, 'target group:', targetGroupId);
            onWorkspaceMove(activeId, newIndex, targetGroupId);
        }
    };

    // Get workspace IDs for sortable context
    const workspaceIds = workspaces.map(w => w.id);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={workspaceIds} strategy={verticalListSortingStrategy}>
                <div
                    data-group-id={groupId}
                    className={`workspace-grid min-h-[100px] p-4 rounded-lg border-2 border-dashed transition-all ${className}`}
                >
                    {workspaces.map((workspace) => (
                        <SortableWorkspaceItem
                            key={workspace.id}
                            workspace={workspace}
                            isActive={workspace.id === currentWorkspaceId}
                            onSelect={() => onWorkspaceSelect(workspace)}
                            onEdit={() => onWorkspaceEdit(workspace)}
                            onDelete={() => onWorkspaceDelete(workspace)}
                            isDragging={activeId === workspace.id}
                        />
                    ))}
                </div>
            </SortableContext>

            <DragOverlay>
                {activeId ? (
                    <div className="opacity-80">
                        <WorkspaceCard
                            workspace={workspaces.find(w => w.id === activeId)!}
                            isActive={false}
                            onSelect={() => { }}
                            onEdit={() => { }}
                            onDelete={() => { }}
                        />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}