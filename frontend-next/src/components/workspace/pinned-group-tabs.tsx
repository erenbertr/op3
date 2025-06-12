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

    // Drag and drop state
    const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null);
    const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
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

    // Drag and drop handlers for group reordering
    const handleGroupDragStart = useCallback((e: React.DragEvent, groupId: string) => {
        setDraggedGroupId(groupId);
        setIsDragging(true);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', groupId);

        // Add visual feedback
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '0.5';
        }
    }, []);

    const handleGroupDragEnd = useCallback((e: React.DragEvent) => {
        setDraggedGroupId(null);
        setDragOverGroupId(null);

        // Reset visual feedback
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '1';
        }

        // Add a small delay before allowing clicks again
        setTimeout(() => {
            setIsDragging(false);
        }, 100);
    }, []);

    const handleGroupDragOver = useCallback((e: React.DragEvent, groupId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverGroupId(groupId);
    }, []);

    const handleGroupDragLeave = useCallback((e: React.DragEvent) => {
        // Only clear if we're leaving the group entirely
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOverGroupId(null);
        }
    }, []);

    const handleGroupDrop = useCallback(async (e: React.DragEvent, targetGroupId: string) => {
        e.preventDefault();
        const draggedGroupId = e.dataTransfer.getData('text/plain');

        if (draggedGroupId && draggedGroupId !== targetGroupId) {
            // Create new order array
            const newGroups = [...pinnedGroups];
            const draggedIndex = newGroups.findIndex(g => g.id === draggedGroupId);
            const targetIndex = newGroups.findIndex(g => g.id === targetGroupId);

            if (draggedIndex !== -1 && targetIndex !== -1) {
                // Remove the dragged item
                const [draggedGroup] = newGroups.splice(draggedIndex, 1);
                // Insert it at the target position
                newGroups.splice(targetIndex, 0, draggedGroup);

                // Update sort orders and call API
                const groupOrders = newGroups.map((group, index) => ({
                    groupId: group.id,
                    sortOrder: index
                }));

                try {
                    await apiClient.reorderWorkspaceGroups(userId, groupOrders);
                    // Note: Not calling invalidateQueries per user preference
                    // The UI will update on next data fetch
                } catch (error) {
                    console.error('Error reordering groups:', error);
                }
            }
        }

        setDraggedGroupId(null);
        setDragOverGroupId(null);
    }, [pinnedGroups, userId]);

    // Don't render anything if there are no pinned groups
    if (pinnedGroups.length === 0) {
        return null;
    }

    return (
        <div className="border-b bg-background">
            <div className="container mx-auto px-4">
                <div className="space-y-0">
                    {pinnedGroups.map((group) => {
                        const groupWorkspaces = groupedWorkspaces[group.id] || [];

                        return (
                            <div
                                key={group.id}
                                draggable
                                onDragStart={(e) => handleGroupDragStart(e, group.id)}
                                onDragEnd={handleGroupDragEnd}
                                onDragOver={(e) => handleGroupDragOver(e, group.id)}
                                onDragLeave={handleGroupDragLeave}
                                onDrop={(e) => handleGroupDrop(e, group.id)}
                                className={`flex items-center h-12 gap-1 overflow-x-auto transition-all select-none ${draggedGroupId === group.id ? 'opacity-50' : ''
                                    } ${dragOverGroupId === group.id && draggedGroupId !== group.id
                                        ? 'border-t-4 border-t-primary bg-primary/5'
                                        : ''
                                    }`}
                                title={`${group.name} - Drag to reorder`}
                            >
                                {/* Group Name Label */}
                                <div className="px-3 py-2 text-sm font-medium text-muted-foreground border-r border-border pointer-events-none">
                                    {group.name}
                                </div>

                                {/* Workspace Tabs for this Group */}
                                {groupWorkspaces.map((workspace) => (
                                    <Button
                                        key={workspace.id}
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
                                        <span className="text-sm font-medium truncate max-w-32">
                                            {workspace.name}
                                        </span>
                                    </Button>
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
                                    className="h-10 px-2 rounded-t-md rounded-b-none border-b-2 border-transparent hover:border-primary/50 pointer-events-auto"
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
