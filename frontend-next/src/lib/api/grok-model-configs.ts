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
    createdAt: string;
    updatedAt: string;
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
}

export class GrokModelConfigsAPI {
    private baseUrl = '/grok-model-configs';

    // Get all model configurations
    async getModelConfigs(): Promise<GrokModelConfig[]> {
        const response = await apiClient.get<GrokModelConfigResponse>(this.baseUrl);
        if (!response.success) {
            throw new Error(response.message || 'Failed to get model configurations');
        }
        return Array.isArray(response.data) ? response.data : [];
    }

    // Get a specific model configuration
    async getModelConfig(id: string): Promise<GrokModelConfig> {
        const response = await apiClient.get<GrokModelConfigResponse>(`${this.baseUrl}/${id}`);
        if (!response.success) {
            throw new Error(response.message || 'Failed to get model configuration');
        }
        if (!response.data || Array.isArray(response.data)) {
            throw new Error('Invalid response format');
        }
        return response.data;
    }

    // Create a new model configuration
    async createModelConfig(data: CreateGrokModelConfigRequest): Promise<GrokModelConfig> {
        const response = await apiClient.post<GrokModelConfigResponse>(this.baseUrl, data);
        if (!response.success) {
            throw new Error(response.message || 'Failed to create model configuration');
        }
        if (!response.data || Array.isArray(response.data)) {
            throw new Error('Invalid response format');
        }
        return response.data;
    }

    // Update a model configuration
    async updateModelConfig(id: string, data: UpdateGrokModelConfigRequest): Promise<GrokModelConfig> {
        const response = await apiClient.put<GrokModelConfigResponse>(`${this.baseUrl}/${id}`, data);
        if (!response.success) {
            throw new Error(response.message || 'Failed to update model configuration');
        }
        if (!response.data || Array.isArray(response.data)) {
            throw new Error('Invalid response format');
        }
        return response.data;
    }

    // Delete a model configuration
    async deleteModelConfig(id: string): Promise<void> {
        const response = await apiClient.delete<GrokModelConfigResponse>(`${this.baseUrl}/${id}`);
        if (!response.success) {
            throw new Error(response.message || 'Failed to delete model configuration');
        }
    }
}

// Export a singleton instance
export const grokModelConfigsAPI = new GrokModelConfigsAPI();
