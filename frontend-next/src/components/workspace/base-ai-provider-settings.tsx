"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Key, Bot, Eye, EyeOff, Edit, Trash2, TestTube } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useSession } from '@/lib/temp-auth';

import {
    AIProviderConfig,
    BaseProvider,
    BaseModel,
    BaseModelConfig
} from '@/types/ai-provider-config';
import {
    BaseProviderAPI,
    BaseModelConfigAPI,
    BaseModelsAPI,
    CreateProviderRequest,
    UpdateProviderRequest,
    CreateModelConfigRequest,
    UpdateModelConfigRequest
} from '@/lib/api/base-provider-api';
import AddModelModal from './add-model-modal';

interface BaseAIProviderSettingsProps {
    config: AIProviderConfig;
}

export function BaseAIProviderSettings({ config }: BaseAIProviderSettingsProps) {
    const router = useRouter();
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    const { data: session } = useSession();
    const user = session?.user;

    // Initialize API services
    const providerAPI = new BaseProviderAPI(config.api);
    const modelConfigAPI = new BaseModelConfigAPI(config.api);
    const modelsAPI = new BaseModelsAPI(config.api);

    // Tab management
    const [activeTab, setActiveTab] = useState<'keys' | 'models'>('models');

    // Keys management state
    const [keys, setKeys] = useState<BaseProvider[]>([]);
    const [editingKey, setEditingKey] = useState<BaseProvider | null>(null);
    const [keyForm, setKeyForm] = useState({ name: '', apiKey: '', showApiKey: false });
    const [isValidatingKey, setIsValidatingKey] = useState(false);
    const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

    // Models management state
    const [modelConfigs, setModelConfigs] = useState<BaseModelConfig[]>([]);
    const [availableModels, setAvailableModels] = useState<BaseModel[]>([]);
    const [isLoadingModelsForKey, setIsLoadingModelsForKey] = useState(false);
    const [isAddModelModalOpen, setIsAddModelModalOpen] = useState(false);
    const [selectedKeyForModel, setSelectedKeyForModel] = useState<string>('');

    // Define tabs
    const tabs = [
        {
            id: 'models' as const,
            label: config.ui.modelsTabLabel,
            icon: <Bot className="h-4 w-4" />,
            description: config.ui.modelsTabDescription
        },
        {
            id: 'keys' as const,
            label: config.ui.keysTabLabel,
            icon: <Key className="h-4 w-4" />,
            description: config.ui.keysTabDescription
        }
    ];

    // Fetch providers using TanStack Query
    const { data: keysData, isLoading: isLoadingKeys, error: keysError } = useQuery({
        queryKey: [config.api.providersQueryKey],
        queryFn: () => providerAPI.getProviders(),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Fetch model configurations (only if endpoint exists)
    const { data: modelConfigsData, isLoading: isLoadingModelConfigs, error: modelConfigsError } = useQuery({
        queryKey: [config.api.modelConfigsQueryKey],
        queryFn: () => modelConfigAPI.getModelConfigs(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: false, // Don't retry on 404 errors
        enabled: !!config.api.modelConfigsEndpoint, // Only fetch if endpoint is configured
    });

    // Update local state when data changes
    useEffect(() => {
        if (keysData) {
            setKeys(keysData);
        }
    }, [keysData]);

    useEffect(() => {
        if (modelConfigsData) {
            setModelConfigs(modelConfigsData);
        }
    }, [modelConfigsData]);

    // Create key mutation
    const createKeyMutation = useMutation({
        mutationFn: (keyData: CreateProviderRequest) => providerAPI.createProvider(keyData),
        onSuccess: () => {
            addToast({
                title: "Key Created",
                description: `${config.ui.displayName} API key has been saved successfully`,
                variant: "success"
            });
            queryClient.invalidateQueries({ queryKey: [config.api.providersQueryKey] });
            resetKeyForm();
        },
        onError: (error) => {
            addToast({
                title: "Error",
                description: error instanceof Error ? error.message : `Failed to add ${config.ui.displayName} API key`,
                variant: "destructive"
            });
        }
    });

    // Update key mutation
    const updateKeyMutation = useMutation({
        mutationFn: ({ id, keyData }: { id: string; keyData: UpdateProviderRequest }) =>
            providerAPI.updateProvider(id, keyData),
        onSuccess: () => {
            addToast({
                title: "Key Updated",
                description: `${config.ui.displayName} API key has been updated successfully`,
                variant: "success"
            });
            queryClient.invalidateQueries({ queryKey: [config.api.providersQueryKey] });
            resetKeyForm();
        },
        onError: (error) => {
            addToast({
                title: "Error",
                description: error instanceof Error ? error.message : `Failed to update ${config.ui.displayName} API key`,
                variant: "destructive"
            });
        }
    });

    // Delete key mutation
    const deleteKeyMutation = useMutation({
        mutationFn: (id: string) => providerAPI.deleteProvider(id),
        onSuccess: () => {
            addToast({
                title: "Key Deleted",
                description: `${config.ui.displayName} API key has been deleted successfully`,
                variant: "success"
            });
            queryClient.invalidateQueries({ queryKey: [config.api.providersQueryKey] });
        },
        onError: (error) => {
            addToast({
                title: "Error",
                description: error instanceof Error ? error.message : `Failed to delete ${config.ui.displayName} API key`,
                variant: "destructive"
            });
        }
    });

    // Test key mutation
    const testKeyMutation = useMutation({
        mutationFn: (id: string) => providerAPI.testProvider(id),
        onSuccess: () => {
            addToast({
                title: "Success",
                description: `${config.ui.displayName} API key is valid`,
                variant: "success"
            });
        },
        onError: (error) => {
            addToast({
                title: "Error",
                description: error instanceof Error ? error.message : `Failed to test ${config.ui.displayName} API key`,
                variant: "destructive"
            });
        }
    });

    // Create model config mutation
    const createModelConfigMutation = useMutation({
        mutationFn: (request: CreateModelConfigRequest) => modelConfigAPI.createModelConfig(request),
        onSuccess: () => {
            addToast({
                title: "Model Added",
                description: "Model configuration has been saved successfully",
                variant: "success"
            });
            queryClient.invalidateQueries({ queryKey: [config.api.modelConfigsQueryKey] });
            setIsAddModelModalOpen(false);
        },
        onError: (error) => {
            addToast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to add model configuration",
                variant: "destructive"
            });
        }
    });

    // Update model config mutation
    const updateModelConfigMutation = useMutation({
        mutationFn: ({ id, request }: { id: string; request: UpdateModelConfigRequest }) =>
            modelConfigAPI.updateModelConfig(id, request),
        onSuccess: () => {
            addToast({
                title: "Model Updated",
                description: "Model configuration has been updated successfully",
                variant: "success"
            });
            queryClient.invalidateQueries({ queryKey: [config.api.modelConfigsQueryKey] });
        },
        onError: (error) => {
            addToast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to update model configuration",
                variant: "destructive"
            });
        }
    });

    // Delete model config mutation
    const deleteModelConfigMutation = useMutation({
        mutationFn: (id: string) => modelConfigAPI.deleteModelConfig(id),
        onSuccess: () => {
            addToast({
                title: "Model Deleted",
                description: "Model configuration has been deleted successfully",
                variant: "success"
            });
            queryClient.invalidateQueries({ queryKey: [config.api.modelConfigsQueryKey] });
        },
        onError: (error) => {
            addToast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to delete model configuration",
                variant: "destructive"
            });
        }
    });

    // Helper functions
    const resetKeyForm = () => {
        setEditingKey(null);
        setKeyForm({ name: '', apiKey: '', showApiKey: false });
        setIsKeyModalOpen(false);
    };

    const validateApiKey = (apiKey: string): boolean => {
        if (config.validation?.validateApiKeyFormat) {
            return config.validation.validateApiKeyFormat(apiKey);
        }
        return apiKey.trim().length > 0;
    };

    const handleKeyEdit = async (key: BaseProvider) => {
        setEditingKey(key);
        setIsKeyModalOpen(true);

        try {
            // Fetch the decrypted API key for editing
            const decryptedApiKey = await providerAPI.getDecryptedApiKey(key.id);
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

        if (keyForm.apiKey.trim() && !validateApiKey(keyForm.apiKey)) {
            addToast({
                title: "Error",
                description: config.validation?.apiKeyFormatErrorMessage || "Invalid API key format",
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
            createKeyMutation.mutate(keyData as CreateProviderRequest);
        }
    };

    const handleKeyDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this API key?')) {
            deleteKeyMutation.mutate(id);
        }
    };

    const handleKeyTest = (id: string) => {
        testKeyMutation.mutate(id);
    };

    const handleKeySelectForModel = async (keyId: string) => {
        setIsLoadingModelsForKey(true);
        setSelectedKeyForModel(keyId);

        try {
            const decryptedApiKey = await providerAPI.getDecryptedApiKey(keyId);
            const models = await modelsAPI.fetchModels(decryptedApiKey);
            setAvailableModels(models);
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

    const handleAddModelClick = () => {
        const activeKeys = keys.filter(key => key.isActive);

        if (activeKeys.length === 0) {
            addToast({
                title: "No API Keys",
                description: "Please add an API key first before adding models",
                variant: "destructive"
            });
            return;
        }

        // If there's only one active key, automatically select it and open the modal
        if (activeKeys.length === 1) {
            const singleKey = activeKeys[0];
            setSelectedKeyForModel(singleKey.id);
            handleKeySelectForModel(singleKey.id);
            setIsAddModelModalOpen(true);
        } else {
            // Multiple keys available - this will be handled by the dropdown in the UI
            setIsAddModelModalOpen(true);
        }
    };

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

    const handleModelToggleActive = (modelConfig: BaseModelConfig) => {
        updateModelConfigMutation.mutate({
            id: modelConfig.id,
            request: { isActive: !modelConfig.isActive }
        });
    };

    const handleModelDelete = (modelConfig: BaseModelConfig) => {
        deleteModelConfigMutation.mutate(modelConfig.id);
    };

    if (!user) {
        return null;
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
                        {config.ui.addKeyButtonLabel}
                    </Button>
                )}
                {activeTab === 'models' && !!config.api.modelConfigsEndpoint && (
                    (() => {
                        const activeKeys = keys.filter(key => key.isActive);

                        // If only one active key, show simple button
                        if (activeKeys.length <= 1) {
                            return (
                                <Button onClick={handleAddModelClick}>
                                    <Plus className="h-4 w-4" />
                                    {config.ui.addModelButtonLabel}
                                </Button>
                            );
                        }

                        // Multiple active keys, show dropdown
                        return (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button>
                                        <Plus className="h-4 w-4" />
                                        {config.ui.addModelButtonLabel}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {activeKeys.map((key) => (
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
                        );
                    })()
                )}
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === 'keys' && renderKeysTab()}
                {activeTab === 'models' && renderModelsTab()}
            </div>
        </div>
    );

    // Render functions
    function renderKeysTab() {
        return (
            <div className="space-y-6">
                {/* Existing Keys or Empty State */}
                <Card>
                    <CardHeader>
                        <CardTitle>{config.ui.keysTabLabel}</CardTitle>
                        <CardDescription>
                            {config.ui.keysTabDescription}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {keys.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                                    <Key className="h-12 w-12 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">{config.ui.noKeysTitle}</h3>
                                <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                                    {config.ui.noKeysDescription}
                                </p>
                                <Button onClick={handleAddNewKey}>
                                    <Plus className="h-4 w-4" />
                                    {config.ui.addKeyButtonLabel}
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
                                                onCheckedChange={() => updateKeyMutation.mutate({
                                                    id: key.id,
                                                    keyData: { isActive: !key.isActive }
                                                })}
                                            />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleKeyTest(key.id)}
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
                                                onClick={() => handleKeyDelete(key.id)}
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

                {/* Key Modal */}
                <Dialog open={isKeyModalOpen} onOpenChange={setIsKeyModalOpen}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>
                                {editingKey ? config.ui.editKeyModalTitle : config.ui.addKeyModalTitle}
                            </DialogTitle>
                            <DialogDescription>
                                {editingKey ? config.ui.editKeyModalDescription : config.ui.addKeyModalDescription}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="keyName">Name</Label>
                                <Input
                                    id="keyName"
                                    placeholder="Enter a name for this API key"
                                    value={keyForm.name}
                                    onChange={(e) => setKeyForm(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="apiKey">API Key</Label>
                                <div className="relative">
                                    <Input
                                        id="apiKey"
                                        type={keyForm.showApiKey ? "text" : "password"}
                                        placeholder={editingKey ? "Leave empty to keep current key" : "Enter your API key"}
                                        value={keyForm.apiKey}
                                        onChange={(e) => setKeyForm(prev => ({ ...prev, apiKey: e.target.value }))}
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

                            <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={resetKeyForm}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSaveKey}
                                    disabled={createKeyMutation.isPending || updateKeyMutation.isPending}
                                >
                                    {(createKeyMutation.isPending || updateKeyMutation.isPending) ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        editingKey ? 'Update Key' : 'Save Key'
                                    )}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    function renderModelsTab() {
        // Check if model configs are supported for this provider
        const modelConfigsSupported = !!config.api.modelConfigsEndpoint;

        if (!modelConfigsSupported) {
            return (
                <div className="space-y-6">
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                                <Bot className="h-12 w-12 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Models Coming Soon</h3>
                            <p className="text-muted-foreground mb-4 max-w-sm mx-auto text-center">
                                {config.ui.displayName} model configuration will be available in a future update.
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
                                <Button disabled>
                                    <Plus className="h-4 w-4" />
                                    Add Your First Model
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {keys.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                                <Bot className="h-12 w-12 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">{config.ui.noKeysTitle}</h3>
                            <p className="text-muted-foreground mb-4 max-w-sm mx-auto text-center">
                                {config.ui.noModelsDescription}
                            </p>
                            <Button onClick={() => setActiveTab('keys')} variant="outline">
                                Go to API Keys
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Model Configurations */}
                        {modelConfigs.length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                                        <Bot className="h-12 w-12 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">No Models Configured</h3>
                                    <p className="text-muted-foreground mb-4 max-w-sm mx-auto text-center">
                                        Add your first model to get started with {config.ui.displayName}.
                                    </p>

                                    {(() => {
                                        const activeKeys = keys.filter(key => key.isActive);

                                        // If only one active key, show simple button
                                        if (activeKeys.length === 1) {
                                            return (
                                                <Button onClick={handleAddModelClick}>
                                                    <Plus className="h-4 w-4" />
                                                    Add Your First Model
                                                </Button>
                                            );
                                        }

                                        // Multiple active keys, show dropdown
                                        return (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button>
                                                        <Plus className="h-4 w-4" />
                                                        Add Your First Model
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="center">
                                                    {activeKeys.map((key) => (
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
                                        );
                                    })()}
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {modelConfigs.map((modelConfig) => (
                                    <Card key={modelConfig.id}>
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Bot className="h-5 w-5 text-muted-foreground" />
                                                    <div>
                                                        <CardTitle className="text-base">
                                                            {modelConfig.customName || modelConfig.modelName}
                                                        </CardTitle>
                                                        <p className="text-sm text-muted-foreground">
                                                            {modelConfig.keyName} • {modelConfig.modelId}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={modelConfig.isActive}
                                                        onCheckedChange={() => handleModelToggleActive(modelConfig)}
                                                    />
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleModelDelete(modelConfig)}
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
                                        </CardHeader>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {/* Add Model Modal */}
                        <AddModelModal
                            isOpen={isAddModelModalOpen}
                            onClose={() => setIsAddModelModalOpen(false)}
                            onAddModel={handleAddModel}
                            availableModels={availableModels}
                            isLoading={isLoadingModelsForKey}
                        />
                    </>
                )}
            </div>
        );
    }
}
