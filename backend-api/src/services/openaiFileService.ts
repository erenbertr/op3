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

    // In-memory storage for testing (replace with proper database later)
    private fileAttachments: Map<string, FileAttachment> = new Map();
    private vectorStores: Map<string, VectorStore> = new Map();

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
            console.log('OpenAI File Service: Starting file upload for user:', request.userId);
            const openai = this.getOpenAIClient(request.userId);
            if (!openai) {
                console.log('OpenAI File Service: No active OpenAI provider found');
                return {
                    success: false,
                    message: 'No active OpenAI provider found'
                };
            }
            console.log('OpenAI File Service: OpenAI client obtained successfully');

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

            // Add file to vector store for search functionality
            const vectorStoreResult = await this.addFileToVectorStore(attachmentId);
            if (vectorStoreResult.success) {
                console.log(`File added to vector store: ${attachmentId}`);
            } else {
                console.error(`Failed to add file to vector store: ${vectorStoreResult.message}`);
            }

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

    // Database operations (using in-memory storage for now)
    private async saveFileAttachment(attachment: FileAttachment): Promise<void> {
        console.log('OpenAI File Service: Saving file attachment to memory:', attachment.id);
        this.fileAttachments.set(attachment.id, attachment);
    }

    private async getFileAttachment(id: string): Promise<FileAttachment | null> {
        console.log('OpenAI File Service: Getting file attachment from memory:', id);
        return this.fileAttachments.get(id) || null;
    }

    private async updateFileAttachment(id: string, updates: Partial<FileAttachment>): Promise<void> {
        console.log('OpenAI File Service: Updating file attachment in memory:', id, updates);
        const existing = this.fileAttachments.get(id);
        if (existing) {
            const updated = { ...existing, ...updates, updatedAt: new Date() };
            this.fileAttachments.set(id, updated);
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
        console.log('OpenAI File Service: Getting file attachments by session from memory:', sessionId);
        const attachments = Array.from(this.fileAttachments.values())
            .filter(attachment => attachment.sessionId === sessionId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return attachments;
    }

    private async saveVectorStore(vectorStore: VectorStore): Promise<void> {
        console.log('OpenAI File Service: Saving vector store to memory:', vectorStore.id);
        this.vectorStores.set(vectorStore.sessionId, vectorStore);
    }

    private async getVectorStoreBySession(sessionId: string): Promise<VectorStore | null> {
        console.log('OpenAI File Service: Getting vector store by session from memory:', sessionId);
        return this.vectorStores.get(sessionId) || null;
    }





}
