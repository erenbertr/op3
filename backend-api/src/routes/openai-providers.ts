import express from 'express';
import { OpenAIProviderService } from '../services/openaiProviderService';
import { initializeOpenAIProvidersTable } from '../scripts/initOpenAIProviders';

const router = express.Router();
const openaiProviderService = OpenAIProviderService.getInstance();

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
        const result = await openaiProviderService.getProviders();
        
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
        const { id } = req.params;
        
        if (!id) {
            throw createError('Provider ID is required', 400);
        }
        
        const result = await openaiProviderService.getProvider(id);
        
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
        const { name, apiKey, isActive } = req.body;
        
        if (!name || !apiKey) {
            throw createError('Name and API key are required', 400);
        }
        
        const result = await openaiProviderService.createProvider({
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
        const { id } = req.params;
        const { name, apiKey, isActive } = req.body;
        
        if (!id) {
            throw createError('Provider ID is required', 400);
        }
        
        const result = await openaiProviderService.updateProvider(id, {
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
        const { id } = req.params;
        
        if (!id) {
            throw createError('Provider ID is required', 400);
        }
        
        const result = await openaiProviderService.deleteProvider(id);
        
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
        const { id } = req.params;
        
        if (!id) {
            throw createError('Provider ID is required', 400);
        }
        
        const result = await openaiProviderService.testApiKey(id);
        
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
        const { id } = req.params;
        
        if (!id) {
            throw createError('Provider ID is required', 400);
        }
        
        const apiKey = await openaiProviderService.getDecryptedApiKey(id);
        
        if (!apiKey) {
            throw createError('Provider not found or API key not available', 404);
        }
        
        res.json({
            success: true,
            message: 'API key retrieved successfully',
            data: { apiKey }
        });
    } catch (error) {
        next(error);
    }
});

export default router;
