/**
 * Anthropic Model Configuration Types
 * Used by the new universal Anthropic model config service
 */

export interface AnthropicModelConfig {
    id: string;
    keyId: string;
    keyName: string;
    modelId: string;
    modelName: string;
    customName?: string;
    capabilities: ModelCapabilities;
    pricing: ModelPricing;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ModelCapabilities {
    reasoning?: boolean;
    search?: boolean;
    vision?: boolean;
    image?: boolean;
    pdf?: boolean;
    functionCalling?: boolean;
    codeInterpreter?: boolean;
    fileUpload?: boolean;
}

export interface ModelPricing {
    inputTokens?: string;
    outputTokens?: string;
    contextLength?: number;
}

// Request/Response Types
export interface CreateAnthropicModelConfigRequest {
    keyId: string;
    modelId: string;
    modelName: string;
    customName?: string;
    capabilities?: ModelCapabilities;
    pricing?: ModelPricing;
}

export interface CreateAnthropicModelConfigResponse {
    success: boolean;
    message: string;
    modelConfig?: AnthropicModelConfig;
}

export interface GetAnthropicModelConfigsResponse {
    success: boolean;
    message: string;
    modelConfigs: AnthropicModelConfig[];
}

export interface UpdateAnthropicModelConfigRequest {
    customName?: string;
    capabilities?: ModelCapabilities;
    pricing?: ModelPricing;
    isActive?: boolean;
}

export interface UpdateAnthropicModelConfigResponse {
    success: boolean;
    message: string;
    modelConfig?: AnthropicModelConfig;
}

export interface DeleteAnthropicModelConfigResponse {
    success: boolean;
    message: string;
}
