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
    createdAt: string;
    updatedAt: string;
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
}

export class GoogleModelConfigsAPI {
    private baseUrl = '/google-model-configs';

    // Get all model configurations
    async getModelConfigs(): Promise<GoogleModelConfig[]> {
        const response = await apiClient.get<GoogleModelConfigResponse>(this.baseUrl);
        if (!response.success) {
            throw new Error(response.message || 'Failed to get model configurations');
        }
        return Array.isArray(response.data) ? response.data : [];
    }

    // Get a specific model configuration
    async getModelConfig(id: string): Promise<GoogleModelConfig> {
        const response = await apiClient.get<GoogleModelConfigResponse>(`${this.baseUrl}/${id}`);
        if (!response.success) {
            throw new Error(response.message || 'Failed to get model configuration');
        }
        if (!response.data || Array.isArray(response.data)) {
            throw new Error('Invalid response format');
        }
        return response.data;
    }

    // Create a new model configuration
    async createModelConfig(request: CreateGoogleModelConfigRequest): Promise<GoogleModelConfig> {
        const response = await apiClient.post<GoogleModelConfigResponse>(this.baseUrl, request);
        if (!response.success) {
            throw new Error(response.message || 'Failed to create model configuration');
        }
        if (!response.data || Array.isArray(response.data)) {
            throw new Error('Invalid response format');
        }
        return response.data;
    }

    // Update a model configuration
    async updateModelConfig(id: string, request: UpdateGoogleModelConfigRequest): Promise<GoogleModelConfig> {
        const response = await apiClient.put<GoogleModelConfigResponse>(`${this.baseUrl}/${id}`, request);
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
        const response = await apiClient.delete<GoogleModelConfigResponse>(`${this.baseUrl}/${id}`);
        if (!response.success) {
            throw new Error(response.message || 'Failed to delete model configuration');
        }
    }
}

// Export a singleton instance
export const googleModelConfigsAPI = new GoogleModelConfigsAPI();
