"use client"

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { queryKeys } from '@/lib/query-client';
import type {
    CreateAIFavoriteRequest,
    UpdateAIFavoriteRequest,
    WorkspaceAIFavoritesResponse
} from '@/lib/api';

// Query hooks
export function useWorkspaceAIFavorites(workspaceId: string) {
    return useQuery({
        queryKey: queryKeys.workspaceAIFavorites.byWorkspace(workspaceId),
        queryFn: () => apiClient.getWorkspaceAIFavorites(workspaceId),
        enabled: !!workspaceId,
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 10, // 10 minutes
    });
}

export function useCheckAIFavoriteStatus(workspaceId: string, aiProviderId: string) {
    return useQuery({
        queryKey: queryKeys.workspaceAIFavorites.check(workspaceId, aiProviderId),
        queryFn: () => apiClient.checkAIFavoriteStatus(workspaceId, aiProviderId),
        enabled: !!workspaceId && !!aiProviderId,
        staleTime: 1000 * 60 * 2, // 2 minutes
        gcTime: 1000 * 60 * 5, // 5 minutes
    });
}

// Mutation hooks
export function useAddAIFavorite() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (request: CreateAIFavoriteRequest) => apiClient.addAIFavorite(request),
        onSuccess: (data, variables) => {
            // Invalidate and refetch favorites for the workspace
            queryClient.invalidateQueries({
                queryKey: queryKeys.workspaceAIFavorites.byWorkspace(variables.workspaceId)
            });

            // Invalidate check queries for this AI provider
            queryClient.invalidateQueries({
                queryKey: queryKeys.workspaceAIFavorites.check(variables.workspaceId, variables.aiProviderId)
            });

            // Optimistically update the favorites list
            if (data.success && data.favorite) {
                queryClient.setQueryData(
                    queryKeys.workspaceAIFavorites.byWorkspace(variables.workspaceId),
                    (oldData: WorkspaceAIFavoritesResponse | undefined) => {
                        if (!oldData) return oldData;
                        return {
                            ...oldData,
                            favorites: [...oldData.favorites, data.favorite!].sort((a, b) => a.sortOrder - b.sortOrder)
                        };
                    }
                );
            }
        },
        onError: (error) => {
            console.error('Error adding AI favorite:', error);
        },
    });
}

export function useUpdateAIFavorite() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ favoriteId, request }: { favoriteId: string; request: UpdateAIFavoriteRequest }) =>
            apiClient.updateAIFavorite(favoriteId, request),
        onSuccess: (data, variables) => {
            // Find the workspace ID from the current favorites data
            const allQueries = queryClient.getQueriesData({
                queryKey: ['workspace-ai-favorites', 'workspace']
            });

            for (const [queryKey, queryData] of allQueries) {
                const workspaceId = (queryKey as string[])[2];
                const favoritesData = queryData as WorkspaceAIFavoritesResponse | undefined;

                if (favoritesData?.favorites.some(f => f.id === variables.favoriteId)) {
                    // Invalidate this workspace's favorites
                    queryClient.invalidateQueries({
                        queryKey: queryKeys.workspaceAIFavorites.byWorkspace(workspaceId)
                    });
                    break;
                }
            }
        },
        onError: (error) => {
            console.error('Error updating AI favorite:', error);
        },
    });
}

export function useRemoveAIFavorite() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (favoriteId: string) => apiClient.removeAIFavorite(favoriteId),
        onSuccess: (data, favoriteId) => {
            // Find the workspace ID and AI provider ID from the current favorites data
            const allQueries = queryClient.getQueriesData({
                queryKey: ['workspace-ai-favorites', 'workspace']
            });

            for (const [queryKey, queryData] of allQueries) {
                const workspaceId = (queryKey as string[])[2];
                const favoritesData = queryData as WorkspaceAIFavoritesResponse | undefined;
                const removedFavorite = favoritesData?.favorites.find(f => f.id === favoriteId);

                if (removedFavorite) {
                    // Invalidate this workspace's favorites
                    queryClient.invalidateQueries({
                        queryKey: queryKeys.workspaceAIFavorites.byWorkspace(workspaceId)
                    });

                    // Invalidate check queries for this AI provider
                    queryClient.invalidateQueries({
                        queryKey: queryKeys.workspaceAIFavorites.check(workspaceId, removedFavorite.aiProviderId)
                    });

                    // Optimistically update the favorites list
                    queryClient.setQueryData(
                        queryKeys.workspaceAIFavorites.byWorkspace(workspaceId),
                        (oldData: WorkspaceAIFavoritesResponse | undefined) => {
                            if (!oldData) return oldData;
                            return {
                                ...oldData,
                                favorites: oldData.favorites.filter(f => f.id !== favoriteId)
                            };
                        }
                    );
                    break;
                }
            }
        },
        onError: (error) => {
            console.error('Error removing AI favorite:', error);
        },
    });
}

export function useReorderAIFavorites() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ workspaceId, favoriteIds }: { workspaceId: string; favoriteIds: string[] }) =>
            apiClient.reorderAIFavorites(workspaceId, favoriteIds),
        onSuccess: (data, variables) => {
            // Invalidate and refetch favorites for the workspace
            queryClient.invalidateQueries({
                queryKey: queryKeys.workspaceAIFavorites.byWorkspace(variables.workspaceId)
            });
        },
        onError: (error) => {
            console.error('Error reordering AI favorites:', error);
        },
    });
}

// Helper hook to get a specific favorite by AI provider ID
export function useAIFavoriteByProviderId(workspaceId: string, aiProviderId: string) {
    const { data: favoritesData } = useWorkspaceAIFavorites(workspaceId);

    const favorite = favoritesData?.favorites.find(f => f.aiProviderId === aiProviderId);
    const isFavorited = !!favorite;

    return {
        favorite,
        isFavorited,
        isLoading: !favoritesData,
    };
}

// Helper hook to check if an AI provider is favorited (boolean only)
export function useIsAIProviderFavorited(workspaceId: string, aiProviderId: string) {
    const { isFavorited, favorite, isLoading } = useAIFavoriteByProviderId(workspaceId, aiProviderId);
    return { isFavorited, favorite, isLoading };
}
