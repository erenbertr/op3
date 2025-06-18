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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <BarChart3 className="h-6 w-6" />
                        Usage Statistics
                    </h1>
                    <p className="text-muted-foreground">
                        Monitor your AI provider usage and costs
                    </p>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Filters</CardTitle>
                    <CardDescription>
                        Select date range and workspace to view statistics
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Workspace Selector */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Workspace</label>
                            <Select value={selectedWorkspaceId} onValueChange={setSelectedWorkspaceId}>
                                <SelectTrigger>
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
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Date Range</label>
                            <Select value={selectedRange} onValueChange={(value: DateRange) => setSelectedRange(value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select date range" />
                                </SelectTrigger>
                                <SelectContent>
                                    {DATE_RANGE_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            <div>
                                                <div className="font-medium">{option.label}</div>
                                                <div className="text-xs text-muted-foreground">{option.description}</div>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Custom Date Range */}
                        {selectedRange === 'custom' && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Custom Dates</label>
                                <div className="flex gap-2">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "justify-start text-left font-normal",
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
                                                    "justify-start text-left font-normal",
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
                </CardContent>
            </Card>

            {/* Loading State */}
            {shouldShowSpinner && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="pb-2">
                                <Skeleton className="h-4 w-24" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-16 mb-2" />
                                <Skeleton className="h-3 w-32" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Error State */}
            {statsError && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center space-y-2">
                            <p className="text-destructive">Failed to load statistics</p>
                            <p className="text-sm text-muted-foreground">{statsError.message}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Statistics Content */}
            {!shouldShowSpinner && !statsError && stats && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(stats.totalMessages)}</div>
                                <p className="text-xs text-muted-foreground">
                                    AI conversations
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                                <Zap className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(stats.totalTokens)}</div>
                                <p className="text-xs text-muted-foreground">
                                    Input + output tokens
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(stats.totalCost)}</div>
                                <p className="text-xs text-muted-foreground">
                                    API usage costs
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.averageResponseTime}ms</div>
                                <p className="text-xs text-muted-foreground">
                                    Average latency
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Provider Usage */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bot className="h-5 w-5" />
                                Provider Usage
                            </CardTitle>
                            <CardDescription>
                                Usage breakdown by AI provider
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {providerStats.length > 0 ? (
                                <div className="space-y-4">
                                    {providerStats.map((provider) => (
                                        <div key={provider.provider} className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline">{provider.provider}</Badge>
                                                    <span className="text-sm font-medium">
                                                        {provider.messages} messages
                                                    </span>
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {provider.percentage.toFixed(1)}%
                                                </div>
                                            </div>
                                            <Progress value={provider.percentage} className="h-2" />
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>{formatNumber(provider.tokens)} tokens</span>
                                                <span>{formatCurrency(provider.cost)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    No provider usage data available for the selected period
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
                        <div className="text-center space-y-2">
                            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground" />
                            <p className="text-lg font-medium">No statistics available</p>
                            <p className="text-sm text-muted-foreground">
                                Start using AI providers to see usage statistics
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
