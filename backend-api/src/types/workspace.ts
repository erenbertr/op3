export type WorkspaceTemplate = 'standard-chat' | 'kanban-board' | 'node-graph';

export interface Workspace {
    id: string;
    userId: string;
    templateType: WorkspaceTemplate;
    workspaceRules: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateWorkspaceRequest {
    templateType: WorkspaceTemplate;
    workspaceRules: string;
}

export interface CreateWorkspaceResponse {
    success: boolean;
    message: string;
    workspace?: {
        id: string;
        templateType: WorkspaceTemplate;
        workspaceRules: string;
        createdAt: string;
    };
}

export interface WorkspaceStatusResponse {
    success: boolean;
    hasWorkspace: boolean;
    workspace?: {
        id: string;
        templateType: WorkspaceTemplate;
        workspaceRules: string;
        createdAt: string;
    };
}
