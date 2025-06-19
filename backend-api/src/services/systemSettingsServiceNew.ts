import { v4 as uuidv4 } from 'uuid';
import {
    SystemSettings,
    UpdateSystemSettingsRequest,
    SystemSettingsResponse,
    DEFAULT_SYSTEM_SETTINGS
} from '../types/system-settings';
import { UniversalDatabaseService } from './universalDatabaseService';
import { SystemSettingsSchema } from '../schemas';

export class SystemSettingsServiceNew {
    private static instance: SystemSettingsServiceNew;
    private universalDb: UniversalDatabaseService;

    private constructor() {
        this.universalDb = UniversalDatabaseService.getInstance();
    }

    public static getInstance(): SystemSettingsServiceNew {
        if (!SystemSettingsServiceNew.instance) {
            SystemSettingsServiceNew.instance = new SystemSettingsServiceNew();
        }
        return SystemSettingsServiceNew.instance;
    }

    /**
     * Initialize the service by ensuring schema exists
     */
    public async initialize(): Promise<void> {
        await this.universalDb.ensureSchema(SystemSettingsSchema);
    }

    /**
     * Get current system settings
     */
    public async getSystemSettings(): Promise<SystemSettings> {
        try {
            // Try to find existing settings
            const existingSettings = await this.universalDb.findOne<SystemSettings>('system_settings');
            
            if (existingSettings) {
                return existingSettings;
            }

            // If no settings exist, create default settings
            return await this.createDefaultSettings();
        } catch (error) {
            console.error('Error getting system settings:', error);
            // Return default settings if there's an error
            return await this.createDefaultSettings();
        }
    }

    /**
     * Update system settings
     */
    public async updateSystemSettings(updates: UpdateSystemSettingsRequest, updatedBy: string): Promise<SystemSettingsResponse> {
        try {
            const currentSettings = await this.getSystemSettings();

            const updatedSettings: SystemSettings = {
                ...currentSettings,
                ...updates,
                passwordRequirements: {
                    ...currentSettings.passwordRequirements,
                    ...updates.passwordRequirements
                },
                updatedAt: new Date(),
                updatedBy
            };

            // Update the settings using universal database service
            const result = await this.universalDb.update<SystemSettings>(
                'system_settings',
                currentSettings.id,
                updatedSettings
            );

            if (!result.success) {
                throw new Error('Failed to update system settings');
            }

            return {
                success: true,
                message: 'System settings updated successfully',
                settings: updatedSettings
            };
        } catch (error) {
            console.error('Error updating system settings:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return {
                success: false,
                message: `Failed to update system settings: ${errorMessage}`
            };
        }
    }

    /**
     * Create default system settings
     */
    private async createDefaultSettings(): Promise<SystemSettings> {
        const defaultSettings: SystemSettings = {
            id: uuidv4(),
            ...DEFAULT_SYSTEM_SETTINGS,
            createdAt: new Date(),
            updatedAt: new Date(),
            updatedBy: 'system'
        };

        try {
            // Insert default settings using universal database service
            const result = await this.universalDb.insert<SystemSettings>('system_settings', defaultSettings);
            
            if (!result.success) {
                console.error('Failed to create default settings:', result.error);
                // Return the settings object even if insertion failed
                return defaultSettings;
            }

            return defaultSettings;
        } catch (error) {
            console.error('Error creating default settings:', error);
            // Return the settings object even if there's an error
            return defaultSettings;
        }
    }

    /**
     * Reset system settings to defaults
     */
    public async resetToDefaults(updatedBy: string): Promise<SystemSettingsResponse> {
        try {
            const currentSettings = await this.getSystemSettings();
            
            const resetSettings: SystemSettings = {
                ...currentSettings,
                ...DEFAULT_SYSTEM_SETTINGS,
                updatedAt: new Date(),
                updatedBy
            };

            const result = await this.universalDb.update<SystemSettings>(
                'system_settings',
                currentSettings.id,
                resetSettings
            );

            if (!result.success) {
                throw new Error('Failed to reset system settings');
            }

            return {
                success: true,
                message: 'System settings reset to defaults successfully',
                settings: resetSettings
            };
        } catch (error) {
            console.error('Error resetting system settings:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return {
                success: false,
                message: `Failed to reset system settings: ${errorMessage}`
            };
        }
    }

    /**
     * Check if registration is enabled
     */
    public async isRegistrationEnabled(): Promise<boolean> {
        try {
            const settings = await this.getSystemSettings();
            return settings.registrationEnabled;
        } catch (error) {
            console.error('Error checking registration status:', error);
            return DEFAULT_SYSTEM_SETTINGS.registrationEnabled;
        }
    }

    /**
     * Check if login is enabled
     */
    public async isLoginEnabled(): Promise<boolean> {
        try {
            const settings = await this.getSystemSettings();
            return settings.loginEnabled;
        } catch (error) {
            console.error('Error checking login status:', error);
            return DEFAULT_SYSTEM_SETTINGS.loginEnabled;
        }
    }

    /**
     * Get maximum users allowed
     */
    public async getMaxUsersAllowed(): Promise<number | null> {
        try {
            const settings = await this.getSystemSettings();
            return settings.maxUsersAllowed || null;
        } catch (error) {
            console.error('Error getting max users allowed:', error);
            return DEFAULT_SYSTEM_SETTINGS.maxUsersAllowed || null;
        }
    }

    /**
     * Get default user role
     */
    public async getDefaultUserRole(): Promise<'normal' | 'subscribed'> {
        try {
            const settings = await this.getSystemSettings();
            return settings.defaultUserRole;
        } catch (error) {
            console.error('Error getting default user role:', error);
            return DEFAULT_SYSTEM_SETTINGS.defaultUserRole;
        }
    }
}
