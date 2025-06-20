"use client"

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface TitleConfig {
    title: string;
    description?: string;
}

// Define title mappings for different routes
const getTitleConfig = (pathname: string, workspaceId?: string, chatId?: string, appState?: 'setup' | 'login' | 'workspace'): TitleConfig => {
    // Root path - depends on app state
    if (pathname === '/') {
        if (appState === 'setup') {
            return { title: 'Setup', description: 'Application Setup Wizard' };
        } else if (appState === 'login') {
            return { title: 'Sign In', description: 'Sign in to your account' };
        }
        // Default fallback for root
        return { title: 'OP3', description: 'AI-Powered Workspace Platform' };
    }

    // Shared content pages
    if (pathname.startsWith('/share/')) {
        return { title: 'Shared Chat', description: 'Shared conversation' };
    }
    if (pathname.startsWith('/msg/')) {
        return { title: 'Shared Message', description: 'Shared message' };
    }

    // Admin pages
    if (pathname.startsWith('/admin')) {
        return { title: 'Admin', description: 'Administration panel' };
    }

    // Account settings
    if (pathname.startsWith('/account')) {
        return { title: 'Account Settings', description: 'Manage your account' };
    }

    // AI Provider settings
    if (pathname.startsWith('/ai-providers')) {
        const provider = pathname.split('/')[2];
        if (provider) {
            const providerNames: Record<string, string> = {
                'openai': 'OpenAI',
                'claude': 'Claude',
                'google': 'Google',
                'grok': 'Grok'
            };
            return {
                title: `${providerNames[provider] || provider} Settings`,
                description: `Configure ${providerNames[provider] || provider} AI provider`
            };
        }
        return { title: 'AI Providers', description: 'Manage AI providers' };
    }

    // Statistics
    if (pathname.startsWith('/statistics')) {
        return { title: 'Statistics', description: 'Usage statistics and analytics' };
    }

    // Personalities
    if (pathname.startsWith('/personalities')) {
        return { title: 'AI Personalities', description: 'Manage AI personalities' };
    }

    // Workspace creation
    if (pathname.startsWith('/add/workspace')) {
        return { title: 'Create Workspace', description: 'Create a new workspace' };
    }

    // Workspace selection
    if (pathname === '/workspaces') {
        return { title: 'Workspaces', description: 'Select or manage workspaces' };
    }

    // Workspace-specific pages
    if (pathname.startsWith('/ws/') && workspaceId) {
        // Chat page
        if (pathname.includes('/chat/') && chatId) {
            return { title: 'Chat', description: `Chat session in workspace` };
        }
        // Workspace main page
        return { title: 'Workspace', description: 'Workspace dashboard' };
    }

    // Add chat creation page
    if (pathname.startsWith('/add/chat/')) {
        return { title: 'New Chat', description: 'Create a new chat session' };
    }

    // Default fallback
    return { title: 'OP3', description: 'AI-Powered Workspace Platform' };
};

export function useDynamicTitle(workspaceId?: string, chatId?: string, appState?: 'setup' | 'login' | 'workspace') {
    const pathname = usePathname();

    useEffect(() => {
        const config = getTitleConfig(pathname, workspaceId, chatId, appState);

        // Update document title
        const newTitle = config.title === 'OP3' ? 'OP3' : `${config.title} | OP3`;

        // Only update if the title has actually changed to avoid unnecessary updates
        if (document.title !== newTitle) {
            document.title = newTitle;
        }

        // Update meta description if available
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription && config.description) {
            const currentDescription = metaDescription.getAttribute('content');
            if (currentDescription !== config.description) {
                metaDescription.setAttribute('content', config.description);
            }
        }
    }, [pathname, workspaceId, chatId, appState]);
}
