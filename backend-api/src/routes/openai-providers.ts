import express from 'express';
import { OpenAIProviderService } from '../services/openaiProviderService';
import { initializeOpenAIProvidersTable } from '../scripts/initOpenAIProviders';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const openaiProviderService = OpenAIProviderService.getInstance();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Initialize the database table on first load
let tableInitialized = false;
async function ensureTableInitialized() {
    if (!tableInitialized) {
        try {
            await initializeOpenAIProvidersTable();
            tableInitialized = true;
        } catch (error) {
            console.error('Failed to initialize OpenAI providers table:', error);
        }
    }
}

// Helper function to create error response
function createError(message: string, statusCode: number = 400) {
    const error = new Error(message) as any;
    error.statusCode = statusCode;
    return error;
}

// GET /api/v1/openai-providers - Get all OpenAI providers
router.get('/', async (req, res, next) => {
    try {
        await ensureTableInitialized();
        const userId = (req as any).user?.id;
        if (!userId) {
            throw createError('User not authenticated', 401);
        }
        const result = await openaiProviderService.getProviders(userId);

        if (!result.success) {
            throw createError(result.message, 400);
        }

        res.json({
            success: true,
            message: result.message,
            data: result.providers || []
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/openai-providers/:id - Get a specific OpenAI provider
router.get('/:id', async (req, res, next) => {
    try {
        await ensureTableInitialized();
        const userId = (req as any).user?.id;
        if (!userId) {
            throw createError('User not authenticated', 401);
        }
        const { id } = req.params;

        if (!id) {
            throw createError('Provider ID is required', 400);
        }

        const result = await openaiProviderService.getProvider(userId, id);

        if (!result.success) {
            const statusCode = result.error === 'NOT_FOUND' ? 404 : 400;
            throw createError(result.message, statusCode);
        }

        res.json({
            success: true,
            message: result.message,
            data: result.provider
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/openai-providers - Create a new OpenAI provider
router.post('/', async (req, res, next) => {
    try {
        await ensureTableInitialized();
        const userId = (req as any).user?.id;
        if (!userId) {
            throw createError('User not authenticated', 401);
        }
        const { name, apiKey, isActive } = req.body;

        if (!name || !apiKey) {
            throw createError('Name and API key are required', 400);
        }

        const result = await openaiProviderService.createProvider(userId, {
            name,
            apiKey,
            isActive
        });

        if (!result.success) {
            throw createError(result.message, 400);
        }

        res.status(201).json({
            success: true,
            message: result.message,
            data: result.provider
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/v1/openai-providers/:id - Update an OpenAI provider
router.put('/:id', async (req, res, next) => {
    try {
        await ensureTableInitialized();
        const userId = (req as any).user?.id;
        if (!userId) {
            throw createError('User not authenticated', 401);
        }
        const { id } = req.params;
        const { name, apiKey, isActive } = req.body;

        if (!id) {
            throw createError('Provider ID is required', 400);
        }

        const result = await openaiProviderService.updateProvider(userId, id, {
            name,
            apiKey,
            isActive
        });

        if (!result.success) {
            const statusCode = result.error === 'NOT_FOUND' ? 404 : 400;
            throw createError(result.message, statusCode);
        }

        res.json({
            success: true,
            message: result.message,
            data: result.provider
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/openai-providers/:id - Delete an OpenAI provider
router.delete('/:id', async (req, res, next) => {
    try {
        await ensureTableInitialized();
        const userId = (req as any).user?.id;
        if (!userId) {
            throw createError('User not authenticated', 401);
        }
        const { id } = req.params;

        if (!id) {
            throw createError('Provider ID is required', 400);
        }

        const result = await openaiProviderService.deleteProvider(userId, id);

        if (!result.success) {
            const statusCode = result.error === 'NOT_FOUND' ? 404 : 400;
            throw createError(result.message, statusCode);
        }

        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/openai-providers/:id/test - Test an OpenAI provider's API key
router.post('/:id/test', async (req, res, next) => {
    try {
        await ensureTableInitialized();
        const userId = (req as any).user?.id;
        if (!userId) {
            throw createError('User not authenticated', 401);
        }
        const { id } = req.params;

        if (!id) {
            throw createError('Provider ID is required', 400);
        }

        const result = await openaiProviderService.testApiKey(userId, id);

        if (!result.success) {
            const statusCode = result.error === 'NOT_FOUND' ? 404 : 400;
            throw createError(result.message, statusCode);
        }

        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/openai-providers/:id/decrypted-key - Get decrypted API key (internal use)
router.get('/:id/decrypted-key', async (req, res, next) => {
    try {
        await ensureTableInitialized();
        const userId = (req as any).user?.id;
        if (!userId) {
            throw createError('User not authenticated', 401);
        }
        const { id } = req.params;
        console.log('🔑 GET /openai-providers/:id/decrypted-key called with id:', id);

        if (!id) {
            console.log('❌ No provider ID provided');
            throw createError('Provider ID is required', 400);
        }

        console.log('🔓 Getting decrypted API key...');
        const apiKey = await openaiProviderService.getDecryptedApiKey(userId, id);
        console.log('🔑 Decrypted API key retrieved:', apiKey ? `${apiKey.substring(0, 7)}...` : 'null');

        if (!apiKey) {
            console.log('❌ No API key found for provider');
            throw createError('Provider not found or API key not available', 404);
        }

        res.json({
            success: true,
            message: 'API key retrieved successfully',
            data: { apiKey }
        });
    } catch (error) {
        console.error('💥 Exception in /openai-providers/:id/decrypted-key route:', error);
        next(error);
    }
});

export default router;
