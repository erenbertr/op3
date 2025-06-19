"use client"

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/toast';
import { UserDialogs } from './user-dialogs';
import {
    Users,
    Plus,
    Edit,
    Trash2,
    Search,
    Settings,
    Shield,
    UserCheck,
    Eye,
    EyeOff
} from 'lucide-react';

interface User {
    id: string;
    email: string;
    username?: string;
    role: 'admin' | 'subscribed' | 'normal';
    isActive: boolean;
    firstName?: string;
    lastName?: string;
    createdAt: string;
    lastLoginAt?: string;
}

interface SystemSettings {
    registrationEnabled: boolean;
    loginEnabled: boolean;
    defaultUserRole: 'normal' | 'subscribed';
    maxUsersAllowed?: number;
}

interface UserManagementProps {
    currentUser: {
        id: string;
        email: string;
        role?: string;
    };
}

export function UserManagement({ currentUser }: UserManagementProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [page, setPage] = useState(1);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showSystemSettings, setShowSystemSettings] = useState(false);

    const queryClient = useQueryClient();
    const { addToast } = useToast();

    // Fetch users
    const { data: usersData, isLoading: usersLoading } = useQuery({
        queryKey: ['admin-users', page, searchTerm, roleFilter, statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20',
                search: searchTerm,
                ...(roleFilter !== 'all' && { role: roleFilter }),
                ...(statusFilter !== 'all' && { isActive: statusFilter === 'active' ? 'true' : 'false' })
            });

            const response = await fetch(`/api/v1/admin/users?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('op3_auth_token')}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }

            return response.json();
        },
    });

    // Fetch system settings
    const { data: systemSettings, isLoading: settingsLoading } = useQuery({
        queryKey: ['system-settings'],
        queryFn: async () => {
            const response = await fetch('/api/v1/admin/system-settings', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('op3_auth_token')}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch system settings');
            }

            const data = await response.json();
            return data.settings;
        },
    });

    // Fetch user stats
    const { data: userStats } = useQuery({
        queryKey: ['user-stats'],
        queryFn: async () => {
            const response = await fetch('/api/v1/admin/users/stats', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('op3_auth_token')}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user stats');
            }

            const data = await response.json();
            return data.stats;
        },
    });

    // Update system settings mutation
    const updateSystemSettingsMutation = useMutation({
        mutationFn: async (updates: Partial<SystemSettings>) => {
            const response = await fetch('/api/v1/admin/system-settings', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('op3_auth_token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
            });

            if (!response.ok) {
                throw new Error('Failed to update system settings');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['system-settings'] });
            addToast({
                title: "Settings Updated",
                description: "System settings have been updated successfully.",
            });
        },
        onError: (error) => {
            addToast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to update settings",
                variant: "destructive",
            });
        },
    });

    const handleSystemSettingChange = (key: keyof SystemSettings, value: any) => {
        updateSystemSettingsMutation.mutate({ [key]: value });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getRoleBadgeVariant = (role: string) => {
        switch (role) {
            case 'admin': return 'destructive';
            case 'subscribed': return 'default';
            case 'normal': return 'secondary';
            default: return 'outline';
        }
    };

    if (usersLoading || settingsLoading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-muted rounded w-1/3"></div>
                    <div className="h-32 bg-muted rounded"></div>
                    <div className="h-64 bg-muted rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-semibold">User Management</h3>
                    <p className="text-muted-foreground">
                        Manage users, roles, and system access settings
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setShowSystemSettings(!showSystemSettings)}
                    >
                        <Settings className="h-4 w-4 mr-2" />
                        System Settings
                    </Button>
                    <Button onClick={() => setShowCreateDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add User
                    </Button>
                </div>
            </div>

            {/* User Statistics */}
            {userStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{userStats.total}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{userStats.active}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{userStats.admins}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-500">{userStats.inactive}</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* System Settings Panel */}
            {showSystemSettings && systemSettings && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            System Access Settings
                        </CardTitle>
                        <CardDescription>
                            Control user registration and login access to your system
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="registration-enabled" className="flex items-center gap-2">
                                        <UserCheck className="h-4 w-4" />
                                        User Registration
                                    </Label>
                                    <Switch
                                        id="registration-enabled"
                                        checked={systemSettings.registrationEnabled}
                                        onCheckedChange={(checked) =>
                                            handleSystemSettingChange('registrationEnabled', checked)
                                        }
                                    />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {systemSettings.registrationEnabled
                                        ? "Users can register new accounts"
                                        : "Only admins can create new users"
                                    }
                                </p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="login-enabled" className="flex items-center gap-2">
                                        {systemSettings.loginEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                        User Login
                                    </Label>
                                    <Switch
                                        id="login-enabled"
                                        checked={systemSettings.loginEnabled}
                                        onCheckedChange={(checked) =>
                                            handleSystemSettingChange('loginEnabled', checked)
                                        }
                                    />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {systemSettings.loginEnabled
                                        ? "Users can log into the system"
                                        : "Login disabled (admins can still access)"
                                    }
                                </p>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            <Label>Default Role for New Users</Label>
                            <Select
                                value={systemSettings.defaultUserRole}
                                onValueChange={(value: 'normal' | 'subscribed') =>
                                    handleSystemSettingChange('defaultUserRole', value)
                                }
                            >
                                <SelectTrigger className="w-48">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="normal">Normal User</SelectItem>
                                    <SelectItem value="subscribed">Subscribed User</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground">
                                Role automatically assigned to new registered users
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Search and Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search users by email, username, or name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="Filter by role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Roles</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="subscribed">Subscribed</SelectItem>
                                <SelectItem value="normal">Normal</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Users ({usersData?.total || 0})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead>Last Login</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {usersData?.users?.map((user: User) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{user.email}</div>
                                                {(user.firstName || user.lastName) && (
                                                    <div className="text-sm text-muted-foreground">
                                                        {user.firstName} {user.lastName}
                                                    </div>
                                                )}
                                                {user.username && (
                                                    <div className="text-sm text-muted-foreground">
                                                        @{user.username}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getRoleBadgeVariant(user.role)}>
                                                {user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={user.isActive ? "default" : "secondary"}>
                                                {user.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatDate(user.createdAt)}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setShowEditDialog(true);
                                                    }}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                {user.id !== currentUser.id && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setShowDeleteDialog(true);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {usersData && usersData.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-muted-foreground">
                                Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, usersData.total)} of {usersData.total} users
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(page - 1)}
                                    disabled={page === 1}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(page + 1)}
                                    disabled={page >= usersData.totalPages}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* User Dialogs */}
            <UserDialogs
                showCreateDialog={showCreateDialog}
                setShowCreateDialog={setShowCreateDialog}
                showEditDialog={showEditDialog}
                setShowEditDialog={setShowEditDialog}
                showDeleteDialog={showDeleteDialog}
                setShowDeleteDialog={setShowDeleteDialog}
                selectedUser={selectedUser}
                currentUser={currentUser}
            />
        </div>
    );
}
