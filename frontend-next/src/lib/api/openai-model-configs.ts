import { apiClient } from '../api';

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
    createdAt: string;
    updatedAt: string;
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
}

export class OpenAIModelConfigsAPI {
    private baseUrl = '/openai-model-configs';

    // Get all model configurations
    async getModelConfigs(): Promise<OpenAIModelConfig[]> {
        const response = await apiClient.get<OpenAIModelConfigResponse>(this.baseUrl);
        if (!response.success) {
            throw new Error(response.message || 'Failed to get model configurations');
        }
        return Array.isArray(response.data) ? response.data : [];
    }

    // Create a new model configuration
    async createModelConfig(request: CreateOpenAIModelConfigRequest): Promise<OpenAIModelConfig> {
        const response = await apiClient.post<OpenAIModelConfigResponse>(this.baseUrl, request);
        if (!response.success) {
            throw new Error(response.message || 'Failed to create model configuration');
        }
        return response.data as OpenAIModelConfig;
    }

    // Update a model configuration
    async updateModelConfig(id: string, request: UpdateOpenAIModelConfigRequest): Promise<OpenAIModelConfig> {
        const response = await apiClient.put<OpenAIModelConfigResponse>(`${this.baseUrl}/${id}`, request);
        if (!response.success) {
            throw new Error(response.message || 'Failed to update model configuration');
        }
        return response.data as OpenAIModelConfig;
    }

    // Delete a model configuration
    async deleteModelConfig(id: string): Promise<void> {
        const response = await apiClient.delete<OpenAIModelConfigResponse>(`${this.baseUrl}/${id}`);
        if (!response.success) {
            throw new Error(response.message || 'Failed to delete model configuration');
        }
    }
}

export const openaiModelConfigsAPI = new OpenAIModelConfigsAPI();
