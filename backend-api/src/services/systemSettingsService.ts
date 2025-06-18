import { v4 as uuidv4 } from 'uuid';
import {
    SystemSettings,
    UpdateSystemSettingsRequest,
    SystemSettingsResponse,
    DEFAULT_SYSTEM_SETTINGS
} from '../types/system-settings';
import { DatabaseManager } from '../config/database';

export class SystemSettingsService {
    private static instance: SystemSettingsService;
    private dbManager: DatabaseManager;

    private constructor() {
        this.dbManager = DatabaseManager.getInstance();
    }

    public static getInstance(): SystemSettingsService {
        if (!SystemSettingsService.instance) {
            SystemSettingsService.instance = new SystemSettingsService();
        }
        return SystemSettingsService.instance;
    }

    /**
     * Get current system settings
     */
    public async getSystemSettings(): Promise<SystemSettings> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();

            switch (config.type) {
                case 'mongodb':
                    const mongoSettings = await connection.collection('system_settings').findOne({});
                    return mongoSettings ? this.mapMongoSettings(mongoSettings) : await this.createDefaultSettings();

                case 'mysql':
                case 'postgresql':
                    const query = 'SELECT * FROM system_settings LIMIT 1';
                    const [rows] = await connection.execute(query);
                    return rows.length > 0 ? this.mapSQLSettings(rows[0]) : await this.createDefaultSettings();

                case 'localdb':
                    return new Promise(async (resolve, reject) => {
                        connection.get('SELECT * FROM system_settings LIMIT 1', [], async (err: any, row: any) => {
                            if (err) {
                                // If table doesn't exist, create default settings
                                if (err.code === 'SQLITE_ERROR' && err.message.includes('no such table')) {
                                    try {
                                        const defaultSettings = await this.createDefaultSettings();
                                        resolve(defaultSettings);
                                    } catch (createError) {
                                        reject(createError);
                                    }
                                } else {
                                    reject(err);
                                }
                            } else {
                                resolve(row ? this.mapSQLSettings(row) : await this.createDefaultSettings());
                            }
                        });
                    });

                case 'supabase':
                    const { data, error } = await connection
                        .from('system_settings')
                        .select('*')
                        .limit(1)
                        .single();

                    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
                        throw error;
                    }
                    return data ? this.mapSupabaseSettings(data) : await this.createDefaultSettings();

                default:
                    throw new Error(`Database type ${config.type} not supported for system settings operations yet`);
            }
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

            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();

            switch (config.type) {
                case 'mongodb':
                    await this.saveSettingsMongoDB(connection, updatedSettings);
                    break;

                case 'mysql':
                    await this.saveSettingsMySQL(connection, updatedSettings);
                    break;

                case 'postgresql':
                    await this.saveSettingsPostgreSQL(connection, updatedSettings);
                    break;

                case 'localdb':
                    await this.saveSettingsSQLite(connection, updatedSettings);
                    break;

                case 'supabase':
                    await this.saveSettingsSupabase(connection, updatedSettings);
                    break;

                default:
                    throw new Error(`Database type ${config.type} not supported for system settings operations yet`);
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
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                return defaultSettings;
            }

            const connection = await this.dbManager.getConnection();

            switch (config.type) {
                case 'mongodb':
                    await this.saveSettingsMongoDB(connection, defaultSettings);
                    break;

                case 'mysql':
                    await this.saveSettingsMySQL(connection, defaultSettings);
                    break;

                case 'postgresql':
                    await this.saveSettingsPostgreSQL(connection, defaultSettings);
                    break;

                case 'localdb':
                    await this.saveSettingsSQLite(connection, defaultSettings);
                    break;

                case 'supabase':
                    await this.saveSettingsSupabase(connection, defaultSettings);
                    break;
            }
        } catch (error) {
            console.error('Error creating default settings:', error);
        }

        return defaultSettings;
    }

    // Database-specific save methods
    private async saveSettingsMongoDB(connection: any, settings: SystemSettings): Promise<void> {
        await connection.collection('system_settings').replaceOne(
            { id: settings.id },
            settings,
            { upsert: true }
        );
    }

    private async saveSettingsMySQL(connection: any, settings: SystemSettings): Promise<void> {
        // Create table if it doesn't exist
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS system_settings (
                id VARCHAR(36) PRIMARY KEY,
                registrationEnabled BOOLEAN NOT NULL,
                loginEnabled BOOLEAN NOT NULL,
                maxUsersAllowed INT,
                defaultUserRole ENUM('normal', 'subscribed') NOT NULL,
                requireEmailVerification BOOLEAN NOT NULL,
                allowUsernameChange BOOLEAN NOT NULL,
                passwordRequirements JSON NOT NULL,
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL,
                updatedBy VARCHAR(36) NOT NULL
            )
        `);

        await connection.execute(`
            INSERT INTO system_settings (
                id, registrationEnabled, loginEnabled, maxUsersAllowed, defaultUserRole,
                requireEmailVerification, allowUsernameChange, passwordRequirements,
                createdAt, updatedAt, updatedBy
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                registrationEnabled = VALUES(registrationEnabled),
                loginEnabled = VALUES(loginEnabled),
                maxUsersAllowed = VALUES(maxUsersAllowed),
                defaultUserRole = VALUES(defaultUserRole),
                requireEmailVerification = VALUES(requireEmailVerification),
                allowUsernameChange = VALUES(allowUsernameChange),
                passwordRequirements = VALUES(passwordRequirements),
                updatedAt = VALUES(updatedAt),
                updatedBy = VALUES(updatedBy)
        `, [
            settings.id, settings.registrationEnabled, settings.loginEnabled,
            settings.maxUsersAllowed, settings.defaultUserRole,
            settings.requireEmailVerification, settings.allowUsernameChange,
            JSON.stringify(settings.passwordRequirements),
            settings.createdAt, settings.updatedAt, settings.updatedBy
        ]);
    }

    private async saveSettingsPostgreSQL(connection: any, settings: SystemSettings): Promise<void> {
        // Create table if it doesn't exist
        await connection.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                id VARCHAR(36) PRIMARY KEY,
                "registrationEnabled" BOOLEAN NOT NULL,
                "loginEnabled" BOOLEAN NOT NULL,
                "maxUsersAllowed" INTEGER,
                "defaultUserRole" VARCHAR(20) NOT NULL CHECK ("defaultUserRole" IN ('normal', 'subscribed')),
                "requireEmailVerification" BOOLEAN NOT NULL,
                "allowUsernameChange" BOOLEAN NOT NULL,
                "passwordRequirements" JSONB NOT NULL,
                "createdAt" TIMESTAMP NOT NULL,
                "updatedAt" TIMESTAMP NOT NULL,
                "updatedBy" VARCHAR(36) NOT NULL
            )
        `);

        await connection.query(`
            INSERT INTO system_settings (
                id, "registrationEnabled", "loginEnabled", "maxUsersAllowed", "defaultUserRole",
                "requireEmailVerification", "allowUsernameChange", "passwordRequirements",
                "createdAt", "updatedAt", "updatedBy"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (id) DO UPDATE SET
                "registrationEnabled" = EXCLUDED."registrationEnabled",
                "loginEnabled" = EXCLUDED."loginEnabled",
                "maxUsersAllowed" = EXCLUDED."maxUsersAllowed",
                "defaultUserRole" = EXCLUDED."defaultUserRole",
                "requireEmailVerification" = EXCLUDED."requireEmailVerification",
                "allowUsernameChange" = EXCLUDED."allowUsernameChange",
                "passwordRequirements" = EXCLUDED."passwordRequirements",
                "updatedAt" = EXCLUDED."updatedAt",
                "updatedBy" = EXCLUDED."updatedBy"
        `, [
            settings.id, settings.registrationEnabled, settings.loginEnabled,
            settings.maxUsersAllowed, settings.defaultUserRole,
            settings.requireEmailVerification, settings.allowUsernameChange,
            JSON.stringify(settings.passwordRequirements),
            settings.createdAt, settings.updatedAt, settings.updatedBy
        ]);
    }

    private async saveSettingsSQLite(connection: any, settings: SystemSettings): Promise<void> {
        return new Promise((resolve, reject) => {
            // Create table if it doesn't exist
            connection.run(`
                CREATE TABLE IF NOT EXISTS system_settings (
                    id TEXT PRIMARY KEY,
                    registrationEnabled INTEGER NOT NULL,
                    loginEnabled INTEGER NOT NULL,
                    maxUsersAllowed INTEGER,
                    defaultUserRole TEXT NOT NULL CHECK (defaultUserRole IN ('normal', 'subscribed')),
                    requireEmailVerification INTEGER NOT NULL,
                    allowUsernameChange INTEGER NOT NULL,
                    passwordRequirements TEXT NOT NULL,
                    createdAt TEXT NOT NULL,
                    updatedAt TEXT NOT NULL,
                    updatedBy TEXT NOT NULL
                )
            `, (err: any) => {
                if (err) {
                    reject(err);
                    return;
                }

                connection.run(`
                    INSERT OR REPLACE INTO system_settings (
                        id, registrationEnabled, loginEnabled, maxUsersAllowed, defaultUserRole,
                        requireEmailVerification, allowUsernameChange, passwordRequirements,
                        createdAt, updatedAt, updatedBy
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    settings.id, settings.registrationEnabled ? 1 : 0, settings.loginEnabled ? 1 : 0,
                    settings.maxUsersAllowed, settings.defaultUserRole,
                    settings.requireEmailVerification ? 1 : 0, settings.allowUsernameChange ? 1 : 0,
                    JSON.stringify(settings.passwordRequirements),
                    settings.createdAt.toISOString(), settings.updatedAt.toISOString(), settings.updatedBy
                ], (err: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        });
    }

    private async saveSettingsSupabase(connection: any, settings: SystemSettings): Promise<void> {
        const { error } = await connection
            .from('system_settings')
            .upsert({
                id: settings.id,
                registrationEnabled: settings.registrationEnabled,
                loginEnabled: settings.loginEnabled,
                maxUsersAllowed: settings.maxUsersAllowed,
                defaultUserRole: settings.defaultUserRole,
                requireEmailVerification: settings.requireEmailVerification,
                allowUsernameChange: settings.allowUsernameChange,
                passwordRequirements: settings.passwordRequirements,
                createdAt: settings.createdAt.toISOString(),
                updatedAt: settings.updatedAt.toISOString(),
                updatedBy: settings.updatedBy
            });

        if (error) {
            throw error;
        }
    }

    // Mapping methods for different database types
    private mapMongoSettings(mongoSettings: any): SystemSettings {
        return {
            id: mongoSettings.id,
            registrationEnabled: mongoSettings.registrationEnabled,
            loginEnabled: mongoSettings.loginEnabled,
            maxUsersAllowed: mongoSettings.maxUsersAllowed,
            defaultUserRole: mongoSettings.defaultUserRole,
            requireEmailVerification: mongoSettings.requireEmailVerification,
            allowUsernameChange: mongoSettings.allowUsernameChange,
            passwordRequirements: mongoSettings.passwordRequirements,
            createdAt: new Date(mongoSettings.createdAt),
            updatedAt: new Date(mongoSettings.updatedAt),
            updatedBy: mongoSettings.updatedBy
        };
    }

    private mapSQLSettings(sqlSettings: any): SystemSettings {
        return {
            id: sqlSettings.id,
            registrationEnabled: Boolean(sqlSettings.registrationEnabled),
            loginEnabled: Boolean(sqlSettings.loginEnabled),
            maxUsersAllowed: sqlSettings.maxUsersAllowed,
            defaultUserRole: sqlSettings.defaultUserRole,
            requireEmailVerification: Boolean(sqlSettings.requireEmailVerification),
            allowUsernameChange: Boolean(sqlSettings.allowUsernameChange),
            passwordRequirements: typeof sqlSettings.passwordRequirements === 'string'
                ? JSON.parse(sqlSettings.passwordRequirements)
                : sqlSettings.passwordRequirements,
            createdAt: new Date(sqlSettings.createdAt),
            updatedAt: new Date(sqlSettings.updatedAt),
            updatedBy: sqlSettings.updatedBy
        };
    }

    private mapSupabaseSettings(supabaseSettings: any): SystemSettings {
        return {
            id: supabaseSettings.id,
            registrationEnabled: supabaseSettings.registrationEnabled,
            loginEnabled: supabaseSettings.loginEnabled,
            maxUsersAllowed: supabaseSettings.maxUsersAllowed,
            defaultUserRole: supabaseSettings.defaultUserRole,
            requireEmailVerification: supabaseSettings.requireEmailVerification,
            allowUsernameChange: supabaseSettings.allowUsernameChange,
            passwordRequirements: supabaseSettings.passwordRequirements,
            createdAt: new Date(supabaseSettings.createdAt),
            updatedAt: new Date(supabaseSettings.updatedAt),
            updatedBy: supabaseSettings.updatedBy
        };
    }
}
