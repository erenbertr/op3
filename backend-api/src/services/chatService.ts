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
    DeleteChatSessionResponse
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
                    INSERT INTO chat_sessions (id, userId, workspaceId, title, lastUsedPersonalityId, lastUsedAIProviderId, isPinned, parentSessionId, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    session.id,
                    session.userId,
                    session.workspaceId,
                    session.title,
                    session.lastUsedPersonalityId || null,
                    session.lastUsedAIProviderId || null,
                    session.isPinned ? 1 : 0,
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
                    FOREIGN KEY (sessionId) REFERENCES chat_sessions(id)
                )
            `, (err: any) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Insert message
                db.run(`
                    INSERT INTO chat_messages (id, sessionId, content, role, personalityId, aiProviderId, createdAt, apiMetadata, isPartial, fileAttachments)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    message.fileAttachments ? JSON.stringify(message.fileAttachments) : null
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
                'UPDATE chat_sessions SET title = ?, lastUsedPersonalityId = ?, lastUsedAIProviderId = ?, isPinned = ?, parentSessionId = ?, updatedAt = ? WHERE id = ?',
                [session.title, session.lastUsedPersonalityId || null, session.lastUsedAIProviderId || null, session.isPinned ? 1 : 0, session.parentSessionId || null, session.updatedAt.toISOString(), session.id],
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
            fileAttachments: message.fileAttachments
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
        const collection = db.collection('chat_sessions');
        await collection.updateOne(
            { _id: session.id },
            {
                $set: {
                    title: session.title,
                    lastUsedPersonalityId: session.lastUsedPersonalityId,
                    lastUsedAIProviderId: session.lastUsedAIProviderId,
                    isPinned: session.isPinned || false,
                    parentSessionId: session.parentSessionId,
                    updatedAt: session.updatedAt
                }
            }
        );
    }

    private async deleteChatSessionMongo(db: any, sessionId: string): Promise<void> {
        const collection = db.collection('chat_sessions');
        await collection.deleteOne({ _id: sessionId });
    }

    private async deleteSessionMessagesMongo(db: any, sessionId: string): Promise<void> {
        const collection = db.collection('chat_messages');
        await collection.deleteMany({ sessionId });
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
            INSERT INTO chat_sessions (id, userId, workspaceId, title, lastUsedPersonalityId, lastUsedAIProviderId, isPinned, parentSessionId, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [session.id, session.userId, session.workspaceId, session.title, session.lastUsedPersonalityId, session.lastUsedAIProviderId, session.isPinned || false, session.parentSessionId, session.createdAt, session.updatedAt]);
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
                INDEX idx_sessionId (sessionId),
                INDEX idx_createdAt (createdAt)
            )
        `);

        await connection.execute(`
            INSERT INTO chat_messages (id, sessionId, content, role, personalityId, aiProviderId, createdAt, apiMetadata, isPartial, fileAttachments)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [message.id, message.sessionId, message.content, message.role, message.personalityId, message.aiProviderId, message.createdAt, message.apiMetadata ? JSON.stringify(message.apiMetadata) : null, message.isPartial || false, message.fileAttachments ? JSON.stringify(message.fileAttachments) : null]);
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
            'UPDATE chat_sessions SET title = ?, lastUsedPersonalityId = ?, lastUsedAIProviderId = ?, isPinned = ?, parentSessionId = ?, updatedAt = ? WHERE id = ?',
            [session.title, session.lastUsedPersonalityId, session.lastUsedAIProviderId, session.isPinned || false, session.parentSessionId, session.updatedAt, session.id]
        );
    }

    private async deleteChatSessionSQL(connection: any, sessionId: string): Promise<void> {
        await connection.execute('DELETE FROM chat_sessions WHERE id = ?', [sessionId]);
    }

    private async deleteSessionMessagesSQL(connection: any, sessionId: string): Promise<void> {
        await connection.execute('DELETE FROM chat_messages WHERE sessionId = ?', [sessionId]);
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
                fileAttachments: message.fileAttachments
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
            fileAttachments
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
            fileAttachments: doc.fileAttachments
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
            fileAttachments: row.fileAttachments
        };
    }
}
