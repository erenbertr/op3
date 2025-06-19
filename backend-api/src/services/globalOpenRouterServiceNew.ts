import { UniversalDatabaseService } from './universalDatabaseService';
import {
    GlobalOpenRouterSettings,
    SaveGlobalOpenRouterSettingsRequest,
    SaveGlobalOpenRouterSettingsResponse,
    GetGlobalOpenRouterSettingsResponse
} from '../types/global-openrouter-settings';
import {
    ValidateOpenRouterApiKeyRequest,
    ValidateOpenRouterApiKeyResponse
} from '../types/workspace-settings';
import { AIProviderService } from './aiProviderService';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

/**
 * New Global OpenRouter Service using Universal Database Abstraction
 * Reduced from complex database-specific code to simple universal operations
 */
export class GlobalOpenRouterServiceNew {
    private static instance: GlobalOpenRouterServiceNew;
    private universalDb: UniversalDatabaseService;
    private aiProviderService: AIProviderService;
    private encryptionKey: string;

    private constructor() {
        this.universalDb = UniversalDatabaseService.getInstance();
        this.aiProviderService = AIProviderService.getInstance();
        this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    }

    public static getInstance(): GlobalOpenRouterServiceNew {
        if (!GlobalOpenRouterServiceNew.instance) {
            GlobalOpenRouterServiceNew.instance = new GlobalOpenRouterServiceNew();
        }
        return GlobalOpenRouterServiceNew.instance;
    }

    /**
     * Save global OpenRouter settings - ONE SIMPLE METHOD FOR ALL DATABASES!
     */
    async saveSettings(request: SaveGlobalOpenRouterSettingsRequest): Promise<SaveGlobalOpenRouterSettingsResponse> {
        try {
            // Validate required fields
            if (!request.apiKey || !request.selectedModels || request.selectedModels.length === 0) {
                return {
                    success: false,
                    message: 'API key and at least one selected model are required'
                };
            }

            // Encrypt the API key
            const encryptedApiKey = this.encryptApiKey(request.apiKey);

            // Check if settings already exist
            const existingSettings = await this.getExistingSettings();

            const settingsData: GlobalOpenRouterSettings = {
                id: existingSettings?.id || uuidv4(),
                apiKey: encryptedApiKey,
                selectedModels: request.selectedModels,
                isEnabled: request.isEnabled !== undefined ? request.isEnabled : true,
                createdAt: existingSettings?.createdAt || new Date(),
                updatedAt: new Date()
            };

            let result;
            if (existingSettings && existingSettings.id) {
                // Update existing settings - works with ANY database type!
                result = await this.universalDb.update<GlobalOpenRouterSettings>(
                    'global_openrouter_settings',
                    existingSettings.id,
                    {
                        apiKey: settingsData.apiKey,
                        selectedModels: settingsData.selectedModels,
                        isEnabled: settingsData.isEnabled,
                        updatedAt: settingsData.updatedAt
                    }
                );
            } else {
                // Create new settings - works with ANY database type!
                result = await this.universalDb.insert<GlobalOpenRouterSettings>('global_openrouter_settings', settingsData);
            }

            if (result.success || (result as any).modifiedCount > 0) {
                return {
                    success: true,
                    message: 'Global OpenRouter settings saved successfully',
                    settings: {
                        ...settingsData,
                        apiKey: '***' // Don't return the actual API key
                    }
                };
            } else {
                throw new Error('Failed to save settings');
            }
        } catch (error) {
            console.error('Error saving global OpenRouter settings:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to save settings'
            };
        }
    }

    /**
     * Get global OpenRouter settings - ONE SIMPLE METHOD FOR ALL DATABASES!
     */
    async getSettings(): Promise<GetGlobalOpenRouterSettingsResponse> {
        try {
            const settings = await this.getExistingSettings();

            if (!settings) {
                return {
                    success: true,
                    message: 'No global OpenRouter settings found'
                };
            }

            // Decrypt the API key for internal use
            let decryptedApiKey: string;
            try {
                decryptedApiKey = this.decryptApiKey(settings.apiKey);
            } catch (error) {
                console.error('Error decrypting API key:', error);
                return {
                    success: false,
                    message: 'Failed to decrypt API key'
                };
            }

            return {
                success: true,
                message: 'Global OpenRouter settings retrieved successfully',
                settings: {
                    ...settings,
                    apiKey: decryptedApiKey
                }
            };
        } catch (error) {
            console.error('Error getting global OpenRouter settings:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to get settings'
            };
        }
    }

    /**
     * Delete global OpenRouter settings - ONE SIMPLE METHOD FOR ALL DATABASES!
     */
    async deleteSettings(): Promise<{ success: boolean; message: string }> {
        try {
            const existingSettings = await this.getExistingSettings();

            if (!existingSettings) {
                return {
                    success: false,
                    message: 'No settings found to delete'
                };
            }

            // Delete settings - works with ANY database type!
            if (!existingSettings.id) {
                return {
                    success: false,
                    message: 'Settings ID is missing'
                };
            }
            const result = await this.universalDb.delete('global_openrouter_settings', existingSettings.id);

            if (result.deletedCount > 0) {
                return {
                    success: true,
                    message: 'Global OpenRouter settings deleted successfully'
                };
            } else {
                return {
                    success: false,
                    message: 'Failed to delete settings'
                };
            }
        } catch (error) {
            console.error('Error deleting global OpenRouter settings:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to delete settings'
            };
        }
    }

    /**
     * Toggle settings enabled status - ONE SIMPLE METHOD FOR ALL DATABASES!
     */
    async toggleEnabled(): Promise<{ success: boolean; message: string; isEnabled?: boolean }> {
        try {
            const existingSettings = await this.getExistingSettings();

            if (!existingSettings) {
                return {
                    success: false,
                    message: 'No settings found to toggle'
                };
            }

            if (!existingSettings.id) {
                return {
                    success: false,
                    message: 'Settings ID is missing'
                };
            }

            const newStatus = !existingSettings.isEnabled;
            const result = await this.universalDb.update<GlobalOpenRouterSettings>(
                'global_openrouter_settings',
                existingSettings.id,
                {
                    isEnabled: newStatus,
                    updatedAt: new Date()
                }
            );

            if (result.modifiedCount > 0) {
                return {
                    success: true,
                    message: `Global OpenRouter settings ${newStatus ? 'enabled' : 'disabled'} successfully`,
                    isEnabled: newStatus
                };
            } else {
                return {
                    success: false,
                    message: 'Failed to toggle settings status'
                };
            }
        } catch (error) {
            console.error('Error toggling global OpenRouter settings:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to toggle settings'
            };
        }
    }

    /**
     * Check if global OpenRouter is configured and enabled - ONE SIMPLE METHOD FOR ALL DATABASES!
     */
    async isConfiguredAndEnabled(): Promise<boolean> {
        try {
            const settings = await this.getExistingSettings();
            return !!(settings && settings.isEnabled && settings.apiKey && settings.selectedModels.length > 0);
        } catch (error) {
            console.error('Error checking if global OpenRouter is configured:', error);
            return false;
        }
    }

    /**
     * Validate OpenRouter API key and fetch models - ONE SIMPLE METHOD FOR ALL DATABASES!
     */
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

    /**
     * Get available models using saved API key - ONE SIMPLE METHOD FOR ALL DATABASES!
     */
    public async getAvailableModels(): Promise<ValidateOpenRouterApiKeyResponse> {
        try {
            const settings = await this.getExistingSettings();
            if (!settings || !settings.apiKey) {
                return {
                    success: false,
                    message: 'No API key configured',
                    error: 'NO_API_KEY'
                };
            }

            // Decrypt the API key
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

    /**
     * Update only selected models (keeping existing API key) - ONE SIMPLE METHOD FOR ALL DATABASES!
     */
    public async updateSelectedModels(selectedModels: string[]): Promise<SaveGlobalOpenRouterSettingsResponse> {
        try {
            if (!Array.isArray(selectedModels) || selectedModels.length === 0) {
                return {
                    success: false,
                    message: 'At least one model must be selected'
                };
            }

            const existingSettings = await this.getExistingSettings();
            if (!existingSettings) {
                return {
                    success: false,
                    message: 'No existing settings found. Please configure API key first.'
                };
            }

            if (!existingSettings.id) {
                return {
                    success: false,
                    message: 'Settings ID is missing'
                };
            }

            // Update only the selected models and updatedAt timestamp
            const result = await this.universalDb.update<GlobalOpenRouterSettings>(
                'global_openrouter_settings',
                existingSettings.id,
                {
                    selectedModels: selectedModels,
                    updatedAt: new Date()
                }
            );

            if (result.success || (result as any).modifiedCount > 0) {
                return {
                    success: true,
                    message: 'Selected models updated successfully',
                    settings: {
                        ...existingSettings,
                        selectedModels: selectedModels,
                        apiKey: '***' // Don't return the actual API key
                    }
                };
            } else {
                throw new Error('Failed to update selected models');
            }
        } catch (error) {
            console.error('Error updating selected models:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to update selected models'
            };
        }
    }

    // ==================== HELPER METHODS ====================

    /**
     * Get existing settings - ONE SIMPLE METHOD FOR ALL DATABASES!
     */
    private async getExistingSettings(): Promise<GlobalOpenRouterSettings | null> {
        try {
            const result = await this.universalDb.findMany<GlobalOpenRouterSettings>('global_openrouter_settings', {
                limit: 1,
                orderBy: [{ field: 'createdAt', direction: 'desc' }]
            });
            return result.data.length > 0 ? result.data[0] : null;
        } catch (error) {
            console.error('Error getting existing settings:', error);
            return null;
        }
    }

    /**
     * Encrypt API key for secure storage
     */
    private encryptApiKey(apiKey: string): string {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey.padEnd(32, '0').slice(0, 32)), iv);
        let encrypted = cipher.update(apiKey, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }

    /**
     * Decrypt API key for use
     */
    private decryptApiKey(encryptedApiKey: string): string {
        try {
            const parts = encryptedApiKey.split(':');
            if (parts.length !== 2) {
                throw new Error(`Invalid encrypted API key format. Expected 'iv:encryptedText', got ${parts.length} parts`);
            }

            const ivHex = parts[0];
            const encryptedText = parts[1];

            if (!ivHex || !encryptedText) {
                throw new Error('Invalid encrypted API key: missing IV or encrypted text');
            }

            const iv = Buffer.from(ivHex, 'hex');
            if (iv.length !== 16) {
                throw new Error(`Invalid initialization vector length. Expected 16 bytes, got ${iv.length} bytes`);
            }

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

    /**
     * Initialize global OpenRouter settings schema - ONE SIMPLE METHOD FOR ALL DATABASES!
     */
    public async initializeSchema(): Promise<void> {
        try {
            const schema = this.universalDb.getSchemaByTableName('global_openrouter_settings');
            if (schema) {
                await this.universalDb.ensureSchema(schema);
            }
        } catch (error) {
            console.error('Error initializing global OpenRouter settings schema:', error);
        }
    }
}

// AMAZING REDUCTION: Complex database-specific code eliminated!
// All switch statements replaced with universal operations!
// Same functionality, universal compatibility!
