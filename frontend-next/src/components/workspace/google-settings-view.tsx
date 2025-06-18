"use client"

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Key, Bot, Edit, Trash2, TestTube, Eye, EyeOff, Loader2, Save } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface GoogleKey {
    id: string;
    name: string;
    apiKey: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export function GoogleSettingsView() {
    const { addToast } = useToast();
    const queryClient = useQueryClient();

    // Tab management
    const [activeTab, setActiveTab] = useState<'keys' | 'models'>('keys');

    // Keys management state
    const [keys, setKeys] = useState<GoogleKey[]>([]);
    const [editingKey, setEditingKey] = useState<GoogleKey | null>(null);
    const [keyForm, setKeyForm] = useState({ name: '', apiKey: '', showApiKey: false });
    const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

    const tabs = [
        { id: 'keys' as const, label: 'API Keys', icon: <Key className="h-4 w-4" /> },
        { id: 'models' as const, label: 'Models', icon: <Bot className="h-4 w-4" /> }
    ];

    // Fetch Google keys
    const { data: keysData, isLoading: isLoadingKeys } = useQuery({
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

    // Save key mutation
    const saveKeyMutation = useMutation({
        mutationFn: async (keyData: { name: string; apiKey: string; isActive: boolean }) => {
            if (editingKey) {
                const response = await apiClient.request<{ success: boolean; data: GoogleKey }>(`/google-providers/${editingKey.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(keyData),
                });
                if (!response.success) {
                    throw new Error(response.message || 'Failed to update Google provider');
                }
                return response.data;
            } else {
                const response = await apiClient.request<{ success: boolean; data: GoogleKey }>('/google-providers', {
                    method: 'POST',
                    body: JSON.stringify(keyData),
                });
                if (!response.success) {
                    throw new Error(response.message || 'Failed to create Google provider');
                }
                return response.data;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['google-keys'] });
            addToast({
                title: "Success",
                description: editingKey ? "Google API key updated successfully" : "Google API key added successfully",
                variant: "default"
            });
            resetKeyForm();
        },
        onError: (error) => {
            addToast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to save Google API key",
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

    const handleAddNewKey = () => {
        setEditingKey(null);
        setKeyForm({ name: '', apiKey: '', showApiKey: false });
        setIsKeyModalOpen(true);
    };

    const handleKeyEdit = (key: GoogleKey) => {
        setEditingKey(key);
        setKeyForm({ name: key.name, apiKey: '', showApiKey: false });
        setIsKeyModalOpen(true);
    };

    const handleKeyToggleActive = (key: GoogleKey) => {
        saveKeyMutation.mutate({
            name: key.name,
            apiKey: key.apiKey,
            isActive: !key.isActive
        });
    };

    const handleKeySave = () => {
        if (!keyForm.name.trim() || (!editingKey && !keyForm.apiKey.trim())) {
            addToast({
                title: "Error",
                description: "Please fill in all required fields",
                variant: "destructive"
            });
            return;
        }

        saveKeyMutation.mutate({
            name: keyForm.name.trim(),
            apiKey: keyForm.apiKey.trim(),
            isActive: true
        });
    };

    const resetKeyForm = () => {
        setIsKeyModalOpen(false);
        setEditingKey(null);
        setKeyForm({ name: '', apiKey: '', showApiKey: false });
    };

    const handleAddModelClick = () => {
        addToast({
            title: "Coming Soon",
            description: "Model configuration for Google providers will be available soon",
            variant: "default"
        });
    };

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
                {activeTab === 'keys' && (
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

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="modal-keyName">Key Name</Label>
                            <Input
                                id="modal-keyName"
                                value={keyForm.name}
                                onChange={(e) => setKeyForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="e.g., Personal Key, Work Key, etc."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="modal-apiKey">Google API Key</Label>
                            <div className="relative">
                                <Input
                                    id="modal-apiKey"
                                    type={keyForm.showApiKey ? "text" : "password"}
                                    value={keyForm.apiKey}
                                    onChange={(e) => setKeyForm(prev => ({ ...prev, apiKey: e.target.value }))}
                                    placeholder="AIza..."
                                    className="pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setKeyForm(prev => ({ ...prev, showApiKey: !prev.showApiKey }))}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
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

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={resetKeyForm}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleKeySave}
                            disabled={saveKeyMutation.isPending || !keyForm.name.trim() || (!editingKey && !keyForm.apiKey.trim())}
                        >
                            {saveKeyMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    {editingKey ? 'Update Key' : 'Save Key'}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );

    // Keys Tab Content
    function renderKeysTab() {
        return (
            <div className="space-y-6">
                {/* Existing Keys or Empty State */}
                <Card>
                    <CardHeader>
                        <CardTitle>API Keys</CardTitle>
                        <CardDescription>
                            Manage your Google API keys
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {keys.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                                    <Key className="h-12 w-12 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">No API Keys</h3>
                                <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                                    You haven't added any Google API keys yet. Add your first key to get started with Gemini models.
                                </p>
                                <Button onClick={handleAddNewKey}>
                                    <Plus className="h-4 w-4" />
                                    Add Your First API Key
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {keys.map((key) => (
                                    <div key={key.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-medium">{key.name}</h3>
                                                <Badge variant={key.isActive ? "default" : "secondary"}>
                                                    {key.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Key: {key.apiKey.substring(0, 8)}...
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={key.isActive}
                                                onCheckedChange={() => handleKeyToggleActive(key)}
                                            />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => testKeyMutation.mutate(key.id)}
                                                disabled={testKeyMutation.isPending}
                                            >
                                                {testKeyMutation.isPending ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <TestTube className="h-4 w-4" />
                                                )}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleKeyEdit(key)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => deleteKeyMutation.mutate(key.id)}
                                                disabled={deleteKeyMutation.isPending}
                                            >
                                                {deleteKeyMutation.isPending ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Models Tab Content
    function renderModelsTab() {
        return (
            <div className="space-y-6">
                {/* Configured Models */}
                <Card>
                    <CardHeader>
                        <CardTitle>Configured Models</CardTitle>
                        <CardDescription>
                            Manage your Google model configurations
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-12">
                            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                                <Bot className="h-12 w-12 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Models Coming Soon</h3>
                            <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                                Google model configuration will be available in a future update.
                            </p>
                            {keys.length === 0 ? (
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground mb-3">
                                        No active API keys available. Please add an API key first.
                                    </p>
                                    <Button variant="outline" onClick={() => setActiveTab('keys')}>
                                        Go to API Keys
                                    </Button>
                                </div>
                            ) : (
                                <Button onClick={handleAddModelClick} disabled>
                                    <Plus className="h-4 w-4" />
                                    Add Your First Model
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }
}
