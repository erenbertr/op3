"use client"

import React, { useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Search, Paperclip, X, Upload, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Personality, AIProviderConfig, FileAttachment, apiClient, OpenRouterModel } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { openaiModelConfigsAPI, type OpenAIModelConfig, type ModelCapabilities } from '@/lib/api/openai-model-configs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ChatInputProps {
    onSendMessage: (content: string, personalityId?: string, aiProviderId?: string, searchEnabled?: boolean, reasoningEnabled?: boolean, fileAttachments?: string[], attachmentData?: FileAttachment[]) => Promise<void>;
    personalities: Personality[];
    aiProviders: AIProviderConfig[];
    isLoading?: boolean;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    sessionPersonalityId?: string;
    sessionAIProviderId?: string;
    onSettingsChange?: (personalityId?: string, aiProviderId?: string) => Promise<void>;
    autoFocus?: boolean;
    onInterruptStreaming?: () => void;
    sessionId?: string;
    userId?: string;
    workspaceId?: string;
}

export function ChatInput({
    onSendMessage,
    personalities,
    aiProviders,
    isLoading = false,
    placeholder = "Enter to send, Shift+Enter to add a new line",
    className,
    disabled = false,
    sessionPersonalityId,
    sessionAIProviderId,
    onSettingsChange,
    autoFocus = false,
    onInterruptStreaming,
    sessionId,
    userId,
    workspaceId
}: ChatInputProps) {
    const [message, setMessage] = useState('');
    const [selectedPersonality, setSelectedPersonality] = useState<string>('');
    const [selectedProvider, setSelectedProvider] = useState<string>('');
    const [selectedModelConfig, setSelectedModelConfig] = useState<string>(''); // New state for model config selection
    const [personalitySearch, setPersonalitySearch] = useState('');
    const [providerSearch, setProviderSearch] = useState('');
    const [showPersonalityDropdown, setShowPersonalityDropdown] = useState(false);
    const [showProviderDropdown, setShowProviderDropdown] = useState(false);
    const [searchEnabled, setSearchEnabled] = useState(false);
    const [reasoningEnabled, setReasoningEnabled] = useState(false);
    const [fileAttachEnabled, setFileAttachEnabled] = useState(false);
    const [shouldMaintainFocus, setShouldMaintainFocus] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadedFileIds, setUploadedFileIds] = useState<string[]>([]);
    const [uploadedAttachments, setUploadedAttachments] = useState<FileAttachment[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [showOpenRouterSubmenu, setShowOpenRouterSubmenu] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const personalityDropdownRef = useRef<HTMLDivElement>(null);
    const providerDropdownRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-resize textarea (use ref callback instead of useEffect)
    React.useLayoutEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
        }
    });

    // Maintain focus after message sending
    React.useLayoutEffect(() => {
        if (shouldMaintainFocus && textareaRef.current) {
            textareaRef.current.focus();
            setShouldMaintainFocus(false);
        }
    }, [shouldMaintainFocus]);

    // Auto-focus when autoFocus prop is true
    React.useEffect(() => {
        if (autoFocus && textareaRef.current && !disabled) {
            // Small delay to ensure the component is fully rendered
            const timer = setTimeout(() => {
                textareaRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [autoFocus, disabled]);

    // Fetch OpenAI model configurations
    const { data: openaiModelConfigs = [] } = useQuery({
        queryKey: ['openai-model-configs'],
        queryFn: () => openaiModelConfigsAPI.getModelConfigs(),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Helper function to get capability icon
    const getCapabilityIcon = (capability: string) => {
        switch (capability) {
            case 'search': return Search;
            case 'reasoning': return Brain;
            case 'fileUpload': return Paperclip;
            default: return Search;
        }
    };

    // Helper function to check if a model has a specific capability
    const hasCapability = (modelConfig: OpenAIModelConfig | undefined, capability: keyof ModelCapabilities): boolean => {
        return modelConfig?.capabilities?.[capability] === true;
    };

    // Get the currently selected model config
    const selectedModelConfigObj = useMemo(() => {
        return openaiModelConfigs.find(config => config.id === selectedModelConfig);
    }, [openaiModelConfigs, selectedModelConfig]);

    // Combine regular providers with any additional providers (like OpenRouter)
    const allProviders = useMemo(() => {
        return [...(aiProviders || [])];
    }, [aiProviders]);

    // Derived state for personality selection
    const derivedPersonality = useMemo(() => {
        if (sessionPersonalityId !== undefined) {
            return sessionPersonalityId;
        }
        return '';
    }, [sessionPersonalityId]);

    // Derived state for AI provider selection - now prioritizes model configs
    const derivedProvider = useMemo(() => {
        // First, try to find a matching model config if sessionAIProviderId is a model config ID
        if (sessionAIProviderId && openaiModelConfigs.length > 0) {
            const sessionModelConfig = openaiModelConfigs.find(config => config.id === sessionAIProviderId);
            if (sessionModelConfig) {
                setSelectedModelConfig(sessionAIProviderId);
                return 'openai'; // Return the provider type
            }
        }

        // If session has a specific provider ID and it exists in available providers, use it
        if (sessionAIProviderId && allProviders && allProviders.length > 0) {
            const sessionProvider = allProviders.find(p => p?.id === sessionAIProviderId);
            if (sessionProvider) {
                return sessionAIProviderId;
            }
        }

        // Otherwise, fall back to active model config or provider
        if (openaiModelConfigs.length > 0) {
            const activeModelConfig = openaiModelConfigs.find(config => config.isActive) || openaiModelConfigs[0];
            if (activeModelConfig) {
                setSelectedModelConfig(activeModelConfig.id);
                return 'openai';
            }
        }

        // Fall back to regular providers
        if (allProviders && allProviders.length > 0) {
            const activeProvider = allProviders.find(p => p?.isActive) || allProviders[0];
            return activeProvider?.id || '';
        }
        return '';
    }, [sessionAIProviderId, allProviders, openaiModelConfigs]);

    // Update state when derived values change - use useEffect instead of useMemo for side effects
    React.useEffect(() => {
        console.log('🔄 Updating selectedPersonality:', {
            derivedPersonality,
            currentSelected: selectedPersonality
        });
        setSelectedPersonality(derivedPersonality);
    }, [derivedPersonality]);

    React.useEffect(() => {
        console.log('🔄 Updating selectedProvider:', {
            derivedProvider,
            currentSelected: selectedProvider,
            sessionAIProviderId,
            aiProvidersCount: aiProviders?.length
        });
        setSelectedProvider(derivedProvider);
    }, [derivedProvider]);

    // Handle personality selection change
    const handlePersonalityChange = async (personalityId: string) => {
        setSelectedPersonality(personalityId);
        if (onSettingsChange) {
            await onSettingsChange(personalityId || undefined, selectedProvider || undefined);
        }
    };

    // Handle AI provider selection change - now handles both model configs and regular providers
    const handleProviderChange = async (providerId: string, isModelConfig = false) => {
        if (isModelConfig) {
            // This is a model config ID
            setSelectedModelConfig(providerId);
            setSelectedProvider('openai'); // Set provider type to openai
            if (onSettingsChange) {
                await onSettingsChange(selectedPersonality || undefined, providerId || undefined);
            }
        } else {
            // This is a regular provider ID
            setSelectedProvider(providerId);
            setSelectedModelConfig(''); // Clear model config selection
            if (onSettingsChange) {
                await onSettingsChange(selectedPersonality || undefined, providerId || undefined);
            }
        }
    };

    // Validate selected provider (derived validation)
    const validatedProvider = useMemo(() => {
        if (selectedProvider && allProviders && allProviders.length > 0) {
            const providerExists = allProviders.find(p => p?.id === selectedProvider);
            if (!providerExists) {
                const activeProvider = allProviders.find(p => p?.isActive) || allProviders[0];
                return activeProvider?.id || '';
            }
        }
        return selectedProvider;
    }, [allProviders, selectedProvider]);

    // Validate selected personality (derived validation)
    const validatedPersonality = useMemo(() => {
        if (selectedPersonality && personalities && personalities.length > 0) {
            const personalityExists = personalities.find(p => p?.id === selectedPersonality);
            if (!personalityExists) {
                return '';
            }
        }
        return selectedPersonality;
    }, [personalities, selectedPersonality]);

    // Update state if validation changed the values - use useEffect for side effects
    React.useEffect(() => {
        if (validatedProvider !== selectedProvider) {
            console.log('🔧 Validation correcting provider:', {
                from: selectedProvider,
                to: validatedProvider
            });
            setSelectedProvider(validatedProvider);
        }
    }, [validatedProvider, selectedProvider]);

    React.useEffect(() => {
        if (validatedPersonality !== selectedPersonality) {
            console.log('🔧 Validation correcting personality:', {
                from: selectedPersonality,
                to: validatedPersonality
            });
            setSelectedPersonality(validatedPersonality);
        }
    }, [validatedPersonality, selectedPersonality]);

    // Close dropdowns when clicking outside (using useLayoutEffect for DOM events)
    React.useLayoutEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (personalityDropdownRef.current && !personalityDropdownRef.current.contains(event.target as Node)) {
                setShowPersonalityDropdown(false);
            }
            if (providerDropdownRef.current && !providerDropdownRef.current.contains(event.target as Node)) {
                setShowProviderDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle file selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setSelectedFiles(prev => [...prev, ...files]);
        // Clear the input so the same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Remove selected file
    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    // Upload files
    const uploadFiles = async () => {
        if (!sessionId || !userId || selectedFiles.length === 0) {
            return [];
        }

        setIsUploading(true);
        try {
            const result = await apiClient.uploadFiles(sessionId, selectedFiles, userId);
            if (result.success && result.results) {
                const successfulResults = result.results.filter(r => r.success && r.attachment);
                const fileIds = successfulResults.map(r => r.attachment!.id);
                const attachments = successfulResults.map(r => r.attachment!);

                setUploadedFileIds(prev => [...prev, ...fileIds]);
                setUploadedAttachments(prev => [...prev, ...attachments]);
                setSelectedFiles([]); // Clear selected files after upload
                return fileIds;
            }
            return [];
        } catch (error) {
            console.error('Error uploading files:', error);
            return [];
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!message.trim() || disabled) {
            return;
        }

        const content = message.trim();
        setMessage('');

        // Interrupt streaming if it's happening
        if (isLoading && onInterruptStreaming) {
            onInterruptStreaming();
        }

        try {
            // Upload files if any are selected
            let fileAttachmentIds: string[] = [];
            if (selectedFiles.length > 0) {
                fileAttachmentIds = await uploadFiles();
            }

            // Include previously uploaded files
            const allFileIds = [...uploadedFileIds, ...fileAttachmentIds];

            // Use model config ID if selected, otherwise use provider ID
            const aiProviderId = selectedModelConfig || selectedProvider || undefined;

            await onSendMessage(
                content,
                selectedPersonality || undefined,
                aiProviderId,
                searchEnabled,
                reasoningEnabled,
                allFileIds.length > 0 ? allFileIds : undefined,
                uploadedAttachments.length > 0 ? uploadedAttachments : undefined
            );

            // Clear uploaded file IDs and attachments after sending
            setUploadedFileIds([]);
            setUploadedAttachments([]);

            // Trigger focus maintenance after all re-renders
            setShouldMaintainFocus(true);
        } catch (error) {
            console.error('Error sending message:', error);
            // Restore message on error
            setMessage(content);
            // Trigger focus maintenance even on error
            setShouldMaintainFocus(true);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const filteredPersonalities = (personalities || []).filter(p =>
        p?.title?.toLowerCase().includes(personalitySearch.toLowerCase())
    );

    const filteredProviders = allProviders.filter(p =>
        (p?.name || p?.type || '').toLowerCase().includes(providerSearch.toLowerCase()) ||
        (p?.model || '').toLowerCase().includes(providerSearch.toLowerCase())
    );

    const selectedPersonalityObj = (personalities || []).find(p => p?.id === selectedPersonality);
    const selectedProviderObj = allProviders.find(p => p?.id === selectedProvider);

    // Debug logging for provider selection
    React.useEffect(() => {
        console.log('🎯 Provider selection debug:', {
            sessionAIProviderId: sessionAIProviderId,
            derivedProvider: derivedProvider,
            selectedProvider: selectedProvider,
            selectedProviderObj: selectedProviderObj ? { id: selectedProviderObj.id, name: selectedProviderObj.name } : null,
            allProviders: allProviders?.map(p => ({ id: p.id, name: p.name, isActive: p.isActive, type: p.type }))
        });
    }, [selectedProvider, selectedProviderObj, sessionAIProviderId, derivedProvider, allProviders]);

    return (
        <div className={cn("w-full max-w-4xl mx-auto", className)}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* File attachments display */}
                {(selectedFiles.length > 0 || uploadedFileIds.length > 0) && (
                    <div className="space-y-2">
                        {selectedFiles.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {selectedFiles.map((file, index) => (
                                    <div key={index} className="flex items-center gap-2 bg-muted px-3 py-2 rounded-md text-sm">
                                        <span className="truncate max-w-[200px]">{file.name}</span>
                                        <span className="text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-4 w-4 p-0"
                                            onClick={() => removeFile(index)}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {uploadedFileIds.length > 0 && (
                            <div className="text-sm text-muted-foreground">
                                {uploadedFileIds.length} file(s) ready for next message
                            </div>
                        )}
                    </div>
                )}

                {/* Main input area */}
                <div className="relative border rounded-lg bg-background focus-within:ring-2 focus-within:ring-ring">
                    <Textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter to send, Shift+Enter to add a new line"
                        disabled={disabled}
                        className="min-h-[60px] max-h-[200px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        rows={1}
                    />
                </div>

                {/* Controls row */}
                <div className="flex items-center gap-3 text-sm">
                    {/* Personality selection */}
                    <div className="relative flex-1" ref={personalityDropdownRef}>
                        <button
                            type="button"
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 select-none"
                            onClick={() => setShowPersonalityDropdown(!showPersonalityDropdown)}
                        >
                            <span className="text-muted-foreground">
                                {selectedPersonalityObj ? selectedPersonalityObj.title : "No personality selected"}
                            </span>
                        </button>

                        {showPersonalityDropdown && (
                            <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border rounded-md shadow-lg z-50 max-h-60 overflow-hidden">
                                <div className="p-2 border-b">
                                    <Input
                                        placeholder="Search personalities..."
                                        value={personalitySearch}
                                        onChange={(e) => setPersonalitySearch(e.target.value)}
                                        className="h-8"
                                    />
                                </div>
                                <div className="max-h-40 overflow-y-auto">
                                    <div
                                        className="px-3 py-2 hover:bg-accent cursor-pointer select-none"
                                        onClick={() => {
                                            handlePersonalityChange('');
                                            setShowPersonalityDropdown(false);
                                            setPersonalitySearch('');
                                        }}
                                    >
                                        <div className="font-medium">No personality</div>
                                        <div className="text-xs text-muted-foreground">Use default AI behavior</div>
                                    </div>
                                    {filteredPersonalities.map((personality) => (
                                        <div
                                            key={personality.id}
                                            className="px-3 py-2 hover:bg-accent cursor-pointer select-none"
                                            onClick={() => {
                                                handlePersonalityChange(personality.id);
                                                setShowPersonalityDropdown(false);
                                                setPersonalitySearch('');
                                            }}
                                        >
                                            <div className="font-medium">{personality?.title || 'Untitled'}</div>
                                            <div className="text-xs text-muted-foreground line-clamp-2">
                                                {personality?.prompt ? personality.prompt.substring(0, 100) + '...' : 'No description'}
                                            </div>
                                        </div>
                                    ))}
                                    {filteredPersonalities.length === 0 && personalitySearch && (
                                        <div className="px-3 py-2 text-muted-foreground text-center">
                                            No personalities found
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* AI Provider selection */}
                    <div className="relative w-48" ref={providerDropdownRef}>
                        <button
                            type="button"
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 select-none"
                            onClick={() => setShowProviderDropdown(!showProviderDropdown)}
                        >
                            {selectedModelConfigObj ? (
                                <span className="flex items-center gap-2 text-muted-foreground">
                                    <span>{selectedModelConfigObj.customName || selectedModelConfigObj.modelName}</span>
                                    <div className="flex items-center gap-1">
                                        {selectedModelConfigObj.capabilities?.search && <Search className="h-3 w-3" />}
                                        {selectedModelConfigObj.capabilities?.reasoning && <Brain className="h-3 w-3" />}
                                        {selectedModelConfigObj.capabilities?.fileUpload && <Paperclip className="h-3 w-3" />}
                                    </div>
                                </span>
                            ) : selectedProviderObj ? (
                                <span className="flex items-center gap-2 text-muted-foreground">
                                    <span>{selectedProviderObj.name || selectedProviderObj.type}</span>
                                    <span className="text-xs">{selectedProviderObj.model}</span>
                                </span>
                            ) : (
                                <span className="text-muted-foreground">Select AI provider</span>
                            )}
                        </button>

                        {showProviderDropdown && (
                            <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border rounded-md shadow-lg z-50 max-h-60 overflow-hidden">
                                <div className="p-2 border-b">
                                    <Input
                                        placeholder="Search providers..."
                                        value={providerSearch}
                                        onChange={(e) => setProviderSearch(e.target.value)}
                                        className="h-8"
                                    />
                                </div>
                                <div className="max-h-40 overflow-y-auto">
                                    {/* OpenAI Models Section */}
                                    {openaiModelConfigs.length > 0 && (
                                        <div>
                                            <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
                                                OpenAI
                                            </div>
                                            {openaiModelConfigs
                                                .filter(config =>
                                                    (config.customName || config.modelName).toLowerCase().includes(providerSearch.toLowerCase())
                                                )
                                                .map((config) => (
                                                    <div
                                                        key={config.id}
                                                        className="px-3 py-2 hover:bg-accent cursor-pointer select-none"
                                                        onClick={() => {
                                                            handleProviderChange(config.id, true);
                                                            setShowProviderDropdown(false);
                                                            setProviderSearch('');
                                                        }}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="font-medium">
                                                                {config.customName || config.modelName}
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                {config.capabilities?.search && <Search className="h-3 w-3" />}
                                                                {config.capabilities?.reasoning && <Brain className="h-3 w-3" />}
                                                                {config.capabilities?.fileUpload && <Paperclip className="h-3 w-3" />}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}

                                    {/* Other Providers Section */}
                                    {filteredProviders.length > 0 && (
                                        <div>
                                            {openaiModelConfigs.length > 0 && (
                                                <div className="border-t my-1"></div>
                                            )}
                                            {filteredProviders.map((provider) => (
                                                <div
                                                    key={provider.id}
                                                    className="px-3 py-2 hover:bg-accent cursor-pointer select-none"
                                                    onClick={() => {
                                                        const providerId = provider.id || '';
                                                        handleProviderChange(providerId, false);
                                                        setShowProviderDropdown(false);
                                                        setProviderSearch('');
                                                    }}
                                                >
                                                    <div className="font-medium">
                                                        {provider?.name || provider?.type || 'Unknown Provider'}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {provider?.model || 'Unknown Model'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* No results message */}
                                    {filteredProviders.length === 0 && openaiModelConfigs.filter(config =>
                                        (config.customName || config.modelName).toLowerCase().includes(providerSearch.toLowerCase())
                                    ).length === 0 && providerSearch && (
                                            <div className="px-3 py-2 text-muted-foreground text-center">
                                                No providers found
                                            </div>
                                        )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Toggle buttons with capability-based enabling */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant={searchEnabled ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSearchEnabled(!searchEnabled)}
                                    className="h-8 w-8 p-0"
                                    disabled={!hasCapability(selectedModelConfigObj, 'search')}
                                >
                                    <Search className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {hasCapability(selectedModelConfigObj, 'search')
                                    ? "Toggle search functionality"
                                    : "Model does not have search capability"}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant={reasoningEnabled ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setReasoningEnabled(!reasoningEnabled)}
                                    className="h-8 w-8 p-0"
                                    disabled={!hasCapability(selectedModelConfigObj, 'reasoning')}
                                >
                                    <Brain className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {hasCapability(selectedModelConfigObj, 'reasoning')
                                    ? "Toggle model reasoning"
                                    : "Model does not have reasoning capability"}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <div className="relative">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant={fileAttachEnabled ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="h-8 w-8 p-0"
                                        disabled={isUploading || !hasCapability(selectedModelConfigObj, 'fileUpload')}
                                    >
                                        {isUploading ? (
                                            <Upload className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Paperclip className="h-4 w-4" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {isUploading
                                        ? "Uploading files..."
                                        : hasCapability(selectedModelConfigObj, 'fileUpload')
                                            ? "Attach files"
                                            : "Model does not have file upload capability"}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={handleFileSelect}
                            accept=".txt,.md,.csv,.html,.css,.js,.py,.java,.c,.cpp,.cs,.php,.rb,.go,.tex,.json,.pdf,.doc,.docx,.pptx,.sh,.ts"
                        />
                    </div>
                </div>
            </form>
        </div>
    );
}
