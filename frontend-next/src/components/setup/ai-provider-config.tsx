"use client"

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/lib/i18n';
import { AIProviderConfig, AIProviderType, apiClient } from '@/lib/api';
import { Brain, Plus, Trash2, Eye, EyeOff, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

// Create schema function that takes translation function
const createAIProviderSchema = (t: (key: string) => string) => z.object({
    providers: z.array(z.object({
        type: z.enum(['openai', 'anthropic', 'google', 'replicate', 'custom'], {
            required_error: t('validation.aiProvider.type.required')
        }),
        name: z.string()
            .min(1, t('validation.aiProvider.name.required'))
            .min(2, t('validation.aiProvider.name.minLength')),
        apiKey: z.string()
            .min(1, t('validation.aiProvider.apiKey.required'))
            .min(10, t('validation.aiProvider.apiKey.minLength')),
        model: z.string()
            .min(1, t('validation.aiProvider.model.required')),
        endpoint: z.string().url(t('validation.aiProvider.endpoint.invalid')).optional().or(z.literal('')),
        isActive: z.boolean().default(true)
    })).min(1, t('setup.aiProvider.requireAtLeastOne'))
});

type AIProviderFormData = z.infer<ReturnType<typeof createAIProviderSchema>>;

interface AIProviderConfigProps {
    onNext: (config: AIProviderConfig[]) => void;
    onBack?: () => void;
    defaultValues?: AIProviderConfig[] | null;
}

interface ProviderTestStatus {
    [key: number]: {
        status: 'idle' | 'testing' | 'success' | 'error';
        message?: string;
    };
}

export function AIProviderConfigForm({ onNext, onBack, defaultValues }: AIProviderConfigProps) {
    const { t } = useI18n();
    const { addToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [showApiKeys, setShowApiKeys] = useState<{ [key: number]: boolean }>({});
    const [testStatus, setTestStatus] = useState<ProviderTestStatus>({});

    const aiProviderSchema = createAIProviderSchema(t);

    const form = useForm<AIProviderFormData>({
        resolver: zodResolver(aiProviderSchema),
        defaultValues: {
            providers: defaultValues && defaultValues.length > 0
                ? defaultValues.map(provider => ({
                    type: provider.type,
                    name: provider.name,
                    apiKey: provider.apiKey,
                    model: provider.model,
                    endpoint: provider.endpoint || '',
                    isActive: provider.isActive
                }))
                : [{
                    type: 'openai' as AIProviderType,
                    name: '',
                    apiKey: '',
                    model: 'gpt-4o',
                    endpoint: '',
                    isActive: true
                }]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'providers'
    });

    const addProvider = () => {
        append({
            type: 'openai' as AIProviderType,
            name: '',
            apiKey: '',
            model: 'gpt-4o',
            endpoint: '',
            isActive: true
        });
    };

    const removeProvider = (index: number) => {
        remove(index);
        // Clean up test status and show API key state
        const newTestStatus = { ...testStatus };
        delete newTestStatus[index];
        setTestStatus(newTestStatus);

        const newShowApiKeys = { ...showApiKeys };
        delete newShowApiKeys[index];
        setShowApiKeys(newShowApiKeys);
    };

    const toggleApiKeyVisibility = (index: number) => {
        setShowApiKeys(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const testConnection = async (index: number) => {
        const provider = form.getValues(`providers.${index}`);

        setTestStatus(prev => ({
            ...prev,
            [index]: { status: 'testing' }
        }));

        try {
            const result = await apiClient.testAIProviderConnection({
                type: provider.type,
                apiKey: provider.apiKey,
                model: provider.model,
                endpoint: provider.endpoint || undefined
            });

            setTestStatus(prev => ({
                ...prev,
                [index]: {
                    status: result.success ? 'success' : 'error',
                    message: result.message
                }
            }));

            if (result.success) {
                addToast({
                    title: t('setup.aiProvider.connectionSuccess'),
                    description: result.message,
                    variant: "success"
                });
            } else {
                addToast({
                    title: t('setup.aiProvider.connectionFailed'),
                    description: result.message,
                    variant: "destructive"
                });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setTestStatus(prev => ({
                ...prev,
                [index]: {
                    status: 'error',
                    message: errorMessage
                }
            }));

            addToast({
                title: t('setup.aiProvider.connectionFailed'),
                description: errorMessage,
                variant: "destructive"
            });
        }
    };

    const onSubmit = async (data: AIProviderFormData) => {
        setIsSaving(true);
        try {
            const providersToSave: AIProviderConfig[] = data.providers.map(provider => ({
                type: provider.type,
                name: provider.name,
                apiKey: provider.apiKey,
                model: provider.model,
                endpoint: provider.endpoint || undefined,
                isActive: provider.isActive
            }));

            const result = await apiClient.saveAIProviders(providersToSave);

            if (result.success) {
                addToast({
                    title: "Success!",
                    description: "AI providers configured successfully.",
                    variant: "success"
                });
                onNext(providersToSave);
            } else {
                addToast({
                    title: "Error",
                    description: result.message || 'Failed to save AI provider configuration. Please try again.',
                    variant: "destructive"
                });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            addToast({
                title: "Error",
                description: errorMessage,
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const getProviderTypeLabel = (type: AIProviderType): string => {
        return t(`aiProvider.type.${type}`);
    };

    const getDefaultModels = (type: AIProviderType): string[] => {
        switch (type) {
            case 'openai':
                return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'];
            case 'anthropic':
                return ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'];
            case 'google':
                return ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro', 'gemini-pro-vision'];
            case 'replicate':
                return ['meta/llama-2-70b-chat', 'mistralai/mixtral-8x7b-instruct-v0.1', 'meta/codellama-34b-instruct'];
            case 'custom':
                return [];
            default:
                return [];
        }
    };

    const getTestStatusIcon = (status: ProviderTestStatus[number]) => {
        switch (status?.status) {
            case 'testing':
                return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
            case 'success':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'error':
                return <XCircle className="h-4 w-4 text-red-500" />;
            default:
                return null;
        }
    };

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-500" />
                    {t('setup.aiProvider.title')}
                </CardTitle>
                <CardDescription>
                    {t('setup.aiProvider.description')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {fields.map((field, index) => (
                            <Card key={field.id} className="p-4 border-2 border-dashed border-gray-200">
                                <div className="flex justify-between items-start mb-4">
                                    <h4 className="text-sm font-medium text-gray-700">
                                        Provider {index + 1}
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        {getTestStatusIcon(testStatus[index])}
                                        {fields.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => removeProvider(index)}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                {t('setup.aiProvider.removeProvider')}
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Provider Type */}
                                    <FormField
                                        control={form.control}
                                        name={`providers.${index}.type`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('setup.aiProvider.type.label')}</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={t('setup.aiProvider.type.placeholder')} />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="openai">{getProviderTypeLabel('openai')}</SelectItem>
                                                        <SelectItem value="anthropic">{getProviderTypeLabel('anthropic')}</SelectItem>
                                                        <SelectItem value="google">{getProviderTypeLabel('google')}</SelectItem>
                                                        <SelectItem value="replicate">{getProviderTypeLabel('replicate')}</SelectItem>
                                                        <SelectItem value="custom">{getProviderTypeLabel('custom')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Custom Name */}
                                    <FormField
                                        control={form.control}
                                        name={`providers.${index}.name`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('setup.aiProvider.name.label')}</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder={t('setup.aiProvider.name.placeholder')}
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* API Key */}
                                <FormField
                                    control={form.control}
                                    name={`providers.${index}.apiKey`}
                                    render={({ field }) => (
                                        <FormItem className="mt-4">
                                            <FormLabel>{t('setup.aiProvider.apiKey.label')}</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        type={showApiKeys[index] ? "text" : "password"}
                                                        placeholder={t('setup.aiProvider.apiKey.placeholder')}
                                                        {...field}
                                                        className="pr-10"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                        onClick={() => toggleApiKeyVisibility(index)}
                                                    >
                                                        {showApiKeys[index] ? (
                                                            <EyeOff className="h-4 w-4" />
                                                        ) : (
                                                            <Eye className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Model */}
                                <FormField
                                    control={form.control}
                                    name={`providers.${index}.model`}
                                    render={({ field }) => {
                                        const currentType = form.watch(`providers.${index}.type`);
                                        const availableModels = getDefaultModels(currentType);

                                        return (
                                            <FormItem className="mt-4">
                                                <FormLabel>{t('setup.aiProvider.model.label')}</FormLabel>
                                                <FormControl>
                                                    {availableModels.length > 0 ? (
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder={t('setup.aiProvider.model.placeholder')} />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {availableModels.map((model) => (
                                                                    <SelectItem key={model} value={model}>
                                                                        {model}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <Input
                                                            placeholder={t('setup.aiProvider.model.placeholder')}
                                                            {...field}
                                                        />
                                                    )}
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        );
                                    }}
                                />

                                {/* Custom Endpoint */}
                                <FormField
                                    control={form.control}
                                    name={`providers.${index}.endpoint`}
                                    render={({ field }) => (
                                        <FormItem className="mt-4">
                                            <FormLabel>{t('setup.aiProvider.endpoint.label')}</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder={t('setup.aiProvider.endpoint.placeholder')}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Test Connection Button */}
                                <div className="mt-4 flex justify-end">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => testConnection(index)}
                                        disabled={testStatus[index]?.status === 'testing'}
                                        className="flex items-center gap-2"
                                    >
                                        {testStatus[index]?.status === 'testing' ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : null}
                                        {testStatus[index]?.status === 'testing'
                                            ? t('setup.aiProvider.testing')
                                            : t('setup.aiProvider.testConnection')
                                        }
                                    </Button>
                                </div>

                                {/* Test Status Message */}
                                {testStatus[index]?.message && (
                                    <div className={`mt-2 text-sm ${testStatus[index]?.status === 'success'
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                        }`}>
                                        {testStatus[index]?.message}
                                    </div>
                                )}
                            </Card>
                        ))}

                        {/* Add Provider Button */}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={addProvider}
                            className="w-full flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            {t('setup.aiProvider.addProvider')}
                        </Button>

                        {/* Navigation Buttons */}
                        <div className="flex gap-4 pt-6">
                            {onBack && (
                                <Button type="button" variant="outline" onClick={onBack}>
                                    Back
                                </Button>
                            )}
                            <Button
                                type="submit"
                                disabled={isSaving}
                                className="ml-auto flex items-center gap-2"
                            >
                                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                                {t('setup.aiProvider.button.continue')}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
