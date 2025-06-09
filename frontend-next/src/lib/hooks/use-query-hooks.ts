import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, DatabaseConfig } from '@/lib/api';
import { queryKeys } from '@/lib/query-client';

// Database hooks
export function useDatabaseConnectionTest() {
    return useMutation({
        mutationFn: (config: DatabaseConfig) => apiClient.testDatabaseConnection(config),
        onSuccess: (data) => {
            console.log('Database connection test successful:', data);
        },
        onError: (error) => {
            console.error('Database connection test failed:', error);
        },
    });
}

// Workspace hooks
export function useWorkspaces(userId: string) {
    return useQuery({
        queryKey: queryKeys.workspaces.byUser(userId),
        queryFn: () => apiClient.getUserWorkspaces(userId),
        enabled: !!userId,
    });
}

export function useWorkspace(workspaceId: string) {
    return useQuery({
        queryKey: queryKeys.workspaces.detail(workspaceId),
        queryFn: () => apiClient.getWorkspace(workspaceId),
        enabled: !!workspaceId,
    });
}

export function useCreateWorkspace() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { name: string; templateType: string; workspaceRules: string; userId: string }) =>
            apiClient.createWorkspace(data.name, data.templateType, data.workspaceRules, data.userId),
        onSuccess: (data, variables) => {
            // Invalidate and refetch workspaces
            queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.byUser(variables.userId) });
        },
    });
}

export function useUpdateWorkspace() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { workspaceId: string; name: string; workspaceRules: string; userId: string }) =>
            apiClient.updateWorkspace(data.workspaceId, data.name, data.workspaceRules, data.userId),
        onSuccess: (data, variables) => {
            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.byUser(variables.userId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.detail(variables.workspaceId) });
        },
    });
}

export function useDeleteWorkspace() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { workspaceId: string; userId: string }) =>
            apiClient.deleteWorkspace(data.workspaceId, data.userId),
        onSuccess: (data, variables) => {
            // Invalidate workspaces list
            queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.byUser(variables.userId) });
        },
    });
}

export function useSetActiveWorkspace() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { workspaceId: string; userId: string }) =>
            apiClient.setActiveWorkspace(data.workspaceId, data.userId),
        onSuccess: (data, variables) => {
            // Invalidate active workspace query
            queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.active(variables.userId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.byUser(variables.userId) });
        },
    });
}

// Chat hooks
export function useChatSessions(userId: string, workspaceId: string) {
    return useQuery({
        queryKey: queryKeys.chats.byWorkspace(userId, workspaceId),
        queryFn: () => apiClient.getChatSessions(userId, workspaceId),
        enabled: !!userId && !!workspaceId,
    });
}

export function useChatMessages(sessionId: string) {
    return useQuery({
        queryKey: queryKeys.chats.messages(sessionId),
        queryFn: () => apiClient.getChatMessages(sessionId),
        enabled: !!sessionId,
    });
}

export function useCreateChatSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { userId: string; workspaceId: string; title?: string }) =>
            apiClient.createChatSession(data.userId, data.workspaceId, data.title),
        onSuccess: (data, variables) => {
            // Invalidate chat sessions for this workspace
            queryClient.invalidateQueries({
                queryKey: queryKeys.chats.byWorkspace(variables.userId, variables.workspaceId)
            });
        },
    });
}

export function useDeleteChatSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { sessionId: string; userId: string; workspaceId: string }) =>
            apiClient.deleteChatSession(data.sessionId, data.userId),
        onSuccess: (data, variables) => {
            // Invalidate chat sessions and remove specific session from cache
            queryClient.invalidateQueries({
                queryKey: queryKeys.chats.byWorkspace(variables.userId, variables.workspaceId)
            });
            queryClient.removeQueries({ queryKey: queryKeys.chats.session(variables.sessionId) });
            queryClient.removeQueries({ queryKey: queryKeys.chats.messages(variables.sessionId) });
        },
    });
}

// Personality hooks
export function usePersonalities(userId: string) {
    return useQuery({
        queryKey: queryKeys.personalities.byUser(userId),
        queryFn: () => apiClient.getPersonalities(userId),
        enabled: !!userId,
    });
}

export function useCreatePersonality() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { title: string; prompt: string; userId: string }) =>
            apiClient.createPersonality(data.title, data.prompt, data.userId),
        onSuccess: (data, variables) => {
            // Invalidate personalities list
            queryClient.invalidateQueries({ queryKey: queryKeys.personalities.byUser(variables.userId) });
        },
    });
}

export function useUpdatePersonality() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { personalityId: string; userId: string; title: string; prompt: string }) =>
            apiClient.updatePersonality(data.personalityId, data.userId, { title: data.title, prompt: data.prompt }),
        onSuccess: (data, variables) => {
            // Invalidate personalities list and specific personality
            queryClient.invalidateQueries({ queryKey: queryKeys.personalities.byUser(variables.userId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.personalities.detail(variables.personalityId) });
        },
    });
}

export function useDeletePersonality() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { personalityId: string; userId: string }) =>
            apiClient.deletePersonality(data.personalityId, data.userId),
        onSuccess: (data, variables) => {
            // Invalidate personalities list and remove specific personality from cache
            queryClient.invalidateQueries({ queryKey: queryKeys.personalities.byUser(variables.userId) });
            queryClient.removeQueries({ queryKey: queryKeys.personalities.detail(variables.personalityId) });
        },
    });
}

// AI Provider hooks
export function useAIProviders() {
    return useQuery({
        queryKey: queryKeys.aiProviders.all(),
        queryFn: () => apiClient.getAIProviders(),
    });
}

// Statistics hooks
export function useStatistics(workspaceId: string, userId: string, dateRange: Record<string, unknown>) {
    return useQuery({
        queryKey: queryKeys.statistics.byWorkspace(workspaceId, userId, dateRange),
        queryFn: () => apiClient.getStatistics(workspaceId, userId, dateRange),
        enabled: !!workspaceId && !!userId,
    });
}
