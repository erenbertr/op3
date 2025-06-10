import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseManager } from '../config/database';
import { AIProviderService } from './aiProviderService';
import { FileAttachment, VectorStore, CreateFileAttachmentRequest, CreateFileAttachmentResponse, FileAttachmentListResponse, VectorStoreResponse } from '../types/file-attachment';

export class OpenAIFileService {
    private static instance: OpenAIFileService;
    private dbManager: DatabaseManager;
    private aiProviderService: AIProviderService;
    private uploadsDir: string;

    private constructor() {
        this.dbManager = DatabaseManager.getInstance();
        this.aiProviderService = AIProviderService.getInstance();

        // Create uploads directory if it doesn't exist
        this.uploadsDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(this.uploadsDir)) {
            fs.mkdirSync(this.uploadsDir, { recursive: true });
        }
    }

    public static getInstance(): OpenAIFileService {
        if (!OpenAIFileService.instance) {
            OpenAIFileService.instance = new OpenAIFileService();
        }
        return OpenAIFileService.instance;
    }

    /**
     * Get OpenAI client for the user's active provider
     */
    private getOpenAIClient(userId: string): OpenAI | null {
        const providers = this.aiProviderService.getProvidersWithEncryptedKeys();
        const openaiProvider = providers.find(p => p.type === 'openai' && p.isActive);

        if (!openaiProvider) {
            return null;
        }

        const apiKey = this.aiProviderService.decryptApiKey(openaiProvider.apiKey);
        const baseURL = openaiProvider.endpoint || 'https://api.openai.com/v1';

        return new OpenAI({
            apiKey,
            baseURL
        });
    }

    /**
     * Upload file to OpenAI and create local record
     */
    public async uploadFile(request: CreateFileAttachmentRequest): Promise<CreateFileAttachmentResponse> {
        try {
            const openai = this.getOpenAIClient(request.userId);
            if (!openai) {
                return {
                    success: false,
                    message: 'No active OpenAI provider found'
                };
            }

            // Create unique filename
            const fileExtension = path.extname(request.file.originalname);
            const uniqueFileName = `${uuidv4()}${fileExtension}`;
            const filePath = path.join(this.uploadsDir, uniqueFileName);

            // Save file locally
            fs.writeFileSync(filePath, request.file.buffer);

            // Create file attachment record
            const attachment: FileAttachment = {
                id: uuidv4(),
                sessionId: request.sessionId,
                userId: request.userId,
                originalName: request.file.originalname,
                fileName: uniqueFileName,
                filePath,
                mimeType: request.file.mimetype,
                size: request.file.size,
                status: 'uploading',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Save to database
            await this.saveFileAttachment(attachment);

            // Upload to OpenAI in background
            this.uploadToOpenAI(attachment.id, filePath, request.file.originalname)
                .catch(error => {
                    console.error('Error uploading to OpenAI:', error);
                    this.updateFileAttachmentStatus(attachment.id, 'error', error.message);
                });

            return {
                success: true,
                message: 'File upload started',
                attachment
            };

        } catch (error) {
            console.error('Error in uploadFile:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Upload file to OpenAI API
     */
    private async uploadToOpenAI(attachmentId: string, filePath: string, originalName: string): Promise<void> {
        try {
            const attachment = await this.getFileAttachment(attachmentId);
            if (!attachment) {
                throw new Error('File attachment not found');
            }

            const openai = this.getOpenAIClient(attachment.userId);
            if (!openai) {
                throw new Error('No active OpenAI provider found');
            }

            // Update status to processing
            await this.updateFileAttachmentStatus(attachmentId, 'processing');

            // Upload file to OpenAI
            const fileStream = fs.createReadStream(filePath);
            const openaiFile = await openai.files.create({
                file: fileStream,
                purpose: 'assistants'
            });

            // Update attachment with OpenAI file ID
            await this.updateFileAttachment(attachmentId, {
                openaiFileId: openaiFile.id,
                status: 'ready'
            });

            console.log(`File uploaded to OpenAI: ${openaiFile.id}`);

        } catch (error) {
            console.error('Error uploading to OpenAI:', error);
            await this.updateFileAttachmentStatus(attachmentId, 'error', error instanceof Error ? error.message : 'Upload failed');
        }
    }

    /**
     * Create or get vector store for session
     */
    public async getOrCreateVectorStore(sessionId: string, userId: string): Promise<VectorStoreResponse> {
        try {
            // Check if vector store already exists for this session
            let vectorStore = await this.getVectorStoreBySession(sessionId);

            if (vectorStore) {
                return {
                    success: true,
                    message: 'Vector store found',
                    vectorStore
                };
            }

            const openai = this.getOpenAIClient(userId);
            if (!openai) {
                return {
                    success: false,
                    message: 'No active OpenAI provider found'
                };
            }

            // Create new vector store
            const openaiVectorStore = await openai.vectorStores.create({
                name: `chat_session_${sessionId}`
            });

            vectorStore = {
                id: uuidv4(),
                userId,
                sessionId,
                openaiVectorStoreId: openaiVectorStore.id,
                name: `Chat Session ${sessionId}`,
                fileCount: 0,
                status: 'ready',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await this.saveVectorStore(vectorStore);

            return {
                success: true,
                message: 'Vector store created',
                vectorStore
            };

        } catch (error) {
            console.error('Error creating vector store:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Add file to vector store
     */
    public async addFileToVectorStore(attachmentId: string): Promise<{ success: boolean; message: string }> {
        try {
            const attachment = await this.getFileAttachment(attachmentId);
            if (!attachment || !attachment.openaiFileId) {
                return {
                    success: false,
                    message: 'File not ready or not found'
                };
            }

            const vectorStoreResult = await this.getOrCreateVectorStore(attachment.sessionId, attachment.userId);
            if (!vectorStoreResult.success || !vectorStoreResult.vectorStore) {
                return {
                    success: false,
                    message: 'Failed to get vector store'
                };
            }

            const openai = this.getOpenAIClient(attachment.userId);
            if (!openai) {
                return {
                    success: false,
                    message: 'No active OpenAI provider found'
                };
            }

            // Add file to vector store
            await openai.vectorStores.files.create(
                vectorStoreResult.vectorStore.openaiVectorStoreId,
                {
                    file_id: attachment.openaiFileId
                }
            );

            // Update attachment with vector store ID
            await this.updateFileAttachment(attachmentId, {
                vectorStoreId: vectorStoreResult.vectorStore.openaiVectorStoreId
            });

            return {
                success: true,
                message: 'File added to vector store'
            };

        } catch (error) {
            console.error('Error adding file to vector store:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * Get file attachments for a session
     */
    public async getSessionFileAttachments(sessionId: string): Promise<FileAttachmentListResponse> {
        try {
            const attachments = await this.getFileAttachmentsBySession(sessionId);
            return {
                success: true,
                message: 'File attachments retrieved',
                attachments
            };
        } catch (error) {
            console.error('Error getting file attachments:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error occurred',
                attachments: []
            };
        }
    }

    // Database operations
    private async saveFileAttachment(attachment: FileAttachment): Promise<void> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();

        switch (config.type) {
            case 'localdb':
                await this.saveFileAttachmentSQLite(connection, attachment);
                break;
            case 'mongodb':
                await this.saveFileAttachmentMongo(connection, attachment);
                break;
            case 'mysql':
            case 'postgresql':
                await this.saveFileAttachmentSQL(connection, attachment);
                break;
            default:
                throw new Error(`Database type ${config.type} not supported for file operations yet`);
        }
    }

    private async getFileAttachment(id: string): Promise<FileAttachment | null> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();

        switch (config.type) {
            case 'localdb':
                return this.getFileAttachmentSQLite(connection, id);
            case 'mongodb':
                return this.getFileAttachmentMongo(connection, id);
            case 'mysql':
            case 'postgresql':
                return this.getFileAttachmentSQL(connection, id);
            default:
                throw new Error(`Database type ${config.type} not supported for file operations yet`);
        }
    }

    private async updateFileAttachment(id: string, updates: Partial<FileAttachment>): Promise<void> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();

        switch (config.type) {
            case 'localdb':
                await this.updateFileAttachmentSQLite(connection, id, updates);
                break;
            case 'mongodb':
                await this.updateFileAttachmentMongo(connection, id, updates);
                break;
            case 'mysql':
            case 'postgresql':
                await this.updateFileAttachmentSQL(connection, id, updates);
                break;
            default:
                throw new Error(`Database type ${config.type} not supported for file operations yet`);
        }
    }

    private async updateFileAttachmentStatus(id: string, status: FileAttachment['status'], errorMessage?: string): Promise<void> {
        const updates: Partial<FileAttachment> = { status, updatedAt: new Date() };
        if (errorMessage) {
            updates.errorMessage = errorMessage;
        }
        await this.updateFileAttachment(id, updates);
    }

    private async getFileAttachmentsBySession(sessionId: string): Promise<FileAttachment[]> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();

        switch (config.type) {
            case 'localdb':
                return this.getFileAttachmentsBySessionSQLite(connection, sessionId);
            case 'mongodb':
                return this.getFileAttachmentsBySessionMongo(connection, sessionId);
            case 'mysql':
            case 'postgresql':
                return this.getFileAttachmentsBySessionSQL(connection, sessionId);
            default:
                throw new Error(`Database type ${config.type} not supported for file operations yet`);
        }
    }

    private async saveVectorStore(vectorStore: VectorStore): Promise<void> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();

        switch (config.type) {
            case 'localdb':
                await this.saveVectorStoreSQLite(connection, vectorStore);
                break;
            case 'mongodb':
                await this.saveVectorStoreMongo(connection, vectorStore);
                break;
            case 'mysql':
            case 'postgresql':
                await this.saveVectorStoreSQL(connection, vectorStore);
                break;
            default:
                throw new Error(`Database type ${config.type} not supported for file operations yet`);
        }
    }

    private async getVectorStoreBySession(sessionId: string): Promise<VectorStore | null> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();

        switch (config.type) {
            case 'localdb':
                return this.getVectorStoreBySessionSQLite(connection, sessionId);
            case 'mongodb':
                return this.getVectorStoreBySessionMongo(connection, sessionId);
            case 'mysql':
            case 'postgresql':
                return this.getVectorStoreBySessionSQL(connection, sessionId);
            default:
                throw new Error(`Database type ${config.type} not supported for file operations yet`);
        }
    }

    // SQLite implementations
    private async saveFileAttachmentSQLite(db: any, attachment: FileAttachment): Promise<void> {
        await this.createFileAttachmentTableIfNotExistsSQLite(db);

        return new Promise<void>((resolve, reject) => {
            db.run(`
                INSERT INTO file_attachments (
                    id, sessionId, userId, originalName, fileName, filePath, mimeType, size,
                    openaiFileId, vectorStoreId, status, errorMessage, createdAt, updatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                attachment.id, attachment.sessionId, attachment.userId, attachment.originalName,
                attachment.fileName, attachment.filePath, attachment.mimeType, attachment.size,
                attachment.openaiFileId, attachment.vectorStoreId, attachment.status,
                attachment.errorMessage, attachment.createdAt.toISOString(), attachment.updatedAt.toISOString()
            ], (err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    private async createFileAttachmentTableIfNotExistsSQLite(db: any): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            db.run(`
                CREATE TABLE IF NOT EXISTS file_attachments (
                    id TEXT PRIMARY KEY,
                    sessionId TEXT NOT NULL,
                    userId TEXT NOT NULL,
                    originalName TEXT NOT NULL,
                    fileName TEXT NOT NULL,
                    filePath TEXT NOT NULL,
                    mimeType TEXT NOT NULL,
                    size INTEGER NOT NULL,
                    openaiFileId TEXT,
                    vectorStoreId TEXT,
                    status TEXT NOT NULL,
                    errorMessage TEXT,
                    createdAt TEXT NOT NULL,
                    updatedAt TEXT NOT NULL
                )
            `, (err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    private async getFileAttachmentSQLite(db: any, id: string): Promise<FileAttachment | null> {
        return new Promise<FileAttachment | null>((resolve, reject) => {
            db.get(`
                SELECT * FROM file_attachments WHERE id = ?
            `, [id], (err: any, row: any) => {
                if (err) {
                    reject(err);
                } else if (row) {
                    resolve({
                        ...row,
                        createdAt: new Date(row.createdAt),
                        updatedAt: new Date(row.updatedAt)
                    });
                } else {
                    resolve(null);
                }
            });
        });
    }

    private async updateFileAttachmentSQLite(db: any, id: string, updates: Partial<FileAttachment>): Promise<void> {
        const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates).map(value =>
            value instanceof Date ? value.toISOString() : value
        );
        values.push(id);

        return new Promise<void>((resolve, reject) => {
            db.run(`
                UPDATE file_attachments SET ${setClause} WHERE id = ?
            `, values, (err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    private async getFileAttachmentsBySessionSQLite(db: any, sessionId: string): Promise<FileAttachment[]> {
        return new Promise<FileAttachment[]>((resolve, reject) => {
            db.all(`
                SELECT * FROM file_attachments WHERE sessionId = ? ORDER BY createdAt DESC
            `, [sessionId], (err: any, rows: any[]) => {
                if (err) {
                    reject(err);
                } else {
                    const attachments = rows.map(row => ({
                        ...row,
                        createdAt: new Date(row.createdAt),
                        updatedAt: new Date(row.updatedAt)
                    }));
                    resolve(attachments);
                }
            });
        });
    }

    // Vector store SQLite implementations
    private async saveVectorStoreSQLite(db: any, vectorStore: VectorStore): Promise<void> {
        await this.createVectorStoreTableIfNotExistsSQLite(db);

        return new Promise<void>((resolve, reject) => {
            db.run(`
                INSERT INTO vector_stores (
                    id, userId, sessionId, openaiVectorStoreId, name, fileCount, status, createdAt, updatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                vectorStore.id, vectorStore.userId, vectorStore.sessionId, vectorStore.openaiVectorStoreId,
                vectorStore.name, vectorStore.fileCount, vectorStore.status,
                vectorStore.createdAt.toISOString(), vectorStore.updatedAt.toISOString()
            ], (err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    private async createVectorStoreTableIfNotExistsSQLite(db: any): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            db.run(`
                CREATE TABLE IF NOT EXISTS vector_stores (
                    id TEXT PRIMARY KEY,
                    userId TEXT NOT NULL,
                    sessionId TEXT NOT NULL,
                    openaiVectorStoreId TEXT NOT NULL,
                    name TEXT NOT NULL,
                    fileCount INTEGER NOT NULL,
                    status TEXT NOT NULL,
                    createdAt TEXT NOT NULL,
                    updatedAt TEXT NOT NULL
                )
            `, (err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    private async getVectorStoreBySessionSQLite(db: any, sessionId: string): Promise<VectorStore | null> {
        return new Promise<VectorStore | null>((resolve, reject) => {
            db.get(`
                SELECT * FROM vector_stores WHERE sessionId = ?
            `, [sessionId], (err: any, row: any) => {
                if (err) {
                    reject(err);
                } else if (row) {
                    resolve({
                        ...row,
                        createdAt: new Date(row.createdAt),
                        updatedAt: new Date(row.updatedAt)
                    });
                } else {
                    resolve(null);
                }
            });
        });
    }

    // MongoDB implementations
    private async saveFileAttachmentMongo(db: any, attachment: FileAttachment): Promise<void> {
        await db.collection('file_attachments').insertOne(attachment);
    }

    private async getFileAttachmentMongo(db: any, id: string): Promise<FileAttachment | null> {
        return await db.collection('file_attachments').findOne({ id });
    }

    private async updateFileAttachmentMongo(db: any, id: string, updates: Partial<FileAttachment>): Promise<void> {
        await db.collection('file_attachments').updateOne({ id }, { $set: updates });
    }

    private async getFileAttachmentsBySessionMongo(db: any, sessionId: string): Promise<FileAttachment[]> {
        return await db.collection('file_attachments').find({ sessionId }).sort({ createdAt: -1 }).toArray();
    }

    private async saveVectorStoreMongo(db: any, vectorStore: VectorStore): Promise<void> {
        await db.collection('vector_stores').insertOne(vectorStore);
    }

    private async getVectorStoreBySessionMongo(db: any, sessionId: string): Promise<VectorStore | null> {
        return await db.collection('vector_stores').findOne({ sessionId });
    }

    // SQL implementations (MySQL/PostgreSQL)
    private async saveFileAttachmentSQL(db: any, attachment: FileAttachment): Promise<void> {
        await this.createFileAttachmentTableIfNotExistsSQL(db);

        const query = `
            INSERT INTO file_attachments (
                id, sessionId, userId, originalName, fileName, filePath, mimeType, size,
                openaiFileId, vectorStoreId, status, errorMessage, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await db.execute(query, [
            attachment.id, attachment.sessionId, attachment.userId, attachment.originalName,
            attachment.fileName, attachment.filePath, attachment.mimeType, attachment.size,
            attachment.openaiFileId, attachment.vectorStoreId, attachment.status,
            attachment.errorMessage, attachment.createdAt.toISOString(), attachment.updatedAt.toISOString()
        ]);
    }

    private async createFileAttachmentTableIfNotExistsSQL(db: any): Promise<void> {
        const query = `
            CREATE TABLE IF NOT EXISTS file_attachments (
                id VARCHAR(255) PRIMARY KEY,
                sessionId VARCHAR(255) NOT NULL,
                userId VARCHAR(255) NOT NULL,
                originalName TEXT NOT NULL,
                fileName VARCHAR(255) NOT NULL,
                filePath TEXT NOT NULL,
                mimeType VARCHAR(255) NOT NULL,
                size BIGINT NOT NULL,
                openaiFileId VARCHAR(255),
                vectorStoreId VARCHAR(255),
                status VARCHAR(50) NOT NULL,
                errorMessage TEXT,
                createdAt TIMESTAMP NOT NULL,
                updatedAt TIMESTAMP NOT NULL
            )
        `;

        await db.execute(query);
    }

    private async getFileAttachmentSQL(db: any, id: string): Promise<FileAttachment | null> {
        const [rows] = await db.execute('SELECT * FROM file_attachments WHERE id = ?', [id]);
        if (rows.length > 0) {
            const row = rows[0];
            return {
                ...row,
                createdAt: new Date(row.createdAt),
                updatedAt: new Date(row.updatedAt)
            };
        }
        return null;
    }

    private async updateFileAttachmentSQL(db: any, id: string, updates: Partial<FileAttachment>): Promise<void> {
        const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates).map(value =>
            value instanceof Date ? value.toISOString() : value
        );
        values.push(id);

        await db.execute(`UPDATE file_attachments SET ${setClause} WHERE id = ?`, values);
    }

    private async getFileAttachmentsBySessionSQL(db: any, sessionId: string): Promise<FileAttachment[]> {
        const [rows] = await db.execute('SELECT * FROM file_attachments WHERE sessionId = ? ORDER BY createdAt DESC', [sessionId]);
        return rows.map((row: any) => ({
            ...row,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt)
        }));
    }

    private async saveVectorStoreSQL(db: any, vectorStore: VectorStore): Promise<void> {
        await this.createVectorStoreTableIfNotExistsSQL(db);

        const query = `
            INSERT INTO vector_stores (
                id, userId, sessionId, openaiVectorStoreId, name, fileCount, status, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await db.execute(query, [
            vectorStore.id, vectorStore.userId, vectorStore.sessionId, vectorStore.openaiVectorStoreId,
            vectorStore.name, vectorStore.fileCount, vectorStore.status,
            vectorStore.createdAt.toISOString(), vectorStore.updatedAt.toISOString()
        ]);
    }

    private async createVectorStoreTableIfNotExistsSQL(db: any): Promise<void> {
        const query = `
            CREATE TABLE IF NOT EXISTS vector_stores (
                id VARCHAR(255) PRIMARY KEY,
                userId VARCHAR(255) NOT NULL,
                sessionId VARCHAR(255) NOT NULL,
                openaiVectorStoreId VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                fileCount INT NOT NULL,
                status VARCHAR(50) NOT NULL,
                createdAt TIMESTAMP NOT NULL,
                updatedAt TIMESTAMP NOT NULL
            )
        `;

        await db.execute(query);
    }

    private async getVectorStoreBySessionSQL(db: any, sessionId: string): Promise<VectorStore | null> {
        const [rows] = await db.execute('SELECT * FROM vector_stores WHERE sessionId = ?', [sessionId]);
        if (rows.length > 0) {
            const row = rows[0];
            return {
                ...row,
                createdAt: new Date(row.createdAt),
                updatedAt: new Date(row.updatedAt)
            };
        }
        return null;
    }
}
