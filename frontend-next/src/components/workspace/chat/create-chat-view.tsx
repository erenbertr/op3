"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkspaceLayout } from '../workspace-layout';
import { useSession } from '@/lib/temp-auth';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { Loader2 } from 'lucide-react';

interface CreateChatViewProps {
    workspaceId: string;
    groupId?: string | null;
}

export function CreateChatView({ workspaceId, groupId }: CreateChatViewProps) {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [workspace, setWorkspace] = useState<{ id: string; name: string; templateType: string; workspaceRules: string; isActive: boolean; createdAt: string } | null>(null);
    const { addToast } = useToast();
    const { data: session } = useSession();

    React.useMemo(() => {
        const loadWorkspace = async () => {
            if (!session?.user) {
                router.push('/');
                return;
            }

            try {
                const result = await apiClient.getUserWorkspaces(session.user.id);
                console.log('🔍 Workspace loading debug:', {
                    workspaceId,
                    result: result.success,
                    workspaceCount: result.workspaces?.length,
                    workspaceIds: result.workspaces?.map(w => w.id)
                });

                if (result.success) {
                    const foundWorkspace = result.workspaces.find(w => w.id === workspaceId);
                    if (foundWorkspace) {
                        console.log('✅ Workspace found:', foundWorkspace.name);
                        setWorkspace(foundWorkspace);
                    } else {
                        console.log('❌ Workspace not found in user workspaces');
                        addToast({
                            title: "Error",
                            description: "Workspace not found",
                            variant: "destructive"
                        });
                        router.push('/workspaces');
                    }
                } else {
                    console.log('❌ Failed to load workspaces:', result.message);
                    addToast({
                        title: "Error",
                        description: result.message || "Failed to load workspaces",
                        variant: "destructive"
                    });
                    router.push('/workspaces');
                }
            } catch (error) {
                console.error('Error loading workspace:', error);
                addToast({
                    title: "Error",
                    description: "Failed to load workspace",
                    variant: "destructive"
                });
                router.push('/workspaces');
            }
        };

        loadWorkspace();
    }, [workspaceId, router, addToast, session?.user]);

    const handleCreateChat = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!session?.user) {
            router.push('/');
            return;
        }

        if (!title.trim()) {
            addToast({
                title: "Error",
                description: "Please enter a chat title",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);
        try {
            const result = await apiClient.createChatSession({
                userId: session.user.id,
                workspaceId,
                title: title.trim()
            });

            if (result.success && result.session) {
                addToast({
                    title: "Success",
                    description: "Chat created successfully",
                    variant: "default"
                });
                router.push(`/ws/${workspaceId}/chat/${result.session.id}`);
            } else {
                addToast({
                    title: "Error",
                    description: result.message || "Failed to create chat",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error creating chat:', error);
            addToast({
                title: "Error",
                description: "Failed to create chat",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (!workspace) {
        return (
            <WorkspaceLayout currentWorkspaceId={workspaceId}>
                <div className="h-full flex items-center justify-center">
                    <div className="text-center space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                        <p className="text-muted-foreground">Loading workspace...</p>
                        <div className="text-xs text-muted-foreground">
                            <p>Workspace ID: {workspaceId}</p>
                            <p>Group ID: {groupId || 'None'}</p>
                            <p>🔍 CreateChatView component is rendering</p>
                        </div>
                    </div>
                </div>
            </WorkspaceLayout>
        );
    }

    return (
        <WorkspaceLayout currentWorkspaceId={workspaceId}>
            <div className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold">Create New Chat</h1>
                        <p className="text-muted-foreground">
                            in {workspace.name}
                            {groupId && (
                                <span className="text-xs ml-2 px-2 py-1 bg-muted rounded-md">
                                    Group context
                                </span>
                            )}
                        </p>
                    </div>

                    <form onSubmit={handleCreateChat} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Chat Title</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter a title for your chat..."
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Enter a description for your chat..."
                                rows={3}
                            />
                        </div>

                        <div className="flex gap-4">
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Create Chat
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    // Navigate back to workspace, preserving group context if available
                                    const backUrl = groupId
                                        ? `/ws/${workspaceId}?groupId=${groupId}`
                                        : `/ws/${workspaceId}`;
                                    router.push(backUrl);
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </WorkspaceLayout>
    );
}
