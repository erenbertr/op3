"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Edit2, Trash2, MessageSquare, Kanban, Network } from 'lucide-react';
import { apiClient, UpdateWorkspaceRequest } from '@/lib/api';
import { WorkspaceRulesModal } from './workspace-rules-modal';

interface WorkspaceManagementPanelProps {
    userId: string;
    workspaces: {
        id: string;
        name: string;
        templateType: string;
        workspaceRules: string;
        isActive: boolean;
        createdAt: string;
    }[];
    onClose: () => void;
    onWorkspaceUpdated: () => void;
    onWorkspaceDeleted: () => void;
}

interface EditingWorkspace {
    id: string;
    name: string;
    workspaceRules: string;
}

export function WorkspaceManagementPanel({
    userId,
    workspaces: initialWorkspaces,
    onClose,
    onWorkspaceUpdated,
    onWorkspaceDeleted
}: WorkspaceManagementPanelProps) {
    const [workspaces, setWorkspaces] = useState(initialWorkspaces);
    const [editingWorkspace, setEditingWorkspace] = useState<EditingWorkspace | null>(null);
    const [deletingWorkspaceId, setDeletingWorkspaceId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Load workspaces on component mount
    useEffect(() => {
        loadWorkspaces();
    }, [userId]);

    const loadWorkspaces = async () => {
        try {
            setIsLoading(true);
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
    };

    const getTemplateIcon = (templateType: string) => {
        switch (templateType) {
            case 'standard-chat':
                return <MessageSquare className="h-5 w-5" />;
            case 'kanban-board':
                return <Kanban className="h-5 w-5" />;
            case 'node-graph':
                return <Network className="h-5 w-5" />;
            default:
                return <MessageSquare className="h-5 w-5" />;
        }
    };

    const getTemplateLabel = (templateType: string) => {
        switch (templateType) {
            case 'standard-chat':
                return 'Standard Chat';
            case 'kanban-board':
                return 'Kanban Board';
            case 'node-graph':
                return 'Node Graph';
            default:
                return templateType;
        }
    };

    const handleEditWorkspace = (workspace: any) => {
        setEditingWorkspace({
            id: workspace.id,
            name: workspace.name,
            workspaceRules: workspace.workspaceRules
        });
        setError('');
    };

    const handleSaveEdit = async () => {
        if (!editingWorkspace) return;

        if (!editingWorkspace.name.trim()) {
            setError('Workspace name cannot be empty');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const updates: UpdateWorkspaceRequest = {
                name: editingWorkspace.name.trim(),
                workspaceRules: editingWorkspace.workspaceRules
            };

            const result = await apiClient.updateWorkspace(editingWorkspace.id, userId, updates);

            if (result.success) {
                setEditingWorkspace(null);
                loadWorkspaces(); // Refresh the list
                onWorkspaceUpdated();
            } else {
                setError(result.message || 'Failed to update workspace');
            }
        } catch (error) {
            console.error('Error updating workspace:', error);
            setError('Failed to update workspace');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteWorkspace = async (workspaceId: string) => {
        if (workspaces.length <= 1) {
            setError('Cannot delete the last workspace. Users must have at least one workspace.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const result = await apiClient.deleteWorkspace(workspaceId, userId);

            if (result.success) {
                setDeletingWorkspaceId(null);
                loadWorkspaces(); // Refresh the list
                onWorkspaceDeleted();
            } else {
                setError(result.message || 'Failed to delete workspace');
            }
        } catch (error) {
            console.error('Error deleting workspace:', error);
            setError('Failed to delete workspace');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground">Loading workspaces...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Error Display */}
            {error && (
                <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-destructive text-sm">{error}</p>
                </div>
            )}

            {/* Workspace List */}
            <div className="space-y-4">
                {workspaces.map((workspace) => (
                    <Card key={workspace.id}>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {getTemplateIcon(workspace.templateType)}
                                    <div>
                                        <CardTitle className="text-lg">
                                            {workspace.name}
                                        </CardTitle>
                                        <CardDescription>
                                            {getTemplateLabel(workspace.templateType)} • Created {new Date(workspace.createdAt).toLocaleDateString()}
                                        </CardDescription>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEditWorkspace(workspace)}
                                        disabled={isLoading}
                                    >
                                        <Edit2 className="h-4 w-4 mr-2" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setDeletingWorkspaceId(workspace.id)}
                                        disabled={isLoading || workspaces.length <= 1}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        {workspace.workspaceRules && (
                            <CardContent className="pt-0">
                                <WorkspaceRulesModal
                                    rules={workspace.workspaceRules}
                                    workspaceName={workspace.name}
                                />
                            </CardContent>
                        )}
                    </Card>
                ))}
            </div>

            {/* Edit Workspace Dialog */}
            {
                editingWorkspace && (
                    <Dialog open={true} onOpenChange={() => setEditingWorkspace(null)}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Edit Workspace</DialogTitle>
                                <DialogDescription>
                                    Update the workspace name and rules. Template type cannot be changed after creation.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-name">Workspace Name</Label>
                                    <Input
                                        id="edit-name"
                                        value={editingWorkspace.name}
                                        onChange={(e) => setEditingWorkspace(prev => prev ? { ...prev, name: e.target.value } : null)}
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-rules">Workspace Rules</Label>
                                    <Textarea
                                        id="edit-rules"
                                        value={editingWorkspace.workspaceRules}
                                        onChange={(e) => setEditingWorkspace(prev => prev ? { ...prev, workspaceRules: e.target.value } : null)}
                                        placeholder="Enter workspace rules..."
                                        disabled={isLoading}
                                        className="min-h-[100px]"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setEditingWorkspace(null)} disabled={isLoading}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSaveEdit} disabled={isLoading}>
                                    Save Changes
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )
            }

            {/* Delete Confirmation Dialog */}
            {
                deletingWorkspaceId && (
                    <Dialog open={true} onOpenChange={() => setDeletingWorkspaceId(null)}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Delete Workspace</DialogTitle>
                                <DialogDescription>
                                    Are you sure you want to delete this workspace? This action cannot be undone.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setDeletingWorkspaceId(null)} disabled={isLoading}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => handleDeleteWorkspace(deletingWorkspaceId)}
                                    disabled={isLoading}
                                >
                                    Delete Workspace
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )
            }
        </>
    );
}
