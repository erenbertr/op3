export interface ChatSession {
    id: string;
    userId: string;
    workspaceId: string;
    title: string;
    lastUsedPersonalityId?: string;
    lastUsedAIProviderId?: string;
    isPinned?: boolean;
    isShared?: boolean; // Indicates if this chat is currently shared
    parentSessionId?: string; // For branched chats
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
    fileAttachments?: string[]; // Array of file attachment IDs
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
    isContinuation?: boolean;
    searchEnabled?: boolean;
    reasoningEnabled?: boolean;
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
    isPinned?: boolean;
}

export interface UpdateChatSessionSettingsRequest {
    lastUsedPersonalityId?: string;
    lastUsedAIProviderId?: string;
}

// Shared chat types
export interface SharedChat {
    id: string; // UUID for the share
    originalChatId: string; // Reference to the original chat session
    title: string; // Chat title for display
    messages: SharedChatMessage[]; // Simplified messages without metadata
    messageCount: number; // Number of messages included in the share
    createdAt: Date;
    isActive: boolean; // For future management/deletion
}

export interface SharedChatMessage {
    id: string;
    content: string;
    role: 'user' | 'assistant';
    createdAt: Date;
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

export interface GetSharedChatResponse {
    success: boolean;
    message: string;
    sharedChat?: SharedChat;
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

export interface StreamingChatRequest {
    content: string;
    personalityId?: string;
    aiProviderId?: string;
    sessionId: string;
    userId: string;
    searchEnabled?: boolean;
    reasoningEnabled?: boolean;
    fileAttachments?: string[];
}
