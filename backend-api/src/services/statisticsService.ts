import { DatabaseManager } from '../config/database';
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

export class StatisticsService {
    private static instance: StatisticsService;
    private dbManager: DatabaseManager;

    private constructor() {
        this.dbManager = DatabaseManager.getInstance();
    }

    public static getInstance(): StatisticsService {
        if (!StatisticsService.instance) {
            StatisticsService.instance = new StatisticsService();
        }
        return StatisticsService.instance;
    }

    /**
     * Get workspace statistics for a given time period
     */
    public async getWorkspaceStatistics(filters: StatisticsFilters): Promise<{ success: boolean; message: string; statistics?: WorkspaceStatistics }> {
        try {
            const { startDate, endDate } = this.getDateRange(filters);

            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();

            switch (config.type) {
                case 'localdb':
                    return await this.getStatisticsSQLite(connection, filters, startDate, endDate);
                case 'mongodb':
                    return await this.getStatisticsMongo(connection, filters, startDate, endDate);
                case 'mysql':
                case 'postgresql':
                    return await this.getStatisticsSQL(connection, filters, startDate, endDate);
                case 'supabase':
                    return await this.getStatisticsSupabase(connection, filters, startDate, endDate);
                default:
                    throw new Error(`Database type ${config.type} not supported for statistics yet`);
            }
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
     * SQLite implementation
     */
    private async getStatisticsSQLite(db: any, filters: StatisticsFilters, startDate: Date, endDate: Date): Promise<{ success: boolean; message: string; statistics?: WorkspaceStatistics }> {
        return new Promise((resolve) => {
            // Get all AI messages with metadata for the workspace and date range
            const query = `
                SELECT cm.*, cs.workspaceId, cs.userId
                FROM chat_messages cm
                JOIN chat_sessions cs ON cm.sessionId = cs.id
                WHERE cs.workspaceId = ? 
                AND cs.userId = ?
                AND cm.role = 'assistant'
                AND cm.createdAt >= ? 
                AND cm.createdAt <= ?
                ORDER BY cm.createdAt ASC
            `;

            db.all(query, [
                filters.workspaceId,
                filters.userId,
                startDate.toISOString(),
                endDate.toISOString()
            ], (err: any, rows: any[]) => {
                if (err) {
                    console.error('SQLite statistics query error:', err);
                    resolve({
                        success: false,
                        message: 'Failed to fetch statistics'
                    });
                    return;
                }

                const statistics = this.processStatisticsData(rows);
                resolve({
                    success: true,
                    message: 'Statistics retrieved successfully',
                    statistics
                });
            });
        });
    }

    /**
     * MongoDB implementation
     */
    private async getStatisticsMongo(db: any, filters: StatisticsFilters, startDate: Date, endDate: Date): Promise<{ success: boolean; message: string; statistics?: WorkspaceStatistics }> {
        try {
            const messagesCollection = db.collection('chat_messages');
            const sessionsCollection = db.collection('chat_sessions');

            // Get all sessions for the workspace
            const sessions = await sessionsCollection.find({
                workspaceId: filters.workspaceId,
                userId: filters.userId
            }).toArray();

            const sessionIds = sessions.map((s: any) => s._id);

            // Get AI messages with metadata
            const messages = await messagesCollection.find({
                sessionId: { $in: sessionIds },
                role: 'assistant',
                createdAt: {
                    $gte: startDate,
                    $lte: endDate
                }
            }).sort({ createdAt: 1 }).toArray();

            const statistics = this.processStatisticsData(messages);
            return {
                success: true,
                message: 'Statistics retrieved successfully',
                statistics
            };
        } catch (error) {
            console.error('MongoDB statistics error:', error);
            return {
                success: false,
                message: 'Failed to fetch statistics'
            };
        }
    }

    /**
     * SQL implementation (MySQL/PostgreSQL)
     */
    private async getStatisticsSQL(connection: any, filters: StatisticsFilters, startDate: Date, endDate: Date): Promise<{ success: boolean; message: string; statistics?: WorkspaceStatistics }> {
        try {
            const [rows] = await connection.execute(`
                SELECT cm.*, cs.workspaceId, cs.userId
                FROM chat_messages cm
                JOIN chat_sessions cs ON cm.sessionId = cs.id
                WHERE cs.workspaceId = ? 
                AND cs.userId = ?
                AND cm.role = 'assistant'
                AND cm.createdAt >= ? 
                AND cm.createdAt <= ?
                ORDER BY cm.createdAt ASC
            `, [
                filters.workspaceId,
                filters.userId,
                startDate,
                endDate
            ]);

            const statistics = this.processStatisticsData(rows);
            return {
                success: true,
                message: 'Statistics retrieved successfully',
                statistics
            };
        } catch (error) {
            console.error('SQL statistics error:', error);
            return {
                success: false,
                message: 'Failed to fetch statistics'
            };
        }
    }

    /**
     * Supabase implementation
     */
    private async getStatisticsSupabase(supabase: any, filters: StatisticsFilters, startDate: Date, endDate: Date): Promise<{ success: boolean; message: string; statistics?: WorkspaceStatistics }> {
        try {
            // First get sessions for the workspace
            const { data: sessions, error: sessionsError } = await supabase
                .from('chat_sessions')
                .select('id')
                .eq('workspaceId', filters.workspaceId)
                .eq('userId', filters.userId);

            if (sessionsError) throw sessionsError;

            const sessionIds = sessions.map((s: any) => s.id);

            // Get AI messages with metadata
            const { data: messages, error: messagesError } = await supabase
                .from('chat_messages')
                .select('*')
                .in('sessionId', sessionIds)
                .eq('role', 'assistant')
                .gte('createdAt', startDate.toISOString())
                .lte('createdAt', endDate.toISOString())
                .order('createdAt', { ascending: true });

            if (messagesError) throw messagesError;

            const statistics = this.processStatisticsData(messages);
            return {
                success: true,
                message: 'Statistics retrieved successfully',
                statistics
            };
        } catch (error) {
            console.error('Supabase statistics error:', error);
            return {
                success: false,
                message: 'Failed to fetch statistics'
            };
        }
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
