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

// Default models for each provider type - these are fallbacks when API calls fail
export const FALLBACK_MODELS: Record<AIProviderType, string[]> = {
    openai: [], // OpenAI models are fetched dynamically from API
    anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    google: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
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
        context_length?: number;
    };
    architecture?: {
        modality?: string;
        tokenizer?: string;
        instruct_type?: string;
    };
    per_request_limits?: {
        prompt_tokens?: string;
        completion_tokens?: string;
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

// Workspace AI Favorites types
export interface WorkspaceAIFavorite {
    id: string;
    workspaceId: string;
    aiProviderId: string; // Can be model config ID or regular provider ID
    isModelConfig: boolean; // Indicates if this is a model config or regular provider
    displayName: string; // Custom display name for the favorite
    sortOrder: number; // For ordering favorites
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateAIFavoriteRequest {
    workspaceId: string;
    aiProviderId: string;
    isModelConfig: boolean;
    displayName: string;
}

export interface UpdateAIFavoriteRequest {
    displayName?: string;
    sortOrder?: number;
}

export interface WorkspaceAIFavoritesResponse {
    success: boolean;
    favorites: WorkspaceAIFavorite[];
    message?: string;
}

export interface CreateAIFavoriteResponse {
    success: boolean;
    favorite?: WorkspaceAIFavorite;
    message: string;
}

export interface DeleteAIFavoriteResponse {
    success: boolean;
    message: string;
}

// OpenAI Model Configuration types
export interface OpenAIModelConfig {
    id: string;
    keyId: string;
    keyName: string;
    modelId: string;
    modelName: string;
    customName?: string;
    capabilities?: ModelCapabilities;
    pricing?: ModelPricing;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface ModelCapabilities {
    reasoning?: boolean;
    search?: boolean;
    fileUpload?: boolean;
    image?: boolean;
    pdf?: boolean;
    vision?: boolean;
    functionCalling?: boolean;
    codeInterpreter?: boolean;
}

export interface ModelPricing {
    inputTokens?: string; // Price per 1M input tokens
    outputTokens?: string; // Price per 1M output tokens
    contextLength?: number;
}

export interface CreateOpenAIModelConfigRequest {
    keyId: string;
    modelId: string;
    customName?: string;
}

export interface UpdateOpenAIModelConfigRequest {
    customName?: string;
    isActive?: boolean;
}

export interface OpenAIModelConfigResponse {
    success: boolean;
    message: string;
    data?: OpenAIModelConfig | OpenAIModelConfig[];
    error?: string;
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

// Grok Model Configuration types
export interface GrokModelConfig {
    id: string;
    keyId: string;
    keyName: string;
    modelId: string;
    modelName: string;
    customName?: string;
    capabilities?: ModelCapabilities;
    pricing?: ModelPricing;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateGrokModelConfigRequest {
    keyId: string;
    modelId: string;
    customName?: string;
}

export interface UpdateGrokModelConfigRequest {
    customName?: string;
    isActive?: boolean;
}

export interface GrokModelConfigResponse {
    success: boolean;
    message: string;
    data?: GrokModelConfig | GrokModelConfig[];
    error?: string;
}

// Anthropic Model Configuration types
export interface AnthropicModelConfig {
    id: string;
    keyId: string;
    keyName: string;
    modelId: string;
    modelName: string;
    customName?: string;
    capabilities?: ModelCapabilities;
    pricing?: ModelPricing;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateAnthropicModelConfigRequest {
    keyId: string;
    modelId: string;
    customName?: string;
}

export interface UpdateAnthropicModelConfigRequest {
    customName?: string;
    isActive?: boolean;
}

export interface AnthropicModelConfigResponse {
    success: boolean;
    message: string;
    data?: AnthropicModelConfig | AnthropicModelConfig[];
    error?: string;
}

// Google Model Configuration types
export interface GoogleModelConfig {
    id: string;
    keyId: string;
    keyName: string;
    modelId: string;
    modelName: string;
    customName?: string;
    capabilities?: ModelCapabilities;
    pricing?: ModelPricing;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateGoogleModelConfigRequest {
    keyId: string;
    modelId: string;
    customName?: string;
}

export interface UpdateGoogleModelConfigRequest {
    customName?: string;
    isActive?: boolean;
}

export interface GoogleModelConfigResponse {
    success: boolean;
    message: string;
    data?: GoogleModelConfig | GoogleModelConfig[];
    error?: string;
}
