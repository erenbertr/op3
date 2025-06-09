"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Settings, Plus, X, FolderOpen, User } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface WorkspaceTabBarProps {
    userId: string;
    currentView?: 'workspace' | 'settings' | 'create' | 'selection' | 'personalities';
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
    const router = useRouter();
    const pathname = usePathname();
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [openWorkspaceTabs, setOpenWorkspaceTabs] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

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

    const loadWorkspaces = useCallback(async () => {
        try {
            setIsLoading(true);
            setError('');

            const result = await apiClient.getUserWorkspaces(userId);

            if (result.success) {
                setWorkspaces(result.workspaces);
            } else {
                setError('Failed to load workspaces');
            }
        } catch (error) {
            console.error('Error loading workspaces:', error);
            setError('Failed to load workspaces');
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    // Initialize open tabs separately to avoid dependency issues
    const initializeOpenTabs = useCallback((workspaces: Workspace[]) => {
        if (openWorkspaceTabs.length === 0 && workspaces.length > 0) {
            const savedTabs = loadOpenTabs();
            const validSavedTabs = savedTabs.filter((tabId: string) =>
                workspaces.some(w => w.id === tabId)
            );

            if (validSavedTabs.length > 0) {
                setOpenWorkspaceTabs(validSavedTabs);
            } else {
                // If no valid saved tabs, open all workspaces
                const allWorkspaceIds = workspaces.map(w => w.id);
                setOpenWorkspaceTabs(allWorkspaceIds);
                saveOpenTabs(allWorkspaceIds);
            }
        }
    }, [openWorkspaceTabs.length, loadOpenTabs, saveOpenTabs]);

    // Load workspaces on component mount
    useEffect(() => {
        loadWorkspaces();
    }, [loadWorkspaces]);

    // Initialize open tabs when workspaces are loaded
    useEffect(() => {
        if (workspaces.length > 0) {
            initializeOpenTabs(workspaces);
        }
    }, [workspaces, initializeOpenTabs]);

    // Reload workspaces when currentWorkspaceId changes and it's not in the current list
    useEffect(() => {
        if (currentWorkspaceId) {
            const workspaceExists = workspaces.some(w => w.id === currentWorkspaceId);
            if (!workspaceExists && workspaces.length > 0) {
                loadWorkspaces();
            }
        }
    }, [currentWorkspaceId, loadWorkspaces, workspaces]);

    // Expose refresh function to parent
    useEffect(() => {
        if (onRefresh) {
            onRefresh(loadWorkspaces);
        }
    }, [onRefresh, loadWorkspaces]);

    const handleTabClick = useCallback(async (workspaceId: string) => {
        try {
            const result = await apiClient.setActiveWorkspace(workspaceId, userId);

            if (result.success) {
                // Update local workspace state to reflect the change
                setWorkspaces(prev => prev.map(w => ({
                    ...w,
                    isActive: w.id === workspaceId
                })));
                // Navigate to the workspace
                router.push(`/ws/${workspaceId}`);
            } else {
                setError(result.message || 'Failed to switch workspace');
            }
        } catch (error) {
            console.error('Error switching workspace:', error);
            setError('Failed to switch workspace');
        }
    }, [userId, router]);

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
    useEffect(() => {
        if (onOpenWorkspace) {
            onOpenWorkspace(handleOpenWorkspace);
        }
    }, [onOpenWorkspace, handleOpenWorkspace]);

    const handleCloseTab = useCallback(async (workspaceId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        const openTabs = openWorkspaceTabs.filter(id => id !== workspaceId);

        if (openTabs.length === 0) {
            setError('Cannot close the last workspace tab. At least one workspace must remain open.');
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
            setError('Failed to close workspace tab');
        }
    }, [openWorkspaceTabs, currentWorkspaceId, workspaces, handleTabClick, saveOpenTabs]);





    if (isLoading) {
        return (
            <div className="border-b bg-background">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-12">
                        <div className="text-sm text-muted-foreground">Loading workspaces...</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="border-b bg-background">
            <div className="container mx-auto px-4">
                <div className="flex items-center h-12 gap-1">
                    {/* Settings Tab */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/settings')}
                        className={`h-10 px-3 rounded-t-md rounded-b-none border-b-2 transition-all ${currentView === 'settings'
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'border-transparent hover:border-primary/50'
                            }`}
                        title="Workspace Settings"
                    >
                        <Settings className="h-4 w-4" />
                    </Button>

                    {/* Workspace Selection Tab */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/workspaces')}
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
                        onClick={() => router.push('/personalities')}
                        className={`h-10 px-3 rounded-t-md rounded-b-none border-b-2 transition-all ${currentView === 'personalities'
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'border-transparent hover:border-primary/50'
                            }`}
                        title="AI Personalities"
                    >
                        <User className="h-4 w-4" />
                    </Button>

                    {/* Workspace Tabs - Only show workspaces that are in openWorkspaceTabs */}
                    {workspaces
                        .filter(workspace => openWorkspaceTabs.includes(workspace.id))
                        .map((workspace) => (
                            <div
                                key={workspace.id}
                                className={`relative flex items-center h-10 px-3 cursor-pointer rounded-t-md border-b-2 transition-all ${workspace.id === currentWorkspaceId && currentView === 'workspace'
                                    ? 'bg-primary/10 border-primary text-primary'
                                    : 'hover:bg-muted border-transparent hover:border-primary/50'
                                    }`}
                                onClick={() => handleTabClick(workspace.id)}
                            >
                                <span className="text-sm font-medium truncate max-w-32">
                                    {workspace.name}
                                </span>
                                {openWorkspaceTabs.length > 1 && workspace.id === currentWorkspaceId && currentView === 'workspace' && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => handleCloseTab(workspace.id, e)}
                                        className="h-5 w-5 p-0 ml-2 hover:bg-destructive/20 hover:text-destructive"
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
                        onClick={() => router.push('/add/workspace')}
                        className="h-10 px-3 rounded-t-md rounded-b-none border-b-2 border-transparent hover:border-primary/50"
                        title="Create New Workspace"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>

                    {/* Error Display */}
                    {error && (
                        <div className="ml-4 text-sm text-destructive">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
