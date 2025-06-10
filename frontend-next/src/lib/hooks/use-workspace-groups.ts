"use client"

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/lib/api';

// Types
export interface WorkspaceGroup {
    id: string;
    name: string;
    sortOrder: number;
    createdAt: string;
    workspaceCount: number;
}

export interface CreateWorkspaceGroupRequest {
    name: string;
    sortOrder?: number;
}

export interface UpdateWorkspaceGroupRequest {
    name?: string;
    sortOrder?: number;
}

export interface ReorderGroupsRequest {
    groupOrders: Array<{
        groupId: string;
        sortOrder: number;
    }>;
}

export interface MoveWorkspaceToGroupRequest {
    workspaceId: string;
    groupId: string | null;
    sortOrder?: number;
}

// API functions
const workspaceGroupsApi = {
    getUserGroups: async (userId: string): Promise<{ success: boolean; groups: WorkspaceGroup[] }> => {
        const response = await apiService.get(`/workspace-groups/user/${userId}`);
        return response.data;
    },

    createGroup: async (userId: string, data: CreateWorkspaceGroupRequest): Promise<{ success: boolean; group?: any }> => {
        const response = await apiService.post('/workspace-groups/create', {
            userId,
            ...data
        });
        return response.data;
    },

    updateGroup: async (userId: string, groupId: string, data: UpdateWorkspaceGroupRequest): Promise<{ success: boolean }> => {
        const response = await apiService.put(`/workspace-groups/${groupId}`, {
            userId,
            ...data
        });
        return response.data;
    },

    deleteGroup: async (userId: string, groupId: string): Promise<{ success: boolean }> => {
        const response = await apiService.delete(`/workspace-groups/${groupId}`, {
            data: { userId }
        });
        return response.data;
    },

    reorderGroups: async (userId: string, data: ReorderGroupsRequest): Promise<{ success: boolean }> => {
        const response = await apiService.put('/workspace-groups/reorder', {
            userId,
            ...data
        });
        return response.data;
    },

    moveWorkspaceToGroup: async (userId: string, data: MoveWorkspaceToGroupRequest): Promise<{ success: boolean }> => {
        const response = await apiService.put('/workspace-groups/move-workspace', {
            userId,
            ...data
        });
        return response.data;
    }
};

// Query hooks
export function useWorkspaceGroups(userId: string) {
    return useQuery({
        queryKey: ['workspace-groups', 'user', userId],
        queryFn: () => workspaceGroupsApi.getUserGroups(userId),
        enabled: !!userId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

// Mutation hooks
export function useCreateWorkspaceGroup() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ userId, ...data }: { userId: string } & CreateWorkspaceGroupRequest) =>
            workspaceGroupsApi.createGroup(userId, data),
        onSuccess: (_, variables) => {
            // Invalidate groups query
            queryClient.invalidateQueries({ queryKey: ['workspace-groups', 'user', variables.userId] });
        },
    });
}

export function useUpdateWorkspaceGroup() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ userId, groupId, ...data }: { userId: string; groupId: string } & UpdateWorkspaceGroupRequest) =>
            workspaceGroupsApi.updateGroup(userId, groupId, data),
        onSuccess: (_, variables) => {
            // Invalidate groups query
            queryClient.invalidateQueries({ queryKey: ['workspace-groups', 'user', variables.userId] });
        },
    });
}

export function useDeleteWorkspaceGroup() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ userId, groupId }: { userId: string; groupId: string }) =>
            workspaceGroupsApi.deleteGroup(userId, groupId),
        onSuccess: (_, variables) => {
            // Invalidate both groups and workspaces queries
            queryClient.invalidateQueries({ queryKey: ['workspace-groups', 'user', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['workspaces', 'user', variables.userId] });
        },
    });
}

export function useReorderWorkspaceGroups() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ userId, ...data }: { userId: string } & ReorderGroupsRequest) =>
            workspaceGroupsApi.reorderGroups(userId, data),
        onSuccess: (_, variables) => {
            // Invalidate groups query
            queryClient.invalidateQueries({ queryKey: ['workspace-groups', 'user', variables.userId] });
        },
    });
}

export function useMoveWorkspaceToGroup() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ userId, ...data }: { userId: string } & MoveWorkspaceToGroupRequest) =>
            workspaceGroupsApi.moveWorkspaceToGroup(userId, data),
        onSuccess: (_, variables) => {
            // Invalidate both groups and workspaces queries
            queryClient.invalidateQueries({ queryKey: ['workspace-groups', 'user', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['workspaces', 'user', variables.userId] });
        },
    });
}
