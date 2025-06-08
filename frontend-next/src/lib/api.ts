const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004/api/v1';

export interface DatabaseConfig {
    type: 'mongodb' | 'mysql' | 'postgresql' | 'localdb' | 'supabase' | 'convex' | 'firebase' | 'planetscale' | 'neon' | 'turso';
    host?: string;
    port?: number;
    database: string;
    username?: string;
    password?: string;
    connectionString?: string;
    ssl?: boolean;
    // New fields for modern providers
    apiKey?: string;
    projectId?: string;
    region?: string;
    authToken?: string;
    url?: string;
}

export interface AdminConfig {
    email: string;
    username?: string;
    password: string;
    confirmPassword: string;
}

export type AIProviderType = 'openai' | 'anthropic' | 'google' | 'replicate' | 'custom';

export interface AIProviderConfig {
    id?: string;
    type: AIProviderType;
    name: string;
    apiKey: string;
    endpoint?: string;
    isActive: boolean;
}

export interface AIProviderTestRequest {
    type: AIProviderType;
    apiKey: string;
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

export interface ApiResponse<T = unknown> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}

export interface ConnectionTestResponse {
    success: boolean;
    message: string;
    connectionInfo?: {
        type: string;
        host?: string;
        database: string;
        connected: boolean;
    };
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        const config: RequestInit = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Test database connection
    async testDatabaseConnection(config: DatabaseConfig): Promise<ConnectionTestResponse> {
        return this.request<ConnectionTestResponse>('/setup/test-connection', {
            method: 'POST',
            body: JSON.stringify({ database: config }),
        });
    }

    // Save database configuration
    async saveDatabaseConfig(config: DatabaseConfig): Promise<ApiResponse> {
        return this.request<ApiResponse>('/setup/database', {
            method: 'POST',
            body: JSON.stringify({ database: config }),
        });
    }

    // Save admin configuration
    async saveAdminConfig(config: AdminConfig): Promise<ApiResponse> {
        return this.request<ApiResponse>('/setup/admin', {
            method: 'POST',
            body: JSON.stringify({ admin: config }),
        });
    }

    // Get setup status
    async getSetupStatus(): Promise<ApiResponse> {
        return this.request<ApiResponse>('/setup/status');
    }

    // Health check
    async healthCheck(): Promise<{ status: string; timestamp: string; service: string }> {
        const url = `${this.baseUrl.replace('/api/v1', '')}/health`;
        const response = await fetch(url);
        return response.json();
    }

    // Test AI provider connection
    async testAIProviderConnection(request: AIProviderTestRequest): Promise<AIProviderTestResult> {
        return this.request<AIProviderTestResult>('/setup/ai-providers/test', {
            method: 'POST',
            body: JSON.stringify(request),
        });
    }

    // Save AI provider configurations
    async saveAIProviders(providers: AIProviderConfig[]): Promise<ApiResponse> {
        return this.request<ApiResponse>('/setup/ai-providers', {
            method: 'POST',
            body: JSON.stringify({ providers }),
        });
    }
}

export const apiClient = new ApiClient();

// Hook for API calls with error handling
export function useApi() {
    const handleApiCall = async <T>(
        apiCall: () => Promise<T>,
        onSuccess?: (data: T) => void,
        onError?: (error: Error) => void
    ): Promise<T | null> => {
        try {
            const result = await apiCall();
            onSuccess?.(result);
            return result;
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown error');
            onError?.(err);
            return null;
        }
    };

    return { handleApiCall };
}
