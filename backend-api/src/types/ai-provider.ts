export type AIProviderType = 'openai' | 'anthropic' | 'google' | 'replicate' | 'custom';

export interface AIProviderConfig {
    id?: string;
    type: AIProviderType;
    name: string; // Custom name/label for the provider
    apiKey: string;
    endpoint?: string; // Optional custom endpoint URL
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface OpenAIConfig extends AIProviderConfig {
    type: 'openai';
    endpoint?: string; // Default: https://api.openai.com/v1
}

export interface AnthropicConfig extends AIProviderConfig {
    type: 'anthropic';
    endpoint?: string; // Default: https://api.anthropic.com
}

export interface GoogleConfig extends AIProviderConfig {
    type: 'google';
    endpoint?: string; // Default: https://generativelanguage.googleapis.com
}

export interface ReplicateConfig extends AIProviderConfig {
    type: 'replicate';
    endpoint?: string; // Default: https://api.replicate.com
}

export interface CustomConfig extends AIProviderConfig {
    type: 'custom';
    endpoint: string; // Required for custom providers
}

export interface AIProviderTestRequest {
    type: AIProviderType;
    apiKey: string;
    endpoint?: string;
}

export interface AIProviderTestResult {
    success: boolean;
    message: string;
    providerInfo?: {
        type: AIProviderType;
        endpoint: string;
        responseTime?: number;
        model?: string;
    };
    error?: string;
}

export interface AIProviderSaveRequest {
    providers: AIProviderConfig[];
}

export interface AIProviderSaveResponse {
    success: boolean;
    message: string;
    savedProviders?: AIProviderConfig[];
    errors?: string[];
}

// Default endpoints for each provider type
export const DEFAULT_ENDPOINTS: Record<AIProviderType, string | null> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com',
    google: 'https://generativelanguage.googleapis.com',
    replicate: 'https://api.replicate.com',
    custom: null // Custom providers must specify their own endpoint
};

// Validation patterns for API keys (basic format validation)
export const API_KEY_PATTERNS: Record<AIProviderType, RegExp | null> = {
    openai: /^sk-[a-zA-Z0-9]{48,}$/, // OpenAI keys start with 'sk-'
    anthropic: /^sk-ant-[a-zA-Z0-9-_]{95,}$/, // Anthropic keys start with 'sk-ant-'
    google: /^[a-zA-Z0-9_-]{39}$/, // Google API keys are typically 39 characters
    replicate: /^r8_[a-zA-Z0-9]{40}$/, // Replicate keys start with 'r8_'
    custom: null // Custom providers can have any format
};
