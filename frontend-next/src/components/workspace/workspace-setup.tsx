"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { WorkspaceTemplate } from '@/lib/api';
import { useCreateWorkspace } from '@/lib/hooks/use-query-hooks';
import { useMoveWorkspaceToGroup } from '@/lib/hooks/use-workspace-groups';
import { MessageSquare, Kanban, Network } from 'lucide-react';

interface WorkspaceSetupProps {
    onComplete?: (workspace: { id: string; name: string; templateType: string; workspaceRules: string; isActive: boolean; createdAt: string } | undefined) => void;
    userId: string;
    groupId?: string | null;
}

interface TemplateOption {
    id: WorkspaceTemplate;
    title: string;
    description: string;
    icon: React.ReactNode;
}

export function WorkspaceSetup({ onComplete, userId, groupId }: WorkspaceSetupProps) {
    const [workspaceName, setWorkspaceName] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<WorkspaceTemplate | null>(null);
    const [workspaceRules, setWorkspaceRules] = useState('');
    const [error, setError] = useState('');

    const createWorkspaceMutation = useCreateWorkspace();
    const moveWorkspaceMutation = useMoveWorkspaceToGroup();

    const templateOptions: TemplateOption[] = [
        {
            id: 'standard-chat',
            title: 'Standard Chat',
            description: 'Traditional left navigation menu for chat history + right panel for active chat content',
            icon: <MessageSquare className="h-8 w-8" />
        },
        {
            id: 'kanban-board',
            title: 'Kanban Board',
            description: 'Trello-style board where each card represents an AI chat session, organized in columns',
            icon: <Kanban className="h-8 w-8" />
        },
        {
            id: 'node-graph',
            title: 'Node Graph',
            description: 'Visual node-based interface where users can create, connect, and drag-drop nodes to represent chat workflows/processes',
            icon: <Network className="h-8 w-8" />
        }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!workspaceName.trim()) {
            setError('Please enter a workspace name');
            return;
        }

        if (!selectedTemplate) {
            setError('Please select a workspace template');
            return;
        }

        try {
            const result = await createWorkspaceMutation.mutateAsync({
                name: workspaceName.trim(),
                templateType: selectedTemplate,
                workspaceRules,
                userId
            });

            if (result.success && result.workspace) {
                // If groupId is specified, move the workspace to that group
                if (groupId) {
                    try {
                        await moveWorkspaceMutation.mutateAsync({
                            userId,
                            workspaceId: result.workspace.id,
                            groupId,
                            sortOrder: 0 // Place at the beginning of the group
                        });
                    } catch (moveError) {
                        console.error('Error moving workspace to group:', moveError);
                        // Don't fail the creation if group assignment fails
                    }
                }

                onComplete?.(result.workspace);
            } else {
                setError(result.message || 'Failed to create workspace');
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to create workspace');
        }
    };

    return (
        <div className="w-full max-w-4xl space-y-8">

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Workspace Name */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="workspaceName" className="text-lg font-semibold">
                            Workspace Name *
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Give your workspace a descriptive name
                        </p>
                    </div>
                    <Input
                        id="workspaceName"
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        placeholder="e.g., My First Workspace, Development Chat, etc."
                        disabled={createWorkspaceMutation.isPending}
                        className="max-w-md"
                    />
                </div>

                {/* Template Selection */}
                <div className="space-y-4">
                    <Label className="text-lg font-semibold">Choose a Template *</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {templateOptions.map((template) => (
                            <Card
                                key={template.id}
                                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${selectedTemplate === template.id
                                    ? 'ring-2 ring-primary border-primary bg-primary/5'
                                    : 'hover:border-primary/50'
                                    }`}
                                onClick={() => setSelectedTemplate(template.id)}
                            >
                                <CardHeader className="text-center pb-4">
                                    <div className="flex justify-center mb-3">
                                        <div className={`p-3 rounded-full ${selectedTemplate === template.id
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground'
                                            }`}>
                                            {template.icon}
                                        </div>
                                    </div>
                                    <CardTitle className="text-lg">{template.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <CardDescription className="text-center text-sm leading-relaxed">
                                        {template.description}
                                    </CardDescription>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Workspace Configuration */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="workspaceRules" className="text-lg font-semibold">
                            Workspace Rules/Instructions
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Define custom AI behavior guidelines for your workspace (optional)
                        </p>
                    </div>
                    <Textarea
                        id="workspaceRules"
                        value={workspaceRules}
                        onChange={(e) => setWorkspaceRules(e.target.value)}
                        placeholder="Enter any specific rules or instructions for AI behavior in this workspace..."
                        className="min-h-[120px]"
                        disabled={createWorkspaceMutation.isPending}
                    />
                </div>

                {/* Error Display */}
                {error && (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                        <p className="text-destructive text-sm">{error}</p>
                    </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end">
                    <Button
                        type="submit"
                        disabled={createWorkspaceMutation.isPending || !selectedTemplate}
                        className="px-8 py-2"
                    >
                        {createWorkspaceMutation.isPending ? 'Creating Workspace...' : 'Create Workspace'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
