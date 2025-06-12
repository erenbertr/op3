"use client"

import React, { useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Search, Paperclip, X, Upload, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Personality, AIProviderConfig, FileAttachment, apiClient } from '@/lib/api';

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
    userId
}: ChatInputProps) {
    const [message, setMessage] = useState('');
    const [selectedPersonality, setSelectedPersonality] = useState<string>('');
    const [selectedProvider, setSelectedProvider] = useState<string>('');
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

    // Derived state for personality selection
    const derivedPersonality = useMemo(() => {
        if (sessionPersonalityId !== undefined) {
            return sessionPersonalityId;
        }
        return '';
    }, [sessionPersonalityId]);

    // Derived state for AI provider selection
    const derivedProvider = useMemo(() => {
        // If session has a specific provider ID and it exists in available providers, use it
        if (sessionAIProviderId && aiProviders && aiProviders.length > 0) {
            const sessionProvider = aiProviders.find(p => p?.id === sessionAIProviderId);
            if (sessionProvider) {
                return sessionAIProviderId;
            }
        }

        // Otherwise, fall back to active provider or first available
        if (aiProviders && aiProviders.length > 0) {
            const activeProvider = aiProviders.find(p => p?.isActive) || aiProviders[0];
            return activeProvider?.id || '';
        }
        return '';
    }, [sessionAIProviderId, aiProviders]);

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

    // Handle AI provider selection change
    const handleProviderChange = async (providerId: string) => {
        setSelectedProvider(providerId);
        if (onSettingsChange) {
            await onSettingsChange(selectedPersonality || undefined, providerId || undefined);
        }
    };

    // Validate selected provider (derived validation)
    const validatedProvider = useMemo(() => {
        if (selectedProvider && aiProviders && aiProviders.length > 0) {
            const providerExists = aiProviders.find(p => p?.id === selectedProvider);
            if (!providerExists) {
                const activeProvider = aiProviders.find(p => p?.isActive) || aiProviders[0];
                return activeProvider?.id || '';
            }
        }
        return selectedProvider;
    }, [aiProviders, selectedProvider]);

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

            await onSendMessage(
                content,
                selectedPersonality || undefined,
                selectedProvider || undefined,
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

    const filteredProviders = (aiProviders || []).filter(p =>
        (p?.name || p?.type || '').toLowerCase().includes(providerSearch.toLowerCase()) ||
        (p?.model || '').toLowerCase().includes(providerSearch.toLowerCase())
    );

    const selectedPersonalityObj = (personalities || []).find(p => p?.id === selectedPersonality);
    const selectedProviderObj = (aiProviders || []).find(p => p?.id === selectedProvider);

    // Debug logging for provider selection
    React.useEffect(() => {
        console.log('🎯 Provider selection debug:', {
            sessionAIProviderId: sessionAIProviderId,
            derivedProvider: derivedProvider,
            selectedProvider: selectedProvider,
            selectedProviderObj: selectedProviderObj ? { id: selectedProviderObj.id, name: selectedProviderObj.name } : null,
            aiProviders: aiProviders?.map(p => ({ id: p.id, name: p.name, isActive: p.isActive }))
        });
    }, [selectedProvider, selectedProviderObj, sessionAIProviderId, derivedProvider, aiProviders]);

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
                            {selectedProviderObj ? (
                                <span className="flex items-center gap-2 text-muted-foreground">
                                    <span>{selectedProviderObj.name || selectedProviderObj.type}</span>
                                    <span className="text-xs">
                                        {selectedProviderObj.model}
                                    </span>
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
                                    {filteredProviders.map((provider) => (
                                        <div
                                            key={provider.id}
                                            className="px-3 py-2 hover:bg-accent cursor-pointer select-none"
                                            onClick={() => {
                                                const providerId = provider.id || '';
                                                handleProviderChange(providerId);
                                                setShowProviderDropdown(false);
                                                setProviderSearch('');
                                            }}
                                        >
                                            <div className="font-medium">{provider?.name || provider?.type || 'Unknown Provider'}</div>
                                            <div className="text-xs text-muted-foreground">{provider?.model || 'Unknown Model'}</div>
                                        </div>
                                    ))}
                                    {filteredProviders.length === 0 && providerSearch && (
                                        <div className="px-3 py-2 text-muted-foreground text-center">
                                            No providers found
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Toggle buttons */}
                    <Button
                        type="button"
                        variant={searchEnabled ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSearchEnabled(!searchEnabled)}
                        className="h-8 w-8 p-0"
                        title="Toggle search functionality"
                    >
                        <Search className="h-4 w-4" />
                    </Button>

                    {/* Reasoning toggle */}
                    <Button
                        type="button"
                        variant={reasoningEnabled ? "default" : "outline"}
                        size="sm"
                        onClick={() => setReasoningEnabled(!reasoningEnabled)}
                        className="h-8 w-8 p-0"
                        title="Toggle model reasoning"
                    >
                        <Brain className="h-4 w-4" />
                    </Button>

                    <div className="relative">
                        <Button
                            type="button"
                            variant={fileAttachEnabled ? "default" : "outline"}
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="h-8 w-8 p-0"
                            title="Attach files"
                            disabled={isUploading}
                        >
                            {isUploading ? (
                                <Upload className="h-4 w-4 animate-spin" />
                            ) : (
                                <Paperclip className="h-4 w-4" />
                            )}
                        </Button>
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
