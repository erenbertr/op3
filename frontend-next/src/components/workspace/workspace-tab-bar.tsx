"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Plus, X } from 'lucide-react';
import { WorkspaceManagementPanel } from './workspace-management-panel';
import { WorkspaceSetup } from './workspace-setup';
import { apiClient, WorkspaceListResponse } from '@/lib/api';

interface WorkspaceTabBarProps {
    userId: string;
    onWorkspaceChange?: (workspaceId: string) => void;
}

interface Workspace {
    id: string;
    name: string;
    templateType: string;
    workspaceRules: string;
    isActive: boolean;
    createdAt: string;
}

export function WorkspaceTabBar({ userId, onWorkspaceChange }: WorkspaceTabBarProps) {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
    const [showManagementPanel, setShowManagementPanel] = useState(false);
    const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Load workspaces on component mount
    useEffect(() => {
        loadWorkspaces();
    }, [userId]);

    const loadWorkspaces = async () => {
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
    };

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
        
        // For now, we'll just switch to another workspace if this is the active one
        // The actual deletion will be handled in the management panel
        if (workspaceId === activeWorkspaceId && workspaces.length > 1) {
            const otherWorkspace = workspaces.find(w => w.id !== workspaceId);
            if (otherWorkspace) {
                await handleTabClick(otherWorkspace.id);
            }
        }
    };

    const handleWorkspaceCreated = (workspace: any) => {
        setShowCreateWorkspace(false);
        loadWorkspaces(); // Reload to get the updated list
    };

    const handleWorkspaceUpdated = () => {
        loadWorkspaces(); // Reload to get the updated list
    };

    const handleWorkspaceDeleted = () => {
        loadWorkspaces(); // Reload to get the updated list
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
        <>
            <div className="border-b bg-background">
                <div className="container mx-auto px-4">
                    <div className="flex items-center h-12 gap-1">
                        {/* Settings Tab */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowManagementPanel(true)}
                            className="h-10 px-3 rounded-t-md rounded-b-none border-b-2 border-transparent hover:border-primary/50"
                            title="Workspace Settings"
                        >
                            <Settings className="h-4 w-4" />
                        </Button>

                        {/* Workspace Tabs */}
                        {workspaces.map((workspace) => (
                            <div
                                key={workspace.id}
                                className={`relative flex items-center h-10 px-3 cursor-pointer rounded-t-md border-b-2 transition-all ${
                                    workspace.isActive
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
                            onClick={() => setShowCreateWorkspace(true)}
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

            {/* Management Panel Modal */}
            {showManagementPanel && (
                <WorkspaceManagementPanel
                    userId={userId}
                    workspaces={workspaces}
                    onClose={() => setShowManagementPanel(false)}
                    onWorkspaceUpdated={handleWorkspaceUpdated}
                    onWorkspaceDeleted={handleWorkspaceDeleted}
                />
            )}

            {/* Create Workspace Modal */}
            {showCreateWorkspace && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">Create New Workspace</h2>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowCreateWorkspace(false)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <WorkspaceSetup
                                userId={userId}
                                onComplete={handleWorkspaceCreated}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
