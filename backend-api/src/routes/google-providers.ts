import express from 'express';
import { GoogleProviderService } from '../services/googleProviderService';
import { initializeGoogleProvidersTable } from '../scripts/initGoogleProviders';
import { createError } from '../utils/errorHandler';

const router = express.Router();
const googleProviderService = GoogleProviderService.getInstance();

// Initialize the database table on first load
let tableInitialized = false;
async function ensureTableInitialized() {
    if (!tableInitialized) {
        try {
            await initializeGoogleProvidersTable();
            tableInitialized = true;
        } catch (error) {
            console.error('Failed to initialize Google providers table:', error);
        }
    }
}

// GET /api/v1/google-providers - Get all Google providers
router.get('/', async (req, res, next) => {
    try {
        await ensureTableInitialized();
        const result = await googleProviderService.getProviders();

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

// POST /api/v1/google-providers - Create a new Google provider
router.post('/', async (req, res, next) => {
    try {
        await ensureTableInitialized();
        const { name, apiKey, isActive } = req.body;

        if (!name || !apiKey) {
            throw createError('Name and API key are required', 400);
        }

        const result = await googleProviderService.createProvider({
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

// PUT /api/v1/google-providers/:id - Update a Google provider
router.put('/:id', async (req, res, next) => {
    try {
        await ensureTableInitialized();
        const { id } = req.params;
        const { name, apiKey, isActive } = req.body;

        if (!id) {
            throw createError('Provider ID is required', 400);
        }

        const result = await googleProviderService.updateProvider(id, {
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

// DELETE /api/v1/google-providers/:id - Delete a Google provider
router.delete('/:id', async (req, res, next) => {
    try {
        await ensureTableInitialized();
        const { id } = req.params;

        if (!id) {
            throw createError('Provider ID is required', 400);
        }

        const result = await googleProviderService.deleteProvider(id);

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

// POST /api/v1/google-providers/:id/test - Test a Google provider's API key
router.post('/:id/test', async (req, res, next) => {
    try {
        await ensureTableInitialized();
        const { id } = req.params;

        if (!id) {
            throw createError('Provider ID is required', 400);
        }

        const result = await googleProviderService.testApiKey(id);

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

// GET /api/v1/google-providers/:id/decrypted-key - Get decrypted API key (internal use)
router.get('/:id/decrypted-key', async (req, res, next) => {
    try {
        await ensureTableInitialized();
        const { id } = req.params;

        if (!id) {
            throw createError('Provider ID is required', 400);
        }

        const apiKey = await googleProviderService.getDecryptedApiKey(id);

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
