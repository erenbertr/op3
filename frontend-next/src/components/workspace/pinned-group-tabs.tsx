"use client"

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { navigationUtils } from '@/lib/hooks/use-pathname';
import { useWorkspaces } from '@/lib/hooks/use-query-hooks';
import { useWorkspaceGroups } from '@/lib/hooks/use-workspace-groups';
import { apiClient } from '@/lib/api';

interface Workspace {
    id: string;
    name: string;
    templateType: string;
    workspaceRules: string;
    isActive: boolean;
    createdAt: string;
    groupId?: string | null;
    sortOrder?: number;
}

interface WorkspaceGroup {
    id: string;
    name: string;
    sortOrder: number;
    isPinned: boolean;
    createdAt: string;
    workspaceCount: number;
}

interface PinnedGroupTabsProps {
    userId: string;
    currentWorkspaceId: string | null;
    currentView?: string;
}

export function PinnedGroupTabs({ userId, currentWorkspaceId, currentView }: PinnedGroupTabsProps) {
    // Fetch workspace groups and workspaces
    const { data: groupsResult } = useWorkspaceGroups(userId);
    const { data: workspacesResult } = useWorkspaces(userId);

    const groups = React.useMemo(() => groupsResult?.groups || [], [groupsResult]);
    const workspaces = React.useMemo(() => workspacesResult?.workspaces || [], [workspacesResult]);

    // Filter only pinned groups and sort by sortOrder
    const pinnedGroups = React.useMemo(() =>
        groups.filter(group => group.isPinned).sort((a, b) => a.sortOrder - b.sortOrder),
        [groups]
    );

    // Drag and drop state for workspace tabs
    const [draggedWorkspaceId, setDraggedWorkspaceId] = useState<string | null>(null);
    const [dragOverWorkspaceId, setDragOverWorkspaceId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Group workspaces by group ID
    const groupedWorkspaces = React.useMemo(() => {
        const grouped: Record<string, Workspace[]> = {};
        workspaces.forEach(workspace => {
            if (workspace.groupId) {
                if (!grouped[workspace.groupId]) {
                    grouped[workspace.groupId] = [];
                }
                grouped[workspace.groupId].push(workspace);
            }
        });

        // Sort workspaces within each group by sortOrder
        Object.keys(grouped).forEach(groupId => {
            grouped[groupId].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        });

        return grouped;
    }, [workspaces]);

    const handleWorkspaceClick = useCallback(async (workspaceId: string) => {
        // Navigate immediately for smooth UX
        navigationUtils.pushState(`/ws/${workspaceId}`);
    }, []);

    const handleAddWorkspace = useCallback((groupId: string) => {
        // Navigate to add workspace page with the group pre-selected
        navigationUtils.pushState(`/add/workspace?groupId=${groupId}`);
    }, []);

    // Drag and drop handlers for workspace reordering within groups
    const handleWorkspaceDragStart = useCallback((e: React.DragEvent, workspaceId: string) => {
        setDraggedWorkspaceId(workspaceId);
        setIsDragging(true);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', workspaceId);

        // Add visual feedback
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '0.5';
        }
    }, []);

    const handleWorkspaceDragEnd = useCallback((e: React.DragEvent) => {
        setDraggedWorkspaceId(null);
        setDragOverWorkspaceId(null);

        // Reset visual feedback
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '1';
        }

        // Add a small delay before allowing clicks again
        setTimeout(() => {
            setIsDragging(false);
        }, 100);
    }, []);

    const handleWorkspaceDragOver = useCallback((e: React.DragEvent, workspaceId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverWorkspaceId(workspaceId);
    }, []);

    const handleWorkspaceDragLeave = useCallback((e: React.DragEvent) => {
        // Only clear if we're leaving the workspace tab entirely
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOverWorkspaceId(null);
        }
    }, []);

    const handleWorkspaceDrop = useCallback(async (e: React.DragEvent, targetWorkspaceId: string) => {
        e.preventDefault();
        const draggedWorkspaceId = e.dataTransfer.getData('text/plain');

        if (draggedWorkspaceId && draggedWorkspaceId !== targetWorkspaceId) {
            // Find the group that contains both workspaces
            const draggedWorkspace = workspaces.find(w => w.id === draggedWorkspaceId);
            const targetWorkspace = workspaces.find(w => w.id === targetWorkspaceId);

            if (draggedWorkspace && targetWorkspace && draggedWorkspace.groupId === targetWorkspace.groupId) {
                const groupId = draggedWorkspace.groupId;
                const groupWorkspaces = groupedWorkspaces[groupId!] || [];

                // Create new order array
                const newWorkspaces = [...groupWorkspaces];
                const draggedIndex = newWorkspaces.findIndex(w => w.id === draggedWorkspaceId);
                const targetIndex = newWorkspaces.findIndex(w => w.id === targetWorkspaceId);

                if (draggedIndex !== -1 && targetIndex !== -1) {
                    // Remove the dragged item
                    const [draggedWs] = newWorkspaces.splice(draggedIndex, 1);
                    // Insert it at the target position
                    newWorkspaces.splice(targetIndex, 0, draggedWs);

                    // Update sort orders and call API
                    const updates = newWorkspaces.map((workspace, index) => ({
                        workspaceId: workspace.id,
                        groupId: groupId,
                        sortOrder: index
                    }));

                    try {
                        await apiClient.batchUpdateWorkspaces(userId, updates);
                        // Note: Not calling invalidateQueries per user preference
                        // The UI will update on next data fetch
                    } catch (error) {
                        console.error('Error reordering workspaces:', error);
                    }
                }
            }
        }

        setDraggedWorkspaceId(null);
        setDragOverWorkspaceId(null);
    }, [workspaces, groupedWorkspaces, userId]);

    // Don't render anything if there are no pinned groups
    if (pinnedGroups.length === 0) {
        return null;
    }

    return (
        <div className="border-b bg-background">
            <div className="container mx-auto px-4">
                <div className="space-y-0">
                    {pinnedGroups.map((group, groupIndex) => {
                        const groupWorkspaces = groupedWorkspaces[group.id] || [];

                        return (
                            <div
                                key={group.id}
                                className={`flex items-center h-12 gap-1 overflow-x-auto transition-all select-none ${groupIndex > 0 ? 'border-t border-border' : ''
                                    }`}
                            >
                                {/* Group Name Label */}
                                <div className="px-3 py-2 text-sm font-medium text-muted-foreground pointer-events-none">
                                    {group.name}
                                </div>

                                {/* Workspace Tabs for this Group */}
                                {groupWorkspaces.map((workspace) => (
                                    <div
                                        key={workspace.id}
                                        draggable
                                        onDragStart={(e) => handleWorkspaceDragStart(e, workspace.id)}
                                        onDragEnd={handleWorkspaceDragEnd}
                                        onDragOver={(e) => handleWorkspaceDragOver(e, workspace.id)}
                                        onDragLeave={handleWorkspaceDragLeave}
                                        onDrop={(e) => handleWorkspaceDrop(e, workspace.id)}
                                        className={`relative transition-all ${draggedWorkspaceId === workspace.id ? 'opacity-50' : ''
                                            } ${dragOverWorkspaceId === workspace.id && draggedWorkspaceId !== workspace.id
                                                ? 'border-l-4 border-l-primary bg-primary/5'
                                                : ''
                                            }`}
                                        title={`${workspace.name} - Drag to reorder`}
                                    >
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                // Prevent navigation if we just finished dragging
                                                if (!isDragging) {
                                                    handleWorkspaceClick(workspace.id);
                                                }
                                            }}
                                            className={`h-10 px-3 rounded-t-md rounded-b-none border-b-2 transition-all select-none pointer-events-auto ${workspace.id === currentWorkspaceId && currentView === 'workspace'
                                                ? 'bg-primary/10 border-primary text-primary'
                                                : 'border-transparent hover:border-primary/50'
                                                }`}
                                            title={workspace.name}
                                        >
                                            <span className="text-sm font-medium truncate max-w-32 pointer-events-none">
                                                {workspace.name}
                                            </span>
                                        </Button>
                                    </div>
                                ))}

                                {/* Add Workspace Button */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        // Prevent action if we just finished dragging
                                        if (!isDragging) {
                                            handleAddWorkspace(group.id);
                                        }
                                    }}
                                    className="h-10 px-2 rounded-t-md rounded-b-none border-b-2 border-transparent hover:border-primary/50"
                                    title={`Add workspace to ${group.name}`}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
