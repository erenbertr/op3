"use client"

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Eye, EyeOff, CheckCircle, XCircle, Save, Search, Filter, X } from 'lucide-react';
import { authService } from '@/lib/auth';
import { apiClient, OpenRouterModel } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function OpenRouterSettingsView() {
    const router = useRouter();
    const { addToast } = useToast();
    const queryClient = useQueryClient();

    const [apiKey, setApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [selectedModels, setSelectedModels] = useState<string[]>([]);
    const [availableModels, setAvailableModels] = useState<OpenRouterModel[]>([]);
    const [isValidating, setIsValidating] = useState(false);
    const [isValidated, setIsValidated] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
    const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
    const [contextFilter, setContextFilter] = useState<'all' | 'small' | 'medium' | 'large'>('all');

    const user = authService.getCurrentUser();

    // Extract unique providers from available models
    const availableProviders = useMemo(() => {
        const providers = new Set<string>();
        availableModels.forEach(model => {
            const provider = model.id.split('/')[0] || 'unknown';
            providers.add(provider);
        });
        return Array.from(providers).sort();
    }, [availableModels]);

    // Major AI providers for quick filtering
    const majorProviders = [
        { id: 'openai', name: 'OpenAI', color: 'bg-green-100 text-green-800' },
        { id: 'anthropic', name: 'Anthropic', color: 'bg-orange-100 text-orange-800' },
        { id: 'google', name: 'Google', color: 'bg-blue-100 text-blue-800' },
        { id: 'meta-llama', name: 'Meta', color: 'bg-purple-100 text-purple-800' },
        { id: 'mistralai', name: 'Mistral', color: 'bg-red-100 text-red-800' },
        { id: 'cohere', name: 'Cohere', color: 'bg-teal-100 text-teal-800' },
        { id: 'perplexity', name: 'Perplexity', color: 'bg-indigo-100 text-indigo-800' }
    ];

    // Filter models based on search and filters
    const filteredModels = useMemo(() => {
        let filtered = availableModels;

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(model =>
                model.name.toLowerCase().includes(query) ||
                model.id.toLowerCase().includes(query) ||
                (model.description && model.description.toLowerCase().includes(query))
            );
        }

        // Provider filter
        if (selectedProviders.length > 0) {
            filtered = filtered.filter(model => {
                const provider = model.id.split('/')[0];
                return selectedProviders.includes(provider);
            });
        }

        // Price filter
        if (priceFilter !== 'all') {
            filtered = filtered.filter(model => {
                if (priceFilter === 'free') {
                    return model.pricing?.prompt === '0' || model.pricing?.completion === '0';
                } else {
                    return model.pricing?.prompt !== '0' && model.pricing?.completion !== '0';
                }
            });
        }

        // Context length filter
        if (contextFilter !== 'all') {
            filtered = filtered.filter(model => {
                const contextLength = model.context_length || 0;
                switch (contextFilter) {
                    case 'small':
                        return contextLength <= 8192;
                    case 'medium':
                        return contextLength > 8192 && contextLength <= 32768;
                    case 'large':
                        return contextLength > 32768;
                    default:
                        return true;
                }
            });
        }

        return filtered;
    }, [availableModels, searchQuery, selectedProviders, priceFilter, contextFilter]);

    React.useLayoutEffect(() => {
        if (!user) {
            router.push('/');
            return;
        }
    }, [user, router]);

    // Fetch existing global settings
    const { data: settingsData, isLoading: isLoadingSettings } = useQuery({
        queryKey: ['global-openrouter-settings'],
        queryFn: () => apiClient.getGlobalOpenRouterSettings(),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Load existing settings when data is available
    React.useEffect(() => {
        if (settingsData?.settings) {
            setSelectedModels(settingsData.settings.selectedModels || []);
            setIsValidated(true);
            // Don't set the API key as it's masked
        }
    }, [settingsData]);

    // Validate API key and fetch models
    const validateApiKey = async () => {
        if (!apiKey.trim()) {
            setValidationError('API key is required');
            return;
        }

        setIsValidating(true);
        setValidationError(null);

        try {
            const result = await apiClient.validateOpenRouterApiKey({ apiKey: apiKey.trim() });

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

    // Save settings mutation
    const saveSettingsMutation = useMutation({
        mutationFn: async () => {
            if (!apiKey.trim()) {
                throw new Error('API key is required');
            }

            return apiClient.saveGlobalOpenRouterSettings({
                apiKey: apiKey.trim(),
                selectedModels,
                isEnabled: true
            });
        },
        onSuccess: (data) => {
            if (data.success) {
                addToast({
                    title: "Settings Saved",
                    description: "OpenRouter settings have been saved successfully",
                    variant: "success"
                });
                // Invalidate and refetch settings
                queryClient.invalidateQueries({ queryKey: ['global-openrouter-settings'] });
            } else {
                addToast({
                    title: "Save Failed",
                    description: data.message || "Failed to save settings",
                    variant: "destructive"
                });
            }
        },
        onError: (error) => {
            addToast({
                title: "Save Failed",
                description: error instanceof Error ? error.message : "Failed to save settings",
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

    const handleProviderToggle = (providerId: string) => {
        setSelectedProviders(prev =>
            prev.includes(providerId)
                ? prev.filter(id => id !== providerId)
                : [...prev, providerId]
        );
    };

    const clearAllFilters = () => {
        setSearchQuery('');
        setSelectedProviders([]);
        setPriceFilter('all');
        setContextFilter('all');
    };

    const getProviderInfo = (modelId: string) => {
        const provider = modelId.split('/')[0];
        const majorProvider = majorProviders.find(p => p.id === provider);
        return majorProvider || { id: provider, name: provider, color: 'bg-gray-100 text-gray-800' };
    };

    const selectAllFilteredModels = () => {
        const filteredModelIds = filteredModels.map(model => model.id);
        setSelectedModels(prev => {
            const newSelected = new Set([...prev, ...filteredModelIds]);
            return Array.from(newSelected);
        });
    };

    const selectPopularModels = () => {
        const popularModels = [
            'openai/gpt-4o',
            'openai/gpt-4o-mini',
            'anthropic/claude-3.5-sonnet',
            'anthropic/claude-3.5-haiku',
            'google/gemini-pro-1.5',
            'meta-llama/llama-3.1-70b-instruct',
            'mistralai/mistral-large'
        ];

        const availablePopular = popularModels.filter(modelId =>
            availableModels.some(model => model.id === modelId)
        );

        setSelectedModels(prev => {
            const newSelected = new Set([...prev, ...availablePopular]);
            return Array.from(newSelected);
        });
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

        saveSettingsMutation.mutate();
    };

    if (!user) {
        return null;
    }

    if (isLoadingSettings) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* API Key Configuration */}
            <Card>
                <CardHeader>
                    <CardTitle>API Configuration</CardTitle>
                    <CardDescription>
                        Enter your OpenRouter API key to access their models
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="apiKey">OpenRouter API Key</Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    id="apiKey"
                                    type={showApiKey ? "text" : "password"}
                                    placeholder="sk-or-v1-..."
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    className="pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowApiKey(!showApiKey)}
                                >
                                    {showApiKey ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            <Button
                                onClick={validateApiKey}
                                disabled={isValidating || !apiKey.trim()}
                            >
                                {isValidating ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : isValidated ? (
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                ) : null}
                                {isValidating ? 'Validating...' : 'Validate'}
                            </Button>
                        </div>
                        {validationError && (
                            <div className="flex items-center gap-2 text-sm text-destructive">
                                <XCircle className="h-4 w-4" />
                                {validationError}
                            </div>
                        )}
                        {isValidated && !validationError && (
                            <div className="flex items-center gap-2 text-sm text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                API key is valid
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Model Selection */}
            {isValidated && availableModels.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Model Selection</CardTitle>
                        <CardDescription>
                            Select the OpenRouter models you want to use globally ({filteredModels.length} of {availableModels.length} models)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Search and Filters */}
                        <div className="space-y-4">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search models by name or description..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                                {searchQuery && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                                        onClick={() => setSearchQuery('')}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>

                            {/* Provider Filters */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-muted-foreground" />
                                    <Label className="text-sm font-medium">AI Providers</Label>
                                    {selectedProviders.length > 0 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedProviders([])}
                                            className="h-6 px-2 text-xs"
                                        >
                                            Clear
                                        </Button>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {majorProviders.map((provider) => (
                                        <Button
                                            key={provider.id}
                                            variant={selectedProviders.includes(provider.id) ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => handleProviderToggle(provider.id)}
                                            className="h-7 text-xs"
                                        >
                                            {provider.name}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {/* Additional Filters */}
                            <div className="flex flex-wrap gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Price</Label>
                                    <select
                                        value={priceFilter}
                                        onChange={(e) => setPriceFilter(e.target.value as any)}
                                        className="text-xs border rounded px-2 py-1 bg-background"
                                    >
                                        <option value="all">All</option>
                                        <option value="free">Free</option>
                                        <option value="paid">Paid</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Context Length</Label>
                                    <select
                                        value={contextFilter}
                                        onChange={(e) => setContextFilter(e.target.value as any)}
                                        className="text-xs border rounded px-2 py-1 bg-background"
                                    >
                                        <option value="all">All</option>
                                        <option value="small">≤8K tokens</option>
                                        <option value="medium">8K-32K tokens</option>
                                        <option value="large">>32K tokens</option>
                                    </select>
                                </div>
                                {(searchQuery || selectedProviders.length > 0 || priceFilter !== 'all' || contextFilter !== 'all') && (
                                    <div className="flex items-end">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={clearAllFilters}
                                            className="h-7 text-xs"
                                        >
                                            Clear All
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        {filteredModels.length > 0 && (
                            <div className="flex gap-2 pb-2 border-b">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={selectAllFilteredModels}
                                    className="h-7 text-xs"
                                >
                                    Select All ({filteredModels.length})
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={selectPopularModels}
                                    className="h-7 text-xs"
                                >
                                    Select Popular
                                </Button>
                            </div>
                        )}

                        {/* Models List */}
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {filteredModels.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>No models found matching your filters.</p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearAllFilters}
                                        className="mt-2"
                                    >
                                        Clear filters
                                    </Button>
                                </div>
                            ) : (
                                filteredModels.map((model) => {
                                    const providerInfo = getProviderInfo(model.id);
                                    return (
                                        <div key={model.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                            <Checkbox
                                                id={model.id}
                                                checked={selectedModels.includes(model.id)}
                                                onCheckedChange={() => handleModelToggle(model.id)}
                                            />
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Label htmlFor={model.id} className="text-sm font-medium cursor-pointer">
                                                        {model.name}
                                                    </Label>
                                                    <Badge
                                                        variant="secondary"
                                                        className={`text-xs ${providerInfo.color}`}
                                                    >
                                                        {providerInfo.name}
                                                    </Badge>
                                                </div>
                                                {model.description && (
                                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                                        {model.description}
                                                    </p>
                                                )}
                                                <div className="flex flex-wrap gap-2">
                                                    {model.context_length && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {model.context_length.toLocaleString()} tokens
                                                        </Badge>
                                                    )}
                                                    {model.pricing && (
                                                        <Badge variant="outline" className="text-xs">
                                                            ${model.pricing.prompt}/${model.pricing.completion}
                                                        </Badge>
                                                    )}
                                                    {model.top_provider?.max_completion_tokens && (
                                                        <Badge variant="outline" className="text-xs">
                                                            Max: {model.top_provider.max_completion_tokens.toLocaleString()}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {selectedModels.length > 0 && (
                            <div className="mt-4 p-3 bg-muted rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium">
                                        Selected Models ({selectedModels.length}):
                                    </p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedModels([])}
                                        className="h-6 px-2 text-xs"
                                    >
                                        Clear All
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {selectedModels.map((modelId) => {
                                        const model = availableModels.find(m => m.id === modelId);
                                        const providerInfo = getProviderInfo(modelId);
                                        return (
                                            <div key={modelId} className="flex items-center gap-1">
                                                <Badge variant="default" className="text-xs">
                                                    {model?.name || modelId}
                                                </Badge>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleModelToggle(modelId)}
                                                    className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                                >
                                                    <X className="h-2 w-2" />
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Save Button */}
            {isValidated && (
                <div className="flex justify-end">
                    <Button
                        onClick={handleSave}
                        disabled={saveSettingsMutation.isPending || selectedModels.length === 0}
                        className="min-w-32"
                    >
                        {saveSettingsMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Settings
                    </Button>
                </div>
            )}
        </div>
    );
}
