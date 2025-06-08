const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005/api/v1';

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

export interface DeleteChatSessionResponse {
    success: boolean;
    message: string;
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
        return this.request<WorkspaceListResponse>(`/workspace/list/${userId}`);
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

    async deleteChatSession(sessionId: string): Promise<DeleteChatSessionResponse> {
        return this.request<DeleteChatSessionResponse>(`/chat/sessions/${sessionId}`, {
            method: 'DELETE',
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
