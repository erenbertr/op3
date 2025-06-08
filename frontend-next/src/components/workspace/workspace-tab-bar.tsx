"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Plus, X, FolderOpen } from 'lucide-react';
import { apiClient, WorkspaceListResponse } from '@/lib/api';

interface WorkspaceTabBarProps {
    userId: string;
    currentView?: 'workspace' | 'settings' | 'create' | 'selection';
    onWorkspaceChange?: (workspaceId: string) => void;
    onShowSettings?: () => void;
    onShowCreateWorkspace?: () => void;
    onShowWorkspaceSelection?: () => void;
    onRefresh?: (refreshFn: () => void) => void;
}

interface Workspace {
    id: string;
    name: string;
    templateType: string;
    workspaceRules: string;
    isActive: boolean;
    createdAt: string;
}

export function WorkspaceTabBar({ userId, currentView = 'workspace', onWorkspaceChange, onShowSettings, onShowCreateWorkspace, onShowWorkspaceSelection, onRefresh }: WorkspaceTabBarProps) {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const loadWorkspaces = useCallback(async () => {
        try {
            setIsLoading(true);
            setError('');

            const result = await apiClient.getUserWorkspaces(userId);

            if (result.success) {
                setWorkspaces(result.workspaces);
                const activeWorkspace = result.workspaces.find(w => w.isActive);
                if (activeWorkspace) {
                    setActiveWorkspaceId(activeWorkspace.id);
                }
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

    // Load workspaces on component mount
    useEffect(() => {
        loadWorkspaces();
    }, [loadWorkspaces]);

    // Expose refresh function to parent
    useEffect(() => {
        if (onRefresh) {
            onRefresh(loadWorkspaces);
        }
    }, [onRefresh, loadWorkspaces]);

    const handleTabClick = async (workspaceId: string) => {
        if (workspaceId === activeWorkspaceId) return;

        try {
            const result = await apiClient.setActiveWorkspace(workspaceId, userId);

            if (result.success) {
                setActiveWorkspaceId(workspaceId);
                setWorkspaces(prev => prev.map(w => ({
                    ...w,
                    isActive: w.id === workspaceId
                })));
                onWorkspaceChange?.(workspaceId);
            } else {
                setError(result.message || 'Failed to switch workspace');
            }
        } catch (error) {
            console.error('Error switching workspace:', error);
            setError('Failed to switch workspace');
        }
    };

    const handleCloseTab = async (workspaceId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        if (workspaces.length <= 1) {
            setError('Cannot close the last workspace. Users must have at least one workspace.');
            return;
        }

        try {
            // If this is the active workspace, switch to another one first
            if (workspaceId === activeWorkspaceId) {
                const otherWorkspace = workspaces.find(w => w.id !== workspaceId);
                if (otherWorkspace) {
                    await handleTabClick(otherWorkspace.id);
                }
            }

            // Delete the workspace
            const result = await apiClient.deleteWorkspace(workspaceId, userId);

            if (result.success) {
                // Remove from local state
                setWorkspaces(prev => prev.filter(w => w.id !== workspaceId));

                // If we deleted the active workspace, make sure another one is active
                if (workspaceId === activeWorkspaceId) {
                    const remainingWorkspaces = workspaces.filter(w => w.id !== workspaceId);
                    if (remainingWorkspaces.length > 0) {
                        setActiveWorkspaceId(remainingWorkspaces[0].id);
                        onWorkspaceChange?.(remainingWorkspaces[0].id);
                    }
                }
            } else {
                setError(result.message || 'Failed to close workspace');
            }
        } catch (error) {
            console.error('Error closing workspace:', error);
            setError('Failed to close workspace');
        }
    };



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
                        onClick={onShowSettings}
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
                        onClick={onShowWorkspaceSelection}
                        className={`h-10 px-3 rounded-t-md rounded-b-none border-b-2 transition-all ${currentView === 'selection'
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'border-transparent hover:border-primary/50'
                            }`}
                        title="Select Workspace"
                    >
                        <FolderOpen className="h-4 w-4" />
                    </Button>

                    {/* Workspace Tabs */}
                    {workspaces.map((workspace) => (
                        <div
                            key={workspace.id}
                            className={`relative flex items-center h-10 px-3 cursor-pointer rounded-t-md border-b-2 transition-all ${workspace.isActive && currentView === 'workspace'
                                ? 'bg-primary/10 border-primary text-primary'
                                : 'hover:bg-muted border-transparent hover:border-primary/50'
                                }`}
                            onClick={() => handleTabClick(workspace.id)}
                        >
                            <span className="text-sm font-medium truncate max-w-32">
                                {workspace.name}
                            </span>
                            {workspaces.length > 1 && (
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
                        onClick={onShowCreateWorkspace}
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
