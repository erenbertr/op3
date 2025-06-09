const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006/api/v1';

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
    model: string;
    endpoint?: string;
    isActive: boolean;
}

export interface AIProviderTestRequest {
    type: AIProviderType;
    apiKey: string;
    model: string;
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

// Personality types
export interface Personality {
    id: string;
    userId: string;
    title: string;
    prompt: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreatePersonalityRequest {
    title: string;
    prompt: string;
}

export interface UpdatePersonalityRequest {
    title?: string;
    prompt?: string;
}

export interface PersonalityResponse {
    success: boolean;
    message: string;
    personality?: Personality;
}

export interface PersonalitiesListResponse {
    success: boolean;
    message: string;
    personalities: Personality[];
}

export interface DeletePersonalityResponse {
    success: boolean;
    message: string;
}

// Chat types
export interface ChatSession {
    id: string;
    userId: string;
    workspaceId: string;
    title: string;
    lastUsedPersonalityId?: string;
    lastUsedAIProviderId?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ChatMessage {
    id: string;
    sessionId: string;
    content: string;
    role: 'user' | 'assistant';
    personalityId?: string;
    aiProviderId?: string;
    createdAt: string;
    apiMetadata?: ApiMetadata;
}

export interface ApiMetadata {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    responseTimeMs?: number;
    model?: string;
    provider?: string;
    cost?: number;
    requestId?: string;
}

export interface CreateChatSessionRequest {
    userId: string;
    workspaceId: string;
    title?: string;
}

export interface CreateChatSessionResponse {
    success: boolean;
    message: string;
    session?: ChatSession;
}

export interface SendMessageRequest {
    content: string;
    personalityId?: string;
    aiProviderId?: string;
}

export interface SendMessageResponse {
    success: boolean;
    message: string;
    userMessage?: ChatMessage;
    aiResponse?: ChatMessage;
}

export interface ChatSessionsListResponse {
    success: boolean;
    message: string;
    sessions: ChatSession[];
}

export interface ChatMessagesResponse {
    success: boolean;
    message: string;
    messages: ChatMessage[];
}

export interface UpdateChatSessionRequest {
    title?: string;
}

export interface UpdateChatSessionResponse {
    success: boolean;
    message: string;
    session?: ChatSession;
}

export interface UpdateChatSessionSettingsRequest {
    lastUsedPersonalityId?: string;
    lastUsedAIProviderId?: string;
}

export interface UpdateChatSessionSettingsResponse {
    success: boolean;
    message: string;
    session?: ChatSession;
}

export interface DeleteChatSessionResponse {
    success: boolean;
    message: string;
}

// Statistics types
export interface WorkspaceStatistics {
    totalMessages: number;
    totalTokens: number;
    totalCost: number;
    averageResponseTime: number;
    messagesByProvider: { [key: string]: number };
    tokensByProvider: { [key: string]: number };
    costByProvider: { [key: string]: number };
    dailyUsage: { date: string; messages: number; tokens: number; cost: number }[];
}

export interface StatisticsResponse {
    success: boolean;
    message: string;
    statistics?: WorkspaceStatistics;
}

export interface StreamChunk {
    type: 'chunk' | 'error' | 'complete';
    content?: string;
    error?: string;
    message?: ChatMessage;
}

export interface SetupStatusResponse {
    success: boolean;
    message?: string;
    setup: {
        database: {
            configured: boolean;
            type: string | null;
        };
        admin: {
            configured: boolean;
        };
        aiProviders: {
            configured: boolean;
            count: number;
        };
        completed: boolean;
        allStepsCompleted: boolean;
    };
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

// Workspace types
export type WorkspaceTemplate = 'standard-chat' | 'kanban-board' | 'node-graph';

export interface CreateWorkspaceResponse {
    success: boolean;
    message: string;
    workspace?: {
        id: string;
        name: string;
        templateType: WorkspaceTemplate;
        workspaceRules: string;
        isActive: boolean;
        createdAt: string;
    };
}

export interface WorkspaceStatusResponse {
    success: boolean;
    hasWorkspace: boolean;
    workspace?: {
        id: string;
        name: string;
        templateType: WorkspaceTemplate;
        workspaceRules: string;
        isActive: boolean;
        createdAt: string;
    };
}

export interface WorkspaceListResponse {
    success: boolean;
    workspaces: {
        id: string;
        name: string;
        templateType: WorkspaceTemplate;
        workspaceRules: string;
        isActive: boolean;
        createdAt: string;
    }[];
}

export interface UpdateWorkspaceRequest {
    name?: string;
    workspaceRules?: string;
}

export interface WorkspaceUpdateResponse {
    success: boolean;
    message: string;
    workspace?: {
        id: string;
        name: string;
        templateType: WorkspaceTemplate;
        workspaceRules: string;
        isActive: boolean;
        createdAt: string;
    };
}

export interface WorkspaceDeleteResponse {
    success: boolean;
    message: string;
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
        const requestId = Math.random().toString(36).substr(2, 9);

        console.log(`🔗 [ApiClient.request:${requestId}] Starting request`);
        console.log(`🔗 [ApiClient.request:${requestId}] URL:`, url);
        console.log(`🔗 [ApiClient.request:${requestId}] Endpoint:`, endpoint);
        console.log(`🔗 [ApiClient.request:${requestId}] Options:`, options);
        console.log(`🔗 [ApiClient.request:${requestId}] Timestamp:`, new Date().toISOString());

        // Get auth token from localStorage
        const token = typeof window !== 'undefined' ? localStorage.getItem('op3_auth_token') : null;

        const config: RequestInit = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers,
            },
            ...options,
        };

        console.log(`🔗 [ApiClient.request:${requestId}] Final config:`, config);

        try {
            console.log(`🔗 [ApiClient.request:${requestId}] Calling fetch...`);
            const response = await fetch(url, config);
            console.log(`🔗 [ApiClient.request:${requestId}] Fetch completed, status:`, response.status);
            console.log(`🔗 [ApiClient.request:${requestId}] Response headers:`, Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                console.log(`❌ [ApiClient.request:${requestId}] Response not OK, parsing error...`);
                const errorData = await response.json().catch(() => ({}));
                console.log(`❌ [ApiClient.request:${requestId}] Error data:`, errorData);
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            console.log(`🔗 [ApiClient.request:${requestId}] Parsing JSON response...`);
            const result = await response.json();
            console.log(`✅ [ApiClient.request:${requestId}] Request successful:`, result);
            return result;
        } catch (error) {
            console.error(`❌ [ApiClient.request:${requestId}] Request failed:`, error);
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
    async getSetupStatus(): Promise<SetupStatusResponse> {
        return this.request<SetupStatusResponse>('/setup/status');
    }

    // Mark setup as complete
    async completeSetup(): Promise<ApiResponse> {
        return this.request<ApiResponse>('/setup/complete', {
            method: 'POST',
        });
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

    // Get all configured AI providers
    async getAIProviders(): Promise<{ success: boolean; message: string; providers: AIProviderConfig[] }> {
        return this.request<{ success: boolean; message: string; providers: AIProviderConfig[] }>('/ai-providers');
    }

    // Create a new AI provider
    async createAIProvider(provider: AIProviderConfig): Promise<{ success: boolean; message: string; provider?: AIProviderConfig }> {
        return this.request<{ success: boolean; message: string; provider?: AIProviderConfig }>('/ai-providers', {
            method: 'POST',
            body: JSON.stringify(provider),
        });
    }

    // Update an existing AI provider
    async updateAIProvider(providerId: string, provider: AIProviderConfig): Promise<{ success: boolean; message: string; provider?: AIProviderConfig }> {
        return this.request<{ success: boolean; message: string; provider?: AIProviderConfig }>(`/ai-providers/${providerId}`, {
            method: 'PUT',
            body: JSON.stringify(provider),
        });
    }

    // Delete an AI provider
    async deleteAIProvider(providerId: string): Promise<{ success: boolean; message: string }> {
        return this.request<{ success: boolean; message: string }>(`/ai-providers/${providerId}`, {
            method: 'DELETE',
        });
    }

    // Test an AI provider connection
    async testAIProvider(providerId: string): Promise<AIProviderTestResult> {
        return this.request<AIProviderTestResult>(`/ai-providers/${providerId}/test`, {
            method: 'POST',
        });
    }

    // Workspace-related methods
    async createWorkspace(userId: string, name: string, templateType: string, workspaceRules: string): Promise<CreateWorkspaceResponse> {
        return this.request<CreateWorkspaceResponse>('/workspace/create', {
            method: 'POST',
            body: JSON.stringify({ userId, name, templateType, workspaceRules }),
        });
    }

    async getWorkspaceStatus(userId: string): Promise<WorkspaceStatusResponse> {
        return this.request<WorkspaceStatusResponse>(`/workspace/status/${userId}`);
    }

    async getUserWorkspace(userId: string): Promise<{ success: boolean; workspace?: { id: string; name: string; templateType: WorkspaceTemplate; workspaceRules: string; isActive: boolean; createdAt: string } }> {
        return this.request<{ success: boolean; workspace?: { id: string; name: string; templateType: WorkspaceTemplate; workspaceRules: string; isActive: boolean; createdAt: string } }>(`/workspace/${userId}`);
    }

    async getUserWorkspaces(userId: string): Promise<WorkspaceListResponse> {
        console.log('🌐 [ApiClient.getUserWorkspaces] Called with userId:', userId);
        console.log('🌐 [ApiClient.getUserWorkspaces] Timestamp:', new Date().toISOString());
        console.log('🌐 [ApiClient.getUserWorkspaces] Stack trace:', new Error().stack);

        const endpoint = `/workspace/list/${userId}`;
        console.log('🌐 [ApiClient.getUserWorkspaces] Endpoint:', endpoint);
        console.log('🌐 [ApiClient.getUserWorkspaces] Full URL:', `${this.baseUrl}${endpoint}`);

        try {
            console.log('🌐 [ApiClient.getUserWorkspaces] Making request...');
            const result = await this.request<WorkspaceListResponse>(endpoint);
            console.log('✅ [ApiClient.getUserWorkspaces] Request successful:', result);
            return result;
        } catch (error) {
            console.error('❌ [ApiClient.getUserWorkspaces] Request failed:', error);
            throw error;
        }
    }

    async updateWorkspace(workspaceId: string, userId: string, updates: UpdateWorkspaceRequest): Promise<WorkspaceUpdateResponse> {
        return this.request<WorkspaceUpdateResponse>(`/workspace/${workspaceId}`, {
            method: 'PATCH',
            body: JSON.stringify({ userId, ...updates }),
        });
    }

    async setActiveWorkspace(workspaceId: string, userId: string): Promise<WorkspaceUpdateResponse> {
        return this.request<WorkspaceUpdateResponse>(`/workspace/${workspaceId}/activate`, {
            method: 'POST',
            body: JSON.stringify({ userId }),
        });
    }

    async deleteWorkspace(workspaceId: string, userId: string): Promise<WorkspaceDeleteResponse> {
        return this.request<WorkspaceDeleteResponse>(`/workspace/${workspaceId}`, {
            method: 'DELETE',
            body: JSON.stringify({ userId }),
        });
    }

    // Personality-related methods
    async getPersonalities(userId: string): Promise<PersonalitiesListResponse> {
        return this.request<PersonalitiesListResponse>(`/personalities/${userId}`);
    }

    async createPersonality(userId: string, request: CreatePersonalityRequest): Promise<PersonalityResponse> {
        return this.request<PersonalityResponse>('/personalities', {
            method: 'POST',
            body: JSON.stringify({ userId, ...request }),
        });
    }

    async updatePersonality(personalityId: string, userId: string, request: UpdatePersonalityRequest): Promise<PersonalityResponse> {
        return this.request<PersonalityResponse>(`/personalities/${personalityId}`, {
            method: 'PUT',
            body: JSON.stringify({ userId, ...request }),
        });
    }

    async deletePersonality(personalityId: string, userId: string): Promise<DeletePersonalityResponse> {
        return this.request<DeletePersonalityResponse>(`/personalities/${personalityId}`, {
            method: 'DELETE',
            body: JSON.stringify({ userId }),
        });
    }

    // Chat-related methods
    async createChatSession(request: CreateChatSessionRequest): Promise<CreateChatSessionResponse> {
        return this.request<CreateChatSessionResponse>('/chat/sessions', {
            method: 'POST',
            body: JSON.stringify(request),
        });
    }

    async getChatSessions(userId: string, workspaceId: string): Promise<ChatSessionsListResponse> {
        return this.request<ChatSessionsListResponse>(`/chat/sessions/${userId}/${workspaceId}`);
    }

    async getChatMessages(sessionId: string): Promise<ChatMessagesResponse> {
        return this.request<ChatMessagesResponse>(`/chat/sessions/${sessionId}/messages`);
    }

    async sendMessage(sessionId: string, request: SendMessageRequest): Promise<SendMessageResponse> {
        return this.request<SendMessageResponse>(`/chat/sessions/${sessionId}/messages`, {
            method: 'POST',
            body: JSON.stringify(request),
        });
    }

    async updateChatSession(sessionId: string, request: UpdateChatSessionRequest): Promise<UpdateChatSessionResponse> {
        return this.request<UpdateChatSessionResponse>(`/chat/sessions/${sessionId}`, {
            method: 'PATCH',
            body: JSON.stringify(request),
        });
    }

    async updateChatSessionSettings(sessionId: string, request: UpdateChatSessionSettingsRequest): Promise<UpdateChatSessionSettingsResponse> {
        return this.request<UpdateChatSessionSettingsResponse>(`/chat/sessions/${sessionId}/settings`, {
            method: 'PATCH',
            body: JSON.stringify(request),
        });
    }

    async deleteChatSession(sessionId: string): Promise<DeleteChatSessionResponse> {
        return this.request<DeleteChatSessionResponse>(`/chat/sessions/${sessionId}`, {
            method: 'DELETE',
        });
    }

    // AI Streaming chat method
    async streamChatMessage(
        sessionId: string,
        request: SendMessageRequest & { userId: string },
        onChunk: (chunk: StreamChunk) => void,
        onComplete: (message: ChatMessage) => void,
        onError: (error: string) => void
    ): Promise<void> {
        try {
            // Get auth token from localStorage
            const token = typeof window !== 'undefined' ? localStorage.getItem('op3_auth_token') : null;

            const response = await fetch(`${this.baseUrl}/chat/sessions/${sessionId}/ai-stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body reader available');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            if (data.type === 'chunk') {
                                onChunk(data);
                            } else if (data.type === 'complete') {
                                onComplete(data.message);
                            } else if (data.type === 'error') {
                                onError(data.message);
                                return;
                            }
                        } catch (error) {
                            console.error('Error parsing SSE data:', error);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error in streaming chat:', error);
            onError(error instanceof Error ? error.message : 'Unknown error');
        }
    }

    // Statistics API methods
    async getWorkspaceStatistics(
        workspaceId: string,
        userId: string,
        dateRange: string = 'this-week',
        startDate?: string,
        endDate?: string
    ): Promise<StatisticsResponse> {
        const params = new URLSearchParams({
            userId,
            dateRange
        });

        if (startDate && endDate) {
            params.append('startDate', startDate);
            params.append('endDate', endDate);
        }

        return this.request<StatisticsResponse>(
            `/statistics/workspace/${workspaceId}?${params.toString()}`
        );
    }

    async getProviderStatistics(
        workspaceId: string,
        userId: string,
        dateRange: string = 'this-week'
    ): Promise<any> {
        const params = new URLSearchParams({
            userId,
            dateRange
        });

        return this.request<any>(
            `/statistics/workspace/${workspaceId}/providers?${params.toString()}`
        );
    }

    async getUsageTrends(
        workspaceId: string,
        userId: string,
        dateRange: string = 'this-week'
    ): Promise<any> {
        const params = new URLSearchParams({
            userId,
            dateRange
        });

        return this.request<any>(
            `/statistics/workspace/${workspaceId}/trends?${params.toString()}`
        );
    }

    async getSummaryStatistics(
        workspaceId: string,
        userId: string,
        dateRange: string = 'this-week'
    ): Promise<any> {
        const params = new URLSearchParams({
            userId,
            dateRange
        });

        return this.request<any>(
            `/statistics/workspace/${workspaceId}/summary?${params.toString()}`
        );
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
