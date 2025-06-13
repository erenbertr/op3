"use client"

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Eye, EyeOff, CheckCircle, XCircle, Save, Search, Filter, X, ArrowRight, ArrowLeft, RotateCcw, Settings, Key } from 'lucide-react';
import { useSession } from '@/lib/temp-auth';
import { apiClient, OpenRouterModel } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface OpenRouterStep {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    completed: boolean;
}

export function OpenRouterSettingsView() {
    const router = useRouter();
    const { addToast } = useToast();
    const queryClient = useQueryClient();

    // Step management
    const [currentStep, setCurrentStep] = useState(0);

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

    const { data: session } = useSession();
    const user = session?.user;

    // Define wizard steps
    const steps: OpenRouterStep[] = [
        {
            id: 'api-key',
            title: 'API Configuration',
            description: 'Enter and validate your OpenRouter API key',
            icon: <Key className="h-5 w-5" />,
            completed: isValidated && !!apiKey.trim(),
        },
        {
            id: 'model-selection',
            title: 'Model Selection',
            description: 'Choose the models you want to use',
            icon: <Settings className="h-5 w-5" />,
            completed: isValidated && selectedModels.length > 0,
        },
        {
            id: 'complete',
            title: 'Complete',
            description: 'Review and finish setup',
            icon: <CheckCircle className="h-5 w-5" />,
            completed: false,
        },
    ];

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

    // Fetch models for existing configuration using saved API key
    const fetchModelsForExistingConfig = async () => {
        try {
            const result = await apiClient.getGlobalOpenRouterModels();
            if (result.success && result.models) {
                setAvailableModels(result.models);
                setValidationError(null);
            } else {
                setValidationError(result.message || 'Failed to fetch models');
                setAvailableModels([]);
            }
        } catch (error) {
            setValidationError(error instanceof Error ? error.message : 'Failed to fetch models');
            setAvailableModels([]);
        }
    };

    // Load existing settings when data is available
    React.useEffect(() => {
        if (settingsData?.settings) {
            setSelectedModels(settingsData.settings.selectedModels || []);
            setIsValidated(true);
            // Set a placeholder API key to indicate it exists
            setApiKey('existing-api-key-configured');

            // If we have existing settings, start from completion step
            if (settingsData.settings.selectedModels && settingsData.settings.selectedModels.length > 0) {
                setCurrentStep(2); // Go to completion step
            } else {
                setCurrentStep(1); // Go to model selection step
                // We need to fetch models for existing configuration
                fetchModelsForExistingConfig();
            }
        }
    }, [settingsData]);

    // Auto-fetch models when on step 1 with no models
    React.useEffect(() => {
        if (currentStep === 1 && availableModels.length === 0 && settingsData?.settings?.apiKey) {
            fetchModelsForExistingConfig();
        }
    }, [currentStep, availableModels.length, settingsData?.settings?.apiKey]);

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

                // Save API key to database immediately after validation
                await apiClient.saveGlobalOpenRouterSettings({
                    apiKey: apiKey.trim(),
                    selectedModels: [], // Empty for now, will be updated in next step
                    isEnabled: true
                });

                addToast({
                    title: "API Key Valid",
                    description: `Found ${result.models.length} available models`,
                    variant: "success"
                });

                // Auto-proceed to next step
                setTimeout(() => {
                    nextStep();
                }, 1000);
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
            // If we have existing settings and the API key is the placeholder,
            // use the new endpoint to update only models
            if (apiKey === 'existing-api-key-configured' && settingsData?.settings) {
                return apiClient.updateGlobalOpenRouterModels(selectedModels);
            }

            // For new configurations, save everything including API key
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

                // Proceed to completion step
                nextStep();
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

    // Step navigation functions
    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const resetWizard = async () => {
        try {
            // Delete settings from database
            await apiClient.deleteGlobalOpenRouterSettings();

            // Reset local state
            setCurrentStep(0);
            setApiKey('');
            setSelectedModels([]);
            setAvailableModels([]);
            setIsValidated(false);
            setValidationError(null);

            // Clear any cached settings
            queryClient.invalidateQueries({ queryKey: ['global-openrouter-settings'] });

            addToast({
                title: "Configuration Reset",
                description: "OpenRouter configuration has been reset",
                variant: "success"
            });
        } catch (error) {
            addToast({
                title: "Reset Failed",
                description: error instanceof Error ? error.message : "Failed to reset configuration",
                variant: "destructive"
            });
        }
    };

    const handleSave = () => {
        // For existing configurations, we don't need to validate the API key again
        if (!isValidated && apiKey !== 'existing-api-key-configured') {
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

    // Render step content
    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return renderApiKeyStep();
            case 1:
                return renderModelSelectionStep();
            case 2:
                return renderCompletionStep();
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-2xl font-bold mb-2">OpenRouter Configuration</h1>
                <p className="text-muted-foreground">
                    Configure OpenRouter API and models
                </p>
            </div>

            {/* Horizontal Steps Overview */}
            <div className="mb-8">
                <div className="flex items-center justify-center gap-4 p-4">
                    {steps.map((step, index) => {
                        const isActive = index === currentStep;
                        const isCompleted = step.completed;

                        return (
                            <React.Fragment key={step.id}>
                                {/* Step */}
                                <div className={`flex items-center gap-3 transition-all duration-300 ${isActive
                                    ? 'bg-white dark:bg-gray-900 p-4 rounded-xl border-2 border-primary shadow-lg'
                                    : 'p-2'
                                    }`}>
                                    {/* Icon */}
                                    <div
                                        className={`flex items-center justify-center rounded-full transition-all duration-300 ${isActive
                                            ? 'w-12 h-12 bg-primary text-primary-foreground'
                                            : isCompleted
                                                ? 'w-10 h-10 bg-green-500 text-white'
                                                : 'w-10 h-10 bg-muted text-muted-foreground'
                                            }`}
                                    >
                                        {isCompleted ? (
                                            <CheckCircle className={isActive ? "h-6 w-6" : "h-5 w-5"} />
                                        ) : (
                                            <div className={`flex items-center justify-center ${isActive ? "h-6 w-6" : "h-5 w-5"}`}>
                                                {React.cloneElement(step.icon as React.ReactElement<{ className?: string }>, {
                                                    className: isActive ? "h-6 w-6" : "h-5 w-5"
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Title and Description - Only for active step */}
                                    {isActive && (
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-semibold truncate">{step.title}</h3>
                                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                {step.description}
                                            </p>
                                        </div>
                                    )}

                                    {/* Badge for active step */}
                                    {isActive && isCompleted && (
                                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 ml-2">
                                            Complete
                                        </Badge>
                                    )}
                                </div>

                                {/* Connector Line */}
                                {index < steps.length - 1 && (
                                    <div className={`h-0.5 w-8 transition-all duration-300 ${isCompleted ? 'bg-green-500' : 'bg-muted'
                                        }`} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Step Content */}
            {renderStepContent()}

            {/* Navigation */}
            <div className="flex justify-between items-center pt-6 border-t">
                <div>
                    {settingsData?.settings && (
                        <Button
                            variant="outline"
                            onClick={resetWizard}
                            className="text-destructive hover:text-destructive"
                        >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reset Configuration
                        </Button>
                    )}
                </div>
                <div className="flex gap-2">
                    {currentStep > 0 && (
                        <Button variant="outline" onClick={prevStep}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                    )}
                    {currentStep < steps.length - 1 && currentStep !== 1 && (
                        <Button
                            onClick={nextStep}
                            disabled={currentStep === 0 && !isValidated && apiKey !== 'existing-api-key-configured'}
                        >
                            Next
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );

    // Step 1: API Key Configuration
    function renderApiKeyStep() {
        const hasExistingConfig = apiKey === 'existing-api-key-configured';

        return (
            <Card>
                <CardHeader>
                    <CardTitle>API Configuration</CardTitle>
                    <CardDescription>
                        {hasExistingConfig
                            ? 'Your OpenRouter API key is already configured. You can proceed to model selection or enter a new key.'
                            : 'Enter your OpenRouter API key to access their models'
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {hasExistingConfig && (
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                                <CheckCircle className="h-4 w-4" />
                                API key is already configured and validated
                            </div>
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                You can proceed to model selection or enter a new API key below to replace the existing one.
                            </p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="apiKey">
                            {hasExistingConfig ? 'New OpenRouter API Key (optional)' : 'OpenRouter API Key'}
                        </Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    id="apiKey"
                                    type={showApiKey ? "text" : "password"}
                                    placeholder={hasExistingConfig ? "Enter new API key to replace existing..." : "sk-or-v1-..."}
                                    value={hasExistingConfig ? '' : apiKey}
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
                                disabled={isValidating || (!hasExistingConfig && !apiKey.trim())}
                            >
                                {isValidating ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : isValidated && !hasExistingConfig ? (
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                ) : null}
                                {isValidating ? 'Validating...' : hasExistingConfig ? 'Update API Key' : 'Validate & Save'}
                            </Button>
                        </div>
                        {validationError && (
                            <div className="flex items-center gap-2 text-sm text-destructive">
                                <XCircle className="h-4 w-4" />
                                {validationError}
                            </div>
                        )}
                        {isValidated && !validationError && !hasExistingConfig && (
                            <div className="flex items-center gap-2 text-sm text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                API key is valid and saved
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Step 2: Model Selection
    function renderModelSelectionStep() {
        const hasExistingConfig = apiKey === 'existing-api-key-configured';

        if (!isValidated && !hasExistingConfig) {
            return (
                <Card>
                    <CardContent className="text-center py-8">
                        <p className="text-muted-foreground">Please validate your API key first.</p>
                    </CardContent>
                </Card>
            );
        }

        if (hasExistingConfig && availableModels.length === 0) {
            return (
                <Card>
                    <CardHeader>
                        <CardTitle>Model Selection</CardTitle>
                        <CardDescription>
                            Loading your available OpenRouter models...
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                            <p className="text-muted-foreground mb-4">
                                Fetching available models using your saved API key...
                            </p>
                        </div>

                        {selectedModels.length > 0 && (
                            <div className="mt-6 p-4 bg-muted rounded-lg">
                                <h4 className="font-medium mb-2">Currently Selected Models ({selectedModels.length})</h4>
                                <div className="flex flex-wrap gap-2">
                                    {selectedModels.map((modelId) => (
                                        <Badge key={modelId} variant="outline" className="text-xs">
                                            {modelId}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            );
        }

        return (
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

                    {/* Save Button for this step */}
                    <div className="flex justify-end pt-4 border-t">
                        <Button
                            onClick={handleSave}
                            disabled={saveSettingsMutation.isPending || selectedModels.length === 0}
                            className="min-w-32"
                        >
                            {saveSettingsMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            Save & Continue
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Step 3: Completion
    function renderCompletionStep() {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Configuration Complete</CardTitle>
                    <CardDescription>
                        Your OpenRouter configuration has been successfully saved
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-center py-8">
                        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Setup Complete!</h3>
                        <p className="text-muted-foreground mb-4">
                            OpenRouter has been configured with {selectedModels.length} models
                        </p>
                    </div>

                    {/* Configuration Summary */}
                    <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg">
                            <h4 className="font-medium mb-2">Configuration Summary</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">API Key:</span>
                                    <span>Configured and validated</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Selected Models:</span>
                                    <span>{selectedModels.length} models</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Status:</span>
                                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                                        Active
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {selectedModels.length > 0 && (
                            <div className="p-4 bg-muted rounded-lg">
                                <h4 className="font-medium mb-2">Selected Models</h4>
                                <div className="flex flex-wrap gap-2">
                                    {selectedModels.slice(0, 10).map((modelId) => {
                                        const model = availableModels.find(m => m.id === modelId);
                                        return (
                                            <Badge key={modelId} variant="outline" className="text-xs">
                                                {model?.name || modelId}
                                            </Badge>
                                        );
                                    })}
                                    {selectedModels.length > 10 && (
                                        <Badge variant="outline" className="text-xs">
                                            +{selectedModels.length - 10} more
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="text-center text-sm text-muted-foreground">
                        You can now use OpenRouter models in your chat sessions.
                        <br />
                        To reconfigure, use the "Reset Configuration" button below.
                    </div>
                </CardContent>
            </Card>
        );
    }
}
