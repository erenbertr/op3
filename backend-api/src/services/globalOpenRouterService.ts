import crypto from 'crypto';
import { DatabaseManager } from '../config/database';
import { AIProviderService } from './aiProviderService';
import {
    GlobalOpenRouterSettings,
    SaveGlobalOpenRouterSettingsRequest,
    SaveGlobalOpenRouterSettingsResponse,
    GetGlobalOpenRouterSettingsResponse
} from '../types/global-openrouter-settings';
import { ValidateOpenRouterApiKeyRequest, ValidateOpenRouterApiKeyResponse } from '../types/workspace-settings';

export class GlobalOpenRouterService {
    private static instance: GlobalOpenRouterService;
    private dbManager: DatabaseManager;
    private aiProviderService: AIProviderService;
    private encryptionKey: string;

    private constructor() {
        this.dbManager = DatabaseManager.getInstance();
        this.aiProviderService = AIProviderService.getInstance();
        this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    }

    public static getInstance(): GlobalOpenRouterService {
        if (!GlobalOpenRouterService.instance) {
            GlobalOpenRouterService.instance = new GlobalOpenRouterService();
        }
        return GlobalOpenRouterService.instance;
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

    // Save global OpenRouter settings
    public async saveSettings(request: SaveGlobalOpenRouterSettingsRequest): Promise<SaveGlobalOpenRouterSettingsResponse> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();

            // Encrypt the API key
            const encryptedApiKey = this.encryptApiKey(request.apiKey);

            const settings: GlobalOpenRouterSettings = {
                id: crypto.randomUUID(),
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
                message: 'Global OpenRouter settings saved successfully',
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

    // Update only selected models (keeping existing API key)
    public async updateSelectedModels(selectedModels: string[]): Promise<SaveGlobalOpenRouterSettingsResponse> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();

            // Ensure table exists
            await this.createTableIfNotExists(connection, config.type);

            // Get existing settings
            const existingSettings = await this.getSettingsFromDatabase(connection, config.type);
            if (!existingSettings) {
                throw new Error('No existing OpenRouter configuration found. Please configure API key first.');
            }

            // Update only the selected models and timestamp
            const updatedSettings: GlobalOpenRouterSettings = {
                ...existingSettings,
                selectedModels,
                updatedAt: new Date()
            };

            // Save to database
            await this.saveSettingsToDatabase(connection, config.type, updatedSettings);

            return {
                success: true,
                message: 'Selected models updated successfully',
                settings: {
                    ...updatedSettings,
                    apiKey: '***' // Don't return the actual API key
                }
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to update selected models',
                error: 'UPDATE_ERROR'
            };
        }
    }

    // Get available models using saved API key
    public async getAvailableModels(): Promise<ValidateOpenRouterApiKeyResponse> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            await this.createTableIfNotExists(connection, config.type);

            const settings = await this.getSettingsFromDatabase(connection, config.type);
            if (!settings || !settings.apiKey) {
                return {
                    success: false,
                    message: 'No API key found. Please configure OpenRouter first.',
                    error: 'NO_API_KEY'
                };
            }

            // Decrypt the API key and fetch models
            const decryptedApiKey = this.decryptApiKey(settings.apiKey);
            const result = await this.aiProviderService.fetchOpenRouterModels(decryptedApiKey);

            if (result.success) {
                return {
                    success: true,
                    message: 'Models fetched successfully',
                    models: result.models
                };
            } else {
                return {
                    success: false,
                    message: result.message || 'Failed to fetch models',
                    error: result.error
                };
            }
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to fetch models',
                error: 'FETCH_ERROR'
            };
        }
    }

    // Get global OpenRouter settings
    public async getSettings(): Promise<GetGlobalOpenRouterSettingsResponse> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();

            // Ensure table exists
            await this.createTableIfNotExists(connection, config.type);

            const settings = await this.getSettingsFromDatabase(connection, config.type);

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
                    message: 'No global OpenRouter settings found'
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

    // Create table if not exists
    private async createTableIfNotExists(connection: any, dbType: string): Promise<void> {
        switch (dbType) {
            case 'localdb':
                return new Promise<void>((resolve, reject) => {
                    connection.run(`
                        CREATE TABLE IF NOT EXISTS global_openrouter_settings (
                            id TEXT PRIMARY KEY,
                            apiKey TEXT NOT NULL,
                            selectedModels TEXT NOT NULL,
                            isEnabled INTEGER NOT NULL DEFAULT 1,
                            createdAt TEXT NOT NULL,
                            updatedAt TEXT NOT NULL
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
                await connection.execute(`
                    CREATE TABLE IF NOT EXISTS global_openrouter_settings (
                        id VARCHAR(36) PRIMARY KEY,
                        apiKey TEXT NOT NULL,
                        selectedModels TEXT NOT NULL,
                        isEnabled BOOLEAN NOT NULL DEFAULT TRUE,
                        createdAt TIMESTAMP NOT NULL,
                        updatedAt TIMESTAMP NOT NULL,
                        UNIQUE KEY unique_global_settings (id)
                    )
                `);
                break;

            default:
                throw new Error(`Database type ${dbType} not supported`);
        }
    }

    // Save settings to database
    private async saveSettingsToDatabase(connection: any, dbType: string, settings: GlobalOpenRouterSettings): Promise<void> {
        switch (dbType) {
            case 'localdb':
                return new Promise<void>((resolve, reject) => {
                    connection.run(`
                        INSERT OR REPLACE INTO global_openrouter_settings 
                        (id, apiKey, selectedModels, isEnabled, createdAt, updatedAt)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [
                        'global', // Use a fixed ID for global settings
                        settings.apiKey,
                        JSON.stringify(settings.selectedModels),
                        settings.isEnabled ? 1 : 0,
                        settings.createdAt?.toISOString(),
                        settings.updatedAt?.toISOString()
                    ], (err: any) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

            case 'mongodb':
                await connection.collection('global_openrouter_settings').replaceOne(
                    { id: 'global' },
                    { ...settings, id: 'global' },
                    { upsert: true }
                );
                break;

            case 'mysql':
            case 'postgresql':
                const query = `
                    INSERT INTO global_openrouter_settings 
                    (id, apiKey, selectedModels, isEnabled, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                    apiKey = VALUES(apiKey),
                    selectedModels = VALUES(selectedModels),
                    isEnabled = VALUES(isEnabled),
                    updatedAt = VALUES(updatedAt)
                `;
                await connection.execute(query, [
                    'global', // Use a fixed ID for global settings
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
    private async getSettingsFromDatabase(connection: any, dbType: string): Promise<GlobalOpenRouterSettings | null> {
        switch (dbType) {
            case 'localdb':
                return new Promise<GlobalOpenRouterSettings | null>((resolve, reject) => {
                    connection.get(`
                        SELECT * FROM global_openrouter_settings WHERE id = ? LIMIT 1
                    `, ['global'], (err: any, row: any) => {
                        if (err) {
                            reject(err);
                        } else if (row) {
                            resolve({
                                id: row.id,
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
                const mongoResult = await connection.collection('global_openrouter_settings').findOne({ id: 'global' });
                return mongoResult ? {
                    id: mongoResult.id,
                    apiKey: mongoResult.apiKey,
                    selectedModels: mongoResult.selectedModels,
                    isEnabled: mongoResult.isEnabled,
                    createdAt: mongoResult.createdAt,
                    updatedAt: mongoResult.updatedAt
                } : null;

            case 'mysql':
            case 'postgresql':
                const [rows] = await connection.execute(
                    'SELECT * FROM global_openrouter_settings WHERE id = ? LIMIT 1',
                    ['global']
                );
                if (rows.length > 0) {
                    const row = rows[0];
                    return {
                        id: row.id,
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
