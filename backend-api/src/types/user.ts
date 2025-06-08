export type UserRole = 'admin' | 'subscribed' | 'normal';

export interface User {
    id: string;
    email: string;
    username?: string;
    password: string; // hashed
    role: UserRole;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date;
    // Admin specific fields
    permissions?: string[];
    // Subscribed user specific fields
    subscriptionId?: string;
    subscriptionExpiry?: Date;
    // Profile fields
    firstName?: string;
    lastName?: string;
    avatar?: string;
}

export interface AdminConfig {
    email: string;
    username?: string;
    password: string;
    confirmPassword: string;
}

export interface CreateUserRequest {
    email: string;
    username?: string;
    password: string;
    role: UserRole;
    firstName?: string;
    lastName?: string;
}

export interface CreateUserResponse {
    success: boolean;
    message: string;
    user?: {
        id: string;
        email: string;
        username?: string;
        role: UserRole;
        createdAt: Date;
    };
}

export interface UserValidationError {
    field: string;
    message: string;
}

export interface PasswordRequirements {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
}

export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
};
