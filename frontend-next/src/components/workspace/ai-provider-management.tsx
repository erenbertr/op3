"use client"

import React, { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Edit2, Trash2, Plus, TestTube, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { AIProviderConfig, AIProviderType, OpenRouterModel, apiClient } from '@/lib/api';
import { useAIProviders, useSaveAIProvider, useDeleteAIProvider, useTestAIProvider } from '@/lib/hooks/use-query-hooks';
import { useToast } from '@/components/ui/toast';

interface AIProviderManagementProps {
    className?: string;
}

interface EditingProvider {
    id?: string;
    type: AIProviderType;
    name: string;
    apiKey: string;
    model: string;
    endpoint?: string;
    isActive: boolean;
}

const PROVIDER_TYPES: { value: AIProviderType; label: string }[] = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'google', label: 'Google' },
    { value: 'replicate', label: 'Replicate' },
    { value: 'openrouter', label: 'OpenRouter' },
    { value: 'custom', label: 'Custom' }
];

const DEFAULT_MODELS: Record<AIProviderType, string> = {
    openai: 'gpt-4o',
    anthropic: 'claude-3-5-sonnet-20241022',
    google: 'gemini-1.5-pro',
    replicate: 'meta/llama-2-70b-chat',
    openrouter: 'openai/gpt-4o',
    custom: ''
};

export const AIProviderManagement = forwardRef<{ handleAddProvider: () => void }, AIProviderManagementProps>(({ className }, ref) => {
    const [editingProvider, setEditingProvider] = useState<EditingProvider | null>(null);
    const [deletingProviderId, setDeletingProviderId] = useState<string | null>(null);
    const [testStatus, setTestStatus] = useState<Record<string, 'testing' | 'success' | 'error'>>({});
    const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModel[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [selectedModels, setSelectedModels] = useState<string[]>([]);
    const [showOpenRouterModels, setShowOpenRouterModels] = useState(false);
    const { addToast } = useToast();

    // Use TanStack Query for data fetching
    const {
        data: providersResponse,
        isLoading,
        error: queryError
    } = useAIProviders();

    // Extract providers array from response
    const providers = providersResponse?.providers || [];

    // Use TanStack Query mutations
    const saveProviderMutation = useSaveAIProvider();
    const deleteProviderMutation = useDeleteAIProvider();
    const testProviderMutation = useTestAIProvider();

    const error = queryError?.message || saveProviderMutation.error?.message || deleteProviderMutation.error?.message || '';



    useImperativeHandle(ref, () => ({
        handleAddProvider
    }));

    const handleAddProvider = () => {
        setEditingProvider({
            type: 'openai',
            name: '',
            apiKey: '',
            model: DEFAULT_MODELS.openai,
            endpoint: '',
            isActive: true
        });
    };

    const handleEditProvider = (provider: AIProviderConfig) => {
        setEditingProvider({
            id: provider.id,
            type: provider.type,
            name: provider.name,
            apiKey: provider.apiKey,
            model: provider.model,
            endpoint: provider.endpoint || '',
            isActive: provider.isActive
        });
    };

    const handleSaveProvider = async () => {
        if (!editingProvider) return;

        if (!editingProvider.name.trim()) {
            return;
        }

        if (!editingProvider.apiKey.trim()) {
            return;
        }

        // For OpenRouter, handle model selection differently
        if (editingProvider.type === 'openrouter') {
            if (showOpenRouterModels) {
                await handleSaveOpenRouterProvider();
            } else {
                // First, fetch models
                await fetchOpenRouterModels(editingProvider.apiKey);
            }
            return;
        }

        if (!editingProvider.model.trim()) {
            return;
        }

        try {
            const providerData: AIProviderConfig = {
                id: editingProvider.id,
                type: editingProvider.type,
                name: editingProvider.name.trim(),
                apiKey: editingProvider.apiKey.trim(),
                model: editingProvider.model.trim(),
                endpoint: editingProvider.endpoint?.trim() || undefined,
                isActive: editingProvider.isActive
            };

            await saveProviderMutation.mutateAsync(providerData);

            addToast({
                title: "Success",
                description: editingProvider.id ? "AI provider updated successfully" : "AI provider created successfully",
                variant: "success"
            });

            setEditingProvider(null);
        } catch (error) {
            // Error is handled by TanStack Query and displayed via error state
            console.error('Error saving AI provider:', error);
        }
    };

    const handleDeleteProvider = async (providerId: string) => {
        try {
            await deleteProviderMutation.mutateAsync(providerId);

            addToast({
                title: "Success",
                description: "AI provider deleted successfully",
                variant: "success"
            });

            setDeletingProviderId(null);
        } catch (error) {
            // Error is handled by TanStack Query and displayed via error state
            console.error('Error deleting AI provider:', error);
        }
    };

    const handleToggleProvider = async (provider: AIProviderConfig) => {
        try {
            const updatedProvider: AIProviderConfig = {
                ...provider,
                isActive: !provider.isActive
            };

            await saveProviderMutation.mutateAsync(updatedProvider);

            addToast({
                title: "Success",
                description: `AI provider ${updatedProvider.isActive ? 'enabled' : 'disabled'} successfully`,
                variant: "success"
            });
        } catch (error) {
            // Error is handled by TanStack Query and displayed via error state
            console.error('Error toggling AI provider:', error);
        }
    };



    const handleTestProvider = async (provider: AIProviderConfig) => {
        if (!provider.id) return;

        setTestStatus(prev => ({ ...prev, [provider.id!]: 'testing' }));

        try {
            await testProviderMutation.mutateAsync(provider.id);

            setTestStatus(prev => ({ ...prev, [provider.id!]: 'success' }));
            addToast({
                title: "Test Successful",
                description: "AI provider is working correctly",
                variant: "success"
            });
        } catch (error) {
            setTestStatus(prev => ({ ...prev, [provider.id!]: 'error' }));
            addToast({
                title: "Test Failed",
                description: error instanceof Error ? error.message : "AI provider test failed",
                variant: "destructive"
            });
        }

        // Clear test status after 3 seconds
        setTimeout(() => {
            setTestStatus(prev => {
                const newStatus = { ...prev };
                delete newStatus[provider.id!];
                return newStatus;
            });
        }, 3000);
    };

    const getProviderTypeLabel = (type: AIProviderType) => {
        return PROVIDER_TYPES.find(p => p.value === type)?.label || type;
    };

    const handleProviderTypeChange = (type: AIProviderType) => {
        if (!editingProvider) return;

        setEditingProvider(prev => prev ? {
            ...prev,
            type,
            model: DEFAULT_MODELS[type]
        } : null);

        // Reset OpenRouter specific state when changing away from OpenRouter
        if (type !== 'openrouter') {
            setOpenRouterModels([]);
            setSelectedModels([]);
            setShowOpenRouterModels(false);
        }
    };

    const fetchOpenRouterModels = async (apiKey: string) => {
        if (!apiKey.trim()) {
            addToast({
                title: "Error",
                description: "Please enter an API key first",
                variant: "destructive"
            });
            return;
        }

        setIsLoadingModels(true);
        try {
            const result = await apiClient.fetchOpenRouterModels(apiKey);
            if (result.success && result.models) {
                setOpenRouterModels(result.models);
                setShowOpenRouterModels(true);
                addToast({
                    title: "Success",
                    description: `Loaded ${result.models.length} models`,
                    variant: "success"
                });
            } else {
                addToast({
                    title: "Error",
                    description: result.message || "Failed to fetch models",
                    variant: "destructive"
                });
            }
        } catch (error) {
            addToast({
                title: "Error",
                description: "Failed to fetch OpenRouter models",
                variant: "destructive"
            });
        } finally {
            setIsLoadingModels(false);
        }
    };

    const handleModelSelection = (modelId: string, checked: boolean) => {
        setSelectedModels(prev => {
            if (checked) {
                return [...prev, modelId];
            } else {
                return prev.filter(id => id !== modelId);
            }
        });
    };

    const handleSaveOpenRouterProvider = async () => {
        if (!editingProvider || selectedModels.length === 0) {
            addToast({
                title: "Error",
                description: "Please select at least one model",
                variant: "destructive"
            });
            return;
        }

        // Create multiple providers, one for each selected model
        try {
            for (const modelId of selectedModels) {
                const providerData: AIProviderConfig = {
                    type: 'openrouter',
                    name: `${editingProvider.name} (${modelId.replace('openai/', '').replace('anthropic/', '').replace('google/', '')})`,
                    apiKey: editingProvider.apiKey.trim(),
                    model: modelId,
                    endpoint: 'https://openrouter.ai/api/v1',
                    isActive: editingProvider.isActive
                };

                await saveProviderMutation.mutateAsync(providerData);
            }

            addToast({
                title: "Success",
                description: `Created ${selectedModels.length} OpenRouter provider(s)`,
                variant: "success"
            });

            setEditingProvider(null);
            setOpenRouterModels([]);
            setSelectedModels([]);
            setShowOpenRouterModels(false);
        } catch (error) {
            console.error('Error saving OpenRouter providers:', error);
        }
    };

    if (isLoading && providers.length === 0) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground">Loading AI providers...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={className}>

            {/* Error Display */}
            {error && (
                <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-destructive text-sm">{error}</p>
                </div>
            )}

            {/* Providers List */}
            <div className="space-y-4">
                {providers.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center">
                            <p className="text-muted-foreground">No AI providers configured yet.</p>
                            <Button onClick={handleAddProvider} className="mt-4">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Your First Provider
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    providers.map((provider) => (
                        <Card key={provider.id} className="select-none">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <CardTitle className="text-lg">
                                                {provider.name}
                                            </CardTitle>
                                            <CardDescription>
                                                {getProviderTypeLabel(provider.type)} • {provider.model}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Switch
                                            checked={provider.isActive}
                                            onCheckedChange={() => handleToggleProvider(provider)}
                                            disabled={saveProviderMutation.isPending || deleteProviderMutation.isPending}
                                        />
                                        {provider.id && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleTestProvider(provider)}
                                                disabled={saveProviderMutation.isPending || deleteProviderMutation.isPending || testStatus[provider.id] === 'testing'}
                                            >
                                                <TestTube className="h-4 w-4 mr-2" />
                                                {testStatus[provider.id] === 'testing' ? 'Testing...' : 'Test'}
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEditProvider(provider)}
                                            disabled={saveProviderMutation.isPending || deleteProviderMutation.isPending}
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setDeletingProviderId(provider.id!)}
                                            disabled={saveProviderMutation.isPending || deleteProviderMutation.isPending}
                                            className="text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            {provider.endpoint && (
                                <CardContent className="pt-0">
                                    <div className="text-sm text-muted-foreground">
                                        <span>Endpoint: </span>
                                        <code className="bg-muted px-2 py-1 rounded text-xs">
                                            {provider.endpoint}
                                        </code>
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    ))
                )}
            </div>

            {/* Edit/Add Provider Dialog */}
            {editingProvider && (
                <Dialog open={true} onOpenChange={() => setEditingProvider(null)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {editingProvider.id ? 'Edit AI Provider' : 'Add AI Provider'}
                            </DialogTitle>
                            <DialogDescription>
                                Configure the AI provider settings. Make sure to test the connection after saving.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="provider-type">Provider Type</Label>
                                <Select
                                    value={editingProvider.type}
                                    onValueChange={handleProviderTypeChange}
                                    disabled={saveProviderMutation.isPending}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PROVIDER_TYPES.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="provider-name">Provider Name</Label>
                                <Input
                                    id="provider-name"
                                    value={editingProvider.name}
                                    onChange={(e) => setEditingProvider(prev => prev ? { ...prev, name: e.target.value } : null)}
                                    placeholder="e.g., My OpenAI Provider"
                                    disabled={saveProviderMutation.isPending}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="provider-apikey">API Key</Label>
                                <Input
                                    id="provider-apikey"
                                    type="password"
                                    value={editingProvider.apiKey}
                                    onChange={(e) => setEditingProvider(prev => prev ? { ...prev, apiKey: e.target.value } : null)}
                                    placeholder="Enter your API key"
                                    disabled={saveProviderMutation.isPending}
                                />
                            </div>
                            {editingProvider.type !== 'openrouter' && (
                                <div className="space-y-2">
                                    <Label htmlFor="provider-model">Model</Label>
                                    <Input
                                        id="provider-model"
                                        value={editingProvider.model}
                                        onChange={(e) => setEditingProvider(prev => prev ? { ...prev, model: e.target.value } : null)}
                                        placeholder="e.g., gpt-4o"
                                        disabled={saveProviderMutation.isPending}
                                    />
                                </div>
                            )}
                            {editingProvider.type === 'openrouter' && showOpenRouterModels && (
                                <div className="space-y-2">
                                    <Label>Select Models</Label>
                                    <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-2">
                                        {openRouterModels.map((model) => (
                                            <div key={model.id} className="flex items-start space-x-2">
                                                <Checkbox
                                                    id={model.id}
                                                    checked={selectedModels.includes(model.id)}
                                                    onCheckedChange={(checked) => handleModelSelection(model.id, checked as boolean)}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <label htmlFor={model.id} className="text-sm font-medium cursor-pointer">
                                                        {model.name || model.id}
                                                    </label>
                                                    {model.description && (
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {model.description}
                                                        </p>
                                                    )}
                                                    {model.pricing && (
                                                        <p className="text-xs text-muted-foreground">
                                                            ${model.pricing.prompt}/1K prompt • ${model.pricing.completion}/1K completion
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Selected {selectedModels.length} model(s). Each model will create a separate provider.
                                    </p>
                                </div>
                            )}
                            {(editingProvider.type === 'custom' || editingProvider.type === 'replicate') && (
                                <div className="space-y-2">
                                    <Label htmlFor="provider-endpoint">Endpoint (Optional)</Label>
                                    <Input
                                        id="provider-endpoint"
                                        value={editingProvider.endpoint}
                                        onChange={(e) => setEditingProvider(prev => prev ? { ...prev, endpoint: e.target.value } : null)}
                                        placeholder="https://api.example.com"
                                        disabled={saveProviderMutation.isPending}
                                    />
                                </div>
                            )}
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="provider-active"
                                    checked={editingProvider.isActive}
                                    onCheckedChange={(checked) => setEditingProvider(prev => prev ? { ...prev, isActive: checked } : null)}
                                    disabled={saveProviderMutation.isPending}
                                />
                                <Label htmlFor="provider-active">Active</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingProvider(null)} disabled={saveProviderMutation.isPending || isLoadingModels}>
                                Cancel
                            </Button>
                            <Button onClick={handleSaveProvider} disabled={saveProviderMutation.isPending || isLoadingModels || (editingProvider.type === 'openrouter' && showOpenRouterModels && selectedModels.length === 0)}>
                                {isLoadingModels ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Loading Models...
                                    </>
                                ) : editingProvider.type === 'openrouter' && !showOpenRouterModels ? (
                                    'Fetch Models'
                                ) : editingProvider.type === 'openrouter' && showOpenRouterModels ? (
                                    `Add ${selectedModels.length} Provider(s)`
                                ) : editingProvider.id ? (
                                    'Save Changes'
                                ) : (
                                    'Add Provider'
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Delete Confirmation Dialog */}
            {deletingProviderId && (
                <Dialog open={true} onOpenChange={() => setDeletingProviderId(null)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Delete AI Provider</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete this AI provider? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeletingProviderId(null)} disabled={deleteProviderMutation.isPending}>
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => handleDeleteProvider(deletingProviderId)}
                                disabled={deleteProviderMutation.isPending}
                            >
                                Delete Provider
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
});

AIProviderManagement.displayName = 'AIProviderManagement';
