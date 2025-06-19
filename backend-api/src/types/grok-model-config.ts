/**
 * Grok Model Configuration Types
 * Used by the new universal Grok model config service
 */

export interface GrokModelConfig {
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
export interface CreateGrokModelConfigRequest {
    keyId: string;
    modelId: string;
    modelName: string;
    customName?: string;
    capabilities?: ModelCapabilities;
    pricing?: ModelPricing;
}

export interface CreateGrokModelConfigResponse {
    success: boolean;
    message: string;
    modelConfig?: GrokModelConfig;
}

export interface GetGrokModelConfigsResponse {
    success: boolean;
    message: string;
    modelConfigs: GrokModelConfig[];
}

export interface UpdateGrokModelConfigRequest {
    customName?: string;
    capabilities?: ModelCapabilities;
    pricing?: ModelPricing;
    isActive?: boolean;
}

export interface UpdateGrokModelConfigResponse {
    success: boolean;
    message: string;
    modelConfig?: GrokModelConfig;
}

export interface DeleteGrokModelConfigResponse {
    success: boolean;
    message: string;
}
