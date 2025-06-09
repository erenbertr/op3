"use client"

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { WorkspaceLayout } from '@/components/workspace/workspace-layout';
import { Button } from '@/components/ui/button';
import { Settings, Bot, Plus } from 'lucide-react';
import { navigationUtils } from '@/lib/hooks/use-pathname';

interface SettingsLayoutProps {
    children: React.ReactNode;
}

interface SettingsTabConfig {
    id: string;
    label: string;
    icon: React.ReactNode;
    description: string;
    path: string;
}

const SETTINGS_TABS: SettingsTabConfig[] = [
    {
        id: 'workspaces',
        label: 'Workspaces',
        icon: <Settings className="h-4 w-4" />,
        description: 'Manage your workspaces and settings',
        path: '/settings/workspaces'
    },
    {
        id: 'ai-providers',
        label: 'AI Providers',
        icon: <Bot className="h-4 w-4" />,
        description: 'Configure AI providers and models',
        path: '/settings/ai-providers'
    }
];

export default function SettingsLayout({ children }: SettingsLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();

    const activeTab = SETTINGS_TABS.find(tab => pathname === tab.path);

    const handleTabClick = (path: string) => {
        navigationUtils.pushState(path);
    };

    const handleAddProvider = () => {
        // Navigate to AI providers page and trigger add action
        navigationUtils.pushState('/settings/ai-providers?action=add');
    };

    return (
        <WorkspaceLayout>
            <div className="h-full flex">
                <div className="container mx-auto h-full flex">
                    {/* Vertical Tabs Sidebar */}
                    <div className="w-96 h-full overflow-y-auto">
                        <div className="py-6 space-y-2">
                            {SETTINGS_TABS.map((tab) => (
                                <Button
                                    key={tab.id}
                                    variant={pathname === tab.path ? "default" : "ghost"}
                                    className={`w-full justify-start h-auto p-3 ${pathname === tab.path
                                        ? "bg-primary text-primary-foreground"
                                        : "hover:bg-muted"
                                        }`}
                                    onClick={() => handleTabClick(tab.path)}
                                >
                                    <div className="flex items-center gap-3">
                                        {tab.icon}
                                        <div className="text-left">
                                            <div className="font-medium">{tab.label}</div>
                                            <div className="text-xs opacity-70">{tab.description}</div>
                                        </div>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="pl-8 pr-4 py-6">
                            {/* Tab Header */}
                            <div className="mb-6 flex items-start justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold">
                                        {activeTab?.label || 'Settings'}
                                    </h2>
                                    <p className="text-muted-foreground">
                                        {activeTab?.description || 'Manage your application settings'}
                                    </p>
                                </div>
                                {pathname === '/settings/ai-providers' && (
                                    <Button onClick={handleAddProvider} className="ml-4">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Provider
                                    </Button>
                                )}
                            </div>

                            {/* Tab Content */}
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </WorkspaceLayout>
    );
}
