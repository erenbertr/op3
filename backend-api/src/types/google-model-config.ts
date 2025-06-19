/**
 * Google Model Configuration Types
 * Used by the new universal Google model config service
 */

export interface GoogleModelConfig {
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
export interface CreateGoogleModelConfigRequest {
    keyId: string;
    modelId: string;
    modelName: string;
    customName?: string;
    capabilities?: ModelCapabilities;
    pricing?: ModelPricing;
}

export interface CreateGoogleModelConfigResponse {
    success: boolean;
    message: string;
    modelConfig?: GoogleModelConfig;
}

export interface GetGoogleModelConfigsResponse {
    success: boolean;
    message: string;
    modelConfigs: GoogleModelConfig[];
}

export interface UpdateGoogleModelConfigRequest {
    customName?: string;
    capabilities?: ModelCapabilities;
    pricing?: ModelPricing;
    isActive?: boolean;
}

export interface UpdateGoogleModelConfigResponse {
    success: boolean;
    message: string;
    modelConfig?: GoogleModelConfig;
}

export interface DeleteGoogleModelConfigResponse {
    success: boolean;
    message: string;
}
