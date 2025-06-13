import { apiClient } from '../api';

export interface OpenAIProvider {
    id: string;
    name: string;
    apiKey: string; // This will be masked for display
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateOpenAIProviderRequest {
    name: string;
    apiKey: string;
    isActive?: boolean;
}

export interface UpdateOpenAIProviderRequest {
    name?: string;
    apiKey?: string;
    isActive?: boolean;
}

export interface OpenAIProviderResponse {
    success: boolean;
    message: string;
    data?: OpenAIProvider | OpenAIProvider[];
}

export class OpenAIProvidersAPI {
    private baseUrl = '/openai-providers';

    // Get all OpenAI providers
    async getProviders(): Promise<OpenAIProvider[]> {
        const response = await apiClient.get<OpenAIProviderResponse>(this.baseUrl);
        if (!response.success) {
            throw new Error(response.message || 'Failed to get OpenAI providers');
        }
        return Array.isArray(response.data) ? response.data : [];
    }

    // Get a specific OpenAI provider
    async getProvider(id: string): Promise<OpenAIProvider> {
        const response = await apiClient.get<OpenAIProviderResponse>(`${this.baseUrl}/${id}`);
        if (!response.success) {
            throw new Error(response.message || 'Failed to get OpenAI provider');
        }
        if (!response.data || Array.isArray(response.data)) {
            throw new Error('Invalid response format');
        }
        return response.data;
    }

    // Create a new OpenAI provider
    async createProvider(request: CreateOpenAIProviderRequest): Promise<OpenAIProvider> {
        const response = await apiClient.post<OpenAIProviderResponse>(this.baseUrl, request);
        if (!response.success) {
            throw new Error(response.message || 'Failed to create OpenAI provider');
        }
        if (!response.data || Array.isArray(response.data)) {
            throw new Error('Invalid response format');
        }
        return response.data;
    }

    // Update an OpenAI provider
    async updateProvider(id: string, request: UpdateOpenAIProviderRequest): Promise<OpenAIProvider> {
        const response = await apiClient.put<OpenAIProviderResponse>(`${this.baseUrl}/${id}`, request);
        if (!response.success) {
            throw new Error(response.message || 'Failed to update OpenAI provider');
        }
        if (!response.data || Array.isArray(response.data)) {
            throw new Error('Invalid response format');
        }
        return response.data;
    }

    // Delete an OpenAI provider
    async deleteProvider(id: string): Promise<void> {
        const response = await apiClient.delete<OpenAIProviderResponse>(`${this.baseUrl}/${id}`);
        if (!response.success) {
            throw new Error(response.message || 'Failed to delete OpenAI provider');
        }
    }

    // Test an OpenAI provider's API key
    async testProvider(id: string): Promise<void> {
        const response = await apiClient.post<OpenAIProviderResponse>(`${this.baseUrl}/${id}/test`);
        if (!response.success) {
            throw new Error(response.message || 'Failed to test OpenAI provider');
        }
    }

    // Get decrypted API key (for internal use)
    async getDecryptedApiKey(id: string): Promise<string> {
        const response = await apiClient.get<{ success: boolean; message: string; data: { apiKey: string } }>(`${this.baseUrl}/${id}/decrypted-key`);
        if (!response.success) {
            throw new Error(response.message || 'Failed to get decrypted API key');
        }
        return response.data.apiKey;
    }
}

export const openaiProvidersAPI = new OpenAIProvidersAPI();
