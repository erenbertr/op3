"use client"

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
// import { Separator } from '@/components/ui/separator';
import { Search, Star, Brain, Paperclip, Plus, X, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { openaiModelConfigsAPI, type OpenAIModelConfig } from '@/lib/api/openai-model-configs';
import { GoogleModelConfigsAPI, type GoogleModelConfig } from '@/lib/api/google-model-configs';
import { grokModelConfigsAPI, type GrokModelConfig } from '@/lib/api/grok-model-configs';
import { anthropicModelConfigsAPI, type AnthropicModelConfig } from '@/lib/api/anthropic-model-configs';
import { useWorkspaceAIFavorites, useAddAIFavorite, useRemoveAIFavorite, useReorderAIFavorites } from '@/lib/hooks/use-workspace-ai-favorites';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { arrayMove } from '@dnd-kit/sortable';

interface AIPersonalityFavoritesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workspaceId: string;
}

interface AIProvider {
    id: string;
    name: string;
    type: 'provider' | 'model-config';
    capabilities?: {
        search?: boolean;
        reasoning?: boolean;
        fileUpload?: boolean;
    };
    modelName?: string;
    isFavorite: boolean;
    favoriteId?: string;
}

// Sortable favorite item component
function SortableFavoriteItem({
    favorite,
    onRemove
}: {
    favorite: AIProvider;
    onRemove: (favoriteId: string) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: favorite.favoriteId! });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const getCapabilityIcons = (capabilities?: AIProvider['capabilities']) => {
        if (!capabilities) return [];

        const icons = [];
        if (capabilities.search) icons.push(<Search key="search" className="h-3 w-3" />);
        if (capabilities.reasoning) icons.push(<Brain key="reasoning" className="h-3 w-3" />);
        if (capabilities.fileUpload) icons.push(<Paperclip key="file" className="h-3 w-3" />);
        return icons;
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex items-center gap-3 p-3 border rounded-lg bg-card",
                isDragging && "shadow-lg"
            )}
        >
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            >
                <GripVertical className="h-4 w-4" />
            </div>

            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />

            <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{favorite.name}</div>
                {favorite.type === 'model-config' && favorite.modelName && (
                    <div className="text-xs text-muted-foreground truncate">
                        Model: {favorite.modelName}
                    </div>
                )}
            </div>

            {favorite.capabilities && (
                <div className="flex items-center gap-1 text-muted-foreground">
                    {getCapabilityIcons(favorite.capabilities)}
                </div>
            )}

            <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(favorite.favoriteId!)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            >
                <X className="h-4 w-4" />
            </Button>
        </div>
    );
}

export function AIPersonalityFavoritesModal({
    open,
    onOpenChange,
    workspaceId
}: AIPersonalityFavoritesModalProps) {
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch data
    const { data: favoritesData } = useWorkspaceAIFavorites(workspaceId);
    const { data: openaiModelConfigs = [] } = useQuery({
        queryKey: ['openai-model-configs'],
        queryFn: () => openaiModelConfigsAPI.getModelConfigs(),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const googleModelConfigsAPI = new GoogleModelConfigsAPI();
    const { data: googleModelConfigs = [] } = useQuery({
        queryKey: ['google-model-configs'],
        queryFn: () => googleModelConfigsAPI.getModelConfigs(),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const { data: grokModelConfigs = [] } = useQuery({
        queryKey: ['grok-model-configs'],
        queryFn: () => grokModelConfigsAPI.getModelConfigs(),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const { data: anthropicModelConfigs = [] } = useQuery({
        queryKey: ['anthropic-model-configs'],
        queryFn: () => anthropicModelConfigsAPI.getModelConfigs(),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Mutations
    const createFavoriteMutation = useAddAIFavorite();
    const removeFavoriteMutation = useRemoveAIFavorite();
    const reorderFavoritesMutation = useReorderAIFavorites();

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Process favorites data
    const favorites = favoritesData?.favorites || [];
    const favoriteIds = new Set(favorites.map(f => f.aiProviderId));

    // Create list of all available AI providers/models
    const allProviders = useMemo(() => {
        const providers: AIProvider[] = [];

        // Add OpenAI model configs
        openaiModelConfigs.forEach((config: OpenAIModelConfig) => {
            const isFavorite = favoriteIds.has(config.id);
            const favorite = favorites.find(f => f.aiProviderId === config.id);

            providers.push({
                id: config.id,
                name: config.customName || config.modelName,
                type: 'model-config',
                capabilities: config.capabilities,
                modelName: config.modelName,
                isFavorite,
                favoriteId: favorite?.id
            });
        });

        // Add Google model configs
        googleModelConfigs.forEach((config: GoogleModelConfig) => {
            const isFavorite = favoriteIds.has(config.id);
            const favorite = favorites.find(f => f.aiProviderId === config.id);

            providers.push({
                id: config.id,
                name: config.customName || config.modelName,
                type: 'model-config',
                capabilities: config.capabilities,
                modelName: config.modelName,
                isFavorite,
                favoriteId: favorite?.id
            });
        });

        // Add Grok model configs
        grokModelConfigs.forEach((config: GrokModelConfig) => {
            const isFavorite = favoriteIds.has(config.id);
            const favorite = favorites.find(f => f.aiProviderId === config.id);

            providers.push({
                id: config.id,
                name: config.customName || config.modelName,
                type: 'model-config',
                capabilities: config.capabilities,
                modelName: config.modelName,
                isFavorite,
                favoriteId: favorite?.id
            });
        });

        // Add Anthropic model configs
        anthropicModelConfigs.forEach((config: AnthropicModelConfig) => {
            const isFavorite = favoriteIds.has(config.id);
            const favorite = favorites.find(f => f.aiProviderId === config.id);

            providers.push({
                id: config.id,
                name: config.customName || config.modelName,
                type: 'model-config',
                capabilities: config.capabilities,
                modelName: config.modelName,
                isFavorite,
                favoriteId: favorite?.id
            });
        });

        return providers;
    }, [openaiModelConfigs, googleModelConfigs, grokModelConfigs, anthropicModelConfigs, favoriteIds, favorites]);

    // Filter providers based on search
    const filteredProviders = useMemo(() => {
        if (!searchQuery.trim()) return allProviders;

        const query = searchQuery.toLowerCase();
        return allProviders.filter(provider =>
            provider.name.toLowerCase().includes(query) ||
            (provider.modelName && provider.modelName.toLowerCase().includes(query))
        );
    }, [allProviders, searchQuery]);

    // Get favorited providers in order
    const favoritedProviders = useMemo(() => {
        return favorites
            .map(fav => allProviders.find(p => p.id === fav.aiProviderId))
            .filter(Boolean) as AIProvider[];
    }, [favorites, allProviders]);

    // Get non-favorited providers
    const nonFavoritedProviders = useMemo(() => {
        return filteredProviders.filter(provider => !provider.isFavorite);
    }, [filteredProviders]);

    const handleAddFavorite = async (provider: AIProvider) => {
        try {
            await createFavoriteMutation.mutateAsync({
                workspaceId,
                aiProviderId: provider.id,
                displayName: provider.name,
                isModelConfig: provider.type === 'model-config'
            });
        } catch (error) {
            console.error('Failed to add favorite:', error);
        }
    };

    const handleRemoveFavorite = async (favoriteId: string) => {
        try {
            await removeFavoriteMutation.mutateAsync(favoriteId);
        } catch (error) {
            console.error('Failed to remove favorite:', error);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        const oldIndex = favoritedProviders.findIndex(p => p.favoriteId === active.id);
        const newIndex = favoritedProviders.findIndex(p => p.favoriteId === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            const reorderedFavorites = arrayMove(favoritedProviders, oldIndex, newIndex);
            const favoriteIds = reorderedFavorites.map(p => p.favoriteId!);

            try {
                await reorderFavoritesMutation.mutateAsync({
                    workspaceId,
                    favoriteIds
                });
            } catch (error) {
                console.error('Failed to reorder favorites:', error);
            }
        }
    };

    const getCapabilityIcons = (capabilities?: AIProvider['capabilities']) => {
        if (!capabilities) return [];

        const icons = [];
        if (capabilities.search) icons.push(<Search key="search" className="h-3 w-3" />);
        if (capabilities.reasoning) icons.push(<Brain key="reasoning" className="h-3 w-3" />);
        if (capabilities.fileUpload) icons.push(<Paperclip key="file" className="h-3 w-3" />);
        return icons;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Manage AI Personality Favorites</DialogTitle>
                </DialogHeader>

                <div className="flex-1 flex gap-6 min-h-0">
                    {/* Current Favorites - Left Side */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex items-center gap-2 mb-4">
                            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                            <h3 className="font-semibold">Your Favorites ({favoritedProviders.length})</h3>
                        </div>

                        <ScrollArea className="flex-1 border rounded-lg p-4">
                            {favoritedProviders.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8">
                                    <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No favorites yet</p>
                                    <p className="text-sm">Add AI personalities from the right panel</p>
                                </div>
                            ) : (
                                <DndContext
                                    sensors={sensors}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={favoritedProviders.map(p => p.favoriteId!)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="space-y-2">
                                            {favoritedProviders.map((provider) => (
                                                <SortableFavoriteItem
                                                    key={provider.favoriteId}
                                                    favorite={provider}
                                                    onRemove={handleRemoveFavorite}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            )}
                        </ScrollArea>
                    </div>

                    <div className="w-px bg-border h-full" />

                    {/* Available Providers - Right Side */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="mb-4">
                            <h3 className="font-semibold mb-3">Available AI Personalities</h3>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search AI personalities..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <ScrollArea className="flex-1 border rounded-lg p-4">
                            {nonFavoritedProviders.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8">
                                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No AI personalities found</p>
                                    {searchQuery && (
                                        <p className="text-sm">Try adjusting your search terms</p>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {nonFavoritedProviders.map((provider) => (
                                        <div
                                            key={provider.id}
                                            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate">{provider.name}</div>
                                                {provider.type === 'model-config' && provider.modelName && (
                                                    <div className="text-xs text-muted-foreground truncate">
                                                        Model: {provider.modelName}
                                                    </div>
                                                )}
                                            </div>

                                            {provider.capabilities && (
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                    {getCapabilityIcons(provider.capabilities)}
                                                </div>
                                            )}

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleAddFavorite(provider)}
                                                disabled={createFavoriteMutation.isPending}
                                                className="h-8 w-8 p-0"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <Button onClick={() => onOpenChange(false)}>
                        Done
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
