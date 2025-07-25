import { Router, Request, Response } from 'express';
import { UserServiceNew } from '../services/userServiceNew';
import { SystemSettingsServiceNew } from '../services/systemSettingsServiceNew';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = Router();
const userService = UserServiceNew.getInstance();
const systemSettingsService = SystemSettingsServiceNew.getInstance();

// JWT secret - in production, this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

interface LoginRequest {
    email: string;
    password: string;
}

interface LoginResponse {
    success: boolean;
    message: string;
    user?: {
        id: string;
        email: string;
        username: string;
        role: string;
        hasCompletedWorkspaceSetup: boolean;
    };
    token?: string;
}

// Login endpoint
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
        throw createError('Email and password are required', 400);
    }

    try {
        // Check if login is enabled (except for admin users)
        const systemSettings = await systemSettingsService.getSystemSettings();
        if (!systemSettings.loginEnabled) {
            // Allow admin login even when login is disabled
            const user = await userService.getUserByEmail(email);
            if (!user || user.role !== 'admin') {
                throw createError('Login is currently disabled', 403);
            }
        }

        // Get user by email
        const user = await userService.getUserByEmail(email);

        if (!user) {
            throw createError('Invalid email or password', 401);
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            throw createError('Invalid email or password', 401);
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Update last login time
        await userService.updateLastLogin(user.id);

        const response: LoginResponse = {
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                username: user.username || user.email.split('@')[0],
                role: user.role,
                hasCompletedWorkspaceSetup: user.hasCompletedWorkspaceSetup || false
            },
            token
        };

        res.json(response);
    } catch (error) {
        if (error instanceof Error && error.message.includes('Invalid email or password')) {
            throw error;
        }
        console.error('Login error:', error);
        throw createError('Login failed', 500);
    }
}));

// Verify token endpoint
router.get('/verify', asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw createError('No token provided', 401);
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;

        // Get fresh user data
        const user = await userService.getUserByEmail(decoded.email);

        if (!user) {
            throw createError('User not found', 401);
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                username: user.username || user.email.split('@')[0],
                role: user.role,
                hasCompletedWorkspaceSetup: user.hasCompletedWorkspaceSetup || false
            }
        });
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            throw createError('Invalid token', 401);
        }
        throw createError('Token verification failed', 500);
    }
}));

// User registration endpoint
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
    const { email, password, username, firstName, lastName } = req.body;

    if (!email || !password) {
        throw createError('Email and password are required', 400);
    }

    try {
        // Check if registration is enabled
        const systemSettings = await systemSettingsService.getSystemSettings();
        if (!systemSettings.registrationEnabled) {
            throw createError('User registration is currently disabled', 403);
        }

        // Check if user already exists
        const existingUser = await userService.getUserByEmail(email);
        if (existingUser) {
            throw createError('User with this email already exists', 409);
        }

        // Create user with default role from system settings
        const result = await userService.createUser({
            email,
            username,
            password,
            role: systemSettings.defaultUserRole,
            firstName,
            lastName,
            isActive: true
        });

        if (!result.success) {
            throw createError(result.message, 400);
        }

        // Generate JWT token for the new user
        const token = jwt.sign(
            {
                userId: result.user!.id,
                email: result.user!.email,
                role: result.user!.role
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: result.user!.id,
                email: result.user!.email,
                username: result.user!.username || result.user!.email.split('@')[0],
                role: result.user!.role,
                hasCompletedWorkspaceSetup: false
            },
            token
        });
    } catch (error) {
        console.error('Registration error:', error);
        if (error instanceof Error) {
            // Pass through specific error messages
            if (error.message.includes('registration is currently disabled') ||
                error.message.includes('already exists') ||
                error.message.includes('Password must be') ||
                error.message.includes('Invalid email format')) {
                throw error;
            }
        }
        throw createError('Registration failed', 500);
    }
}));

// Logout endpoint (optional - mainly for token blacklisting in production)
router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
    // In a production app, you might want to blacklist the token
    // For now, we'll just return success since the frontend handles token removal
    res.json({
        success: true,
        message: 'Logout successful'
    });
}));

// Update user profile
router.patch('/profile', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const { username, firstName, lastName } = req.body;
    const userId = req.user!.id;

    try {
        const result = await userService.updateUserProfile(userId, {
            username,
            firstName,
            lastName
        });

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: result
        });
    } catch (error) {
        console.error('Profile update error:', error);
        throw createError('Failed to update profile', 500);
    }
}));

// Change user password
router.patch('/password', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.id;

    if (!currentPassword || !newPassword) {
        throw createError('Current password and new password are required', 400);
    }

    try {
        const result = await userService.changePassword(userId, {
            currentPassword,
            newPassword
        });

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Password change error:', error);
        if (error instanceof Error) {
            if (error.message.includes('Invalid current password')) {
                throw createError('Invalid current password', 400);
            }
            if (error.message.includes('User not found')) {
                throw createError('User not found', 404);
            }
            // Pass through validation errors (password requirements)
            if (error.message.includes('Password must be') ||
                error.message.includes('characters long') ||
                error.message.includes('uppercase') ||
                error.message.includes('lowercase') ||
                error.message.includes('number') ||
                error.message.includes('special character')) {
                throw createError(error.message, 400);
            }
        }
        throw createError('Failed to change password', 500);
    }
}));

// Debug endpoint to create a test admin user (remove in production)
router.post('/create-test-admin', asyncHandler(async (req: Request, res: Response) => {
    try {
        const result = await userService.createAdminUser({
            email: 'admin@test.com',
            username: 'admin',
            password: 'Admin123!',
            confirmPassword: 'Admin123!'
        });

        res.json(result);
    } catch (error) {
        console.error('Error creating test admin:', error);
        throw createError('Failed to create test admin', 500);
    }
}));

export default router;
