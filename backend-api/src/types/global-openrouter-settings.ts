export interface GlobalOpenRouterSettings {
    id?: string;
    apiKey: string;
    selectedModels: string[]; // Array of model IDs
    isEnabled: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface SaveGlobalOpenRouterSettingsRequest {
    apiKey: string;
    selectedModels: string[];
    isEnabled: boolean;
}

export interface SaveGlobalOpenRouterSettingsResponse {
    success: boolean;
    message: string;
    settings?: GlobalOpenRouterSettings;
    error?: string;
}

export interface GetGlobalOpenRouterSettingsResponse {
    success: boolean;
    settings?: GlobalOpenRouterSettings;
    message?: string;
    error?: string;
}
