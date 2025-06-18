export interface Personality {
    id: string;
    userId: string;
    title: string;
    prompt: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreatePersonalityRequest {
    title: string;
    prompt: string;
}

export interface UpdatePersonalityRequest {
    title?: string;
    prompt?: string;
}

export interface PersonalityResponse {
    success: boolean;
    message: string;
    personality?: Personality;
}

export interface PersonalitiesListResponse {
    success: boolean;
    message: string;
    personalities: Personality[];
}

export interface DeletePersonalityResponse {
    success: boolean;
    message: string;
}

// Workspace Personality Favorites Types
export interface WorkspacePersonalityFavorite {
    id: string;
    workspaceId: string;
    personalityId: string;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreatePersonalityFavoriteRequest {
    workspaceId: string;
    personalityId: string;
    sortOrder?: number;
}

export interface UpdatePersonalityFavoriteRequest {
    sortOrder?: number;
}

export interface WorkspacePersonalityFavoritesResponse {
    success: boolean;
    favorites: WorkspacePersonalityFavorite[];
    message?: string;
}

export interface CreatePersonalityFavoriteResponse {
    success: boolean;
    favorite?: WorkspacePersonalityFavorite;
    message: string;
}

export interface DeletePersonalityFavoriteResponse {
    success: boolean;
    message: string;
}

export interface ReorderPersonalityFavoritesRequest {
    workspaceId: string;
    favoriteIds: string[];
}
