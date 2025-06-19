import { Router, Request, Response } from 'express';
import { ChatService } from '../services/chatService';
import { asyncHandler } from '../middleware/asyncHandler';
import { createError } from '../utils/errorHandler';

const router = Router();
const chatService = ChatService.getInstance();

// Get a shared message by its share ID (public access - no authentication required)
router.get('/:shareId', asyncHandler(async (req: Request, res: Response) => {
    const { shareId } = req.params;

    if (!shareId) {
        throw createError('Share ID is required', 400);
    }

    const result = await chatService.getSharedChat(shareId);
    res.json(result);
}));

export default router;
