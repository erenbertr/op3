import { UniversalDatabaseService } from './universalDatabaseService';
import { ApiMetadata } from '../types/chat';

export interface WorkspaceStatistics {
    totalMessages: number;
    totalTokens: number;
    totalCost: number;
    averageResponseTime: number;
    messagesByProvider: { [key: string]: number };
    tokensByProvider: { [key: string]: number };
    costByProvider: { [key: string]: number };
    dailyUsage: { date: string; messages: number; tokens: number; cost: number }[];
}

export interface StatisticsFilters {
    workspaceId: string;
    userId: string;
    startDate?: Date;
    endDate?: Date;
    dateRange?: 'today' | 'yesterday' | 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'custom';
}

export class StatisticsServiceNew {
    private static instance: StatisticsServiceNew;
    private universalDb: UniversalDatabaseService;

    private constructor() {
        this.universalDb = UniversalDatabaseService.getInstance();
    }

    public static getInstance(): StatisticsServiceNew {
        if (!StatisticsServiceNew.instance) {
            StatisticsServiceNew.instance = new StatisticsServiceNew();
        }
        return StatisticsServiceNew.instance;
    }

    /**
     * Get workspace statistics for a given time period
     */
    public async getWorkspaceStatistics(filters: StatisticsFilters): Promise<{ success: boolean; message: string; statistics?: WorkspaceStatistics }> {
        try {
            const { startDate, endDate } = this.getDateRange(filters);

            // First, get all chat sessions for the workspace and user
            const sessions = await this.universalDb.findMany<any>('chat_sessions', {
                where: [
                    { field: 'workspaceId', operator: 'eq', value: filters.workspaceId },
                    { field: 'userId', operator: 'eq', value: filters.userId }
                ],
                select: ['id']
            });

            if (!sessions.success || sessions.data.length === 0) {
                return {
                    success: true,
                    message: 'No sessions found for this workspace',
                    statistics: this.getEmptyStatistics()
                };
            }

            const sessionIds = sessions.data.map((session: any) => session.id);

            // Get AI messages with metadata for the date range
            const messages = await this.universalDb.findMany<any>('chat_messages', {
                where: [
                    { field: 'sessionId', operator: 'in', value: sessionIds },
                    { field: 'role', operator: 'eq', value: 'assistant' },
                    { field: 'createdAt', operator: 'gte', value: startDate },
                    { field: 'createdAt', operator: 'lte', value: endDate }
                ],
                orderBy: [{ field: 'createdAt', direction: 'asc' }]
            });

            if (!messages.success) {
                throw new Error('Failed to fetch messages for statistics');
            }

            const statistics = this.processStatisticsData(messages.data);
            return {
                success: true,
                message: 'Statistics retrieved successfully',
                statistics
            };
        } catch (error) {
            console.error('Error getting workspace statistics:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Get date range based on filter
     */
    private getDateRange(filters: StatisticsFilters): { startDate: Date; endDate: Date } {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (filters.startDate && filters.endDate) {
            return { startDate: filters.startDate, endDate: filters.endDate };
        }

        switch (filters.dateRange) {
            case 'today':
                return {
                    startDate: today,
                    endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                };
            case 'yesterday':
                const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
                return {
                    startDate: yesterday,
                    endDate: today
                };
            case 'this-week':
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                return {
                    startDate: startOfWeek,
                    endDate: new Date(now.getTime() + 24 * 60 * 60 * 1000)
                };
            case 'last-week':
                const lastWeekStart = new Date(today);
                lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
                const lastWeekEnd = new Date(lastWeekStart);
                lastWeekEnd.setDate(lastWeekStart.getDate() + 7);
                return {
                    startDate: lastWeekStart,
                    endDate: lastWeekEnd
                };
            case 'this-month':
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                return {
                    startDate: startOfMonth,
                    endDate: new Date(now.getTime() + 24 * 60 * 60 * 1000)
                };
            case 'last-month':
                const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 1);
                return {
                    startDate: lastMonthStart,
                    endDate: lastMonthEnd
                };
            default:
                // Default to this week
                const defaultStart = new Date(today);
                defaultStart.setDate(today.getDate() - today.getDay());
                return {
                    startDate: defaultStart,
                    endDate: new Date(now.getTime() + 24 * 60 * 60 * 1000)
                };
        }
    }

    /**
     * Get empty statistics object
     */
    private getEmptyStatistics(): WorkspaceStatistics {
        return {
            totalMessages: 0,
            totalTokens: 0,
            totalCost: 0,
            averageResponseTime: 0,
            messagesByProvider: {},
            tokensByProvider: {},
            costByProvider: {},
            dailyUsage: []
        };
    }

    /**
     * Process raw message data into statistics
     */
    private processStatisticsData(messages: any[]): WorkspaceStatistics {
        const statistics: WorkspaceStatistics = {
            totalMessages: messages.length,
            totalTokens: 0,
            totalCost: 0,
            averageResponseTime: 0,
            messagesByProvider: {},
            tokensByProvider: {},
            costByProvider: {},
            dailyUsage: []
        };

        let totalResponseTime = 0;
        let responseTimeCount = 0;
        const dailyUsageMap = new Map<string, { messages: number; tokens: number; cost: number }>();

        for (const message of messages) {
            let metadata: ApiMetadata | null = null;

            // Parse metadata if it exists
            if (message.apiMetadata) {
                try {
                    metadata = typeof message.apiMetadata === 'string'
                        ? JSON.parse(message.apiMetadata)
                        : message.apiMetadata;
                } catch (error) {
                    console.warn('Failed to parse API metadata:', error);
                }
            }

            // Process tokens
            if (metadata?.totalTokens) {
                statistics.totalTokens += metadata.totalTokens;

                const provider = metadata.provider || 'Unknown';
                statistics.tokensByProvider[provider] = (statistics.tokensByProvider[provider] || 0) + metadata.totalTokens;
            }

            // Process cost
            if (metadata?.cost) {
                statistics.totalCost += metadata.cost;

                const provider = metadata.provider || 'Unknown';
                statistics.costByProvider[provider] = (statistics.costByProvider[provider] || 0) + metadata.cost;
            }

            // Process response time
            if (metadata?.responseTimeMs) {
                totalResponseTime += metadata.responseTimeMs;
                responseTimeCount++;
            }

            // Process provider counts
            const provider = metadata?.provider || 'Unknown';
            statistics.messagesByProvider[provider] = (statistics.messagesByProvider[provider] || 0) + 1;

            // Process daily usage
            const messageDate = new Date(message.createdAt);
            const dateKey = messageDate.toISOString().split('T')[0];

            if (!dailyUsageMap.has(dateKey)) {
                dailyUsageMap.set(dateKey, { messages: 0, tokens: 0, cost: 0 });
            }

            const dayData = dailyUsageMap.get(dateKey)!;
            dayData.messages++;
            dayData.tokens += metadata?.totalTokens || 0;
            dayData.cost += metadata?.cost || 0;
        }

        // Calculate average response time
        if (responseTimeCount > 0) {
            statistics.averageResponseTime = Math.round(totalResponseTime / responseTimeCount);
        }

        // Convert daily usage map to array
        statistics.dailyUsage = Array.from(dailyUsageMap.entries())
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return statistics;
    }
}
