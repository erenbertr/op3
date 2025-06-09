import { Router, Request, Response } from 'express';
import { StatisticsService } from '../services/statisticsService';
import { asyncHandler } from '../middleware/asyncHandler';
import { createError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const statisticsService = StatisticsService.getInstance();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get workspace statistics
router.get('/workspace/:workspaceId', asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId } = req.params;
    const {
        userId,
        dateRange,
        startDate,
        endDate
    } = req.query as {
        userId: string;
        dateRange?: 'today' | 'yesterday' | 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'custom';
        startDate?: string;
        endDate?: string;
    };

    if (!workspaceId) {
        throw createError('Workspace ID is required', 400);
    }

    if (!userId) {
        throw createError('User ID is required', 400);
    }

    // Validate date range
    const validDateRanges = ['today', 'yesterday', 'this-week', 'last-week', 'this-month', 'last-month', 'custom'];
    if (dateRange && !validDateRanges.includes(dateRange)) {
        throw createError('Invalid date range', 400);
    }

    // Parse custom dates if provided
    let parsedStartDate: Date | undefined;
    let parsedEndDate: Date | undefined;

    if (dateRange === 'custom') {
        if (!startDate || !endDate) {
            throw createError('Start date and end date are required for custom range', 400);
        }

        parsedStartDate = new Date(startDate);
        parsedEndDate = new Date(endDate);

        if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
            throw createError('Invalid date format', 400);
        }

        if (parsedStartDate > parsedEndDate) {
            throw createError('Start date must be before end date', 400);
        }
    }

    const result = await statisticsService.getWorkspaceStatistics({
        workspaceId,
        userId,
        dateRange: dateRange || 'this-week',
        startDate: parsedStartDate,
        endDate: parsedEndDate
    });

    res.json(result);
}));

// Get provider-specific statistics
router.get('/workspace/:workspaceId/providers', asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId } = req.params;
    const { userId, dateRange } = req.query as { userId: string; dateRange?: string };

    if (!workspaceId) {
        throw createError('Workspace ID is required', 400);
    }

    if (!userId) {
        throw createError('User ID is required', 400);
    }

    const result = await statisticsService.getWorkspaceStatistics({
        workspaceId,
        userId,
        dateRange: (dateRange as any) || 'this-week'
    });

    if (result.success && result.statistics) {
        // Return only provider-specific data
        res.json({
            success: true,
            message: 'Provider statistics retrieved successfully',
            data: {
                messagesByProvider: result.statistics.messagesByProvider,
                tokensByProvider: result.statistics.tokensByProvider,
                costByProvider: result.statistics.costByProvider
            }
        });
    } else {
        res.json(result);
    }
}));

// Get daily usage trends
router.get('/workspace/:workspaceId/trends', asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId } = req.params;
    const { userId, dateRange } = req.query as { userId: string; dateRange?: string };

    if (!workspaceId) {
        throw createError('Workspace ID is required', 400);
    }

    if (!userId) {
        throw createError('User ID is required', 400);
    }

    const result = await statisticsService.getWorkspaceStatistics({
        workspaceId,
        userId,
        dateRange: (dateRange as any) || 'this-week'
    });

    if (result.success && result.statistics) {
        // Return only daily usage data
        res.json({
            success: true,
            message: 'Usage trends retrieved successfully',
            data: {
                dailyUsage: result.statistics.dailyUsage
            }
        });
    } else {
        res.json(result);
    }
}));

// Get summary statistics
router.get('/workspace/:workspaceId/summary', asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId } = req.params;
    const { userId, dateRange } = req.query as { userId: string; dateRange?: string };

    if (!workspaceId) {
        throw createError('Workspace ID is required', 400);
    }

    if (!userId) {
        throw createError('User ID is required', 400);
    }

    const result = await statisticsService.getWorkspaceStatistics({
        workspaceId,
        userId,
        dateRange: (dateRange as any) || 'this-week'
    });

    if (result.success && result.statistics) {
        // Return only summary data
        res.json({
            success: true,
            message: 'Summary statistics retrieved successfully',
            data: {
                totalMessages: result.statistics.totalMessages,
                totalTokens: result.statistics.totalTokens,
                totalCost: result.statistics.totalCost,
                averageResponseTime: result.statistics.averageResponseTime
            }
        });
    } else {
        res.json(result);
    }
}));

export default router;
