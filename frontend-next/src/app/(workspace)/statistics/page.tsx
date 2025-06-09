"use client"

import React, { useState } from 'react';
import { WorkspaceLayout } from '@/components/workspace/workspace-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, BarChart3, Clock, DollarSign, Zap } from 'lucide-react';
import { authService } from '@/lib/auth';
import { useStatistics } from '@/lib/hooks/use-query-hooks';



type DateRange = 'today' | 'yesterday' | 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'custom';

export default function StatisticsPage() {
    const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);
    const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<DateRange>('this-week');

    // Use TanStack Query for statistics
    const {
        data: statisticsData,
        isLoading,
        error: statisticsError
    } = useStatistics(
        currentWorkspaceId || '',
        currentUser?.id || '',
        { range: dateRange }
    );

    // Extract statistics from query data
    const statistics = statisticsData?.success ? statisticsData.statistics : null;

    // Initialize user and workspace data
    React.useLayoutEffect(() => {
        const user = authService.getCurrentUser();
        if (user) {
            setCurrentUser(user);
            // Get current workspace from URL or localStorage
            const pathParts = window.location.pathname.split('/');
            const workspaceId = pathParts.find(part => part.startsWith('ws-')) ||
                pathParts.find(part => part.length > 30 && part.includes('-')) || // UUID pattern
                localStorage.getItem('currentWorkspaceId');

            console.log('Detected workspace ID:', workspaceId, 'from path:', window.location.pathname);
            setCurrentWorkspaceId(workspaceId);
        }
    }, []);

    // Handle statistics errors (using useMemo for side effect)
    React.useMemo(() => {
        if (statisticsError) {
            console.error('Failed to load statistics:', statisticsError);
        }
    }, [statisticsError]);

    const formatNumber = (num: number) => {
        return num.toLocaleString();
    };

    const formatCurrency = (amount: number) => {
        return `$${amount.toFixed(2)}`;
    };

    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };

    const getDateRangeLabel = (range: DateRange) => {
        switch (range) {
            case 'today': return 'Today';
            case 'yesterday': return 'Yesterday';
            case 'this-week': return 'This Week';
            case 'last-week': return 'Last Week';
            case 'this-month': return 'This Month';
            case 'last-month': return 'Last Month';
            case 'custom': return 'Custom Range';
            default: return 'This Week';
        }
    };

    if (!currentUser) {
        return null;
    }

    return (
        <WorkspaceLayout currentWorkspaceId={currentWorkspaceId}>
            <div className="h-full flex">
                <div className="container mx-auto px-4 h-full">
                    <div className="py-6 space-y-6">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold">Usage Statistics</h1>
                                <p className="text-muted-foreground">
                                    AI usage analytics for your workspace
                                </p>
                            </div>

                            {/* Date Range Selector */}
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <Select value={dateRange} onValueChange={(value: DateRange) => setDateRange(value)}>
                                    <SelectTrigger className="w-40">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="today">Today</SelectItem>
                                        <SelectItem value="yesterday">Yesterday</SelectItem>
                                        <SelectItem value="this-week">This Week</SelectItem>
                                        <SelectItem value="last-week">Last Week</SelectItem>
                                        <SelectItem value="this-month">This Month</SelectItem>
                                        <SelectItem value="last-month">Last Month</SelectItem>
                                        <SelectItem value="custom">Custom Range</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Loading State */}
                        {isLoading && !statistics && (
                            <div className="h-96 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted-foreground/20 border-t-muted-foreground/40 opacity-50"></div>
                            </div>
                        )}

                        {/* Statistics Content */}
                        {statistics && (
                            <div className="space-y-6">
                                {/* No Data Message */}
                                {statistics.totalMessages === 0 && (
                                    <Card>
                                        <CardContent className="py-8">
                                            <div className="text-center">
                                                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                                <h3 className="text-lg font-semibold mb-2">No Usage Data Yet</h3>
                                                <p className="text-muted-foreground mb-4">
                                                    Start chatting with AI assistants to see your usage statistics here.
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    Statistics will show token usage, costs, response times, and more once you begin using AI features.
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Statistics Cards - only show if there's data */}
                                {statistics.totalMessages > 0 && (
                                    <>
                                        {/* Overview Cards */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <Card>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                                                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold">{formatNumber(statistics.totalMessages)}</div>
                                                    <p className="text-xs text-muted-foreground">
                                                        {getDateRangeLabel(dateRange)}
                                                    </p>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                                                    <Zap className="h-4 w-4 text-muted-foreground" />
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold">{formatNumber(statistics.totalTokens)}</div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Input + Output tokens
                                                    </p>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold">{formatCurrency(statistics.totalCost)}</div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Estimated API costs
                                                    </p>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold">{formatDuration(statistics.averageResponseTime)}</div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Average API response time
                                                    </p>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        {/* Provider Breakdown */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>Messages by Provider</CardTitle>
                                                    <CardDescription>
                                                        Distribution of messages across AI providers
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="space-y-3">
                                                        {Object.entries(statistics.messagesByProvider).map(([provider, count]) => (
                                                            <div key={provider} className="flex items-center justify-between">
                                                                <span className="text-sm font-medium">{provider}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                                                        <div
                                                                            className="h-full bg-primary rounded-full"
                                                                            style={{
                                                                                width: `${(count / statistics.totalMessages) * 100}%`
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-sm text-muted-foreground w-8 text-right">
                                                                        {count}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>Tokens by Provider</CardTitle>
                                                    <CardDescription>
                                                        Token usage distribution across providers
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="space-y-3">
                                                        {Object.entries(statistics.tokensByProvider).map(([provider, tokens]) => (
                                                            <div key={provider} className="flex items-center justify-between">
                                                                <span className="text-sm font-medium">{provider}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                                                        <div
                                                                            className="h-full bg-primary rounded-full"
                                                                            style={{
                                                                                width: `${(tokens / statistics.totalTokens) * 100}%`
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-sm text-muted-foreground w-12 text-right">
                                                                        {formatNumber(tokens)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        {/* Daily Usage Chart */}
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Daily Usage Trend</CardTitle>
                                                <CardDescription>
                                                    Messages and token usage over time
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="h-64 flex items-end justify-between gap-2 p-4">
                                                    {statistics.dailyUsage.map((day) => (
                                                        <div key={day.date} className="flex flex-col items-center gap-2 flex-1">
                                                            <div className="flex flex-col items-center gap-1 w-full">
                                                                <div
                                                                    className="bg-primary/20 rounded-t w-full min-h-[4px]"
                                                                    style={{
                                                                        height: `${(day.messages / Math.max(...statistics.dailyUsage.map(d => d.messages))) * 100}px`
                                                                    }}
                                                                    title={`${day.messages} messages`}
                                                                />
                                                                <div
                                                                    className="bg-primary rounded-t w-full min-h-[4px]"
                                                                    style={{
                                                                        height: `${(day.tokens / Math.max(...statistics.dailyUsage.map(d => d.tokens))) * 80}px`
                                                                    }}
                                                                    title={`${formatNumber(day.tokens)} tokens`}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-muted-foreground">
                                                                {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex justify-center gap-4 mt-4 text-xs text-muted-foreground">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 bg-primary rounded"></div>
                                                        <span>Tokens</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 bg-primary/20 rounded"></div>
                                                        <span>Messages</span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </WorkspaceLayout>
    );
}
