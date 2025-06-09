import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserService } from '../services/userService';
import { createError } from './errorHandler';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const userService = UserService.getInstance();

// Extend Request interface to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: string;
            };
        }
    }
}

/**
 * Authentication middleware that validates JWT tokens
 * Adds user information to req.user if token is valid
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw createError('Access denied. No token provided.', 401);
        }

        const token = authHeader.substring(7);

        try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;

            // Get fresh user data to ensure user still exists and is active
            const user = await userService.getUserByEmailForAuth(decoded.email);

            if (!user) {
                throw createError('Access denied. User not found.', 401);
            }

            // Add user info to request
            req.user = {
                id: user.id,
                email: user.email,
                role: user.role
            };

            next();
        } catch (jwtError) {
            if (jwtError instanceof jwt.JsonWebTokenError) {
                throw createError('Access denied. Invalid token.', 401);
            }
            throw jwtError;
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Authorization middleware that checks if user has admin role
 * Must be used after authenticateToken middleware
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        throw createError('Authentication required', 401);
    }

    if (req.user.role !== 'admin') {
        throw createError('Access denied. Admin role required.', 403);
    }

    next();
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 * Useful for endpoints that work for both authenticated and unauthenticated users
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);

            try {
                const decoded = jwt.verify(token, JWT_SECRET) as any;
                const user = await userService.getUserByEmailForAuth(decoded.email);

                if (user) {
                    req.user = {
                        id: user.id,
                        email: user.email,
                        role: user.role
                    };
                }
            } catch (jwtError) {
                // Ignore JWT errors for optional auth
                console.warn('Optional auth failed:', jwtError instanceof Error ? jwtError.message : 'Unknown error');
            }
        }

        next();
    } catch (error) {
        next(error);
    }
};
