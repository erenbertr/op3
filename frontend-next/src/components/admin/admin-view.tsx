"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Users, Settings, Database, Shield, BarChart3 } from 'lucide-react';
import { navigationUtils } from '@/lib/hooks/use-pathname';

interface AdminViewProps {
    currentUser: {
        id: string;
        email: string;
        role?: string;
    };
}

interface AdminMenuItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    description: string;
    path: string;
}

const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
    {
        id: 'users',
        label: 'User Management',
        icon: <Users className="h-4 w-4" />,
        description: 'Manage users, roles, and permissions',
        path: '/admin/users'
    },
    {
        id: 'system',
        label: 'System Settings',
        icon: <Settings className="h-4 w-4" />,
        description: 'Configure system-wide settings',
        path: '/admin/system'
    },
    {
        id: 'database',
        label: 'Database Management',
        icon: <Database className="h-4 w-4" />,
        description: 'Monitor and manage database operations',
        path: '/admin/database'
    },
    {
        id: 'security',
        label: 'Security & Audit',
        icon: <Shield className="h-4 w-4" />,
        description: 'Security settings and audit logs',
        path: '/admin/security'
    },
    {
        id: 'analytics',
        label: 'Analytics & Reports',
        icon: <BarChart3 className="h-4 w-4" />,
        description: 'System analytics and usage reports',
        path: '/admin/analytics'
    }
];

export function AdminView({ currentUser }: AdminViewProps) {
    const [currentView, setCurrentView] = useState('overview');

    // Check if user has admin privileges
    if (currentUser.role !== 'admin') {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4 max-w-md">
                    <Shield className="h-16 w-16 mx-auto text-muted-foreground" />
                    <h2 className="text-2xl font-bold">Access Denied</h2>
                    <p className="text-muted-foreground">
                        You don't have permission to access the admin panel.
                    </p>
                    <Button
                        onClick={() => navigationUtils.pushState('/workspaces')}
                        variant="outline"
                    >
                        Back to Workspaces
                    </Button>
                </div>
            </div>
        );
    }

    const handleMenuClick = (path: string, viewId: string) => {
        setCurrentView(viewId);
        // For now, we'll just update the local state
        // In the future, we can implement actual routing for admin sub-pages
    };

    const renderMainContent = () => {
        switch (currentView) {
            case 'users':
                return (
                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold">User Management</h3>
                        <p className="text-muted-foreground">
                            User management functionality will be implemented here.
                        </p>
                    </div>
                );
            case 'system':
                return (
                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold">System Settings</h3>
                        <p className="text-muted-foreground">
                            System configuration options will be implemented here.
                        </p>
                    </div>
                );
            case 'database':
                return (
                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold">Database Management</h3>
                        <p className="text-muted-foreground">
                            Database monitoring and management tools will be implemented here.
                        </p>
                    </div>
                );
            case 'security':
                return (
                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold">Security & Audit</h3>
                        <p className="text-muted-foreground">
                            Security settings and audit logs will be implemented here.
                        </p>
                    </div>
                );
            case 'analytics':
                return (
                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold">Analytics & Reports</h3>
                        <p className="text-muted-foreground">
                            System analytics and usage reports will be implemented here.
                        </p>
                    </div>
                );
            default:
                return (
                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold">Admin Dashboard</h3>
                        <p className="text-muted-foreground">
                            Welcome to the admin panel. Select an option from the sidebar to get started.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                            {ADMIN_MENU_ITEMS.map((item) => (
                                <div
                                    key={item.id}
                                    className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                                    onClick={() => handleMenuClick(item.path, item.id)}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        {item.icon}
                                        <h4 className="font-medium">{item.label}</h4>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{item.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="h-full">
            <div className="container mx-auto px-4 h-full flex">
                {/* Left Sidebar - 280px width to match existing patterns */}
                <div className="w-[280px] h-full overflow-y-auto border-r">
                    <div className="py-6 space-y-2">
                        <div className="px-3 mb-4">
                            <h2 className="text-lg font-semibold">Admin Panel</h2>
                            <p className="text-sm text-muted-foreground">System administration</p>
                        </div>
                        
                        {/* Overview/Dashboard option */}
                        <Button
                            variant={currentView === 'overview' ? "default" : "ghost"}
                            className={`w-full justify-start h-auto p-3 select-none ${
                                currentView === 'overview'
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-muted"
                            }`}
                            onClick={() => setCurrentView('overview')}
                        >
                            <div className="flex items-center gap-3">
                                <BarChart3 className="h-4 w-4" />
                                <div className="text-left">
                                    <div className="font-medium">Overview</div>
                                    <div className="text-xs opacity-70">Admin dashboard</div>
                                </div>
                            </div>
                        </Button>

                        {/* Admin menu items */}
                        {ADMIN_MENU_ITEMS.map((item) => (
                            <Button
                                key={item.id}
                                variant={currentView === item.id ? "default" : "ghost"}
                                className={`w-full justify-start h-auto p-3 select-none ${
                                    currentView === item.id
                                        ? "bg-primary text-primary-foreground"
                                        : "hover:bg-muted"
                                }`}
                                onClick={() => handleMenuClick(item.path, item.id)}
                            >
                                <div className="flex items-center gap-3">
                                    {item.icon}
                                    <div className="text-left">
                                        <div className="font-medium">{item.label}</div>
                                        <div className="text-xs opacity-70">{item.description}</div>
                                    </div>
                                </div>
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto">
                    <div className="pl-8 pr-4 py-6">
                        {renderMainContent()}
                    </div>
                </div>
            </div>
        </div>
    );
}
