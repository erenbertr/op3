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

// Admin API types
export interface SystemSettings {
    id: string;
    registrationEnabled: boolean;
    loginEnabled: boolean;
    maxUsersAllowed?: number;
    defaultUserRole: 'normal' | 'subscribed';
    requireEmailVerification: boolean;
    allowUsernameChange: boolean;
    passwordRequirements: {
        minLength: number;
        requireUppercase: boolean;
        requireLowercase: boolean;
        requireNumbers: boolean;
        requireSpecialChars: boolean;
    };
    createdAt: string;
    updatedAt: string;
    updatedBy: string;
}

export interface AdminUser {
    id: string;
    email: string;
    username?: string;
    role: 'admin' | 'subscribed' | 'normal';
    isActive: boolean;
    firstName?: string;
    lastName?: string;
    createdAt: string;
    lastLoginAt?: string;
}

export interface AdminUsersResponse {
    success: boolean;
    users: AdminUser[];
    total: number;
    totalPages: number;
    currentPage: number;
}

export interface UserStats {
    total: number;
    active: number;
    inactive: number;
    admins: number;
    normal: number;
}

export type AIProviderType = 'openai' | 'anthropic' | 'google' | 'replicate' | 'openrouter' | 'custom';

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
    isPinned?: boolean;
    isShared?: boolean; // Indicates if this chat is currently shared
    parentSessionId?: string; // For branched chats
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
    isPartial?: boolean; // For messages that were stopped mid-stream
    fileAttachments?: string[]; // Array of file attachment IDs
    attachmentData?: FileAttachment[]; // Direct attachment data for display (client-side only)
    isShared?: boolean; // Indicates if this message is currently shared
}

export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
    displayUrl?: string;
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
    searchResults?: SearchResult[];
    searchQuery?: string;
    reasoningEnabled?: boolean;
}

export interface CreateChatSessionRequest {
    userId: string;
    workspaceId: string;
    title?: string;
    parentSessionId?: string; // For creating branched chats
    branchFromMessageId?: string; // Message to branch from
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
    searchEnabled?: boolean;
    reasoningEnabled?: boolean;
    fileAttachments?: string[];
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

export interface UpdateChatSessionPinStatusRequest {
    isPinned: boolean;
}

// Shared chat types
export interface SharedChat {
    id: string; // UUID for the share
    originalChatId: string; // Reference to the original chat session
    title: string; // Chat title for display
    messages: SharedChatMessage[]; // Simplified messages without metadata
    messageCount: number; // Number of messages included in the share
    createdAt: string;
    isActive: boolean; // For future management/deletion
}

export interface SharedChatMessage {
    id: string;
    content: string;
    role: 'user' | 'assistant';
    createdAt: string;
}

export interface CreateShareRequest {
    sessionId: string;
}

export interface CreateShareResponse {
    success: boolean;
    message: string;
    shareId?: string;
    shareUrl?: string;
}

export interface GetSharedChatResponse {
    success: boolean;
    message: string;
    sharedChat?: SharedChat;
}

export interface UpdateShareRequest {
    sessionId: string;
}

export interface UpdateShareResponse {
    success: boolean;
    message: string;
    messageCount?: number;
}

export interface RemoveShareRequest {
    sessionId: string;
}

export interface RemoveShareResponse {
    success: boolean;
    message: string;
}

export interface GetShareStatusRequest {
    sessionId: string;
}

export interface GetShareStatusResponse {
    success: boolean;
    message: string;
    isShared: boolean;
    shareId?: string;
    shareUrl?: string;
    messageCount?: number;
    createdAt?: string;
}

// Message sharing types
export interface SharedMessage {
    id: string; // UUID for the share
    originalMessageId: string; // Reference to the original message
    content: string; // Message content for display
    role: 'user' | 'assistant';
    createdAt: string;
    isActive: boolean; // For future management/deletion
}

export interface CreateMessageShareRequest {
    messageId: string;
}

export interface CreateMessageShareResponse {
    success: boolean;
    message: string;
    shareId?: string;
    shareUrl?: string;
}

export interface GetSharedMessageResponse {
    success: boolean;
    message: string;
    sharedMessage?: SharedMessage;
}

export interface UpdateMessageShareRequest {
    messageId: string;
}

export interface UpdateMessageShareResponse {
    success: boolean;
    message: string;
}

export interface RemoveMessageShareRequest {
    messageId: string;
}

export interface RemoveMessageShareResponse {
    success: boolean;
    message: string;
}

export interface GetMessageShareStatusRequest {
    messageId: string;
}

export interface GetMessageShareStatusResponse {
    success: boolean;
    message: string;
    isShared: boolean;
    shareId?: string;
    shareUrl?: string;
}

// File attachment types
export interface FileAttachment {
    id: string;
    sessionId: string;
    userId: string;
    originalName: string;
    fileName: string;
    filePath?: string;
    mimeType: string;
    size: number;
    openaiFileId?: string;
    vectorStoreId?: string;
    status: 'uploading' | 'processing' | 'ready' | 'error';
    errorMessage?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface FileUploadResponse {
    success: boolean;
    message: string;
    results?: {
        success: boolean;
        message: string;
        attachment?: FileAttachment;
    }[];
}

export interface FileAttachmentListResponse {
    success: boolean;
    message: string;
    attachments: FileAttachment[];
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

export type ProviderStatisticsData = Record<string, unknown>;
export type UsageTrendsData = Record<string, unknown>;
export type SummaryStatisticsData = Record<string, unknown>;

export type ProviderStatisticsResponse = ApiResponse<ProviderStatisticsData>;
export type UsageTrendsResponse = ApiResponse<UsageTrendsData>;
export type SummaryStatisticsResponse = ApiResponse<SummaryStatisticsData>;

export interface StatisticsResponse {
    success: boolean;
    message: string;
    statistics?: WorkspaceStatistics;
}

// Workspace AI Favorites types
export interface WorkspaceAIFavorite {
    id: string;
    workspaceId: string;
    aiProviderId: string;
    isModelConfig: boolean;
    displayName: string;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreateAIFavoriteRequest {
    workspaceId: string;
    aiProviderId: string;
    isModelConfig: boolean;
    displayName: string;
}

export interface UpdateAIFavoriteRequest {
    displayName?: string;
    sortOrder?: number;
}

export interface WorkspaceAIFavoritesResponse {
    success: boolean;
    favorites: WorkspaceAIFavorite[];
    message?: string;
}

export interface CreateAIFavoriteResponse {
    success: boolean;
    favorite?: WorkspaceAIFavorite;
    message: string;
}

export interface DeleteAIFavoriteResponse {
    success: boolean;
    message: string;
}

export interface CheckAIFavoriteResponse {
    success: boolean;
    isFavorited: boolean;
    favorite: WorkspaceAIFavorite | null;
}

// Workspace Personality Favorites types
export interface WorkspacePersonalityFavorite {
    id: string;
    workspaceId: string;
    personalityId: string;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreatePersonalityFavoriteRequest {
    workspaceId: string;
    personalityId: string;
    sortOrder?: number;
}

export interface UpdatePersonalityFavoriteRequest {
    sortOrder?: number;
}

export interface WorkspacePersonalityFavoritesResponse {
    success: boolean;
    favorites: WorkspacePersonalityFavorite[];
    message?: string;
}

export interface CreatePersonalityFavoriteResponse {
    success: boolean;
    favorite?: WorkspacePersonalityFavorite;
    message: string;
}

export interface DeletePersonalityFavoriteResponse {
    success: boolean;
    message: string;
}

export interface CheckPersonalityFavoriteResponse {
    success: boolean;
    isFavorited: boolean;
    favorite: WorkspacePersonalityFavorite | null;
}

export interface StreamChunk {
    type: 'chunk' | 'error' | 'complete' | 'search_start' | 'search_results' | 'reasoning_step';
    content?: string;
    error?: string;
    message?: ChatMessage;
    searchQuery?: string;
    searchResults?: SearchResult[];
}

export interface StreamingState {
    isStreaming: boolean;
    canStop: boolean;
    hasError: boolean;
    errorMessage?: string;
    isRetrying: boolean;
    partialContent?: string;
}

export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
    displayUrl?: string;
}

export interface StreamingCallbacks {
    onChunk: (chunk: StreamChunk) => void;
    onComplete: (message: ChatMessage) => void;
    onError: (error: string) => void;
    onStop?: () => void;
    onSearchStart?: (query: string) => void;
    onSearchResults?: (query: string, results: SearchResult[]) => void;
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
        groupId?: string | null;
        sortOrder?: number;
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

export interface WorkspaceGroup {
    id: string;
    name: string;
    sortOrder: number;
    isPinned: boolean;
    createdAt: string;
    workspaceCount: number;
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    /**
     * Validate token format (basic JWT structure check)
     */
    private isValidJWTFormat(token: string): boolean {
        if (!token) return false;
        const parts = token.split('.');
        return parts.length === 3;
    }

    // Public HTTP methods
    async get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'GET' });
    }

    async post<T>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async put<T>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async patch<T>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async delete<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'DELETE' });
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        // Get auth token from localStorage and validate it
        let token = typeof window !== 'undefined' ? localStorage.getItem('op3_auth_token') : null;

        // Validate token format (basic JWT check)
        if (token && !this.isValidJWTFormat(token)) {
            console.warn('Invalid token format detected, clearing authentication data');
            if (typeof window !== 'undefined') {
                localStorage.removeItem('op3_auth_token');
                localStorage.removeItem('op3_auth_user');
            }
            token = null;
        }

        const config: RequestInit = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers,
            },
            ...options,
        };

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                // Handle authentication errors (401)
                if (response.status === 401) {
                    console.warn('Authentication failed, clearing stored credentials');
                    // Clear authentication data
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('op3_auth_token');
                        localStorage.removeItem('op3_auth_user');
                    }

                    // Redirect to login page by reloading the app
                    if (typeof window !== 'undefined') {
                        window.location.href = '/';
                    }

                    throw new Error('Authentication required');
                }

                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            // Re-throw authentication errors as-is
            if (error instanceof Error && error.message === 'Authentication required') {
                throw error;
            }
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

    // Admin API methods
    async getSystemSettings(): Promise<{ success: boolean; settings: SystemSettings }> {
        return this.request<{ success: boolean; settings: SystemSettings }>('/admin/system-settings');
    }

    async updateSystemSettings(updates: Partial<SystemSettings>): Promise<{ success: boolean; message: string }> {
        return this.request<{ success: boolean; message: string }>('/admin/system-settings', {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    }

    async getAdminUsers(params: {
        page?: number;
        limit?: number;
        search?: string;
        role?: string;
        isActive?: boolean;
    }): Promise<AdminUsersResponse> {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.set('page', params.page.toString());
        if (params.limit) searchParams.set('limit', params.limit.toString());
        if (params.search) searchParams.set('search', params.search);
        if (params.role) searchParams.set('role', params.role);
        if (params.isActive !== undefined) searchParams.set('isActive', params.isActive.toString());

        return this.request<AdminUsersResponse>(`/admin/users?${searchParams.toString()}`);
    }

    async getUserStats(): Promise<{ success: boolean; stats: UserStats }> {
        return this.request<{ success: boolean; stats: UserStats }>('/admin/users/stats');
    }

    // Public system settings (no authentication required)
    async getPublicSystemSettings(): Promise<{ success: boolean; settings: { registrationEnabled: boolean; loginEnabled: boolean; requireEmailVerification: boolean } }> {
        return this.request<{ success: boolean; settings: { registrationEnabled: boolean; loginEnabled: boolean; requireEmailVerification: boolean } }>('/system-settings/public');
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

    async fetchOpenAIModels(request: { apiKey: string }): Promise<{ success: boolean; models?: any[]; message?: string; error?: string }> {
        return this.request<{ success: boolean; models?: any[]; message?: string; error?: string }>('/ai-providers/openai/models', {
            method: 'POST',
            body: JSON.stringify(request),
        });
    }

    async fetchOpenRouterModels(apiKey: string): Promise<{ success: boolean; models?: OpenRouterModel[]; message?: string; error?: string }> {
        return this.request<{ success: boolean; models?: OpenRouterModel[]; message?: string; error?: string }>('/ai-providers/openrouter/models', {
            method: 'POST',
            body: JSON.stringify({ apiKey }),
        });
    }

    async fetchGoogleModels(apiKey: string): Promise<{ success: boolean; models?: any[]; message?: string; error?: string }> {
        return this.request<{ success: boolean; models?: any[]; message?: string; error?: string }>('/ai-providers/google/models', {
            method: 'POST',
            body: JSON.stringify({ apiKey }),
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
        return this.request<WorkspaceListResponse>(`/workspace/list/${userId}`);
    }

    async getWorkspace(workspaceId: string, userId: string): Promise<{ success: boolean; workspace?: { id: string; name: string; templateType: WorkspaceTemplate; workspaceRules: string; isActive: boolean; createdAt: string }; message?: string }> {
        return this.request<{ success: boolean; workspace?: { id: string; name: string; templateType: WorkspaceTemplate; workspaceRules: string; isActive: boolean; createdAt: string }; message?: string }>(`/workspace/${workspaceId}/${userId}`);
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

    // Workspace Groups methods
    async getUserWorkspaceGroups(userId: string): Promise<{ success: boolean; groups: WorkspaceGroup[] }> {
        return this.request<{ success: boolean; groups: WorkspaceGroup[] }>(`/workspace-groups/user/${userId}`);
    }

    async createWorkspaceGroup(userId: string, name: string, sortOrder?: number): Promise<{ success: boolean; group?: WorkspaceGroup }> {
        return this.request<{ success: boolean; group?: WorkspaceGroup }>('/workspace-groups/create', {
            method: 'POST',
            body: JSON.stringify({ userId, name, sortOrder }),
        });
    }

    async updateWorkspaceGroup(userId: string, groupId: string, name?: string, sortOrder?: number): Promise<{ success: boolean }> {
        return this.request<{ success: boolean }>(`/workspace-groups/${groupId}`, {
            method: 'PUT',
            body: JSON.stringify({ userId, name, sortOrder }),
        });
    }

    async deleteWorkspaceGroup(userId: string, groupId: string): Promise<{ success: boolean }> {
        return this.request<{ success: boolean }>(`/workspace-groups/${groupId}`, {
            method: 'DELETE',
            body: JSON.stringify({ userId }),
        });
    }

    async deleteWorkspaceGroupWithWorkspaces(userId: string, groupId: string): Promise<{ success: boolean }> {
        return this.request<{ success: boolean }>(`/workspace-groups/${groupId}/with-workspaces`, {
            method: 'DELETE',
            body: JSON.stringify({ userId }),
        });
    }

    async reorderWorkspaceGroups(userId: string, groupOrders: Array<{ groupId: string; sortOrder: number }>): Promise<{ success: boolean }> {
        return this.request<{ success: boolean }>('/workspace-groups/reorder', {
            method: 'PUT',
            body: JSON.stringify({ userId, groupOrders }),
        });
    }

    async moveWorkspaceToGroup(userId: string, workspaceId: string, groupId: string | null, sortOrder?: number): Promise<{ success: boolean }> {
        return this.request<{ success: boolean }>(`/workspace-groups/move-workspace`, {
            method: 'PUT',
            body: JSON.stringify({ userId, workspaceId, groupId, sortOrder }),
        });
    }

    async batchUpdateWorkspaces(userId: string, updates: Array<{ workspaceId: string; groupId: string | null; sortOrder: number }>): Promise<{ success: boolean }> {
        return this.request<{ success: boolean }>(`/workspace-groups/batch-update`, {
            method: 'PUT',
            body: JSON.stringify({ userId, updates }),
        });
    }

    async pinWorkspaceGroup(userId: string, groupId: string, isPinned: boolean): Promise<{ success: boolean }> {
        return this.request<{ success: boolean }>('/workspace-groups/pin', {
            method: 'PUT',
            body: JSON.stringify({ userId, groupId, isPinned }),
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

    async createBranchedChatSession(request: CreateChatSessionRequest): Promise<CreateChatSessionResponse> {
        return this.request<CreateChatSessionResponse>('/chat/sessions', {
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

    async updateChatSessionPinStatus(sessionId: string, data: UpdateChatSessionPinStatusRequest): Promise<UpdateChatSessionResponse> {
        return this.request<UpdateChatSessionResponse>(`/chat/sessions/${sessionId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
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

    async updateChatSessionSettings(sessionId: string, request: UpdateChatSessionSettingsRequest): Promise<UpdateChatSessionSettingsResponse> {
        return this.request<UpdateChatSessionSettingsResponse>(`/chat/sessions/${sessionId}/settings`, {
            method: 'PATCH',
            body: JSON.stringify(request),
        });
    }

    async deleteChatSession(sessionId: string, userId: string): Promise<DeleteChatSessionResponse> {
        return this.request<DeleteChatSessionResponse>(`/chat/sessions/${sessionId}`, {
            method: 'DELETE',
            body: JSON.stringify({ userId }),
        });
    }

    // Share chat methods
    async shareChat(sessionId: string): Promise<CreateShareResponse> {
        return this.request<CreateShareResponse>(`/chat/sessions/${sessionId}/share`, {
            method: 'POST',
        });
    }

    async getSharedChat(shareId: string): Promise<GetSharedChatResponse> {
        return this.request<GetSharedChatResponse>(`/share/${shareId}`);
    }

    async getShareStatus(sessionId: string): Promise<GetShareStatusResponse> {
        return this.request<GetShareStatusResponse>(`/chat/sessions/${sessionId}/share`);
    }

    async updateShare(sessionId: string): Promise<UpdateShareResponse> {
        return this.request<UpdateShareResponse>(`/chat/sessions/${sessionId}/share`, {
            method: 'PUT',
        });
    }

    async removeShare(sessionId: string): Promise<RemoveShareResponse> {
        return this.request<RemoveShareResponse>(`/chat/sessions/${sessionId}/share`, {
            method: 'DELETE',
        });
    }

    // Message sharing methods
    async shareMessage(messageId: string): Promise<CreateMessageShareResponse> {
        return this.request<CreateMessageShareResponse>(`/chat/messages/${messageId}/share`, {
            method: 'POST',
        });
    }

    async getSharedMessage(shareId: string): Promise<GetSharedMessageResponse> {
        return this.request<GetSharedMessageResponse>(`/msg/${shareId}`);
    }

    async getMessageShareStatus(messageId: string): Promise<GetMessageShareStatusResponse> {
        return this.request<GetMessageShareStatusResponse>(`/chat/messages/${messageId}/share`);
    }

    async updateMessageShare(messageId: string): Promise<UpdateMessageShareResponse> {
        return this.request<UpdateMessageShareResponse>(`/chat/messages/${messageId}/share`, {
            method: 'PUT',
        });
    }

    async removeMessageShare(messageId: string): Promise<RemoveMessageShareResponse> {
        return this.request<RemoveMessageShareResponse>(`/chat/messages/${messageId}/share`, {
            method: 'DELETE',
        });
    }



    // Save a chat message directly (for partial messages)
    async saveChatMessage(message: ChatMessage): Promise<{ success: boolean; message: string; savedMessage?: ChatMessage }> {
        return this.request<{ success: boolean; message: string; savedMessage?: ChatMessage }>(`/chat/sessions/${message.sessionId}/save-message`, {
            method: 'POST',
            body: JSON.stringify(message),
        });
    }

    // AI Streaming chat method with enhanced error handling and abort capability
    // File upload methods
    async uploadFiles(sessionId: string, files: File[], userId: string): Promise<FileUploadResponse> {
        const formData = new FormData();
        formData.append('userId', userId);

        files.forEach(file => {
            formData.append('files', file);
        });

        // Special handling for file uploads - don't use the standard request method
        const token = typeof window !== 'undefined' ? localStorage.getItem('op3_auth_token') : null;

        const response = await fetch(`${this.baseUrl}/files/sessions/${sessionId}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
            },
            body: formData,
        });

        if (!response.ok) {
            // Handle authentication errors (401)
            if (response.status === 401) {
                console.warn('Authentication failed in file upload, clearing stored credentials');
                // Clear authentication data
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('op3_auth_token');
                    localStorage.removeItem('op3_auth_user');
                }

                // Redirect to login page by reloading the app
                if (typeof window !== 'undefined') {
                    window.location.href = '/';
                }

                throw new Error('Authentication required');
            }

            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    }

    async getSessionFileAttachments(sessionId: string): Promise<FileAttachmentListResponse> {
        return this.request<FileAttachmentListResponse>(`/files/sessions/${sessionId}/attachments`);
    }

    // Get file attachments by IDs
    async getFileAttachmentsByIds(attachmentIds: string[]): Promise<FileAttachment[]> {
        if (attachmentIds.length === 0) return [];

        const promises = attachmentIds.map(async (id) => {
            try {
                const response = await this.request<{ success: boolean; attachment?: FileAttachment }>(`/files/attachments/${id}`);
                return response.attachment;
            } catch (error) {
                console.error(`Error fetching attachment ${id}:`, error);
                return null;
            }
        });

        const results = await Promise.all(promises);
        return results.filter((attachment): attachment is FileAttachment => attachment !== null);
    }

    async streamChatMessage(
        sessionId: string,
        request: SendMessageRequest & { userId: string },
        callbacks: StreamingCallbacks,
        abortController?: AbortController
    ): Promise<void> {
        try {
            // Get auth token from localStorage and validate it
            let token = typeof window !== 'undefined' ? localStorage.getItem('op3_auth_token') : null;

            // Validate token format (basic JWT check)
            if (token && !this.isValidJWTFormat(token)) {
                console.warn('Invalid token format detected in streaming, clearing authentication data');
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('op3_auth_token');
                    localStorage.removeItem('op3_auth_user');
                }
                token = null;
            }

            const response = await fetch(`${this.baseUrl}/chat/sessions/${sessionId}/ai-stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
                body: JSON.stringify(request),
                signal: abortController?.signal,
            });

            if (!response.ok) {
                // Handle authentication errors (401)
                if (response.status === 401) {
                    console.warn('Authentication failed in streaming, clearing stored credentials');
                    // Clear authentication data
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('op3_auth_token');
                        localStorage.removeItem('op3_auth_user');
                    }

                    // Redirect to login page by reloading the app
                    if (typeof window !== 'undefined') {
                        window.location.href = '/';
                    }

                    throw new Error('Authentication required');
                }

                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body reader available');
            }

            const decoder = new TextDecoder();
            let buffer = '';
            let hasReceivedData = false;
            let timeoutId: NodeJS.Timeout | null = null;

            // Set up timeout for detecting stalled streams
            const resetTimeout = () => {
                if (timeoutId) clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    callbacks.onError('Stream timeout - no data received for 30 seconds');
                }, 30000);
            };

            resetTimeout();

            try {
                while (true) {
                    const { done, value } = await reader.read();

                    if (done) break;

                    hasReceivedData = true;
                    resetTimeout();

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));

                                if (data.type === 'chunk') {
                                    callbacks.onChunk(data);
                                } else if (data.type === 'complete') {
                                    callbacks.onComplete(data.message);
                                    if (timeoutId) clearTimeout(timeoutId);
                                    return;
                                } else if (data.type === 'error') {
                                    callbacks.onError(data.message);
                                    if (timeoutId) clearTimeout(timeoutId);
                                    return;
                                } else if (data.type === 'search_start') {
                                    callbacks.onSearchStart?.(data.searchQuery);
                                } else if (data.type === 'search_results') {
                                    callbacks.onSearchResults?.(data.searchQuery, data.searchResults);
                                } else if (data.type === 'reasoning_step') {
                                    callbacks.onChunk(data);
                                }
                            } catch {
                                // Ignore parsing errors for malformed SSE data
                                console.warn('Failed to parse SSE data:', line);
                            }
                        }
                    }
                }

                // If we reach here without completion, it might be an incomplete stream
                if (timeoutId) clearTimeout(timeoutId);
                if (hasReceivedData) {
                    callbacks.onError('Stream ended unexpectedly');
                } else {
                    callbacks.onError('No data received from server');
                }
            } finally {
                if (timeoutId) clearTimeout(timeoutId);
            }
        } catch (error) {
            // Enhanced error handling with specific error types
            let errorMessage = 'Unknown error';
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    // Only call onStop if it was a user-initiated abort
                    if (abortController?.signal.aborted) {
                        callbacks.onStop?.();
                    }
                    return;
                } else if (error.message.includes('fetch')) {
                    errorMessage = 'Network connection failed';
                } else if (error.message.includes('timeout')) {
                    errorMessage = 'Request timed out';
                } else {
                    errorMessage = error.message;
                }
            }

            callbacks.onError(errorMessage);
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

    // Workspace AI Favorites API methods
    async getWorkspaceAIFavorites(workspaceId: string): Promise<WorkspaceAIFavoritesResponse> {
        return this.request<WorkspaceAIFavoritesResponse>(`/workspace-ai-favorites/${workspaceId}`);
    }

    async addAIFavorite(request: CreateAIFavoriteRequest): Promise<CreateAIFavoriteResponse> {
        return this.request<CreateAIFavoriteResponse>('/workspace-ai-favorites', {
            method: 'POST',
            body: JSON.stringify(request),
        });
    }

    async updateAIFavorite(favoriteId: string, request: UpdateAIFavoriteRequest): Promise<CreateAIFavoriteResponse> {
        return this.request<CreateAIFavoriteResponse>(`/workspace-ai-favorites/${favoriteId}`, {
            method: 'PUT',
            body: JSON.stringify(request),
        });
    }

    async removeAIFavorite(favoriteId: string): Promise<DeleteAIFavoriteResponse> {
        return this.request<DeleteAIFavoriteResponse>(`/workspace-ai-favorites/${favoriteId}`, {
            method: 'DELETE',
        });
    }

    async reorderAIFavorites(workspaceId: string, favoriteIds: string[]): Promise<DeleteAIFavoriteResponse> {
        return this.request<DeleteAIFavoriteResponse>(`/workspace-ai-favorites/${workspaceId}/reorder`, {
            method: 'POST',
            body: JSON.stringify({ favoriteIds }),
        });
    }

    async checkAIFavoriteStatus(workspaceId: string, aiProviderId: string): Promise<CheckAIFavoriteResponse> {
        return this.request<CheckAIFavoriteResponse>(`/workspace-ai-favorites/${workspaceId}/check/${aiProviderId}`);
    }

    // Workspace Personality Favorites API methods
    async getWorkspacePersonalityFavorites(workspaceId: string): Promise<WorkspacePersonalityFavoritesResponse> {
        return this.request<WorkspacePersonalityFavoritesResponse>(`/workspace-personality-favorites/${workspaceId}`);
    }

    async addPersonalityFavorite(request: CreatePersonalityFavoriteRequest): Promise<CreatePersonalityFavoriteResponse> {
        return this.request<CreatePersonalityFavoriteResponse>('/workspace-personality-favorites', {
            method: 'POST',
            body: JSON.stringify(request),
        });
    }

    async removePersonalityFavorite(favoriteId: string): Promise<DeletePersonalityFavoriteResponse> {
        return this.request<DeletePersonalityFavoriteResponse>(`/workspace-personality-favorites/${favoriteId}`, {
            method: 'DELETE',
        });
    }

    async reorderPersonalityFavorites(workspaceId: string, favoriteIds: string[]): Promise<DeletePersonalityFavoriteResponse> {
        return this.request<DeletePersonalityFavoriteResponse>(`/workspace-personality-favorites/${workspaceId}/reorder`, {
            method: 'PUT',
            body: JSON.stringify({ favoriteIds }),
        });
    }

    async checkPersonalityFavoriteStatus(workspaceId: string, personalityId: string): Promise<CheckPersonalityFavoriteResponse> {
        return this.request<CheckPersonalityFavoriteResponse>(`/workspace-personality-favorites/${workspaceId}/check/${personalityId}`);
    }

    async getProviderStatistics(
        workspaceId: string,
        userId: string,
        dateRange: string = 'this-week'
    ): Promise<ProviderStatisticsResponse> {
        const params = new URLSearchParams({
            userId,
            dateRange
        });

        return this.request<ProviderStatisticsResponse>(
            `/statistics/workspace/${workspaceId}/providers?${params.toString()}`
        );
    }

    async getUsageTrends(
        workspaceId: string,
        userId: string,
        dateRange: string = 'this-week'
    ): Promise<UsageTrendsResponse> {
        const params = new URLSearchParams({
            userId,
            dateRange
        });

        return this.request<UsageTrendsResponse>(
            `/statistics/workspace/${workspaceId}/trends?${params.toString()}`
        );
    }

    async getSummaryStatistics(
        workspaceId: string,
        userId: string,
        dateRange: string = 'this-week'
    ): Promise<SummaryStatisticsResponse> {
        const params = new URLSearchParams({
            userId,
            dateRange
        });

        return this.request<SummaryStatisticsResponse>(
            `/statistics/workspace/${workspaceId}/summary?${params.toString()}`
        );
    }

    // Unified statistics method for the hook
    async getStatistics(
        workspaceId: string,
        userId: string,
        options: { range: string; startDate?: string; endDate?: string }
    ): Promise<StatisticsResponse> {
        return this.getWorkspaceStatistics(
            workspaceId,
            userId,
            options.range,
            options.startDate,
            options.endDate
        );
    }

    // OpenRouter API methods
    async validateOpenRouterApiKey(request: ValidateOpenRouterApiKeyRequest): Promise<ValidateOpenRouterApiKeyResponse> {
        return this.request<ValidateOpenRouterApiKeyResponse>('/workspace-openrouter/validate', {
            method: 'POST',
            body: JSON.stringify(request)
        });
    }

    async getWorkspaceOpenRouterSettings(workspaceId: string): Promise<GetWorkspaceOpenRouterSettingsResponse> {
        return this.request<GetWorkspaceOpenRouterSettingsResponse>(`/workspace-openrouter/${workspaceId}`);
    }

    async saveWorkspaceOpenRouterSettings(request: SaveWorkspaceOpenRouterSettingsRequest): Promise<SaveWorkspaceOpenRouterSettingsResponse> {
        return this.request<SaveWorkspaceOpenRouterSettingsResponse>(`/workspace-openrouter/${request.workspaceId}`, {
            method: 'POST',
            body: JSON.stringify(request)
        });
    }

    async deleteWorkspaceOpenRouterSettings(workspaceId: string): Promise<{ success: boolean; message: string }> {
        return this.request<{ success: boolean; message: string }>(`/workspace-openrouter/${workspaceId}`, {
            method: 'DELETE'
        });
    }

    // Global OpenRouter API methods
    async getGlobalOpenRouterSettings(): Promise<GetGlobalOpenRouterSettingsResponse> {
        return this.request<GetGlobalOpenRouterSettingsResponse>('/openrouter/settings');
    }

    async getGlobalOpenRouterModels(): Promise<ValidateOpenRouterApiKeyResponse> {
        return this.request<ValidateOpenRouterApiKeyResponse>('/openrouter/models');
    }

    async saveGlobalOpenRouterSettings(request: SaveGlobalOpenRouterSettingsRequest): Promise<SaveGlobalOpenRouterSettingsResponse> {
        return this.request<SaveGlobalOpenRouterSettingsResponse>('/openrouter/settings', {
            method: 'POST',
            body: JSON.stringify(request)
        });
    }

    async updateGlobalOpenRouterModels(selectedModels: string[]): Promise<SaveGlobalOpenRouterSettingsResponse> {
        return this.request<SaveGlobalOpenRouterSettingsResponse>('/openrouter/settings/models', {
            method: 'PATCH',
            body: JSON.stringify({ selectedModels })
        });
    }

    async deleteGlobalOpenRouterSettings(): Promise<{ success: boolean; message: string }> {
        return this.request<{ success: boolean; message: string }>('/openrouter/settings', {
            method: 'DELETE'
        });
    }
}

// OpenRouter specific types
export interface OpenRouterModel {
    id: string;
    name: string;
    description?: string;
    context_length?: number;
    pricing?: {
        prompt: string;
        completion: string;
    };
    top_provider?: {
        max_completion_tokens?: number;
    };
}

export interface WorkspaceOpenRouterSettings {
    id?: string;
    workspaceId: string;
    apiKey: string;
    selectedModels: string[];
    isEnabled: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ValidateOpenRouterApiKeyRequest {
    apiKey: string;
}

export interface ValidateOpenRouterApiKeyResponse {
    success: boolean;
    message: string;
    models?: OpenRouterModel[];
    error?: string;
}

export interface SaveWorkspaceOpenRouterSettingsRequest {
    workspaceId: string;
    apiKey: string;
    selectedModels: string[];
    isEnabled: boolean;
}

export interface SaveWorkspaceOpenRouterSettingsResponse {
    success: boolean;
    message: string;
    settings?: WorkspaceOpenRouterSettings;
    error?: string;
}

export interface GetWorkspaceOpenRouterSettingsResponse {
    success: boolean;
    settings?: WorkspaceOpenRouterSettings;
    message?: string;
    error?: string;
}

// Global OpenRouter types
export interface GlobalOpenRouterSettings {
    id?: string;
    apiKey: string;
    selectedModels: string[];
    isEnabled: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface SaveGlobalOpenRouterSettingsRequest {
    apiKey: string;
    selectedModels: string[];
    isEnabled: boolean;
}

export interface SaveGlobalOpenRouterSettingsResponse {
    success: boolean;
    message: string;
    settings?: GlobalOpenRouterSettings;
    error?: string;
}

export interface GetGlobalOpenRouterSettingsResponse {
    success: boolean;
    settings?: GlobalOpenRouterSettings;
    message?: string;
    error?: string;
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
