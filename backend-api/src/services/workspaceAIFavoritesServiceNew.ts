import { v4 as uuidv4 } from 'uuid';
import {
    WorkspaceAIFavorite,
    CreateAIFavoriteRequest,
    UpdateAIFavoriteRequest,
    WorkspaceAIFavoritesResponse,
    CreateAIFavoriteResponse,
    DeleteAIFavoriteResponse
} from '../types/ai-provider';
import { UniversalDatabaseService } from './universalDatabaseService';
import { WorkspaceAIFavoritesSchema } from '../schemas';

export class WorkspaceAIFavoritesServiceNew {
    private static instance: WorkspaceAIFavoritesServiceNew;
    private universalDb: UniversalDatabaseService;

    private constructor() {
        this.universalDb = UniversalDatabaseService.getInstance();
    }

    public static getInstance(): WorkspaceAIFavoritesServiceNew {
        if (!WorkspaceAIFavoritesServiceNew.instance) {
            WorkspaceAIFavoritesServiceNew.instance = new WorkspaceAIFavoritesServiceNew();
        }
        return WorkspaceAIFavoritesServiceNew.instance;
    }

    /**
     * Initialize the service by ensuring schema exists
     */
    public async initialize(): Promise<void> {
        await this.universalDb.ensureSchema(WorkspaceAIFavoritesSchema);
    }

    /**
     * Get all AI favorites for a workspace
     */
    public async getWorkspaceAIFavorites(workspaceId: string): Promise<WorkspaceAIFavoritesResponse> {
        try {
            const result = await this.universalDb.findMany<WorkspaceAIFavorite>('workspace_ai_favorites', {
                where: [
                    { field: 'workspaceId', operator: 'eq', value: workspaceId }
                ],
                orderBy: [{ field: 'sortOrder', direction: 'asc' }]
            });

            if (!result.success) {
                throw new Error('Failed to fetch AI favorites');
            }

            return {
                success: true,
                favorites: result.data
            };
        } catch (error) {
            console.error('Error getting workspace AI favorites:', error);
            return {
                success: false,
                favorites: [],
                message: error instanceof Error ? error.message : 'Failed to get AI favorites'
            };
        }
    }

    /**
     * Add an AI provider to workspace favorites
     */
    public async addAIFavorite(request: CreateAIFavoriteRequest): Promise<CreateAIFavoriteResponse> {
        try {
            // Check if already favorited
            const existing = await this.universalDb.findOne<WorkspaceAIFavorite>('workspace_ai_favorites', {
                where: [
                    { field: 'workspaceId', operator: 'eq', value: request.workspaceId },
                    { field: 'aiProviderId', operator: 'eq', value: request.aiProviderId }
                ]
            });

            if (existing) {
                return {
                    success: false,
                    message: 'AI provider is already in favorites'
                };
            }

            // Get next sort order
            const nextSortOrder = await this.getNextSortOrder(request.workspaceId);

            const favorite: WorkspaceAIFavorite = {
                id: uuidv4(),
                workspaceId: request.workspaceId,
                aiProviderId: request.aiProviderId,
                isModelConfig: request.isModelConfig,
                displayName: request.displayName,
                sortOrder: nextSortOrder,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await this.universalDb.insert<WorkspaceAIFavorite>('workspace_ai_favorites', favorite);

            if (!result.success) {
                throw new Error('Failed to add AI favorite');
            }

            return {
                success: true,
                favorite,
                message: 'AI provider added to favorites successfully'
            };
        } catch (error) {
            console.error('Error adding AI favorite:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to add AI favorite'
            };
        }
    }

    /**
     * Remove an AI provider from workspace favorites
     */
    public async removeAIFavorite(favoriteId: string): Promise<DeleteAIFavoriteResponse> {
        try {
            const result = await this.universalDb.delete('workspace_ai_favorites', favoriteId);

            if (!result.success) {
                throw new Error('Failed to remove AI favorite');
            }

            return {
                success: true,
                message: 'AI provider removed from favorites successfully'
            };
        } catch (error) {
            console.error('Error removing AI favorite:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to remove AI favorite'
            };
        }
    }

    /**
     * Update AI favorite (display name or sort order)
     */
    public async updateAIFavorite(favoriteId: string, request: UpdateAIFavoriteRequest): Promise<CreateAIFavoriteResponse> {
        try {
            const updateData: Partial<WorkspaceAIFavorite> = {
                updatedAt: new Date()
            };

            if (request.displayName !== undefined) {
                updateData.displayName = request.displayName;
            }
            if (request.sortOrder !== undefined) {
                updateData.sortOrder = request.sortOrder;
            }

            const result = await this.universalDb.update<WorkspaceAIFavorite>(
                'workspace_ai_favorites',
                favoriteId,
                updateData
            );

            if (!result.success) {
                throw new Error('Failed to update AI favorite');
            }

            return {
                success: true,
                message: 'AI favorite updated successfully'
            };
        } catch (error) {
            console.error('Error updating AI favorite:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to update AI favorite'
            };
        }
    }

    /**
     * Reorder AI favorites for a workspace
     */
    public async reorderAIFavorites(workspaceId: string, favoriteIds: string[]): Promise<DeleteAIFavoriteResponse> {
        try {
            // Update sort order for each favorite
            for (let i = 0; i < favoriteIds.length; i++) {
                const favoriteId = favoriteIds[i];
                const sortOrder = i + 1;

                await this.updateAIFavorite(favoriteId, { sortOrder });
            }

            return {
                success: true,
                message: 'AI favorites reordered successfully'
            };
        } catch (error) {
            console.error('Error reordering AI favorites:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to reorder AI favorites'
            };
        }
    }

    /**
     * Get the next sort order for a workspace
     */
    private async getNextSortOrder(workspaceId: string): Promise<number> {
        try {
            const result = await this.universalDb.findMany<WorkspaceAIFavorite>('workspace_ai_favorites', {
                where: [
                    { field: 'workspaceId', operator: 'eq', value: workspaceId }
                ],
                orderBy: [{ field: 'sortOrder', direction: 'desc' }],
                limit: 1
            });

            if (result.success && result.data.length > 0) {
                return result.data[0].sortOrder + 1;
            }

            return 1;
        } catch (error) {
            console.error('Error getting next sort order:', error);
            return 1;
        }
    }

    /**
     * Check if an AI provider is already favorited in a workspace
     */
    public async isAIProviderFavorited(workspaceId: string, aiProviderId: string): Promise<boolean> {
        try {
            const existing = await this.universalDb.findOne<WorkspaceAIFavorite>('workspace_ai_favorites', {
                where: [
                    { field: 'workspaceId', operator: 'eq', value: workspaceId },
                    { field: 'aiProviderId', operator: 'eq', value: aiProviderId }
                ]
            });

            return !!existing;
        } catch (error) {
            console.error('Error checking if AI provider is favorited:', error);
            return false;
        }
    }

    /**
     * Get favorite by workspace and AI provider ID
     */
    public async getFavoriteByProvider(workspaceId: string, aiProviderId: string): Promise<WorkspaceAIFavorite | null> {
        try {
            const favorite = await this.universalDb.findOne<WorkspaceAIFavorite>('workspace_ai_favorites', {
                where: [
                    { field: 'workspaceId', operator: 'eq', value: workspaceId },
                    { field: 'aiProviderId', operator: 'eq', value: aiProviderId }
                ]
            });

            return favorite;
        } catch (error) {
            console.error('Error getting favorite by provider:', error);
            return null;
        }
    }

    /**
     * Get count of favorites for a workspace
     */
    public async getFavoritesCount(workspaceId: string): Promise<number> {
        try {
            const count = await this.universalDb.count('workspace_ai_favorites', {
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
