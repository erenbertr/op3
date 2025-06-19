import crypto from 'crypto';
import { DatabaseManager } from '../config/database';
import { ModelPricingService } from './modelPricingService';
import {
    GoogleModelConfig,
    CreateGoogleModelConfigRequest,
    UpdateGoogleModelConfigRequest,
    GoogleModelConfigResponse,
    ModelCapabilities,
    ModelPricing
} from '../types/ai-provider';

export class GoogleModelConfigService {
    private static instance: GoogleModelConfigService;
    private dbManager: DatabaseManager;

    private constructor() {
        this.dbManager = DatabaseManager.getInstance();
    }

    public static getInstance(): GoogleModelConfigService {
        if (!GoogleModelConfigService.instance) {
            GoogleModelConfigService.instance = new GoogleModelConfigService();
        }
        return GoogleModelConfigService.instance;
    }

    // Encryption/Decryption methods
    private encryptApiKey(apiKey: string): string {
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key-32-characters-long!!', 'salt', 32);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(apiKey, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }

    private decryptApiKey(encryptedApiKey: string): string {
        try {
            const algorithm = 'aes-256-cbc';
            const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key-32-characters-long!!', 'salt', 32);
            const textParts = encryptedApiKey.split(':');
            const iv = Buffer.from(textParts.shift()!, 'hex');
            const encryptedText = textParts.join(':');
            const decipher = crypto.createDecipheriv(algorithm, key, iv);
            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            console.error('Failed to decrypt API key:', error);
            return encryptedApiKey; // Return as-is if decryption fails
        }
    }

    // Get model capabilities based on model ID
    private async getModelCapabilities(modelId: string, apiKey: string): Promise<ModelCapabilities> {
        // For now, return capabilities based on model name patterns
        // In the future, this could make API calls to get real capabilities
        const capabilities: ModelCapabilities = {};

        // Basic fallback logic based on model name patterns
        capabilities.reasoning = true;

        if (modelId.includes('gemini-1.5') || modelId.includes('gemini-2.0')) {
            capabilities.vision = true;
            capabilities.image = true;
            capabilities.pdf = true;
            capabilities.functionCalling = true;
            capabilities.codeInterpreter = true;
        }

        return capabilities;
    }

    // Get model pricing information
    private async getModelPricing(modelId: string, apiKey: string): Promise<ModelPricing> {
        // For now, return empty pricing - could be enhanced to fetch real pricing
        return {};
    }

    // Create table if it doesn't exist
    private async createTableIfNotExists(connection: any, dbType: string): Promise<void> {
        switch (dbType) {
            case 'localdb':
                return new Promise<void>((resolve, reject) => {
                    connection.run(`
                        CREATE TABLE IF NOT EXISTS google_model_configs (
                            id TEXT PRIMARY KEY,
                            keyId TEXT NOT NULL,
                            keyName TEXT NOT NULL,
                            modelId TEXT NOT NULL,
                            modelName TEXT NOT NULL,
                            customName TEXT,
                            capabilities TEXT,
                            pricing TEXT,
                            isActive INTEGER DEFAULT 1,
                            createdAt TEXT NOT NULL,
                            updatedAt TEXT NOT NULL,
                            UNIQUE(keyId, modelId)
                        )
                    `, (err: any) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

            case 'mongodb':
                // MongoDB doesn't require explicit table creation
                break;

            case 'mysql':
            case 'postgresql':
                await connection.execute(`
                    CREATE TABLE IF NOT EXISTS google_model_configs (
                        id VARCHAR(255) PRIMARY KEY,
                        keyId VARCHAR(255) NOT NULL,
                        keyName VARCHAR(255) NOT NULL,
                        modelId VARCHAR(255) NOT NULL,
                        modelName VARCHAR(255) NOT NULL,
                        customName VARCHAR(255),
                        capabilities TEXT,
                        pricing TEXT,
                        isActive BOOLEAN DEFAULT TRUE,
                        createdAt TIMESTAMP NOT NULL,
                        updatedAt TIMESTAMP NOT NULL,
                        UNIQUE KEY unique_key_model (keyId, modelId)
                    )
                `);
                break;

            default:
                throw new Error(`Database type ${dbType} not supported`);
        }
    }

    // Get key information from google_providers table
    private async getKeyInfo(connection: any, dbType: string, keyId: string): Promise<{ name: string; apiKey: string } | null> {
        try {
            switch (dbType) {
                case 'localdb':
                    return new Promise<{ name: string; apiKey: string } | null>((resolve, reject) => {
                        connection.get(
                            'SELECT name, apiKey FROM google_providers WHERE id = ? AND isActive = 1',
                            [keyId],
                            (err: any, row: any) => {
                                if (err) reject(err);
                                else resolve(row ? { name: row.name, apiKey: this.decryptApiKey(row.apiKey) } : null);
                            }
                        );
                    });

                case 'mongodb':
                    const provider = await connection.collection('google_providers').findOne({ id: keyId, isActive: true });
                    return provider ? { name: provider.name, apiKey: this.decryptApiKey(provider.apiKey) } : null;

                case 'mysql':
                case 'postgresql':
                    const [rows] = await connection.execute(
                        'SELECT name, apiKey FROM google_providers WHERE id = ? AND isActive = TRUE',
                        [keyId]
                    );
                    if (Array.isArray(rows) && rows.length > 0) {
                        const row = rows[0] as any;
                        return { name: row.name, apiKey: this.decryptApiKey(row.apiKey) };
                    }
                    return null;

                default:
                    return null;
            }
        } catch (error) {
            console.error('Error getting key info:', error);
            return null;
        }
    }

    // Create a new model configuration
    public async createModelConfig(request: CreateGoogleModelConfigRequest): Promise<GoogleModelConfigResponse> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            await this.createTableIfNotExists(connection, config.type);

            // Check if this key-model combination already exists
            const existingConfig = await this.getModelConfigByKeyAndModel(connection, config.type, request.keyId, request.modelId);
            if (existingConfig) {
                return {
                    success: false,
                    message: 'Model configuration already exists for this key and model combination',
                    error: 'DUPLICATE_ERROR'
                };
            }

            // Get key information
            const keyInfo = await this.getKeyInfo(connection, config.type, request.keyId);
            if (!keyInfo) {
                return {
                    success: false,
                    message: 'Invalid key ID or key is not active',
                    error: 'INVALID_KEY'
                };
            }

            // Fetch real model capabilities and pricing
            const [capabilities, pricing] = await Promise.all([
                this.getModelCapabilities(request.modelId, keyInfo.apiKey),
                this.getModelPricing(request.modelId, keyInfo.apiKey)
            ]);

            const modelConfig: GoogleModelConfig = {
                id: crypto.randomUUID(),
                keyId: request.keyId,
                keyName: keyInfo.name,
                modelId: request.modelId,
                modelName: request.modelId, // Use model ID as default name
                customName: request.customName,
                capabilities,
                pricing,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await this.saveModelConfigToDatabase(connection, config.type, modelConfig);

            return {
                success: true,
                message: 'Model configuration created successfully',
                data: modelConfig
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to create model configuration',
                error: 'CREATE_ERROR'
            };
        }
    }

    // Get all model configurations
    public async getAllModelConfigs(): Promise<GoogleModelConfigResponse> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            await this.createTableIfNotExists(connection, config.type);

            const modelConfigs = await this.getModelConfigsFromDatabase(connection, config.type);

            return {
                success: true,
                message: 'Model configurations retrieved successfully',
                data: modelConfigs
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to get model configurations',
                error: 'GET_ERROR'
            };
        }
    }

    // Update a model configuration
    public async updateModelConfig(id: string, request: UpdateGoogleModelConfigRequest): Promise<GoogleModelConfigResponse> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            await this.createTableIfNotExists(connection, config.type);

            // Check if model config exists
            const existingConfig = await this.getModelConfigById(connection, config.type, id);
            if (!existingConfig) {
                return {
                    success: false,
                    message: 'Model configuration not found',
                    error: 'NOT_FOUND'
                };
            }

            // Update the model config
            const updatedConfig: GoogleModelConfig = {
                ...existingConfig,
                customName: request.customName !== undefined ? request.customName : existingConfig.customName,
                isActive: request.isActive !== undefined ? request.isActive : existingConfig.isActive,
                updatedAt: new Date()
            };

            await this.updateModelConfigInDatabase(connection, config.type, id, updatedConfig);

            return {
                success: true,
                message: 'Model configuration updated successfully',
                data: updatedConfig
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to update model configuration',
                error: 'UPDATE_ERROR'
            };
        }
    }

    // Delete a model configuration
    public async deleteModelConfig(id: string): Promise<GoogleModelConfigResponse> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            await this.createTableIfNotExists(connection, config.type);

            // Check if model config exists
            const existingConfig = await this.getModelConfigById(connection, config.type, id);
            if (!existingConfig) {
                return {
                    success: false,
                    message: 'Model configuration not found',
                    error: 'NOT_FOUND'
                };
            }

            await this.deleteModelConfigFromDatabase(connection, config.type, id);

            return {
                success: true,
                message: 'Model configuration deleted successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to delete model configuration',
                error: 'DELETE_ERROR'
            };
        }
    }

    // Helper method to get model config by key and model
    private async getModelConfigByKeyAndModel(connection: any, dbType: string, keyId: string, modelId: string): Promise<GoogleModelConfig | null> {
        try {
            switch (dbType) {
                case 'localdb':
                    return new Promise<GoogleModelConfig | null>((resolve, reject) => {
                        connection.get(
                            'SELECT * FROM google_model_configs WHERE keyId = ? AND modelId = ?',
                            [keyId, modelId],
                            (err: any, row: any) => {
                                if (err) reject(err);
                                else resolve(row ? this.parseModelConfigFromDB(row, dbType) : null);
                            }
                        );
                    });

                case 'mongodb':
                    const modelConfig = await connection.collection('google_model_configs').findOne({ keyId, modelId });
                    return modelConfig ? this.parseModelConfigFromDB(modelConfig, dbType) : null;

                case 'mysql':
                case 'postgresql':
                    const [rows] = await connection.execute(
                        'SELECT * FROM google_model_configs WHERE keyId = ? AND modelId = ?',
                        [keyId, modelId]
                    );
                    return Array.isArray(rows) && rows.length > 0 ?
                        this.parseModelConfigFromDB(rows[0], dbType) : null;

                default:
                    return null;
            }
        } catch (error) {
            console.error('Error getting model config by key and model:', error);
            return null;
        }
    }

    // Helper method to get model config by ID
    private async getModelConfigById(connection: any, dbType: string, id: string): Promise<GoogleModelConfig | null> {
        try {
            switch (dbType) {
                case 'localdb':
                    return new Promise<GoogleModelConfig | null>((resolve, reject) => {
                        connection.get(
                            'SELECT * FROM google_model_configs WHERE id = ?',
                            [id],
                            (err: any, row: any) => {
                                if (err) reject(err);
                                else resolve(row ? this.parseModelConfigFromDB(row, dbType) : null);
                            }
                        );
                    });

                case 'mongodb':
                    const modelConfig = await connection.collection('google_model_configs').findOne({ id });
                    return modelConfig ? this.parseModelConfigFromDB(modelConfig, dbType) : null;

                case 'mysql':
                case 'postgresql':
                    const [rows] = await connection.execute(
                        'SELECT * FROM google_model_configs WHERE id = ?',
                        [id]
                    );
                    return Array.isArray(rows) && rows.length > 0 ?
                        this.parseModelConfigFromDB(rows[0], dbType) : null;

                default:
                    return null;
            }
        } catch (error) {
            console.error('Error getting model config by ID:', error);
            return null;
        }
    }

    // Helper method to get all model configs from database
    private async getModelConfigsFromDatabase(connection: any, dbType: string): Promise<GoogleModelConfig[]> {
        switch (dbType) {
            case 'localdb':
                return new Promise<GoogleModelConfig[]>((resolve, reject) => {
                    connection.all(
                        'SELECT * FROM google_model_configs ORDER BY createdAt DESC',
                        [],
                        (err: any, rows: any[]) => {
                            if (err) reject(err);
                            else resolve(rows.map(row => this.parseModelConfigFromDB(row, dbType)));
                        }
                    );
                });

            case 'mongodb':
                const configs = await connection.collection('google_model_configs').find({}).sort({ createdAt: -1 }).toArray();
                return configs.map((config: any) => this.parseModelConfigFromDB(config, dbType));

            case 'mysql':
            case 'postgresql':
                const [rows] = await connection.execute(
                    'SELECT * FROM google_model_configs ORDER BY createdAt DESC'
                );
                return Array.isArray(rows) ?
                    rows.map(row => this.parseModelConfigFromDB(row, dbType)) : [];

            default:
                throw new Error(`Database type ${dbType} not supported`);
        }
    }

    private async saveModelConfigToDatabase(connection: any, dbType: string, modelConfig: GoogleModelConfig): Promise<void> {
        const capabilitiesStr = JSON.stringify(modelConfig.capabilities || {});
        const pricingStr = JSON.stringify(modelConfig.pricing || {});

        switch (dbType) {
            case 'localdb':
                return new Promise<void>((resolve, reject) => {
                    connection.run(
                        `INSERT INTO google_model_configs
                         (id, keyId, keyName, modelId, modelName, customName, capabilities, pricing, isActive, createdAt, updatedAt)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            modelConfig.id,
                            modelConfig.keyId,
                            modelConfig.keyName,
                            modelConfig.modelId,
                            modelConfig.modelName,
                            modelConfig.customName || null,
                            capabilitiesStr,
                            pricingStr,
                            modelConfig.isActive ? 1 : 0,
                            modelConfig.createdAt.toISOString(),
                            modelConfig.updatedAt.toISOString()
                        ],
                        (err: any) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });

            case 'mongodb':
                await connection.collection('google_model_configs').insertOne({
                    ...modelConfig,
                    capabilities: modelConfig.capabilities || {},
                    pricing: modelConfig.pricing || {}
                });
                break;

            case 'mysql':
            case 'postgresql':
                await connection.execute(
                    `INSERT INTO google_model_configs
                     (id, keyId, keyName, modelId, modelName, customName, capabilities, pricing, isActive, createdAt, updatedAt)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        modelConfig.id,
                        modelConfig.keyId,
                        modelConfig.keyName,
                        modelConfig.modelId,
                        modelConfig.modelName,
                        modelConfig.customName || null,
                        capabilitiesStr,
                        pricingStr,
                        modelConfig.isActive,
                        modelConfig.createdAt,
                        modelConfig.updatedAt
                    ]
                );
                break;

            default:
                throw new Error(`Database type ${dbType} not supported`);
        }
    }

    private async updateModelConfigInDatabase(connection: any, dbType: string, id: string, modelConfig: GoogleModelConfig): Promise<void> {
        const capabilitiesStr = JSON.stringify(modelConfig.capabilities || {});
        const pricingStr = JSON.stringify(modelConfig.pricing || {});

        switch (dbType) {
            case 'localdb':
                return new Promise<void>((resolve, reject) => {
                    connection.run(
                        `UPDATE google_model_configs SET
                         customName = ?, capabilities = ?, pricing = ?, isActive = ?, updatedAt = ?
                         WHERE id = ?`,
                        [
                            modelConfig.customName || null,
                            capabilitiesStr,
                            pricingStr,
                            modelConfig.isActive ? 1 : 0,
                            modelConfig.updatedAt.toISOString(),
                            id
                        ],
                        (err: any) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });

            case 'mongodb':
                await connection.collection('google_model_configs').updateOne(
                    { id },
                    {
                        $set: {
                            customName: modelConfig.customName,
                            capabilities: modelConfig.capabilities || {},
                            pricing: modelConfig.pricing || {},
                            isActive: modelConfig.isActive,
                            updatedAt: modelConfig.updatedAt
                        }
                    }
                );
                break;

            case 'mysql':
            case 'postgresql':
                await connection.execute(
                    `UPDATE google_model_configs SET
                     customName = ?, capabilities = ?, pricing = ?, isActive = ?, updatedAt = ?
                     WHERE id = ?`,
                    [
                        modelConfig.customName || null,
                        capabilitiesStr,
                        pricingStr,
                        modelConfig.isActive,
                        modelConfig.updatedAt,
                        id
                    ]
                );
                break;

            default:
                throw new Error(`Database type ${dbType} not supported`);
        }
    }

    private async deleteModelConfigFromDatabase(connection: any, dbType: string, id: string): Promise<void> {
        switch (dbType) {
            case 'localdb':
                return new Promise<void>((resolve, reject) => {
                    connection.run('DELETE FROM google_model_configs WHERE id = ?', [id], (err: any) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

            case 'mongodb':
                await connection.collection('google_model_configs').deleteOne({ id });
                break;

            case 'mysql':
            case 'postgresql':
                await connection.execute('DELETE FROM google_model_configs WHERE id = ?', [id]);
                break;

            default:
                throw new Error(`Database type ${dbType} not supported`);
        }
    }

    private parseModelConfigFromDB(row: any, dbType: string): GoogleModelConfig {
        const capabilities = row.capabilities ?
            (typeof row.capabilities === 'string' ? JSON.parse(row.capabilities) : row.capabilities) : {};
        const pricing = row.pricing ?
            (typeof row.pricing === 'string' ? JSON.parse(row.pricing) : row.pricing) : {};

        return {
            id: row.id,
            keyId: row.keyId,
            keyName: row.keyName,
            modelId: row.modelId,
            modelName: row.modelName,
            customName: row.customName,
            capabilities,
            pricing,
            isActive: dbType === 'localdb' ? Boolean(row.isActive) : row.isActive,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt)
        };
    }
}
