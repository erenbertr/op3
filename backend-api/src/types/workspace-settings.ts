export interface WorkspaceOpenRouterSettings {
    id?: string;
    workspaceId: string;
    apiKey: string;
    selectedModels: string[]; // Array of model IDs
    isEnabled: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface SaveWorkspaceOpenRouterSettingsRequest {
    workspaceId: string;
    apiKey: string;
    selectedModels: string[];
    isEnabled: boolean;
}

export interface SaveWorkspaceOpenRouterSettingsResponse {
    success: boolean;
    message: string;
    settings?: WorkspaceOpenRouterSettings;
    error?: string;
}

export interface GetWorkspaceOpenRouterSettingsResponse {
    success: boolean;
    settings?: WorkspaceOpenRouterSettings;
    message?: string;
    error?: string;
}

export interface ValidateOpenRouterApiKeyRequest {
    apiKey: string;
}

export interface ValidateOpenRouterApiKeyResponse {
    success: boolean;
    message: string;
    models?: any[];
    error?: string;
}
