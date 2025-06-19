"use client"

import React, { useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Paperclip, Brain, ChevronDown, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOpenAIModelConfigs, useGoogleModelConfigs, useGrokModelConfigs, useAnthropicModelConfigs } from '@/lib/hooks/use-query-hooks';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsAIProviderFavorited, useAddAIFavorite, useRemoveAIFavorite } from '@/lib/hooks/use-workspace-ai-favorites';

interface AIProviderSelectorProps {
    selectedModelConfig?: string;
    onProviderChange: (providerId: string, isModelConfig?: boolean) => void;
    className?: string;
    disabled?: boolean;
    placeholder?: string;
    showSearch?: boolean;
    size?: 'sm' | 'md' | 'lg';
    dropdownPosition?: 'above' | 'below' | 'auto';
    workspaceId?: string; // For favorites functionality
    showFavoriteButtons?: boolean; // Whether to show star buttons
}

export function AIProviderSelector({
    selectedModelConfig,
    onProviderChange,
    className,
    disabled = false,
    placeholder = "Select AI Provider",
    showSearch = true,
    size = 'md',
    dropdownPosition = 'above',
    workspaceId,
    showFavoriteButtons = false
}: AIProviderSelectorProps) {
    const [showDropdown, setShowDropdown] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [actualDropdownPosition, setActualDropdownPosition] = useState<'above' | 'below'>('above');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Favorite management hooks
    const addAIFavoriteMutation = useAddAIFavorite();
    const removeAIFavoriteMutation = useRemoveAIFavorite();

    // Fetch model configurations using hooks
    const { data: openaiModelConfigs = [] } = useOpenAIModelConfigs();
    const { data: googleModelConfigs = [] } = useGoogleModelConfigs();
    const { data: grokModelConfigs = [] } = useGrokModelConfigs();
    const { data: anthropicModelConfigs = [] } = useAnthropicModelConfigs();

    // Get selected model config object
    const selectedModelConfigObj = useMemo(() => {
        if (selectedModelConfig) {
            // Check OpenAI configs first
            if (openaiModelConfigs.length > 0) {
                const openaiConfig = openaiModelConfigs.find(config => config.id === selectedModelConfig);
                if (openaiConfig) return openaiConfig;
            }
            // Check Google configs
            if (googleModelConfigs.length > 0) {
                const googleConfig = googleModelConfigs.find(config => config.id === selectedModelConfig);
                if (googleConfig) return googleConfig;
            }
            // Check Grok configs
            if (grokModelConfigs.length > 0) {
                const grokConfig = grokModelConfigs.find(config => config.id === selectedModelConfig);
                if (grokConfig) return grokConfig;
            }
            // Check Anthropic configs
            if (anthropicModelConfigs.length > 0) {
                const anthropicConfig = anthropicModelConfigs.find(config => config.id === selectedModelConfig);
                if (anthropicConfig) return anthropicConfig;
            }
        }
        return null;
    }, [selectedModelConfig, openaiModelConfigs, googleModelConfigs, grokModelConfigs, anthropicModelConfigs]);

    // Calculate optimal dropdown position
    const calculateDropdownPosition = (): 'above' | 'below' => {
        if (dropdownPosition !== 'auto') {
            return dropdownPosition;
        }

        if (!buttonRef.current) return 'above';

        const buttonRect = buttonRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const dropdownHeight = 240; // max-h-60 = 240px
        const margin = 16; // Extra margin for safety

        const spaceAbove = buttonRect.top;
        const spaceBelow = viewportHeight - buttonRect.bottom;

        // If there's not enough space below but enough space above, position above
        if (spaceBelow < (dropdownHeight + margin) && spaceAbove >= (dropdownHeight + margin)) {
            return 'above';
        }

        // If there's not enough space in either direction, choose the side with more space
        if (spaceBelow < (dropdownHeight + margin) && spaceAbove < (dropdownHeight + margin)) {
            return spaceAbove > spaceBelow ? 'above' : 'below';
        }

        // Default to below if there's enough space
        return 'below';
    };

    // Handle dropdown toggle with positioning calculation
    const handleDropdownToggle = () => {
        if (!showDropdown) {
            const position = calculateDropdownPosition();
            setActualDropdownPosition(position);
        }
        setShowDropdown(!showDropdown);
    };

    // Handle provider selection
    const handleProviderSelect = (providerId: string, isModelConfig = false) => {
        onProviderChange(providerId, isModelConfig);
        setShowDropdown(false);
        setSearchQuery('');
    };

    // Helper component for favorite star button
    const FavoriteStarButton = ({ aiProviderId, isModelConfig, displayName }: { aiProviderId: string; isModelConfig: boolean; displayName: string }) => {
        const { isFavorited, favorite } = useIsAIProviderFavorited(workspaceId || '', aiProviderId);

        if (!showFavoriteButtons || !workspaceId) return null;

        const handleToggleFavorite = (e: React.MouseEvent) => {
            e.stopPropagation(); // Prevent triggering provider selection

            if (isFavorited && favorite) {
                // Remove from favorites using the favorite ID
                removeAIFavoriteMutation.mutate(favorite.id);
            } else {
                // Add to favorites
                addAIFavoriteMutation.mutate({
                    workspaceId,
                    aiProviderId,
                    isModelConfig,
                    displayName
                });
            }
        };

        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-6 w-6 p-0 opacity-60 hover:opacity-100 transition-opacity",
                                isFavorited && "opacity-100"
                            )}
                            onClick={handleToggleFavorite}
                            disabled={addAIFavoriteMutation.isPending || removeAIFavoriteMutation.isPending}
                        >
                            <Star className={cn(
                                "h-3 w-3",
                                isFavorited ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                            )} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        {isFavorited ? "Remove from favorites" : "Add to favorites"}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    };

    // Filter model configs based on search
    const filteredOpenAIModelConfigs = openaiModelConfigs.filter(config =>
        (config.customName || config.modelName).toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredGoogleModelConfigs = googleModelConfigs.filter(config =>
        (config.customName || config.modelName).toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredGrokModelConfigs = grokModelConfigs.filter(config =>
        (config.customName || config.modelName).toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredAnthropicModelConfigs = anthropicModelConfigs.filter(config =>
        (config.customName || config.modelName).toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Total filtered configs for empty state check
    const totalFilteredConfigs = filteredOpenAIModelConfigs.length + filteredGoogleModelConfigs.length +
        filteredGrokModelConfigs.length + filteredAnthropicModelConfigs.length;

    // Get button size classes
    const getSizeClasses = () => {
        switch (size) {
            case 'sm':
                return 'h-8 px-2 text-xs';
            case 'lg':
                return 'h-12 px-4 text-base';
            default:
                return 'h-10 px-3 text-sm';
        }
    };

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
                setSearchQuery('');
            }
        };

        if (showDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showDropdown]);

    return (
        <div className={cn("relative", className)} ref={dropdownRef}>
            <button
                ref={buttonRef}
                type="button"
                className={cn(
                    "flex w-full items-center justify-between rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 select-none",
                    getSizeClasses()
                )}
                onClick={() => !disabled && handleDropdownToggle()}
                disabled={disabled}
            >
                {selectedModelConfigObj ? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                        <span>{selectedModelConfigObj.customName || selectedModelConfigObj.modelName}</span>
                        <div className="flex items-center gap-1">
                            {selectedModelConfigObj.capabilities?.search && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Search className="h-3 w-3" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Web Search</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                            {selectedModelConfigObj.capabilities?.reasoning && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Brain className="h-3 w-3" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Reasoning</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                            {selectedModelConfigObj.capabilities?.fileUpload && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Paperclip className="h-3 w-3" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>File Upload</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                    </span>
                ) : (
                    <span className="text-muted-foreground">{placeholder}</span>
                )}
                <ChevronDown className="h-4 w-4 opacity-50" />
            </button>

            {showDropdown && (
                <div
                    className={cn(
                        "absolute left-0 right-0 bg-popover border rounded-md shadow-lg z-50 max-h-60 overflow-hidden",
                        actualDropdownPosition === 'above'
                            ? "bottom-full mb-1"
                            : "top-full mt-1"
                    )}
                >
                    {showSearch && (
                        <div className="p-2 border-b">
                            <Input
                                placeholder="Search providers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-8"
                            />
                        </div>
                    )}
                    <div className="max-h-40 overflow-y-auto">
                        {/* OpenAI Models Section */}
                        {filteredOpenAIModelConfigs.length > 0 && (
                            <div>
                                <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
                                    OpenAI
                                </div>
                                {filteredOpenAIModelConfigs.map((config) => (
                                    <div
                                        key={config.id}
                                        className="px-3 py-2 hover:bg-accent cursor-pointer select-none"
                                        onClick={() => handleProviderSelect(config.id, true)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <div className="font-medium truncate">
                                                    {config.customName || config.modelName}
                                                </div>
                                                <FavoriteStarButton
                                                    aiProviderId={config.id}
                                                    isModelConfig={true}
                                                    displayName={config.customName || config.modelName}
                                                />
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {config.capabilities?.search && <Search className="h-3 w-3" />}
                                                {config.capabilities?.reasoning && <Brain className="h-3 w-3" />}
                                                {config.capabilities?.fileUpload && <Paperclip className="h-3 w-3" />}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Google Models Section */}
                        {filteredGoogleModelConfigs.length > 0 && (
                            <div>
                                <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
                                    Google (Gemini)
                                </div>
                                {filteredGoogleModelConfigs.map((config) => (
                                    <div
                                        key={config.id}
                                        className="px-3 py-2 hover:bg-accent cursor-pointer select-none"
                                        onClick={() => handleProviderSelect(config.id, true)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <div className="font-medium truncate">
                                                    {config.customName || config.modelName}
                                                </div>
                                                <FavoriteStarButton
                                                    aiProviderId={config.id}
                                                    isModelConfig={true}
                                                    displayName={config.customName || config.modelName}
                                                />
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {config.capabilities?.search && <Search className="h-3 w-3" />}
                                                {config.capabilities?.reasoning && <Brain className="h-3 w-3" />}
                                                {config.capabilities?.fileUpload && <Paperclip className="h-3 w-3" />}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Grok Models Section */}
                        {filteredGrokModelConfigs.length > 0 && (
                            <div>
                                <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
                                    xAI (Grok)
                                </div>
                                {filteredGrokModelConfigs.map((config) => (
                                    <div
                                        key={config.id}
                                        className="px-3 py-2 hover:bg-accent cursor-pointer select-none"
                                        onClick={() => handleProviderSelect(config.id, true)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <div className="font-medium truncate">
                                                    {config.customName || config.modelName}
                                                </div>
                                                <FavoriteStarButton
                                                    aiProviderId={config.id}
                                                    isModelConfig={true}
                                                    displayName={config.customName || config.modelName}
                                                />
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {config.capabilities?.search && <Search className="h-3 w-3" />}
                                                {config.capabilities?.reasoning && <Brain className="h-3 w-3" />}
                                                {config.capabilities?.fileUpload && <Paperclip className="h-3 w-3" />}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Claude (Anthropic) Models Section */}
                        {filteredAnthropicModelConfigs.length > 0 && (
                            <div>
                                <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
                                    Anthropic (Claude)
                                </div>
                                {filteredAnthropicModelConfigs.map((config) => (
                                    <div
                                        key={config.id}
                                        className="px-3 py-2 hover:bg-accent cursor-pointer select-none"
                                        onClick={() => handleProviderSelect(config.id, true)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <div className="font-medium truncate">
                                                    {config.customName || config.modelName}
                                                </div>
                                                <FavoriteStarButton
                                                    aiProviderId={config.id}
                                                    isModelConfig={true}
                                                    displayName={config.customName || config.modelName}
                                                />
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {config.capabilities?.search && <Search className="h-3 w-3" />}
                                                {config.capabilities?.reasoning && <Brain className="h-3 w-3" />}
                                                {config.capabilities?.fileUpload && <Paperclip className="h-3 w-3" />}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* No results message */}
                        {totalFilteredConfigs === 0 && searchQuery && (
                            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                                No providers found
                            </div>
                        )}

                        {/* No providers configured message */}
                        {openaiModelConfigs.length === 0 && googleModelConfigs.length === 0 &&
                            grokModelConfigs.length === 0 && anthropicModelConfigs.length === 0 && !searchQuery && (
                                <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                                    No AI providers configured
                                </div>
                            )}
                    </div>
                </div>
            )}
        </div>
    );
}
