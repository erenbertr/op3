"use client"

import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Plus, X, FolderOpen, User, BarChart3 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { navigationUtils } from '@/lib/hooks/use-pathname';

import { useWorkspaces } from '@/lib/hooks/use-query-hooks';

interface WorkspaceTabBarProps {
    userId: string;
    currentView?: 'workspace' | 'settings' | 'create' | 'selection' | 'personalities' | 'statistics';
    currentWorkspaceId: string | null;
    onRefresh?: (refreshFn: () => void) => void;
    onOpenWorkspace?: (openWorkspaceFn: (workspaceId: string) => void) => void;
}

interface Workspace {
    id: string;
    name: string;
    templateType: string;
    workspaceRules: string;
    isActive: boolean;
    createdAt: string;
}

// Key for storing open workspace tabs in localStorage
const OPEN_WORKSPACE_TABS_KEY = 'op3_open_workspace_tabs';

export function WorkspaceTabBar({ userId, currentView = 'workspace', currentWorkspaceId, onRefresh, onOpenWorkspace }: WorkspaceTabBarProps) {
    // Use TanStack Query for data fetching
    const { data: workspacesResult, isLoading, error } = useWorkspaces(userId);
    const workspaces = React.useMemo(() => workspacesResult?.workspaces || [], [workspacesResult]);

    const [openWorkspaceTabs, setOpenWorkspaceTabs] = useState<string[]>([]);
    const isMountedRef = useRef(false);
    const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
    const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Save open workspace tabs to localStorage
    const saveOpenTabs = useCallback((tabs: string[]) => {
        try {
            localStorage.setItem(OPEN_WORKSPACE_TABS_KEY, JSON.stringify(tabs));
        } catch (error) {
            console.error('Error saving open tabs to localStorage:', error);
        }
    }, []);

    // Load open workspace tabs from localStorage
    const loadOpenTabs = useCallback(() => {
        try {
            const savedTabs = localStorage.getItem(OPEN_WORKSPACE_TABS_KEY);
            if (savedTabs) {
                return JSON.parse(savedTabs);
            }
        } catch (error) {
            console.error('Error loading open tabs from localStorage:', error);
        }
        return [];
    }, []);



    // Initialize open tabs separately to avoid dependency issues
    const initializeOpenTabs = useCallback((workspaces: Workspace[]) => {
        // Use setTimeout to avoid state updates during render
        setTimeout(() => {
            // Check if component is still mounted before updating state
            if (!isMountedRef.current) return;

            setOpenWorkspaceTabs(currentTabs => {
                // Only initialize if we don't have any tabs yet and we have workspaces
                if (currentTabs.length === 0 && workspaces.length > 0) {
                    const savedTabs = loadOpenTabs();
                    const validSavedTabs = savedTabs.filter((tabId: string) =>
                        workspaces.some(w => w.id === tabId)
                    );

                    if (validSavedTabs.length > 0) {
                        saveOpenTabs(validSavedTabs);
                        return validSavedTabs;
                    } else {
                        // If no valid saved tabs, open all workspaces
                        const allWorkspaceIds = workspaces.map(w => w.id);
                        saveOpenTabs(allWorkspaceIds);
                        return allWorkspaceIds;
                    }
                }
                return currentTabs;
            });
        }, 0);
    }, [loadOpenTabs, saveOpenTabs]);

    // Initialize component mounted state
    React.useLayoutEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Initialize open tabs when workspaces are loaded
    React.useEffect(() => {
        if (workspaces.length > 0) {
            initializeOpenTabs(workspaces);
        }
    }, [workspaces, initializeOpenTabs]);

    // Expose refresh function to parent
    React.useEffect(() => {
        if (onRefresh) {
            onRefresh(() => {
                // Use TanStack Query's refetch instead of page reload
                // The parent component should handle the actual refetch
                console.log('Refresh requested - parent should handle refetch');
            });
        }
    }, [onRefresh]);

    const handleTabClick = useCallback(async (workspaceId: string) => {
        // Navigate immediately for smooth UX
        navigationUtils.pushState(`/ws/${workspaceId}`);

        // Update server state in background - TanStack Query will handle the cache update
        try {
            await apiClient.setActiveWorkspace(workspaceId, userId);
        } catch (error) {
            console.error('Error switching workspace:', error);
            // TanStack Query will handle retry and error states
        }
    }, [userId]);

    const handleOpenWorkspace = useCallback((workspaceId: string) => {
        // Add workspace to open tabs if not already open
        if (!openWorkspaceTabs.includes(workspaceId)) {
            const newTabs = [...openWorkspaceTabs, workspaceId];
            setOpenWorkspaceTabs(newTabs);
            saveOpenTabs(newTabs);
        }
        // Switch to the workspace
        handleTabClick(workspaceId);
    }, [openWorkspaceTabs, handleTabClick, saveOpenTabs]);

    // Expose open workspace function to parent
    React.useEffect(() => {
        if (onOpenWorkspace) {
            onOpenWorkspace(handleOpenWorkspace);
        }
    }, [onOpenWorkspace, handleOpenWorkspace]);

    const handleCloseTab = useCallback(async (workspaceId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        const openTabs = openWorkspaceTabs.filter(id => id !== workspaceId);

        if (openTabs.length === 0) {
            console.warn('Cannot close the last workspace tab. At least one workspace must remain open.');
            return;
        }

        try {
            // If this is the active workspace, switch to another open tab first
            if (workspaceId === currentWorkspaceId) {
                const otherOpenWorkspace = workspaces.find(w =>
                    openTabs.includes(w.id) && w.id !== workspaceId
                );
                if (otherOpenWorkspace) {
                    await handleTabClick(otherOpenWorkspace.id);
                }
            }

            // Remove from open tabs (but keep the workspace in the database and workspace list)
            setOpenWorkspaceTabs(openTabs);
            saveOpenTabs(openTabs);

        } catch (error) {
            console.error('Error closing workspace tab:', error);
        }
    }, [openWorkspaceTabs, currentWorkspaceId, workspaces, handleTabClick, saveOpenTabs]);

    // Drag and drop handlers
    const handleDragStart = useCallback((e: React.DragEvent, workspaceId: string) => {
        setDraggedTabId(workspaceId);
        setIsDragging(true);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', workspaceId);

        // Add some visual feedback
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '0.5';
        }
    }, []);

    const handleDragEnd = useCallback((e: React.DragEvent) => {
        setDraggedTabId(null);
        setDragOverTabId(null);

        // Reset visual feedback
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '1';
        }

        // Add a small delay before allowing clicks again to prevent accidental navigation
        setTimeout(() => {
            setIsDragging(false);
        }, 100);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, workspaceId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverTabId(workspaceId);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        // Only clear if we're leaving the tab entirely
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOverTabId(null);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, targetWorkspaceId: string) => {
        e.preventDefault();
        const draggedWorkspaceId = e.dataTransfer.getData('text/plain');

        if (draggedWorkspaceId && draggedWorkspaceId !== targetWorkspaceId) {
            const newTabs = [...openWorkspaceTabs];
            const draggedIndex = newTabs.indexOf(draggedWorkspaceId);
            const targetIndex = newTabs.indexOf(targetWorkspaceId);

            if (draggedIndex !== -1 && targetIndex !== -1) {
                // Remove the dragged item
                newTabs.splice(draggedIndex, 1);
                // Insert it at the target position
                newTabs.splice(targetIndex, 0, draggedWorkspaceId);

                setOpenWorkspaceTabs(newTabs);
                saveOpenTabs(newTabs);
            }
        }

        setDraggedTabId(null);
        setDragOverTabId(null);
    }, [openWorkspaceTabs, saveOpenTabs]);





    return (
        <div className="border-b bg-background">
            <div className="container mx-auto px-4">
                <div className="flex items-center h-12 gap-1">
                    {/* Settings Tab */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigationUtils.pushState('/settings/workspaces')}
                        className={`h-10 px-3 rounded-t-md rounded-b-none border-b-2 transition-all ${currentView === 'settings'
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'border-transparent hover:border-primary/50'
                            }`}
                        title="Workspace Settings"
                    >
                        <Settings className="h-4 w-4" />
                    </Button>

                    {/* Statistics Tab */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigationUtils.pushState('/statistics')}
                        className={`h-10 px-3 rounded-t-md rounded-b-none border-b-2 transition-all ${currentView === 'statistics'
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'border-transparent hover:border-primary/50'
                            }`}
                        title="Usage Statistics"
                    >
                        <BarChart3 className="h-4 w-4" />
                    </Button>

                    {/* Workspace Selection Tab */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigationUtils.pushState('/workspaces')}
                        className={`h-10 px-3 rounded-t-md rounded-b-none border-b-2 transition-all ${currentView === 'selection'
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'border-transparent hover:border-primary/50'
                            }`}
                        title="Select Workspace"
                    >
                        <FolderOpen className="h-4 w-4" />
                    </Button>

                    {/* Personalities Tab */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigationUtils.pushState('/personalities')}
                        className={`h-10 px-3 rounded-t-md rounded-b-none border-b-2 transition-all ${currentView === 'personalities'
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'border-transparent hover:border-primary/50'
                            }`}
                        title="AI Personalities"
                    >
                        <User className="h-4 w-4" />
                    </Button>

                    {/* Workspace Tabs - Only show workspaces that are in openWorkspaceTabs when not loading */}
                    {!isLoading && openWorkspaceTabs
                        .map(tabId => workspaces.find(w => w.id === tabId))
                        .filter(workspace => workspace !== undefined)
                        .map((workspace) => (
                            <div
                                key={workspace.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, workspace.id)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => handleDragOver(e, workspace.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, workspace.id)}
                                className={`relative flex items-center h-10 px-3 rounded-t-md border-b-2 transition-all select-none ${workspace.id === currentWorkspaceId && currentView === 'workspace'
                                    ? 'bg-primary/10 border-primary text-primary'
                                    : 'hover:bg-muted border-transparent hover:border-primary/50'
                                    } ${draggedTabId === workspace.id ? 'opacity-50 cursor-grabbing' : 'cursor-grab hover:cursor-grab'
                                    } ${dragOverTabId === workspace.id && draggedTabId !== workspace.id
                                        ? 'border-l-4 border-l-primary bg-primary/5'
                                        : ''
                                    }`}
                                onClick={() => {
                                    // Prevent navigation if we just finished dragging
                                    if (!isDragging) {
                                        handleTabClick(workspace.id);
                                    }
                                }}
                                title={`${workspace.name} - Drag to reorder`}
                            >
                                <span className="text-sm font-medium truncate max-w-32 pointer-events-none">
                                    {workspace.name}
                                </span>
                                {openWorkspaceTabs.length > 1 && workspace.id === currentWorkspaceId && currentView === 'workspace' && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => handleCloseTab(workspace.id, e)}
                                        className="h-5 w-5 p-0 ml-2 hover:bg-destructive/20 hover:text-destructive pointer-events-auto"
                                        title="Close workspace tab"
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        ))}

                    {/* Add Workspace Tab */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigationUtils.pushState('/add/workspace')}
                        className="h-10 px-3 rounded-t-md rounded-b-none border-b-2 border-transparent hover:border-primary/50"
                        title="Create New Workspace"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>

                    {/* Error Display */}
                    {error && (
                        <div className="ml-4 text-sm text-destructive">
                            Error loading workspaces
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
