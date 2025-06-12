"use client"

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { useWorkspaces } from '@/lib/hooks/use-query-hooks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OpenRouterSettingsViewProps {
    workspaceId?: string;
}

export function OpenRouterSettingsView({ workspaceId }: OpenRouterSettingsViewProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { addToast } = useToast();
    const queryClient = useQueryClient();

    const [apiKey, setApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [selectedModels, setSelectedModels] = useState<string[]>([]);
    const [availableModels, setAvailableModels] = useState<OpenRouterModel[]>([]);
    const [isValidating, setIsValidating] = useState(false);
    const [isValidated, setIsValidated] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');

    const user = authService.getCurrentUser();

    // Fetch user workspaces for the selector
    const { data: workspacesResult } = useWorkspaces(user?.id || '', 'OpenRouterSettings');

    // Get current workspace ID from URL if not provided as prop
    // For settings routes, we need to extract workspaceId from the URL path
    const currentWorkspaceId = React.useMemo(() => {
        if (workspaceId) return workspaceId;

        // Extract from URL path like /ws/{workspaceId}/settings/openrouter
        if (typeof window !== 'undefined') {
            const path = window.location.pathname;
            const wsMatch = path.match(/^\/ws\/([^\/]+)/);
            if (wsMatch) {
                return wsMatch[1];
            }
        }

        return searchParams.get('workspaceId') || selectedWorkspaceId || '';
    }, [workspaceId, searchParams, selectedWorkspaceId]);

    // Set the first workspace as default if no workspace is selected
    React.useEffect(() => {
        if (!currentWorkspaceId && workspacesResult?.workspaces && workspacesResult.workspaces.length > 0) {
            setSelectedWorkspaceId(workspacesResult.workspaces[0].id);
        }
    }, [currentWorkspaceId, workspacesResult]);

    React.useLayoutEffect(() => {
        if (!user) {
            router.push('/');
            return;
        }

        if (!currentWorkspaceId) {
            console.error('No workspace ID provided');
            return;
        }
    }, [user, router, currentWorkspaceId]);

    // Fetch existing settings
    const { data: settingsData, isLoading: isLoadingSettings } = useQuery({
        queryKey: ['workspace-openrouter-settings', currentWorkspaceId],
        queryFn: () => apiClient.getWorkspaceOpenRouterSettings(currentWorkspaceId),
        enabled: !!currentWorkspaceId,
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
            if (!currentWorkspaceId || !apiKey.trim()) {
                throw new Error('Workspace ID and API key are required');
            }

            return apiClient.saveWorkspaceOpenRouterSettings({
                workspaceId: currentWorkspaceId,
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
                queryClient.invalidateQueries({ queryKey: ['workspace-openrouter-settings', currentWorkspaceId] });
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

    if (!user || !currentWorkspaceId) {
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
            {/* Workspace Selector - only show if not in workspace context */}
            {!workspaceId && workspacesResult?.workspaces && workspacesResult.workspaces.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Select Workspace</CardTitle>
                        <CardDescription>
                            Choose the workspace to configure OpenRouter settings for
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Select value={currentWorkspaceId} onValueChange={setSelectedWorkspaceId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a workspace" />
                            </SelectTrigger>
                            <SelectContent>
                                {workspacesResult.workspaces.map((workspace) => (
                                    <SelectItem key={workspace.id} value={workspace.id}>
                                        {workspace.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>
            )}

            {/* Show settings only if we have a workspace selected */}
            {currentWorkspaceId && (
                <>
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
                                    Select the OpenRouter models you want to use in this workspace
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
                </>
            )}

            {/* Show message if no workspace is selected */}
            {!currentWorkspaceId && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center text-muted-foreground">
                            Please select a workspace to configure OpenRouter settings.
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
