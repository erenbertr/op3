import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { createError } from '../utils/errorHandler';
import { WorkspacePersonalityFavoritesService } from '../services/workspacePersonalityFavoritesService';
import {
    CreatePersonalityFavoriteRequest,
    UpdatePersonalityFavoriteRequest,
    ReorderPersonalityFavoritesRequest
} from '../types/personality';

const router = Router();
const workspacePersonalityFavoritesService = new WorkspacePersonalityFavoritesService();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all personality favorites for a workspace
router.get('/:workspaceId', asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId } = req.params;

    if (!workspaceId) {
        throw createError('Workspace ID is required', 400);
    }

    const result = await workspacePersonalityFavoritesService.getWorkspacePersonalityFavorites(workspaceId);
    res.json(result);
}));

// Add a personality to workspace favorites
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const request: CreatePersonalityFavoriteRequest = req.body;

    if (!request.workspaceId) {
        throw createError('Workspace ID is required', 400);
    }

    if (!request.personalityId) {
        throw createError('Personality ID is required', 400);
    }

    const result = await workspacePersonalityFavoritesService.addPersonalityFavorite(request);

    if (!result.success) {
        throw createError(result.message, 400);
    }

    res.status(201).json(result);
}));

// Update a personality favorite (mainly for sort order)
router.put('/:favoriteId', asyncHandler(async (req: Request, res: Response) => {
    const { favoriteId } = req.params;
    const request: UpdatePersonalityFavoriteRequest = req.body;

    if (!favoriteId) {
        throw createError('Favorite ID is required', 400);
    }

    // For now, we only support updating sort order through reorder endpoint
    // This endpoint is kept for future extensibility
    throw createError('Use the reorder endpoint to update personality favorites', 400);
}));

// Remove a personality from workspace favorites
router.delete('/:favoriteId', asyncHandler(async (req: Request, res: Response) => {
    const { favoriteId } = req.params;

    if (!favoriteId) {
        throw createError('Favorite ID is required', 400);
    }

    const result = await workspacePersonalityFavoritesService.removePersonalityFavorite(favoriteId);

    if (!result.success) {
        throw createError(result.message, 400);
    }

    res.json(result);
}));

// Reorder personality favorites
router.put('/:workspaceId/reorder', asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId } = req.params;
    const { favoriteIds }: { favoriteIds: string[] } = req.body;

    if (!workspaceId) {
        throw createError('Workspace ID is required', 400);
    }

    if (!favoriteIds || !Array.isArray(favoriteIds)) {
        throw createError('Favorite IDs array is required', 400);
    }

    const request: ReorderPersonalityFavoritesRequest = {
        workspaceId,
        favoriteIds
    };

    const result = await workspacePersonalityFavoritesService.reorderPersonalityFavorites(request);

    if (!result.success) {
        throw createError(result.message, 400);
    }

    res.json(result);
}));

// Check if a personality is favorited in a workspace
router.get('/:workspaceId/check/:personalityId', asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId, personalityId } = req.params;

    if (!workspaceId) {
        throw createError('Workspace ID is required', 400);
    }

    if (!personalityId) {
        throw createError('Personality ID is required', 400);
    }

    // Get all favorites for the workspace and check if the personality is in the list
    const result = await workspacePersonalityFavoritesService.getWorkspacePersonalityFavorites(workspaceId);
    
    if (!result.success) {
        throw createError(result.message || 'Failed to check favorite status', 400);
    }

    const isFavorited = result.favorites.some(favorite => favorite.personalityId === personalityId);
    const favorite = result.favorites.find(favorite => favorite.personalityId === personalityId);

    res.json({
        success: true,
        isFavorited,
        favorite: favorite || null
    });
}));

export default router;
