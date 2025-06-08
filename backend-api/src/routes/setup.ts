import { Router, Request, Response } from 'express';
import { DatabaseManager } from '../config/database';
import { DatabaseConfig, SetupData, SetupResponse } from '../types/database';
import { AdminConfig } from '../types/user';
import { UserService } from '../services/userService';
import { AIProviderService } from '../services/aiProviderService';
import { AIProviderTestRequest, AIProviderSaveRequest } from '../types/ai-provider';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = Router();
const dbManager = DatabaseManager.getInstance();
const userService = UserService.getInstance();
const aiProviderService = AIProviderService.getInstance();

// Test database connection
router.post('/test-connection', asyncHandler(async (req: Request, res: Response) => {
    const { database }: { database: DatabaseConfig } = req.body;

    if (!database) {
        throw createError('Database configuration is required', 400);
    }

    // Validate required fields based on database type
    const validationError = validateDatabaseConfig(database);
    if (validationError) {
        throw createError(validationError, 400);
    }

    const result = await dbManager.testConnection(database);

    res.json({
        success: result.success,
        message: result.message,
        connectionInfo: result.connectionInfo
    });
}));

// Save database configuration (Step 1 of setup)
router.post('/database', asyncHandler(async (req: Request, res: Response) => {
    const { database }: { database: DatabaseConfig } = req.body;

    if (!database) {
        throw createError('Database configuration is required', 400);
    }

    // Validate configuration
    const validationError = validateDatabaseConfig(database);
    if (validationError) {
        throw createError(validationError, 400);
    }

    // Test connection before saving
    const connectionResult = await dbManager.testConnection(database);
    if (!connectionResult.success) {
        throw createError(`Database connection failed: ${connectionResult.message}`, 400);
    }

    // Save configuration
    dbManager.setCurrentConfig(database);

    const response: SetupResponse = {
        success: true,
        message: 'Database configuration saved successfully',
        step: 'database',
        data: {
            type: database.type,
            database: database.database,
            host: database.host
        }
    };

    res.json(response);
}));

// Save admin configuration (Step 2 of setup)
router.post('/admin', asyncHandler(async (req: Request, res: Response) => {
    const { admin }: { admin: AdminConfig } = req.body;

    if (!admin) {
        throw createError('Admin configuration is required', 400);
    }

    // Validate admin configuration
    const validationErrors = userService.validateAdminConfig(admin);
    if (validationErrors.length > 0) {
        throw createError(validationErrors[0].message, 400);
    }

    // Create admin user
    const result = await userService.createAdminUser(admin);
    if (!result.success) {
        throw createError(result.message, 400);
    }

    const response: SetupResponse = {
        success: true,
        message: 'Admin user created successfully',
        step: 'admin',
        data: {
            adminId: result.user?.id,
            email: result.user?.email,
            role: result.user?.role
        }
    };

    res.json(response);
}));

// Test AI provider connection (Step 3 of setup)
router.post('/ai-providers/test', asyncHandler(async (req: Request, res: Response) => {
    const testRequest: AIProviderTestRequest = req.body;

    if (!testRequest.type || !testRequest.apiKey || !testRequest.model) {
        throw createError('Provider type, API key, and model are required', 400);
    }

    const result = await aiProviderService.testConnection(testRequest);

    res.json(result);
}));

// Save AI provider configurations (Step 3 of setup)
router.post('/ai-providers', asyncHandler(async (req: Request, res: Response) => {
    const { providers }: AIProviderSaveRequest = req.body;

    if (!providers || !Array.isArray(providers) || providers.length === 0) {
        throw createError('At least one AI provider configuration is required', 400);
    }

    // Validate each provider configuration
    for (const provider of providers) {
        if (!provider.type || !provider.name || !provider.apiKey || !provider.model) {
            throw createError('Provider type, name, API key, and model are required for each provider', 400);
        }

        // Validate API key format
        if (!aiProviderService.validateApiKeyFormat(provider.type, provider.apiKey)) {
            throw createError(`Invalid API key format for ${provider.type}`, 400);
        }
    }

    const result = await aiProviderService.saveProviders(providers);
    if (!result.success) {
        throw createError(result.message, 400);
    }

    const response: SetupResponse = {
        success: true,
        message: result.message,
        step: 'ai-providers',
        data: {
            providersCount: providers.length,
            providers: result.savedProviders
        }
    };

    res.json(response);
}));

// Mark setup as complete
router.post('/complete', asyncHandler(async (req: Request, res: Response) => {
    const currentConfig = dbManager.getCurrentConfig();

    // Verify all setup steps are completed
    if (!currentConfig) {
        throw createError('Database configuration is required', 400);
    }

    let adminExists = false;
    try {
        adminExists = await userService.adminExists();
    } catch (error) {
        console.error('Error checking admin existence:', error);
        adminExists = false;
    }

    if (!adminExists) {
        throw createError('Admin user must be created', 400);
    }

    const aiProvidersConfigured = aiProviderService.hasProviders();
    if (!aiProvidersConfigured) {
        throw createError('At least one AI provider must be configured', 400);
    }

    // Mark setup as complete
    const result = await dbManager.markSetupComplete();
    if (!result.success) {
        throw createError(result.message, 500);
    }

    res.json({
        success: true,
        message: 'Setup completed successfully',
        data: {
            completedAt: new Date().toISOString()
        }
    });
}));

// Get current setup status
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
    const currentConfig = dbManager.getCurrentConfig();

    // Check if admin user exists in database
    let adminExists = false;
    if (currentConfig) {
        try {
            adminExists = await userService.adminExists();
        } catch (error) {
            console.error('Error checking admin existence:', error);
            adminExists = false;
        }
    }

    // Check if AI providers are configured
    const aiProvidersConfigured = aiProviderService.hasProviders();

    // Check if setup is marked as complete
    const setupComplete = await dbManager.isSetupComplete();

    // Determine if all steps are completed
    const allStepsCompleted = !!currentConfig && adminExists && aiProvidersConfigured;

    res.json({
        success: true,
        setup: {
            database: {
                configured: !!currentConfig,
                type: currentConfig?.type || null
            },
            admin: {
                configured: adminExists
            },
            aiProviders: {
                configured: aiProvidersConfigured,
                count: aiProviderService.getProviders().length
            },
            completed: setupComplete,
            allStepsCompleted: allStepsCompleted
        }
    });
}));

// Validate database configuration
function validateDatabaseConfig(config: DatabaseConfig): string | null {
    if (!config.type) {
        return 'Database type is required';
    }

    if (!['mongodb', 'mysql', 'postgresql', 'localdb', 'supabase', 'convex', 'firebase', 'planetscale', 'neon', 'turso'].includes(config.type)) {
        return 'Invalid database type';
    }

    if (!config.database) {
        return 'Database name is required';
    }

    switch (config.type) {
        case 'mongodb':
            if (!config.connectionString) {
                return 'Connection string is required for MongoDB';
            }
            break;

        case 'mysql':
        case 'postgresql':
            if (!config.host) {
                return `Host is required for ${config.type}`;
            }
            if (!config.port) {
                return `Port is required for ${config.type}`;
            }
            if (!config.username) {
                return `Username is required for ${config.type}`;
            }
            if (!config.password) {
                return `Password is required for ${config.type}`;
            }
            break;

        case 'localdb':
            // For SQLite, database field contains the file path
            if (!config.database.endsWith('.db') && !config.database.endsWith('.sqlite')) {
                return 'LocalDB database should be a .db or .sqlite file';
            }
            break;

        case 'supabase':
            if (!config.url) {
                return 'URL is required for Supabase';
            }
            if (!config.apiKey) {
                return 'API Key is required for Supabase';
            }
            break;

        case 'convex':
            if (!config.url) {
                return 'URL is required for Convex';
            }
            if (!config.authToken) {
                return 'Auth Token is required for Convex';
            }
            break;

        case 'firebase':
            if (!config.projectId) {
                return 'Project ID is required for Firebase';
            }
            if (!config.apiKey) {
                return 'API Key is required for Firebase';
            }
            break;

        case 'planetscale':
            if (!config.host) {
                return 'Host is required for PlanetScale';
            }
            if (!config.username) {
                return 'Username is required for PlanetScale';
            }
            if (!config.password) {
                return 'Password is required for PlanetScale';
            }
            break;

        case 'neon':
            if (!config.connectionString) {
                return 'Connection string is required for Neon';
            }
            break;

        case 'turso':
            if (!config.url) {
                return 'URL is required for Turso';
            }
            if (!config.authToken) {
                return 'Auth Token is required for Turso';
            }
            break;
    }

    return null;
}

export default router;
