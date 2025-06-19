import { Router, Request, Response } from 'express';
import { OpenAIModelConfigServiceNew } from '../services/openaiModelConfigServiceNew';
import { authenticateToken } from '../middleware/auth';
import { initOpenAIModelConfigsTable } from '../scripts/initOpenAIModelConfigs';

const router = Router();
const openaiModelConfigService = OpenAIModelConfigServiceNew.getInstance();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Initialize the database table on first load
let tableInitialized = false;
async function ensureTableInitialized() {
    if (!tableInitialized) {
        try {
            await initOpenAIModelConfigsTable();
            tableInitialized = true;
        } catch (error) {
            console.error('Failed to initialize OpenAI model configs table:', error);
        }
    }
}

// Helper function to create error response
function createError(message: string, statusCode: number = 400) {
    const error = new Error(message) as any;
    error.statusCode = statusCode;
    return error;
}

// GET /api/v1/openai-model-configs - Get all model configurations
router.get('/', async (req: Request, res: Response, next) => {
    try {
        await ensureTableInitialized();
        const result = await openaiModelConfigService.getModelConfigs();

        if (!result.success) {
            throw createError(result.message, 400);
        }

        res.json({
            success: true,
            message: result.message,
            modelConfigs: result.modelConfigs
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/openai-model-configs - Create a new model configuration
router.post('/', async (req: Request, res: Response, next) => {
    try {
        await ensureTableInitialized();
        const { keyId, modelId, customName } = req.body;
        console.log('🔄 POST /openai-model-configs called with:', { keyId, modelId, customName });

        if (!keyId || !modelId) {
            console.log('❌ Missing required fields:', { keyId: !!keyId, modelId: !!modelId });
            throw createError('Key ID and Model ID are required', 400);
        }

        const requestData = {
            keyId,
            modelId,
            modelName: modelId, // Use modelId as modelName for now
            customName,
            isActive: true, // Default to active
            capabilities: {
                supportsImages: false,
                supportsFiles: false,
                supportsWebSearch: false,
                supportsReasoning: false
            },
            pricing: {
                inputTokens: 0,
                outputTokens: 0,
                currency: 'USD'
            },
            contextWindow: 4096,
            maxOutputTokens: 4096
        };

        console.log('📋 Calling createModelConfig with:', requestData);
        const result = await openaiModelConfigService.createModelConfig(requestData);
        console.log('📊 Service result:', { success: result.success, message: result.message });

        if (!result.success) {
            console.log('❌ Service returned error:', result.message);
            throw createError(result.message, 400);
        }

        res.status(201).json({
            success: true,
            message: result.message,
            data: result.modelConfig
        });
    } catch (error) {
        console.error('💥 Exception in POST /openai-model-configs:', error);
        next(error);
    }
});

// PUT /api/v1/openai-model-configs/:id - Update a model configuration
router.put('/:id', async (req: Request, res: Response, next) => {
    try {
        await ensureTableInitialized();
        const { id } = req.params;
        const { customName, isActive } = req.body;

        if (!id) {
            throw createError('Model configuration ID is required', 400);
        }

        const result = await openaiModelConfigService.updateModelConfig(id, {
            customName,
            isActive
        });

        if (!result.success) {
            throw createError(result.message, 400);
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

// DELETE /api/v1/openai-model-configs/:id - Delete a model configuration
router.delete('/:id', async (req: Request, res: Response, next) => {
    try {
        await ensureTableInitialized();
        const { id } = req.params;

        if (!id) {
            throw createError('Model configuration ID is required', 400);
        }

        const result = await openaiModelConfigService.deleteModelConfig(id);

        if (!result.success) {
            throw createError(result.message, 400);
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
