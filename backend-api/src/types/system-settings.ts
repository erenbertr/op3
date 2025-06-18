export interface SystemSettings {
    id: string;
    registrationEnabled: boolean;
    loginEnabled: boolean;
    maxUsersAllowed?: number;
    defaultUserRole: 'normal' | 'subscribed';
    requireEmailVerification: boolean;
    allowUsernameChange: boolean;
    passwordRequirements: {
        minLength: number;
        requireUppercase: boolean;
        requireLowercase: boolean;
        requireNumbers: boolean;
        requireSpecialChars: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
    updatedBy: string; // Admin user ID who last updated
}

export interface UpdateSystemSettingsRequest {
    registrationEnabled?: boolean;
    loginEnabled?: boolean;
    maxUsersAllowed?: number;
    defaultUserRole?: 'normal' | 'subscribed';
    requireEmailVerification?: boolean;
    allowUsernameChange?: boolean;
    passwordRequirements?: {
        minLength?: number;
        requireUppercase?: boolean;
        requireLowercase?: boolean;
        requireNumbers?: boolean;
        requireSpecialChars?: boolean;
    };
}

export interface SystemSettingsResponse {
    success: boolean;
    message: string;
    settings?: SystemSettings;
}

export const DEFAULT_SYSTEM_SETTINGS: Omit<SystemSettings, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy'> = {
    registrationEnabled: true,
    loginEnabled: true,
    maxUsersAllowed: undefined, // No limit
    defaultUserRole: 'normal',
    requireEmailVerification: false,
    allowUsernameChange: true,
    passwordRequirements: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
    }
};
