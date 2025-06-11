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
    isPartial?: boolean; // For messages that were stopped mid-stream
    fileAttachments?: string[]; // Array of file attachment IDs
    attachmentData?: FileAttachment[]; // Direct attachment data for display (client-side only)
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
    searchEnabled?: boolean;
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

export interface StatisticsResponse {
    success: boolean;
    message: string;
    statistics?: WorkspaceStatistics;
}

export interface StreamChunk {
    type: 'chunk' | 'error' | 'complete' | 'search_start' | 'search_results';
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
                                }
                            } catch (error) {
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
