import { Router, Request, Response } from 'express';
import { WorkspaceOpenRouterService } from '../services/workspaceOpenRouterService';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import { 
    SaveWorkspaceOpenRouterSettingsRequest,
    ValidateOpenRouterApiKeyRequest
} from '../types/workspace-settings';

const router = Router();
const workspaceOpenRouterService = WorkspaceOpenRouterService.getInstance();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validate OpenRouter API key and fetch models
router.post('/validate', asyncHandler(async (req: Request, res: Response) => {
    const request: ValidateOpenRouterApiKeyRequest = req.body;

    if (!request.apiKey) {
        throw createError('API key is required', 400);
    }

    const result = await workspaceOpenRouterService.validateApiKey(request);
    res.json(result);
}));

// Get workspace OpenRouter settings
router.get('/:workspaceId', asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId } = req.params;

    if (!workspaceId) {
        throw createError('Workspace ID is required', 400);
    }

    const result = await workspaceOpenRouterService.getSettings(workspaceId);
    res.json(result);
}));

// Save workspace OpenRouter settings
router.post('/:workspaceId', asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId } = req.params;
    const requestBody = req.body;

    if (!workspaceId) {
        throw createError('Workspace ID is required', 400);
    }

    if (!requestBody.apiKey) {
        throw createError('API key is required', 400);
    }

    if (!Array.isArray(requestBody.selectedModels)) {
        throw createError('Selected models must be an array', 400);
    }

    const request: SaveWorkspaceOpenRouterSettingsRequest = {
        workspaceId,
        apiKey: requestBody.apiKey,
        selectedModels: requestBody.selectedModels,
        isEnabled: requestBody.isEnabled !== false // Default to true
    };

    const result = await workspaceOpenRouterService.saveSettings(request);
    res.json(result);
}));

// Delete workspace OpenRouter settings
router.delete('/:workspaceId', asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId } = req.params;

    if (!workspaceId) {
        throw createError('Workspace ID is required', 400);
    }

    // For now, we'll disable the settings instead of deleting
    const request: SaveWorkspaceOpenRouterSettingsRequest = {
        workspaceId,
        apiKey: '',
        selectedModels: [],
        isEnabled: false
    };

    const result = await workspaceOpenRouterService.saveSettings(request);
    res.json({
        success: result.success,
        message: result.success ? 'OpenRouter settings disabled' : result.message
    });
}));

export default router;
