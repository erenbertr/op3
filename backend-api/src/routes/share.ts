import { Router, Request, Response } from 'express';
import { ChatServiceNew } from '../services/chatServiceNew';
import { asyncHandler } from '../middleware/asyncHandler';
import { createError } from '../utils/errorHandler';

const router = Router();
const chatService = ChatServiceNew.getInstance();

// Get a shared chat by its share ID (public access - no authentication required)
router.get('/:shareId', asyncHandler(async (req: Request, res: Response) => {
    const { shareId } = req.params;

    if (!shareId) {
        throw createError('Share ID is required', 400);
    }

    const result = await chatService.getSharedChat(shareId);
    res.json(result);
}));

export default router;
