"use client"

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Star, Search, Plus, GripVertical, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { apiClient, type Personality } from '@/lib/api';
import { useWorkspacePersonalityFavorites, useAddPersonalityFavorite, useRemovePersonalityFavorite, useReorderPersonalityFavorites } from '@/lib/hooks/use-workspace-personality-favorites';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { arrayMove } from '@dnd-kit/sortable';

interface PersonalityFavoritesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workspaceId: string;
    userId: string;
}

interface SortableFavoriteItemProps {
    favorite: {
        id: string;
        workspaceId: string;
        personalityId: string;
        sortOrder: number;
        createdAt: Date;
        updatedAt: Date;
    };
    personality: Personality | undefined;
    onRemove: (favoriteId: string) => void;
}

function SortableFavoriteItem({ favorite, personality, onRemove }: SortableFavoriteItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: favorite.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex items-center gap-3 p-3 bg-card border rounded-lg",
                isDragging && "opacity-50"
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
                <div className="font-medium truncate">
                    {personality?.title || 'Unknown Personality'}
                </div>
                <div className="text-sm text-muted-foreground line-clamp-2">
                    {personality?.prompt ? personality.prompt.substring(0, 100) + '...' : 'No description'}
                </div>
            </div>

            <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(favorite.id)}
                className="text-muted-foreground hover:text-destructive"
            >
                <X className="h-4 w-4" />
            </Button>
        </div>
    );
}

export function PersonalityFavoritesModal({
    open,
    onOpenChange,
    workspaceId,
    userId
}: PersonalityFavoritesModalProps) {
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch data
    const { data: favoritesData } = useWorkspacePersonalityFavorites(workspaceId);
    const { data: personalitiesData } = useQuery({
        queryKey: ['personalities', userId],
        queryFn: () => apiClient.getPersonalities(userId),
        enabled: !!userId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Mutations
    const createFavoriteMutation = useAddPersonalityFavorite();
    const removeFavoriteMutation = useRemovePersonalityFavorite();
    const reorderFavoritesMutation = useReorderPersonalityFavorites();

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const favorites = useMemo(() => favoritesData?.favorites || [], [favoritesData?.favorites]);
    const personalities = useMemo(() => personalitiesData?.personalities || [], [personalitiesData?.personalities]);

    // Get personalities that are not favorited
    const availablePersonalities = useMemo(() => {
        const favoritedPersonalityIds = new Set(favorites.map(f => f.personalityId));
        return personalities.filter(p => !favoritedPersonalityIds.has(p.id));
    }, [personalities, favorites]);

    // Filter available personalities by search query
    const filteredAvailablePersonalities = useMemo(() => {
        if (!searchQuery.trim()) return availablePersonalities;

        const query = searchQuery.toLowerCase();
        return availablePersonalities.filter(personality =>
            personality.title.toLowerCase().includes(query) ||
            personality.prompt.toLowerCase().includes(query)
        );
    }, [availablePersonalities, searchQuery]);

    // Get personality details for favorites
    const getFavoritePersonality = (personalityId: string) => {
        return personalities.find(p => p.id === personalityId);
    };

    const handleAddFavorite = async (personality: Personality) => {
        try {
            await createFavoriteMutation.mutateAsync({
                workspaceId,
                personalityId: personality.id,
                sortOrder: favorites.length
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

        if (over && active.id !== over.id) {
            const oldIndex = favorites.findIndex(f => f.id === active.id);
            const newIndex = favorites.findIndex(f => f.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newOrder = arrayMove(favorites, oldIndex, newIndex);
                const favoriteIds = newOrder.map(f => f.id);

                try {
                    await reorderFavoritesMutation.mutateAsync({
                        workspaceId,
                        favoriteIds
                    });
                } catch (error) {
                    console.error('Failed to reorder favorites:', error);
                }
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Manage AI Personality Favorites</DialogTitle>
                </DialogHeader>

                <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
                    {/* Your Favorites */}
                    <div className="flex flex-col min-h-0">
                        <div className="flex items-center gap-2 mb-4">
                            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                            <h3 className="font-semibold">Your Favorites ({favorites.length})</h3>
                        </div>

                        <ScrollArea className="flex-1 pr-4">
                            {favorites.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <Star className="h-12 w-12 text-muted-foreground/50 mb-3" />
                                    <p className="text-muted-foreground mb-2">No favorites yet</p>
                                    <p className="text-sm text-muted-foreground">
                                        Add AI personalities from the right panel
                                    </p>
                                </div>
                            ) : (
                                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                                    <SortableContext items={favorites.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                        <div className="space-y-3">
                                            {favorites.map((favorite) => (
                                                <SortableFavoriteItem
                                                    key={favorite.id}
                                                    favorite={favorite}
                                                    personality={getFavoritePersonality(favorite.personalityId)}
                                                    onRemove={handleRemoveFavorite}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            )}
                        </ScrollArea>
                    </div>

                    {/* Available Personalities */}
                    <div className="flex flex-col min-h-0">
                        <h3 className="font-semibold mb-4">Available AI Personalities</h3>

                        {/* Search */}
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search AI personalities..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <ScrollArea className="flex-1 pr-4">
                            {filteredAvailablePersonalities.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    {searchQuery ? (
                                        <>
                                            <Search className="h-12 w-12 text-muted-foreground/50 mb-3" />
                                            <p className="text-muted-foreground">No personalities found</p>
                                            <p className="text-sm text-muted-foreground">
                                                Try adjusting your search terms
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <Star className="h-12 w-12 text-muted-foreground/50 mb-3" />
                                            <p className="text-muted-foreground">All personalities favorited</p>
                                            <p className="text-sm text-muted-foreground">
                                                Create new personalities to add more favorites
                                            </p>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredAvailablePersonalities.map((personality) => (
                                        <div
                                            key={personality.id}
                                            className="flex items-center gap-3 p-3 bg-card border rounded-lg hover:bg-accent/50 transition-colors"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate">
                                                    {personality.title}
                                                </div>
                                                <div className="text-sm text-muted-foreground line-clamp-2">
                                                    {personality.prompt ? personality.prompt.substring(0, 100) + '...' : 'No description'}
                                                </div>
                                            </div>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleAddFavorite(personality)}
                                                disabled={createFavoriteMutation.isPending}
                                                className="text-muted-foreground hover:text-yellow-600"
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

                <div className="flex justify-end pt-4 border-t">
                    <Button onClick={() => onOpenChange(false)}>
                        Done
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
