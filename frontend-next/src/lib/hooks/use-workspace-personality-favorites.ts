"use client"

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { queryKeys } from '@/lib/query-client';
import type {
    CreatePersonalityFavoriteRequest,
    UpdatePersonalityFavoriteRequest,
    WorkspacePersonalityFavoritesResponse
} from '@/lib/api';

// Query hooks
export function useWorkspacePersonalityFavorites(workspaceId: string) {
    return useQuery({
        queryKey: queryKeys.workspacePersonalityFavorites.byWorkspace(workspaceId),
        queryFn: () => apiClient.getWorkspacePersonalityFavorites(workspaceId),
        enabled: !!workspaceId,
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 10, // 10 minutes
    });
}

export function useCheckPersonalityFavoriteStatus(workspaceId: string, personalityId: string) {
    return useQuery({
        queryKey: queryKeys.workspacePersonalityFavorites.check(workspaceId, personalityId),
        queryFn: () => apiClient.checkPersonalityFavoriteStatus(workspaceId, personalityId),
        enabled: !!workspaceId && !!personalityId,
        staleTime: 1000 * 60 * 2, // 2 minutes
        gcTime: 1000 * 60 * 5, // 5 minutes
    });
}

// Mutation hooks
export function useAddPersonalityFavorite() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (request: CreatePersonalityFavoriteRequest) => apiClient.addPersonalityFavorite(request),
        onSuccess: (data, variables) => {
            // Invalidate and refetch workspace personality favorites
            queryClient.invalidateQueries({
                queryKey: queryKeys.workspacePersonalityFavorites.byWorkspace(variables.workspaceId)
            });

            // Update the check query cache
            queryClient.setQueryData(
                queryKeys.workspacePersonalityFavorites.check(variables.workspaceId, variables.personalityId),
                {
                    success: true,
                    isFavorited: true,
                    favorite: data.favorite
                }
            );
        },
        onError: (error) => {
            console.error('Error adding personality favorite:', error);
        },
    });
}

export function useUpdatePersonalityFavorite() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ favoriteId, request }: { favoriteId: string; request: UpdatePersonalityFavoriteRequest }) => {
            // For now, we only support reordering through the reorder endpoint
            throw new Error('Use reorder endpoint to update personality favorites');
        },
        onSuccess: () => {
            // Find the workspace ID from the current favorites data
            const allQueries = queryClient.getQueriesData({
                queryKey: ['workspace-personality-favorites', 'workspace']
            });

            for (const [queryKey] of allQueries) {
                const workspaceId = (queryKey as string[])[2];
                queryClient.invalidateQueries({
                    queryKey: queryKeys.workspacePersonalityFavorites.byWorkspace(workspaceId)
                });
            }
        },
        onError: (error) => {
            console.error('Error updating personality favorite:', error);
        },
    });
}

export function useRemovePersonalityFavorite() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (favoriteId: string) => apiClient.removePersonalityFavorite(favoriteId),
        onSuccess: (_, favoriteId) => {
            // Find the workspace ID and personality ID from the current favorites data
            const allQueries = queryClient.getQueriesData({
                queryKey: ['workspace-personality-favorites', 'workspace']
            });

            for (const [queryKey, queryData] of allQueries) {
                const workspaceId = (queryKey as string[])[2];
                const favoritesData = queryData as WorkspacePersonalityFavoritesResponse | undefined;
                const removedFavorite = favoritesData?.favorites.find(f => f.id === favoriteId);

                if (removedFavorite) {
                    // Invalidate workspace favorites
                    queryClient.invalidateQueries({
                        queryKey: queryKeys.workspacePersonalityFavorites.byWorkspace(workspaceId)
                    });

                    // Update the check query cache
                    queryClient.setQueryData(
                        queryKeys.workspacePersonalityFavorites.check(workspaceId, removedFavorite.personalityId),
                        {
                            success: true,
                            isFavorited: false,
                            favorite: null
                        }
                    );
                    break;
                }
            }
        },
        onError: (error) => {
            console.error('Error removing personality favorite:', error);
        },
    });
}

export function useReorderPersonalityFavorites() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ workspaceId, favoriteIds }: { workspaceId: string; favoriteIds: string[] }) =>
            apiClient.reorderPersonalityFavorites(workspaceId, favoriteIds),
        onSuccess: (data, variables) => {
            // Invalidate and refetch workspace personality favorites
            queryClient.invalidateQueries({
                queryKey: queryKeys.workspacePersonalityFavorites.byWorkspace(variables.workspaceId)
            });
        },
        onError: (error) => {
            console.error('Error reordering personality favorites:', error);
        },
    });
}

// Helper hook to get a specific favorite by personality ID
export function usePersonalityFavoriteByPersonalityId(workspaceId: string, personalityId: string) {
    const { data: favoritesData } = useWorkspacePersonalityFavorites(workspaceId);

    const favorite = favoritesData?.favorites.find(f => f.personalityId === personalityId);
    const isFavorited = !!favorite;

    return {
        favorite,
        isFavorited,
        isLoading: !favoritesData,
    };
}

// Helper hook to check if any personalities are favorited
export function useHasPersonalityFavorites(workspaceId: string) {
    const { data: favoritesData, isLoading } = useWorkspacePersonalityFavorites(workspaceId);

    return {
        hasFavorites: (favoritesData?.favorites.length ?? 0) > 0,
        favoritesCount: favoritesData?.favorites.length ?? 0,
        isLoading,
    };
}
