import { Router, Request, Response } from 'express';
import { GlobalOpenRouterService } from '../services/globalOpenRouterService';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import {
    SaveGlobalOpenRouterSettingsRequest
} from '../types/global-openrouter-settings';
import { ValidateOpenRouterApiKeyRequest } from '../types/workspace-settings';

const router = Router();
const globalOpenRouterService = GlobalOpenRouterService.getInstance();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validate OpenRouter API key and fetch models
router.post('/validate', asyncHandler(async (req: Request, res: Response) => {
    const request: ValidateOpenRouterApiKeyRequest = req.body;

    if (!request.apiKey) {
        throw createError('API key is required', 400);
    }

    const result = await globalOpenRouterService.validateApiKey(request);
    res.json(result);
}));

// Get global OpenRouter settings
router.get('/settings', asyncHandler(async (req: Request, res: Response) => {
    const result = await globalOpenRouterService.getSettings();
    res.json(result);
}));

// Save global OpenRouter settings
router.post('/settings', asyncHandler(async (req: Request, res: Response) => {
    const requestBody = req.body;

    if (!requestBody.apiKey) {
        throw createError('API key is required', 400);
    }

    if (!Array.isArray(requestBody.selectedModels)) {
        throw createError('Selected models must be an array', 400);
    }

    const request: SaveGlobalOpenRouterSettingsRequest = {
        apiKey: requestBody.apiKey,
        selectedModels: requestBody.selectedModels,
        isEnabled: requestBody.isEnabled !== false // Default to true
    };

    const result = await globalOpenRouterService.saveSettings(request);
    res.json(result);
}));

// Delete global OpenRouter settings
router.delete('/settings', asyncHandler(async (req: Request, res: Response) => {
    // For now, we'll disable the settings instead of deleting
    const request: SaveGlobalOpenRouterSettingsRequest = {
        apiKey: '',
        selectedModels: [],
        isEnabled: false
    };

    const result = await globalOpenRouterService.saveSettings(request);
    res.json({
        success: result.success,
        message: result.success ? 'Global OpenRouter settings disabled' : result.message
    });
}));

export default router;
