"use client"

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Edit2, Trash2, Loader2 } from 'lucide-react';
import { authService } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { useToast } from '@/components/ui/toast';

interface EditingWorkspace {
    id: string;
    name: string;
    workspaceRules: string;
}

export function WorkspaceSettingsView() {
    const router = useRouter();
    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const [editingWorkspace, setEditingWorkspace] = useState<EditingWorkspace | null>(null);
    const [deletingWorkspaceId, setDeletingWorkspaceId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showSpinner, setShowSpinner] = useState(false);
    const [error, setError] = useState('');
    const spinnerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const { addToast } = useToast();

    const user = authService.getCurrentUser();

    useEffect(() => {
        if (!user) {
            router.push('/');
            return;
        }
        loadWorkspaces();
    }, [user, router]);

    // Handle delayed spinner display
    useEffect(() => {
        if (isLoading && workspaces.length === 0) {
            // Reset spinner state when loading starts
            setShowSpinner(false);

            // Set timeout to show spinner after 3 seconds
            spinnerTimeoutRef.current = setTimeout(() => {
                setShowSpinner(true);
            }, 3000);
        } else {
            // Clear timeout and hide spinner when loading completes
            if (spinnerTimeoutRef.current) {
                clearTimeout(spinnerTimeoutRef.current);
                spinnerTimeoutRef.current = null;
            }
            setShowSpinner(false);
        }

        // Cleanup timeout on unmount
        return () => {
            if (spinnerTimeoutRef.current) {
                clearTimeout(spinnerTimeoutRef.current);
                spinnerTimeoutRef.current = null;
            }
        };
    }, [isLoading, workspaces.length]);

    const loadWorkspaces = async () => {
        if (!user) return;

        try {
            setIsLoading(true);
            const result = await apiClient.getUserWorkspaces(user.id);
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

    const handleEditWorkspace = (workspace: any) => {
        setEditingWorkspace({
            id: workspace.id,
            name: workspace.name,
            workspaceRules: workspace.workspaceRules || ''
        });
        setError('');
    };

    const handleSaveWorkspace = async () => {
        if (!editingWorkspace || !user) return;

        if (!editingWorkspace.name.trim()) {
            setError('Workspace name cannot be empty');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const result = await apiClient.updateWorkspace(editingWorkspace.id, {
                name: editingWorkspace.name.trim(),
                workspaceRules: editingWorkspace.workspaceRules.trim()
            });

            if (result.success) {
                setEditingWorkspace(null);
                await loadWorkspaces();
                addToast({
                    title: "Success",
                    description: "Workspace updated successfully",
                    variant: "default"
                });
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
        if (!user) return;

        setIsLoading(true);
        setError('');

        try {
            const result = await apiClient.deleteWorkspace(workspaceId, user.id);

            if (result.success) {
                setDeletingWorkspaceId(null);
                await loadWorkspaces();
                addToast({
                    title: "Success",
                    description: "Workspace deleted successfully",
                    variant: "default"
                });
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

    // Show low opacity spinner after 3 seconds if still loading
    if (isLoading && workspaces.length === 0 && showSpinner) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted-foreground/20 border-t-muted-foreground/40"></div>
            </div>
        );
    }

    // Show blank screen during initial 3 seconds of loading
    if (isLoading && workspaces.length === 0 && !showSpinner) {
        return <div></div>;
    }

    return (
        <div className="space-y-4">
            {/* Error Display */}
            {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-destructive text-sm">{error}</p>
                </div>
            )}

            {/* Workspaces List */}
            <div className="space-y-4">
                {workspaces.map((workspace) => (
                    <Card key={workspace.id}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div>
                                <CardTitle className="text-base">{workspace.name}</CardTitle>
                                <CardDescription>
                                    Template: {workspace.templateType} • Created: {new Date(workspace.createdAt).toLocaleDateString()}
                                    {workspace.isActive && <span className="ml-2 text-primary font-medium">• Active</span>}
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditWorkspace(workspace)}
                                    disabled={isLoading}
                                >
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDeletingWorkspaceId(workspace.id)}
                                    disabled={isLoading || workspaces.length <= 1}
                                    title={workspaces.length <= 1 ? "Cannot delete the last workspace" : "Delete workspace"}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        {workspace.workspaceRules && (
                            <CardContent>
                                <p className="text-sm text-muted-foreground">{workspace.workspaceRules}</p>
                            </CardContent>
                        )}
                    </Card>
                ))}
            </div>

            {/* Edit Workspace Dialog */}
            <Dialog open={!!editingWorkspace} onOpenChange={() => setEditingWorkspace(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Workspace</DialogTitle>
                        <DialogDescription>
                            Update your workspace name and rules.
                        </DialogDescription>
                    </DialogHeader>
                    {editingWorkspace && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="workspace-name">Workspace Name</Label>
                                <Input
                                    id="workspace-name"
                                    value={editingWorkspace.name}
                                    onChange={(e) => setEditingWorkspace({
                                        ...editingWorkspace,
                                        name: e.target.value
                                    })}
                                    placeholder="Enter workspace name"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="workspace-rules">Workspace Rules</Label>
                                <Textarea
                                    id="workspace-rules"
                                    value={editingWorkspace.workspaceRules}
                                    onChange={(e) => setEditingWorkspace({
                                        ...editingWorkspace,
                                        workspaceRules: e.target.value
                                    })}
                                    placeholder="Enter workspace rules and guidelines"
                                    rows={4}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingWorkspace(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveWorkspace} disabled={isLoading}>
                            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deletingWorkspaceId} onOpenChange={() => setDeletingWorkspaceId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Workspace</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this workspace? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingWorkspaceId(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => deletingWorkspaceId && handleDeleteWorkspace(deletingWorkspaceId)}
                            disabled={isLoading}
                        >
                            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
