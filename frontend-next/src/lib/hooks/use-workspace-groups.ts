"use client"

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

// Types
export interface WorkspaceGroup {
    id: string;
    name: string;
    sortOrder: number;
    isPinned: boolean;
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

// Define a type for the workspace structure as expected in the cache
interface CachedWorkspace {
    id: string;
    name: string;
    templateType: string;
    workspaceRules: string;
    isActive: boolean;
    createdAt: string;
    groupId?: string | null;
    sortOrder?: number;
}

interface CachedWorkspacesData {
    workspaces: CachedWorkspace[];
    // Add other properties if the cached object for ['workspaces', 'user', userId] has more fields
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
        apiClient.batchUpdateWorkspaces(userId, data.updates),
    pinGroup: (userId: string, groupId: string, isPinned: boolean) =>
        apiClient.pinWorkspaceGroup(userId, groupId, isPinned)
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
            // Invalidate queries immediately
            queryClient.invalidateQueries({ queryKey: ['workspace-groups', 'user', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['workspaces', 'user', variables.userId] });
        },
    });
}

export function useDeleteWorkspaceGroupWithWorkspaces() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ userId, groupId }: { userId: string; groupId: string }) =>
            workspaceGroupsApi.deleteGroupWithWorkspaces(userId, groupId),
        onSuccess: (_, variables) => {
            // Invalidate queries immediately
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

export function useReorderWorkspaceGroupsOptimistic() {
    return useMutation({
        mutationFn: ({ userId, ...data }: { userId: string } & ReorderGroupsRequest) =>
            workspaceGroupsApi.reorderGroups(userId, data),

        // No automatic refetching - let the component handle state updates manually
        onSuccess: () => {
            console.log('✅ Group reorder API call completed successfully');
        },

        onError: (error) => {
            console.error('❌ Error reordering groups:', error);
        },
    });
}

export function useMoveWorkspaceToGroup() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ userId, ...data }: { userId: string } & MoveWorkspaceToGroupRequest) =>
            workspaceGroupsApi.moveWorkspaceToGroup(userId, data),
        onSuccess: (_, variables) => {
            // Invalidate queries immediately
            queryClient.invalidateQueries({ queryKey: ['workspace-groups', 'user', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['workspaces', 'user', variables.userId] });
        },
    });
}

export function useMoveWorkspaceToGroupOptimistic() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ userId, ...data }: { userId: string } & MoveWorkspaceToGroupRequest) =>
            workspaceGroupsApi.moveWorkspaceToGroup(userId, data),

        onMutate: async (variables: { userId: string } & MoveWorkspaceToGroupRequest) => {
            const { userId, workspaceId, groupId: targetGroupId, sortOrder: newSortIndex } = variables;
            const workspacesQueryKey: readonly string[] = ['workspaces', 'user', userId];

            await queryClient.cancelQueries({ queryKey: workspacesQueryKey });

            const previousWorkspacesData = queryClient.getQueryData<CachedWorkspacesData>(workspacesQueryKey);

            queryClient.setQueryData<CachedWorkspacesData | undefined>(workspacesQueryKey, (oldData) => {
                if (!oldData || !oldData.workspaces) {
                    console.warn('Optimistic update for move: No old data or workspaces array.');
                    return oldData;
                }

                const currentMovedWorkspace = oldData.workspaces.find(ws => ws.id === workspaceId);
                if (!currentMovedWorkspace) {
                    console.warn('Optimistic update for move: Moved workspace not found in cache.');
                    return oldData;
                }

                // Create the updated version of the moved workspace
                const typedMovedWorkspace: CachedWorkspace = { 
                    ...currentMovedWorkspace, 
                    groupId: targetGroupId, 
                    sortOrder: newSortIndex 
                };

                // Filter out the moved workspace from its original position
                const workspacesWithoutMoved = oldData.workspaces.filter(ws => ws.id !== workspaceId);
                
                const targetGroupWorkspaces: CachedWorkspace[] = [];
                const otherWorkspaces: CachedWorkspace[] = [];

                workspacesWithoutMoved.forEach(ws => {
                    if (ws.groupId === targetGroupId) {
                        targetGroupWorkspaces.push(ws);
                    } else {
                        otherWorkspaces.push(ws);
                    }
                });

                // Insert the moved workspace into the target group at the specified newSortIndex
                // Ensure newSortIndex is a valid number; if undefined or null, place at the end.
                const insertionIndex = (newSortIndex !== undefined && newSortIndex !== null && newSortIndex >= 0 && newSortIndex <= targetGroupWorkspaces.length) 
                    ? newSortIndex 
                    : targetGroupWorkspaces.length;
                targetGroupWorkspaces.splice(insertionIndex, 0, typedMovedWorkspace);

                // Update sortOrder for all workspaces in the target group
                targetGroupWorkspaces.forEach((ws, index) => {
                    ws.sortOrder = index;
                });

                const finalWorkspacesList = [...otherWorkspaces, ...targetGroupWorkspaces].sort((a, b) => {
                    // Grouped items come before ungrouped items
                    if (a.groupId && !b.groupId) return -1;
                    if (!a.groupId && b.groupId) return 1;

                    // If both are in the same group or both are ungrouped, sort by sortOrder
                    if (a.groupId === b.groupId || (!a.groupId && !b.groupId)) {
                        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
                    }
                    
                    // If items are in different groups (and not null), sort by groupId string comparison as a fallback
                    // A more robust solution would involve a predefined group order if necessary.
                    if (a.groupId && b.groupId) {
                        return a.groupId.localeCompare(b.groupId);
                    }
                    return 0;
                });

                return { ...oldData, workspaces: finalWorkspacesList };
            });

            console.log('✨ Optimistically updated workspace move for workspace:', workspaceId);
            return { previousWorkspacesData, workspacesQueryKey };
        },
        onError: (error: Error, variables: { userId: string } & MoveWorkspaceToGroupRequest, context?: { previousWorkspacesData?: CachedWorkspacesData; workspacesQueryKey?: readonly string[] }) => {
            console.error('❌ Error moving workspace, rolling back optimistic update:', error);
            if (context?.previousWorkspacesData && context?.workspacesQueryKey) {
                queryClient.setQueryData(context.workspacesQueryKey, context.previousWorkspacesData);
            }
        },
        onSettled: (data: unknown, error: Error | null, variables: { userId: string } & MoveWorkspaceToGroupRequest, context?: { previousWorkspacesData?: CachedWorkspacesData; workspacesQueryKey?: readonly string[] }) => {
            console.log('🔄 Workspace move API call settled, invalidating workspaces query');
            if (context?.workspacesQueryKey) {
                 queryClient.invalidateQueries({ queryKey: context.workspacesQueryKey });
            }
            queryClient.invalidateQueries({ queryKey: ['workspace-groups', 'user', variables.userId] });
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

export function usePinWorkspaceGroup() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ userId, groupId, isPinned }: { userId: string; groupId: string; isPinned: boolean }) =>
            workspaceGroupsApi.pinGroup(userId, groupId, isPinned),
        onSuccess: (_, variables) => {
            // Invalidate workspace groups query to refresh the data
            queryClient.invalidateQueries({ queryKey: ['workspace-groups', 'user', variables.userId] });
        },
    });
}
