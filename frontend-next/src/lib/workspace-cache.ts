/**
 * Simple in-memory cache for workspace data to avoid unnecessary API calls
 * during navigation and provide smooth user experience
 */

interface Workspace {
    id: string;
    name: string;
    templateType: string;
    workspaceRules: string;
    isActive: boolean;
    createdAt: string;
}

interface CacheEntry {
    data: Workspace[];
    timestamp: number;
    userId: string;
}

class WorkspaceCache {
    private cache: Map<string, CacheEntry> = new Map();
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    private getCacheKey(userId: string): string {
        return `workspaces_${userId}`;
    }

    get(userId: string): Workspace[] | null {
        const key = this.getCacheKey(userId);
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check if cache is still valid
        const now = Date.now();
        if (now - entry.timestamp > this.CACHE_DURATION) {
            this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    set(userId: string, workspaces: Workspace[]): void {
        const key = this.getCacheKey(userId);
        this.cache.set(key, {
            data: workspaces,
            timestamp: Date.now(),
            userId
        });
    }

    invalidate(userId: string): void {
        const key = this.getCacheKey(userId);
        this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    // Update a specific workspace in cache
    updateWorkspace(userId: string, workspaceId: string, updates: Partial<Workspace>): void {
        const key = this.getCacheKey(userId);
        const entry = this.cache.get(key);

        if (entry) {
            const updatedWorkspaces = entry.data.map(w =>
                w.id === workspaceId ? { ...w, ...updates } : w
            );
            this.set(userId, updatedWorkspaces);
        }
    }

    // Get a specific workspace from cache
    getWorkspace(userId: string, workspaceId: string): Workspace | null {
        const workspaces = this.get(userId);
        if (!workspaces) {
            return null;
        }
        return workspaces.find(w => w.id === workspaceId) || null;
    }
}

export const workspaceCache = new WorkspaceCache();

// Import types from API to ensure consistency
import type { ChatSession, Personality, AIProviderConfig } from '@/lib/api';

interface ChatDataCacheEntry {
    chatSessions: ChatSession[];
    personalities: Personality[];
    aiProviders: AIProviderConfig[];
    timestamp: number;
}

class ChatDataCache {
    private cache: Map<string, ChatDataCacheEntry> = new Map();
    private readonly CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for chat data

    private getCacheKey(userId: string, workspaceId: string): string {
        return `chat_data_${userId}_${workspaceId}`;
    }

    get(userId: string, workspaceId: string): ChatDataCacheEntry | null {
        const key = this.getCacheKey(userId, workspaceId);
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check if cache is still valid
        const now = Date.now();
        if (now - entry.timestamp > this.CACHE_DURATION) {
            this.cache.delete(key);
            return null;
        }

        return entry;
    }

    set(userId: string, workspaceId: string, data: Omit<ChatDataCacheEntry, 'timestamp'>): void {
        const key = this.getCacheKey(userId, workspaceId);
        this.cache.set(key, {
            ...data,
            timestamp: Date.now()
        });
    }

    invalidate(userId: string, workspaceId: string): void {
        const key = this.getCacheKey(userId, workspaceId);
        this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    // Update chat sessions in cache
    updateChatSessions(userId: string, workspaceId: string, chatSessions: ChatSession[]): void {
        const key = this.getCacheKey(userId, workspaceId);
        const entry = this.cache.get(key);

        if (entry) {
            this.cache.set(key, {
                ...entry,
                chatSessions,
                timestamp: Date.now()
            });
        }
    }
}

export const chatDataCache = new ChatDataCache();
