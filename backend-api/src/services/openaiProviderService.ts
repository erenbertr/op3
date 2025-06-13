import crypto from 'crypto';
import { DatabaseManager } from '../config/database';

export interface OpenAIProvider {
    id: string;
    name: string;
    apiKey: string; // This will be encrypted in the database
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateOpenAIProviderRequest {
    name: string;
    apiKey: string;
    isActive?: boolean;
}

export interface UpdateOpenAIProviderRequest {
    name?: string;
    apiKey?: string;
    isActive?: boolean;
}

export interface OpenAIProviderResponse {
    success: boolean;
    message: string;
    provider?: OpenAIProvider;
    providers?: OpenAIProvider[];
    error?: string;
}

export class OpenAIProviderService {
    private static instance: OpenAIProviderService;
    private dbManager: DatabaseManager;
    private encryptionKey: string;

    private constructor() {
        this.dbManager = DatabaseManager.getInstance();
        this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    }

    public static getInstance(): OpenAIProviderService {
        if (!OpenAIProviderService.instance) {
            OpenAIProviderService.instance = new OpenAIProviderService();
        }
        return OpenAIProviderService.instance;
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
            const [ivHex, encryptedText] = encryptedApiKey.split(':');
            if (!ivHex || !encryptedText) {
                throw new Error('Invalid encrypted API key format');
            }

            const iv = Buffer.from(ivHex, 'hex');
            const key = Buffer.from(this.encryptionKey.padEnd(32, '0').slice(0, 32));
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            console.error('Error decrypting API key:', error);
            throw new Error(`Failed to decrypt API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Validate OpenAI API key format
    private validateApiKeyFormat(apiKey: string): boolean {
        const pattern = /^sk-[a-zA-Z0-9-_]{20,}$/;
        return pattern.test(apiKey);
    }

    // Create a new OpenAI provider
    public async createProvider(request: CreateOpenAIProviderRequest): Promise<OpenAIProviderResponse> {
        try {
            if (!request.name?.trim()) {
                return {
                    success: false,
                    message: 'Provider name is required',
                    error: 'VALIDATION_ERROR'
                };
            }

            if (!request.apiKey?.trim()) {
                return {
                    success: false,
                    message: 'API key is required',
                    error: 'VALIDATION_ERROR'
                };
            }

            if (!this.validateApiKeyFormat(request.apiKey)) {
                return {
                    success: false,
                    message: 'Invalid OpenAI API key format. Keys should start with "sk-" followed by at least 20 characters.',
                    error: 'VALIDATION_ERROR'
                };
            }

            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            const encryptedApiKey = this.encryptApiKey(request.apiKey);

            const provider: OpenAIProvider = {
                id: crypto.randomUUID(),
                name: request.name.trim(),
                apiKey: encryptedApiKey,
                isActive: request.isActive ?? true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await this.saveProviderToDatabase(connection, config.type, provider);

            return {
                success: true,
                message: 'OpenAI provider created successfully',
                provider: {
                    ...provider,
                    apiKey: this.maskApiKey(request.apiKey) // Return masked key
                }
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to create provider',
                error: 'CREATE_ERROR'
            };
        }
    }

    // Get all OpenAI providers
    public async getProviders(): Promise<OpenAIProviderResponse> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            const providers = await this.getProvidersFromDatabase(connection, config.type);

            // Mask API keys for security
            const maskedProviders = providers.map(provider => ({
                ...provider,
                apiKey: this.maskApiKey(this.decryptApiKey(provider.apiKey))
            }));

            return {
                success: true,
                message: 'Providers retrieved successfully',
                providers: maskedProviders
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to get providers',
                error: 'GET_ERROR'
            };
        }
    }

    // Get a single provider by ID
    public async getProvider(id: string): Promise<OpenAIProviderResponse> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            const provider = await this.getProviderFromDatabase(connection, config.type, id);

            if (!provider) {
                return {
                    success: false,
                    message: 'Provider not found',
                    error: 'NOT_FOUND'
                };
            }

            return {
                success: true,
                message: 'Provider retrieved successfully',
                provider: {
                    ...provider,
                    apiKey: this.maskApiKey(this.decryptApiKey(provider.apiKey))
                }
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to get provider',
                error: 'GET_ERROR'
            };
        }
    }

    // Get decrypted API key for internal use
    public async getDecryptedApiKey(id: string): Promise<string | null> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                return null;
            }

            const connection = await this.dbManager.getConnection();
            const provider = await this.getProviderFromDatabase(connection, config.type, id);

            if (provider && provider.apiKey) {
                return this.decryptApiKey(provider.apiKey);
            }

            return null;
        } catch (error) {
            console.error('Error getting decrypted API key:', error);
            return null;
        }
    }

    // Update an OpenAI provider
    public async updateProvider(id: string, request: UpdateOpenAIProviderRequest): Promise<OpenAIProviderResponse> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            const existingProvider = await this.getProviderFromDatabase(connection, config.type, id);

            if (!existingProvider) {
                return {
                    success: false,
                    message: 'Provider not found',
                    error: 'NOT_FOUND'
                };
            }

            // Validate API key if provided
            if (request.apiKey && !this.validateApiKeyFormat(request.apiKey)) {
                return {
                    success: false,
                    message: 'Invalid OpenAI API key format. Keys should start with "sk-" followed by at least 20 characters.',
                    error: 'VALIDATION_ERROR'
                };
            }

            const updatedProvider: OpenAIProvider = {
                ...existingProvider,
                name: request.name?.trim() ?? existingProvider.name,
                apiKey: request.apiKey ? this.encryptApiKey(request.apiKey) : existingProvider.apiKey,
                isActive: request.isActive ?? existingProvider.isActive,
                updatedAt: new Date()
            };

            await this.updateProviderInDatabase(connection, config.type, updatedProvider);

            return {
                success: true,
                message: 'OpenAI provider updated successfully',
                provider: {
                    ...updatedProvider,
                    apiKey: this.maskApiKey(request.apiKey || this.decryptApiKey(existingProvider.apiKey))
                }
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to update provider',
                error: 'UPDATE_ERROR'
            };
        }
    }

    // Delete an OpenAI provider
    public async deleteProvider(id: string): Promise<OpenAIProviderResponse> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            const existingProvider = await this.getProviderFromDatabase(connection, config.type, id);

            if (!existingProvider) {
                return {
                    success: false,
                    message: 'Provider not found',
                    error: 'NOT_FOUND'
                };
            }

            await this.deleteProviderFromDatabase(connection, config.type, id);

            return {
                success: true,
                message: 'OpenAI provider deleted successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to delete provider',
                error: 'DELETE_ERROR'
            };
        }
    }

    // Mask API key for display
    private maskApiKey(apiKey: string): string {
        if (apiKey.length <= 8) return '***';
        return apiKey.substring(0, 8) + '...';
    }

    // Database operations
    private async saveProviderToDatabase(connection: any, dbType: string, provider: OpenAIProvider): Promise<void> {
        switch (dbType) {
            case 'localdb':
                return new Promise<void>((resolve, reject) => {
                    connection.run(`
                        INSERT INTO openai_providers
                        (id, name, apiKey, isActive, createdAt, updatedAt)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [
                        provider.id,
                        provider.name,
                        provider.apiKey,
                        provider.isActive ? 1 : 0,
                        provider.createdAt.toISOString(),
                        provider.updatedAt.toISOString()
                    ], (err: any) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

            case 'mongodb':
                await connection.collection('openai_providers').insertOne(provider);
                break;

            case 'mysql':
            case 'postgresql':
                const query = `
                    INSERT INTO openai_providers
                    (id, name, apiKey, isActive, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
                await connection.execute(query, [
                    provider.id,
                    provider.name,
                    provider.apiKey,
                    provider.isActive,
                    provider.createdAt,
                    provider.updatedAt
                ]);
                break;

            default:
                throw new Error(`Database type ${dbType} not supported`);
        }
    }

    private async getProvidersFromDatabase(connection: any, dbType: string): Promise<OpenAIProvider[]> {
        switch (dbType) {
            case 'localdb':
                return new Promise<OpenAIProvider[]>((resolve, reject) => {
                    connection.all(`
                        SELECT * FROM openai_providers
                        ORDER BY createdAt DESC
                    `, [], (err: any, rows: any[]) => {
                        if (err) {
                            reject(err);
                        } else {
                            const providers = rows.map(row => ({
                                id: row.id,
                                name: row.name,
                                apiKey: row.apiKey,
                                isActive: Boolean(row.isActive),
                                createdAt: new Date(row.createdAt),
                                updatedAt: new Date(row.updatedAt)
                            }));
                            resolve(providers);
                        }
                    });
                });

            case 'mongodb':
                const docs = await connection.collection('openai_providers').find({}).sort({ createdAt: -1 }).toArray();
                return docs.map((doc: any) => ({
                    id: doc.id,
                    name: doc.name,
                    apiKey: doc.apiKey,
                    isActive: doc.isActive,
                    createdAt: new Date(doc.createdAt),
                    updatedAt: new Date(doc.updatedAt)
                }));

            case 'mysql':
            case 'postgresql':
                const [rows] = await connection.execute(`
                    SELECT * FROM openai_providers
                    ORDER BY createdAt DESC
                `);
                return (rows as any[]).map(row => ({
                    id: row.id,
                    name: row.name,
                    apiKey: row.apiKey,
                    isActive: Boolean(row.isActive),
                    createdAt: new Date(row.createdAt),
                    updatedAt: new Date(row.updatedAt)
                }));

            default:
                throw new Error(`Database type ${dbType} not supported`);
        }
    }

    private async getProviderFromDatabase(connection: any, dbType: string, id: string): Promise<OpenAIProvider | null> {
        switch (dbType) {
            case 'localdb':
                return new Promise<OpenAIProvider | null>((resolve, reject) => {
                    connection.get(`
                        SELECT * FROM openai_providers WHERE id = ?
                    `, [id], (err: any, row: any) => {
                        if (err) {
                            reject(err);
                        } else if (row) {
                            resolve({
                                id: row.id,
                                name: row.name,
                                apiKey: row.apiKey,
                                isActive: Boolean(row.isActive),
                                createdAt: new Date(row.createdAt),
                                updatedAt: new Date(row.updatedAt)
                            });
                        } else {
                            resolve(null);
                        }
                    });
                });

            case 'mongodb':
                const doc = await connection.collection('openai_providers').findOne({ id });
                if (!doc) return null;
                return {
                    id: doc.id,
                    name: doc.name,
                    apiKey: doc.apiKey,
                    isActive: doc.isActive,
                    createdAt: new Date(doc.createdAt),
                    updatedAt: new Date(doc.updatedAt)
                };

            case 'mysql':
            case 'postgresql':
                const [rows] = await connection.execute(`
                    SELECT * FROM openai_providers WHERE id = ?
                `, [id]);
                const row = (rows as any[])[0];
                if (!row) return null;
                return {
                    id: row.id,
                    name: row.name,
                    apiKey: row.apiKey,
                    isActive: Boolean(row.isActive),
                    createdAt: new Date(row.createdAt),
                    updatedAt: new Date(row.updatedAt)
                };

            default:
                throw new Error(`Database type ${dbType} not supported`);
        }
    }

    private async updateProviderInDatabase(connection: any, dbType: string, provider: OpenAIProvider): Promise<void> {
        switch (dbType) {
            case 'localdb':
                return new Promise<void>((resolve, reject) => {
                    connection.run(`
                        UPDATE openai_providers
                        SET name = ?, apiKey = ?, isActive = ?, updatedAt = ?
                        WHERE id = ?
                    `, [
                        provider.name,
                        provider.apiKey,
                        provider.isActive ? 1 : 0,
                        provider.updatedAt.toISOString(),
                        provider.id
                    ], (err: any) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

            case 'mongodb':
                await connection.collection('openai_providers').updateOne(
                    { id: provider.id },
                    { $set: provider }
                );
                break;

            case 'mysql':
            case 'postgresql':
                const query = `
                    UPDATE openai_providers
                    SET name = ?, apiKey = ?, isActive = ?, updatedAt = ?
                    WHERE id = ?
                `;
                await connection.execute(query, [
                    provider.name,
                    provider.apiKey,
                    provider.isActive,
                    provider.updatedAt,
                    provider.id
                ]);
                break;

            default:
                throw new Error(`Database type ${dbType} not supported`);
        }
    }

    private async deleteProviderFromDatabase(connection: any, dbType: string, id: string): Promise<void> {
        switch (dbType) {
            case 'localdb':
                return new Promise<void>((resolve, reject) => {
                    connection.run(`
                        DELETE FROM openai_providers WHERE id = ?
                    `, [id], (err: any) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

            case 'mongodb':
                await connection.collection('openai_providers').deleteOne({ id });
                break;

            case 'mysql':
            case 'postgresql':
                await connection.execute(`
                    DELETE FROM openai_providers WHERE id = ?
                `, [id]);
                break;

            default:
                throw new Error(`Database type ${dbType} not supported`);
        }
    }

    // Test API key by making a simple request to OpenAI
    public async testApiKey(id: string): Promise<OpenAIProviderResponse> {
        try {
            const apiKey = await this.getDecryptedApiKey(id);
            if (!apiKey) {
                return {
                    success: false,
                    message: 'API key not found',
                    error: 'NOT_FOUND'
                };
            }

            // Make a simple request to OpenAI to test the key
            const response = await fetch('https://api.openai.com/v1/models', {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                return {
                    success: true,
                    message: 'API key is valid and working'
                };
            } else {
                const errorData = await response.json().catch(() => ({})) as any;
                return {
                    success: false,
                    message: `API key test failed: ${errorData.error?.message || response.statusText}`,
                    error: 'TEST_FAILED'
                };
            }
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to test API key',
                error: 'TEST_ERROR'
            };
        }
    }
}
