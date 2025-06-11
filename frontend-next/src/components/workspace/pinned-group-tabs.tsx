"use client"

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { navigationUtils } from '@/lib/hooks/use-pathname';
import { useWorkspaces } from '@/lib/hooks/use-query-hooks';
import { useWorkspaceGroups } from '@/lib/hooks/use-workspace-groups';

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
    
    // Filter only pinned groups
    const pinnedGroups = groups.filter(group => group.isPinned);
    
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

    // Don't render anything if there are no pinned groups
    if (pinnedGroups.length === 0) {
        return null;
    }

    return (
        <div className="border-b bg-background">
            <div className="container mx-auto px-4">
                <div className="flex items-center h-12 gap-1 overflow-x-auto">
                    {pinnedGroups.map((group) => {
                        const groupWorkspaces = groupedWorkspaces[group.id] || [];
                        
                        return (
                            <div key={group.id} className="flex items-center gap-1 flex-shrink-0">
                                {/* Group Name Label */}
                                <div className="px-3 py-2 text-sm font-medium text-muted-foreground border-r border-border">
                                    {group.name}
                                </div>
                                
                                {/* Workspace Tabs for this Group */}
                                {groupWorkspaces.map((workspace) => (
                                    <Button
                                        key={workspace.id}
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleWorkspaceClick(workspace.id)}
                                        className={`h-10 px-3 rounded-t-md rounded-b-none border-b-2 transition-all select-none ${
                                            workspace.id === currentWorkspaceId && currentView === 'workspace'
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
                                    onClick={() => handleAddWorkspace(group.id)}
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
