"use client"

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useStatistics, useWorkspaces } from '@/lib/hooks/use-query-hooks';
import { useDelayedSpinner } from '@/lib/hooks/use-delayed-spinner';
import { format } from 'date-fns';
import { CalendarIcon, BarChart3, MessageSquare, Zap, DollarSign, Clock, TrendingUp, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatisticsViewProps {
    userId: string;
}

type DateRange = 'today' | 'yesterday' | 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'custom';

interface DateRangeOption {
    value: DateRange;
    label: string;
    description: string;
}

const DATE_RANGE_OPTIONS: DateRangeOption[] = [
    { value: 'today', label: 'Today', description: 'Current day' },
    { value: 'yesterday', label: 'Yesterday', description: 'Previous day' },
    { value: 'this-week', label: 'This Week', description: 'Current week' },
    { value: 'last-week', label: 'Last Week', description: 'Previous week' },
    { value: 'this-month', label: 'This Month', description: 'Current month' },
    { value: 'last-month', label: 'Last Month', description: 'Previous month' },
    { value: 'custom', label: 'Custom Range', description: 'Select custom dates' }
];

export function StatisticsView({ userId }: StatisticsViewProps) {
    const [selectedRange, setSelectedRange] = useState<DateRange>('this-week');
    const [customStartDate, setCustomStartDate] = useState<Date>();
    const [customEndDate, setCustomEndDate] = useState<Date>();
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('all');

    // Get workspaces for workspace selector
    const { data: workspacesResult } = useWorkspaces(userId, 'StatisticsView');
    const workspaces = workspacesResult?.success ? workspacesResult.workspaces : [];

    // Prepare date range for API call
    const dateRangeOptions = useMemo(() => {
        if (selectedRange === 'custom' && customStartDate && customEndDate) {
            return {
                range: selectedRange,
                startDate: format(customStartDate, 'yyyy-MM-dd'),
                endDate: format(customEndDate, 'yyyy-MM-dd')
            };
        }
        return { range: selectedRange };
    }, [selectedRange, customStartDate, customEndDate]);

    // Get statistics for the selected workspace (or all workspaces)
    const { data: statisticsData, isLoading: isLoadingStats, error: statsError } = useStatistics(
        selectedWorkspaceId === 'all' ? (workspaces[0]?.id || '') : selectedWorkspaceId,
        userId,
        dateRangeOptions
    );

    // Use delayed spinner for loading states
    const { showSpinner } = useDelayedSpinner(2000);
    const shouldShowSpinner = isLoadingStats && showSpinner;

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 4
        }).format(amount);
    };

    // Format large numbers
    const formatNumber = (num: number) => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    };

    // Get statistics data
    const stats = statisticsData?.statistics;

    // Calculate provider usage percentages
    const providerStats = useMemo(() => {
        if (!stats) return [];

        const totalMessages = stats.totalMessages || 1; // Avoid division by zero

        return Object.entries(stats.messagesByProvider || {}).map(([provider, messages]) => ({
            provider,
            messages,
            percentage: (messages / totalMessages) * 100,
            tokens: stats.tokensByProvider?.[provider] || 0,
            cost: stats.costByProvider?.[provider] || 0
        })).sort((a, b) => b.messages - a.messages);
    }, [stats]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <h1 className="text-2xl font-bold mb-6">Usage Statistics</h1>

            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
                {/* Workspace Selector */}
                <div className="flex-1 min-w-0">
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Workspace</label>
                    <Select value={selectedWorkspaceId} onValueChange={setSelectedWorkspaceId}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select workspace" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Workspaces</SelectItem>
                            {workspaces.map((workspace) => (
                                <SelectItem key={workspace.id} value={workspace.id}>
                                    {workspace.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Date Range Selector */}
                <div className="flex-1 min-w-0">
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Date Range</label>
                    <Select value={selectedRange} onValueChange={(value: DateRange) => setSelectedRange(value)}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select date range" />
                        </SelectTrigger>
                        <SelectContent>
                            {DATE_RANGE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Custom Date Range */}
                {selectedRange === 'custom' && (
                    <div className="flex-1 min-w-0">
                        <label className="text-sm font-medium text-muted-foreground mb-2 block">Custom Dates</label>
                        <div className="flex gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "flex-1 justify-start text-left font-normal",
                                            !customStartDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {customStartDate ? format(customStartDate, "MMM dd") : "Start"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={customStartDate}
                                        onSelect={setCustomStartDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "flex-1 justify-start text-left font-normal",
                                            !customEndDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {customEndDate ? format(customEndDate, "MMM dd") : "End"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={customEndDate}
                                        onSelect={setCustomEndDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                )}
            </div>

            {/* Loading State */}
            {shouldShowSpinner && (
                <div className="space-y-6">
                    {/* Loading Filters */}
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1">
                            <Skeleton className="h-4 w-20 mb-2" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="flex-1">
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    </div>

                    {/* Loading Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {[...Array(4)].map((_, i) => (
                            <Card key={i}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-9 w-9 rounded-lg" />
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <Skeleton className="h-8 w-20 mb-2" />
                                    <Skeleton className="h-4 w-32" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Loading Provider Usage */}
                    <Card>
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-lg" />
                                <Skeleton className="h-6 w-32" />
                            </div>
                            <Skeleton className="h-4 w-48 mt-2" />
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Skeleton className="h-3 w-3 rounded-full" />
                                                <Skeleton className="h-6 w-16" />
                                                <Skeleton className="h-4 w-24" />
                                            </div>
                                            <Skeleton className="h-5 w-12" />
                                        </div>
                                        <Skeleton className="h-3 w-full" />
                                        <div className="flex justify-between">
                                            <Skeleton className="h-4 w-20" />
                                            <Skeleton className="h-4 w-16" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Error State */}
            {statsError && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center space-y-4">
                            <div className="p-4 bg-muted rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                                <TrendingUp className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-lg font-medium text-destructive mb-2">Failed to load statistics</p>
                                <p className="text-sm text-muted-foreground">{statsError.message}</p>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => window.location.reload()}
                                className="mt-4"
                            >
                                Try Again
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Statistics Content */}
            {!shouldShowSpinner && !statsError && stats && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Total Messages</CardTitle>
                                <div className="p-2 bg-muted rounded-lg">
                                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="text-3xl font-bold text-foreground">{formatNumber(stats.totalMessages)}</div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    AI conversations
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Total Tokens</CardTitle>
                                <div className="p-2 bg-muted rounded-lg">
                                    <Zap className="h-5 w-5 text-muted-foreground" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="text-3xl font-bold text-foreground">{formatNumber(stats.totalTokens)}</div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Input + output tokens
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Total Cost</CardTitle>
                                <div className="p-2 bg-muted rounded-lg">
                                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="text-3xl font-bold text-foreground">{formatCurrency(stats.totalCost)}</div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    API usage costs
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Response Time</CardTitle>
                                <div className="p-2 bg-muted rounded-lg">
                                    <Clock className="h-5 w-5 text-muted-foreground" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="text-3xl font-bold text-foreground">{stats.averageResponseTime}ms</div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Average latency
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Provider Usage */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-3 text-xl">
                                <div className="p-2 bg-muted rounded-lg">
                                    <Bot className="h-6 w-6 text-muted-foreground" />
                                </div>
                                Provider Usage
                            </CardTitle>
                            <CardDescription className="text-base">
                                Usage breakdown by AI provider
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {providerStats.length > 0 ? (
                                <div className="space-y-6">
                                    {providerStats.map((provider, index) => (
                                        <div key={provider.provider} className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-3 h-3 rounded-full",
                                                        index === 0 && "bg-blue-500",
                                                        index === 1 && "bg-green-500",
                                                        index === 2 && "bg-yellow-500",
                                                        index === 3 && "bg-purple-500",
                                                        index >= 4 && "bg-gray-500"
                                                    )} />
                                                    <Badge variant="secondary" className="font-medium">
                                                        {provider.provider}
                                                    </Badge>
                                                    <span className="text-sm font-medium text-foreground">
                                                        {formatNumber(provider.messages)} messages
                                                    </span>
                                                </div>
                                                <div className="text-lg font-semibold text-foreground">
                                                    {provider.percentage.toFixed(1)}%
                                                </div>
                                            </div>
                                            <Progress
                                                value={provider.percentage}
                                                className="h-3 bg-muted"
                                            />
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">
                                                    <Zap className="inline h-3 w-3 mr-1" />
                                                    {formatNumber(provider.tokens)} tokens
                                                </span>
                                                <span className="font-medium text-foreground">
                                                    {formatCurrency(provider.cost)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="p-4 bg-muted/50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                        <Bot className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <p className="text-lg font-medium text-muted-foreground mb-2">No provider usage data</p>
                                    <p className="text-sm text-muted-foreground">
                                        No data available for the selected period
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}

            {/* No Data State */}
            {!shouldShowSpinner && !statsError && !stats && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center space-y-6 py-12">
                            <div className="p-6 bg-muted/50 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
                                <BarChart3 className="h-12 w-12 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-xl font-semibold text-foreground mb-2">No statistics available</p>
                                <p className="text-muted-foreground max-w-md mx-auto">
                                    Start using AI providers in your chats to see detailed usage statistics and analytics
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Button variant="default" onClick={() => window.location.href = '/ws'}>
                                    Start Chatting
                                </Button>
                                <Button variant="outline" onClick={() => window.location.href = '/ai-providers'}>
                                    Configure Providers
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
