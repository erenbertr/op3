"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Eye, EyeOff, CheckCircle, XCircle, Save } from 'lucide-react';
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

    const user = authService.getCurrentUser();

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
                            Select the OpenRouter models you want to use globally
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {availableModels.map((model) => (
                                <div key={model.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                                    <Checkbox
                                        id={model.id}
                                        checked={selectedModels.includes(model.id)}
                                        onCheckedChange={() => handleModelToggle(model.id)}
                                    />
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor={model.id} className="text-sm font-medium cursor-pointer">
                                            {model.name}
                                        </Label>
                                        {model.description && (
                                            <p className="text-xs text-muted-foreground">
                                                {model.description}
                                            </p>
                                        )}
                                        <div className="flex gap-2">
                                            {model.context_length && (
                                                <Badge variant="secondary" className="text-xs">
                                                    {model.context_length.toLocaleString()} tokens
                                                </Badge>
                                            )}
                                            {model.pricing && (
                                                <Badge variant="outline" className="text-xs">
                                                    ${model.pricing.prompt}/${model.pricing.completion}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {selectedModels.length > 0 && (
                            <div className="mt-4 p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-2">
                                    Selected Models ({selectedModels.length}):
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedModels.map((modelId) => {
                                        const model = availableModels.find(m => m.id === modelId);
                                        return (
                                            <Badge key={modelId} variant="default">
                                                {model?.name || modelId}
                                            </Badge>
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
