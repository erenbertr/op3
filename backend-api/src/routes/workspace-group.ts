import express, { Request, Response } from 'express';
import { WorkspaceGroupService } from '../services/workspaceGroupService';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import {
    CreateWorkspaceGroupRequest,
    UpdateWorkspaceGroupRequest,
    ReorderGroupsRequest,
    MoveWorkspaceToGroupRequest
} from '../types/workspace-group';

const router = express.Router();
const workspaceGroupService = WorkspaceGroupService.getInstance();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Create workspace group
router.post('/create', asyncHandler(async (req: Request, res: Response) => {
    const { userId, name, sortOrder }: { userId: string } & CreateWorkspaceGroupRequest = req.body;

    if (!userId) {
        throw createError('User ID is required', 400);
    }

    if (!name || name.trim() === '') {
        throw createError('Group name is required', 400);
    }

    const result = await workspaceGroupService.createGroup(userId, {
        name: name.trim(),
        sortOrder
    });

    if (!result.success) {
        throw createError(result.message, 400);
    }

    res.json(result);
}));

// Get user's workspace groups
router.get('/user/:userId', asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (!userId) {
        throw createError('User ID is required', 400);
    }

    const result = await workspaceGroupService.getUserGroups(userId);

    if (!result.success) {
        throw createError(result.message, 400);
    }

    res.json(result);
}));

// SPECIFIC ROUTES MUST COME BEFORE GENERIC PARAMETERIZED ROUTES

// Reorder groups
router.put('/reorder', asyncHandler(async (req: Request, res: Response) => {
    const { userId, groupOrders }: { userId: string } & ReorderGroupsRequest = req.body;

    if (!userId) {
        throw createError('User ID is required', 400);
    }

    if (!groupOrders || !Array.isArray(groupOrders)) {
        throw createError('Group orders array is required', 400);
    }

    const result = await workspaceGroupService.reorderGroups(userId, { groupOrders });

    if (!result.success) {
        throw createError(result.message, 400);
    }

    res.json(result);
}));

// Move workspace to group
router.put('/move-workspace', asyncHandler(async (req: Request, res: Response) => {
    const { userId, workspaceId, groupId, sortOrder }: { userId: string } & MoveWorkspaceToGroupRequest = req.body;

    if (!userId) {
        throw createError('User ID is required', 400);
    }

    if (!workspaceId) {
        throw createError('Workspace ID is required', 400);
    }

    // Import workspace service here to avoid circular dependency
    const { WorkspaceService } = await import('../services/workspaceService');
    const workspaceService = WorkspaceService.getInstance();

    const result = await workspaceService.updateWorkspace(workspaceId, userId, {
        groupId,
        sortOrder
    });

    if (!result.success) {
        throw createError(result.message, 400);
    }

    res.json(result);
}));

// Batch update workspaces (for reordering)
router.put('/batch-update', asyncHandler(async (req: Request, res: Response) => {
    const { userId, updates }: {
        userId: string;
        updates: Array<{ workspaceId: string; groupId: string | null; sortOrder: number }>
    } = req.body;

    if (!userId) {
        throw createError('User ID is required', 400);
    }

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
        throw createError('Updates array is required', 400);
    }

    // Import workspace service here to avoid circular dependency
    const { WorkspaceService } = await import('../services/workspaceService');
    const workspaceService = WorkspaceService.getInstance();

    const result = await workspaceService.batchUpdateWorkspaces(userId, updates);

    if (!result.success) {
        throw createError(result.message || 'Failed to update workspaces', 400);
    }

    res.json(result);
}));

// GENERIC PARAMETERIZED ROUTES MUST COME AFTER SPECIFIC ROUTES

// Update workspace group
router.put('/:groupId', asyncHandler(async (req: Request, res: Response) => {
    const { groupId } = req.params;
    const { userId, name, sortOrder }: { userId: string } & UpdateWorkspaceGroupRequest = req.body;

    if (!userId) {
        throw createError('User ID is required', 400);
    }

    if (!groupId) {
        throw createError('Group ID is required', 400);
    }

    const result = await workspaceGroupService.updateGroup(userId, groupId, {
        name: name?.trim(),
        sortOrder
    });

    if (!result.success) {
        throw createError(result.message, 400);
    }

    res.json(result);
}));

// Delete workspace group
router.delete('/:groupId', asyncHandler(async (req: Request, res: Response) => {
    const { groupId } = req.params;
    const { userId } = req.body;

    if (!userId) {
        throw createError('User ID is required', 400);
    }

    if (!groupId) {
        throw createError('Group ID is required', 400);
    }

    const result = await workspaceGroupService.deleteGroup(userId, groupId);

    if (!result.success) {
        throw createError(result.message, 400);
    }

    res.json(result);
}));

export default router;
