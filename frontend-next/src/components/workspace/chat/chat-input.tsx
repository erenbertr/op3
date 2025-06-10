"use client"

import React, { useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Search, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Personality, AIProviderConfig } from '@/lib/api';

interface ChatInputProps {
    onSendMessage: (content: string, personalityId?: string, aiProviderId?: string) => Promise<void>;
    personalities: Personality[];
    aiProviders: AIProviderConfig[];
    isLoading?: boolean;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    sessionPersonalityId?: string;
    sessionAIProviderId?: string;
    onSettingsChange?: (personalityId?: string, aiProviderId?: string) => Promise<void>;
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
    onSettingsChange
}: ChatInputProps) {
    const [message, setMessage] = useState('');
    const [selectedPersonality, setSelectedPersonality] = useState<string>('');
    const [selectedProvider, setSelectedProvider] = useState<string>('');
    const [personalitySearch, setPersonalitySearch] = useState('');
    const [providerSearch, setProviderSearch] = useState('');
    const [showPersonalityDropdown, setShowPersonalityDropdown] = useState(false);
    const [showProviderDropdown, setShowProviderDropdown] = useState(false);
    const [searchEnabled, setSearchEnabled] = useState(false);
    const [fileAttachEnabled, setFileAttachEnabled] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const personalityDropdownRef = useRef<HTMLDivElement>(null);
    const providerDropdownRef = useRef<HTMLDivElement>(null);



    // Auto-resize textarea (use ref callback instead of useEffect)
    React.useLayoutEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
        }
    });

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!message.trim() || isLoading || disabled) {
            return;
        }

        const content = message.trim();
        setMessage('');

        try {
            await onSendMessage(
                content,
                selectedPersonality || undefined,
                selectedProvider || undefined
            );
            // Keep focus on textarea after sending - use setTimeout to ensure it happens after any re-renders
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 0);
        } catch (error) {
            console.error('Error sending message:', error);
            // Restore message on error
            setMessage(content);
            // Keep focus on textarea even on error
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 0);
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
                {/* Main input area */}
                <div className="relative border rounded-lg bg-background focus-within:ring-2 focus-within:ring-ring">
                    <Textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter to send, Shift+Enter to add a new line"
                        disabled={disabled || isLoading}
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

                    <Button
                        type="button"
                        variant={fileAttachEnabled ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFileAttachEnabled(!fileAttachEnabled)}
                        className="h-8 w-8 p-0"
                        title="Toggle file attachment"
                    >
                        <Paperclip className="h-4 w-4" />
                    </Button>
                </div>
            </form>
        </div>
    );
}
