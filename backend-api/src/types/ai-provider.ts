export type AIProviderType = 'openai' | 'anthropic' | 'google' | 'replicate' | 'openrouter' | 'custom';

export interface AIProviderConfig {
    id?: string;
    type: AIProviderType;
    name: string; // Custom name/label for the provider
    apiKey: string;
    model: string; // AI model to use (e.g., gpt-4, claude-3-sonnet, gemini-pro)
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

export interface OpenRouterConfig extends AIProviderConfig {
    type: 'openrouter';
    endpoint?: string; // Default: https://openrouter.ai/api/v1
}

export interface CustomConfig extends AIProviderConfig {
    type: 'custom';
    endpoint: string; // Required for custom providers
}

export interface AIProviderTestRequest {
    type: AIProviderType;
    apiKey: string;
    model: string;
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
    openrouter: 'https://openrouter.ai/api/v1',
    custom: null // Custom providers must specify their own endpoint
};

// Default models for each provider type
export const DEFAULT_MODELS: Record<AIProviderType, string[]> = {
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    google: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro', 'gemini-pro-vision'],
    replicate: [], // Allow custom model input for Replicate
    openrouter: [], // OpenRouter models are fetched dynamically from API
    custom: [] // Custom providers can specify any model
};

// Validation patterns for API keys (basic format validation)
export const API_KEY_PATTERNS: Record<AIProviderType, RegExp | null> = {
    openai: /^sk-[a-zA-Z0-9-_]{20,}$/, // OpenAI keys start with 'sk-' and have at least 20 chars after (including hyphens for proj keys)
    anthropic: /^sk-ant-[a-zA-Z0-9-_]{95,}$/, // Anthropic keys start with 'sk-ant-'
    google: /^[a-zA-Z0-9_-]{20,}$/, // Google API keys are variable length, at least 20 chars
    replicate: /^r8_[a-zA-Z0-9]{40}$/, // Replicate keys start with 'r8_'
    openrouter: /^sk-or-v1-[a-zA-Z0-9-_]{64}$/, // OpenRouter keys start with 'sk-or-v1-'
    custom: null // Custom providers can have any format
};

// OpenRouter specific types
export interface OpenRouterModel {
    id: string;
    name: string;
    description?: string;
    context_length?: number;
    pricing?: {
        prompt: string;
        completion: string;
    };
    top_provider?: {
        max_completion_tokens?: number;
    };
}

export interface OpenRouterModelsResponse {
    data: OpenRouterModel[];
}

export interface WorkspaceOpenRouterSettings {
    id?: string;
    workspaceId: string;
    apiKey: string;
    selectedModels: string[]; // Array of model IDs
    isEnabled: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface OpenRouterValidationRequest {
    apiKey: string;
}

export interface OpenRouterValidationResponse {
    success: boolean;
    message: string;
    models?: OpenRouterModel[];
    error?: string;
}
