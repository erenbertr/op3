import { Router, Request, Response } from 'express';
import { AIProviderService } from '../services/aiProviderService';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import { AIProviderConfig, AIProviderTestRequest } from '../types/ai-provider';

const router = Router();
const aiProviderService = AIProviderService.getInstance();

// Apply authentication middleware to all routes
router.use(authenticateToken);

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

// Create a new AI provider
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const providerData: AIProviderConfig = req.body;

    if (!providerData.type || !providerData.name || !providerData.apiKey || !providerData.model) {
        throw createError('Missing required fields: type, name, apiKey, model', 400);
    }

    try {
        const result = await aiProviderService.saveProviders([providerData]);

        if (result.success && result.savedProviders && result.savedProviders.length > 0) {
            res.json({
                success: true,
                message: 'AI provider created successfully',
                provider: result.savedProviders[0]
            });
        } else {
            throw createError('Failed to create AI provider', 500);
        }
    } catch (error) {
        throw createError('Failed to create AI provider', 500);
    }
}));

// Update an existing AI provider
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const providerData: AIProviderConfig = req.body;

    if (!id) {
        throw createError('Provider ID is required', 400);
    }

    if (!providerData.type || !providerData.name || !providerData.apiKey || !providerData.model) {
        throw createError('Missing required fields: type, name, apiKey, model', 400);
    }

    try {
        // Check if provider exists
        const providers = aiProviderService.getProviders();
        const existingProvider = providers.find(p => p.id === id);

        if (!existingProvider) {
            throw createError('AI provider not found', 404);
        }

        // Update the provider
        const updatedProvider = { ...providerData, id };
        const result = await aiProviderService.saveProviders([updatedProvider]);

        if (result.success && result.savedProviders && result.savedProviders.length > 0) {
            res.json({
                success: true,
                message: 'AI provider updated successfully',
                provider: result.savedProviders[0]
            });
        } else {
            throw createError('Failed to update AI provider', 500);
        }
    } catch (error) {
        if (error instanceof Error && error.message === 'AI provider not found') {
            throw error;
        }
        throw createError('Failed to update AI provider', 500);
    }
}));

// Delete an AI provider
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        throw createError('Provider ID is required', 400);
    }

    try {
        const result = aiProviderService.deleteProvider(id);

        if (result.success) {
            res.json({
                success: true,
                message: 'AI provider deleted successfully'
            });
        } else {
            throw createError(result.message || 'Failed to delete AI provider', 404);
        }
    } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
            throw createError('AI provider not found', 404);
        }
        throw createError('Failed to delete AI provider', 500);
    }
}));

// Test an AI provider connection
router.post('/:id/test', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        throw createError('Provider ID is required', 400);
    }

    try {
        // Get the provider with encrypted API keys (for internal use)
        const providers = aiProviderService.getProvidersWithEncryptedKeys();
        const provider = providers.find(p => p.id === id);

        if (!provider) {
            throw createError('AI provider not found', 404);
        }

        // Test the connection
        const testRequest: AIProviderTestRequest = {
            type: provider.type,
            apiKey: aiProviderService.decryptApiKey(provider.apiKey),
            model: provider.model,
            endpoint: provider.endpoint
        };

        const result = await aiProviderService.testConnection(testRequest);

        res.json(result);
    } catch (error) {
        if (error instanceof Error && error.message === 'AI provider not found') {
            throw error;
        }
        throw createError('Failed to test AI provider connection', 500);
    }
}));

// Fetch OpenAI models
router.post('/openai/models', asyncHandler(async (req: Request, res: Response) => {
    const { apiKey } = req.body;

    if (!apiKey) {
        throw createError('API key is required', 400);
    }

    try {
        const result = await aiProviderService.fetchOpenAIModels(apiKey);
        res.json(result);
    } catch (error) {
        throw createError('Failed to fetch OpenAI models', 500);
    }
}));

// Fetch OpenRouter models
router.post('/openrouter/models', asyncHandler(async (req: Request, res: Response) => {
    const { apiKey } = req.body;

    if (!apiKey) {
        throw createError('API key is required', 400);
    }

    try {
        const result = await aiProviderService.fetchOpenRouterModels(apiKey);
        res.json(result);
    } catch (error) {
        throw createError('Failed to fetch OpenRouter models', 500);
    }
}));

// Fetch Grok models
router.post('/grok/models', asyncHandler(async (req: Request, res: Response) => {
    const { apiKey } = req.body;

    if (!apiKey) {
        throw createError('API key is required', 400);
    }

    try {
        const result = await aiProviderService.fetchGrokModels(apiKey);
        res.json(result);
    } catch (error) {
        throw createError('Failed to fetch Grok models', 500);
    }
}));

// Fetch Anthropic models
router.post('/anthropic/models', asyncHandler(async (req: Request, res: Response) => {
    const { apiKey } = req.body;

    if (!apiKey) {
        throw createError('API key is required', 400);
    }

    try {
        const result = await aiProviderService.fetchAnthropicModels(apiKey);
        res.json(result);
    } catch (error) {
        throw createError('Failed to fetch Anthropic models', 500);
    }
}));

// Fetch Google models
router.post('/google/models', asyncHandler(async (req: Request, res: Response) => {
    const { apiKey } = req.body;

    if (!apiKey) {
        throw createError('API key is required', 400);
    }

    try {
        const result = await aiProviderService.fetchGoogleModels(apiKey);
        res.json(result);
    } catch (error) {
        throw createError('Failed to fetch Google models', 500);
    }
}));

// Refresh model metadata (capabilities and pricing) from APIs
router.post('/refresh-metadata', asyncHandler(async (req: Request, res: Response) => {
    const { modelId, apiKey } = req.body;

    if (!modelId || !apiKey) {
        throw createError('Model ID and API key are required', 400);
    }

    try {
        // This would trigger a refresh of model metadata from external APIs
        const result = await aiProviderService.refreshModelMetadata(modelId, apiKey);
        res.json(result);
    } catch (error) {
        throw createError('Failed to refresh model metadata', 500);
    }
}));

export default router;
