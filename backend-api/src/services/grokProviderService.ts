import crypto from 'crypto';
import { DatabaseManager } from '../config/database';

export interface GrokProvider {
    id: string;
    name: string;
    apiKey: string; // This will be encrypted in the database
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateGrokProviderRequest {
    name: string;
    apiKey: string;
    isActive?: boolean;
}

export interface UpdateGrokProviderRequest {
    name?: string;
    apiKey?: string;
    isActive?: boolean;
}

export interface GrokProviderResponse {
    success: boolean;
    message: string;
    provider?: GrokProvider;
    providers?: GrokProvider[];
    error?: string;
}

export class GrokProviderService {
    private dbManager: DatabaseManager;
    private encryptionKey: string;

    constructor() {
        this.dbManager = DatabaseManager.getInstance();
        this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    }

    // Validate API key format
    private validateApiKeyFormat(apiKey: string): boolean {
        // xAI keys start with 'xai-' and are typically 64 characters
        return /^xai-[a-zA-Z0-9]{64}$/.test(apiKey);
    }

    // Encrypt API key for storage
    private encryptApiKey(apiKey: string): string {
        try {
            const iv = crypto.randomBytes(16);
            const key = Buffer.from(this.encryptionKey.padEnd(32, '0').slice(0, 32));
            const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

            let encrypted = cipher.update(apiKey, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            return iv.toString('hex') + ':' + encrypted;
        } catch (error) {
            console.error('Error encrypting API key:', error);
            throw new Error(`Failed to encrypt API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Decrypt API key for use
    private decryptApiKey(encryptedApiKey: string): string {
        try {
            const parts = encryptedApiKey.split(':');
            if (parts.length !== 2) {
                throw new Error('Invalid encrypted API key format');
            }

            const iv = Buffer.from(parts[0], 'hex');
            const encryptedText = parts[1];

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

    // Mask API key for display
    private maskApiKey(apiKey: string): string {
        if (apiKey.length <= 8) return '***';
        return apiKey.substring(0, 8) + '***' + apiKey.substring(apiKey.length - 4);
    }

    // Create a new Grok provider
    public async createProvider(request: CreateGrokProviderRequest): Promise<GrokProviderResponse> {
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
                    message: 'Invalid xAI API key format. Keys should start with "xai-" followed by 64 characters.',
                    error: 'VALIDATION_ERROR'
                };
            }

            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            const encryptedApiKey = this.encryptApiKey(request.apiKey);

            const provider: GrokProvider = {
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
                message: 'Grok provider created successfully',
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

    // Get all Grok providers
    public async getProviders(): Promise<GrokProviderResponse> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            const providers = await this.getProvidersFromDatabase(connection, config.type);

            // Mask API keys for response
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

    // Update a Grok provider
    public async updateProvider(id: string, request: UpdateGrokProviderRequest): Promise<GrokProviderResponse> {
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
                    message: 'Grok provider not found',
                    error: 'NOT_FOUND'
                };
            }

            // Validate API key if provided
            if (request.apiKey && !this.validateApiKeyFormat(request.apiKey)) {
                return {
                    success: false,
                    message: 'Invalid xAI API key format. Keys should start with "xai-" followed by 64 characters.',
                    error: 'VALIDATION_ERROR'
                };
            }

            const updatedProvider: GrokProvider = {
                ...existingProvider,
                name: request.name?.trim() ?? existingProvider.name,
                apiKey: request.apiKey ? this.encryptApiKey(request.apiKey) : existingProvider.apiKey,
                isActive: request.isActive ?? existingProvider.isActive,
                updatedAt: new Date()
            };

            await this.updateProviderInDatabase(connection, config.type, updatedProvider);

            return {
                success: true,
                message: 'Grok provider updated successfully',
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

    // Delete a Grok provider
    public async deleteProvider(id: string): Promise<GrokProviderResponse> {
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
                    message: 'Grok provider not found',
                    error: 'NOT_FOUND'
                };
            }

            await this.deleteProviderFromDatabase(connection, config.type, id);

            return {
                success: true,
                message: 'Grok provider deleted successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to delete provider',
                error: 'DELETE_ERROR'
            };
        }
    }

    // Test API key
    public async testApiKey(id: string): Promise<GrokProviderResponse> {
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
                    message: 'Grok provider not found',
                    error: 'NOT_FOUND'
                };
            }

            const decryptedApiKey = this.decryptApiKey(provider.apiKey);

            // Test the API key with a minimal completion request
            const response = await fetch('https://api.x.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${decryptedApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'grok-beta',
                    messages: [{ role: 'user', content: 'test' }],
                    max_tokens: 1
                })
            });

            if (response.ok || response.status === 400) {
                // 400 is expected for minimal request
                return {
                    success: true,
                    message: 'Grok API key is valid'
                };
            } else {
                const errorData = await response.json().catch(() => ({})) as any;
                return {
                    success: false,
                    message: errorData.error?.message || `HTTP ${response.status}`,
                    error: 'API_ERROR'
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

    // Get decrypted API key (for internal use)
    public async getDecryptedApiKey(id: string): Promise<string | null> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            const provider = await this.getProviderFromDatabase(connection, config.type, id);

            if (!provider) {
                return null;
            }

            return this.decryptApiKey(provider.apiKey);
        } catch (error) {
            console.error('Error getting decrypted API key:', error);
            return null;
        }
    }

    // Database operations
    private async saveProviderToDatabase(connection: any, dbType: string, provider: GrokProvider): Promise<void> {
        if (dbType === 'sqlite') {
            const stmt = connection.prepare(`
                INSERT INTO grok_providers (id, name, api_key, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            stmt.run(
                provider.id,
                provider.name,
                provider.apiKey,
                provider.isActive ? 1 : 0,
                provider.createdAt.toISOString(),
                provider.updatedAt.toISOString()
            );
        } else if (dbType === 'mysql') {
            await connection.execute(
                'INSERT INTO grok_providers (id, name, api_key, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
                [provider.id, provider.name, provider.apiKey, provider.isActive, provider.createdAt, provider.updatedAt]
            );
        } else if (dbType === 'postgresql') {
            await connection.query(
                'INSERT INTO grok_providers (id, name, api_key, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
                [provider.id, provider.name, provider.apiKey, provider.isActive, provider.createdAt, provider.updatedAt]
            );
        } else if (dbType === 'mongodb') {
            await connection.collection('grok_providers').insertOne({
                id: provider.id,
                name: provider.name,
                apiKey: provider.apiKey,
                isActive: provider.isActive,
                createdAt: provider.createdAt,
                updatedAt: provider.updatedAt
            });
        }
    }

    private async getProvidersFromDatabase(connection: any, dbType: string): Promise<GrokProvider[]> {
        let rows: any[] = [];

        if (dbType === 'sqlite') {
            const stmt = connection.prepare('SELECT * FROM grok_providers ORDER BY created_at DESC');
            rows = stmt.all();
        } else if (dbType === 'mysql') {
            const [results] = await connection.execute('SELECT * FROM grok_providers ORDER BY created_at DESC');
            rows = results as any[];
        } else if (dbType === 'postgresql') {
            const result = await connection.query('SELECT * FROM grok_providers ORDER BY created_at DESC');
            rows = result.rows;
        } else if (dbType === 'mongodb') {
            const docs = await connection.collection('grok_providers').find({}).sort({ createdAt: -1 }).toArray();
            return docs.map((doc: any) => ({
                id: doc.id,
                name: doc.name,
                apiKey: doc.apiKey,
                isActive: doc.isActive,
                createdAt: new Date(doc.createdAt),
                updatedAt: new Date(doc.updatedAt)
            }));
        }

        return rows.map(row => ({
            id: row.id,
            name: row.name,
            apiKey: row.api_key,
            isActive: dbType === 'sqlite' ? Boolean(row.is_active) : row.is_active,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        }));
    }

    private async getProviderFromDatabase(connection: any, dbType: string, id: string): Promise<GrokProvider | null> {
        let row: any = null;

        if (dbType === 'sqlite') {
            const stmt = connection.prepare('SELECT * FROM grok_providers WHERE id = ?');
            row = stmt.get(id);
        } else if (dbType === 'mysql') {
            const [results] = await connection.execute('SELECT * FROM grok_providers WHERE id = ?', [id]);
            const rows = results as any[];
            row = rows.length > 0 ? rows[0] : null;
        } else if (dbType === 'postgresql') {
            const result = await connection.query('SELECT * FROM grok_providers WHERE id = $1', [id]);
            row = result.rows.length > 0 ? result.rows[0] : null;
        } else if (dbType === 'mongodb') {
            const doc = await connection.collection('grok_providers').findOne({ id });
            if (!doc) return null;
            return {
                id: doc.id,
                name: doc.name,
                apiKey: doc.apiKey,
                isActive: doc.isActive,
                createdAt: new Date(doc.createdAt),
                updatedAt: new Date(doc.updatedAt)
            };
        }

        if (!row) return null;

        return {
            id: row.id,
            name: row.name,
            apiKey: row.api_key,
            isActive: dbType === 'sqlite' ? Boolean(row.is_active) : row.is_active,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }

    private async updateProviderInDatabase(connection: any, dbType: string, provider: GrokProvider): Promise<void> {
        if (dbType === 'sqlite') {
            const stmt = connection.prepare(`
                UPDATE grok_providers
                SET name = ?, api_key = ?, is_active = ?, updated_at = ?
                WHERE id = ?
            `);
            stmt.run(
                provider.name,
                provider.apiKey,
                provider.isActive ? 1 : 0,
                provider.updatedAt.toISOString(),
                provider.id
            );
        } else if (dbType === 'mysql') {
            await connection.execute(
                'UPDATE grok_providers SET name = ?, api_key = ?, is_active = ?, updated_at = ? WHERE id = ?',
                [provider.name, provider.apiKey, provider.isActive, provider.updatedAt, provider.id]
            );
        } else if (dbType === 'postgresql') {
            await connection.query(
                'UPDATE grok_providers SET name = $1, api_key = $2, is_active = $3, updated_at = $4 WHERE id = $5',
                [provider.name, provider.apiKey, provider.isActive, provider.updatedAt, provider.id]
            );
        } else if (dbType === 'mongodb') {
            await connection.collection('grok_providers').updateOne(
                { id: provider.id },
                {
                    $set: {
                        name: provider.name,
                        apiKey: provider.apiKey,
                        isActive: provider.isActive,
                        updatedAt: provider.updatedAt
                    }
                }
            );
        }
    }

    private async deleteProviderFromDatabase(connection: any, dbType: string, id: string): Promise<void> {
        if (dbType === 'sqlite') {
            const stmt = connection.prepare('DELETE FROM grok_providers WHERE id = ?');
            stmt.run(id);
        } else if (dbType === 'mysql') {
            await connection.execute('DELETE FROM grok_providers WHERE id = ?', [id]);
        } else if (dbType === 'postgresql') {
            await connection.query('DELETE FROM grok_providers WHERE id = $1', [id]);
        } else if (dbType === 'mongodb') {
            await connection.collection('grok_providers').deleteOne({ id });
        }
    }
}
