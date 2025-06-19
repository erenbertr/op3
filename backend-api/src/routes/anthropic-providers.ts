import express from 'express';
import { AnthropicProviderService } from '../services/anthropicProviderService';
import { initializeAnthropicProvidersTable } from '../scripts/initAnthropicProviders';
import { createError } from '../utils/errorHandler';

const router = express.Router();
const anthropicProviderService = AnthropicProviderService.getInstance();

// Initialize the database table on first load
let tableInitialized = false;
async function ensureTableInitialized() {
    if (!tableInitialized) {
        try {
            await initializeAnthropicProvidersTable();
            tableInitialized = true;
        } catch (error) {
            console.error('Failed to initialize Anthropic providers table:', error);
        }
    }
}

// GET /api/v1/anthropic-providers - Get all Anthropic providers
router.get('/', async (req, res, next) => {
    try {
        await ensureTableInitialized();
        const result = await anthropicProviderService.getProviders();

        if (!result.success) {
            throw createError(result.message, 400);
        }

        res.json({
            success: true,
            message: result.message,
            data: result.providers
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/anthropic-providers - Create a new Anthropic provider
router.post('/', async (req, res, next) => {
    try {
        await ensureTableInitialized();
        const { name, apiKey, isActive } = req.body;

        if (!name || !apiKey) {
            throw createError('Name and API key are required', 400);
        }

        const result = await anthropicProviderService.createProvider({
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

// PUT /api/v1/anthropic-providers/:id - Update an Anthropic provider
router.put('/:id', async (req, res, next) => {
    try {
        await ensureTableInitialized();
        const { id } = req.params;
        const { name, apiKey, isActive } = req.body;

        if (!id) {
            throw createError('Provider ID is required', 400);
        }

        const result = await anthropicProviderService.updateProvider(id, {
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

// DELETE /api/v1/anthropic-providers/:id - Delete an Anthropic provider
router.delete('/:id', async (req, res, next) => {
    try {
        await ensureTableInitialized();
        const { id } = req.params;

        if (!id) {
            throw createError('Provider ID is required', 400);
        }

        const result = await anthropicProviderService.deleteProvider(id);

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

// POST /api/v1/anthropic-providers/:id/test - Test an Anthropic provider's API key
router.post('/:id/test', async (req, res, next) => {
    try {
        await ensureTableInitialized();
        const { id } = req.params;

        if (!id) {
            throw createError('Provider ID is required', 400);
        }

        const result = await anthropicProviderService.testApiKey(id);

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

// GET /api/v1/anthropic-providers/:id/decrypted-key - Get decrypted API key (internal use)
router.get('/:id/decrypted-key', async (req, res, next) => {
    try {
        await ensureTableInitialized();
        const { id } = req.params;

        if (!id) {
            throw createError('Provider ID is required', 400);
        }

        const apiKey = await anthropicProviderService.getDecryptedApiKey(id);

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
