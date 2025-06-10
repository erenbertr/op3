export interface FileAttachment {
    id: string;
    sessionId: string;
    userId: string;
    originalName: string;
    fileName: string;
    filePath: string;
    mimeType: string;
    size: number;
    openaiFileId?: string;
    vectorStoreId?: string;
    status: 'uploading' | 'processing' | 'ready' | 'error';
    errorMessage?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface VectorStore {
    id: string;
    userId: string;
    sessionId: string;
    openaiVectorStoreId: string;
    name: string;
    fileCount: number;
    status: 'creating' | 'ready' | 'error';
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateFileAttachmentRequest {
    sessionId: string;
    userId: string;
    file: Express.Multer.File;
}

export interface CreateFileAttachmentResponse {
    success: boolean;
    message: string;
    attachment?: FileAttachment;
}

export interface FileAttachmentListResponse {
    success: boolean;
    message: string;
    attachments: FileAttachment[];
}

export interface VectorStoreResponse {
    success: boolean;
    message: string;
    vectorStore?: VectorStore;
}
