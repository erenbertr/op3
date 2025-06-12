import crypto from 'crypto';
import { DatabaseManager } from '../config/database';
import { 
    WorkspaceOpenRouterSettings, 
    SaveWorkspaceOpenRouterSettingsRequest,
    SaveWorkspaceOpenRouterSettingsResponse,
    GetWorkspaceOpenRouterSettingsResponse,
    ValidateOpenRouterApiKeyRequest,
    ValidateOpenRouterApiKeyResponse
} from '../types/workspace-settings';
import { AIProviderService } from './aiProviderService';

export class WorkspaceOpenRouterService {
    private static instance: WorkspaceOpenRouterService;
    private dbManager: DatabaseManager;
    private aiProviderService: AIProviderService;
    private encryptionKey: string;

    private constructor() {
        this.dbManager = DatabaseManager.getInstance();
        this.aiProviderService = AIProviderService.getInstance();
        this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    }

    public static getInstance(): WorkspaceOpenRouterService {
        if (!WorkspaceOpenRouterService.instance) {
            WorkspaceOpenRouterService.instance = new WorkspaceOpenRouterService();
        }
        return WorkspaceOpenRouterService.instance;
    }

    // Encrypt API key for secure storage
    private encryptApiKey(apiKey: string): string {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey.padEnd(32, '0').slice(0, 32)), iv);
        let encrypted = cipher.update(apiKey, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }

    // Decrypt API key for use
    private decryptApiKey(encryptedApiKey: string): string {
        try {
            const parts = encryptedApiKey.split(':');
            if (parts.length !== 2) {
                throw new Error(`Invalid encrypted API key format`);
            }

            const ivHex = parts[0];
            const encryptedText = parts[1];
            const iv = Buffer.from(ivHex, 'hex');
            const key = Buffer.from(this.encryptionKey.padEnd(32, '0').slice(0, 32));
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            console.error('Error decrypting API key:', error);
            throw new Error(`Failed to decrypt API key`);
        }
    }

    // Validate OpenRouter API key and fetch models
    public async validateApiKey(request: ValidateOpenRouterApiKeyRequest): Promise<ValidateOpenRouterApiKeyResponse> {
        try {
            const result = await this.aiProviderService.fetchOpenRouterModels(request.apiKey);
            
            if (result.success) {
                return {
                    success: true,
                    message: 'API key is valid',
                    models: result.models
                };
            } else {
                return {
                    success: false,
                    message: result.message || 'Invalid API key',
                    error: result.error
                };
            }
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Validation failed',
                error: 'VALIDATION_ERROR'
            };
        }
    }

    // Save workspace OpenRouter settings
    public async saveSettings(request: SaveWorkspaceOpenRouterSettingsRequest): Promise<SaveWorkspaceOpenRouterSettingsResponse> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            
            // Encrypt the API key
            const encryptedApiKey = this.encryptApiKey(request.apiKey);
            
            const settings: WorkspaceOpenRouterSettings = {
                id: crypto.randomUUID(),
                workspaceId: request.workspaceId,
                apiKey: encryptedApiKey,
                selectedModels: request.selectedModels,
                isEnabled: request.isEnabled,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Ensure table exists
            await this.createTableIfNotExists(connection, config.type);

            // Save to database
            await this.saveSettingsToDatabase(connection, config.type, settings);

            return {
                success: true,
                message: 'OpenRouter settings saved successfully',
                settings: {
                    ...settings,
                    apiKey: '***' // Don't return the actual API key
                }
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to save settings',
                error: 'SAVE_ERROR'
            };
        }
    }

    // Get workspace OpenRouter settings
    public async getSettings(workspaceId: string): Promise<GetWorkspaceOpenRouterSettingsResponse> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            
            // Ensure table exists
            await this.createTableIfNotExists(connection, config.type);

            const settings = await this.getSettingsFromDatabase(connection, config.type, workspaceId);

            if (settings) {
                return {
                    success: true,
                    settings: {
                        ...settings,
                        apiKey: '***' // Don't return the actual API key
                    }
                };
            } else {
                return {
                    success: true,
                    settings: undefined,
                    message: 'No OpenRouter settings found for this workspace'
                };
            }
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to get settings',
                error: 'GET_ERROR'
            };
        }
    }

    // Get decrypted API key for internal use
    public async getDecryptedApiKey(workspaceId: string): Promise<string | null> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                return null;
            }

            const connection = await this.dbManager.getConnection();
            const settings = await this.getSettingsFromDatabase(connection, config.type, workspaceId);

            if (settings && settings.apiKey) {
                return this.decryptApiKey(settings.apiKey);
            }

            return null;
        } catch (error) {
            console.error('Error getting decrypted API key:', error);
            return null;
        }
    }

    // Create table if not exists
    private async createTableIfNotExists(connection: any, dbType: string): Promise<void> {
        switch (dbType) {
            case 'localdb':
                return new Promise<void>((resolve, reject) => {
                    connection.run(`
                        CREATE TABLE IF NOT EXISTS workspace_openrouter_settings (
                            id TEXT PRIMARY KEY,
                            workspaceId TEXT NOT NULL,
                            apiKey TEXT NOT NULL,
                            selectedModels TEXT NOT NULL,
                            isEnabled INTEGER NOT NULL DEFAULT 1,
                            createdAt TEXT NOT NULL,
                            updatedAt TEXT NOT NULL,
                            UNIQUE(workspaceId)
                        )
                    `, (err: any) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

            case 'mongodb':
                // MongoDB doesn't need explicit table creation
                return Promise.resolve();

            case 'mysql':
            case 'postgresql':
                const createTableQuery = dbType === 'mysql' ? `
                    CREATE TABLE IF NOT EXISTS workspace_openrouter_settings (
                        id VARCHAR(36) PRIMARY KEY,
                        workspaceId VARCHAR(36) NOT NULL,
                        apiKey TEXT NOT NULL,
                        selectedModels JSON NOT NULL,
                        isEnabled BOOLEAN NOT NULL DEFAULT TRUE,
                        createdAt DATETIME NOT NULL,
                        updatedAt DATETIME NOT NULL,
                        UNIQUE KEY unique_workspace (workspaceId)
                    )
                ` : `
                    CREATE TABLE IF NOT EXISTS workspace_openrouter_settings (
                        id VARCHAR(36) PRIMARY KEY,
                        workspaceId VARCHAR(36) NOT NULL,
                        apiKey TEXT NOT NULL,
                        selectedModels JSONB NOT NULL,
                        isEnabled BOOLEAN NOT NULL DEFAULT TRUE,
                        createdAt TIMESTAMP NOT NULL,
                        updatedAt TIMESTAMP NOT NULL,
                        UNIQUE(workspaceId)
                    )
                `;
                await connection.execute(createTableQuery);
                break;

            case 'supabase':
                // Supabase table creation would be handled via migrations
                break;

            default:
                throw new Error(`Database type ${dbType} not supported`);
        }
    }

    // Save settings to database
    private async saveSettingsToDatabase(connection: any, dbType: string, settings: WorkspaceOpenRouterSettings): Promise<void> {
        switch (dbType) {
            case 'localdb':
                return new Promise<void>((resolve, reject) => {
                    const selectedModelsJson = JSON.stringify(settings.selectedModels);
                    connection.run(`
                        INSERT OR REPLACE INTO workspace_openrouter_settings 
                        (id, workspaceId, apiKey, selectedModels, isEnabled, createdAt, updatedAt)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `, [
                        settings.id,
                        settings.workspaceId,
                        settings.apiKey,
                        selectedModelsJson,
                        settings.isEnabled ? 1 : 0,
                        settings.createdAt?.toISOString(),
                        settings.updatedAt?.toISOString()
                    ], (err: any) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

            case 'mongodb':
                await connection.collection('workspace_openrouter_settings').replaceOne(
                    { workspaceId: settings.workspaceId },
                    settings,
                    { upsert: true }
                );
                break;

            case 'mysql':
            case 'postgresql':
                const query = `
                    INSERT INTO workspace_openrouter_settings 
                    (id, workspaceId, apiKey, selectedModels, isEnabled, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                    apiKey = VALUES(apiKey),
                    selectedModels = VALUES(selectedModels),
                    isEnabled = VALUES(isEnabled),
                    updatedAt = VALUES(updatedAt)
                `;
                await connection.execute(query, [
                    settings.id,
                    settings.workspaceId,
                    settings.apiKey,
                    JSON.stringify(settings.selectedModels),
                    settings.isEnabled,
                    settings.createdAt,
                    settings.updatedAt
                ]);
                break;

            default:
                throw new Error(`Database type ${dbType} not supported`);
        }
    }

    // Get settings from database
    private async getSettingsFromDatabase(connection: any, dbType: string, workspaceId: string): Promise<WorkspaceOpenRouterSettings | null> {
        switch (dbType) {
            case 'localdb':
                return new Promise<WorkspaceOpenRouterSettings | null>((resolve, reject) => {
                    connection.get(`
                        SELECT * FROM workspace_openrouter_settings WHERE workspaceId = ? LIMIT 1
                    `, [workspaceId], (err: any, row: any) => {
                        if (err) {
                            reject(err);
                        } else if (row) {
                            resolve({
                                id: row.id,
                                workspaceId: row.workspaceId,
                                apiKey: row.apiKey,
                                selectedModels: JSON.parse(row.selectedModels),
                                isEnabled: row.isEnabled === 1,
                                createdAt: new Date(row.createdAt),
                                updatedAt: new Date(row.updatedAt)
                            });
                        } else {
                            resolve(null);
                        }
                    });
                });

            case 'mongodb':
                const mongoResult = await connection.collection('workspace_openrouter_settings').findOne({ workspaceId });
                return mongoResult ? {
                    id: mongoResult.id,
                    workspaceId: mongoResult.workspaceId,
                    apiKey: mongoResult.apiKey,
                    selectedModels: mongoResult.selectedModels,
                    isEnabled: mongoResult.isEnabled,
                    createdAt: mongoResult.createdAt,
                    updatedAt: mongoResult.updatedAt
                } : null;

            case 'mysql':
            case 'postgresql':
                const [rows] = await connection.execute(
                    'SELECT * FROM workspace_openrouter_settings WHERE workspaceId = ? LIMIT 1',
                    [workspaceId]
                );
                if (rows.length > 0) {
                    const row = rows[0];
                    return {
                        id: row.id,
                        workspaceId: row.workspaceId,
                        apiKey: row.apiKey,
                        selectedModels: JSON.parse(row.selectedModels),
                        isEnabled: row.isEnabled,
                        createdAt: row.createdAt,
                        updatedAt: row.updatedAt
                    };
                }
                return null;

            default:
                throw new Error(`Database type ${dbType} not supported`);
        }
    }
}
