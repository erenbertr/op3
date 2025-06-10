export interface ChatSession {
    id: string;
    userId: string;
    workspaceId: string;
    title: string;
    lastUsedPersonalityId?: string;
    lastUsedAIProviderId?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ChatMessage {
    id: string;
    sessionId: string;
    content: string;
    role: 'user' | 'assistant';
    personalityId?: string;
    aiProviderId?: string;
    createdAt: Date;
    apiMetadata?: ApiMetadata;
    isPartial?: boolean; // For messages that were stopped mid-stream
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
    isContinuation?: boolean;
    searchEnabled?: boolean;
    fileAttachments?: string[]; // Array of file attachment IDs
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

export interface UpdateChatSessionSettingsRequest {
    lastUsedPersonalityId?: string;
    lastUsedAIProviderId?: string;
}

export interface UpdateChatSessionSettingsResponse {
    success: boolean;
    message: string;
    session?: ChatSession;
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
