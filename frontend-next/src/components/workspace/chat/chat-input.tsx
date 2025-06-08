"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Search, Paperclip, Send, Loader2 } from 'lucide-react';
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
}

export function ChatInput({
    onSendMessage,
    personalities,
    aiProviders,
    isLoading = false,
    placeholder = "Type your message here...",
    className,
    disabled = false
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

    // Constants for localStorage keys
    const LAST_AI_PROVIDER_KEY = 'op3-last-ai-provider';
    const LAST_PERSONALITY_KEY = 'op3-last-personality';

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
        }
    }, [message]);

    // Load saved selections from localStorage on mount
    useEffect(() => {
        try {
            const savedProvider = localStorage.getItem(LAST_AI_PROVIDER_KEY);
            const savedPersonality = localStorage.getItem(LAST_PERSONALITY_KEY);

            if (savedProvider) {
                setSelectedProvider(savedProvider);
            }
            if (savedPersonality) {
                setSelectedPersonality(savedPersonality);
            }
        } catch (error) {
            console.error('Error loading saved selections from localStorage:', error);
        }
    }, []);

    // Set default AI provider if none selected and none saved
    useEffect(() => {
        if (aiProviders && aiProviders.length > 0 && !selectedProvider) {
            const activeProvider = aiProviders.find(p => p?.isActive) || aiProviders[0];
            const providerId = activeProvider?.id || '';
            setSelectedProvider(providerId);

            // Save as default for future sessions
            try {
                localStorage.setItem(LAST_AI_PROVIDER_KEY, providerId);
            } catch (error) {
                console.error('Error saving default AI provider to localStorage:', error);
            }
        }
    }, [aiProviders, selectedProvider]);

    // Validate saved provider still exists in current providers
    useEffect(() => {
        if (selectedProvider && aiProviders && aiProviders.length > 0) {
            const providerExists = aiProviders.find(p => p?.id === selectedProvider);
            if (!providerExists) {
                // Saved provider no longer exists, reset to default
                const activeProvider = aiProviders.find(p => p?.isActive) || aiProviders[0];
                const providerId = activeProvider?.id || '';
                setSelectedProvider(providerId);

                try {
                    localStorage.setItem(LAST_AI_PROVIDER_KEY, providerId);
                } catch (error) {
                    console.error('Error updating AI provider in localStorage:', error);
                }
            }
        }
    }, [aiProviders, selectedProvider]);

    // Validate saved personality still exists in current personalities
    useEffect(() => {
        if (selectedPersonality && personalities && personalities.length > 0) {
            const personalityExists = personalities.find(p => p?.id === selectedPersonality);
            if (!personalityExists) {
                // Saved personality no longer exists, reset to none
                setSelectedPersonality('');
                try {
                    localStorage.removeItem(LAST_PERSONALITY_KEY);
                } catch (error) {
                    console.error('Error removing invalid personality from localStorage:', error);
                }
            }
        }
    }, [personalities, selectedPersonality]);

    // Close dropdowns when clicking outside
    useEffect(() => {
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
        } catch (error) {
            console.error('Error sending message:', error);
            // Restore message on error
            setMessage(content);
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
                        placeholder={placeholder}
                        disabled={disabled || isLoading}
                        className="min-h-[60px] max-h-[200px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 pr-12"
                        rows={1}
                    />

                    {/* Send button */}
                    <Button
                        type="submit"
                        size="sm"
                        disabled={!message.trim() || isLoading || disabled}
                        className="absolute bottom-2 right-2 h-8 w-8 p-0"
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </div>

                {/* Controls row */}
                <div className="flex items-center gap-3 text-sm">
                    {/* Personality selection */}
                    <div className="relative flex-1" ref={personalityDropdownRef}>
                        <button
                            type="button"
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                                        className="px-3 py-2 hover:bg-accent cursor-pointer"
                                        onClick={() => {
                                            setSelectedPersonality('');
                                            setShowPersonalityDropdown(false);
                                            setPersonalitySearch('');
                                            try {
                                                localStorage.removeItem(LAST_PERSONALITY_KEY);
                                            } catch (error) {
                                                console.error('Error removing personality from localStorage:', error);
                                            }
                                        }}
                                    >
                                        <div className="font-medium">No personality</div>
                                        <div className="text-xs text-muted-foreground">Use default AI behavior</div>
                                    </div>
                                    {filteredPersonalities.map((personality) => (
                                        <div
                                            key={personality.id}
                                            className="px-3 py-2 hover:bg-accent cursor-pointer"
                                            onClick={() => {
                                                setSelectedPersonality(personality.id);
                                                setShowPersonalityDropdown(false);
                                                setPersonalitySearch('');
                                                try {
                                                    localStorage.setItem(LAST_PERSONALITY_KEY, personality.id);
                                                } catch (error) {
                                                    console.error('Error saving personality to localStorage:', error);
                                                }
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
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                                            className="px-3 py-2 hover:bg-accent cursor-pointer"
                                            onClick={() => {
                                                const providerId = provider.id || '';
                                                setSelectedProvider(providerId);
                                                setShowProviderDropdown(false);
                                                setProviderSearch('');
                                                try {
                                                    localStorage.setItem(LAST_AI_PROVIDER_KEY, providerId);
                                                } catch (error) {
                                                    console.error('Error saving AI provider to localStorage:', error);
                                                }
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
