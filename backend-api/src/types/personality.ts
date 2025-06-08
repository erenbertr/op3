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
