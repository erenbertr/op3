import { Router, Request, Response } from 'express';
import { ChatService } from '../services/chatService';
import { asyncHandler } from '../middleware/asyncHandler';
import { createError } from '../utils/errorHandler';
import {
    CreateChatSessionRequest,
    SendMessageRequest,
    UpdateChatSessionRequest
} from '../types/chat';

const router = Router();
const chatService = ChatService.getInstance();

// Create a new chat session
router.post('/sessions', asyncHandler(async (req: Request, res: Response) => {
    const { userId, workspaceId, title }: CreateChatSessionRequest = req.body;

    if (!userId) {
        throw createError('User ID is required', 400);
    }

    if (!workspaceId) {
        throw createError('Workspace ID is required', 400);
    }

    const result = await chatService.createChatSession({
        userId,
        workspaceId,
        title
    });

    res.json(result);
}));

// Get all chat sessions for a user
router.get('/sessions/:userId', asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (!userId) {
        throw createError('User ID is required', 400);
    }

    const result = await chatService.getChatSessions(userId);
    res.json(result);
}));

// Get messages for a specific chat session
router.get('/sessions/:sessionId/messages', asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    if (!sessionId) {
        throw createError('Session ID is required', 400);
    }

    const result = await chatService.getChatMessages(sessionId);
    res.json(result);
}));

// Send a message to a chat session
router.post('/sessions/:sessionId/messages', asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const { content, personalityId, aiProviderId }: SendMessageRequest = req.body;

    if (!sessionId) {
        throw createError('Session ID is required', 400);
    }

    if (!content || content.trim() === '') {
        throw createError('Message content is required', 400);
    }

    const result = await chatService.sendMessage(sessionId, {
        content: content.trim(),
        personalityId,
        aiProviderId
    });

    res.json(result);
}));

// Update a chat session (e.g., change title)
router.patch('/sessions/:sessionId', asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const { title }: UpdateChatSessionRequest = req.body;

    if (!sessionId) {
        throw createError('Session ID is required', 400);
    }

    const result = await chatService.updateChatSession(sessionId, {
        title
    });

    res.json(result);
}));

// Delete a chat session
router.delete('/sessions/:sessionId', asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    if (!sessionId) {
        throw createError('Session ID is required', 400);
    }

    const result = await chatService.deleteChatSession(sessionId);
    res.json(result);
}));

export default router;
