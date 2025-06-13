"use client"

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Eye, EyeOff, CheckCircle, XCircle, Save, Search, Trash2, TestTube, Plus, Key, Bot, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { authService } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { openaiProvidersAPI, type OpenAIProvider } from '@/lib/api/openai-providers';
import { openaiModelConfigsAPI, type OpenAIModelConfig as APIModelConfig } from '@/lib/api/openai-model-configs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AddModelModal from './add-model-modal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface OpenAIModel {
    id: string;
    object: string;
    created: number;
    owned_by: string;
}

interface OpenAIKey {
    id: string;
    name: string;
    apiKey: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

// Use the API type directly
type OpenAIModelConfig = APIModelConfig;

export function OpenAISettingsView() {
    const router = useRouter();
    const { addToast } = useToast();
    const queryClient = useQueryClient();

    // Tab management
    const [activeTab, setActiveTab] = useState<'keys' | 'models'>('keys');

    // Keys management state
    const [keys, setKeys] = useState<OpenAIKey[]>([]);
    const [editingKey, setEditingKey] = useState<OpenAIKey | null>(null);
    const [keyForm, setKeyForm] = useState({ name: '', apiKey: '', showApiKey: false });
    const [isValidatingKey, setIsValidatingKey] = useState(false);
    const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

    // Models management state
    const [models, setModels] = useState<OpenAIModelConfig[]>([]);
    const [selectedKeyId, setSelectedKeyId] = useState<string>('');
    const [availableModels, setAvailableModels] = useState<OpenAIModel[]>([]);
    const [selectedModels, setSelectedModels] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModelModalOpen, setIsAddModelModalOpen] = useState(false);
    const [selectedKeyForModel, setSelectedKeyForModel] = useState<string>('');
    const [isLoadingModelsForKey, setIsLoadingModelsForKey] = useState(false);

    const user = authService.getCurrentUser();

    // Define tabs
    const tabs = [
        {
            id: 'keys' as const,
            label: 'API Keys',
            icon: <Key className="h-4 w-4" />,
            description: 'Manage your OpenAI API keys'
        },
        {
            id: 'models' as const,
            label: 'Models',
            icon: <Bot className="h-4 w-4" />,
            description: 'Configure models for each API key'
        }
    ];

    // Fetch OpenAI keys using the new dedicated API
    const { data: keysData, isLoading: isLoadingKeys, error: keysError } = useQuery({
        queryKey: ['openai-keys'],
        queryFn: async () => {
            const providers = await openaiProvidersAPI.getProviders();
            return providers.map(p => ({
                id: p.id,
                name: p.name,
                apiKey: p.apiKey,
                isActive: p.isActive,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt
            })) as OpenAIKey[];
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Fetch OpenAI model configurations
    const { data: modelsData, isLoading: isLoadingModels } = useQuery({
        queryKey: ['openai-model-configs'],
        queryFn: () => openaiModelConfigsAPI.getModelConfigs(),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Update local state when data is loaded
    React.useEffect(() => {
        if (keysData) {
            setKeys(keysData);
        }
    }, [keysData]);

    React.useEffect(() => {
        if (modelsData) {
            setModels(modelsData);
        }
    }, [modelsData]);

    // Filter available models based on search
    const filteredAvailableModels = useMemo(() => {
        if (!searchQuery.trim()) return availableModels;
        const query = searchQuery.toLowerCase();
        return availableModels.filter(model =>
            model.id.toLowerCase().includes(query) ||
            model.owned_by.toLowerCase().includes(query)
        );
    }, [availableModels, searchQuery]);

    // Get active key for models tab
    const activeKey = useMemo(() => {
        return keys.find(key => key.id === selectedKeyId);
    }, [keys, selectedKeyId]);

    React.useLayoutEffect(() => {
        if (!user) {
            router.push('/');
            return;
        }
    }, [user, router]);

    // Validate API key and fetch models for keys tab
    const validateApiKey = async () => {
        if (!keyForm.apiKey.trim()) {
            addToast({
                title: "Validation Error",
                description: "API key is required",
                variant: "destructive"
            });
            return;
        }

        setIsValidatingKey(true);

        try {
            const result = await apiClient.fetchOpenAIModels({ apiKey: keyForm.apiKey.trim() });

            if (result.success && result.models) {
                addToast({
                    title: "API Key Valid",
                    description: `Found ${result.models.length} available models`,
                    variant: "success"
                });
                return true;
            } else {
                addToast({
                    title: "Validation Failed",
                    description: result.message || 'Invalid API key',
                    variant: "destructive"
                });
                return false;
            }
        } catch (error) {
            addToast({
                title: "Validation Failed",
                description: error instanceof Error ? error.message : 'Validation failed',
                variant: "destructive"
            });
            return false;
        } finally {
            setIsValidatingKey(false);
        }
    };

    // Fetch models for selected key in models tab
    const fetchModelsForKey = async (keyId: string) => {
        const key = keys.find(k => k.id === keyId);
        if (!key) return;

        try {
            const result = await apiClient.fetchOpenAIModels({ apiKey: key.apiKey });
            if (result.success && result.models) {
                setAvailableModels(result.models);
            }
        } catch (error) {
            addToast({
                title: "Error",
                description: "Failed to fetch models for this key",
                variant: "destructive"
            });
        }
    };

    // Save key mutation
    const saveKeyMutation = useMutation({
        mutationFn: async (keyData: { name: string; apiKey: string }) => {
            if (editingKey?.id) {
                return openaiProvidersAPI.updateProvider(editingKey.id, {
                    name: keyData.name,
                    apiKey: keyData.apiKey,
                    isActive: true
                });
            } else {
                return openaiProvidersAPI.createProvider({
                    name: keyData.name,
                    apiKey: keyData.apiKey,
                    isActive: true
                });
            }
        },
        onSuccess: (data) => {
            addToast({
                title: editingKey ? "Key Updated" : "Key Created",
                description: "OpenAI API key has been saved successfully",
                variant: "success"
            });
            queryClient.invalidateQueries({ queryKey: ['openai-keys'] });
            resetKeyForm(); // This will also close the modal
        },
        onError: (error) => {
            addToast({
                title: "Save Failed",
                description: error instanceof Error ? error.message : "Failed to save key",
                variant: "destructive"
            });
        }
    });

    // Delete key mutation
    const deleteKeyMutation = useMutation({
        mutationFn: (keyId: string) => openaiProvidersAPI.deleteProvider(keyId),
        onSuccess: () => {
            addToast({
                title: "Key Deleted",
                description: "OpenAI API key has been deleted successfully",
                variant: "success"
            });
            queryClient.invalidateQueries({ queryKey: ['openai-keys'] });
            queryClient.invalidateQueries({ queryKey: ['openai-model-configs'] });
        },
        onError: (error) => {
            addToast({
                title: "Delete Failed",
                description: error instanceof Error ? error.message : "Failed to delete key",
                variant: "destructive"
            });
        }
    });

    // Test key mutation
    const testKeyMutation = useMutation({
        mutationFn: (keyId: string) => openaiProvidersAPI.testProvider(keyId),
        onSuccess: () => {
            addToast({
                title: "Test Successful",
                description: "API key is valid and working",
                variant: "success"
            });
        },
        onError: (error) => {
            addToast({
                title: "Test Failed",
                description: error instanceof Error ? error.message : "Failed to test key",
                variant: "destructive"
            });
        }
    });

    // Model configuration mutations
    const createModelConfigMutation = useMutation({
        mutationFn: (request: { keyId: string; modelId: string; customName?: string }) =>
            openaiModelConfigsAPI.createModelConfig(request),
        onSuccess: () => {
            addToast({
                title: "Model Added",
                description: "Model configuration created successfully",
                variant: "success"
            });
            queryClient.invalidateQueries({ queryKey: ['openai-model-configs'] });
            setIsAddModelModalOpen(false);
        },
        onError: (error) => {
            addToast({
                title: "Add Model Failed",
                description: error instanceof Error ? error.message : "Failed to add model",
                variant: "destructive"
            });
        }
    });

    const updateModelConfigMutation = useMutation({
        mutationFn: ({ id, ...request }: { id: string; customName?: string; isActive?: boolean }) =>
            openaiModelConfigsAPI.updateModelConfig(id, request),
        onSuccess: () => {
            addToast({
                title: "Model Updated",
                description: "Model configuration updated successfully",
                variant: "success"
            });
            queryClient.invalidateQueries({ queryKey: ['openai-model-configs'] });
        },
        onError: (error) => {
            addToast({
                title: "Update Failed",
                description: error instanceof Error ? error.message : "Failed to update model",
                variant: "destructive"
            });
        }
    });

    const deleteModelConfigMutation = useMutation({
        mutationFn: (id: string) => openaiModelConfigsAPI.deleteModelConfig(id),
        onSuccess: () => {
            addToast({
                title: "Model Deleted",
                description: "Model configuration deleted successfully",
                variant: "success"
            });
            queryClient.invalidateQueries({ queryKey: ['openai-model-configs'] });
        },
        onError: (error) => {
            addToast({
                title: "Delete Failed",
                description: error instanceof Error ? error.message : "Failed to delete model",
                variant: "destructive"
            });
        }
    });

    // Helper functions
    const resetKeyForm = () => {
        setKeyForm({ name: '', apiKey: '', showApiKey: false });
        setEditingKey(null);
        setIsKeyModalOpen(false);
    };

    const handleKeyEdit = async (key: OpenAIKey) => {
        setEditingKey(key);
        setIsKeyModalOpen(true);

        try {
            // Fetch the decrypted API key for editing
            const decryptedApiKey = await openaiProvidersAPI.getDecryptedApiKey(key.id);
            setKeyForm({ name: key.name, apiKey: decryptedApiKey, showApiKey: false });
        } catch (error) {
            // If we can't get the decrypted key, show placeholder
            setKeyForm({ name: key.name, apiKey: '', showApiKey: false });
            addToast({
                title: "Warning",
                description: "Could not load API key for editing. Please enter the key again.",
                variant: "destructive"
            });
        }
    };

    const handleAddNewKey = () => {
        setEditingKey(null);
        setKeyForm({ name: '', apiKey: '', showApiKey: false });
        setIsKeyModalOpen(true);
    };

    const handleKeySave = async () => {
        if (!keyForm.name.trim()) {
            addToast({
                title: "Validation Error",
                description: "Key name is required",
                variant: "destructive"
            });
            return;
        }

        if (!keyForm.apiKey.trim()) {
            addToast({
                title: "Validation Error",
                description: "API key is required",
                variant: "destructive"
            });
            return;
        }

        // Validate key first if it's a new key or the key has changed
        if (!editingKey || keyForm.apiKey.trim()) {
            const isValid = await validateApiKey();
            if (!isValid) return;
        }

        saveKeyMutation.mutate({
            name: keyForm.name.trim(),
            apiKey: keyForm.apiKey.trim()
        });
    };

    const handleKeyToggleActive = async (key: OpenAIKey) => {
        try {
            await openaiProvidersAPI.updateProvider(key.id, {
                isActive: !key.isActive
            });
            queryClient.invalidateQueries({ queryKey: ['openai-keys'] });
            addToast({
                title: "Key Updated",
                description: `Key ${!key.isActive ? 'enabled' : 'disabled'}`,
                variant: "success"
            });
        } catch (error) {
            addToast({
                title: "Update Failed",
                description: "Failed to update key status",
                variant: "destructive"
            });
        }
    };

    const handleModelToggle = (modelId: string) => {
        setSelectedModels(prev =>
            prev.includes(modelId)
                ? prev.filter(id => id !== modelId)
                : [...prev, modelId]
        );
    };

    // Handle key selection in models tab
    const handleKeySelect = (keyId: string) => {
        setSelectedKeyId(keyId);
        setSelectedModels([]);
        setAvailableModels([]);
        if (keyId) {
            fetchModelsForKey(keyId);
        }
    };

    // Handle Add Model button click
    const handleAddModelClick = () => {
        if (keys.length === 0) {
            addToast({
                title: "No API Keys",
                description: "Please add an API key first before adding models",
                variant: "destructive"
            });
            return;
        }
        setIsAddModelModalOpen(true);
    };

    // Handle key selection in Add Model modal
    const handleKeySelectForModel = async (keyId: string) => {
        setSelectedKeyForModel(keyId);
        setIsLoadingModelsForKey(true);

        const key = keys.find(k => k.id === keyId);
        if (!key) return;

        try {
            const result = await apiClient.fetchOpenAIModels({ apiKey: key.apiKey });
            if (result.success && result.models) {
                setAvailableModels(result.models);
            }
        } catch (error) {
            addToast({
                title: "Error",
                description: "Failed to fetch models for this key",
                variant: "destructive"
            });
        } finally {
            setIsLoadingModelsForKey(false);
        }
    };

    // Handle adding a model
    const handleAddModel = async (modelId: string, customName?: string) => {
        if (!selectedKeyForModel) {
            addToast({
                title: "No Key Selected",
                description: "Please select an API key first",
                variant: "destructive"
            });
            return;
        }

        await createModelConfigMutation.mutateAsync({
            keyId: selectedKeyForModel,
            modelId,
            customName
        });
    };

    // Handle model toggle
    const handleModelToggleActive = (modelConfig: OpenAIModelConfig) => {
        updateModelConfigMutation.mutate({
            id: modelConfig.id,
            isActive: !modelConfig.isActive
        });
    };

    // Handle model delete
    const handleModelDelete = (modelConfig: OpenAIModelConfig) => {
        deleteModelConfigMutation.mutate(modelConfig.id);
    };

    if (!user) {
        return null;
    }

    if (isLoadingKeys || isLoadingModels) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

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
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4" />
                                Add Model
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {keys.filter(key => key.isActive).length === 0 ? (
                                <div className="px-3 py-2 text-sm text-muted-foreground">
                                    No active API keys available.
                                    <br />
                                    Please add an API key first.
                                </div>
                            ) : (
                                keys.filter(key => key.isActive).map((key) => (
                                    <DropdownMenuItem
                                        key={key.id}
                                        onClick={() => {
                                            setSelectedKeyForModel(key.id);
                                            handleKeySelectForModel(key.id);
                                            setIsAddModelModalOpen(true);
                                        }}
                                    >
                                        <Key className="h-4 w-4 mr-2" />
                                        {key.name}
                                    </DropdownMenuItem>
                                ))
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
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
                                ? 'Update your OpenAI API key configuration'
                                : 'Add a new OpenAI API key with a custom name'
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
                            <Label htmlFor="modal-apiKey">OpenAI API Key</Label>
                            <div className="relative">
                                <Input
                                    id="modal-apiKey"
                                    type={keyForm.showApiKey ? "text" : "password"}
                                    value={keyForm.apiKey}
                                    onChange={(e) => setKeyForm(prev => ({ ...prev, apiKey: e.target.value }))}
                                    placeholder="sk-..."
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

                        <Button
                            onClick={validateApiKey}
                            disabled={isValidatingKey || !keyForm.apiKey.trim()}
                            variant="outline"
                            className="w-full"
                        >
                            {isValidatingKey ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Validating...
                                </>
                            ) : (
                                <>
                                    <TestTube className="h-4 w-4" />
                                    Test Key
                                </>
                            )}
                        </Button>
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
                            disabled={saveKeyMutation.isPending || !keyForm.name.trim() || !keyForm.apiKey.trim()}
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

            {/* Add Model Modal */}
            <AddModelModal
                isOpen={isAddModelModalOpen}
                onClose={() => {
                    setIsAddModelModalOpen(false);
                    setSelectedKeyForModel('');
                    setAvailableModels([]);
                }}
                onAddModel={handleAddModel}
                availableModels={availableModels}
                isLoading={isLoadingModelsForKey}
            />
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
                            Manage your OpenAI API keys
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
                                    You haven't added any OpenAI API keys yet. Add your first key to get started with OpenAI models.
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
                            Manage your OpenAI model configurations
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {models.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                                    <Bot className="h-12 w-12 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">No Models Configured</h3>
                                <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                                    You haven't configured any models yet. Add your first model to get started.
                                </p>
                                {keys.filter(key => key.isActive).length > 0 ? (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button>
                                                <Plus className="h-4 w-4" />
                                                Add Your First Model
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="center">
                                            {keys.filter(key => key.isActive).map((key) => (
                                                <DropdownMenuItem
                                                    key={key.id}
                                                    onClick={() => {
                                                        setSelectedKeyForModel(key.id);
                                                        handleKeySelectForModel(key.id);
                                                        setIsAddModelModalOpen(true);
                                                    }}
                                                >
                                                    <Key className="h-4 w-4 mr-2" />
                                                    {key.name}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : (
                                    <div className="text-center">
                                        <p className="text-sm text-muted-foreground mb-3">
                                            No active API keys available. Please add an API key first.
                                        </p>
                                        <Button variant="outline" onClick={() => setActiveTab('keys')}>
                                            Go to API Keys
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {models.map((model) => (
                                    <div key={model.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-medium">
                                                    {model.customName || model.modelName}
                                                </h3>
                                                {model.customName && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {model.modelId}
                                                    </Badge>
                                                )}
                                                <Badge variant="outline">
                                                    {model.keyName}
                                                </Badge>
                                                <Badge variant={model.isActive ? "default" : "secondary"}>
                                                    {model.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </div>
                                            <div className="mt-1 space-y-1">
                                                <p className="text-sm text-muted-foreground">
                                                    Model ID: {model.modelId}
                                                </p>
                                                {model.capabilities && Object.keys(model.capabilities).length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {Object.entries(model.capabilities).map(([key, value]) =>
                                                            value && (
                                                                <Badge key={key} variant="secondary" className="text-xs">
                                                                    {key}
                                                                </Badge>
                                                            )
                                                        )}
                                                    </div>
                                                )}
                                                {model.pricing && (model.pricing.inputTokens || model.pricing.outputTokens) && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {model.pricing.inputTokens && `Input: ${model.pricing.inputTokens}/1M`}
                                                        {model.pricing.inputTokens && model.pricing.outputTokens && ' • '}
                                                        {model.pricing.outputTokens && `Output: ${model.pricing.outputTokens}/1M`}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={model.isActive}
                                                onCheckedChange={() => handleModelToggleActive(model)}
                                                disabled={updateModelConfigMutation.isPending}
                                            />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleModelDelete(model)}
                                                disabled={deleteModelConfigMutation.isPending}
                                            >
                                                {deleteModelConfigMutation.isPending ? (
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
