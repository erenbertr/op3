import express from 'express';
import { GrokProviderService } from '../services/grokProviderService';
import { initializeGrokProvidersTable } from '../scripts/initGrokProviders';
import { createError } from '../utils/errorHandler';

const router = express.Router();
const grokProviderService = new GrokProviderService();

// Initialize the database table on first load
let tableInitialized = false;
async function ensureTableInitialized() {
    if (!tableInitialized) {
        try {
            await initializeGrokProvidersTable();
            tableInitialized = true;
        } catch (error) {
            console.error('Failed to initialize Grok providers table:', error);
        }
    }
}

// GET /api/v1/grok-providers - Get all Grok providers
router.get('/', async (req, res, next) => {
    try {
        await ensureTableInitialized();
        const result = await grokProviderService.getProviders();

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

// POST /api/v1/grok-providers - Create a new Grok provider
router.post('/', async (req, res, next) => {
    try {
        await ensureTableInitialized();
        const { name, apiKey, isActive } = req.body;

        if (!name || !apiKey) {
            throw createError('Name and API key are required', 400);
        }

        const result = await grokProviderService.createProvider({
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

// PUT /api/v1/grok-providers/:id - Update a Grok provider
router.put('/:id', async (req, res, next) => {
    try {
        await ensureTableInitialized();
        const { id } = req.params;
        const { name, apiKey, isActive } = req.body;

        if (!id) {
            throw createError('Provider ID is required', 400);
        }

        const result = await grokProviderService.updateProvider(id, {
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

// DELETE /api/v1/grok-providers/:id - Delete a Grok provider
router.delete('/:id', async (req, res, next) => {
    try {
        await ensureTableInitialized();
        const { id } = req.params;

        if (!id) {
            throw createError('Provider ID is required', 400);
        }

        const result = await grokProviderService.deleteProvider(id);

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

// POST /api/v1/grok-providers/:id/test - Test a Grok provider's API key
router.post('/:id/test', async (req, res, next) => {
    try {
        await ensureTableInitialized();
        const { id } = req.params;

        if (!id) {
            throw createError('Provider ID is required', 400);
        }

        const result = await grokProviderService.testApiKey(id);

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

// GET /api/v1/grok-providers/:id/decrypted-key - Get decrypted API key (internal use)
router.get('/:id/decrypted-key', async (req, res, next) => {
    try {
        await ensureTableInitialized();
        const { id } = req.params;

        if (!id) {
            throw createError('Provider ID is required', 400);
        }

        const apiKey = await grokProviderService.getDecryptedApiKey(id);

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
