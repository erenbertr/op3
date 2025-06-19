import { Router, Request, Response } from 'express';
import { WorkspaceServiceNew } from '../services/workspaceServiceNew';
import { UserServiceNew } from '../services/userServiceNew';
import { CreateWorkspaceRequest, UpdateWorkspaceRequest } from '../types/workspace';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const workspaceService = WorkspaceServiceNew.getInstance();
const userService = UserServiceNew.getInstance();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Create workspace for user
router.post('/create', asyncHandler(async (req: Request, res: Response) => {
    const { userId, name, templateType, workspaceRules }: { userId: string } & CreateWorkspaceRequest = req.body;

    if (!userId) {
        throw createError('User ID is required', 400);
    }

    if (!name || name.trim() === '') {
        throw createError('Workspace name is required', 400);
    }

    if (!templateType) {
        throw createError('Template type is required', 400);
    }

    if (!['standard-chat', 'kanban-board', 'node-graph'].includes(templateType)) {
        throw createError('Invalid template type', 400);
    }

    // Validate that workspaceRules is provided (can be empty string)
    if (workspaceRules === undefined || workspaceRules === null) {
        throw createError('Workspace rules field is required', 400);
    }

    const result = await workspaceService.createWorkspace(userId, {
        name: name.trim(),
        templateType,
        workspaceRules: workspaceRules || ''
    });

    if (!result.success) {
        throw createError(result.message, 400);
    }

    res.json(result);
}));

// Get user's workspace status
router.get('/status/:userId', asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (!userId) {
        throw createError('User ID is required', 400);
    }

    const result = await workspaceService.getUserWorkspace(userId);

    res.json(result);
}));

// Get user's workspace
router.get('/:userId', asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (!userId) {
        throw createError('User ID is required', 400);
    }

    const result = await workspaceService.getUserWorkspace(userId);

    if (!result.success) {
        throw createError('Failed to get workspace', 500);
    }

    if (!result.hasWorkspace) {
        throw createError('No workspace found for user', 404);
    }

    res.json({
        success: true,
        workspace: result.workspace
    });
}));

// Get all workspaces for a user
router.get('/list/:userId', asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (!userId) {
        throw createError('User ID is required', 400);
    }

    const result = await workspaceService.getUserWorkspaces(userId);

    res.json(result);
}));

// Get specific workspace by ID
router.get('/:workspaceId/:userId', asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId, userId } = req.params;

    if (!workspaceId) {
        throw createError('Workspace ID is required', 400);
    }

    if (!userId) {
        throw createError('User ID is required', 400);
    }

    const workspace = await workspaceService.getWorkspaceById(workspaceId, userId);

    if (!workspace) {
        throw createError('Workspace not found', 404);
    }

    const result = {
        success: true,
        workspace
    };

    res.json(result);
}));

// Update a workspace
router.patch('/:workspaceId', asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId } = req.params;
    const { userId, name, workspaceRules }: { userId: string } & UpdateWorkspaceRequest = req.body;

    if (!workspaceId) {
        throw createError('Workspace ID is required', 400);
    }

    if (!userId) {
        throw createError('User ID is required', 400);
    }

    if (name !== undefined && name.trim() === '') {
        throw createError('Workspace name cannot be empty', 400);
    }

    const updateData: UpdateWorkspaceRequest = {};
    if (name !== undefined) updateData.name = name.trim();
    if (workspaceRules !== undefined) updateData.workspaceRules = workspaceRules;

    const result = await workspaceService.updateWorkspace(workspaceId, userId, updateData);

    if (!result.success) {
        throw createError(result.message, 400);
    }

    res.json(result);
}));

// Set active workspace
router.post('/:workspaceId/activate', asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId } = req.params;
    const { userId }: { userId: string } = req.body;

    if (!workspaceId) {
        throw createError('Workspace ID is required', 400);
    }

    if (!userId) {
        throw createError('User ID is required', 400);
    }

    const result = await workspaceService.setActiveWorkspace(workspaceId, userId);

    if (!result.success) {
        throw createError(result.message, 400);
    }

    res.json(result);
}));

// Delete a workspace
router.delete('/:workspaceId', asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId } = req.params;
    const { userId }: { userId: string } = req.body;

    if (!workspaceId) {
        throw createError('Workspace ID is required', 400);
    }

    if (!userId) {
        throw createError('User ID is required', 400);
    }

    const result = await workspaceService.deleteWorkspace(workspaceId, userId);

    if (!result.success) {
        throw createError(result.message, 400);
    }

    res.json(result);
}));

export default router;
