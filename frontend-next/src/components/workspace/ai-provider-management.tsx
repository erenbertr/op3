"use client"

import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Edit2, Trash2, Plus, Eye, EyeOff, TestTube } from 'lucide-react';
import { apiClient, AIProviderConfig, AIProviderType } from '@/lib/api';
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
    { value: 'custom', label: 'Custom' }
];

const DEFAULT_MODELS: Record<AIProviderType, string> = {
    openai: 'gpt-4o',
    anthropic: 'claude-3-5-sonnet-20241022',
    google: 'gemini-1.5-pro',
    replicate: 'meta/llama-2-70b-chat',
    custom: ''
};

export const AIProviderManagement = forwardRef<{ handleAddProvider: () => void }, AIProviderManagementProps>(({ className }, ref) => {
    const [providers, setProviders] = useState<AIProviderConfig[]>([]);
    const [editingProvider, setEditingProvider] = useState<EditingProvider | null>(null);
    const [deletingProviderId, setDeletingProviderId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
    const [testStatus, setTestStatus] = useState<Record<string, 'testing' | 'success' | 'error'>>({});
    const { addToast } = useToast();

    const loadProviders = useCallback(async () => {
        try {
            setIsLoading(true);
            const result = await apiClient.getAIProviders();
            if (result.success) {
                setProviders(result.providers);
            } else {
                setError('Failed to load AI providers');
            }
        } catch (error) {
            console.error('Error loading AI providers:', error);
            setError('Failed to load AI providers');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProviders();
    }, [loadProviders]);

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
        setError('');
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
        setError('');
    };

    const handleSaveProvider = async () => {
        if (!editingProvider) return;

        if (!editingProvider.name.trim()) {
            setError('Provider name cannot be empty');
            return;
        }

        if (!editingProvider.apiKey.trim()) {
            setError('API key cannot be empty');
            return;
        }

        if (!editingProvider.model.trim()) {
            setError('Model cannot be empty');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const providerData: AIProviderConfig = {
                type: editingProvider.type,
                name: editingProvider.name.trim(),
                apiKey: editingProvider.apiKey.trim(),
                model: editingProvider.model.trim(),
                endpoint: editingProvider.endpoint?.trim() || undefined,
                isActive: editingProvider.isActive
            };

            if (editingProvider.id) {
                // Update existing provider
                const result = await apiClient.updateAIProvider(editingProvider.id, providerData);
                if (result.success) {
                    addToast({
                        title: "Success",
                        description: "AI provider updated successfully",
                        variant: "success"
                    });
                } else {
                    setError(result.message || 'Failed to update AI provider');
                    return;
                }
            } else {
                // Create new provider
                const result = await apiClient.createAIProvider(providerData);
                if (result.success) {
                    addToast({
                        title: "Success",
                        description: "AI provider created successfully",
                        variant: "success"
                    });
                } else {
                    setError(result.message || 'Failed to create AI provider');
                    return;
                }
            }

            setEditingProvider(null);
            loadProviders();
        } catch (error) {
            console.error('Error saving AI provider:', error);
            setError('Failed to save AI provider');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteProvider = async (providerId: string) => {
        setIsLoading(true);
        setError('');

        try {
            const result = await apiClient.deleteAIProvider(providerId);
            if (result.success) {
                addToast({
                    title: "Success",
                    description: "AI provider deleted successfully",
                    variant: "success"
                });
                setDeletingProviderId(null);
                loadProviders();
            } else {
                setError(result.message || 'Failed to delete AI provider');
            }
        } catch (error) {
            console.error('Error deleting AI provider:', error);
            setError('Failed to delete AI provider');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleApiKeyVisibility = (providerId: string) => {
        setShowApiKeys(prev => ({
            ...prev,
            [providerId]: !prev[providerId]
        }));
    };

    const handleTestProvider = async (provider: AIProviderConfig) => {
        if (!provider.id) return;

        setTestStatus(prev => ({ ...prev, [provider.id!]: 'testing' }));

        try {
            const result = await apiClient.testAIProvider(provider.id);
            setTestStatus(prev => ({
                ...prev,
                [provider.id!]: result.success ? 'success' : 'error'
            }));

            addToast({
                title: result.success ? "Test Successful" : "Test Failed",
                description: result.message,
                variant: result.success ? "success" : "destructive"
            });
        } catch (error) {
            setTestStatus(prev => ({ ...prev, [provider.id!]: 'error' }));
            addToast({
                title: "Test Failed",
                description: "Failed to test AI provider connection",
                variant: "destructive"
            });
        }
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
                        <Card key={provider.id}>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <CardTitle className="text-lg">
                                                    {provider.name}
                                                </CardTitle>
                                                <Badge variant={provider.isActive ? "default" : "secondary"}>
                                                    {provider.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </div>
                                            <CardDescription>
                                                {getProviderTypeLabel(provider.type)} • {provider.model}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {provider.id && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleTestProvider(provider)}
                                                disabled={isLoading || testStatus[provider.id] === 'testing'}
                                            >
                                                <TestTube className="h-4 w-4 mr-2" />
                                                {testStatus[provider.id] === 'testing' ? 'Testing...' : 'Test'}
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEditProvider(provider)}
                                            disabled={isLoading}
                                        >
                                            <Edit2 className="h-4 w-4 mr-2" />
                                            Edit
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setDeletingProviderId(provider.id!)}
                                            disabled={isLoading}
                                            className="text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>API Key:</span>
                                    <code className="bg-muted px-2 py-1 rounded text-xs">
                                        {showApiKeys[provider.id!]
                                            ? provider.apiKey
                                            : '••••••••••••••••'
                                        }
                                    </code>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleApiKeyVisibility(provider.id!)}
                                        className="h-6 w-6 p-0"
                                    >
                                        {showApiKeys[provider.id!] ? (
                                            <EyeOff className="h-3 w-3" />
                                        ) : (
                                            <Eye className="h-3 w-3" />
                                        )}
                                    </Button>
                                </div>
                                {provider.endpoint && (
                                    <div className="mt-2 text-sm text-muted-foreground">
                                        <span>Endpoint: </span>
                                        <code className="bg-muted px-2 py-1 rounded text-xs">
                                            {provider.endpoint}
                                        </code>
                                    </div>
                                )}
                            </CardContent>
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
                                    disabled={isLoading}
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
                                    disabled={isLoading}
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
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="provider-model">Model</Label>
                                <Input
                                    id="provider-model"
                                    value={editingProvider.model}
                                    onChange={(e) => setEditingProvider(prev => prev ? { ...prev, model: e.target.value } : null)}
                                    placeholder="e.g., gpt-4o"
                                    disabled={isLoading}
                                />
                            </div>
                            {(editingProvider.type === 'custom' || editingProvider.type === 'replicate') && (
                                <div className="space-y-2">
                                    <Label htmlFor="provider-endpoint">Endpoint (Optional)</Label>
                                    <Input
                                        id="provider-endpoint"
                                        value={editingProvider.endpoint}
                                        onChange={(e) => setEditingProvider(prev => prev ? { ...prev, endpoint: e.target.value } : null)}
                                        placeholder="https://api.example.com"
                                        disabled={isLoading}
                                    />
                                </div>
                            )}
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="provider-active"
                                    checked={editingProvider.isActive}
                                    onCheckedChange={(checked) => setEditingProvider(prev => prev ? { ...prev, isActive: checked } : null)}
                                    disabled={isLoading}
                                />
                                <Label htmlFor="provider-active">Active</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingProvider(null)} disabled={isLoading}>
                                Cancel
                            </Button>
                            <Button onClick={handleSaveProvider} disabled={isLoading}>
                                {editingProvider.id ? 'Save Changes' : 'Add Provider'}
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
                            <Button variant="outline" onClick={() => setDeletingProviderId(null)} disabled={isLoading}>
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => handleDeleteProvider(deletingProviderId)}
                                disabled={isLoading}
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
