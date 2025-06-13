"use client"

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Eye, EyeOff, CheckCircle, XCircle, Save, Search, Trash2, TestTube, Plus } from 'lucide-react';
import { authService } from '@/lib/auth';
import { apiClient, AIProviderConfig } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface OpenAIModel {
    id: string;
    object: string;
    created: number;
    owned_by: string;
}

interface OpenAIProvider extends AIProviderConfig {
    type: 'openai';
    models?: string[];
}

export function OpenAISettingsView() {
    const router = useRouter();
    const { addToast } = useToast();
    const queryClient = useQueryClient();

    const [apiKey, setApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [selectedModels, setSelectedModels] = useState<string[]>([]);
    const [availableModels, setAvailableModels] = useState<OpenAIModel[]>([]);
    const [isValidating, setIsValidating] = useState(false);
    const [isValidated, setIsValidated] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [providers, setProviders] = useState<OpenAIProvider[]>([]);
    const [editingProvider, setEditingProvider] = useState<OpenAIProvider | null>(null);

    const user = authService.getCurrentUser();

    // Fetch existing OpenAI providers
    const { data: providersData, isLoading: isLoadingProviders } = useQuery({
        queryKey: ['ai-providers', 'openai'],
        queryFn: async () => {
            const result = await apiClient.getAIProviders();
            if (result.success && result.providers) {
                return result.providers.filter(p => p.type === 'openai') as OpenAIProvider[];
            }
            return [];
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Update local state when data is loaded
    React.useEffect(() => {
        if (providersData) {
            setProviders(providersData);
        }
    }, [providersData]);

    // Filter models based on search
    const filteredModels = useMemo(() => {
        if (!searchQuery.trim()) return availableModels;
        const query = searchQuery.toLowerCase();
        return availableModels.filter(model =>
            model.id.toLowerCase().includes(query) ||
            model.owned_by.toLowerCase().includes(query)
        );
    }, [availableModels, searchQuery]);

    React.useLayoutEffect(() => {
        if (!user) {
            router.push('/');
            return;
        }
    }, [user, router]);

    // Validate API key and fetch models
    const validateApiKey = async () => {
        if (!apiKey.trim()) {
            setValidationError('API key is required');
            return;
        }

        setIsValidating(true);
        setValidationError(null);

        try {
            const result = await apiClient.fetchOpenAIModels({ apiKey: apiKey.trim() });

            if (result.success && result.models) {
                setAvailableModels(result.models);
                setIsValidated(true);
                setValidationError(null);

                addToast({
                    title: "API Key Valid",
                    description: `Found ${result.models.length} available models`,
                    variant: "success"
                });
            } else {
                setValidationError(result.message || 'Invalid API key');
                setIsValidated(false);
                setAvailableModels([]);
            }
        } catch (error) {
            setValidationError(error instanceof Error ? error.message : 'Validation failed');
            setIsValidated(false);
            setAvailableModels([]);
        } finally {
            setIsValidating(false);
        }
    };

    // Save provider mutation
    const saveProviderMutation = useMutation({
        mutationFn: async (provider: Omit<OpenAIProvider, 'id'>) => {
            if (editingProvider?.id) {
                return apiClient.updateAIProvider(editingProvider.id, provider);
            } else {
                return apiClient.createAIProvider(provider);
            }
        },
        onSuccess: (data) => {
            if (data.success) {
                addToast({
                    title: editingProvider ? "Provider Updated" : "Provider Created",
                    description: "OpenAI provider has been saved successfully",
                    variant: "success"
                });
                queryClient.invalidateQueries({ queryKey: ['ai-providers', 'openai'] });
                resetForm();
            } else {
                addToast({
                    title: "Save Failed",
                    description: data.message || "Failed to save provider",
                    variant: "destructive"
                });
            }
        },
        onError: (error) => {
            addToast({
                title: "Save Failed",
                description: error instanceof Error ? error.message : "Failed to save provider",
                variant: "destructive"
            });
        }
    });

    // Delete provider mutation
    const deleteProviderMutation = useMutation({
        mutationFn: (providerId: string) => apiClient.deleteAIProvider(providerId),
        onSuccess: (data) => {
            if (data.success) {
                addToast({
                    title: "Provider Deleted",
                    description: "OpenAI provider has been deleted successfully",
                    variant: "success"
                });
                queryClient.invalidateQueries({ queryKey: ['ai-providers', 'openai'] });
            }
        },
        onError: (error) => {
            addToast({
                title: "Delete Failed",
                description: error instanceof Error ? error.message : "Failed to delete provider",
                variant: "destructive"
            });
        }
    });

    // Test provider mutation
    const testProviderMutation = useMutation({
        mutationFn: (providerId: string) => apiClient.testAIProvider(providerId),
        onSuccess: (data) => {
            addToast({
                title: data.success ? "Test Successful" : "Test Failed",
                description: data.message,
                variant: data.success ? "success" : "destructive"
            });
        },
        onError: (error) => {
            addToast({
                title: "Test Failed",
                description: error instanceof Error ? error.message : "Failed to test provider",
                variant: "destructive"
            });
        }
    });

    const handleModelToggle = (modelId: string) => {
        setSelectedModels(prev =>
            prev.includes(modelId)
                ? prev.filter(id => id !== modelId)
                : [...prev, modelId]
        );
    };

    const resetForm = () => {
        setApiKey('');
        setSelectedModels([]);
        setAvailableModels([]);
        setIsValidated(false);
        setValidationError(null);
        setEditingProvider(null);
    };

    const handleSave = () => {
        if (!isValidated) {
            setValidationError('Please validate your API key first');
            return;
        }

        if (selectedModels.length === 0) {
            setValidationError('Please select at least one model');
            return;
        }

        const provider: Omit<OpenAIProvider, 'id'> = {
            type: 'openai',
            name: `OpenAI Provider ${providers.length + 1}`,
            apiKey: apiKey.trim(),
            model: selectedModels[0], // Primary model
            models: selectedModels,
            isActive: true
        };

        saveProviderMutation.mutate(provider);
    };

    const handleEdit = (provider: OpenAIProvider) => {
        setEditingProvider(provider);
        setApiKey('***'); // Placeholder for existing key
        setSelectedModels(provider.models || [provider.model]);
        setIsValidated(true);
    };

    const handleToggleActive = async (provider: OpenAIProvider) => {
        const updatedProvider = { ...provider, isActive: !provider.isActive };
        try {
            const result = await apiClient.updateAIProvider(provider.id!, updatedProvider);
            if (result.success) {
                queryClient.invalidateQueries({ queryKey: ['ai-providers', 'openai'] });
                addToast({
                    title: "Provider Updated",
                    description: `Provider ${updatedProvider.isActive ? 'enabled' : 'disabled'}`,
                    variant: "success"
                });
            }
        } catch (error) {
            addToast({
                title: "Update Failed",
                description: "Failed to update provider status",
                variant: "destructive"
            });
        }
    };

    if (!user) {
        return null;
    }

    if (isLoadingProviders) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-2xl font-bold mb-2">OpenAI Configuration</h1>
                <p className="text-muted-foreground">
                    Configure OpenAI API keys and models
                </p>
            </div>

            {/* Existing Providers */}
            {providers.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Configured Providers</CardTitle>
                        <CardDescription>
                            Manage your existing OpenAI providers
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {providers.map((provider) => (
                            <div key={provider.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-medium">{provider.name}</h3>
                                        <Badge variant={provider.isActive ? "default" : "secondary"}>
                                            {provider.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Primary Model: {provider.model}
                                    </p>
                                    {provider.models && provider.models.length > 1 && (
                                        <p className="text-sm text-muted-foreground">
                                            +{provider.models.length - 1} more models
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={provider.isActive}
                                        onCheckedChange={() => handleToggleActive(provider)}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => testProviderMutation.mutate(provider.id!)}
                                        disabled={testProviderMutation.isPending}
                                    >
                                        {testProviderMutation.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <TestTube className="h-4 w-4" />
                                        )}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEdit(provider)}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => deleteProviderMutation.mutate(provider.id!)}
                                        disabled={deleteProviderMutation.isPending}
                                    >
                                        {deleteProviderMutation.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Add New Provider Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        {editingProvider ? 'Edit Provider' : 'Add New Provider'}
                    </CardTitle>
                    <CardDescription>
                        {editingProvider ? 'Update your OpenAI provider configuration' : 'Configure a new OpenAI API key and select models'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* API Key Section */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="apiKey">OpenAI API Key</Label>
                            <div className="relative">
                                <Input
                                    id="apiKey"
                                    type={showApiKey ? "text" : "password"}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="sk-..."
                                    className="pr-20"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-3">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        className="h-7 w-7 p-0"
                                    >
                                        {showApiKey ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={validateApiKey}
                            disabled={isValidating || !apiKey.trim()}
                            className="w-full"
                        >
                            {isValidating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Validating...
                                </>
                            ) : (
                                <>
                                    {isValidated ? <CheckCircle className="mr-2 h-4 w-4" /> : <XCircle className="mr-2 h-4 w-4" />}
                                    Validate API Key
                                </>
                            )}
                        </Button>

                        {validationError && (
                            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                                {validationError}
                            </div>
                        )}

                        {isValidated && (
                            <div className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
                                ✓ API key validated successfully
                            </div>
                        )}
                    </div>

                    {/* Model Selection */}
                    {isValidated && availableModels.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label>Select Models</Label>
                                <div className="text-sm text-muted-foreground">
                                    {selectedModels.length} of {filteredModels.length} selected
                                </div>
                            </div>

                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search models..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            {/* Models List */}
                            <div className="max-h-64 overflow-y-auto space-y-2 border rounded-md p-4">
                                {filteredModels.map((model) => (
                                    <div key={model.id} className="flex items-center space-x-3">
                                        <input
                                            type="checkbox"
                                            id={model.id}
                                            checked={selectedModels.includes(model.id)}
                                            onChange={() => handleModelToggle(model.id)}
                                            className="rounded border-gray-300"
                                        />
                                        <label htmlFor={model.id} className="flex-1 cursor-pointer">
                                            <div className="font-medium">{model.id}</div>
                                            <div className="text-sm text-muted-foreground">
                                                Owner: {model.owned_by}
                                            </div>
                                        </label>
                                    </div>
                                ))}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleSave}
                                    disabled={saveProviderMutation.isPending || selectedModels.length === 0}
                                    className="flex-1"
                                >
                                    {saveProviderMutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            {editingProvider ? 'Update Provider' : 'Save Provider'}
                                        </>
                                    )}
                                </Button>
                                {editingProvider && (
                                    <Button
                                        variant="outline"
                                        onClick={resetForm}
                                    >
                                        Cancel
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
