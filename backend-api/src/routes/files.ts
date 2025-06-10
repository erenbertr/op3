import { Router, Request, Response } from 'express';
import multer from 'multer';
import { OpenAIFileService } from '../services/openaiFileService';
import { asyncHandler } from '../middleware/asyncHandler';
import { createError } from '../utils/errorHandler';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const openaiFileService = OpenAIFileService.getInstance();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
        files: 5 // Maximum 5 files at once
    },
    fileFilter: (req, file, cb) => {
        // Check supported file types based on OpenAI documentation
        const supportedTypes = [
            'text/plain',
            'text/markdown',
            'text/csv',
            'text/html',
            'text/css',
            'text/javascript',
            'text/x-python',
            'text/x-java',
            'text/x-c',
            'text/x-c++',
            'text/x-csharp',
            'text/x-php',
            'text/x-ruby',
            'text/x-go',
            'text/x-tex',
            'application/json',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/x-sh',
            'application/typescript'
        ];

        if (supportedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported file type: ${file.mimetype}`));
        }
    }
});

// Upload files to a chat session
router.post('/sessions/:sessionId/upload', upload.array('files', 5), asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const { userId } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!sessionId) {
        throw createError('Session ID is required', 400);
    }

    if (!userId) {
        throw createError('User ID is required', 400);
    }

    if (!files || files.length === 0) {
        throw createError('No files provided', 400);
    }

    try {
        const uploadResults = [];

        for (const file of files) {
            const result = await openaiFileService.uploadFile({
                sessionId,
                userId,
                file
            });

            uploadResults.push(result);

            // If upload was successful, add to vector store
            if (result.success && result.attachment) {
                // Add to vector store in background
                setTimeout(async () => {
                    try {
                        await openaiFileService.addFileToVectorStore(result.attachment!.id);
                    } catch (error) {
                        console.error('Error adding file to vector store:', error);
                    }
                }, 1000); // Wait 1 second for OpenAI upload to complete
            }
        }

        const successCount = uploadResults.filter(r => r.success).length;
        const failureCount = uploadResults.length - successCount;

        res.json({
            success: successCount > 0,
            message: `${successCount} file(s) uploaded successfully${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
            results: uploadResults
        });

    } catch (error) {
        console.error('Error uploading files:', error);
        throw createError('Failed to upload files', 500);
    }
}));

// Get file attachments for a session
router.get('/sessions/:sessionId/attachments', asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    if (!sessionId) {
        throw createError('Session ID is required', 400);
    }

    const result = await openaiFileService.getSessionFileAttachments(sessionId);
    res.json(result);
}));

// Get or create vector store for a session
router.post('/sessions/:sessionId/vector-store', asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const { userId } = req.body;

    if (!sessionId) {
        throw createError('Session ID is required', 400);
    }

    if (!userId) {
        throw createError('User ID is required', 400);
    }

    const result = await openaiFileService.getOrCreateVectorStore(sessionId, userId);
    res.json(result);
}));

// Delete a file attachment
router.delete('/attachments/:attachmentId', asyncHandler(async (req: Request, res: Response) => {
    const { attachmentId } = req.params;

    if (!attachmentId) {
        throw createError('Attachment ID is required', 400);
    }

    // TODO: Implement file deletion
    res.json({
        success: false,
        message: 'File deletion not implemented yet'
    });
}));

export default router;
