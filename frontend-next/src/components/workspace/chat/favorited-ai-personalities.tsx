"use client"

import React from 'react';
import { Button } from '@/components/ui/button';

import { Star, Search, Brain, Paperclip, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspaceAIFavorites, useRemoveAIFavorite } from '@/lib/hooks/use-workspace-ai-favorites';
import { useQuery } from '@tanstack/react-query';
import { openaiModelConfigsAPI, type OpenAIModelConfig } from '@/lib/api/openai-model-configs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FavoritedAIPersonalitiesProps {
    workspaceId: string;
    selectedProvider?: string;
    selectedModelConfig?: string;
    onProviderChange: (providerId: string, isModelConfig?: boolean) => void;
    className?: string;
    disabled?: boolean;
}

export function FavoritedAIPersonalities({
    workspaceId,
    selectedProvider,
    selectedModelConfig,
    onProviderChange,
    className,
    disabled = false
}: FavoritedAIPersonalitiesProps) {
    const { data: favoritesData, isLoading } = useWorkspaceAIFavorites(workspaceId);
    const removeAIFavoriteMutation = useRemoveAIFavorite();

    // Get OpenAI model configs for display names and capabilities
    const { data: openaiModelConfigs = [] } = useQuery({
        queryKey: ['openai-model-configs'],
        queryFn: () => openaiModelConfigsAPI.getModelConfigs(),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const favorites = favoritesData?.favorites || [];

    // Helper function to get model config details
    const getModelConfigDetails = (modelConfigId: string): OpenAIModelConfig | null => {
        return openaiModelConfigs.find(config => config.id === modelConfigId) || null;
    };

    // Helper function to check if a favorite is currently selected
    const isFavoriteSelected = (favorite: { isModelConfig: boolean; aiProviderId: string }) => {
        if (favorite.isModelConfig) {
            return selectedModelConfig === favorite.aiProviderId;
        } else {
            return selectedProvider === favorite.aiProviderId;
        }
    };

    // Helper function to get capability icons
    const getCapabilityIcons = (modelConfig: OpenAIModelConfig | null) => {
        if (!modelConfig?.capabilities) return [];

        const icons = [];
        if (modelConfig.capabilities.search) icons.push(<Search key="search" className="h-3 w-3" />);
        if (modelConfig.capabilities.reasoning) icons.push(<Brain key="reasoning" className="h-3 w-3" />);
        if (modelConfig.capabilities.fileUpload) icons.push(<Paperclip key="file" className="h-3 w-3" />);

        return icons;
    };

    // Handle favorite selection
    const handleFavoriteClick = (favorite: { isModelConfig: boolean; aiProviderId: string }) => {
        if (disabled) return;
        onProviderChange(favorite.aiProviderId, favorite.isModelConfig);
    };

    // Handle favorite removal
    const handleRemoveFavorite = (e: React.MouseEvent, favoriteId: string) => {
        e.stopPropagation(); // Prevent triggering the favorite selection
        removeAIFavoriteMutation.mutate(favoriteId);
    };

    // Don't render if no favorites or still loading
    if (isLoading || favorites.length === 0) {
        return null;
    }

    return (
        <div className={cn("flex flex-wrap gap-2 mb-3", className)}>
            <TooltipProvider>
                {favorites.map((favorite) => {
                    const isSelected = isFavoriteSelected(favorite);
                    const modelConfig = favorite.isModelConfig ? getModelConfigDetails(favorite.aiProviderId) : null;
                    const capabilityIcons = getCapabilityIcons(modelConfig);

                    return (
                        <Tooltip key={favorite.id}>
                            <TooltipTrigger asChild>
                                <div className="relative group">
                                    <Button
                                        variant={isSelected ? "default" : "outline"}
                                        size="sm"
                                        className={cn(
                                            "h-8 px-3 py-1 text-xs font-medium transition-all duration-200",
                                            "flex items-center gap-1.5 max-w-[200px]",
                                            isSelected && "bg-primary text-primary-foreground",
                                            !isSelected && "hover:bg-accent hover:text-accent-foreground",
                                            disabled && "opacity-50 cursor-not-allowed"
                                        )}
                                        onClick={() => handleFavoriteClick(favorite)}
                                        disabled={disabled}
                                    >
                                        {/* Star icon to indicate it's a favorite */}
                                        <Star className={cn(
                                            "h-3 w-3 flex-shrink-0",
                                            isSelected ? "fill-current" : "fill-yellow-400 text-yellow-400"
                                        )} />

                                        {/* Display name */}
                                        <span className="truncate">
                                            {favorite.displayName}
                                        </span>

                                        {/* Capability icons */}
                                        {capabilityIcons.length > 0 && (
                                            <div className="flex items-center gap-0.5 ml-1">
                                                {capabilityIcons}
                                            </div>
                                        )}
                                    </Button>

                                    {/* Remove button - only visible on hover */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                            "absolute -top-1 -right-1 h-5 w-5 p-0 rounded-full",
                                            "bg-destructive text-destructive-foreground",
                                            "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                                            "hover:bg-destructive/90",
                                            disabled && "hidden"
                                        )}
                                        onClick={(e) => handleRemoveFavorite(e, favorite.id)}
                                        disabled={disabled || removeAIFavoriteMutation.isPending}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[300px]">
                                <div className="space-y-1">
                                    <div className="font-medium">{favorite.displayName}</div>
                                    {favorite.isModelConfig && modelConfig && (
                                        <>
                                            <div className="text-xs text-muted-foreground">
                                                Model: {modelConfig.modelName}
                                            </div>
                                            {modelConfig.capabilities && (
                                                <div className="text-xs text-muted-foreground">
                                                    Capabilities: {[
                                                        modelConfig.capabilities.search && 'Search',
                                                        modelConfig.capabilities.reasoning && 'Reasoning',
                                                        modelConfig.capabilities.fileUpload && 'File Upload'
                                                    ].filter(Boolean).join(', ')}
                                                </div>
                                            )}
                                        </>
                                    )}
                                    <div className="text-xs text-muted-foreground">
                                        Click to select • Hover to remove
                                    </div>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </TooltipProvider>
        </div>
    );
}
