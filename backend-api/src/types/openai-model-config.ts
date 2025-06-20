export interface OpenAIModelConfig {
    id: string;
    userId: string;
    keyId: string;
    modelId: string;
    modelName: string;
    customName?: string;
    isActive: boolean;
    capabilities: {
        supportsImages: boolean;
        supportsFiles: boolean;
        supportsWebSearch: boolean;
        supportsReasoning: boolean;
    };
    pricing: {
        inputTokens: number;
        outputTokens: number;
        currency: string;
    };
    contextWindow: number;
    maxOutputTokens: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateOpenAIModelConfigRequest {
    keyId: string;
    modelId: string;
    modelName: string;
    customName?: string;
    isActive?: boolean;
    capabilities: {
        supportsImages: boolean;
        supportsFiles: boolean;
        supportsWebSearch: boolean;
        supportsReasoning: boolean;
    };
    pricing: {
        inputTokens: number;
        outputTokens: number;
        currency: string;
    };
    contextWindow: number;
    maxOutputTokens: number;
}

export interface UpdateOpenAIModelConfigRequest {
    customName?: string;
    isActive?: boolean;
    capabilities?: {
        supportsImages?: boolean;
        supportsFiles?: boolean;
        supportsWebSearch?: boolean;
        supportsReasoning?: boolean;
    };
    pricing?: {
        inputTokens?: number;
        outputTokens?: number;
        currency?: string;
    };
    contextWindow?: number;
    maxOutputTokens?: number;
}

export interface GetOpenAIModelConfigsResponse {
    success: boolean;
    message: string;
    modelConfigs: OpenAIModelConfig[];
}

export interface GetOpenAIModelConfigResponse {
    success: boolean;
    message: string;
    modelConfig?: OpenAIModelConfig;
}

export interface CreateOpenAIModelConfigResponse {
    success: boolean;
    message: string;
    modelConfig?: OpenAIModelConfig;
}

export interface UpdateOpenAIModelConfigResponse {
    success: boolean;
    message: string;
    modelConfig?: OpenAIModelConfig;
}

export interface DeleteOpenAIModelConfigResponse {
    success: boolean;
    message: string;
}

export interface OpenAIModelInfo {
    id: string;
    name: string;
    description?: string;
    capabilities: {
        supportsImages: boolean;
        supportsFiles: boolean;
        supportsWebSearch: boolean;
        supportsReasoning: boolean;
    };
    pricing: {
        inputTokens: number;
        outputTokens: number;
        currency: string;
    };
    contextWindow: number;
    maxOutputTokens: number;
}

export interface GetOpenAIModelsResponse {
    success: boolean;
    message: string;
    models: OpenAIModelInfo[];
}
