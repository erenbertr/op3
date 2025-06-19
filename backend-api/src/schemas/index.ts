import { SchemaDefinition } from '../types/database';

/**
 * Schema definitions for all database entities
 * These schemas define the structure and constraints for each table/collection
 */

export const UserSchema: SchemaDefinition = {
    tableName: 'users',
    collectionName: 'users',
    fields: {
        id: {
            type: 'uuid',
            primaryKey: true,
            required: true
        },
        email: {
            type: 'string',
            required: true,
            unique: true,
            maxLength: 255
        },
        username: {
            type: 'string',
            maxLength: 255
        },
        password: {
            type: 'string',
            required: true,
            maxLength: 255
        },
        role: {
            type: 'string',
            required: true,
            maxLength: 20
        },
        isActive: {
            type: 'boolean',
            defaultValue: true
        },
        lastLoginAt: {
            type: 'date'
        },
        hasCompletedWorkspaceSetup: {
            type: 'boolean',
            defaultValue: false
        },
        permissions: {
            type: 'json'
        },
        subscriptionId: {
            type: 'string',
            maxLength: 255
        },
        subscriptionExpiry: {
            type: 'date'
        },
        firstName: {
            type: 'string',
            maxLength: 255
        },
        lastName: {
            type: 'string',
            maxLength: 255
        },
        avatar: {
            type: 'text'
        }
    },
    indexes: [
        ['email'],
        ['role'],
        ['isActive']
    ],
    timestamps: true
};

export const WorkspaceSchema: SchemaDefinition = {
    tableName: 'workspaces',
    collectionName: 'workspaces',
    fields: {
        id: {
            type: 'uuid',
            primaryKey: true,
            required: true
        },
        userId: {
            type: 'uuid',
            required: true
        },
        name: {
            type: 'string',
            required: true,
            maxLength: 255
        },
        templateType: {
            type: 'string',
            maxLength: 100
        },
        workspaceRules: {
            type: 'text'
        },
        isActive: {
            type: 'boolean',
            defaultValue: false
        },
        groupId: {
            type: 'uuid'
        },
        sortOrder: {
            type: 'number',
            defaultValue: 0
        }
    },
    indexes: [
        ['userId'],
        ['userId', 'isActive'],
        ['groupId'],
        ['sortOrder']
    ],
    timestamps: true
};

export const ChatSessionSchema: SchemaDefinition = {
    tableName: 'chat_sessions',
    collectionName: 'chatSessions',
    fields: {
        id: {
            type: 'uuid',
            primaryKey: true,
            required: true
        },
        userId: {
            type: 'uuid',
            required: true
        },
        workspaceId: {
            type: 'uuid',
            required: true
        },
        title: {
            type: 'string',
            required: true,
            maxLength: 255
        },
        lastUsedPersonalityId: {
            type: 'uuid'
        },
        lastUsedAIProviderId: {
            type: 'uuid'
        },
        isPinned: {
            type: 'boolean',
            defaultValue: false
        },
        isShared: {
            type: 'boolean',
            defaultValue: false
        },
        parentSessionId: {
            type: 'uuid'
        }
    },
    indexes: [
        ['userId'],
        ['workspaceId'],
        ['userId', 'workspaceId'],
        ['isPinned'],
        ['isShared'],
        ['parentSessionId']
    ],
    timestamps: true
};

export const ChatMessageSchema: SchemaDefinition = {
    tableName: 'chat_messages',
    collectionName: 'chatMessages',
    fields: {
        id: {
            type: 'uuid',
            primaryKey: true,
            required: true
        },
        sessionId: {
            type: 'uuid',
            required: true
        },
        content: {
            type: 'text',
            required: true
        },
        role: {
            type: 'string',
            required: true,
            maxLength: 20
        },
        personalityId: {
            type: 'uuid'
        },
        aiProviderId: {
            type: 'uuid'
        },
        apiMetadata: {
            type: 'json'
        },
        isPartial: {
            type: 'boolean',
            defaultValue: false
        },
        fileAttachments: {
            type: 'json'
        },
        isShared: {
            type: 'boolean',
            defaultValue: false
        }
    },
    indexes: [
        ['sessionId'],
        ['role'],
        ['personalityId'],
        ['aiProviderId'],
        ['isShared']
    ],
    timestamps: true
};

export const SharedChatSchema: SchemaDefinition = {
    tableName: 'shared_chats',
    collectionName: 'sharedChats',
    fields: {
        id: {
            type: 'uuid',
            primaryKey: true,
            required: true
        },
        originalChatId: {
            type: 'uuid',
            required: true
        },
        title: {
            type: 'string',
            required: true,
            maxLength: 255
        },
        messages: {
            type: 'json',
            required: true
        },
        messageCount: {
            type: 'number',
            required: true
        },
        isActive: {
            type: 'boolean',
            defaultValue: true
        }
    },
    indexes: [
        ['originalChatId'],
        ['isActive']
    ],
    timestamps: true
};

export const WorkspaceGroupSchema: SchemaDefinition = {
    tableName: 'workspace_groups',
    collectionName: 'workspaceGroups',
    fields: {
        id: {
            type: 'uuid',
            primaryKey: true,
            required: true
        },
        userId: {
            type: 'uuid',
            required: true
        },
        name: {
            type: 'string',
            required: true,
            maxLength: 255
        },
        color: {
            type: 'string',
            maxLength: 7
        },
        sortOrder: {
            type: 'number',
            defaultValue: 0
        },
        isPinned: {
            type: 'boolean',
            defaultValue: false
        }
    },
    indexes: [
        ['userId'],
        ['sortOrder'],
        ['isPinned']
    ],
    timestamps: true
};

export const AIProviderConfigSchema: SchemaDefinition = {
    tableName: 'ai_provider_configs',
    collectionName: 'aiProviderConfigs',
    fields: {
        id: {
            type: 'uuid',
            primaryKey: true,
            required: true
        },
        provider: {
            type: 'string',
            required: true,
            maxLength: 50
        },
        keyName: {
            type: 'string',
            required: true,
            maxLength: 255
        },
        apiKey: {
            type: 'string',
            required: true,
            maxLength: 500
        },
        isActive: {
            type: 'boolean',
            defaultValue: true
        },
        metadata: {
            type: 'json'
        }
    },
    indexes: [
        ['provider'],
        ['isActive'],
        ['provider', 'isActive']
    ],
    timestamps: true
};

export const PersonalitySchema: SchemaDefinition = {
    tableName: 'personalities',
    collectionName: 'personalities',
    fields: {
        id: {
            type: 'uuid',
            primaryKey: true,
            required: true
        },
        userId: {
            type: 'uuid',
            required: true
        },
        title: {
            type: 'string',
            required: true,
            maxLength: 255
        },
        prompt: {
            type: 'text',
            required: true
        }
    },
    indexes: [
        ['userId'],
        ['title']
    ],
    timestamps: true
};

export const OpenAIModelConfigSchema: SchemaDefinition = {
    tableName: 'openai_model_configs',
    collectionName: 'openaiModelConfigs',
    fields: {
        id: {
            type: 'uuid',
            primaryKey: true,
            required: true
        },
        keyId: {
            type: 'uuid',
            required: true
        },
        keyName: {
            type: 'string',
            required: true,
            maxLength: 255
        },
        modelId: {
            type: 'string',
            required: true,
            maxLength: 255
        },
        modelName: {
            type: 'string',
            required: true,
            maxLength: 255
        },
        customName: {
            type: 'string',
            maxLength: 255
        },
        capabilities: {
            type: 'json'
        },
        pricing: {
            type: 'json'
        },
        isActive: {
            type: 'boolean',
            defaultValue: true
        }
    },
    indexes: [
        ['keyId'],
        ['modelId'],
        ['keyId', 'modelId'],
        ['isActive']
    ],
    timestamps: true
};

export const GlobalOpenRouterSettingsSchema: SchemaDefinition = {
    tableName: 'global_openrouter_settings',
    collectionName: 'globalOpenRouterSettings',
    fields: {
        id: {
            type: 'uuid',
            primaryKey: true,
            required: true
        },
        apiKey: {
            type: 'string',
            required: true,
            maxLength: 500
        },
        selectedModels: {
            type: 'json',
            required: true
        },
        isEnabled: {
            type: 'boolean',
            defaultValue: true
        }
    },
    indexes: [
        ['isEnabled']
    ],
    timestamps: true
};

// System Settings Schema
export const SystemSettingsSchema: SchemaDefinition = {
    tableName: 'system_settings',
    collectionName: 'systemSettings',
    fields: {
        id: {
            type: 'uuid',
            primaryKey: true,
            required: true
        },
        registrationEnabled: {
            type: 'boolean',
            required: true,
            defaultValue: true
        },
        loginEnabled: {
            type: 'boolean',
            required: true,
            defaultValue: true
        },
        maxUsersAllowed: {
            type: 'number'
        },
        defaultUserRole: {
            type: 'string',
            required: true,
            maxLength: 20,
            defaultValue: 'normal'
        },
        requireEmailVerification: {
            type: 'boolean',
            required: true,
            defaultValue: false
        },
        allowUsernameChange: {
            type: 'boolean',
            required: true,
            defaultValue: true
        },
        passwordRequirements: {
            type: 'json',
            required: true
        },
        updatedBy: {
            type: 'uuid',
            required: true
        }
    },
    indexes: [
        ['id']
    ],
    timestamps: true
};

// Workspace AI Favorites Schema
export const WorkspaceAIFavoritesSchema: SchemaDefinition = {
    tableName: 'workspace_ai_favorites',
    collectionName: 'workspaceAIFavorites',
    fields: {
        id: {
            type: 'uuid',
            primaryKey: true,
            required: true
        },
        workspaceId: {
            type: 'uuid',
            required: true
        },
        aiProviderId: {
            type: 'string',
            required: true,
            maxLength: 255
        },
        isModelConfig: {
            type: 'boolean',
            required: true,
            defaultValue: false
        },
        displayName: {
            type: 'string',
            required: true,
            maxLength: 255
        },
        sortOrder: {
            type: 'number',
            required: true,
            defaultValue: 0
        }
    },
    indexes: [
        ['workspaceId'],
        ['workspaceId', 'aiProviderId'],
        ['workspaceId', 'sortOrder']
    ],
    timestamps: true
};

// Workspace Personality Favorites Schema
export const WorkspacePersonalityFavoritesSchema: SchemaDefinition = {
    tableName: 'workspace_personality_favorites',
    collectionName: 'workspacePersonalityFavorites',
    fields: {
        id: {
            type: 'uuid',
            primaryKey: true,
            required: true
        },
        workspaceId: {
            type: 'uuid',
            required: true
        },
        personalityId: {
            type: 'uuid',
            required: true
        },
        sortOrder: {
            type: 'number',
            required: true,
            defaultValue: 0
        }
    },
    indexes: [
        ['workspaceId'],
        ['workspaceId', 'personalityId'],
        ['workspaceId', 'sortOrder']
    ],
    timestamps: true
};

// Export all schemas as a map for easy access
export const AllSchemas = {
    users: UserSchema,
    workspaces: WorkspaceSchema,
    chat_sessions: ChatSessionSchema,
    chatSessions: ChatSessionSchema, // MongoDB collection name
    chat_messages: ChatMessageSchema,
    chatMessages: ChatMessageSchema, // MongoDB collection name
    shared_chats: SharedChatSchema,
    sharedChats: SharedChatSchema, // MongoDB collection name
    workspace_groups: WorkspaceGroupSchema,
    workspaceGroups: WorkspaceGroupSchema, // MongoDB collection name
    ai_provider_configs: AIProviderConfigSchema,
    aiProviderConfigs: AIProviderConfigSchema, // MongoDB collection name
    personalities: PersonalitySchema,
    system_settings: SystemSettingsSchema,
    systemSettings: SystemSettingsSchema, // MongoDB collection name
    workspace_ai_favorites: WorkspaceAIFavoritesSchema,
    workspaceAIFavorites: WorkspaceAIFavoritesSchema, // MongoDB collection name
    workspace_personality_favorites: WorkspacePersonalityFavoritesSchema,
    workspacePersonalityFavorites: WorkspacePersonalityFavoritesSchema, // MongoDB collection name
    openai_model_configs: OpenAIModelConfigSchema,
    openaiModelConfigs: OpenAIModelConfigSchema, // MongoDB collection name
    global_openrouter_settings: GlobalOpenRouterSettingsSchema,
    globalOpenRouterSettings: GlobalOpenRouterSettingsSchema // MongoDB collection name
};

/**
 * Initialize all schemas in the universal database service
 */
export function initializeSchemas(universalDb: any): void {
    Object.values(AllSchemas).forEach(schema => {
        universalDb.registerSchema(schema);
    });
}
