import { Router, Request, Response } from 'express';
import { PersonalityService } from '../services/personalityService';
import { CreatePersonalityRequest, UpdatePersonalityRequest } from '../types/personality';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = Router();
const personalityService = new PersonalityService();

// Get all personalities for a user
router.get('/:userId', asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (!userId) {
        throw createError('User ID is required', 400);
    }

    const result = await personalityService.getPersonalities(userId);

    if (!result.success) {
        throw createError(result.message, 500);
    }

    res.json(result);
}));

// Create a new personality
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { userId, title, prompt }: { userId: string } & CreatePersonalityRequest = req.body;

    if (!userId) {
        throw createError('User ID is required', 400);
    }

    if (!title || title.trim() === '') {
        throw createError('Title is required', 400);
    }

    if (!prompt || prompt.trim() === '') {
        throw createError('Prompt is required', 400);
    }

    const result = await personalityService.createPersonality(userId, {
        title: title.trim(),
        prompt: prompt.trim()
    });

    if (!result.success) {
        throw createError(result.message, 400);
    }

    res.status(201).json(result);
}));

// Update a personality
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId, title, prompt }: { userId: string } & UpdatePersonalityRequest = req.body;

    if (!id) {
        throw createError('Personality ID is required', 400);
    }

    if (!userId) {
        throw createError('User ID is required', 400);
    }

    // Validate that at least one field is being updated
    if (!title && !prompt) {
        throw createError('At least one field (title or prompt) must be provided for update', 400);
    }

    const updateData: UpdatePersonalityRequest = {};
    if (title !== undefined) updateData.title = title.trim();
    if (prompt !== undefined) updateData.prompt = prompt.trim();

    const result = await personalityService.updatePersonality(id, userId, updateData);

    if (!result.success) {
        throw createError(result.message, 400);
    }

    res.json(result);
}));

// Delete a personality
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId }: { userId: string } = req.body;

    if (!id) {
        throw createError('Personality ID is required', 400);
    }

    if (!userId) {
        throw createError('User ID is required', 400);
    }

    const result = await personalityService.deletePersonality(id, userId);

    if (!result.success) {
        throw createError(result.message, 400);
    }

    res.json(result);
}));

export default router;
