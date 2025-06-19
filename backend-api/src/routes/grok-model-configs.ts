import { Router, Request, Response } from 'express';
import { GrokModelConfigServiceNew } from '../services/grokModelConfigServiceNew';
import { authenticateToken } from '../middleware/auth';
import { initGrokModelConfigsTable } from '../scripts/initGrokModelConfigs';

const router = Router();
const grokModelConfigService = GrokModelConfigServiceNew.getInstance();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Initialize the database table on first load
let tableInitialized = false;
async function ensureTableInitialized() {
    if (!tableInitialized) {
        try {
            await initGrokModelConfigsTable();
            tableInitialized = true;
        } catch (error) {
            console.error('Failed to initialize Grok model configs table:', error);
        }
    }
}

// Helper function to create error response
function createError(message: string, statusCode: number = 400) {
    const error = new Error(message) as any;
    error.statusCode = statusCode;
    return error;
}

// GET /api/v1/grok-model-configs - Get all model configurations
router.get('/', async (req: Request, res: Response, next) => {
    try {
        await ensureTableInitialized();
        const result = await grokModelConfigService.getModelConfigs();

        if (!result.success) {
            throw createError(result.message, 400);
        }

        res.json({
            success: true,
            message: result.message,
            data: result.modelConfigs
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/grok-model-configs - Create a new model configuration
router.post('/', async (req: Request, res: Response, next) => {
    try {
        await ensureTableInitialized();
        const { keyId, modelId, customName } = req.body;

        if (!keyId || !modelId) {
            throw createError('Key ID and Model ID are required', 400);
        }

        const result = await grokModelConfigService.createModelConfig({
            keyId,
            modelId,
            modelName: modelId, // Use modelId as modelName for now
            customName
        });

        if (!result.success) {
            const statusCode = result.message.includes('already exists') ? 409 :
                result.message.includes('Invalid key') ? 404 : 400;
            throw createError(result.message, statusCode);
        }

        res.status(201).json({
            success: true,
            message: result.message,
            data: result.modelConfig
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/v1/grok-model-configs/:id - Update a model configuration
router.put('/:id', async (req: Request, res: Response, next) => {
    try {
        await ensureTableInitialized();
        const { id } = req.params;
        const { customName, isActive } = req.body;

        if (!id) {
            throw createError('Model configuration ID is required', 400);
        }

        const result = await grokModelConfigService.updateModelConfig(id, {
            customName,
            isActive
        });

        if (!result.success) {
            const statusCode = result.message.includes('not found') ? 404 : 400;
            throw createError(result.message, statusCode);
        }

        res.json({
            success: true,
            message: result.message,
            data: result.modelConfig
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/grok-model-configs/:id - Delete a model configuration
router.delete('/:id', async (req: Request, res: Response, next) => {
    try {
        await ensureTableInitialized();
        const { id } = req.params;

        if (!id) {
            throw createError('Model configuration ID is required', 400);
        }

        const result = await grokModelConfigService.deleteModelConfig(id);

        if (!result.success) {
            const statusCode = result.message.includes('not found') ? 404 : 400;
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

export default router;
