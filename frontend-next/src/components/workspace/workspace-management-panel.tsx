"use client"

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Edit2, Trash2, MessageSquare, Kanban, Network, Settings, Bot, Plus, Loader2 } from 'lucide-react';

import { useWorkspaces, useUpdateWorkspace, useDeleteWorkspace } from '@/lib/hooks/use-query-hooks';
import { WorkspaceRulesModal } from './workspace-rules-modal';
import { AIProviderManagement } from './ai-provider-management';


interface WorkspaceManagementPanelProps {
    userId: string;
    onWorkspaceUpdated: () => void;
    onWorkspaceDeleted: () => void;
}

interface EditingWorkspace {
    id: string;
    name: string;
    workspaceRules: string;
}

type SettingsTab = 'workspaces' | 'ai-providers';

interface SettingsTabConfig {
    id: SettingsTab;
    label: string;
    icon: React.ReactNode;
    description: string;
}

const SETTINGS_TABS: SettingsTabConfig[] = [
    {
        id: 'workspaces',
        label: 'Workspaces',
        icon: <Settings className="h-4 w-4" />,
        description: 'Manage your workspaces and settings'
    },
    {
        id: 'ai-providers',
        label: 'AI Providers',
        icon: <Bot className="h-4 w-4" />,
        description: 'Configure AI providers and models'
    }
];

export function WorkspaceManagementPanel({
    userId,
    onWorkspaceUpdated,
    onWorkspaceDeleted
}: WorkspaceManagementPanelProps) {
    const [activeTab, setActiveTab] = useState<SettingsTab>('workspaces');
    const [editingWorkspace, setEditingWorkspace] = useState<EditingWorkspace | null>(null);
    const [deletingWorkspaceId, setDeletingWorkspaceId] = useState<string | null>(null);
    const [error, setError] = useState('');
    const aiProviderManagementRef = useRef<{ handleAddProvider: () => void } | null>(null);

    // Use TanStack Query for workspaces
    const {
        data: workspacesData,
        isLoading,
        error: queryError
    } = useWorkspaces(userId);

    const updateWorkspaceMutation = useUpdateWorkspace();
    const deleteWorkspaceMutation = useDeleteWorkspace();

    // Extract workspaces from query data
    const workspaces = workspacesData?.success ? workspacesData.workspaces : [];



    // Handle query errors (using derived state)
    React.useMemo(() => {
        if (queryError) {
            console.error('Error loading workspaces:', queryError);
            setError('Failed to load workspaces');
        } else {
            setError('');
        }
    }, [queryError]);

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

    const handleEditWorkspace = (workspace: typeof workspaces[0]) => {
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

    const handleDeleteWorkspace = async (workspaceId: string) => {
        if (workspaces.length <= 1) {
            setError('Cannot delete the last workspace. Users must have at least one workspace.');
            return;
        }

        setError('');

        deleteWorkspaceMutation.mutate(
            { workspaceId, userId },
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

    // Show loading state
    if (isLoading && workspaces.length === 0) {
        return (
            <div className="h-full flex">
                <div className="container mx-auto h-full flex">
                    {/* Vertical Tabs Sidebar */}
                    <div className="w-96 h-full overflow-y-auto">
                        <div className="py-6 space-y-2">
                            {SETTINGS_TABS.map((tab) => (
                                <Button
                                    key={tab.id}
                                    variant={activeTab === tab.id ? "default" : "ghost"}
                                    className={`w-full justify-start h-auto p-3 ${activeTab === tab.id
                                        ? "bg-primary text-primary-foreground"
                                        : "hover:bg-muted"
                                        }`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        {tab.icon}
                                        <div className="text-left">
                                            <div className="font-medium">{tab.label}</div>
                                            <div className="text-xs opacity-70">{tab.description}</div>
                                        </div>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content Area with Spinner */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="pl-8 pr-4 py-6">
                            {/* Tab Header */}
                            <div className="mb-6 flex items-start justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold">
                                        {SETTINGS_TABS.find(tab => tab.id === activeTab)?.label}
                                    </h2>
                                    <p className="text-muted-foreground">
                                        {SETTINGS_TABS.find(tab => tab.id === activeTab)?.description}
                                    </p>
                                </div>
                                {activeTab === 'ai-providers' && (
                                    <Button onClick={() => aiProviderManagementRef.current?.handleAddProvider()} className="ml-4">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Provider
                                    </Button>
                                )}
                            </div>

                            {/* Loading spinner */}
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin opacity-50" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }



    const renderTabContent = () => {
        switch (activeTab) {
            case 'workspaces':
                return (
                    <div className="space-y-4">
                        {/* Error Display */}
                        {error && (
                            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
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
                                                    disabled={updateWorkspaceMutation.isPending || deleteWorkspaceMutation.isPending}
                                                >
                                                    <Edit2 className="h-4 w-4 mr-2" />
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setDeletingWorkspaceId(workspace.id)}
                                                    disabled={updateWorkspaceMutation.isPending || deleteWorkspaceMutation.isPending || workspaces.length <= 1}
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
                                                    disabled={updateWorkspaceMutation.isPending}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="edit-rules">Workspace Rules</Label>
                                                <Textarea
                                                    id="edit-rules"
                                                    value={editingWorkspace.workspaceRules}
                                                    onChange={(e) => setEditingWorkspace(prev => prev ? { ...prev, workspaceRules: e.target.value } : null)}
                                                    placeholder="Enter workspace rules..."
                                                    disabled={updateWorkspaceMutation.isPending}
                                                    className="min-h-[100px]"
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setEditingWorkspace(null)} disabled={updateWorkspaceMutation.isPending}>
                                                Cancel
                                            </Button>
                                            <Button onClick={handleSaveEdit} disabled={updateWorkspaceMutation.isPending}>
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
                                            <Button variant="outline" onClick={() => setDeletingWorkspaceId(null)} disabled={deleteWorkspaceMutation.isPending}>
                                                Cancel
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                onClick={() => handleDeleteWorkspace(deletingWorkspaceId)}
                                                disabled={deleteWorkspaceMutation.isPending}
                                            >
                                                Delete Workspace
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            )
                        }
                    </div>
                );
            case 'ai-providers':
                return <AIProviderManagement ref={aiProviderManagementRef} />;
            default:
                return null;
        }
    };

    return (
        <div className="h-full flex">
            <div className="container mx-auto h-full flex">
                {/* Vertical Tabs Sidebar */}
                <div className="w-96 h-full overflow-y-auto">
                    <div className="py-6 space-y-2">
                        {SETTINGS_TABS.map((tab) => (
                            <Button
                                key={tab.id}
                                variant={activeTab === tab.id ? "default" : "ghost"}
                                className={`w-full justify-start h-auto p-3 ${activeTab === tab.id
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-muted"
                                    }`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <div className="flex items-center gap-3">
                                    {tab.icon}
                                    <div className="text-left">
                                        <div className="font-medium">{tab.label}</div>
                                        <div className="text-xs opacity-70">{tab.description}</div>
                                    </div>
                                </div>
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto">
                    <div className="pl-8 pr-4 py-6">
                        {/* Tab Header */}
                        <div className="mb-6 flex items-start justify-between">
                            <div>
                                <h2 className="text-2xl font-bold">
                                    {SETTINGS_TABS.find(tab => tab.id === activeTab)?.label}
                                </h2>
                                <p className="text-muted-foreground">
                                    {SETTINGS_TABS.find(tab => tab.id === activeTab)?.description}
                                </p>
                            </div>
                            {activeTab === 'ai-providers' && (
                                <Button onClick={() => aiProviderManagementRef.current?.handleAddProvider()} className="ml-4">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Provider
                                </Button>
                            )}
                        </div>

                        {/* Tab Content */}
                        {renderTabContent()}
                    </div>
                </div>
            </div>
        </div>
    );
}
