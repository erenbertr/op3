import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ChatService } from '../services/chatService';
import { AIChatService } from '../services/aiChatService';
import { asyncHandler } from '../middleware/asyncHandler';
import { createError } from '../utils/errorHandler';
import { authenticateToken } from '../middleware/auth';
import {
    ChatMessage,
    CreateChatSessionRequest,
    SendMessageRequest,
    UpdateChatSessionRequest,
    UpdateChatSessionSettingsRequest
} from '../types/chat';

const router = Router();
const chatService = ChatService.getInstance();
const aiChatService = AIChatService.getInstance();

// Apply authentication middleware to all routes
router.use(authenticateToken);

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

// Get messages for a specific chat session (MUST come before the more general route)
router.get('/sessions/:sessionId/messages', asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    if (!sessionId) {
        throw createError('Session ID is required', 400);
    }

    const result = await chatService.getChatMessages(sessionId);
    res.json(result);
}));

// Get all chat sessions for a user in a specific workspace
router.get('/sessions/:userId/:workspaceId', asyncHandler(async (req: Request, res: Response) => {
    const { userId, workspaceId } = req.params;

    if (!userId) {
        throw createError('User ID is required', 400);
    }

    if (!workspaceId) {
        throw createError('Workspace ID is required', 400);
    }

    const result = await chatService.getChatSessions(userId, workspaceId);
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

// Update chat session settings (personality and AI provider preferences)
router.patch('/sessions/:sessionId/settings', asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const { lastUsedPersonalityId, lastUsedAIProviderId }: UpdateChatSessionSettingsRequest = req.body;

    if (!sessionId) {
        throw createError('Session ID is required', 400);
    }

    const result = await chatService.updateChatSessionSettings(sessionId, {
        lastUsedPersonalityId,
        lastUsedAIProviderId
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

// Save a chat message directly (for partial messages)
router.post('/sessions/:sessionId/save-message', asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const messageData: ChatMessage = req.body;

    if (!sessionId) {
        throw createError('Session ID is required', 400);
    }

    if (!messageData.content || messageData.content.trim() === '') {
        throw createError('Message content is required', 400);
    }

    // Ensure the sessionId matches
    messageData.sessionId = sessionId;

    const result = await chatService.saveChatMessage(messageData);
    res.json(result);
}));

// AI Chat streaming endpoint
router.post('/sessions/:sessionId/ai-stream', asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const { content, personalityId, aiProviderId, userId, isContinuation, searchEnabled, reasoningEnabled, fileAttachments }: SendMessageRequest & { userId: string } = req.body;

    console.log('AI Chat Stream Request:', {
        sessionId,
        content,
        fileAttachments,
        searchEnabled,
        reasoningEnabled,
        hasFileAttachments: fileAttachments && fileAttachments.length > 0,
        fullRequest: req.body
    });

    if (!sessionId) {
        throw createError('Session ID is required', 400);
    }

    if (!content || content.trim() === '') {
        throw createError('Message content is required', 400);
    }

    if (!userId) {
        throw createError('User ID is required', 400);
    }

    // Set up Server-Sent Events
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    try {
        let userMessageResult = null;

        // Only save the user message if it's not a continuation
        if (!isContinuation) {
            userMessageResult = await chatService.sendMessage(sessionId, {
                content: content.trim(),
                personalityId,
                aiProviderId,
                fileAttachments
            });

            if (!userMessageResult.success) {
                res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to save user message' })}\n\n`);
                res.end();
                return;
            }

            // Send user message confirmation
            res.write(`data: ${JSON.stringify({
                type: 'user_message',
                message: userMessageResult.userMessage
            })}\n\n`);
        }

        let fullAiResponse = '';

        // Generate AI response with streaming
        const streamResult = await aiChatService.generateStreamingResponse({
            sessionId,
            content: content.trim(),
            personalityId,
            aiProviderId,
            userId,
            searchEnabled,
            reasoningEnabled,
            fileAttachments
        }, (chunk) => {
            if (chunk.type === 'chunk' && chunk.content) {
                fullAiResponse += chunk.content;
                res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            } else if (chunk.type === 'error') {
                res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            }
        });

        if (streamResult.success && fullAiResponse.trim()) {
            // Save the complete AI response to database
            const aiMessage = {
                id: uuidv4(),
                sessionId,
                content: fullAiResponse.trim(),
                role: 'assistant' as const,
                personalityId,
                aiProviderId,
                createdAt: new Date(),
                apiMetadata: streamResult.metadata
            };

            // Save AI message to database
            try {
                await chatService.saveChatMessageInternal(aiMessage);
            } catch (error) {
                console.error('Error saving AI message:', error);
            }

            res.write(`data: ${JSON.stringify({
                type: 'complete',
                message: aiMessage
            })}\n\n`);
        } else {
            res.write(`data: ${JSON.stringify({
                type: 'error',
                message: 'Failed to generate AI response'
            })}\n\n`);
        }

    } catch (error) {
        console.error('Error in AI streaming:', error);
        res.write(`data: ${JSON.stringify({
            type: 'error',
            message: 'Internal server error'
        })}\n\n`);
    }

    res.end();
}));

export default router;
