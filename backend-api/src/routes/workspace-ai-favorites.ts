import { Router, Request, Response } from 'express';
import { WorkspaceAIFavoritesServiceNew } from '../services/workspaceAIFavoritesServiceNew';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import {
    CreateAIFavoriteRequest,
    UpdateAIFavoriteRequest
} from '../types/ai-provider';

const router = Router();
const workspaceAIFavoritesService = WorkspaceAIFavoritesServiceNew.getInstance();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all AI favorites for a workspace
router.get('/:workspaceId', asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId } = req.params;

    if (!workspaceId) {
        throw createError('Workspace ID is required', 400);
    }

    const result = await workspaceAIFavoritesService.getWorkspaceAIFavorites(workspaceId);
    res.json(result);
}));

// Add an AI provider to workspace favorites
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const request: CreateAIFavoriteRequest = req.body;

    if (!request.workspaceId) {
        throw createError('Workspace ID is required', 400);
    }

    if (!request.aiProviderId) {
        throw createError('AI Provider ID is required', 400);
    }

    if (!request.displayName || request.displayName.trim() === '') {
        throw createError('Display name is required', 400);
    }

    if (typeof request.isModelConfig !== 'boolean') {
        throw createError('isModelConfig must be a boolean', 400);
    }

    const result = await workspaceAIFavoritesService.addAIFavorite({
        workspaceId: request.workspaceId,
        aiProviderId: request.aiProviderId,
        isModelConfig: request.isModelConfig,
        displayName: request.displayName.trim()
    });

    if (!result.success) {
        throw createError(result.message, 400);
    }

    res.json(result);
}));

// Update an AI favorite (display name or sort order)
router.put('/:favoriteId', asyncHandler(async (req: Request, res: Response) => {
    const { favoriteId } = req.params;
    const request: UpdateAIFavoriteRequest = req.body;

    if (!favoriteId) {
        throw createError('Favorite ID is required', 400);
    }

    // Validate that at least one field is being updated
    if (request.displayName === undefined && request.sortOrder === undefined) {
        throw createError('At least one field (displayName or sortOrder) must be provided', 400);
    }

    // Validate displayName if provided
    if (request.displayName !== undefined && request.displayName.trim() === '') {
        throw createError('Display name cannot be empty', 400);
    }

    // Validate sortOrder if provided
    if (request.sortOrder !== undefined && (typeof request.sortOrder !== 'number' || request.sortOrder < 1)) {
        throw createError('Sort order must be a positive number', 400);
    }

    const updateData: UpdateAIFavoriteRequest = {};
    if (request.displayName !== undefined) {
        updateData.displayName = request.displayName.trim();
    }
    if (request.sortOrder !== undefined) {
        updateData.sortOrder = request.sortOrder;
    }

    const result = await workspaceAIFavoritesService.updateAIFavorite(favoriteId, updateData);

    if (!result.success) {
        throw createError(result.message, 400);
    }

    res.json(result);
}));

// Remove an AI provider from workspace favorites
router.delete('/:favoriteId', asyncHandler(async (req: Request, res: Response) => {
    const { favoriteId } = req.params;

    if (!favoriteId) {
        throw createError('Favorite ID is required', 400);
    }

    const result = await workspaceAIFavoritesService.removeAIFavorite(favoriteId);

    if (!result.success) {
        throw createError(result.message, 400);
    }

    res.json(result);
}));

// Reorder AI favorites for a workspace
router.post('/:workspaceId/reorder', asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId } = req.params;
    const { favoriteIds }: { favoriteIds: string[] } = req.body;

    if (!workspaceId) {
        throw createError('Workspace ID is required', 400);
    }

    if (!favoriteIds || !Array.isArray(favoriteIds)) {
        throw createError('favoriteIds must be an array', 400);
    }

    if (favoriteIds.length === 0) {
        throw createError('favoriteIds array cannot be empty', 400);
    }

    // Validate that all favoriteIds are strings
    if (!favoriteIds.every(id => typeof id === 'string' && id.trim() !== '')) {
        throw createError('All favorite IDs must be non-empty strings', 400);
    }

    const result = await workspaceAIFavoritesService.reorderAIFavorites(workspaceId, favoriteIds);

    if (!result.success) {
        throw createError(result.message, 400);
    }

    res.json(result);
}));

// Check if an AI provider is favorited in a workspace
router.get('/:workspaceId/check/:aiProviderId', asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId, aiProviderId } = req.params;

    if (!workspaceId) {
        throw createError('Workspace ID is required', 400);
    }

    if (!aiProviderId) {
        throw createError('AI Provider ID is required', 400);
    }

    // Get all favorites for the workspace and check if the provider is in the list
    const result = await workspaceAIFavoritesService.getWorkspaceAIFavorites(workspaceId);

    if (!result.success) {
        throw createError(result.message || 'Failed to check favorite status', 400);
    }

    const isFavorited = result.favorites.some(favorite => favorite.aiProviderId === aiProviderId);
    const favoriteData = result.favorites.find(favorite => favorite.aiProviderId === aiProviderId);

    res.json({
        success: true,
        isFavorited,
        favorite: favoriteData || null
    });
}));

export default router;
