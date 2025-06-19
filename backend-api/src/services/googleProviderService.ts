import crypto from 'crypto';
import { DatabaseManager } from '../config/database';

export interface GoogleProvider {
    id: string;
    name: string;
    apiKey: string; // This will be encrypted in the database
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateGoogleProviderRequest {
    name: string;
    apiKey: string;
    isActive?: boolean;
}

export interface UpdateGoogleProviderRequest {
    name?: string;
    apiKey?: string;
    isActive?: boolean;
}

export interface GoogleProviderResponse {
    success: boolean;
    message: string;
    provider?: GoogleProvider;
    providers?: GoogleProvider[];
    error?: string;
}

export class GoogleProviderService {
    private dbManager: DatabaseManager;
    private encryptionKey: string;

    constructor() {
        this.dbManager = DatabaseManager.getInstance();
        this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    }

    // Validate API key format
    private validateApiKeyFormat(apiKey: string): boolean {
        // Google API keys are variable length, at least 20 characters
        return /^[a-zA-Z0-9_-]{20,}$/.test(apiKey);
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

    // Create a new Google provider
    public async createProvider(request: CreateGoogleProviderRequest): Promise<GoogleProviderResponse> {
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
                    message: 'Invalid Google API key format. Keys should be at least 20 characters long.',
                    error: 'VALIDATION_ERROR'
                };
            }

            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            const encryptedApiKey = this.encryptApiKey(request.apiKey);

            const provider: GoogleProvider = {
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
                message: 'Google provider created successfully',
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

    // Get all Google providers
    public async getProviders(): Promise<GoogleProviderResponse> {
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

    // Update a Google provider
    public async updateProvider(id: string, request: UpdateGoogleProviderRequest): Promise<GoogleProviderResponse> {
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
                    message: 'Google provider not found',
                    error: 'NOT_FOUND'
                };
            }

            // Validate API key if provided
            if (request.apiKey && !this.validateApiKeyFormat(request.apiKey)) {
                return {
                    success: false,
                    message: 'Invalid Google API key format. Keys should be at least 20 characters long.',
                    error: 'VALIDATION_ERROR'
                };
            }

            const updatedProvider: GoogleProvider = {
                ...existingProvider,
                name: request.name?.trim() ?? existingProvider.name,
                apiKey: request.apiKey ? this.encryptApiKey(request.apiKey) : existingProvider.apiKey,
                isActive: request.isActive ?? existingProvider.isActive,
                updatedAt: new Date()
            };

            await this.updateProviderInDatabase(connection, config.type, updatedProvider);

            return {
                success: true,
                message: 'Google provider updated successfully',
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

    // Delete a Google provider
    public async deleteProvider(id: string): Promise<GoogleProviderResponse> {
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
                    message: 'Google provider not found',
                    error: 'NOT_FOUND'
                };
            }

            await this.deleteProviderFromDatabase(connection, config.type, id);

            return {
                success: true,
                message: 'Google provider deleted successfully'
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
    public async testApiKey(id: string): Promise<GoogleProviderResponse> {
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
                    message: 'Google provider not found',
                    error: 'NOT_FOUND'
                };
            }

            const decryptedApiKey = this.decryptApiKey(provider.apiKey);

            // Test the API key with a models list request
            const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${decryptedApiKey}`);

            if (response.ok) {
                return {
                    success: true,
                    message: 'Google API key is valid'
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
    private async saveProviderToDatabase(connection: any, dbType: string, provider: GoogleProvider): Promise<void> {
        if (dbType === 'sqlite') {
            const stmt = connection.prepare(`
                INSERT INTO google_providers (id, name, api_key, is_active, created_at, updated_at)
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
                'INSERT INTO google_providers (id, name, api_key, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
                [provider.id, provider.name, provider.apiKey, provider.isActive, provider.createdAt, provider.updatedAt]
            );
        } else if (dbType === 'postgresql') {
            await connection.query(
                'INSERT INTO google_providers (id, name, api_key, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
                [provider.id, provider.name, provider.apiKey, provider.isActive, provider.createdAt, provider.updatedAt]
            );
        } else if (dbType === 'mongodb') {
            await connection.collection('google_providers').insertOne({
                id: provider.id,
                name: provider.name,
                apiKey: provider.apiKey,
                isActive: provider.isActive,
                createdAt: provider.createdAt,
                updatedAt: provider.updatedAt
            });
        }
    }

    private async getProvidersFromDatabase(connection: any, dbType: string): Promise<GoogleProvider[]> {
        if (dbType === 'sqlite') {
            const stmt = connection.prepare('SELECT * FROM google_providers ORDER BY created_at DESC');
            const rows = stmt.all();
            return rows.map((row: any) => ({
                id: row.id,
                name: row.name,
                apiKey: row.api_key,
                isActive: Boolean(row.is_active),
                createdAt: new Date(row.created_at),
                updatedAt: new Date(row.updated_at)
            }));
        } else if (dbType === 'mysql') {
            const [results] = await connection.execute('SELECT * FROM google_providers ORDER BY created_at DESC');
            const rows = results as any[];
            return rows.map(row => ({
                id: row.id,
                name: row.name,
                apiKey: row.api_key,
                isActive: row.is_active,
                createdAt: new Date(row.created_at),
                updatedAt: new Date(row.updated_at)
            }));
        } else if (dbType === 'postgresql') {
            const result = await connection.query('SELECT * FROM google_providers ORDER BY created_at DESC');
            return result.rows.map((row: any) => ({
                id: row.id,
                name: row.name,
                apiKey: row.api_key,
                isActive: row.is_active,
                createdAt: new Date(row.created_at),
                updatedAt: new Date(row.updated_at)
            }));
        } else if (dbType === 'mongodb') {
            const docs = await connection.collection('google_providers').find({}).sort({ createdAt: -1 }).toArray();
            return docs.map((doc: any) => ({
                id: doc.id,
                name: doc.name,
                apiKey: doc.apiKey,
                isActive: doc.isActive,
                createdAt: new Date(doc.createdAt),
                updatedAt: new Date(doc.updatedAt)
            }));
        }

        return [];
    }

    private async getProviderFromDatabase(connection: any, dbType: string, id: string): Promise<GoogleProvider | null> {
        if (dbType === 'sqlite') {
            const stmt = connection.prepare('SELECT * FROM google_providers WHERE id = ?');
            const row = stmt.get(id);
            if (!row) return null;
            return {
                id: row.id,
                name: row.name,
                apiKey: row.api_key,
                isActive: Boolean(row.is_active),
                createdAt: new Date(row.created_at),
                updatedAt: new Date(row.updated_at)
            };
        } else if (dbType === 'mysql') {
            const [results] = await connection.execute('SELECT * FROM google_providers WHERE id = ?', [id]);
            const rows = results as any[];
            const row = rows.length > 0 ? rows[0] : null;
            if (!row) return null;
            return {
                id: row.id,
                name: row.name,
                apiKey: row.api_key,
                isActive: row.is_active,
                createdAt: new Date(row.created_at),
                updatedAt: new Date(row.updated_at)
            };
        } else if (dbType === 'postgresql') {
            const result = await connection.query('SELECT * FROM google_providers WHERE id = $1', [id]);
            const row = result.rows.length > 0 ? result.rows[0] : null;
            if (!row) return null;
            return {
                id: row.id,
                name: row.name,
                apiKey: row.api_key,
                isActive: row.is_active,
                createdAt: new Date(row.created_at),
                updatedAt: new Date(row.updated_at)
            };
        } else if (dbType === 'mongodb') {
            const doc = await connection.collection('google_providers').findOne({ id });
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

        return null;
    }

    private async updateProviderInDatabase(connection: any, dbType: string, provider: GoogleProvider): Promise<void> {
        if (dbType === 'sqlite') {
            const stmt = connection.prepare(`
                UPDATE google_providers
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
                'UPDATE google_providers SET name = ?, api_key = ?, is_active = ?, updated_at = ? WHERE id = ?',
                [provider.name, provider.apiKey, provider.isActive, provider.updatedAt, provider.id]
            );
        } else if (dbType === 'postgresql') {
            await connection.query(
                'UPDATE google_providers SET name = $1, api_key = $2, is_active = $3, updated_at = $4 WHERE id = $5',
                [provider.name, provider.apiKey, provider.isActive, provider.updatedAt, provider.id]
            );
        } else if (dbType === 'mongodb') {
            await connection.collection('google_providers').updateOne(
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
            const stmt = connection.prepare('DELETE FROM google_providers WHERE id = ?');
            stmt.run(id);
        } else if (dbType === 'mysql') {
            await connection.execute('DELETE FROM google_providers WHERE id = ?', [id]);
        } else if (dbType === 'postgresql') {
            await connection.query('DELETE FROM google_providers WHERE id = $1', [id]);
        } else if (dbType === 'mongodb') {
            await connection.collection('google_providers').deleteOne({ id });
        }
    }
}
