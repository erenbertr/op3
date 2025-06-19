import { Router, Request, Response } from 'express';
import { UserService } from '../services/userService';
import { SystemSettingsService } from '../services/systemSettingsService';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import bcrypt from 'bcrypt';

const router = Router();
const userService = UserService.getInstance();
const systemSettingsService = SystemSettingsService.getInstance();

// Middleware to ensure admin access
const requireAdmin = (req: any, res: Response, next: any) => {
    if (!req.user || req.user.role !== 'admin') {
        throw createError('Admin access required', 403);
    }
    next();
};

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// System Settings Routes
router.get('/system-settings', asyncHandler(async (req: Request, res: Response) => {
    const settings = await systemSettingsService.getSystemSettings();
    res.json({
        success: true,
        settings
    });
}));

router.put('/system-settings', asyncHandler(async (req: any, res: Response) => {
    const updates = req.body;
    const result = await systemSettingsService.updateSystemSettings(updates, req.user.userId);

    if (result.success) {
        res.json(result);
    } else {
        throw createError(result.message, 400);
    }
}));

// User Management Routes
router.get('/users', asyncHandler(async (req: Request, res: Response) => {
    const {
        page = 1,
        limit = 20,
        search = '',
        role,
        isActive,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = req.query;

    const result = await userService.getAllUsers({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
        role: role as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        sortBy: sortBy as 'email' | 'username' | 'createdAt' | 'lastLoginAt',
        sortOrder: sortOrder as 'asc' | 'desc'
    });

    res.json(result);
}));

router.get('/users/:userId', asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const user = await userService.getUserById(userId);

    if (!user) {
        throw createError('User not found', 404);
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    res.json({
        success: true,
        user: userWithoutPassword
    });
}));

router.post('/users', asyncHandler(async (req: any, res: Response) => {
    const { email, username, password, role, firstName, lastName } = req.body;

    if (!email || !password || !role) {
        throw createError('Email, password, and role are required', 400);
    }

    if (!['admin', 'subscribed', 'normal'].includes(role)) {
        throw createError('Invalid role', 400);
    }

    const result = await userService.createUser({
        email,
        username,
        password,
        role,
        firstName,
        lastName
    });

    if (result.success) {
        res.status(201).json(result);
    } else {
        throw createError(result.message, 400);
    }
}));

router.put('/users/:userId', asyncHandler(async (req: any, res: Response) => {
    const { userId } = req.params;
    const updates = req.body;

    // Remove password from updates - password changes should be handled separately
    const { password, ...allowedUpdates } = updates;

    const result = await userService.updateUser(userId, allowedUpdates);

    if (result.success) {
        // Get updated user
        const updatedUser = await userService.getUserById(userId);
        const userResponse = updatedUser ? { ...updatedUser, password: undefined } : undefined;
        res.json({
            ...result,
            user: userResponse
        });
    } else {
        throw createError(result.message, 400);
    }
}));

router.delete('/users/:userId', asyncHandler(async (req: any, res: Response) => {
    const { userId } = req.params;

    const result = await userService.deleteUser(userId);

    if (result.success) {
        res.json(result);
    } else {
        throw createError(result.message, 400);
    }
}));

// Password reset for users (admin only)
router.put('/users/:userId/password', asyncHandler(async (req: any, res: Response) => {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
        throw createError('New password is required', 400);
    }

    if (newPassword.length < 8) {
        throw createError('Password must be at least 8 characters long', 400);
    }

    try {
        const user = await userService.getUserById(userId);
        if (!user) {
            throw createError('User not found', 404);
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        const result = await userService.updateUser(userId, { password: hashedPassword } as any);

        if (result.success) {
            res.json({
                success: true,
                message: 'Password updated successfully'
            });
        } else {
            throw createError(result.message, 400);
        }
    } catch (error) {
        console.error('Error updating password:', error);
        throw createError('Failed to update password', 500);
    }
}));

// Bulk operations
router.post('/users/bulk-update', asyncHandler(async (req: any, res: Response) => {
    const { userIds, updates } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
        throw createError('User IDs array is required', 400);
    }

    if (!updates || Object.keys(updates).length === 0) {
        throw createError('Updates object is required', 400);
    }

    const results = [];
    const errors = [];

    for (const userId of userIds) {
        try {
            const result = await userService.updateUser(userId, updates);
            if (result.success) {
                results.push({ userId, success: true });
            } else {
                errors.push({ userId, error: result.message });
            }
        } catch (error) {
            errors.push({ userId, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }

    res.json({
        success: true,
        message: `Updated ${results.length} users successfully`,
        results,
        errors: errors.length > 0 ? errors : undefined
    });
}));

// User statistics
router.get('/users/stats', asyncHandler(async (req: Request, res: Response) => {
    const [totalUsers, adminUsers, activeUsers, inactiveUsers] = await Promise.all([
        userService.getAllUsers({ limit: 1 }),
        userService.getAllUsers({ role: 'admin', limit: 1 }),
        userService.getAllUsers({ isActive: true, limit: 1 }),
        userService.getAllUsers({ isActive: false, limit: 1 })
    ]);

    res.json({
        success: true,
        stats: {
            total: totalUsers.total,
            admins: adminUsers.total,
            active: activeUsers.total,
            inactive: inactiveUsers.total,
            normal: totalUsers.total - adminUsers.total
        }
    });
}));

export default router;
