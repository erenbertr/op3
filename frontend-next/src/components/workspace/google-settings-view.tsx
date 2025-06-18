"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Key, Bot, Eye, EyeOff, Edit, Trash2, TestTube } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { apiClient } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AddModelModal from './add-model-modal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface GoogleModel {
    id: string;
    object: string;
    created: number;
    owned_by: string;
    name?: string;
    description?: string;
    capabilities?: any;
    pricing?: any;
}

interface GoogleKey {
    id: string;
    name: string;
    apiKey: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface GoogleModelConfig {
    id: string;
    keyId: string;
    keyName: string;
    modelId: string;
    modelName: string;
    customName?: string;
    capabilities?: any;
    pricing?: any;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export function GoogleSettingsView() {
    const router = useRouter();
    const { addToast } = useToast();
    const queryClient = useQueryClient();

    // Tab management
    const [activeTab, setActiveTab] = useState<'keys' | 'models'>('models');

    // Keys management state
    const [keys, setKeys] = useState<GoogleKey[]>([]);
    const [editingKey, setEditingKey] = useState<GoogleKey | null>(null);
    const [keyForm, setKeyForm] = useState({ name: '', apiKey: '', showApiKey: false });
    const [isValidatingKey, setIsValidatingKey] = useState(false);
    const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

    // Models management state
    const [modelConfigs, setModelConfigs] = useState<GoogleModelConfig[]>([]);
    const [availableModels, setAvailableModels] = useState<GoogleModel[]>([]);
    const [isLoadingModelsForKey, setIsLoadingModelsForKey] = useState(false);
    const [isAddModelModalOpen, setIsAddModelModalOpen] = useState(false);
    const [selectedKeyForModels, setSelectedKeyForModels] = useState<string>('');

    // Define tabs
    const tabs = [
        {
            id: 'models' as const,
            label: 'Models',
            icon: <Bot className="h-4 w-4" />,
            description: 'Configure models for each API key'
        },
        {
            id: 'keys' as const,
            label: 'API Keys',
            icon: <Key className="h-4 w-4" />,
            description: 'Manage your Google API keys'
        }
    ];

    // Fetch Google keys
    const { data: keysData, isLoading: isLoadingKeys, error: keysError } = useQuery({
        queryKey: ['google-keys'],
        queryFn: async () => {
            const response = await apiClient.request<{ success: boolean; data: GoogleKey[] }>('/google-providers');
            if (!response.success) {
                throw new Error(response.message || 'Failed to fetch Google providers');
            }
            return response.data || [];
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Update local state when data changes
    useEffect(() => {
        if (keysData) {
            setKeys(keysData);
        }
    }, [keysData]);

    // Create key mutation
    const createKeyMutation = useMutation({
        mutationFn: async (keyData: { name: string; apiKey: string; isActive: boolean }) => {
            const response = await apiClient.request<{ success: boolean; data: GoogleKey }>('/google-providers', {
                method: 'POST',
                body: JSON.stringify(keyData),
            });
            if (!response.success) {
                throw new Error(response.message || 'Failed to create Google provider');
            }
            return response.data;
        },
        onSuccess: (newKey) => {
            queryClient.invalidateQueries({ queryKey: ['google-keys'] });
            addToast({
                title: "Success",
                description: "Google API key added successfully",
                variant: "default"
            });
            handleCloseKeyModal();
        },
        onError: (error) => {
            addToast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to add Google API key",
                variant: "destructive"
            });
        }
    });

    // Update key mutation
    const updateKeyMutation = useMutation({
        mutationFn: async ({ id, keyData }: { id: string; keyData: { name?: string; apiKey?: string; isActive?: boolean } }) => {
            const response = await apiClient.request<{ success: boolean; data: GoogleKey }>(`/google-providers/${id}`, {
                method: 'PUT',
                body: JSON.stringify(keyData),
            });
            if (!response.success) {
                throw new Error(response.message || 'Failed to update Google provider');
            }
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['google-keys'] });
            addToast({
                title: "Success",
                description: "Google API key updated successfully",
                variant: "default"
            });
            handleCloseKeyModal();
        },
        onError: (error) => {
            addToast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to update Google API key",
                variant: "destructive"
            });
        }
    });

    // Delete key mutation
    const deleteKeyMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await apiClient.request<{ success: boolean }>(`/google-providers/${id}`, {
                method: 'DELETE',
            });
            if (!response.success) {
                throw new Error(response.message || 'Failed to delete Google provider');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['google-keys'] });
            addToast({
                title: "Success",
                description: "Google API key deleted successfully",
                variant: "default"
            });
        },
        onError: (error) => {
            addToast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to delete Google API key",
                variant: "destructive"
            });
        }
    });

    // Test key mutation
    const testKeyMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await apiClient.request<{ success: boolean }>(`/google-providers/${id}/test`, {
                method: 'POST',
            });
            if (!response.success) {
                throw new Error(response.message || 'Failed to test Google API key');
            }
        },
        onSuccess: () => {
            addToast({
                title: "Success",
                description: "Google API key is valid",
                variant: "default"
            });
        },
        onError: (error) => {
            addToast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to test Google API key",
                variant: "destructive"
            });
        }
    });

    const handleAddKey = () => {
        setEditingKey(null);
        setKeyForm({ name: '', apiKey: '', showApiKey: false });
        setIsKeyModalOpen(true);
    };

    const handleEditKey = (key: GoogleKey) => {
        setEditingKey(key);
        setKeyForm({ name: key.name, apiKey: '', showApiKey: false });
        setIsKeyModalOpen(true);
    };

    const handleDeleteKey = (id: string) => {
        if (confirm('Are you sure you want to delete this API key?')) {
            deleteKeyMutation.mutate(id);
        }
    };

    const handleTestKey = (id: string) => {
        testKeyMutation.mutate(id);
    };

    const handleCloseKeyModal = () => {
        setIsKeyModalOpen(false);
        setEditingKey(null);
        setKeyForm({ name: '', apiKey: '', showApiKey: false });
    };

    const handleSaveKey = async () => {
        if (!keyForm.name.trim()) {
            addToast({
                title: "Error",
                description: "Please enter a name for the API key",
                variant: "destructive"
            });
            return;
        }

        if (!editingKey && !keyForm.apiKey.trim()) {
            addToast({
                title: "Error",
                description: "Please enter an API key",
                variant: "destructive"
            });
            return;
        }

        const keyData = {
            name: keyForm.name.trim(),
            ...(keyForm.apiKey.trim() && { apiKey: keyForm.apiKey.trim() }),
            isActive: true
        };

        if (editingKey) {
            updateKeyMutation.mutate({ id: editingKey.id, keyData });
        } else {
            createKeyMutation.mutate(keyData as { name: string; apiKey: string; isActive: boolean });
        }
    };

    const fetchModelsForKey = async (keyId: string) => {
        setIsLoadingModelsForKey(true);
        setSelectedKeyForModels(keyId);

        try {
            // Get the decrypted API key from the backend
            const keyResponse = await apiClient.request<{ success: boolean; data: { apiKey: string } }>(`/google-providers/${keyId}/decrypted-key`);
            if (!keyResponse.success) {
                throw new Error(keyResponse.message || 'Failed to get API key');
            }

            const result = await apiClient.fetchGoogleModels({ apiKey: keyResponse.data.apiKey });
            if (result.success && result.models) {
                setAvailableModels(result.models);
            } else {
                addToast({
                    title: "Error",
                    description: result.message || "Failed to fetch models for this key",
                    variant: "destructive"
                });
            }
        } catch (error) {
            addToast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to fetch models for this key",
                variant: "destructive"
            });
        } finally {
            setIsLoadingModelsForKey(false);
        }
    };

    const handleAddModel = async (modelId: string, customName?: string) => {
        // For now, we'll just show a success message since we don't have model configs for Google yet
        addToast({
            title: "Success",
            description: `Model ${modelId} configuration saved`,
            variant: "default"
        });
        setIsAddModelModalOpen(false);
    };

    const handleAddNewKey = () => {
        handleAddKey();
    };

    const handleAddModelClick = () => {
        if (keys.length === 1) {
            fetchModelsForKey(keys[0].id);
            setIsAddModelModalOpen(true);
        } else if (keys.length > 1) {
            // Show key selection first
            addToast({
                title: "Select API Key",
                description: "Please select an API key first by clicking on it",
                variant: "default"
            });
        } else {
            addToast({
                title: "No API Keys",
                description: "Please add an API key first",
                variant: "destructive"
            });
        }
    };

    const renderKeysTab = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium">API Keys</h3>
                    <p className="text-sm text-muted-foreground">
                        Manage your Google API keys for Gemini models
                    </p>
                </div>
                <Button onClick={handleAddKey} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add API Key
                </Button>
            </div>

            {isLoadingKeys ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            ) : keys.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                        <Key className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No API Keys</h3>
                        <p className="text-sm text-muted-foreground text-center mb-4">
                            Add your first Google API key to get started with Gemini models
                        </p>
                        <Button onClick={handleAddKey} className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Add API Key
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {keys.map((key) => (
                        <Card key={key.id}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="flex items-center gap-3">
                                    <Key className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <CardTitle className="text-base">{key.name}</CardTitle>
                                        <p className="text-sm text-muted-foreground">
                                            {key.apiKey} • Created {new Date(key.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={key.isActive ? "default" : "secondary"}>
                                        {key.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEditKey(key)}>
                                                <Edit className="h-4 w-4 mr-2" />
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleTestKey(key.id)}>
                                                <TestTube className="h-4 w-4 mr-2" />
                                                Test
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handleDeleteKey(key.id)}
                                                className="text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );

    const renderModelsTab = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium">Model Configurations</h3>
                    <p className="text-sm text-muted-foreground">
                        Configure Gemini models for your API keys
                    </p>
                </div>
                {keys.length > 0 && (
                    <Button
                        onClick={() => {
                            if (keys.length === 1) {
                                fetchModelsForKey(keys[0].id);
                                setIsAddModelModalOpen(true);
                            } else {
                                // Show key selection first
                                addToast({
                                    title: "Select API Key",
                                    description: "Please select an API key first by clicking on it",
                                    variant: "default"
                                });
                            }
                        }}
                        className="flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add Model
                    </Button>
                )}
            </div>

            {keys.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                        <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No API Keys</h3>
                        <p className="text-sm text-muted-foreground text-center mb-4">
                            Add a Google API key first to configure Gemini models
                        </p>
                        <Button onClick={() => setActiveTab('keys')} variant="outline">
                            Go to API Keys
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {keys.map((key) => (
                        <Card key={key.id} className="cursor-pointer hover:bg-muted/50" onClick={() => fetchModelsForKey(key.id)}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Key className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <CardTitle className="text-base">{key.name}</CardTitle>
                                            <p className="text-sm text-muted-foreground">
                                                Click to configure models for this key
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant={key.isActive ? "default" : "secondary"}>
                                        {key.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Tabs and Add Button Row */}
            <div className="flex items-center justify-between">
                {/* Left: Tabs */}
                <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                    {tabs.map((tab) => (
                        <Button
                            key={tab.id}
                            variant="ghost"
                            size="sm"
                            className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${activeTab === tab.id
                                ? "bg-background text-foreground shadow-sm"
                                : "hover:bg-background/50"
                                }`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.icon}
                            <span className="ml-2">{tab.label}</span>
                        </Button>
                    ))}
                </div>

                {/* Right: Add New Button */}
                {activeTab === 'keys' && keys.length === 0 && (
                    <Button onClick={handleAddNewKey}>
                        <Plus className="h-4 w-4" />
                        Add New API Key
                    </Button>
                )}
                {activeTab === 'models' && (
                    <Button onClick={handleAddModelClick}>
                        <Plus className="h-4 w-4" />
                        Add Model
                    </Button>
                )}
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === 'keys' && renderKeysTab()}
                {activeTab === 'models' && renderModelsTab()}
            </div>

            {/* Key Modal */}
            <Dialog open={isKeyModalOpen} onOpenChange={setIsKeyModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingKey ? 'Edit API Key' : 'Add New API Key'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingKey
                                ? 'Update your Google API key configuration'
                                : 'Add a new Google API key with a custom name'
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={keyForm.name}
                                onChange={(e) => setKeyForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="e.g., My Google Key"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="apiKey">API Key {editingKey && '(leave empty to keep current)'}</Label>
                            <div className="relative">
                                <Input
                                    id="apiKey"
                                    type={keyForm.showApiKey ? "text" : "password"}
                                    value={keyForm.apiKey}
                                    onChange={(e) => setKeyForm(prev => ({ ...prev, apiKey: e.target.value }))}
                                    placeholder={editingKey ? "Enter new API key (optional)" : "AIza..."}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setKeyForm(prev => ({ ...prev, showApiKey: !prev.showApiKey }))}
                                >
                                    {keyForm.showApiKey ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={handleCloseKeyModal}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveKey}
                            disabled={createKeyMutation.isPending || updateKeyMutation.isPending}
                        >
                            {(createKeyMutation.isPending || updateKeyMutation.isPending) && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {editingKey ? 'Update' : 'Add'} Key
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Add Model Modal */}
            <AddModelModal
                isOpen={isAddModelModalOpen}
                onClose={() => setIsAddModelModalOpen(false)}
                onAddModel={handleAddModel}
                availableModels={availableModels}
                isLoading={isLoadingModelsForKey}
            />
        </div>
    );
}
