export interface WorkspaceGroup {
    id: string;
    userId: string;
    name: string;
    color?: string;
    sortOrder: number;
    isPinned?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateWorkspaceGroupRequest {
    name: string;
    color?: string;
    sortOrder?: number;
}

export interface UpdateWorkspaceGroupRequest {
    name?: string;
    color?: string;
    sortOrder?: number;
    isPinned?: boolean;
}

export interface WorkspaceGroupResponse {
    success: boolean;
    message: string;
    group?: {
        id: string;
        name: string;
        sortOrder: number;
        isPinned: boolean;
        createdAt: string;
    };
}

export interface WorkspaceGroupsResponse {
    success: boolean;
    message: string;
    groups: Array<{
        id: string;
        name: string;
        sortOrder: number;
        isPinned: boolean;
        createdAt: string;
        workspaceCount: number;
    }>;
}

export interface ReorderGroupsRequest {
    groupOrders: Array<{
        groupId: string;
        sortOrder: number;
    }>;
}

export interface MoveWorkspaceToGroupRequest {
    workspaceId: string;
    groupId: string | null; // null means ungrouped
    sortOrder?: number;
}

export interface PinGroupRequest {
    groupId: string;
    isPinned: boolean;
}

export interface PinGroupResponse {
    success: boolean;
    message: string;
    group?: {
        id: string;
        name: string;
        isPinned: boolean;
    };
}

// Additional type aliases for backward compatibility
export type CreateWorkspaceGroupResponse = WorkspaceGroupResponse;
export type UpdateWorkspaceGroupResponse = WorkspaceGroupResponse;
export type DeleteWorkspaceGroupResponse = {
    success: boolean;
    message: string;
};
export type WorkspaceGroupsListResponse = WorkspaceGroupsResponse;
