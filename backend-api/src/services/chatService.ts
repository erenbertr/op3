import { v4 as uuidv4 } from 'uuid';
import { DatabaseManager } from '../config/database';
import {
    ChatSession,
    ChatMessage,
    CreateChatSessionRequest,
    CreateChatSessionResponse,
    SendMessageRequest,
    SendMessageResponse,
    ChatSessionsListResponse,
    ChatMessagesResponse,
    UpdateChatSessionRequest,
    UpdateChatSessionResponse,
    UpdateChatSessionSettingsRequest,
    UpdateChatSessionSettingsResponse,
    DeleteChatSessionResponse,
    SharedChat,
    SharedChatMessage,
    CreateShareRequest,
    CreateShareResponse,
    GetSharedChatResponse,
    GetShareStatusResponse,
    UpdateShareResponse,
    RemoveShareResponse,
    SharedMessage,
    CreateMessageShareRequest,
    CreateMessageShareResponse,
    GetSharedMessageResponse,
    GetMessageShareStatusResponse,
    UpdateMessageShareResponse,
    RemoveMessageShareResponse
} from '../types/chat';

export class ChatService {
    private static instance: ChatService;
    private dbManager: DatabaseManager;

    private constructor() {
        this.dbManager = DatabaseManager.getInstance();
    }

    public static getInstance(): ChatService {
        if (!ChatService.instance) {
            ChatService.instance = new ChatService();
        }
        return ChatService.instance;
    }

    /**
     * Create a new chat session
     */
    public async createChatSession(request: CreateChatSessionRequest): Promise<CreateChatSessionResponse> {
        try {
            console.log('[DEBUG] Creating chat session with request:', {
                userId: request.userId,
                workspaceId: request.workspaceId,
                title: request.title,
                parentSessionId: request.parentSessionId,
                branchFromMessageId: request.branchFromMessageId
            });

            const session: ChatSession = {
                id: uuidv4(),
                userId: request.userId,
                workspaceId: request.workspaceId,
                title: request.title || 'New Chat',
                parentSessionId: request.parentSessionId,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await this.saveChatSession(session);
            console.log('[DEBUG] Chat session saved:', session.id);

            // If this is a branched chat, copy messages up to the branch point
            if (request.parentSessionId && request.branchFromMessageId) {
                console.log('[DEBUG] This is a branched chat, copying messages...');
                await this.copyMessagesForBranch(request.parentSessionId, session.id, request.branchFromMessageId);
                console.log('[DEBUG] Messages copied successfully');
            } else {
                console.log('[DEBUG] Not a branched chat - parentSessionId:', request.parentSessionId, 'branchFromMessageId:', request.branchFromMessageId);
            }

            return {
                success: true,
                message: 'Chat session created successfully',
                session
            };
        } catch (error) {
            console.error('Error creating chat session:', error);
            return {
                success: false,
                message: `Failed to create chat session: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Copy messages from parent session up to a specific message for branching
     */
    private async copyMessagesForBranch(parentSessionId: string, newSessionId: string, branchFromMessageId: string): Promise<void> {
        try {
            console.log('[DEBUG] copyMessagesForBranch called with:', {
                parentSessionId,
                newSessionId,
                branchFromMessageId
            });

            // Get all messages from parent session
            const parentMessages = await this.getSessionMessages(parentSessionId);
            console.log('[DEBUG] Found', parentMessages.length, 'messages in parent session');

            // Find the index of the branch message
            const branchMessageIndex = parentMessages.findIndex(msg => msg.id === branchFromMessageId);
            console.log('[DEBUG] Branch message index:', branchMessageIndex);

            if (branchMessageIndex === -1) {
                console.error('[DEBUG] Branch message not found! Available message IDs:', parentMessages.map(m => m.id));
                throw new Error('Branch message not found in parent session');
            }

            // Copy messages up to and including the branch message
            const messagesToCopy = parentMessages.slice(0, branchMessageIndex + 1);
            console.log('[DEBUG] Will copy', messagesToCopy.length, 'messages');

            for (const message of messagesToCopy) {
                const newMessage: ChatMessage = {
                    ...message,
                    id: uuidv4(), // Generate new ID
                    sessionId: newSessionId, // Set to new session
                    createdAt: new Date() // Update timestamp
                };

                console.log('[DEBUG] Copying message:', {
                    originalId: message.id,
                    newId: newMessage.id,
                    content: message.content.substring(0, 50) + '...'
                });

                const saveResult = await this.saveChatMessage(newMessage);
                if (!saveResult.success) {
                    throw new Error(`Failed to save copied message: ${saveResult.message}`);
                }
                console.log('[DEBUG] Message saved successfully:', newMessage.id);
            }

            console.log('[DEBUG] Successfully copied all messages');
        } catch (error) {
            console.error('Error copying messages for branch:', error);
            throw error;
        }
    }

    /**
     * Get all chat sessions for a user in a specific workspace
     */
    public async getChatSessions(userId: string, workspaceId?: string): Promise<ChatSessionsListResponse> {
        try {
            const sessions = await this.getUserChatSessions(userId, workspaceId);
            return {
                success: true,
                message: 'Chat sessions retrieved successfully',
                sessions
            };
        } catch (error) {
            console.error('Error getting chat sessions:', error);
            return {
                success: false,
                message: `Failed to get chat sessions: ${error instanceof Error ? error.message : 'Unknown error'}`,
                sessions: []
            };
        }
    }

    /**
     * Get messages for a specific chat session
     */
    public async getChatMessages(sessionId: string): Promise<ChatMessagesResponse> {
        try {
            console.log(`[DEBUG] Getting messages for session: ${sessionId}`);
            const messages = await this.getSessionMessages(sessionId);
            console.log(`[DEBUG] Retrieved ${messages.length} messages:`, messages);
            return {
                success: true,
                message: 'Chat messages retrieved successfully',
                messages
            };
        } catch (error) {
            console.error('Error getting chat messages:', error);
            return {
                success: false,
                message: `Failed to get chat messages: ${error instanceof Error ? error.message : 'Unknown error'}`,
                messages: []
            };
        }
    }

    /**
     * Send a user message to a chat session (without AI response)
     * Note: AI responses should be handled via the streaming endpoint
     */
    public async sendMessage(sessionId: string, request: SendMessageRequest): Promise<SendMessageResponse> {
        try {
            // Create user message
            const userMessage: ChatMessage = {
                id: uuidv4(),
                sessionId,
                content: request.content,
                role: 'user',
                personalityId: request.personalityId,
                aiProviderId: request.aiProviderId,
                createdAt: new Date(),
                fileAttachments: request.fileAttachments
            };

            await this.saveChatMessageInternal(userMessage);

            // Update session timestamp
            await this.updateSessionTimestamp(sessionId);

            return {
                success: true,
                message: 'User message sent successfully',
                userMessage
                // Note: aiResponse removed - AI responses handled via streaming endpoint
            };
        } catch (error) {
            console.error('Error sending message:', error);
            return {
                success: false,
                message: `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Get a single chat session by ID
     */
    public async getChatSession(sessionId: string): Promise<{ success: boolean; session?: ChatSession; message?: string }> {
        try {
            const session = await this.getChatSessionById(sessionId);
            if (!session) {
                return {
                    success: false,
                    message: 'Chat session not found'
                };
            }
            return {
                success: true,
                session
            };
        } catch (error) {
            console.error('Error getting chat session:', error);
            return {
                success: false,
                message: `Failed to get chat session: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Update a chat session
     */
    public async updateChatSession(sessionId: string, request: UpdateChatSessionRequest): Promise<UpdateChatSessionResponse> {
        try {
            const session = await this.getChatSessionById(sessionId);
            if (!session) {
                return {
                    success: false,
                    message: 'Chat session not found'
                };
            }

            if (request.title) {
                session.title = request.title;
            }
            if (request.isPinned !== undefined) {
                session.isPinned = request.isPinned;
            }
            session.updatedAt = new Date();

            await this.updateChatSessionInDb(session);

            return {
                success: true,
                message: 'Chat session updated successfully',
                session
            };
        } catch (error) {
            console.error('Error updating chat session:', error);
            return {
                success: false,
                message: `Failed to update chat session: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Update chat session settings (personality and AI provider preferences)
     */
    public async updateChatSessionSettings(sessionId: string, request: UpdateChatSessionSettingsRequest): Promise<UpdateChatSessionSettingsResponse> {
        try {
            const session = await this.getChatSessionById(sessionId);
            if (!session) {
                return {
                    success: false,
                    message: 'Chat session not found'
                };
            }

            // Update session settings
            if (request.lastUsedPersonalityId !== undefined) {
                session.lastUsedPersonalityId = request.lastUsedPersonalityId;
            }
            if (request.lastUsedAIProviderId !== undefined) {
                session.lastUsedAIProviderId = request.lastUsedAIProviderId;
            }
            session.updatedAt = new Date();

            await this.updateChatSessionInDb(session);

            return {
                success: true,
                message: 'Chat session settings updated successfully',
                session
            };
        } catch (error) {
            console.error('Error updating chat session settings:', error);
            return {
                success: false,
                message: `Failed to update chat session settings: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Delete a chat session
     */
    public async deleteChatSession(sessionId: string): Promise<DeleteChatSessionResponse> {
        try {
            await this.deleteChatSessionFromDb(sessionId);
            await this.deleteSessionMessages(sessionId);

            return {
                success: true,
                message: 'Chat session deleted successfully'
            };
        } catch (error) {
            console.error('Error deleting chat session:', error);
            return {
                success: false,
                message: `Failed to delete chat session: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Create a public share for a chat session
     */
    public async createChatShare(sessionId: string): Promise<CreateShareResponse> {
        try {
            // Get the chat session to verify it exists and get the title
            const session = await this.getChatSessionById(sessionId);
            if (!session) {
                return {
                    success: false,
                    message: 'Chat session not found'
                };
            }

            // Get all messages for the session
            const messages = await this.getSessionMessages(sessionId);

            // Filter and simplify messages (remove metadata, keep only user and assistant messages)
            const simplifiedMessages: SharedChatMessage[] = messages
                .filter(msg => msg.role === 'user' || msg.role === 'assistant')
                .map(msg => ({
                    id: msg.id,
                    content: msg.content,
                    role: msg.role,
                    createdAt: msg.createdAt
                }));

            // Create shared chat object
            const sharedChat: SharedChat = {
                id: uuidv4(),
                originalChatId: sessionId,
                title: session.title,
                messages: simplifiedMessages,
                messageCount: simplifiedMessages.length,
                createdAt: new Date(),
                isActive: true
            };

            // Save to database
            console.log(`[SHARE DEBUG] Saving shared chat: ${sharedChat.id} for originalChatId: ${sharedChat.originalChatId}`);
            await this.saveSharedChat(sharedChat);

            // Update the original chat session to mark it as shared
            console.log(`[SHARE DEBUG] Marking session ${sessionId} as shared`);
            session.isShared = true;
            await this.updateChatSessionInDb(session);
            console.log(`[SHARE DEBUG] Share creation completed for session: ${sessionId}`);

            return {
                success: true,
                message: 'Chat shared successfully',
                shareId: sharedChat.id,
                shareUrl: `/share/${sharedChat.id}`
            };
        } catch (error) {
            console.error('Error creating chat share:', error);
            return {
                success: false,
                message: `Failed to create chat share: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Get a shared chat by its share ID (public access)
     */
    public async getSharedChat(shareId: string): Promise<GetSharedChatResponse> {
        try {
            const sharedChat = await this.getSharedChatById(shareId);
            if (!sharedChat) {
                return {
                    success: false,
                    message: 'Shared chat not found'
                };
            }

            if (!sharedChat.isActive) {
                return {
                    success: false,
                    message: 'This shared chat is no longer available'
                };
            }

            return {
                success: true,
                message: 'Shared chat retrieved successfully',
                sharedChat
            };
        } catch (error) {
            console.error('Error getting shared chat:', error);
            return {
                success: false,
                message: `Failed to get shared chat: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Get share status for a chat session
     */
    public async getShareStatus(sessionId: string): Promise<any> {
        try {
            console.log(`[SHARE DEBUG] ${new Date().toISOString()} - Getting share status for session: ${sessionId}`);
            const session = await this.getChatSessionById(sessionId);
            if (!session) {
                console.log(`[SHARE DEBUG] Session not found: ${sessionId}`);
                return {
                    success: false,
                    message: 'Chat session not found',
                    isShared: false
                };
            }

            console.log(`[SHARE DEBUG] Session found. isShared: ${session.isShared}`);
            if (!session.isShared) {
                return {
                    success: true,
                    message: 'Chat is not shared',
                    isShared: false
                };
            }

            // Find the shared chat entry
            console.log(`[SHARE DEBUG] Looking for shared chat with originalChatId: ${sessionId}`);
            const sharedChat = await this.getSharedChatByOriginalId(sessionId);
            if (!sharedChat) {
                console.log(`[SHARE DEBUG] No shared chat found for originalChatId: ${sessionId}. Marking session as not shared.`);
                // Inconsistent state - session marked as shared but no share found
                session.isShared = false;
                await this.updateChatSessionInDb(session);
                return {
                    success: true,
                    message: 'Chat is not shared',
                    isShared: false
                };
            }

            console.log(`[SHARE DEBUG] Shared chat found: ${sharedChat.id}, messageCount: ${sharedChat.messageCount}`);
            return {
                success: true,
                message: 'Share status retrieved successfully',
                isShared: true,
                shareId: sharedChat.id,
                shareUrl: `/share/${sharedChat.id}`,
                messageCount: sharedChat.messageCount,
                createdAt: sharedChat.createdAt.toISOString()
            };
        } catch (error) {
            console.error('Error getting share status:', error);
            return {
                success: false,
                message: `Failed to get share status: ${error instanceof Error ? error.message : 'Unknown error'}`,
                isShared: false
            };
        }
    }

    /**
     * Update an existing share with current chat messages
     */
    public async updateShare(sessionId: string): Promise<any> {
        try {
            const session = await this.getChatSessionById(sessionId);
            if (!session) {
                return {
                    success: false,
                    message: 'Chat session not found'
                };
            }

            if (!session.isShared) {
                return {
                    success: false,
                    message: 'Chat is not currently shared'
                };
            }

            // Get existing shared chat
            const existingShare = await this.getSharedChatByOriginalId(sessionId);
            if (!existingShare) {
                return {
                    success: false,
                    message: 'Shared chat not found'
                };
            }

            // Get current messages
            const messages = await this.getSessionMessages(sessionId);
            const simplifiedMessages = messages.map(msg => ({
                id: msg.id,
                content: msg.content,
                role: msg.role,
                createdAt: msg.createdAt
            }));

            // Update the shared chat
            const updatedShare: SharedChat = {
                ...existingShare,
                title: session.title,
                messages: simplifiedMessages,
                messageCount: simplifiedMessages.length
            };

            await this.updateSharedChat(updatedShare);

            return {
                success: true,
                message: 'Share updated successfully',
                messageCount: simplifiedMessages.length
            };
        } catch (error) {
            console.error('Error updating share:', error);
            return {
                success: false,
                message: `Failed to update share: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Remove a share for a chat session
     */
    public async removeShare(sessionId: string): Promise<any> {
        try {
            const session = await this.getChatSessionById(sessionId);
            if (!session) {
                return {
                    success: false,
                    message: 'Chat session not found'
                };
            }

            if (!session.isShared) {
                return {
                    success: true,
                    message: 'Chat is not currently shared'
                };
            }

            // Get existing shared chat
            const existingShare = await this.getSharedChatByOriginalId(sessionId);
            if (existingShare) {
                await this.deleteSharedChat(existingShare.id);
            }

            // Update session to mark as not shared
            session.isShared = false;
            await this.updateChatSessionInDb(session);

            return {
                success: true,
                message: 'Share removed successfully'
            };
        } catch (error) {
            console.error('Error removing share:', error);
            return {
                success: false,
                message: `Failed to remove share: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Create a public share for a message
     */
    public async createMessageShare(messageId: string): Promise<CreateMessageShareResponse> {
        try {
            // Get the original message
            const message = await this.getMessageById(messageId);
            if (!message) {
                return {
                    success: false,
                    message: 'Message not found'
                };
            }

            // Check if message is already shared
            const existingSharedMessage = await this.getSharedMessageByOriginalId(messageId);
            if (existingSharedMessage) {
                return {
                    success: true,
                    message: 'Message is already shared',
                    shareId: existingSharedMessage.id,
                    shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/msg/${existingSharedMessage.id}`
                };
            }

            // Create shared message
            const sharedMessage: SharedMessage = {
                id: uuidv4(),
                originalMessageId: messageId,
                content: message.content,
                role: message.role,
                createdAt: new Date(),
                isActive: true
            };

            // Save shared message
            await this.saveSharedMessage(sharedMessage);

            // Update the original message to mark it as shared
            message.isShared = true;
            await this.updateMessage(message);

            return {
                success: true,
                message: 'Message shared successfully',
                shareId: sharedMessage.id,
                shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/msg/${sharedMessage.id}`
            };
        } catch (error) {
            console.error('Error creating message share:', error);
            return {
                success: false,
                message: 'Failed to create message share'
            };
        }
    }

    /**
     * Get a shared message by its share ID (public access)
     */
    public async getSharedMessage(shareId: string): Promise<GetSharedMessageResponse> {
        try {
            const sharedMessage = await this.getSharedMessageById(shareId);
            if (!sharedMessage || !sharedMessage.isActive) {
                return {
                    success: false,
                    message: 'Shared message not found or no longer available'
                };
            }

            return {
                success: true,
                message: 'Shared message retrieved successfully',
                sharedMessage
            };
        } catch (error) {
            console.error('Error getting shared message:', error);
            return {
                success: false,
                message: 'Failed to retrieve shared message'
            };
        }
    }

    /**
     * Get share status for a message
     */
    public async getMessageShareStatus(messageId: string): Promise<GetMessageShareStatusResponse> {
        try {
            const message = await this.getMessageById(messageId);
            if (!message) {
                return {
                    success: false,
                    message: 'Message not found',
                    isShared: false
                };
            }

            if (!message.isShared) {
                return {
                    success: true,
                    message: 'Message is not shared',
                    isShared: false
                };
            }

            const sharedMessage = await this.getSharedMessageByOriginalId(messageId);
            if (!sharedMessage || !sharedMessage.isActive) {
                return {
                    success: true,
                    message: 'Message is not shared',
                    isShared: false
                };
            }

            return {
                success: true,
                message: 'Message share status retrieved successfully',
                isShared: true,
                shareId: sharedMessage.id,
                shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/msg/${sharedMessage.id}`
            };
        } catch (error) {
            console.error('Error getting message share status:', error);
            return {
                success: false,
                message: 'Failed to get message share status',
                isShared: false
            };
        }
    }

    /**
     * Update a message share (refresh content)
     */
    public async updateMessageShare(messageId: string): Promise<UpdateMessageShareResponse> {
        try {
            const message = await this.getMessageById(messageId);
            if (!message) {
                return {
                    success: false,
                    message: 'Message not found'
                };
            }

            const sharedMessage = await this.getSharedMessageByOriginalId(messageId);
            if (!sharedMessage) {
                return {
                    success: false,
                    message: 'No active share found for this message'
                };
            }

            // Update shared message content
            sharedMessage.content = message.content;
            await this.updateSharedMessage(sharedMessage);

            return {
                success: true,
                message: 'Message share updated successfully'
            };
        } catch (error) {
            console.error('Error updating message share:', error);
            return {
                success: false,
                message: 'Failed to update message share'
            };
        }
    }

    /**
     * Remove a share for a message
     */
    public async removeMessageShare(messageId: string): Promise<RemoveMessageShareResponse> {
        try {
            const message = await this.getMessageById(messageId);
            if (!message) {
                return {
                    success: false,
                    message: 'Message not found'
                };
            }

            if (!message.isShared) {
                return {
                    success: true,
                    message: 'Message is not currently shared'
                };
            }

            // Get existing shared message
            const existingSharedMessage = await this.getSharedMessageByOriginalId(messageId);
            if (existingSharedMessage) {
                await this.deleteSharedMessage(existingSharedMessage.id);
            }

            // Update message to mark as not shared
            message.isShared = false;
            await this.updateMessage(message);

            return {
                success: true,
                message: 'Message share removed successfully'
            };
        } catch (error) {
            console.error('Error removing message share:', error);
            return {
                success: false,
                message: 'Failed to remove message share'
            };
        }
    }

    /**
     * Private helper methods for database operations
     */
    private async saveChatSession(session: ChatSession): Promise<void> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();

        switch (config.type) {
            case 'localdb':
                await this.saveChatSessionSQLite(connection, session);
                break;
            case 'mongodb':
                await this.saveChatSessionMongo(connection, session);
                break;
            case 'mysql':
            case 'postgresql':
                await this.saveChatSessionSQL(connection, session);
                break;
            case 'supabase':
                await this.saveChatSessionSupabase(connection, session);
                break;
            default:
                throw new Error(`Database type ${config.type} not supported for chat operations yet`);
        }
    }

    public async saveChatMessage(message: ChatMessage): Promise<{ success: boolean; message: string }> {
        try {
            await this.saveChatMessageInternal(message);
            return { success: true, message: 'Message saved successfully' };
        } catch (error) {
            console.error('Error saving chat message:', error);
            return {
                success: false,
                message: `Failed to save message: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    public async saveChatMessageInternal(message: ChatMessage): Promise<void> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();

        switch (config.type) {
            case 'localdb':
                await this.saveChatMessageSQLite(connection, message);
                break;
            case 'mongodb':
                await this.saveChatMessageMongo(connection, message);
                break;
            case 'mysql':
            case 'postgresql':
                await this.saveChatMessageSQL(connection, message);
                break;
            case 'supabase':
                await this.saveChatMessageSupabase(connection, message);
                break;
            default:
                throw new Error(`Database type ${config.type} not supported for chat operations yet`);
        }
    }

    private async getUserChatSessions(userId: string, workspaceId?: string): Promise<ChatSession[]> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();

        switch (config.type) {
            case 'localdb':
                return this.getUserChatSessionsSQLite(connection, userId, workspaceId);
            case 'mongodb':
                return this.getUserChatSessionsMongo(connection, userId, workspaceId);
            case 'mysql':
            case 'postgresql':
                return this.getUserChatSessionsSQL(connection, userId, workspaceId);
            case 'supabase':
                return this.getUserChatSessionsSupabase(connection, userId, workspaceId);
            default:
                throw new Error(`Database type ${config.type} not supported for chat operations yet`);
        }
    }

    private async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();

        switch (config.type) {
            case 'localdb':
                return this.getSessionMessagesSQLite(connection, sessionId);
            case 'mongodb':
                return this.getSessionMessagesMongo(connection, sessionId);
            case 'mysql':
            case 'postgresql':
                return this.getSessionMessagesSQL(connection, sessionId);
            case 'supabase':
                return this.getSessionMessagesSupabase(connection, sessionId);
            default:
                throw new Error(`Database type ${config.type} not supported for chat operations yet`);
        }
    }

    private async getChatSessionById(sessionId: string): Promise<ChatSession | null> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();

        switch (config.type) {
            case 'localdb':
                return this.getChatSessionByIdSQLite(connection, sessionId);
            case 'mongodb':
                return this.getChatSessionByIdMongo(connection, sessionId);
            case 'mysql':
            case 'postgresql':
                return this.getChatSessionByIdSQL(connection, sessionId);
            case 'supabase':
                return this.getChatSessionByIdSupabase(connection, sessionId);
            default:
                throw new Error(`Database type ${config.type} not supported for chat operations yet`);
        }
    }

    private async updateSessionTimestamp(sessionId: string): Promise<void> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();

        switch (config.type) {
            case 'localdb':
                await this.updateSessionTimestampSQLite(connection, sessionId);
                break;
            case 'mongodb':
                await this.updateSessionTimestampMongo(connection, sessionId);
                break;
            case 'mysql':
            case 'postgresql':
                await this.updateSessionTimestampSQL(connection, sessionId);
                break;
            case 'supabase':
                await this.updateSessionTimestampSupabase(connection, sessionId);
                break;
            default:
                throw new Error(`Database type ${config.type} not supported for chat operations yet`);
        }
    }

    private async updateChatSessionInDb(session: ChatSession): Promise<void> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();

        switch (config.type) {
            case 'localdb':
                await this.updateChatSessionSQLite(connection, session);
                break;
            case 'mongodb':
                await this.updateChatSessionMongo(connection, session);
                break;
            case 'mysql':
            case 'postgresql':
                await this.updateChatSessionSQL(connection, session);
                break;
            case 'supabase':
                await this.updateChatSessionSupabase(connection, session);
                break;
            default:
                throw new Error(`Database type ${config.type} not supported for chat operations yet`);
        }
    }

    private async deleteChatSessionFromDb(sessionId: string): Promise<void> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();

        switch (config.type) {
            case 'localdb':
                await this.deleteChatSessionSQLite(connection, sessionId);
                break;
            case 'mongodb':
                await this.deleteChatSessionMongo(connection, sessionId);
                break;
            case 'mysql':
            case 'postgresql':
                await this.deleteChatSessionSQL(connection, sessionId);
                break;
            case 'supabase':
                await this.deleteChatSessionSupabase(connection, sessionId);
                break;
            default:
                throw new Error(`Database type ${config.type} not supported for chat operations yet`);
        }
    }

    private async deleteSessionMessages(sessionId: string): Promise<void> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();

        switch (config.type) {
            case 'localdb':
                await this.deleteSessionMessagesSQLite(connection, sessionId);
                break;
            case 'mongodb':
                await this.deleteSessionMessagesMongo(connection, sessionId);
                break;
            case 'mysql':
            case 'postgresql':
                await this.deleteSessionMessagesSQL(connection, sessionId);
                break;
            case 'supabase':
                await this.deleteSessionMessagesSupabase(connection, sessionId);
                break;
            default:
                throw new Error(`Database type ${config.type} not supported for chat operations yet`);
        }
    }

    private async saveSharedChat(sharedChat: SharedChat): Promise<void> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();

        switch (config.type) {
            case 'localdb':
                await this.saveSharedChatSQLite(connection, sharedChat);
                break;
            case 'mongodb':
                await this.saveSharedChatMongo(connection, sharedChat);
                break;
            case 'mysql':
            case 'postgresql':
                await this.saveSharedChatSQL(connection, sharedChat);
                break;
            case 'supabase':
                await this.saveSharedChatSupabase(connection, sharedChat);
                break;
            default:
                throw new Error(`Database type ${config.type} not supported for shared chat operations yet`);
        }
    }

    private async getSharedChatById(shareId: string): Promise<SharedChat | null> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();

        switch (config.type) {
            case 'localdb':
                return this.getSharedChatByIdSQLite(connection, shareId);
            case 'mongodb':
                return this.getSharedChatByIdMongo(connection, shareId);
            case 'mysql':
            case 'postgresql':
                return this.getSharedChatByIdSQL(connection, shareId);
            case 'supabase':
                return this.getSharedChatByIdSupabase(connection, shareId);
            default:
                throw new Error(`Database type ${config.type} not supported for shared chat operations yet`);
        }
    }

    private async getSharedChatByOriginalId(originalChatId: string): Promise<SharedChat | null> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();

        switch (config.type) {
            case 'localdb':
                return this.getSharedChatByOriginalIdSQLite(connection, originalChatId);
            case 'mongodb':
                return this.getSharedChatByOriginalIdMongo(connection, originalChatId);
            case 'mysql':
            case 'postgresql':
                return this.getSharedChatByOriginalIdSQL(connection, originalChatId);
            case 'supabase':
                return this.getSharedChatByOriginalIdSupabase(connection, originalChatId);
            default:
                throw new Error(`Database type ${config.type} not supported for shared chat operations yet`);
        }
    }

    private async updateSharedChat(sharedChat: SharedChat): Promise<void> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();

        switch (config.type) {
            case 'localdb':
                await this.updateSharedChatSQLite(connection, sharedChat);
                break;
            case 'mongodb':
                await this.updateSharedChatMongo(connection, sharedChat);
                break;
            case 'mysql':
            case 'postgresql':
                await this.updateSharedChatSQL(connection, sharedChat);
                break;
            case 'supabase':
                await this.updateSharedChatSupabase(connection, sharedChat);
                break;
            default:
                throw new Error(`Database type ${config.type} not supported for shared chat operations yet`);
        }
    }

    private async deleteSharedChat(shareId: string): Promise<void> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();

        switch (config.type) {
            case 'localdb':
                await this.deleteSharedChatSQLite(connection, shareId);
                break;
            case 'mongodb':
                await this.deleteSharedChatMongo(connection, shareId);
                break;
            case 'mysql':
            case 'postgresql':
                await this.deleteSharedChatSQL(connection, shareId);
                break;
            case 'supabase':
                await this.deleteSharedChatSupabase(connection, shareId);
                break;
            default:
                throw new Error(`Database type ${config.type} not supported for shared chat operations yet`);
        }
    }

    // Message helper methods
    private async getMessageById(messageId: string): Promise<ChatMessage | null> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();

        switch (config.type) {
            case 'localdb':
                return this.getMessageByIdSQLite(connection, messageId);
            case 'mongodb':
                return this.getMessageByIdMongo(connection, messageId);
            case 'mysql':
            case 'postgresql':
                return this.getMessageByIdSQL(connection, messageId);
            case 'supabase':
                return this.getMessageByIdSupabase(connection, messageId);
            default:
                throw new Error(`Database type ${config.type} not supported for message operations yet`);
        }
    }

    private async updateMessage(message: ChatMessage): Promise<void> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();

        switch (config.type) {
            case 'localdb':
                await this.updateMessageSQLite(connection, message);
                break;
            case 'mongodb':
                await this.updateMessageMongo(connection, message);
                break;
            case 'mysql':
            case 'postgresql':
                await this.updateMessageSQL(connection, message);
                break;
            case 'supabase':
                await this.updateMessageSupabase(connection, message);
                break;
            default:
                throw new Error(`Database type ${config.type} not supported for message operations yet`);
        }
    }

    // Shared message helper methods
    private async saveSharedMessage(sharedMessage: SharedMessage): Promise<void> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();

        switch (config.type) {
            case 'localdb':
                await this.saveSharedMessageSQLite(connection, sharedMessage);
                break;
            case 'mongodb':
                await this.saveSharedMessageMongo(connection, sharedMessage);
                break;
            case 'mysql':
            case 'postgresql':
                await this.saveSharedMessageSQL(connection, sharedMessage);
                break;
            case 'supabase':
                await this.saveSharedMessageSupabase(connection, sharedMessage);
                break;
            default:
                throw new Error(`Database type ${config.type} not supported for shared message operations yet`);
        }
    }

    private async getSharedMessageById(shareId: string): Promise<SharedMessage | null> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();

        switch (config.type) {
            case 'localdb':
                return this.getSharedMessageByIdSQLite(connection, shareId);
            case 'mongodb':
                return this.getSharedMessageByIdMongo(connection, shareId);
            case 'mysql':
            case 'postgresql':
                return this.getSharedMessageByIdSQL(connection, shareId);
            case 'supabase':
                return this.getSharedMessageByIdSupabase(connection, shareId);
            default:
                throw new Error(`Database type ${config.type} not supported for shared message operations yet`);
        }
    }

    private async getSharedMessageByOriginalId(originalMessageId: string): Promise<SharedMessage | null> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();

        switch (config.type) {
            case 'localdb':
                return this.getSharedMessageByOriginalIdSQLite(connection, originalMessageId);
            case 'mongodb':
                return this.getSharedMessageByOriginalIdMongo(connection, originalMessageId);
            case 'mysql':
            case 'postgresql':
                return this.getSharedMessageByOriginalIdSQL(connection, originalMessageId);
            case 'supabase':
                return this.getSharedMessageByOriginalIdSupabase(connection, originalMessageId);
            default:
                throw new Error(`Database type ${config.type} not supported for shared message operations yet`);
        }
    }

    private async updateSharedMessage(sharedMessage: SharedMessage): Promise<void> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();

        switch (config.type) {
            case 'localdb':
                await this.updateSharedMessageSQLite(connection, sharedMessage);
                break;
            case 'mongodb':
                await this.updateSharedMessageMongo(connection, sharedMessage);
                break;
            case 'mysql':
            case 'postgresql':
                await this.updateSharedMessageSQL(connection, sharedMessage);
                break;
            case 'supabase':
                await this.updateSharedMessageSupabase(connection, sharedMessage);
                break;
            default:
                throw new Error(`Database type ${config.type} not supported for shared message operations yet`);
        }
    }

    private async deleteSharedMessage(shareId: string): Promise<void> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();

        switch (config.type) {
            case 'localdb':
                await this.deleteSharedMessageSQLite(connection, shareId);
                break;
            case 'mongodb':
                await this.deleteSharedMessageMongo(connection, shareId);
                break;
            case 'mysql':
            case 'postgresql':
                await this.deleteSharedMessageSQL(connection, shareId);
                break;
            case 'supabase':
                await this.deleteSharedMessageSupabase(connection, shareId);
                break;
            default:
                throw new Error(`Database type ${config.type} not supported for shared message operations yet`);
        }
    }

    /**
     * SQLite-specific implementations
     */
    private async saveChatSessionSQLite(db: any, session: ChatSession): Promise<void> {
        return new Promise((resolve, reject) => {
            // Create chat_sessions table if it doesn't exist
            db.run(`
                CREATE TABLE IF NOT EXISTS chat_sessions (
                    id TEXT PRIMARY KEY,
                    userId TEXT NOT NULL,
                    workspaceId TEXT NOT NULL,
                    title TEXT NOT NULL,
                    lastUsedPersonalityId TEXT,
                    lastUsedAIProviderId TEXT,
                    isPinned BOOLEAN DEFAULT 0,
                    isShared BOOLEAN DEFAULT 0,
                    parentSessionId TEXT,
                    createdAt TEXT NOT NULL,
                    updatedAt TEXT NOT NULL,
                    FOREIGN KEY (userId) REFERENCES users(id),
                    FOREIGN KEY (parentSessionId) REFERENCES chat_sessions(id)
                )
            `, (err: any) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Insert session
                db.run(`
                    INSERT INTO chat_sessions (id, userId, workspaceId, title, lastUsedPersonalityId, lastUsedAIProviderId, isPinned, isShared, parentSessionId, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    session.id,
                    session.userId,
                    session.workspaceId,
                    session.title,
                    session.lastUsedPersonalityId || null,
                    session.lastUsedAIProviderId || null,
                    session.isPinned ? 1 : 0,
                    session.isShared ? 1 : 0,
                    session.parentSessionId || null,
                    session.createdAt.toISOString(),
                    session.updatedAt.toISOString()
                ], (err: any) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
    }

    private async saveChatMessageSQLite(db: any, message: ChatMessage): Promise<void> {
        return new Promise((resolve, reject) => {
            // Create chat_messages table if it doesn't exist
            db.run(`
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id TEXT PRIMARY KEY,
                    sessionId TEXT NOT NULL,
                    content TEXT NOT NULL,
                    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
                    personalityId TEXT,
                    aiProviderId TEXT,
                    createdAt TEXT NOT NULL,
                    apiMetadata TEXT,
                    isPartial BOOLEAN DEFAULT 0,
                    fileAttachments TEXT,
                    isShared BOOLEAN DEFAULT 0,
                    FOREIGN KEY (sessionId) REFERENCES chat_sessions(id)
                )
            `, (err: any) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Insert message
                db.run(`
                    INSERT INTO chat_messages (id, sessionId, content, role, personalityId, aiProviderId, createdAt, apiMetadata, isPartial, fileAttachments, isShared)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    message.id,
                    message.sessionId,
                    message.content,
                    message.role,
                    message.personalityId,
                    message.aiProviderId,
                    message.createdAt.toISOString(),
                    message.apiMetadata ? JSON.stringify(message.apiMetadata) : null,
                    message.isPartial ? 1 : 0,
                    message.fileAttachments ? JSON.stringify(message.fileAttachments) : null,
                    message.isShared ? 1 : 0
                ], (err: any) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
    }

    private async getUserChatSessionsSQLite(db: any, userId: string, workspaceId?: string): Promise<ChatSession[]> {
        return new Promise((resolve, reject) => {
            let query = 'SELECT * FROM chat_sessions WHERE userId = ?';
            let params = [userId];

            if (workspaceId) {
                query += ' AND workspaceId = ?';
                params.push(workspaceId);
            }

            query += ' ORDER BY updatedAt DESC';

            db.all(query, params, (err: any, rows: any[]) => {
                if (err) {
                    if (err.code === 'SQLITE_ERROR' && err.message.includes('no such table')) {
                        resolve([]);
                    } else {
                        reject(err);
                    }
                } else {
                    const sessions = rows.map(row => this.mapSQLChatSession(row));
                    resolve(sessions);
                }
            });
        });
    }

    private async getSessionMessagesSQLite(db: any, sessionId: string): Promise<ChatMessage[]> {
        return new Promise((resolve, reject) => {
            db.all(
                'SELECT * FROM chat_messages WHERE sessionId = ? ORDER BY createdAt ASC',
                [sessionId],
                (err: any, rows: any[]) => {
                    if (err) {
                        if (err.code === 'SQLITE_ERROR' && err.message.includes('no such table')) {
                            resolve([]);
                        } else {
                            reject(err);
                        }
                    } else {
                        const messages = rows.map(row => this.mapSQLChatMessage(row));
                        resolve(messages);
                    }
                }
            );
        });
    }

    private async getChatSessionByIdSQLite(db: any, sessionId: string): Promise<ChatSession | null> {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM chat_sessions WHERE id = ?',
                [sessionId],
                (err: any, row: any) => {
                    if (err) {
                        if (err.code === 'SQLITE_ERROR' && err.message.includes('no such table')) {
                            resolve(null);
                        } else {
                            reject(err);
                        }
                    } else {
                        resolve(row ? this.mapSQLChatSession(row) : null);
                    }
                }
            );
        });
    }

    private async updateSessionTimestampSQLite(db: any, sessionId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE chat_sessions SET updatedAt = ? WHERE id = ?',
                [new Date().toISOString(), sessionId],
                (err: any) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    private async updateChatSessionSQLite(db: any, session: ChatSession): Promise<void> {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE chat_sessions SET title = ?, lastUsedPersonalityId = ?, lastUsedAIProviderId = ?, isPinned = ?, isShared = ?, parentSessionId = ?, updatedAt = ? WHERE id = ?',
                [session.title, session.lastUsedPersonalityId || null, session.lastUsedAIProviderId || null, session.isPinned ? 1 : 0, session.isShared ? 1 : 0, session.parentSessionId || null, session.updatedAt.toISOString(), session.id],
                (err: any) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    private async deleteChatSessionSQLite(db: any, sessionId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            db.run(
                'DELETE FROM chat_sessions WHERE id = ?',
                [sessionId],
                (err: any) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    private async deleteSessionMessagesSQLite(db: any, sessionId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            db.run(
                'DELETE FROM chat_messages WHERE sessionId = ?',
                [sessionId],
                (err: any) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    private async saveSharedChatSQLite(db: any, sharedChat: SharedChat): Promise<void> {
        return new Promise((resolve, reject) => {
            // Create shared_chats table if it doesn't exist
            db.run(`
                CREATE TABLE IF NOT EXISTS shared_chats (
                    id TEXT PRIMARY KEY,
                    originalChatId TEXT NOT NULL,
                    title TEXT NOT NULL,
                    messages TEXT NOT NULL,
                    messageCount INTEGER NOT NULL,
                    createdAt TEXT NOT NULL,
                    isActive BOOLEAN DEFAULT 1,
                    FOREIGN KEY (originalChatId) REFERENCES chat_sessions(id)
                )
            `, (err: any) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Insert shared chat
                db.run(`
                    INSERT INTO shared_chats (id, originalChatId, title, messages, messageCount, createdAt, isActive)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    sharedChat.id,
                    sharedChat.originalChatId,
                    sharedChat.title,
                    JSON.stringify(sharedChat.messages),
                    sharedChat.messageCount,
                    sharedChat.createdAt.toISOString(),
                    sharedChat.isActive ? 1 : 0
                ], (err: any) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
    }

    private async saveSharedMessageSQLite(db: any, sharedMessage: SharedMessage): Promise<void> {
        return new Promise((resolve, reject) => {
            // Create shared_messages table if it doesn't exist
            db.run(`
                CREATE TABLE IF NOT EXISTS shared_messages (
                    id TEXT PRIMARY KEY,
                    originalMessageId TEXT NOT NULL,
                    content TEXT NOT NULL,
                    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
                    createdAt TEXT NOT NULL,
                    isActive BOOLEAN DEFAULT 1,
                    FOREIGN KEY (originalMessageId) REFERENCES chat_messages(id)
                )
            `, (err: any) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Insert shared message
                db.run(`
                    INSERT INTO shared_messages (id, originalMessageId, content, role, createdAt, isActive)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    sharedMessage.id,
                    sharedMessage.originalMessageId,
                    sharedMessage.content,
                    sharedMessage.role,
                    sharedMessage.createdAt.toISOString(),
                    sharedMessage.isActive ? 1 : 0
                ], (err: any) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
    }

    private async getMessageByIdSQLite(db: any, messageId: string): Promise<ChatMessage | null> {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM chat_messages WHERE id = ?',
                [messageId],
                (err: any, row: any) => {
                    if (err) {
                        if (err.code === 'SQLITE_ERROR' && err.message.includes('no such table')) {
                            resolve(null);
                        } else {
                            reject(err);
                        }
                    } else {
                        resolve(row ? this.mapSQLChatMessage(row) : null);
                    }
                }
            );
        });
    }

    private async updateMessageSQLite(db: any, message: ChatMessage): Promise<void> {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE chat_messages SET content = ?, isShared = ? WHERE id = ?',
                [message.content, message.isShared ? 1 : 0, message.id],
                (err: any) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    private async getSharedMessageByIdSQLite(db: any, shareId: string): Promise<SharedMessage | null> {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM shared_messages WHERE id = ?',
                [shareId],
                (err: any, row: any) => {
                    if (err) {
                        if (err.code === 'SQLITE_ERROR' && err.message.includes('no such table')) {
                            resolve(null);
                        } else {
                            reject(err);
                        }
                    } else {
                        resolve(row ? this.mapSQLSharedMessage(row) : null);
                    }
                }
            );
        });
    }

    private async getSharedMessageByOriginalIdSQLite(db: any, originalMessageId: string): Promise<SharedMessage | null> {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM shared_messages WHERE originalMessageId = ? AND isActive = 1',
                [originalMessageId],
                (err: any, row: any) => {
                    if (err) {
                        if (err.code === 'SQLITE_ERROR' && err.message.includes('no such table')) {
                            resolve(null);
                        } else {
                            reject(err);
                        }
                    } else {
                        resolve(row ? this.mapSQLSharedMessage(row) : null);
                    }
                }
            );
        });
    }

    private async updateSharedMessageSQLite(db: any, sharedMessage: SharedMessage): Promise<void> {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE shared_messages SET content = ? WHERE id = ?',
                [sharedMessage.content, sharedMessage.id],
                (err: any) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    private async deleteSharedMessageSQLite(db: any, shareId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            db.run(
                'DELETE FROM shared_messages WHERE id = ?',
                [shareId],
                (err: any) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    /**
     * MongoDB implementations for message operations
     */
    private async getMessageByIdMongo(db: any, messageId: string): Promise<ChatMessage | null> {
        const collection = db.collection('chat_messages');
        const message = await collection.findOne({ _id: messageId });
        return message ? this.mapMongoChatMessage(message) : null;
    }

    private async updateMessageMongo(db: any, message: ChatMessage): Promise<void> {
        const collection = db.collection('chat_messages');
        await collection.updateOne(
            { _id: message.id },
            {
                $set: {
                    content: message.content,
                    isShared: message.isShared || false
                }
            }
        );
    }

    private async saveSharedMessageMongo(db: any, sharedMessage: SharedMessage): Promise<void> {
        const collection = db.collection('shared_messages');
        await collection.createIndex({ originalMessageId: 1 });
        await collection.createIndex({ createdAt: -1 });

        await collection.insertOne({
            _id: sharedMessage.id,
            originalMessageId: sharedMessage.originalMessageId,
            content: sharedMessage.content,
            role: sharedMessage.role,
            createdAt: sharedMessage.createdAt,
            isActive: sharedMessage.isActive
        });
    }

    private async getSharedMessageByIdMongo(db: any, shareId: string): Promise<SharedMessage | null> {
        const collection = db.collection('shared_messages');
        const sharedMessage = await collection.findOne({ _id: shareId });
        return sharedMessage ? this.mapMongoSharedMessage(sharedMessage) : null;
    }

    private async getSharedMessageByOriginalIdMongo(db: any, originalMessageId: string): Promise<SharedMessage | null> {
        const collection = db.collection('shared_messages');
        const sharedMessage = await collection.findOne({ originalMessageId, isActive: true });
        return sharedMessage ? this.mapMongoSharedMessage(sharedMessage) : null;
    }

    private async updateSharedMessageMongo(db: any, sharedMessage: SharedMessage): Promise<void> {
        const collection = db.collection('shared_messages');
        await collection.updateOne(
            { _id: sharedMessage.id },
            {
                $set: {
                    content: sharedMessage.content
                }
            }
        );
    }

    private async deleteSharedMessageMongo(db: any, shareId: string): Promise<void> {
        const collection = db.collection('shared_messages');
        await collection.deleteOne({ _id: shareId });
    }

    /**
     * SQL (MySQL/PostgreSQL) implementations for message operations
     */
    private async getMessageByIdSQL(connection: any, messageId: string): Promise<ChatMessage | null> {
        const [rows] = await connection.execute(
            'SELECT * FROM chat_messages WHERE id = ?',
            [messageId]
        );
        return rows.length > 0 ? this.mapSQLChatMessage(rows[0]) : null;
    }

    private async updateMessageSQL(connection: any, message: ChatMessage): Promise<void> {
        await connection.execute(
            'UPDATE chat_messages SET content = ?, isShared = ? WHERE id = ?',
            [message.content, message.isShared || false, message.id]
        );
    }

    private async saveSharedMessageSQL(connection: any, sharedMessage: SharedMessage): Promise<void> {
        // Create table if not exists
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS shared_messages (
                id VARCHAR(36) PRIMARY KEY,
                originalMessageId VARCHAR(36) NOT NULL,
                content TEXT NOT NULL,
                role ENUM('user', 'assistant') NOT NULL,
                createdAt DATETIME NOT NULL,
                isActive BOOLEAN DEFAULT TRUE,
                INDEX idx_originalMessageId (originalMessageId),
                INDEX idx_createdAt (createdAt),
                FOREIGN KEY (originalMessageId) REFERENCES chat_messages(id) ON DELETE CASCADE
            )
        `);

        await connection.execute(`
            INSERT INTO shared_messages (id, originalMessageId, content, role, createdAt, isActive)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [sharedMessage.id, sharedMessage.originalMessageId, sharedMessage.content, sharedMessage.role, sharedMessage.createdAt, sharedMessage.isActive]);
    }

    private async getSharedMessageByIdSQL(connection: any, shareId: string): Promise<SharedMessage | null> {
        const [rows] = await connection.execute(
            'SELECT * FROM shared_messages WHERE id = ?',
            [shareId]
        );
        return rows.length > 0 ? this.mapSQLSharedMessage(rows[0]) : null;
    }

    private async getSharedMessageByOriginalIdSQL(connection: any, originalMessageId: string): Promise<SharedMessage | null> {
        const [rows] = await connection.execute(
            'SELECT * FROM shared_messages WHERE originalMessageId = ? AND isActive = TRUE',
            [originalMessageId]
        );
        return rows.length > 0 ? this.mapSQLSharedMessage(rows[0]) : null;
    }

    private async updateSharedMessageSQL(connection: any, sharedMessage: SharedMessage): Promise<void> {
        await connection.execute(
            'UPDATE shared_messages SET content = ? WHERE id = ?',
            [sharedMessage.content, sharedMessage.id]
        );
    }

    private async deleteSharedMessageSQL(connection: any, shareId: string): Promise<void> {
        await connection.execute('DELETE FROM shared_messages WHERE id = ?', [shareId]);
    }

    /**
     * Supabase implementations for message operations
     */
    private async getMessageByIdSupabase(supabase: any, messageId: string): Promise<ChatMessage | null> {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('id', messageId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data ? this.mapSupabaseChatMessage(data) : null;
    }

    private async updateMessageSupabase(supabase: any, message: ChatMessage): Promise<void> {
        const { error } = await supabase
            .from('chat_messages')
            .update({
                content: message.content,
                isShared: message.isShared || false
            })
            .eq('id', message.id);

        if (error) throw error;
    }

    private async saveSharedMessageSupabase(supabase: any, sharedMessage: SharedMessage): Promise<void> {
        const { error } = await supabase
            .from('shared_messages')
            .insert([{
                id: sharedMessage.id,
                originalMessageId: sharedMessage.originalMessageId,
                content: sharedMessage.content,
                role: sharedMessage.role,
                createdAt: sharedMessage.createdAt.toISOString(),
                isActive: sharedMessage.isActive
            }]);

        if (error) throw error;
    }

    private async getSharedMessageByIdSupabase(supabase: any, shareId: string): Promise<SharedMessage | null> {
        const { data, error } = await supabase
            .from('shared_messages')
            .select('*')
            .eq('id', shareId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data ? this.mapSupabaseSharedMessage(data) : null;
    }

    private async getSharedMessageByOriginalIdSupabase(supabase: any, originalMessageId: string): Promise<SharedMessage | null> {
        const { data, error } = await supabase
            .from('shared_messages')
            .select('*')
            .eq('originalMessageId', originalMessageId)
            .eq('isActive', true)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data ? this.mapSupabaseSharedMessage(data) : null;
    }

    private async updateSharedMessageSupabase(supabase: any, sharedMessage: SharedMessage): Promise<void> {
        const { error } = await supabase
            .from('shared_messages')
            .update({
                content: sharedMessage.content
            })
            .eq('id', sharedMessage.id);

        if (error) throw error;
    }

    private async deleteSharedMessageSupabase(supabase: any, shareId: string): Promise<void> {
        const { error } = await supabase
            .from('shared_messages')
            .delete()
            .eq('id', shareId);

        if (error) throw error;
    }

    private async getSharedChatByIdSQLite(db: any, shareId: string): Promise<SharedChat | null> {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM shared_chats WHERE id = ?',
                [shareId],
                (err: any, row: any) => {
                    if (err) {
                        if (err.code === 'SQLITE_ERROR' && err.message.includes('no such table')) {
                            resolve(null);
                        } else {
                            reject(err);
                        }
                    } else {
                        resolve(row ? this.mapSQLSharedChat(row) : null);
                    }
                }
            );
        });
    }

    private async getSharedChatByOriginalIdSQLite(db: any, originalChatId: string): Promise<SharedChat | null> {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM shared_chats WHERE originalChatId = ? AND isActive = 1',
                [originalChatId],
                (err: any, row: any) => {
                    if (err) {
                        if (err.code === 'SQLITE_ERROR' && err.message.includes('no such table')) {
                            resolve(null);
                        } else {
                            reject(err);
                        }
                    } else {
                        resolve(row ? this.mapSQLSharedChat(row) : null);
                    }
                }
            );
        });
    }

    private async updateSharedChatSQLite(db: any, sharedChat: SharedChat): Promise<void> {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE shared_chats SET title = ?, messages = ?, messageCount = ? WHERE id = ?',
                [sharedChat.title, JSON.stringify(sharedChat.messages), sharedChat.messageCount, sharedChat.id],
                (err: any) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    private async deleteSharedChatSQLite(db: any, shareId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            db.run(
                'DELETE FROM shared_chats WHERE id = ?',
                [shareId],
                (err: any) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    /**
     * MongoDB-specific implementations
     */
    private async saveChatSessionMongo(db: any, session: ChatSession): Promise<void> {
        const collection = db.collection('chat_sessions');
        await collection.createIndex({ userId: 1 });
        await collection.createIndex({ workspaceId: 1 });
        await collection.createIndex({ updatedAt: -1 });

        await collection.insertOne({
            _id: session.id,
            userId: session.userId,
            workspaceId: session.workspaceId,
            title: session.title,
            lastUsedPersonalityId: session.lastUsedPersonalityId,
            lastUsedAIProviderId: session.lastUsedAIProviderId,
            isPinned: session.isPinned || false,
            isShared: session.isShared || false,
            parentSessionId: session.parentSessionId,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt
        });
    }

    private async saveChatMessageMongo(db: any, message: ChatMessage): Promise<void> {
        const collection = db.collection('chat_messages');
        await collection.createIndex({ sessionId: 1 });
        await collection.createIndex({ createdAt: 1 });

        await collection.insertOne({
            _id: message.id,
            sessionId: message.sessionId,
            content: message.content,
            role: message.role,
            personalityId: message.personalityId,
            aiProviderId: message.aiProviderId,
            createdAt: message.createdAt,
            apiMetadata: message.apiMetadata,
            isPartial: message.isPartial || false,
            fileAttachments: message.fileAttachments,
            isShared: message.isShared || false
        });
    }

    private async getUserChatSessionsMongo(db: any, userId: string, workspaceId?: string): Promise<ChatSession[]> {
        const collection = db.collection('chat_sessions');
        const filter: any = { userId };

        if (workspaceId) {
            filter.workspaceId = workspaceId;
        }

        const sessions = await collection.find(filter).sort({ updatedAt: -1 }).toArray();
        return sessions.map((session: any) => this.mapMongoChatSession(session));
    }

    private async getSessionMessagesMongo(db: any, sessionId: string): Promise<ChatMessage[]> {
        const collection = db.collection('chat_messages');
        console.log(`[DEBUG] MongoDB: Searching for messages with sessionId: ${sessionId}`);
        const messages = await collection.find({ sessionId }).sort({ createdAt: 1 }).toArray();
        console.log(`[DEBUG] MongoDB: Found ${messages.length} raw messages:`, messages);
        const mappedMessages = messages.map((message: any) => this.mapMongoChatMessage(message));
        console.log(`[DEBUG] MongoDB: Mapped messages:`, mappedMessages);
        return mappedMessages;
    }

    private async getChatSessionByIdMongo(db: any, sessionId: string): Promise<ChatSession | null> {
        const collection = db.collection('chat_sessions');
        const session = await collection.findOne({ _id: sessionId });
        return session ? this.mapMongoChatSession(session) : null;
    }

    private async updateSessionTimestampMongo(db: any, sessionId: string): Promise<void> {
        const collection = db.collection('chat_sessions');
        await collection.updateOne(
            { _id: sessionId },
            { $set: { updatedAt: new Date() } }
        );
    }

    private async updateChatSessionMongo(db: any, session: ChatSession): Promise<void> {
        console.log(`[SHARE DEBUG] MongoDB: Updating session ${session.id} with isShared: ${session.isShared}`);
        const collection = db.collection('chat_sessions');
        const result = await collection.updateOne(
            { _id: session.id },
            {
                $set: {
                    title: session.title,
                    lastUsedPersonalityId: session.lastUsedPersonalityId,
                    lastUsedAIProviderId: session.lastUsedAIProviderId,
                    isPinned: session.isPinned || false,
                    isShared: session.isShared || false,
                    parentSessionId: session.parentSessionId,
                    updatedAt: session.updatedAt
                }
            }
        );
        console.log(`[SHARE DEBUG] MongoDB: Session update result - matched: ${result.matchedCount}, modified: ${result.modifiedCount}`);
    }

    private async deleteChatSessionMongo(db: any, sessionId: string): Promise<void> {
        const collection = db.collection('chat_sessions');
        await collection.deleteOne({ _id: sessionId });
    }

    private async deleteSessionMessagesMongo(db: any, sessionId: string): Promise<void> {
        const collection = db.collection('chat_messages');
        await collection.deleteMany({ sessionId });
    }

    private async saveSharedChatMongo(db: any, sharedChat: SharedChat): Promise<void> {
        console.log(`[SHARE DEBUG] MongoDB: Saving shared chat with id: ${sharedChat.id}, originalChatId: ${sharedChat.originalChatId}, isActive: ${sharedChat.isActive}`);
        const collection = db.collection('shared_chats');
        await collection.createIndex({ originalChatId: 1 });
        await collection.createIndex({ createdAt: -1 });

        const result = await collection.insertOne({
            _id: sharedChat.id,
            originalChatId: sharedChat.originalChatId,
            title: sharedChat.title,
            messages: sharedChat.messages,
            messageCount: sharedChat.messageCount,
            createdAt: sharedChat.createdAt,
            isActive: sharedChat.isActive
        });
        console.log(`[SHARE DEBUG] MongoDB: Shared chat saved successfully. Inserted ID: ${result.insertedId}`);
    }

    private async getSharedChatByIdMongo(db: any, shareId: string): Promise<SharedChat | null> {
        const collection = db.collection('shared_chats');
        const sharedChat = await collection.findOne({ _id: shareId });
        return sharedChat ? this.mapMongoSharedChat(sharedChat) : null;
    }

    private async getSharedChatByOriginalIdMongo(db: any, originalChatId: string): Promise<SharedChat | null> {
        console.log(`[SHARE DEBUG] MongoDB: Looking for shared chat with originalChatId: ${originalChatId}`);
        const collection = db.collection('shared_chats');
        const sharedChat = await collection.findOne({ originalChatId, isActive: true });
        console.log(`[SHARE DEBUG] MongoDB: Found shared chat:`, sharedChat ? { id: sharedChat._id, originalChatId: sharedChat.originalChatId, isActive: sharedChat.isActive } : null);
        return sharedChat ? this.mapMongoSharedChat(sharedChat) : null;
    }

    private async updateSharedChatMongo(db: any, sharedChat: SharedChat): Promise<void> {
        const collection = db.collection('shared_chats');
        await collection.updateOne(
            { _id: sharedChat.id },
            {
                $set: {
                    title: sharedChat.title,
                    messages: sharedChat.messages,
                    messageCount: sharedChat.messageCount
                }
            }
        );
    }

    private async deleteSharedChatMongo(db: any, shareId: string): Promise<void> {
        const collection = db.collection('shared_chats');
        await collection.deleteOne({ _id: shareId });
    }

    /**
     * SQL (MySQL/PostgreSQL) implementations - simplified for brevity
     */
    private async saveChatSessionSQL(connection: any, session: ChatSession): Promise<void> {
        // Create table if not exists
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS chat_sessions (
                id VARCHAR(36) PRIMARY KEY,
                userId VARCHAR(36) NOT NULL,
                workspaceId VARCHAR(36) NOT NULL,
                title VARCHAR(255) NOT NULL,
                lastUsedPersonalityId VARCHAR(36),
                lastUsedAIProviderId VARCHAR(36),
                isPinned BOOLEAN DEFAULT FALSE,
                isShared BOOLEAN DEFAULT FALSE,
                parentSessionId VARCHAR(36),
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL,
                INDEX idx_userId (userId),
                INDEX idx_workspaceId (workspaceId),
                INDEX idx_updatedAt (updatedAt),
                INDEX idx_parentSessionId (parentSessionId),
                FOREIGN KEY (parentSessionId) REFERENCES chat_sessions(id) ON DELETE CASCADE
            )
        `);

        await connection.execute(`
            INSERT INTO chat_sessions (id, userId, workspaceId, title, lastUsedPersonalityId, lastUsedAIProviderId, isPinned, isShared, parentSessionId, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [session.id, session.userId, session.workspaceId, session.title, session.lastUsedPersonalityId, session.lastUsedAIProviderId, session.isPinned || false, session.isShared || false, session.parentSessionId, session.createdAt, session.updatedAt]);
    }

    private async saveChatMessageSQL(connection: any, message: ChatMessage): Promise<void> {
        // Create table if not exists
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id VARCHAR(36) PRIMARY KEY,
                sessionId VARCHAR(36) NOT NULL,
                content TEXT NOT NULL,
                role ENUM('user', 'assistant') NOT NULL,
                personalityId VARCHAR(36),
                aiProviderId VARCHAR(36),
                createdAt DATETIME NOT NULL,
                apiMetadata JSON,
                isPartial BOOLEAN DEFAULT FALSE,
                fileAttachments JSON,
                isShared BOOLEAN DEFAULT FALSE,
                INDEX idx_sessionId (sessionId),
                INDEX idx_createdAt (createdAt)
            )
        `);

        await connection.execute(`
            INSERT INTO chat_messages (id, sessionId, content, role, personalityId, aiProviderId, createdAt, apiMetadata, isPartial, fileAttachments, isShared)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [message.id, message.sessionId, message.content, message.role, message.personalityId, message.aiProviderId, message.createdAt, message.apiMetadata ? JSON.stringify(message.apiMetadata) : null, message.isPartial || false, message.fileAttachments ? JSON.stringify(message.fileAttachments) : null, message.isShared || false]);
    }

    private async getUserChatSessionsSQL(connection: any, userId: string, workspaceId?: string): Promise<ChatSession[]> {
        let query = 'SELECT * FROM chat_sessions WHERE userId = ?';
        let params = [userId];

        if (workspaceId) {
            query += ' AND workspaceId = ?';
            params.push(workspaceId);
        }

        query += ' ORDER BY updatedAt DESC';

        const [rows] = await connection.execute(query, params);
        return rows.map((row: any) => this.mapSQLChatSession(row));
    }

    private async getSessionMessagesSQL(connection: any, sessionId: string): Promise<ChatMessage[]> {
        const [rows] = await connection.execute(
            'SELECT * FROM chat_messages WHERE sessionId = ? ORDER BY createdAt ASC',
            [sessionId]
        );
        return rows.map((row: any) => this.mapSQLChatMessage(row));
    }

    private async getChatSessionByIdSQL(connection: any, sessionId: string): Promise<ChatSession | null> {
        const [rows] = await connection.execute(
            'SELECT * FROM chat_sessions WHERE id = ?',
            [sessionId]
        );
        return rows.length > 0 ? this.mapSQLChatSession(rows[0]) : null;
    }

    private async updateSessionTimestampSQL(connection: any, sessionId: string): Promise<void> {
        await connection.execute(
            'UPDATE chat_sessions SET updatedAt = ? WHERE id = ?',
            [new Date(), sessionId]
        );
    }

    private async updateChatSessionSQL(connection: any, session: ChatSession): Promise<void> {
        await connection.execute(
            'UPDATE chat_sessions SET title = ?, lastUsedPersonalityId = ?, lastUsedAIProviderId = ?, isPinned = ?, isShared = ?, parentSessionId = ?, updatedAt = ? WHERE id = ?',
            [session.title, session.lastUsedPersonalityId, session.lastUsedAIProviderId, session.isPinned || false, session.isShared || false, session.parentSessionId, session.updatedAt, session.id]
        );
    }

    private async deleteChatSessionSQL(connection: any, sessionId: string): Promise<void> {
        await connection.execute('DELETE FROM chat_sessions WHERE id = ?', [sessionId]);
    }

    private async deleteSessionMessagesSQL(connection: any, sessionId: string): Promise<void> {
        await connection.execute('DELETE FROM chat_messages WHERE sessionId = ?', [sessionId]);
    }

    private async saveSharedChatSQL(connection: any, sharedChat: SharedChat): Promise<void> {
        // Create table if not exists
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS shared_chats (
                id VARCHAR(36) PRIMARY KEY,
                originalChatId VARCHAR(36) NOT NULL,
                title VARCHAR(255) NOT NULL,
                messages JSON NOT NULL,
                messageCount INT NOT NULL,
                createdAt DATETIME NOT NULL,
                isActive BOOLEAN DEFAULT TRUE,
                INDEX idx_originalChatId (originalChatId),
                INDEX idx_createdAt (createdAt),
                FOREIGN KEY (originalChatId) REFERENCES chat_sessions(id) ON DELETE CASCADE
            )
        `);

        await connection.execute(`
            INSERT INTO shared_chats (id, originalChatId, title, messages, messageCount, createdAt, isActive)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [sharedChat.id, sharedChat.originalChatId, sharedChat.title, JSON.stringify(sharedChat.messages), sharedChat.messageCount, sharedChat.createdAt, sharedChat.isActive]);
    }

    private async getSharedChatByIdSQL(connection: any, shareId: string): Promise<SharedChat | null> {
        const [rows] = await connection.execute(
            'SELECT * FROM shared_chats WHERE id = ?',
            [shareId]
        );
        return rows.length > 0 ? this.mapSQLSharedChat(rows[0]) : null;
    }

    private async getSharedChatByOriginalIdSQL(connection: any, originalChatId: string): Promise<SharedChat | null> {
        const [rows] = await connection.execute(
            'SELECT * FROM shared_chats WHERE originalChatId = ? AND isActive = TRUE',
            [originalChatId]
        );
        return rows.length > 0 ? this.mapSQLSharedChat(rows[0]) : null;
    }

    private async updateSharedChatSQL(connection: any, sharedChat: SharedChat): Promise<void> {
        await connection.execute(
            'UPDATE shared_chats SET title = ?, messages = ?, messageCount = ? WHERE id = ?',
            [sharedChat.title, JSON.stringify(sharedChat.messages), sharedChat.messageCount, sharedChat.id]
        );
    }

    private async deleteSharedChatSQL(connection: any, shareId: string): Promise<void> {
        await connection.execute('DELETE FROM shared_chats WHERE id = ?', [shareId]);
    }

    /**
     * Supabase implementations - simplified for brevity
     */
    private async saveChatSessionSupabase(supabase: any, session: ChatSession): Promise<void> {
        const { error } = await supabase
            .from('chat_sessions')
            .insert([{
                id: session.id,
                userId: session.userId,
                workspaceId: session.workspaceId,
                title: session.title,
                lastUsedPersonalityId: session.lastUsedPersonalityId,
                lastUsedAIProviderId: session.lastUsedAIProviderId,
                isPinned: session.isPinned || false,
                parentSessionId: session.parentSessionId,
                createdAt: session.createdAt.toISOString(),
                updatedAt: session.updatedAt.toISOString()
            }]);

        if (error) throw error;
    }

    private async saveChatMessageSupabase(supabase: any, message: ChatMessage): Promise<void> {
        const { error } = await supabase
            .from('chat_messages')
            .insert([{
                id: message.id,
                sessionId: message.sessionId,
                content: message.content,
                role: message.role,
                personalityId: message.personalityId,
                aiProviderId: message.aiProviderId,
                createdAt: message.createdAt.toISOString(),
                apiMetadata: message.apiMetadata,
                isPartial: message.isPartial || false,
                fileAttachments: message.fileAttachments,
                isShared: message.isShared || false
            }]);

        if (error) throw error;
    }

    private async getUserChatSessionsSupabase(supabase: any, userId: string, workspaceId?: string): Promise<ChatSession[]> {
        let query = supabase
            .from('chat_sessions')
            .select('*')
            .eq('userId', userId);

        if (workspaceId) {
            query = query.eq('workspaceId', workspaceId);
        }

        const { data, error } = await query.order('updatedAt', { ascending: false });

        if (error) throw error;
        return data ? data.map((session: any) => this.mapSupabaseChatSession(session)) : [];
    }

    private async getSessionMessagesSupabase(supabase: any, sessionId: string): Promise<ChatMessage[]> {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('sessionId', sessionId)
            .order('createdAt', { ascending: true });

        if (error) throw error;
        return data ? data.map((message: any) => this.mapSupabaseChatMessage(message)) : [];
    }

    private async getChatSessionByIdSupabase(supabase: any, sessionId: string): Promise<ChatSession | null> {
        const { data, error } = await supabase
            .from('chat_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data ? this.mapSupabaseChatSession(data) : null;
    }

    private async updateSessionTimestampSupabase(supabase: any, sessionId: string): Promise<void> {
        const { error } = await supabase
            .from('chat_sessions')
            .update({ updatedAt: new Date().toISOString() })
            .eq('id', sessionId);

        if (error) throw error;
    }

    private async updateChatSessionSupabase(supabase: any, session: ChatSession): Promise<void> {
        const { error } = await supabase
            .from('chat_sessions')
            .update({
                title: session.title,
                lastUsedPersonalityId: session.lastUsedPersonalityId,
                lastUsedAIProviderId: session.lastUsedAIProviderId,
                isPinned: session.isPinned || false,
                parentSessionId: session.parentSessionId,
                updatedAt: session.updatedAt.toISOString()
            })
            .eq('id', session.id);

        if (error) throw error;
    }

    private async deleteChatSessionSupabase(supabase: any, sessionId: string): Promise<void> {
        const { error } = await supabase
            .from('chat_sessions')
            .delete()
            .eq('id', sessionId);

        if (error) throw error;
    }

    private async deleteSessionMessagesSupabase(supabase: any, sessionId: string): Promise<void> {
        const { error } = await supabase
            .from('chat_messages')
            .delete()
            .eq('sessionId', sessionId);

        if (error) throw error;
    }

    private async saveSharedChatSupabase(supabase: any, sharedChat: SharedChat): Promise<void> {
        const { error } = await supabase
            .from('shared_chats')
            .insert([{
                id: sharedChat.id,
                originalChatId: sharedChat.originalChatId,
                title: sharedChat.title,
                messages: sharedChat.messages,
                messageCount: sharedChat.messageCount,
                createdAt: sharedChat.createdAt.toISOString(),
                isActive: sharedChat.isActive
            }]);

        if (error) throw error;
    }

    private async getSharedChatByIdSupabase(supabase: any, shareId: string): Promise<SharedChat | null> {
        const { data, error } = await supabase
            .from('shared_chats')
            .select('*')
            .eq('id', shareId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data ? this.mapSupabaseSharedChat(data) : null;
    }

    private async getSharedChatByOriginalIdSupabase(supabase: any, originalChatId: string): Promise<SharedChat | null> {
        const { data, error } = await supabase
            .from('shared_chats')
            .select('*')
            .eq('originalChatId', originalChatId)
            .eq('isActive', true)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data ? this.mapSupabaseSharedChat(data) : null;
    }

    private async updateSharedChatSupabase(supabase: any, sharedChat: SharedChat): Promise<void> {
        const { error } = await supabase
            .from('shared_chats')
            .update({
                title: sharedChat.title,
                messages: sharedChat.messages,
                messageCount: sharedChat.messageCount
            })
            .eq('id', sharedChat.id);

        if (error) throw error;
    }

    private async deleteSharedChatSupabase(supabase: any, shareId: string): Promise<void> {
        const { error } = await supabase
            .from('shared_chats')
            .delete()
            .eq('id', shareId);

        if (error) throw error;
    }

    /**
     * Mapping functions to convert database records to objects
     */
    private mapSQLChatSession(row: any): ChatSession {
        return {
            id: row.id,
            userId: row.userId,
            workspaceId: row.workspaceId,
            title: row.title,
            lastUsedPersonalityId: row.lastUsedPersonalityId,
            lastUsedAIProviderId: row.lastUsedAIProviderId,
            isPinned: Boolean(row.isPinned),
            isShared: Boolean(row.isShared),
            parentSessionId: row.parentSessionId,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt)
        };
    }

    private mapSQLChatMessage(row: any): ChatMessage {
        let apiMetadata = undefined;
        if (row.apiMetadata) {
            try {
                apiMetadata = JSON.parse(row.apiMetadata);
            } catch (error) {
                console.warn('Failed to parse apiMetadata:', error);
            }
        }

        let fileAttachments = undefined;
        if (row.fileAttachments) {
            try {
                fileAttachments = JSON.parse(row.fileAttachments);
            } catch (error) {
                console.warn('Failed to parse fileAttachments:', error);
            }
        }

        return {
            id: row.id,
            sessionId: row.sessionId,
            content: row.content,
            role: row.role,
            personalityId: row.personalityId,
            aiProviderId: row.aiProviderId,
            createdAt: new Date(row.createdAt),
            apiMetadata,
            isPartial: Boolean(row.isPartial),
            fileAttachments,
            isShared: Boolean(row.isShared)
        };
    }

    private mapMongoChatSession(doc: any): ChatSession {
        return {
            id: doc._id,
            userId: doc.userId,
            workspaceId: doc.workspaceId,
            title: doc.title,
            lastUsedPersonalityId: doc.lastUsedPersonalityId,
            lastUsedAIProviderId: doc.lastUsedAIProviderId,
            isPinned: Boolean(doc.isPinned),
            isShared: Boolean(doc.isShared),
            parentSessionId: doc.parentSessionId,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt
        };
    }

    private mapMongoChatMessage(doc: any): ChatMessage {
        return {
            id: doc._id,
            sessionId: doc.sessionId,
            content: doc.content,
            role: doc.role,
            personalityId: doc.personalityId,
            aiProviderId: doc.aiProviderId,
            createdAt: doc.createdAt,
            apiMetadata: doc.apiMetadata,
            isPartial: Boolean(doc.isPartial),
            fileAttachments: doc.fileAttachments,
            isShared: Boolean(doc.isShared)
        };
    }

    private mapSupabaseChatSession(row: any): ChatSession {
        return {
            id: row.id,
            userId: row.userId,
            workspaceId: row.workspaceId,
            title: row.title,
            lastUsedPersonalityId: row.lastUsedPersonalityId,
            lastUsedAIProviderId: row.lastUsedAIProviderId,
            isPinned: Boolean(row.isPinned),
            isShared: Boolean(row.isShared),
            parentSessionId: row.parentSessionId,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt)
        };
    }

    private mapSupabaseChatMessage(row: any): ChatMessage {
        return {
            id: row.id,
            sessionId: row.sessionId,
            content: row.content,
            role: row.role,
            personalityId: row.personalityId,
            aiProviderId: row.aiProviderId,
            createdAt: new Date(row.createdAt),
            apiMetadata: row.apiMetadata,
            isPartial: Boolean(row.isPartial),
            fileAttachments: row.fileAttachments,
            isShared: Boolean(row.isShared)
        };
    }

    /**
     * Shared chat mapping functions
     */
    private mapSQLSharedChat(row: any): SharedChat {
        let messages: SharedChatMessage[] = [];
        if (row.messages) {
            try {
                messages = JSON.parse(row.messages);
            } catch (error) {
                console.warn('Failed to parse shared chat messages:', error);
            }
        }

        return {
            id: row.id,
            originalChatId: row.originalChatId,
            title: row.title,
            messages,
            messageCount: row.messageCount || messages.length,
            createdAt: new Date(row.createdAt),
            isActive: Boolean(row.isActive)
        };
    }

    private mapMongoSharedChat(doc: any): SharedChat {
        return {
            id: doc._id,
            originalChatId: doc.originalChatId,
            title: doc.title,
            messages: doc.messages || [],
            messageCount: doc.messageCount || (doc.messages || []).length,
            createdAt: doc.createdAt,
            isActive: Boolean(doc.isActive)
        };
    }

    private mapSupabaseSharedChat(row: any): SharedChat {
        return {
            id: row.id,
            originalChatId: row.originalChatId,
            title: row.title,
            messages: row.messages || [],
            messageCount: row.messageCount || (row.messages || []).length,
            createdAt: new Date(row.createdAt),
            isActive: Boolean(row.isActive)
        };
    }

    /**
     * Shared message mapping functions
     */
    private mapSQLSharedMessage(row: any): SharedMessage {
        return {
            id: row.id,
            originalMessageId: row.originalMessageId,
            content: row.content,
            role: row.role,
            createdAt: new Date(row.createdAt),
            isActive: Boolean(row.isActive)
        };
    }

    private mapMongoSharedMessage(doc: any): SharedMessage {
        return {
            id: doc._id,
            originalMessageId: doc.originalMessageId,
            content: doc.content,
            role: doc.role,
            createdAt: doc.createdAt,
            isActive: Boolean(doc.isActive)
        };
    }

    private mapSupabaseSharedMessage(row: any): SharedMessage {
        return {
            id: row.id,
            originalMessageId: row.originalMessageId,
            content: row.content,
            role: row.role,
            createdAt: new Date(row.createdAt),
            isActive: Boolean(row.isActive)
        };
    }
}
