"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Edit2, Trash2, Loader2 } from 'lucide-react';
import { authService } from '@/lib/auth';
import { useWorkspaces, useUpdateWorkspace, useDeleteWorkspace } from '@/lib/hooks/use-query-hooks';
import { useToast } from '@/components/ui/toast';

interface EditingWorkspace {
    id: string;
    name: string;
    workspaceRules: string;
}

export function WorkspaceSettingsView() {
    const router = useRouter();
    const [editingWorkspace, setEditingWorkspace] = useState<EditingWorkspace | null>(null);
    const [deletingWorkspaceId, setDeletingWorkspaceId] = useState<string | null>(null);
    const { addToast } = useToast();

    const user = authService.getCurrentUser();

    // Redirect if no user
    React.useLayoutEffect(() => {
        if (!user) {
            router.push('/');
        }
    }, [user, router]);

    // Use TanStack Query hooks
    const { data: workspacesResult, isLoading, error } = useWorkspaces(user?.id || '');
    const updateWorkspaceMutation = useUpdateWorkspace();
    const deleteWorkspaceMutation = useDeleteWorkspace();

    const workspaces = workspacesResult?.workspaces || [];

    const handleEditWorkspace = (workspace: { id: string; name: string; workspaceRules: string }) => {
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
            return;
        }

        try {
            await updateWorkspaceMutation.mutateAsync({
                workspaceId: editingWorkspace.id,
                name: editingWorkspace.name.trim(),
                workspaceRules: editingWorkspace.workspaceRules.trim(),
                userId: user.id
            });

            setEditingWorkspace(null);
            addToast({
                title: "Success",
                description: "Workspace updated successfully",
                variant: "default"
            });
        } catch (error) {
            console.error('Error updating workspace:', error);
            addToast({
                title: "Error",
                description: "Failed to update workspace",
                variant: "destructive"
            });
        }
    };

    const handleDeleteWorkspace = async (workspaceId: string) => {
        if (!user) return;

        try {
            await deleteWorkspaceMutation.mutateAsync({
                workspaceId,
                userId: user.id
            });

            setDeletingWorkspaceId(null);
            addToast({
                title: "Success",
                description: "Workspace deleted successfully",
                variant: "default"
            });
        } catch (error) {
            console.error('Error deleting workspace:', error);
            addToast({
                title: "Error",
                description: "Failed to delete workspace",
                variant: "destructive"
            });
        }
    };

    // Show loading spinner
    if (isLoading && workspaces.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-4">
                    <p className="text-destructive">{error.message}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">

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
