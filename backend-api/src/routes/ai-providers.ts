import { Router, Request, Response } from 'express';
import { AIProviderService } from '../services/aiProviderService';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = Router();
const aiProviderService = AIProviderService.getInstance();

// Get all configured AI providers
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    try {
        const providers = aiProviderService.getProviders();
        
        res.json({
            success: true,
            message: `Retrieved ${providers.length} AI provider(s)`,
            providers
        });
    } catch (error) {
        throw createError('Failed to retrieve AI providers', 500);
    }
}));

// Get a specific AI provider by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    if (!id) {
        throw createError('Provider ID is required', 400);
    }
    
    try {
        const providers = aiProviderService.getProviders();
        const provider = providers.find(p => p.id === id);
        
        if (!provider) {
            throw createError('AI provider not found', 404);
        }
        
        res.json({
            success: true,
            message: 'AI provider retrieved successfully',
            provider
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'AI provider not found') {
            throw error;
        }
        throw createError('Failed to retrieve AI provider', 500);
    }
}));

export default router;
