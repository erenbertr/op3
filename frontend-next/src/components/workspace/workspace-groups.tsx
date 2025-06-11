"use client"

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { Plus, Settings2, Loader2 } from 'lucide-react';
import { useWorkspaces, useUpdateWorkspace, useDeleteWorkspace } from '@/lib/hooks/use-query-hooks';
import {
    useWorkspaceGroups,
    useMoveWorkspaceToGroupOptimistic,
} from '@/lib/hooks/use-workspace-groups';
import { WorkspaceGroupCard } from './workspace-group-card';
import { CreateGroupDialog } from './create-group-dialog';
import { OrganizeGroupsDialog } from './organize-groups-dialog';
import { SortableWorkspaceList } from './sortable-workspace-list';

import { navigationUtils } from '@/lib/hooks/use-pathname';
import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    rectIntersection,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';


// Helper type, can be moved to a types file if needed
type Workspace = {
    id: string;
    name: string;
    templateType: string;
    workspaceRules: string;
    isActive: boolean;
    createdAt: string;
    groupId?: string | null;
    sortOrder?: number;
};

interface WorkspaceGroupsProps {
    userId: string;
    onWorkspaceSelect: (workspaceId: string) => void;
    currentWorkspaceId?: string | null;
    openWorkspace?: ((workspaceId: string) => void) | null;
    onWorkspaceUpdated: () => void;
    onWorkspaceDeleted: () => void;
}

export function WorkspaceGroups({
    userId,
    onWorkspaceSelect,
    currentWorkspaceId,
    openWorkspace,
    onWorkspaceUpdated,
    onWorkspaceDeleted
}: WorkspaceGroupsProps) {
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showOrganizeGroups, setShowOrganizeGroups] = useState(false);
    const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
    const [deletingWorkspaceId, setDeletingWorkspaceId] = useState<string | null>(null);
    const [error, setError] = useState('');



    // Configure sensors for drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Note: Removed constrained drag to allow free movement during dragging



    // Queries with debugging
    const { data: workspacesResult, isLoading: workspacesLoading, dataUpdatedAt } = useWorkspaces(userId, 'WorkspaceGroups');
    const { data: groupsResult, isLoading: groupsLoading } = useWorkspaceGroups(userId);

    // CRITICAL DEBUG: Track when React Query refetches data
    console.log('🔄 REACT QUERY DEBUG:', {
        dataUpdatedAt: new Date(dataUpdatedAt).toISOString(),
        workspacesLoading,
        timestamp: new Date().toISOString()
    });

    // Mutations
    const moveWorkspaceMutation = useMoveWorkspaceToGroupOptimistic();
    const updateWorkspaceMutation = useUpdateWorkspace();
    const deleteWorkspaceMutation = useDeleteWorkspace();

    const serverWorkspaces = useMemo(() => workspacesResult?.workspaces || [], [workspacesResult]);
    const groups = useMemo(() => groupsResult?.groups || [], [groupsResult]);

    // Local state for drag and drop - completely independent from server data after initialization
    const [localWorkspaces, setLocalWorkspacesRaw] = useState<Workspace[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [hasLocalChanges, setHasLocalChanges] = useState(false);
    const [dragProtectionTimeout, setDragProtectionTimeout] = useState<NodeJS.Timeout | null>(null);

    // Wrap setLocalWorkspaces with ENHANCED debugging
    const setLocalWorkspaces = useCallback((newWorkspaces: Workspace[] | ((prev: Workspace[]) => Workspace[])) => {
        console.log('🔧 setLocalWorkspaces called!');
        console.log('🔍 Current state context:', {
            isInitialized,
            isDragging,
            hasLocalChanges,
            timestamp: new Date().toISOString()
        });
        console.trace('📍 Call stack trace:');

        if (typeof newWorkspaces === 'function') {
            setLocalWorkspacesRaw(prev => {
                const result = newWorkspaces(prev);
                console.log('📝 setLocalWorkspaces (function):', {
                    before: prev.map(w => `${w.id}:${w.name}`),
                    after: result.map(w => `${w.id}:${w.name}`),
                    context: { isInitialized, isDragging, hasLocalChanges }
                });

                // 🚨 CRITICAL: Detect if this is an unwanted reversion
                if (prev.length > 0 && result.length > 0) {
                    const beforeIds = prev.map(w => w.id).join(',');
                    const afterIds = result.map(w => w.id).join(',');
                    if (beforeIds !== afterIds && hasLocalChanges) {
                        console.error('🚨 POTENTIAL UNWANTED REVERSION DETECTED!');
                        console.error('- We have local changes but state is being overwritten');
                        console.error('- This might be the source of the bug!');
                    }
                }

                return result;
            });
        } else {
            console.log('📝 setLocalWorkspaces (direct):', {
                newOrder: newWorkspaces.map(w => `${w.id}:${w.name}`),
                context: { isInitialized, isDragging, hasLocalChanges }
            });

            // 🚨 CRITICAL: Detect if this is an unwanted reversion
            if (localWorkspaces.length > 0 && newWorkspaces.length > 0) {
                const currentIds = localWorkspaces.map(w => w.id).join(',');
                const newIds = newWorkspaces.map(w => w.id).join(',');
                if (currentIds !== newIds && hasLocalChanges) {
                    console.error('🚨 POTENTIAL UNWANTED REVERSION DETECTED!');
                    console.error('- We have local changes but state is being overwritten');
                    console.error('- This might be the source of the bug!');
                }
            }

            setLocalWorkspacesRaw(newWorkspaces);
        }
    }, [isInitialized, isDragging, hasLocalChanges, localWorkspaces]);

    // Debug: Log when server workspaces change
    console.log('🔍 Server workspaces changed:', {
        serverWorkspacesLength: serverWorkspaces.length,
        localWorkspacesLength: localWorkspaces.length,
        isInitialized,
        isDragging,
        timestamp: new Date().toISOString()
    });

    // DEEP DEBUG: Track every render and what triggers it
    console.log('🔬 DEEP DEBUG - Component render:', {
        serverWorkspaces: serverWorkspaces.map(w => `${w.id}:${w.name}`),
        localWorkspaces: localWorkspaces.map(w => `${w.id}:${w.name}`),
        areEqual: JSON.stringify(serverWorkspaces) === JSON.stringify(localWorkspaces),
        timestamp: new Date().toISOString()
    });

    // Initialize local workspaces ONLY ONCE when server data first loads
    if (!isInitialized && serverWorkspaces.length > 0) {
        console.log('� ONE-TIME initialization of local workspaces from server data');
        console.log('📝 Server workspaces:', serverWorkspaces.map(w => `${w.id}:${w.name}:${w.groupId}`));
        setLocalWorkspaces(serverWorkspaces);
        setIsInitialized(true);
    }

    // AGGRESSIVE PROTECTION: Completely disable server sync during and after drag operations
    // Clear any existing timeout when dragging starts
    if (isDragging && dragProtectionTimeout) {
        clearTimeout(dragProtectionTimeout);
        setDragProtectionTimeout(null);
    }

    // Set protection timeout when dragging ends
    if (!isDragging && dragProtectionTimeout === null && hasLocalChanges) {
        const timeout = setTimeout(() => {
            console.log('⏰ DRAG PROTECTION TIMEOUT: Allowing server sync again');
            setHasLocalChanges(false);
            setDragProtectionTimeout(null);
        }, 5000); // 5 second protection after drag ends
        setDragProtectionTimeout(timeout);
    }

    // CRITICAL FIX: Only sync from server when we don't have local changes AND no drag protection
    if (isInitialized && serverWorkspaces.length > 0 && !hasLocalChanges && !isDragging && !dragProtectionTimeout) {
        const serverIds = serverWorkspaces.map(w => w.id).join(',');
        const localIds = localWorkspaces.map(w => w.id).join(',');

        // Only update if server has different data AND we don't have pending changes
        if (serverIds !== localIds) {
            console.log('🔄 SAFE SYNC: Updating local state from server (no local changes, no protection)');
            setLocalWorkspaces(serverWorkspaces);
        }
    }

    // Track if we have pending local changes that shouldn't be overwritten
    useEffect(() => {
        if (isInitialized && serverWorkspaces.length > 0 && !isDragging) {
            const serverIds = serverWorkspaces.map(w => w.id).join(',');
            const localIds = localWorkspaces.map(w => w.id).join(',');

            // If server and local are different, we have local changes
            if (serverIds !== localIds) {
                setHasLocalChanges(true);
                console.log('🔒 BLOCKING server overwrite - we have local changes');
            } else if (hasLocalChanges) {
                // Server caught up with our changes, safe to sync again
                setHasLocalChanges(false);
                console.log('🔓 ALLOWING server updates - server caught up');
            }
        }
    }, [serverWorkspaces, localWorkspaces, isInitialized, isDragging, hasLocalChanges]);

    // CRITICAL DEBUG: Check if server data is overwriting local changes
    if (isInitialized && serverWorkspaces.length > 0 && !isDragging) {
        const serverIds = serverWorkspaces.map(w => w.id).join(',');
        const localIds = localWorkspaces.map(w => w.id).join(',');

        if (serverIds !== localIds) {
            console.log('⚠️ POTENTIAL OVERWRITE DETECTED:');
            console.log('📝 Server order:', serverWorkspaces.map(w => `${w.id}:${w.name}`));
            console.log('📝 Local order:', localWorkspaces.map(w => `${w.id}:${w.name}`));
            console.log('🔍 This might be causing the reversion!');

            // CRITICAL: Check if this is happening right after a successful API call
            console.log('🚨 REVERSION ANALYSIS:');
            console.log('- Is this happening after drag end?');
            console.log('- Is React Query refetching old data?');
            console.log('- Are we accidentally resetting local state somewhere?');
        }
    }

    // Organize workspaces by groups (using localWorkspaces for real-time updates)
    const { groupedWorkspaces, ungroupedWorkspaces } = useMemo(() => {
        const grouped: Record<string, typeof localWorkspaces> = {};
        const ungrouped: typeof localWorkspaces = [];

        localWorkspaces.forEach(workspace => {
            if (workspace.groupId && groups.find(g => g.id === workspace.groupId)) {
                if (!grouped[workspace.groupId]) {
                    grouped[workspace.groupId] = [];
                }
                grouped[workspace.groupId].push(workspace);
            } else {
                ungrouped.push(workspace);
            }
        });

        // Sort workspaces within each group by sortOrder
        Object.keys(grouped).forEach(groupId => {
            grouped[groupId].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        });

        ungrouped.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        return {
            groupedWorkspaces: grouped,
            ungroupedWorkspaces: ungrouped
        };
    }, [localWorkspaces, groups]);

    // Global drag handlers for cross-group dragging
    const handleDragStart = (event: DragStartEvent) => {
        setIsDragging(true);
        console.log('Global drag started:', event.active.id);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        console.log('🔄 DRAG OVER:', activeId, '→', overId);

        // Find the active workspace
        const activeWorkspace = localWorkspaces.find(w => w.id === activeId);
        if (!activeWorkspace) {
            console.log('❌ Active workspace not found:', activeId);
            return;
        }

        // Check if we're dropping on a container (empty group)
        if (overId.startsWith('droppable-')) {
            console.log('📦 Dropping on container:', overId);

            // Extract group ID from container ID
            const targetGroupId = overId === 'droppable-ungrouped' ? null : overId.replace('droppable-', '');
            const activeGroupId = activeWorkspace.groupId;

            console.log('📊 Container drop - Groups:', { activeGroupId, targetGroupId });

            // If moving to a different group, update the workspace
            if (activeGroupId !== targetGroupId) {
                console.log('🔄 Moving to different group via container');
                setLocalWorkspaces(prev => {
                    const newWorkspaces = [...prev];
                    const activeIndex = newWorkspaces.findIndex(w => w.id === activeId);
                    if (activeIndex !== -1) {
                        console.log('📝 Updating workspace group:', activeId, 'from', activeGroupId, 'to', targetGroupId);
                        newWorkspaces[activeIndex] = { ...newWorkspaces[activeIndex], groupId: targetGroupId };
                    }
                    return newWorkspaces;
                });
            }
            return;
        }

        // Find the over workspace (existing logic for workspace-to-workspace drops)
        const overWorkspace = localWorkspaces.find(w => w.id === overId);
        if (!overWorkspace) {
            console.log('❌ Over workspace not found:', overId);
            return;
        }

        // If they're the same, no need to do anything
        if (activeId === overId) {
            console.log('⏭️ Same workspace, skipping');
            return;
        }

        const activeGroupId = activeWorkspace.groupId;
        const overGroupId = overWorkspace.groupId;

        console.log('📊 Groups:', { activeGroupId, overGroupId });

        // If moving within the same group, reorder
        if (activeGroupId === overGroupId) {
            console.log('🔄 Same group move');
            // Get all workspaces in this group
            const groupWorkspaces = localWorkspaces.filter(w => w.groupId === activeGroupId);
            const activeIndex = groupWorkspaces.findIndex(w => w.id === activeId);
            const overIndex = groupWorkspaces.findIndex(w => w.id === overId);

            console.log('📍 Indices:', { activeIndex, overIndex });

            if (activeIndex !== overIndex) {
                console.log('✅ Reordering within group with arrayMove');
                // Reorder within the group
                const reorderedGroupWorkspaces = arrayMove(groupWorkspaces, activeIndex, overIndex);

                console.log('📝 Before reorder:', groupWorkspaces.map(w => `${w.id}:${w.name}`));
                console.log('📝 After reorder:', reorderedGroupWorkspaces.map(w => `${w.id}:${w.name}`));

                // Update the local workspaces with the new order
                setLocalWorkspaces(prev => {
                    const newWorkspaces = [...prev];
                    // Remove all workspaces from this group
                    const otherWorkspaces = newWorkspaces.filter(w => w.groupId !== activeGroupId);
                    // Add back the reordered group workspaces
                    const result = [...otherWorkspaces, ...reorderedGroupWorkspaces];
                    console.log('🔄 Updated local workspaces:', result.map(w => `${w.id}:${w.name}:${w.groupId}`));
                    return result;
                });
            } else {
                console.log('⏭️ Same position, no reorder needed');
            }
        } else {
            console.log('🔄 Cross-group move');
            // Moving between different groups
            // Move the workspace to the new group at the position of the over workspace

            setLocalWorkspaces(prev => {
                const newWorkspaces = [...prev];
                // Find and update the active workspace's group
                const activeIndex = newWorkspaces.findIndex(w => w.id === activeId);
                if (activeIndex !== -1) {
                    console.log('📝 Updating workspace group:', activeId, 'from', activeGroupId, 'to', overGroupId);
                    newWorkspaces[activeIndex] = { ...newWorkspaces[activeIndex], groupId: overGroupId };
                }

                // Reorder within the target group
                const updatedGroupWorkspaces = newWorkspaces.filter(w => w.groupId === overGroupId);
                const newActiveIndex = updatedGroupWorkspaces.findIndex(w => w.id === activeId);
                const newOverIndex = updatedGroupWorkspaces.findIndex(w => w.id === overId);

                console.log('📍 Cross-group indices:', { newActiveIndex, newOverIndex });

                if (newActiveIndex !== -1 && newOverIndex !== -1) {
                    console.log('✅ Reordering within target group');
                    const reorderedGroupWorkspaces = arrayMove(updatedGroupWorkspaces, newActiveIndex, newOverIndex);
                    // Update the full workspace list
                    const otherWorkspaces = newWorkspaces.filter(w => w.groupId !== overGroupId);
                    const result = [...otherWorkspaces, ...reorderedGroupWorkspaces];
                    console.log('🔄 Updated local workspaces (cross-group):', result.map(w => `${w.id}:${w.name}:${w.groupId}`));
                    return result;
                }

                console.log('🔄 Updated local workspaces (group change only):', newWorkspaces.map(w => `${w.id}:${w.name}:${w.groupId}`));
                return newWorkspaces;
            });
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        console.log('🏁 DRAG END:', active.id, '→', over?.id || 'NO TARGET');

        setIsDragging(false);

        if (!over) {
            console.log('❌ No drop target - keeping current local state');
            // Don't reset to server state - keep the current local state
            return;
        }

        const activeId = active.id as string;
        const overId = over.id as string;

        // If dropping on itself, no change needed
        if (activeId === overId) {
            console.log('⏭️ Dropped on itself, no change needed');
            return;
        }

        // Find the workspace being dragged
        const activeWorkspace = localWorkspaces.find(w => w.id === activeId);
        if (!activeWorkspace) {
            console.log('❌ Active workspace not found:', activeId);
            return;
        }

        let targetGroupId: string | null;
        let finalIndex: number;

        // Check if we're dropping on a container (empty group)
        if (overId.startsWith('droppable-')) {
            console.log('📦 Dropped on container:', overId);

            // Extract group ID from container ID
            targetGroupId = overId === 'droppable-ungrouped' ? null : overId.replace('droppable-', '');

            // For container drops, place at the end of the target group
            const targetWorkspaces = targetGroupId
                ? localWorkspaces.filter(w => w.groupId === targetGroupId)
                : localWorkspaces.filter(w => !w.groupId);

            finalIndex = targetWorkspaces.length;
            console.log('📍 Container drop - placing at end of group, index:', finalIndex);
        } else {
            // Find the target workspace (existing logic for workspace-to-workspace drops)
            const overWorkspace = localWorkspaces.find(w => w.id === overId);
            if (!overWorkspace) {
                console.log('❌ Over workspace not found:', overId);
                return;
            }

            targetGroupId = overWorkspace.groupId || null;

            // Get the final position from the current local state (after all drag over operations)
            const targetWorkspaces = targetGroupId
                ? localWorkspaces.filter(w => w.groupId === targetGroupId)
                : localWorkspaces.filter(w => !w.groupId);

            console.log('🎯 Target group workspaces:', targetWorkspaces.map(w => `${w.id}:${w.name}`));

            // Find the current position of the active workspace in the target group
            finalIndex = targetWorkspaces.findIndex(w => w.id === activeId);

            console.log('📍 Final index of dragged workspace:', finalIndex);

            if (finalIndex === -1) {
                console.log('❌ Could not find final position of dragged workspace');
                // Keep current local state instead of resetting to server state
                return;
            }
        }

        const currentGroupId = activeWorkspace.groupId || null;

        console.log('📊 Group change:', currentGroupId, '→', targetGroupId);

        // Only make API call if there's an actual change
        const originalActiveWorkspace = serverWorkspaces.find(w => w.id === activeId);
        const hasGroupChanged = currentGroupId !== targetGroupId;
        const originalIndex = originalActiveWorkspace ?
            (targetGroupId
                ? serverWorkspaces.filter(w => w.groupId === targetGroupId).findIndex(w => w.id === activeId)
                : serverWorkspaces.filter(w => !w.groupId).findIndex(w => w.id === activeId)
            ) : -1;
        const hasPositionChanged = finalIndex !== originalIndex;

        console.log('🔍 Change detection:', {
            hasGroupChanged,
            hasPositionChanged,
            originalIndex,
            finalIndex,
            currentGroupId,
            targetGroupId
        });

        if (hasGroupChanged || hasPositionChanged) {
            console.log('✅ MAKING API CALL - Moving workspace:', activeId, 'to group:', targetGroupId, 'at final index:', finalIndex);

            // Make the API call with the final position
            handleWorkspaceMove(activeId, finalIndex, targetGroupId);
        } else {
            console.log('⏭️ No actual change detected, keeping current local state');
            // Keep the current local state - don't reset to server state
        }
    };

    const handleWorkspaceMove = useCallback(async (workspaceId: string, newIndex: number, targetGroupId?: string | null) => {
        console.log('🚀 API CALL - Moving workspace:', { workspaceId, targetGroupId, newIndex });

        // Prevent multiple simultaneous moves of the same workspace
        if (moveWorkspaceMutation.isPending) {
            console.log('⏳ Move already in progress, skipping...');
            return;
        }

        console.log('� Sending mutation with data:', {
            userId,
            workspaceId,
            groupId: targetGroupId || null,
            sortOrder: newIndex
        });

        // AGGRESSIVE FIX: Use mutation WITHOUT React Query's automatic invalidation
        moveWorkspaceMutation.mutate({
            userId,
            workspaceId,
            groupId: targetGroupId || null,
            sortOrder: newIndex
        }, {
            onSuccess: () => {
                console.log('✅ API SUCCESS - Workspace move completed successfully');
                console.log('� AGGRESSIVE PROTECTION: Blocking all server sync for 5 seconds');
                console.log('📝 Local state after API success:', localWorkspaces.map(w => `${w.id}:${w.name}`));

                // Set aggressive protection to prevent any server overwrites
                setHasLocalChanges(true);

                // Set timeout to allow server sync again after 5 seconds
                if (dragProtectionTimeout) {
                    clearTimeout(dragProtectionTimeout);
                }
                const timeout = setTimeout(() => {
                    console.log('⏰ PROTECTION TIMEOUT: Allowing server sync again');
                    setHasLocalChanges(false);
                    setDragProtectionTimeout(null);
                }, 5000);
                setDragProtectionTimeout(timeout);

                // CRITICAL DEBUG: Check if local state gets overwritten after this point
                setTimeout(() => {
                    console.log('⏰ CHECKING STATE 1 SECOND AFTER API SUCCESS:');
                    console.log('📝 Local state after 1s:', localWorkspaces.map(w => `${w.id}:${w.name}`));
                }, 1000);

                setTimeout(() => {
                    console.log('⏰ CHECKING STATE 3 SECONDS AFTER API SUCCESS:');
                    console.log('📝 Local state after 3s:', localWorkspaces.map(w => `${w.id}:${w.name}`));
                }, 3000);
            },
            onError: (error) => {
                console.error('❌ API ERROR - Workspace move failed:', error);
                console.log('🔄 Resetting to server state due to error');
                // Clear protection and reset to server state on error
                if (dragProtectionTimeout) {
                    clearTimeout(dragProtectionTimeout);
                    setDragProtectionTimeout(null);
                }
                setHasLocalChanges(false);
                setLocalWorkspaces(serverWorkspaces);
            }
        });
    }, [userId, moveWorkspaceMutation, serverWorkspaces, localWorkspaces, setLocalWorkspaces, dragProtectionTimeout, setHasLocalChanges, setDragProtectionTimeout]);

    const handleWorkspaceSelect = async (workspace: Workspace) => {
        const workspaceId = workspace.id;
        if (workspaceId === currentWorkspaceId) {
            onWorkspaceSelect(workspaceId);
            return;
        }

        try {
            if (openWorkspace) {
                openWorkspace(workspaceId);
                onWorkspaceSelect(workspaceId);
            } else {
                onWorkspaceSelect(workspaceId);
            }
        } catch (error) {
            console.error('Error selecting workspace:', error);
        }
    };

    const handleEditWorkspace = (workspace: Workspace) => {
        setEditingWorkspace(workspace);
    };

    const handleDeleteWorkspace = (workspace: Workspace) => {
        setDeletingWorkspaceId(workspace.id);
    };

    const handleSaveEdit = async () => {
        if (!editingWorkspace) return;

        if (!editingWorkspace.name.trim()) {
            setError('Workspace name cannot be empty');
            return;
        }

        setError('');

        updateWorkspaceMutation.mutate(
            {
                workspaceId: editingWorkspace.id,
                name: editingWorkspace.name.trim(),
                workspaceRules: editingWorkspace.workspaceRules,
                userId
            },
            {
                onSuccess: (result) => {
                    if (result.success) {
                        setEditingWorkspace(null);
                        onWorkspaceUpdated();
                    } else {
                        setError(result.message || 'Failed to update workspace');
                    }
                },
                onError: (error) => {
                    console.error('Error updating workspace:', error);
                    setError('Failed to update workspace');
                }
            }
        );
    };

    const confirmDelete = async () => {
        if (!deletingWorkspaceId) return;

        if (serverWorkspaces.length <= 1) {
            setError('Cannot delete the last workspace. Users must have at least one workspace.');
            setDeletingWorkspaceId(null);
            return;
        }

        setError('');

        deleteWorkspaceMutation.mutate(
            { workspaceId: deletingWorkspaceId, userId },
            {
                onSuccess: (result) => {
                    if (result.success) {
                        setDeletingWorkspaceId(null);
                        onWorkspaceDeleted();
                    } else {
                        setError(result.message || 'Failed to delete workspace');
                    }
                },
                onError: (error) => {
                    console.error('Error deleting workspace:', error);
                    setError('Failed to delete workspace');
                }
            }
        );
    };



    const isLoading = workspacesLoading || groupsLoading;

    if (isLoading && localWorkspaces.length === 0 && groups.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="workspace-container space-y-6">
            {/* Header with buttons */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Select Workspace</h1>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCreateGroup(true)}
                        className="gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        New Group
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowOrganizeGroups(true)}
                        className="gap-2"
                    >
                        <Settings2 className="h-4 w-4" />
                        Organize
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => navigationUtils.pushState('/add/workspace')}
                        className="gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add Workspace
                    </Button>
                </div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={rectIntersection}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="space-y-8 relative">
                    {/* Ungrouped workspaces */}
                    <div className="space-y-4">
                        <SortableWorkspaceList
                            workspaces={ungroupedWorkspaces}
                            currentWorkspaceId={currentWorkspaceId}
                            onWorkspaceSelect={handleWorkspaceSelect}
                            onWorkspaceEdit={handleEditWorkspace}
                            onWorkspaceDelete={handleDeleteWorkspace}
                            onWorkspaceMove={handleWorkspaceMove}
                            groupId={null}
                            className="border-transparent hover:border-border"
                        />
                    </div>

                    {/* Groups */}
                    <div className="space-y-6">
                        {groups.map((group) => (
                            <WorkspaceGroupCard
                                key={group.id}
                                group={group}
                                workspaces={groupedWorkspaces[group.id] || []}
                                onWorkspaceSelect={handleWorkspaceSelect}
                                onWorkspaceEdit={handleEditWorkspace}
                                onWorkspaceDelete={handleDeleteWorkspace}
                                onWorkspaceMove={handleWorkspaceMove}
                                currentWorkspaceId={currentWorkspaceId}
                                userId={userId}
                            />
                        ))}
                    </div>
                </div>


            </DndContext>

            {/* Edit Workspace Dialog */}
            <Dialog open={!!editingWorkspace} onOpenChange={(open) => !open && setEditingWorkspace(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Workspace</DialogTitle>
                    </DialogHeader>
                    {editingWorkspace && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="workspace-name">Workspace Name</Label>
                                <Input
                                    id="workspace-name"
                                    value={editingWorkspace.name}
                                    onChange={(e) => setEditingWorkspace({ ...editingWorkspace, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="workspace-rules">Rules/Instructions</Label>
                                <Textarea
                                    id="workspace-rules"
                                    value={editingWorkspace.workspaceRules}
                                    onChange={(e) => setEditingWorkspace({ ...editingWorkspace, workspaceRules: e.target.value })}
                                    className="min-h-[150px]"
                                />
                            </div>
                            {error && <p className="text-sm text-destructive">{error}</p>}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingWorkspace(null)}>Cancel</Button>
                        <Button onClick={handleSaveEdit} disabled={updateWorkspaceMutation.isPending}>
                            {updateWorkspaceMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Workspace Confirmation Dialog */}
            <Dialog open={!!deletingWorkspaceId} onOpenChange={(open) => !open && setDeletingWorkspaceId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Workspace</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this workspace? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    {error && <p className="text-sm text-destructive mt-4">{error}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingWorkspaceId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={deleteWorkspaceMutation.isPending}>
                            {deleteWorkspaceMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <CreateGroupDialog
                open={showCreateGroup}
                onOpenChange={setShowCreateGroup}
                userId={userId}
            />

            {showOrganizeGroups && (
                <OrganizeGroupsDialog
                    groups={groups}
                    onClose={() => setShowOrganizeGroups(false)}
                />
            )}
        </div>
    );
}


