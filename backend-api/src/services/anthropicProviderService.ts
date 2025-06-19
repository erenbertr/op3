import crypto from 'crypto';
import { DatabaseManager } from '../config/database';

export interface AnthropicProvider {
    id: string;
    name: string;
    apiKey: string; // This will be encrypted in the database
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateAnthropicProviderRequest {
    name: string;
    apiKey: string;
    isActive?: boolean;
}

export interface UpdateAnthropicProviderRequest {
    name?: string;
    apiKey?: string;
    isActive?: boolean;
}

export interface AnthropicProviderResponse {
    success: boolean;
    message: string;
    provider?: AnthropicProvider;
    providers?: AnthropicProvider[];
    error?: string;
}

export class AnthropicProviderService {
    private dbManager: DatabaseManager;
    private encryptionKey: string;

    constructor() {
        this.dbManager = DatabaseManager.getInstance();
        this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    }

    // Validate API key format
    private validateApiKeyFormat(apiKey: string): boolean {
        // Anthropic keys start with 'sk-ant-' and are typically around 100 characters
        return /^sk-ant-[a-zA-Z0-9-_]{95,}$/.test(apiKey);
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

    // Create a new Anthropic provider
    public async createProvider(request: CreateAnthropicProviderRequest): Promise<AnthropicProviderResponse> {
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
                    message: 'Invalid Anthropic API key format. Keys should start with "sk-ant-" followed by at least 95 characters.',
                    error: 'VALIDATION_ERROR'
                };
            }

            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            const encryptedApiKey = this.encryptApiKey(request.apiKey);

            const provider: AnthropicProvider = {
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
                message: 'Anthropic provider created successfully',
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

    // Get all Anthropic providers
    public async getProviders(): Promise<AnthropicProviderResponse> {
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

    // Update an Anthropic provider
    public async updateProvider(id: string, request: UpdateAnthropicProviderRequest): Promise<AnthropicProviderResponse> {
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
                    message: 'Anthropic provider not found',
                    error: 'NOT_FOUND'
                };
            }

            // Validate API key if provided
            if (request.apiKey && !this.validateApiKeyFormat(request.apiKey)) {
                return {
                    success: false,
                    message: 'Invalid Anthropic API key format. Keys should start with "sk-ant-" followed by at least 95 characters.',
                    error: 'VALIDATION_ERROR'
                };
            }

            const updatedProvider: AnthropicProvider = {
                ...existingProvider,
                name: request.name?.trim() ?? existingProvider.name,
                apiKey: request.apiKey ? this.encryptApiKey(request.apiKey) : existingProvider.apiKey,
                isActive: request.isActive ?? existingProvider.isActive,
                updatedAt: new Date()
            };

            await this.updateProviderInDatabase(connection, config.type, updatedProvider);

            return {
                success: true,
                message: 'Anthropic provider updated successfully',
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

    // Delete an Anthropic provider
    public async deleteProvider(id: string): Promise<AnthropicProviderResponse> {
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
                    message: 'Anthropic provider not found',
                    error: 'NOT_FOUND'
                };
            }

            await this.deleteProviderFromDatabase(connection, config.type, id);

            return {
                success: true,
                message: 'Anthropic provider deleted successfully'
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
    public async testApiKey(id: string): Promise<AnthropicProviderResponse> {
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
                    message: 'Anthropic provider not found',
                    error: 'NOT_FOUND'
                };
            }

            const decryptedApiKey = this.decryptApiKey(provider.apiKey);

            // Test the API key with a minimal request
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': decryptedApiKey,
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-3-5-haiku-20241022',
                    max_tokens: 1,
                    messages: [{ role: 'user', content: 'test' }]
                })
            });

            if (response.ok || response.status === 400) {
                // 400 is expected for minimal request
                return {
                    success: true,
                    message: 'Anthropic API key is valid'
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
    private async saveProviderToDatabase(connection: any, dbType: string, provider: AnthropicProvider): Promise<void> {
        if (dbType === 'sqlite') {
            const stmt = connection.prepare(`
                INSERT INTO anthropic_providers (id, name, api_key, is_active, created_at, updated_at)
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
                'INSERT INTO anthropic_providers (id, name, api_key, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
                [provider.id, provider.name, provider.apiKey, provider.isActive, provider.createdAt, provider.updatedAt]
            );
        } else if (dbType === 'postgresql') {
            await connection.query(
                'INSERT INTO anthropic_providers (id, name, api_key, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
                [provider.id, provider.name, provider.apiKey, provider.isActive, provider.createdAt, provider.updatedAt]
            );
        } else if (dbType === 'mongodb') {
            await connection.collection('anthropic_providers').insertOne({
                id: provider.id,
                name: provider.name,
                apiKey: provider.apiKey,
                isActive: provider.isActive,
                createdAt: provider.createdAt,
                updatedAt: provider.updatedAt
            });
        }
    }

    private async getProvidersFromDatabase(connection: any, dbType: string): Promise<AnthropicProvider[]> {
        let rows: any[] = [];

        if (dbType === 'sqlite') {
            const stmt = connection.prepare('SELECT * FROM anthropic_providers ORDER BY created_at DESC');
            rows = stmt.all();
        } else if (dbType === 'mysql') {
            const [results] = await connection.execute('SELECT * FROM anthropic_providers ORDER BY created_at DESC');
            rows = results as any[];
        } else if (dbType === 'postgresql') {
            const result = await connection.query('SELECT * FROM anthropic_providers ORDER BY created_at DESC');
            rows = result.rows;
        } else if (dbType === 'mongodb') {
            const docs = await connection.collection('anthropic_providers').find({}).sort({ createdAt: -1 }).toArray();
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

    private async getProviderFromDatabase(connection: any, dbType: string, id: string): Promise<AnthropicProvider | null> {
        let row: any = null;

        if (dbType === 'sqlite') {
            const stmt = connection.prepare('SELECT * FROM anthropic_providers WHERE id = ?');
            row = stmt.get(id);
        } else if (dbType === 'mysql') {
            const [results] = await connection.execute('SELECT * FROM anthropic_providers WHERE id = ?', [id]);
            const rows = results as any[];
            row = rows.length > 0 ? rows[0] : null;
        } else if (dbType === 'postgresql') {
            const result = await connection.query('SELECT * FROM anthropic_providers WHERE id = $1', [id]);
            row = result.rows.length > 0 ? result.rows[0] : null;
        } else if (dbType === 'mongodb') {
            const doc = await connection.collection('anthropic_providers').findOne({ id });
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

    private async updateProviderInDatabase(connection: any, dbType: string, provider: AnthropicProvider): Promise<void> {
        if (dbType === 'sqlite') {
            const stmt = connection.prepare(`
                UPDATE anthropic_providers
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
                'UPDATE anthropic_providers SET name = ?, api_key = ?, is_active = ?, updated_at = ? WHERE id = ?',
                [provider.name, provider.apiKey, provider.isActive, provider.updatedAt, provider.id]
            );
        } else if (dbType === 'postgresql') {
            await connection.query(
                'UPDATE anthropic_providers SET name = $1, api_key = $2, is_active = $3, updated_at = $4 WHERE id = $5',
                [provider.name, provider.apiKey, provider.isActive, provider.updatedAt, provider.id]
            );
        } else if (dbType === 'mongodb') {
            await connection.collection('anthropic_providers').updateOne(
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
            const stmt = connection.prepare('DELETE FROM anthropic_providers WHERE id = ?');
            stmt.run(id);
        } else if (dbType === 'mysql') {
            await connection.execute('DELETE FROM anthropic_providers WHERE id = ?', [id]);
        } else if (dbType === 'postgresql') {
            await connection.query('DELETE FROM anthropic_providers WHERE id = $1', [id]);
        } else if (dbType === 'mongodb') {
            await connection.collection('anthropic_providers').deleteOne({ id });
        }
    }
}
