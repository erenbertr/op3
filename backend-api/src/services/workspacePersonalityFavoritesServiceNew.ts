import { v4 as uuidv4 } from 'uuid';
import {
    WorkspacePersonalityFavorite,
    CreatePersonalityFavoriteRequest,
    UpdatePersonalityFavoriteRequest,
    WorkspacePersonalityFavoritesResponse,
    CreatePersonalityFavoriteResponse,
    DeletePersonalityFavoriteResponse,
    ReorderPersonalityFavoritesRequest
} from '../types/personality';
import { UniversalDatabaseService } from './universalDatabaseService';
import { WorkspacePersonalityFavoritesSchema } from '../schemas';

export class WorkspacePersonalityFavoritesServiceNew {
    private static instance: WorkspacePersonalityFavoritesServiceNew;
    private universalDb: UniversalDatabaseService;

    private constructor() {
        this.universalDb = UniversalDatabaseService.getInstance();
    }

    public static getInstance(): WorkspacePersonalityFavoritesServiceNew {
        if (!WorkspacePersonalityFavoritesServiceNew.instance) {
            WorkspacePersonalityFavoritesServiceNew.instance = new WorkspacePersonalityFavoritesServiceNew();
        }
        return WorkspacePersonalityFavoritesServiceNew.instance;
    }

    /**
     * Initialize the service by ensuring schema exists
     */
    public async initialize(): Promise<void> {
        await this.universalDb.ensureSchema(WorkspacePersonalityFavoritesSchema);
    }

    /**
     * Get all personality favorites for a workspace
     */
    public async getWorkspacePersonalityFavorites(workspaceId: string): Promise<WorkspacePersonalityFavoritesResponse> {
        try {
            const result = await this.universalDb.findMany<WorkspacePersonalityFavorite>('workspace_personality_favorites', {
                where: [
                    { field: 'workspaceId', operator: 'eq', value: workspaceId }
                ],
                orderBy: [{ field: 'sortOrder', direction: 'asc' }]
            });

            if (!result.success) {
                throw new Error('Failed to fetch personality favorites');
            }

            return {
                success: true,
                favorites: result.data
            };
        } catch (error) {
            console.error('Error getting workspace personality favorites:', error);
            return {
                success: false,
                favorites: [],
                message: error instanceof Error ? error.message : 'Failed to get personality favorites'
            };
        }
    }

    /**
     * Add a personality to workspace favorites
     */
    public async addPersonalityFavorite(request: CreatePersonalityFavoriteRequest): Promise<CreatePersonalityFavoriteResponse> {
        try {
            // Check if already favorited
            const existing = await this.universalDb.findOne<WorkspacePersonalityFavorite>('workspace_personality_favorites', {
                where: [
                    { field: 'workspaceId', operator: 'eq', value: request.workspaceId },
                    { field: 'personalityId', operator: 'eq', value: request.personalityId }
                ]
            });

            if (existing) {
                return {
                    success: false,
                    message: 'Personality is already in favorites'
                };
            }

            // Get next sort order
            const nextSortOrder = request.sortOrder ?? await this.getNextSortOrder(request.workspaceId);

            const favorite: WorkspacePersonalityFavorite = {
                id: uuidv4(),
                workspaceId: request.workspaceId,
                personalityId: request.personalityId,
                sortOrder: nextSortOrder,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await this.universalDb.insert<WorkspacePersonalityFavorite>('workspace_personality_favorites', favorite);

            if (!result.success) {
                throw new Error('Failed to add personality favorite');
            }

            return {
                success: true,
                favorite,
                message: 'Personality added to favorites successfully'
            };
        } catch (error) {
            console.error('Error adding personality favorite:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to add personality favorite'
            };
        }
    }

    /**
     * Remove a personality from workspace favorites
     */
    public async removePersonalityFavorite(favoriteId: string): Promise<DeletePersonalityFavoriteResponse> {
        try {
            const result = await this.universalDb.delete('workspace_personality_favorites', favoriteId);

            if (!result.success) {
                throw new Error('Failed to remove personality favorite');
            }

            return {
                success: true,
                message: 'Personality removed from favorites successfully'
            };
        } catch (error) {
            console.error('Error removing personality favorite:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to remove personality favorite'
            };
        }
    }

    /**
     * Reorder personality favorites
     */
    public async reorderPersonalityFavorites(request: ReorderPersonalityFavoritesRequest): Promise<{ success: boolean; message: string }> {
        try {
            // Update sort orders based on the new order
            for (let i = 0; i < request.favoriteIds.length; i++) {
                const favoriteId = request.favoriteIds[i];
                const newSortOrder = i;

                const updateResult = await this.universalDb.update<WorkspacePersonalityFavorite>(
                    'workspace_personality_favorites',
                    favoriteId,
                    {
                        sortOrder: newSortOrder,
                        updatedAt: new Date()
                    }
                );

                if (!updateResult.success) {
                    throw new Error(`Failed to update sort order for favorite ${favoriteId}`);
                }
            }

            return {
                success: true,
                message: 'Personality favorites reordered successfully'
            };
        } catch (error) {
            console.error('Error reordering personality favorites:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to reorder personality favorites'
            };
        }
    }

    /**
     * Update a personality favorite
     */
    public async updatePersonalityFavorite(favoriteId: string, request: UpdatePersonalityFavoriteRequest): Promise<CreatePersonalityFavoriteResponse> {
        try {
            const updateData: Partial<WorkspacePersonalityFavorite> = {
                updatedAt: new Date()
            };

            if (request.sortOrder !== undefined) {
                updateData.sortOrder = request.sortOrder;
            }

            const result = await this.universalDb.update<WorkspacePersonalityFavorite>(
                'workspace_personality_favorites',
                favoriteId,
                updateData
            );

            if (!result.success) {
                throw new Error('Failed to update personality favorite');
            }

            return {
                success: true,
                message: 'Personality favorite updated successfully'
            };
        } catch (error) {
            console.error('Error updating personality favorite:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to update personality favorite'
            };
        }
    }

    /**
     * Get the next sort order for a workspace
     */
    private async getNextSortOrder(workspaceId: string): Promise<number> {
        try {
            const result = await this.universalDb.findMany<WorkspacePersonalityFavorite>('workspace_personality_favorites', {
                where: [
                    { field: 'workspaceId', operator: 'eq', value: workspaceId }
                ],
                orderBy: [{ field: 'sortOrder', direction: 'desc' }],
                limit: 1
            });

            if (result.success && result.data.length > 0) {
                return result.data[0].sortOrder + 1;
            }

            return 0;
        } catch (error) {
            console.error('Error getting next sort order:', error);
            return 0;
        }
    }

    /**
     * Check if a personality is already favorited in a workspace
     */
    public async isPersonalityFavorited(workspaceId: string, personalityId: string): Promise<boolean> {
        try {
            const existing = await this.universalDb.findOne<WorkspacePersonalityFavorite>('workspace_personality_favorites', {
                where: [
                    { field: 'workspaceId', operator: 'eq', value: workspaceId },
                    { field: 'personalityId', operator: 'eq', value: personalityId }
                ]
            });

            return !!existing;
        } catch (error) {
            console.error('Error checking if personality is favorited:', error);
            return false;
        }
    }

    /**
     * Get favorite by workspace and personality ID
     */
    public async getFavoriteByPersonality(workspaceId: string, personalityId: string): Promise<WorkspacePersonalityFavorite | null> {
        try {
            const favorite = await this.universalDb.findOne<WorkspacePersonalityFavorite>('workspace_personality_favorites', {
                where: [
                    { field: 'workspaceId', operator: 'eq', value: workspaceId },
                    { field: 'personalityId', operator: 'eq', value: personalityId }
                ]
            });

            return favorite;
        } catch (error) {
            console.error('Error getting favorite by personality:', error);
            return null;
        }
    }

    /**
     * Get count of favorites for a workspace
     */
    public async getFavoritesCount(workspaceId: string): Promise<number> {
        try {
            const count = await this.universalDb.count('workspace_personality_favorites', {
                where: [
                    { field: 'workspaceId', operator: 'eq', value: workspaceId }
                ]
            });

            return count;
        } catch (error) {
            console.error('Error getting favorites count:', error);
            return 0;
        }
    }
}
