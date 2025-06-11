"use client"

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

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

export interface BatchUpdateWorkspacesRequest {
    updates: Array<{
        workspaceId: string;
        groupId: string | null;
        sortOrder: number;
    }>;
}

// API functions using apiClient methods
const workspaceGroupsApi = {
    getUserGroups: (userId: string) => apiClient.getUserWorkspaceGroups(userId),
    createGroup: (userId: string, data: CreateWorkspaceGroupRequest) =>
        apiClient.createWorkspaceGroup(userId, data.name, data.sortOrder),
    updateGroup: (userId: string, groupId: string, data: UpdateWorkspaceGroupRequest) =>
        apiClient.updateWorkspaceGroup(userId, groupId, data.name, data.sortOrder),
    deleteGroup: (userId: string, groupId: string) =>
        apiClient.deleteWorkspaceGroup(userId, groupId),
    deleteGroupWithWorkspaces: (userId: string, groupId: string) =>
        apiClient.deleteWorkspaceGroupWithWorkspaces(userId, groupId),
    reorderGroups: (userId: string, data: ReorderGroupsRequest) =>
        apiClient.reorderWorkspaceGroups(userId, data.groupOrders),
    moveWorkspaceToGroup: (userId: string, data: MoveWorkspaceToGroupRequest) =>
        apiClient.moveWorkspaceToGroup(userId, data.workspaceId, data.groupId, data.sortOrder),
    batchUpdateWorkspaces: (userId: string, data: BatchUpdateWorkspacesRequest) =>
        apiClient.batchUpdateWorkspaces(userId, data.updates)
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
            // Temporarily disable SortableJS during DOM updates to prevent conflicts
            console.log('🔄 Temporarily disabling SortableJS during DOM updates...');

            // Dispatch custom event to temporarily disable SortableJS instances
            window.dispatchEvent(new CustomEvent('disable-sortable-instances'));

            // Invalidate queries immediately
            queryClient.invalidateQueries({ queryKey: ['workspace-groups', 'user', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['workspaces', 'user', variables.userId] });

            // Re-enable SortableJS after DOM updates are complete
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('enable-sortable-instances'));
                console.log('✅ SortableJS re-enabled after DOM updates');
            }, 100);
        },
    });
}

export function useDeleteWorkspaceGroupWithWorkspaces() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ userId, groupId }: { userId: string; groupId: string }) =>
            workspaceGroupsApi.deleteGroupWithWorkspaces(userId, groupId),
        onSuccess: (_, variables) => {
            // Temporarily disable SortableJS during DOM updates to prevent conflicts
            console.log('🔄 Temporarily disabling SortableJS during DOM updates...');

            // Dispatch custom event to temporarily disable SortableJS instances
            window.dispatchEvent(new CustomEvent('disable-sortable-instances'));

            // Invalidate queries immediately
            queryClient.invalidateQueries({ queryKey: ['workspace-groups', 'user', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['workspaces', 'user', variables.userId] });

            // Re-enable SortableJS after DOM updates are complete
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('enable-sortable-instances'));
                console.log('✅ SortableJS re-enabled after DOM updates');
            }, 100);
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
            // Temporarily disable SortableJS during DOM updates to prevent conflicts
            console.log('🔄 Temporarily disabling SortableJS during DOM updates...');

            // Dispatch custom event to temporarily disable SortableJS instances
            window.dispatchEvent(new CustomEvent('disable-sortable-instances'));

            // Invalidate queries immediately
            queryClient.invalidateQueries({ queryKey: ['workspace-groups', 'user', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['workspaces', 'user', variables.userId] });

            // Re-enable SortableJS after DOM updates are complete
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('enable-sortable-instances'));
                console.log('✅ SortableJS re-enabled after DOM updates');
            }, 100);
        },
    });
}

export function useBatchUpdateWorkspaces() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ userId, ...data }: { userId: string } & BatchUpdateWorkspacesRequest) =>
            workspaceGroupsApi.batchUpdateWorkspaces(userId, data),
        onSuccess: (_, variables) => {
            // Invalidate both groups and workspaces queries
            queryClient.invalidateQueries({ queryKey: ['workspace-groups', 'user', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['workspaces', 'user', variables.userId] });
        },
    });
}
