import { Router, Request, Response } from 'express';
import { DatabaseManager } from '../config/database';
import { DatabaseConfig, SetupData, SetupResponse } from '../types/database';
import { AdminConfig } from '../types/user';
import { UserService } from '../services/userService';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = Router();
const dbManager = DatabaseManager.getInstance();
const userService = UserService.getInstance();

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

    res.json({
        success: true,
        setup: {
            database: {
                configured: !!currentConfig,
                type: currentConfig?.type || null
            },
            admin: {
                configured: adminExists
            }
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
