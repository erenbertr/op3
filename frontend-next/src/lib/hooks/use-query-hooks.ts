import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, DatabaseConfig, AIProviderConfig } from '@/lib/api';
import { queryKeys } from '@/lib/query-client';
import { openaiModelConfigsAPI } from '@/lib/api/openai-model-configs';

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
export function useWorkspaces(userId: string, _componentName?: string) {
    return useQuery({
        queryKey: queryKeys.workspaces.byUser(userId),
        queryFn: () => apiClient.getUserWorkspaces(userId),
        enabled: !!userId,
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchInterval: false,
        refetchIntervalInBackground: false,
    });
}

export function useWorkspace(workspaceId: string, userId: string) {
    return useQuery({
        queryKey: queryKeys.workspaces.detail(workspaceId),
        queryFn: () => apiClient.getWorkspace(workspaceId, userId),
        enabled: !!workspaceId && !!userId,
    });
}

export function useCreateWorkspace() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { name: string; templateType: string; workspaceRules: string; userId: string }) =>
            apiClient.createWorkspace(data.userId, data.name, data.templateType, data.workspaceRules),
        onSuccess: (_data, variables) => {
            // Invalidate and refetch workspaces
            queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.byUser(variables.userId) });
        },
    });
}

export function useUpdateWorkspace() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { workspaceId: string; name: string; workspaceRules: string; userId: string }) =>
            apiClient.updateWorkspace(data.workspaceId, data.userId, { name: data.name, workspaceRules: data.workspaceRules }),
        onSuccess: (_data, variables) => {
            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.byUser(variables.userId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.detail(variables.workspaceId) });
        },
    });
}

export function useDeleteWorkspace() {
    return useMutation({
        mutationFn: (data: { workspaceId: string; userId: string }) =>
            apiClient.deleteWorkspace(data.workspaceId, data.userId),
        // Removed automatic query invalidation - let parent component handle it via callback
        // This prevents duplicate API requests when deleting workspaces
    });
}

export function useSetActiveWorkspace() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { workspaceId: string; userId: string }) =>
            apiClient.setActiveWorkspace(data.workspaceId, data.userId),
        onSuccess: (_data, variables) => {
            // Only invalidate after successful mutation, with a small delay to prevent rapid refetching
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.byUser(variables.userId) });
            }, 100);
        },
    });
}

// Chat hooks
export function useChatSessions(userId: string, workspaceId: string) {
    return useQuery({
        queryKey: queryKeys.chats.byWorkspace(userId, workspaceId),
        queryFn: () => apiClient.getChatSessions(userId, workspaceId),
        enabled: !!userId && !!workspaceId,
        retry: 3, // Limit retries to prevent infinite loops
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
        staleTime: 10 * 60 * 1000, // 10 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
}

export function useChatMessages(sessionId: string, enabled: boolean = true) {
    return useQuery({
        queryKey: queryKeys.chats.messages(sessionId),
        queryFn: async () => {
            console.log('🔄 Fetching messages from server for session:', sessionId);
            const result = await apiClient.getChatMessages(sessionId);
            console.log('📥 Server response for messages:', result);
            return result;
        },
        enabled: !!sessionId && enabled,
        staleTime: Infinity, // Never consider data stale - rely on manual invalidation
        gcTime: 60 * 60 * 1000, // 60 minutes - keep in cache longer
        refetchOnMount: false, // Don't refetch when component mounts
        refetchOnWindowFocus: false, // Don't refetch when window gains focus
        refetchOnReconnect: false, // Don't refetch on network reconnect
        refetchInterval: false, // Disable automatic refetching
        retry: 1, // Limit retries to prevent loops
        notifyOnChangeProps: ['data', 'error'], // Only notify on data/error changes
        structuralSharing: false, // Disable structural sharing to prevent cache overwrites
    });
}

export function useCreateChatSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { userId: string; workspaceId: string; title?: string }) =>
            apiClient.createChatSession({ userId: data.userId, workspaceId: data.workspaceId, title: data.title }),
        onSuccess: (_data, variables) => {
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
            apiClient.deleteChatSession(data.sessionId),
        onSuccess: (_data, variables) => {
            // Invalidate chat sessions and remove specific session from cache
            queryClient.invalidateQueries({
                queryKey: queryKeys.chats.byWorkspace(variables.userId, variables.workspaceId)
            });
            queryClient.removeQueries({ queryKey: queryKeys.chats.session(variables.sessionId) });
            queryClient.removeQueries({ queryKey: queryKeys.chats.messages(variables.sessionId) });
        },
    });
}

export function useSendMessage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { sessionId: string; content: string; personalityId?: string; aiProviderId?: string }) =>
            apiClient.sendMessage(data.sessionId, {
                content: data.content,
                personalityId: data.personalityId,
                aiProviderId: data.aiProviderId
            }),
        onSuccess: (_data, variables) => {
            // Invalidate messages for this session to refetch updated data
            queryClient.invalidateQueries({
                queryKey: queryKeys.chats.messages(variables.sessionId)
            });
        },
    });
}

// Personality hooks
export function usePersonalities(userId: string) {
    return useQuery({
        queryKey: queryKeys.personalities.byUser(userId),
        queryFn: () => apiClient.getPersonalities(userId),
        enabled: !!userId,
        retry: 3, // Limit retries to prevent infinite loops
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
        staleTime: 30 * 60 * 1000, // 30 minutes
        gcTime: 60 * 60 * 1000, // 60 minutes
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
}

export function useCreatePersonality() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { title: string; prompt: string; userId: string }) =>
            apiClient.createPersonality(data.userId, { title: data.title, prompt: data.prompt }),
        onSuccess: (_data, variables) => {
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
        onSuccess: (_data, variables) => {
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
        onSuccess: (_data, variables) => {
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
        retry: 3, // Limit retries to prevent infinite loops
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
        staleTime: 60 * 60 * 1000, // 1 hour - AI providers rarely change
        gcTime: 2 * 60 * 60 * 1000, // 2 hours
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
}

export function useSaveAIProvider() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (providerData: AIProviderConfig) => {
            return providerData.id
                ? apiClient.updateAIProvider(providerData.id, providerData)
                : apiClient.createAIProvider(providerData);
        },
        onSuccess: () => {
            // Invalidate AI providers list
            queryClient.invalidateQueries({ queryKey: queryKeys.aiProviders.all() });
        },
    });
}

export function useDeleteAIProvider() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (providerId: string) => apiClient.deleteAIProvider(providerId),
        onSuccess: () => {
            // Invalidate AI providers list
            queryClient.invalidateQueries({ queryKey: queryKeys.aiProviders.all() });
        },
    });
}

export function useTestAIProvider() {
    return useMutation({
        mutationFn: (providerId: string) => apiClient.testAIProvider(providerId),
    });
}

// Statistics hooks
export function useStatistics(workspaceId: string, userId: string, options: { range: string; startDate?: string; endDate?: string }) {
    return useQuery({
        queryKey: queryKeys.statistics.byWorkspace(workspaceId, userId, options),
        queryFn: () => apiClient.getStatistics(workspaceId, userId, options),
        enabled: !!workspaceId && !!userId,
    });
}

// OpenAI Model Configs hooks
export function useOpenAIModelConfigs() {
    return useQuery({
        queryKey: ['openai-model-configs'],
        queryFn: () => openaiModelConfigsAPI.getModelConfigs(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
}
