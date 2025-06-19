export type WorkspaceTemplate = 'standard-chat' | 'kanban-board' | 'node-graph';

export interface Workspace {
    id: string;
    userId: string;
    name: string;
    templateType: WorkspaceTemplate;
    workspaceRules: string;
    isActive: boolean;
    groupId?: string | null;
    sortOrder?: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateWorkspaceRequest {
    name: string;
    templateType: WorkspaceTemplate;
    workspaceRules: string;
}

export interface UpdateWorkspaceRequest {
    name?: string;
    workspaceRules?: string;
    groupId?: string | null;
    sortOrder?: number;
}

export interface CreateWorkspaceResponse {
    success: boolean;
    message: string;
    workspace?: {
        id: string;
        name: string;
        templateType: WorkspaceTemplate;
        workspaceRules: string;
        isActive: boolean;
        createdAt: string;
    };
}

export interface WorkspaceStatusResponse {
    success: boolean;
    hasWorkspace: boolean;
    workspace?: {
        id: string;
        name: string;
        templateType: WorkspaceTemplate;
        workspaceRules: string;
        isActive: boolean;
        createdAt: string;
    };
}

export interface WorkspaceListResponse {
    success: boolean;
    workspaces: {
        id: string;
        name: string;
        templateType: WorkspaceTemplate;
        workspaceRules: string;
        isActive: boolean;
        groupId?: string | null;
        sortOrder?: number;
        createdAt: string;
    }[];
}

export interface WorkspaceUpdateResponse {
    success: boolean;
    message: string;
    workspace?: {
        id: string;
        name: string;
        templateType: WorkspaceTemplate;
        workspaceRules: string;
        isActive: boolean;
        createdAt: string;
    };
}

export interface WorkspaceDeleteResponse {
    success: boolean;
    message: string;
}
