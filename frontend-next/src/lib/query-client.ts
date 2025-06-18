import { QueryClient } from '@tanstack/react-query';

// Create a client with optimized defaults
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
            retry: (failureCount, error) => {
                // Don't retry on 4xx errors except 408, 429
                if (error instanceof Error && 'status' in error) {
                    const status = (error as Error & { status?: number }).status;
                    if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
                        return false;
                    }
                }
                return failureCount < 3;
            },
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
        },
        mutations: {
            retry: 1,
        },
    },
});

// Query key factory for consistent cache management
export const queryKeys = {
    // Database operations
    database: {
        testConnection: (config: Record<string, unknown>) => ['database', 'test-connection', config] as const,
    },

    // User operations
    users: {
        all: () => ['users'] as const,
        current: () => ['users', 'current'] as const,
    },

    // Workspace operations
    workspaces: {
        all: () => ['workspaces'] as const,
        byUser: (userId: string) => ['workspaces', 'user', userId] as const,
        detail: (workspaceId: string) => ['workspaces', 'detail', workspaceId] as const,
        active: (userId: string) => ['workspaces', 'active', userId] as const,
    },

    // Chat operations
    chats: {
        all: () => ['chats'] as const,
        byWorkspace: (userId: string, workspaceId: string) => ['chats', 'workspace', userId, workspaceId] as const,
        session: (sessionId: string) => ['chats', 'session', sessionId] as const,
        messages: (sessionId: string) => ['chats', 'messages', sessionId] as const,
    },

    // Personality operations
    personalities: {
        all: () => ['personalities'] as const,
        byUser: (userId: string) => ['personalities', 'user', userId] as const,
        detail: (personalityId: string) => ['personalities', 'detail', personalityId] as const,
    },

    // AI Provider operations
    aiProviders: {
        all: () => ['ai-providers'] as const,
        config: () => ['ai-providers', 'config'] as const,
    },

    // Workspace AI Favorites operations
    workspaceAIFavorites: {
        all: () => ['workspace-ai-favorites'] as const,
        byWorkspace: (workspaceId: string) => ['workspace-ai-favorites', 'workspace', workspaceId] as const,
        check: (workspaceId: string, aiProviderId: string) => ['workspace-ai-favorites', 'check', workspaceId, aiProviderId] as const,
    },

    // Workspace Personality Favorites operations
    workspacePersonalityFavorites: {
        all: () => ['workspace-personality-favorites'] as const,
        byWorkspace: (workspaceId: string) => ['workspace-personality-favorites', 'workspace', workspaceId] as const,
        check: (workspaceId: string, personalityId: string) => ['workspace-personality-favorites', 'check', workspaceId, personalityId] as const,
    },

    // Statistics operations
    statistics: {
        all: () => ['statistics'] as const,
        byWorkspace: (workspaceId: string, userId: string, dateRange: Record<string, unknown>) =>
            ['statistics', 'workspace', workspaceId, userId, dateRange] as const,
    },

    // Setup operations
    setup: {
        status: () => ['setup', 'status'] as const,
        install: () => ['setup', 'install'] as const,
    },
} as const;
