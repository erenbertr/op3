"use client"

import React from 'react';
import { Button } from '@/components/ui/button';
import { Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspacePersonalityFavorites, useRemovePersonalityFavorite } from '@/lib/hooks/use-workspace-personality-favorites';
import { useQuery } from '@tanstack/react-query';
import { apiClient, type Personality } from '@/lib/api';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FavoritedPersonalitiesProps {
    workspaceId: string;
    userId: string;
    selectedPersonalityId?: string;
    onPersonalitySelect: (personalityId: string) => void;
    className?: string;
    disabled?: boolean;
}

export function FavoritedPersonalities({
    workspaceId,
    userId,
    selectedPersonalityId,
    onPersonalitySelect,
    className,
    disabled = false
}: FavoritedPersonalitiesProps) {
    const { data: favoritesData, isLoading } = useWorkspacePersonalityFavorites(workspaceId);
    const removePersonalityFavoriteMutation = useRemovePersonalityFavorite();

    // Get personalities data to show titles and descriptions
    const { data: personalitiesData } = useQuery({
        queryKey: ['personalities', userId],
        queryFn: () => apiClient.getPersonalities(userId),
        enabled: !!userId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const favorites = favoritesData?.favorites || [];
    const personalities = personalitiesData?.personalities || [];

    // Helper function to get personality details
    const getPersonalityDetails = (personalityId: string): Personality | null => {
        return personalities.find(p => p.id === personalityId) || null;
    };

    // Helper function to check if a personality is selected
    const isPersonalitySelected = (personalityId: string): boolean => {
        return selectedPersonalityId === personalityId;
    };

    // Handle personality selection
    const handlePersonalityClick = (personalityId: string) => {
        if (disabled) return;
        onPersonalitySelect(personalityId);
    };

    // Handle favorite removal
    const handleRemoveFavorite = (e: React.MouseEvent, favoriteId: string) => {
        e.stopPropagation(); // Prevent triggering the personality selection
        removePersonalityFavoriteMutation.mutate(favoriteId);
    };

    // Don't render if no favorites or still loading
    if (isLoading || favorites.length === 0) {
        return null;
    }

    return (
        <div className={cn("flex flex-wrap gap-2 mb-3", className)}>
            <TooltipProvider>
                {favorites.map((favorite) => {
                    const personality = getPersonalityDetails(favorite.personalityId);
                    const isSelected = isPersonalitySelected(favorite.personalityId);

                    if (!personality) {
                        // Skip if personality not found (might be deleted)
                        return null;
                    }

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
                                        onClick={() => handlePersonalityClick(favorite.personalityId)}
                                        disabled={disabled}
                                    >
                                        {/* Star icon to indicate it's a favorite */}
                                        <Star className={cn(
                                            "h-3 w-3 flex-shrink-0",
                                            isSelected ? "fill-current" : "fill-yellow-400 text-yellow-400"
                                        )} />

                                        {/* Personality title */}
                                        <span className="truncate">
                                            {personality.title}
                                        </span>
                                    </Button>

                                    {/* Remove button - only show on hover */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                            "absolute -top-1 -right-1 h-5 w-5 p-0 rounded-full",
                                            "bg-destructive text-white",
                                            "opacity-0 group-hover:opacity-100 transition-opacity",
                                            "hover:bg-destructive/90",
                                            disabled && "hidden"
                                        )}
                                        onClick={(e) => handleRemoveFavorite(e, favorite.id)}
                                        disabled={disabled || removePersonalityFavoriteMutation.isPending}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs">
                                <div className="space-y-1">
                                    <div className="font-medium">{personality.title}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {personality.prompt ?
                                            (personality.prompt.length > 150 ?
                                                personality.prompt.substring(0, 150) + '...' :
                                                personality.prompt
                                            ) :
                                            'No description'
                                        }
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
