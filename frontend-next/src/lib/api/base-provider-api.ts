/**
 * Generic API service classes for AI providers
 * Provides a unified interface for different provider APIs while maintaining type safety
 */

import { apiClient } from '../api';
import { BaseProvider, BaseModel, BaseModelConfig, ProviderAPIConfig } from '@/types/ai-provider-config';

// Generic response types
export interface ProviderResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}

// Generic request types
export interface CreateProviderRequest {
    name: string;
    apiKey: string;
    isActive?: boolean;
}

export interface UpdateProviderRequest {
    name?: string;
    apiKey?: string;
    isActive?: boolean;
}

export interface CreateModelConfigRequest {
    keyId: string;
    modelId: string;
    customName?: string;
}

export interface UpdateModelConfigRequest {
    customName?: string;
    isActive?: boolean;
}

/**
 * Generic Provider API service
 * Handles CRUD operations for provider keys/accounts
 */
export class BaseProviderAPI<TProvider extends BaseProvider = BaseProvider> {
    constructor(private config: ProviderAPIConfig) { }

    // Get all providers
    async getProviders(): Promise<TProvider[]> {
        const response = await apiClient.get<ProviderResponse<TProvider[]>>(this.config.providersEndpoint);
        if (!response.success) {
            throw new Error(response.message || 'Failed to get providers');
        }
        return Array.isArray(response.data) ? response.data : [];
    }

    // Get a specific provider
    async getProvider(id: string): Promise<TProvider> {
        const response = await apiClient.get<ProviderResponse<TProvider>>(`${this.config.providersEndpoint}/${id}`);
        if (!response.success) {
            throw new Error(response.message || 'Failed to get provider');
        }
        if (!response.data || Array.isArray(response.data)) {
            throw new Error('Invalid response format');
        }
        return response.data;
    }

    // Create a new provider
    async createProvider(request: CreateProviderRequest): Promise<TProvider> {
        const response = await apiClient.post<ProviderResponse<TProvider>>(this.config.providersEndpoint, request);
        if (!response.success) {
            throw new Error(response.message || 'Failed to create provider');
        }
        if (!response.data || Array.isArray(response.data)) {
            throw new Error('Invalid response format');
        }
        return response.data;
    }

    // Update a provider
    async updateProvider(id: string, request: UpdateProviderRequest): Promise<TProvider> {
        const response = await apiClient.put<ProviderResponse<TProvider>>(`${this.config.providersEndpoint}/${id}`, request);
        if (!response.success) {
            throw new Error(response.message || 'Failed to update provider');
        }
        if (!response.data || Array.isArray(response.data)) {
            throw new Error('Invalid response format');
        }
        return response.data;
    }

    // Delete a provider
    async deleteProvider(id: string): Promise<void> {
        const response = await apiClient.delete<ProviderResponse>(`${this.config.providersEndpoint}/${id}`);
        if (!response.success) {
            throw new Error(response.message || 'Failed to delete provider');
        }
    }

    // Test a provider's API key
    async testProvider(id: string): Promise<void> {
        const response = await apiClient.post<ProviderResponse>(`${this.config.providersEndpoint}/${id}/test`);
        if (!response.success) {
            throw new Error(response.message || 'Failed to test provider');
        }
    }

    // Get decrypted API key (for internal use)
    async getDecryptedApiKey(id: string): Promise<string> {
        const response = await apiClient.get<ProviderResponse<{ apiKey: string }>>(`${this.config.providersEndpoint}/${id}/decrypted-key`);
        if (!response.success) {
            throw new Error(response.message || 'Failed to get decrypted API key');
        }
        return response.data!.apiKey;
    }
}

/**
 * Generic Model Configuration API service
 * Handles CRUD operations for model configurations
 */
export class BaseModelConfigAPI<TModelConfig extends BaseModelConfig = BaseModelConfig> {
    constructor(private config: ProviderAPIConfig) { }

    // Get all model configurations
    async getModelConfigs(): Promise<TModelConfig[]> {
        const response = await apiClient.get<ProviderResponse<TModelConfig[]>>(this.config.modelConfigsEndpoint);
        if (!response.success) {
            throw new Error(response.message || 'Failed to get model configurations');
        }
        return Array.isArray(response.data) ? response.data : [];
    }

    // Create a new model configuration
    async createModelConfig(request: CreateModelConfigRequest): Promise<TModelConfig> {
        const response = await apiClient.post<ProviderResponse<TModelConfig>>(this.config.modelConfigsEndpoint, request);
        if (!response.success) {
            throw new Error(response.message || 'Failed to create model configuration');
        }
        return response.data as TModelConfig;
    }

    // Update a model configuration
    async updateModelConfig(id: string, request: UpdateModelConfigRequest): Promise<TModelConfig> {
        const response = await apiClient.put<ProviderResponse<TModelConfig>>(`${this.config.modelConfigsEndpoint}/${id}`, request);
        if (!response.success) {
            throw new Error(response.message || 'Failed to update model configuration');
        }
        return response.data as TModelConfig;
    }

    // Delete a model configuration
    async deleteModelConfig(id: string): Promise<void> {
        const response = await apiClient.delete<ProviderResponse>(`${this.config.modelConfigsEndpoint}/${id}`);
        if (!response.success) {
            throw new Error(response.message || 'Failed to delete model configuration');
        }
    }
}

/**
 * Generic Models Fetching API service
 * Handles fetching available models from provider APIs
 */
export class BaseModelsAPI<TModel extends BaseModel = BaseModel> {
    constructor(private config: ProviderAPIConfig) { }

    // Fetch models using an API key
    async fetchModels(apiKey: string): Promise<TModel[]> {
        const response = await apiClient.post<any>(this.config.fetchModelsEndpoint, { apiKey });
        if (!response.success) {
            throw new Error(response.message || 'Failed to fetch models');
        }
        // Handle both 'data' and 'models' response formats for compatibility
        const models = response.models || response.data || [];
        return Array.isArray(models) ? models : [];
    }
}
