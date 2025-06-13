import crypto from 'crypto';
import { DatabaseManager } from '../config/database';
import {
    OpenAIModelConfig,
    CreateOpenAIModelConfigRequest,
    UpdateOpenAIModelConfigRequest,
    OpenAIModelConfigResponse,
    ModelCapabilities,
    ModelPricing
} from '../types/ai-provider';

export class OpenAIModelConfigService {
    private static instance: OpenAIModelConfigService;
    private dbManager: DatabaseManager;

    private constructor() {
        this.dbManager = DatabaseManager.getInstance();
    }

    public static getInstance(): OpenAIModelConfigService {
        if (!OpenAIModelConfigService.instance) {
            OpenAIModelConfigService.instance = new OpenAIModelConfigService();
        }
        return OpenAIModelConfigService.instance;
    }

    // Get model capabilities based on model ID
    private getModelCapabilities(modelId: string): ModelCapabilities {
        const capabilities: ModelCapabilities = {};

        // GPT-4o models
        if (modelId.includes('gpt-4o')) {
            capabilities.reasoning = true;
            capabilities.vision = true;
            capabilities.image = true;
            capabilities.pdf = true;
            capabilities.functionCalling = true;
            capabilities.codeInterpreter = true;
            capabilities.fileUpload = true;
        }
        // GPT-4 Turbo models
        else if (modelId.includes('gpt-4-turbo') || modelId.includes('gpt-4-1106') || modelId.includes('gpt-4-0125')) {
            capabilities.reasoning = true;
            capabilities.vision = modelId.includes('vision');
            capabilities.image = modelId.includes('vision');
            capabilities.functionCalling = true;
            capabilities.codeInterpreter = true;
            capabilities.fileUpload = true;
        }
        // GPT-4 models
        else if (modelId.includes('gpt-4')) {
            capabilities.reasoning = true;
            capabilities.functionCalling = true;
            capabilities.codeInterpreter = true;
        }
        // GPT-3.5 Turbo models
        else if (modelId.includes('gpt-3.5-turbo')) {
            capabilities.functionCalling = true;
        }

        return capabilities;
    }

    // Get model pricing based on model ID
    private getModelPricing(modelId: string): ModelPricing {
        const pricing: ModelPricing = {};

        // GPT-4o models
        if (modelId === 'gpt-4o') {
            pricing.inputTokens = '$5.00';
            pricing.outputTokens = '$15.00';
            pricing.contextLength = 128000;
        }
        else if (modelId === 'gpt-4o-mini') {
            pricing.inputTokens = '$0.15';
            pricing.outputTokens = '$0.60';
            pricing.contextLength = 128000;
        }
        // GPT-4 Turbo models
        else if (modelId === 'gpt-4-turbo' || modelId === 'gpt-4-turbo-2024-04-09') {
            pricing.inputTokens = '$10.00';
            pricing.outputTokens = '$30.00';
            pricing.contextLength = 128000;
        }
        else if (modelId === 'gpt-4-turbo-preview' || modelId === 'gpt-4-0125-preview') {
            pricing.inputTokens = '$10.00';
            pricing.outputTokens = '$30.00';
            pricing.contextLength = 128000;
        }
        // GPT-4 models
        else if (modelId === 'gpt-4') {
            pricing.inputTokens = '$30.00';
            pricing.outputTokens = '$60.00';
            pricing.contextLength = 8192;
        }
        else if (modelId === 'gpt-4-32k') {
            pricing.inputTokens = '$60.00';
            pricing.outputTokens = '$120.00';
            pricing.contextLength = 32768;
        }
        // GPT-3.5 Turbo models
        else if (modelId === 'gpt-3.5-turbo') {
            pricing.inputTokens = '$0.50';
            pricing.outputTokens = '$1.50';
            pricing.contextLength = 16385;
        }
        else if (modelId === 'gpt-3.5-turbo-16k') {
            pricing.inputTokens = '$3.00';
            pricing.outputTokens = '$4.00';
            pricing.contextLength = 16385;
        }

        return pricing;
    }

    // Create a new model configuration
    public async createModelConfig(request: CreateOpenAIModelConfigRequest): Promise<OpenAIModelConfigResponse> {
        try {
            if (!request.keyId?.trim()) {
                return {
                    success: false,
                    message: 'Key ID is required',
                    error: 'VALIDATION_ERROR'
                };
            }

            if (!request.modelId?.trim()) {
                return {
                    success: false,
                    message: 'Model ID is required',
                    error: 'VALIDATION_ERROR'
                };
            }

            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            await this.createTableIfNotExists(connection, config.type);

            // Check if model config already exists for this key and model
            const existingConfig = await this.getModelConfigByKeyAndModel(request.keyId, request.modelId);
            if (existingConfig) {
                return {
                    success: false,
                    message: 'Model configuration already exists for this key',
                    error: 'DUPLICATE_ERROR'
                };
            }

            // Get key name from the openai_providers table
            const keyInfo = await this.getKeyInfo(request.keyId);
            if (!keyInfo) {
                return {
                    success: false,
                    message: 'Invalid key ID',
                    error: 'INVALID_KEY'
                };
            }

            const modelConfig: OpenAIModelConfig = {
                id: crypto.randomUUID(),
                keyId: request.keyId,
                keyName: keyInfo.name,
                modelId: request.modelId,
                modelName: request.modelId, // Use model ID as default name
                customName: request.customName,
                capabilities: this.getModelCapabilities(request.modelId),
                pricing: this.getModelPricing(request.modelId),
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
    public async getAllModelConfigs(): Promise<OpenAIModelConfigResponse> {
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
    public async updateModelConfig(id: string, request: UpdateOpenAIModelConfigRequest): Promise<OpenAIModelConfigResponse> {
        try {
            if (!id?.trim()) {
                return {
                    success: false,
                    message: 'Model configuration ID is required',
                    error: 'VALIDATION_ERROR'
                };
            }

            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            await this.createTableIfNotExists(connection, config.type);

            const existingConfig = await this.getModelConfigById(id);
            if (!existingConfig) {
                return {
                    success: false,
                    message: 'Model configuration not found',
                    error: 'NOT_FOUND'
                };
            }

            const updatedConfig: OpenAIModelConfig = {
                ...existingConfig,
                customName: request.customName !== undefined ? request.customName : existingConfig.customName,
                isActive: request.isActive !== undefined ? request.isActive : existingConfig.isActive,
                updatedAt: new Date()
            };

            await this.updateModelConfigInDatabase(connection, config.type, updatedConfig);

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
    public async deleteModelConfig(id: string): Promise<OpenAIModelConfigResponse> {
        try {
            if (!id?.trim()) {
                return {
                    success: false,
                    message: 'Model configuration ID is required',
                    error: 'VALIDATION_ERROR'
                };
            }

            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            await this.createTableIfNotExists(connection, config.type);

            const existingConfig = await this.getModelConfigById(id);
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

    // Helper methods for database operations
    private async createTableIfNotExists(connection: any, dbType: string): Promise<void> {
        switch (dbType) {
            case 'localdb':
                return new Promise<void>((resolve, reject) => {
                    connection.run(`
                        CREATE TABLE IF NOT EXISTS openai_model_configs (
                            id TEXT PRIMARY KEY,
                            keyId TEXT NOT NULL,
                            keyName TEXT NOT NULL,
                            modelId TEXT NOT NULL,
                            modelName TEXT NOT NULL,
                            customName TEXT,
                            capabilities TEXT,
                            pricing TEXT,
                            isActive INTEGER NOT NULL DEFAULT 1,
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
                // MongoDB doesn't need explicit table creation
                return Promise.resolve();

            case 'mysql':
                const mysqlQuery = `
                    CREATE TABLE IF NOT EXISTS openai_model_configs (
                        id VARCHAR(36) PRIMARY KEY,
                        keyId VARCHAR(36) NOT NULL,
                        keyName VARCHAR(255) NOT NULL,
                        modelId VARCHAR(255) NOT NULL,
                        modelName VARCHAR(255) NOT NULL,
                        customName VARCHAR(255),
                        capabilities JSON,
                        pricing JSON,
                        isActive BOOLEAN NOT NULL DEFAULT TRUE,
                        createdAt DATETIME NOT NULL,
                        updatedAt DATETIME NOT NULL,
                        UNIQUE KEY unique_key_model (keyId, modelId),
                        INDEX idx_keyId (keyId),
                        INDEX idx_active (isActive)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                `;
                await connection.execute(mysqlQuery);
                break;

            case 'postgresql':
                const postgresQuery = `
                    CREATE TABLE IF NOT EXISTS openai_model_configs (
                        id VARCHAR(36) PRIMARY KEY,
                        keyId VARCHAR(36) NOT NULL,
                        keyName VARCHAR(255) NOT NULL,
                        modelId VARCHAR(255) NOT NULL,
                        modelName VARCHAR(255) NOT NULL,
                        customName VARCHAR(255),
                        capabilities JSONB,
                        pricing JSONB,
                        isActive BOOLEAN NOT NULL DEFAULT TRUE,
                        createdAt TIMESTAMP WITH TIME ZONE NOT NULL,
                        updatedAt TIMESTAMP WITH TIME ZONE NOT NULL,
                        UNIQUE(keyId, modelId)
                    )
                `;
                await connection.execute(postgresQuery);

                const indexQueries = [
                    'CREATE INDEX IF NOT EXISTS idx_openai_model_configs_keyId ON openai_model_configs(keyId)',
                    'CREATE INDEX IF NOT EXISTS idx_openai_model_configs_active ON openai_model_configs(isActive)'
                ];

                for (const indexQuery of indexQueries) {
                    await connection.execute(indexQuery);
                }
                break;

            default:
                throw new Error(`Database type ${dbType} not supported`);
        }
    }

    private async getKeyInfo(keyId: string): Promise<{ name: string; apiKey: string } | null> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) return null;

            const connection = await this.dbManager.getConnection();

            switch (config.type) {
                case 'localdb':
                    return new Promise<{ name: string; apiKey: string } | null>((resolve, reject) => {
                        connection.get(
                            'SELECT name, apiKey FROM openai_providers WHERE id = ? AND isActive = 1',
                            [keyId],
                            (err: any, row: any) => {
                                if (err) reject(err);
                                else resolve(row ? { name: row.name, apiKey: this.decryptApiKey(row.apiKey) } : null);
                            }
                        );
                    });

                case 'mongodb':
                    // connection is already the database object for MongoDB
                    const provider = await connection.collection('openai_providers').findOne({ id: keyId, isActive: true });
                    return provider ? { name: provider.name, apiKey: this.decryptApiKey(provider.apiKey) } : null;

                case 'mysql':
                case 'postgresql':
                    const [rows] = await connection.execute(
                        'SELECT name, apiKey FROM openai_providers WHERE id = ? AND isActive = TRUE',
                        [keyId]
                    );
                    return Array.isArray(rows) && rows.length > 0 ?
                        { name: (rows[0] as any).name, apiKey: this.decryptApiKey((rows[0] as any).apiKey) } : null;

                default:
                    return null;
            }
        } catch (error) {
            console.error('Error getting key info:', error);
            return null;
        }
    }

    // Encryption/Decryption methods (copied from OpenAIProviderService)
    private encryptApiKey(apiKey: string): string {
        const crypto = require('crypto');
        const algorithm = 'aes-256-cbc';
        const secretKey = process.env.ENCRYPTION_KEY || 'default-secret-key-change-in-production';
        const key = crypto.scryptSync(secretKey, 'salt', 32);
        const iv = crypto.randomBytes(16);

        const cipher = crypto.createCipher(algorithm, key);
        let encrypted = cipher.update(apiKey, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return iv.toString('hex') + ':' + encrypted;
    }

    private decryptApiKey(encryptedApiKey: string): string {
        try {
            const crypto = require('crypto');
            const algorithm = 'aes-256-cbc';
            const secretKey = process.env.ENCRYPTION_KEY || 'default-secret-key-change-in-production';
            const key = crypto.scryptSync(secretKey, 'salt', 32);

            const parts = encryptedApiKey.split(':');
            if (parts.length !== 2) {
                // If it's not in the expected format, assume it's already decrypted
                return encryptedApiKey;
            }

            const iv = Buffer.from(parts[0], 'hex');
            const encryptedText = parts[1];

            const decipher = crypto.createDecipher(algorithm, key);
            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            console.error('Error decrypting API key:', error);
            // If decryption fails, return the original value (might already be decrypted)
            return encryptedApiKey;
        }
    }

    private async getModelConfigByKeyAndModel(keyId: string, modelId: string): Promise<OpenAIModelConfig | null> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) return null;

            const connection = await this.dbManager.getConnection();

            switch (config.type) {
                case 'localdb':
                    return new Promise<OpenAIModelConfig | null>((resolve, reject) => {
                        connection.get(
                            'SELECT * FROM openai_model_configs WHERE keyId = ? AND modelId = ?',
                            [keyId, modelId],
                            (err: any, row: any) => {
                                if (err) reject(err);
                                else resolve(row ? this.parseModelConfigFromDB(row, config.type) : null);
                            }
                        );
                    });

                case 'mongodb':
                    const modelConfig = await connection.collection('openai_model_configs').findOne({ keyId, modelId });
                    return modelConfig ? this.parseModelConfigFromDB(modelConfig, config.type) : null;

                case 'mysql':
                case 'postgresql':
                    const [rows] = await connection.execute(
                        'SELECT * FROM openai_model_configs WHERE keyId = ? AND modelId = ?',
                        [keyId, modelId]
                    );
                    return Array.isArray(rows) && rows.length > 0 ?
                        this.parseModelConfigFromDB(rows[0], config.type) : null;

                default:
                    return null;
            }
        } catch (error) {
            console.error('Error getting model config by key and model:', error);
            return null;
        }
    }

    private async getModelConfigById(id: string): Promise<OpenAIModelConfig | null> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) return null;

            const connection = await this.dbManager.getConnection();

            switch (config.type) {
                case 'localdb':
                    return new Promise<OpenAIModelConfig | null>((resolve, reject) => {
                        connection.get(
                            'SELECT * FROM openai_model_configs WHERE id = ?',
                            [id],
                            (err: any, row: any) => {
                                if (err) reject(err);
                                else resolve(row ? this.parseModelConfigFromDB(row, config.type) : null);
                            }
                        );
                    });

                case 'mongodb':
                    const modelConfig = await connection.collection('openai_model_configs').findOne({ id });
                    return modelConfig ? this.parseModelConfigFromDB(modelConfig, config.type) : null;

                case 'mysql':
                case 'postgresql':
                    const [rows] = await connection.execute(
                        'SELECT * FROM openai_model_configs WHERE id = ?',
                        [id]
                    );
                    return Array.isArray(rows) && rows.length > 0 ?
                        this.parseModelConfigFromDB(rows[0], config.type) : null;

                default:
                    return null;
            }
        } catch (error) {
            console.error('Error getting model config by id:', error);
            return null;
        }
    }

    private async getModelConfigsFromDatabase(connection: any, dbType: string): Promise<OpenAIModelConfig[]> {
        switch (dbType) {
            case 'localdb':
                return new Promise<OpenAIModelConfig[]>((resolve, reject) => {
                    connection.all(
                        'SELECT * FROM openai_model_configs ORDER BY createdAt DESC',
                        [],
                        (err: any, rows: any[]) => {
                            if (err) reject(err);
                            else resolve(rows.map(row => this.parseModelConfigFromDB(row, dbType)));
                        }
                    );
                });

            case 'mongodb':
                const modelConfigs = await connection.collection('openai_model_configs')
                    .find({})
                    .sort({ createdAt: -1 })
                    .toArray();
                return modelConfigs.map((config: any) => this.parseModelConfigFromDB(config, dbType));

            case 'mysql':
            case 'postgresql':
                const [rows] = await connection.execute(
                    'SELECT * FROM openai_model_configs ORDER BY createdAt DESC'
                );
                return Array.isArray(rows) ?
                    rows.map(row => this.parseModelConfigFromDB(row, dbType)) : [];

            default:
                throw new Error(`Database type ${dbType} not supported`);
        }
    }

    private async saveModelConfigToDatabase(connection: any, dbType: string, modelConfig: OpenAIModelConfig): Promise<void> {
        const capabilitiesStr = JSON.stringify(modelConfig.capabilities || {});
        const pricingStr = JSON.stringify(modelConfig.pricing || {});

        switch (dbType) {
            case 'localdb':
                return new Promise<void>((resolve, reject) => {
                    connection.run(
                        `INSERT INTO openai_model_configs
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
                await connection.collection('openai_model_configs').insertOne({
                    ...modelConfig,
                    capabilities: modelConfig.capabilities || {},
                    pricing: modelConfig.pricing || {}
                });
                break;

            case 'mysql':
            case 'postgresql':
                await connection.execute(
                    `INSERT INTO openai_model_configs
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

    private async updateModelConfigInDatabase(connection: any, dbType: string, modelConfig: OpenAIModelConfig): Promise<void> {
        const capabilitiesStr = JSON.stringify(modelConfig.capabilities || {});
        const pricingStr = JSON.stringify(modelConfig.pricing || {});

        switch (dbType) {
            case 'localdb':
                return new Promise<void>((resolve, reject) => {
                    connection.run(
                        `UPDATE openai_model_configs
                         SET customName = ?, isActive = ?, updatedAt = ?
                         WHERE id = ?`,
                        [
                            modelConfig.customName || null,
                            modelConfig.isActive ? 1 : 0,
                            modelConfig.updatedAt.toISOString(),
                            modelConfig.id
                        ],
                        (err: any) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });

            case 'mongodb':
                await connection.collection('openai_model_configs').updateOne(
                    { id: modelConfig.id },
                    {
                        $set: {
                            customName: modelConfig.customName,
                            isActive: modelConfig.isActive,
                            updatedAt: modelConfig.updatedAt
                        }
                    }
                );
                break;

            case 'mysql':
            case 'postgresql':
                await connection.execute(
                    `UPDATE openai_model_configs
                     SET customName = ?, isActive = ?, updatedAt = ?
                     WHERE id = ?`,
                    [
                        modelConfig.customName || null,
                        modelConfig.isActive,
                        modelConfig.updatedAt,
                        modelConfig.id
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
                    connection.run(
                        'DELETE FROM openai_model_configs WHERE id = ?',
                        [id],
                        (err: any) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });

            case 'mongodb':
                await connection.collection('openai_model_configs').deleteOne({ id });
                break;

            case 'mysql':
            case 'postgresql':
                await connection.execute(
                    'DELETE FROM openai_model_configs WHERE id = ?',
                    [id]
                );
                break;

            default:
                throw new Error(`Database type ${dbType} not supported`);
        }
    }

    private parseModelConfigFromDB(row: any, dbType: string): OpenAIModelConfig {
        let capabilities: ModelCapabilities = {};
        let pricing: ModelPricing = {};

        try {
            if (row.capabilities) {
                capabilities = typeof row.capabilities === 'string' ?
                    JSON.parse(row.capabilities) : row.capabilities;
            }
        } catch (error) {
            console.error('Error parsing capabilities:', error);
        }

        try {
            if (row.pricing) {
                pricing = typeof row.pricing === 'string' ?
                    JSON.parse(row.pricing) : row.pricing;
            }
        } catch (error) {
            console.error('Error parsing pricing:', error);
        }

        return {
            id: row.id,
            keyId: row.keyId,
            keyName: row.keyName,
            modelId: row.modelId,
            modelName: row.modelName,
            customName: row.customName || undefined,
            capabilities,
            pricing,
            isActive: dbType === 'localdb' ? Boolean(row.isActive) : row.isActive,
            createdAt: dbType === 'localdb' ? new Date(row.createdAt) : row.createdAt,
            updatedAt: dbType === 'localdb' ? new Date(row.updatedAt) : row.updatedAt
        };
    }
}
