/**
 * Configuration interfaces for the reusable AI Provider Settings component
 * This allows different providers (OpenAI, Grok, Claude, etc.) to configure
 * the master component with their specific requirements
 */

import { ReactNode } from 'react';

// Base interfaces for provider data structures
export interface BaseProvider {
    id: string;
    name: string;
    apiKey: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface BaseModel {
    id: string;
    object?: string;
    created?: number;
    owned_by?: string;
    name?: string;
    description?: string;
}

export interface BaseModelConfig {
    id: string;
    keyId: string;
    keyName: string;
    modelId: string;
    modelName: string;
    customName?: string;
    capabilities?: Record<string, any>;
    pricing?: Record<string, any>;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

// API endpoint configuration
export interface ProviderAPIConfig {
    // Base endpoints for provider management
    providersEndpoint: string; // e.g., '/openai-providers'
    modelConfigsEndpoint: string; // e.g., '/openai-model-configs'
    
    // Model fetching endpoint
    fetchModelsEndpoint: string; // e.g., '/ai-providers/openai/models'
    
    // Query keys for TanStack Query
    providersQueryKey: string; // e.g., 'openai-keys'
    modelConfigsQueryKey: string; // e.g., 'openai-model-configs'
}

// UI configuration
export interface ProviderUIConfig {
    // Provider display information
    displayName: string; // e.g., 'OpenAI', 'xAI (Grok)', 'Anthropic (Claude)'
    description: string; // e.g., 'Configure OpenAI API and models'
    icon: ReactNode;
    
    // Tab labels and descriptions
    modelsTabLabel: string; // e.g., 'Models'
    keysTabLabel: string; // e.g., 'API Keys'
    modelsTabDescription: string; // e.g., 'Configure models for each API key'
    keysTabDescription: string; // e.g., 'Manage your OpenAI API keys'
    
    // Empty state messages
    noKeysTitle: string; // e.g., 'No API Keys'
    noKeysDescription: string; // e.g., 'You haven\'t added any OpenAI API keys yet...'
    noModelsTitle: string; // e.g., 'No Models'
    noModelsDescription: string; // e.g., 'Add an OpenAI API key first to configure models'
    
    // Button labels
    addKeyButtonLabel: string; // e.g., 'Add Your First API Key'
    addModelButtonLabel: string; // e.g., 'Add Model'
    
    // Modal titles
    addKeyModalTitle: string; // e.g., 'Add New API Key'
    editKeyModalTitle: string; // e.g., 'Edit API Key'
    addKeyModalDescription: string; // e.g., 'Add a new OpenAI API key with a custom name'
    editKeyModalDescription: string; // e.g., 'Update your OpenAI API key configuration'
}

// Validation configuration
export interface ProviderValidationConfig {
    // API key validation
    validateApiKeyFormat?: (apiKey: string) => boolean;
    apiKeyFormatErrorMessage?: string;
    
    // Custom validation rules
    customValidations?: {
        [field: string]: (value: any) => string | null; // Returns error message or null
    };
}

// Model capabilities configuration
export interface ProviderCapabilitiesConfig {
    // Available capabilities for this provider
    availableCapabilities: string[]; // e.g., ['reasoning', 'search', 'fileUpload', 'image']
    
    // Capability display configuration
    capabilityLabels: Record<string, string>; // e.g., { reasoning: 'Reasoning', search: 'Search' }
    capabilityIcons: Record<string, ReactNode>;
    
    // Default capabilities inference logic
    inferCapabilities?: (modelId: string) => Record<string, boolean>;
}

// Complete provider configuration
export interface AIProviderConfig {
    // Provider identification
    providerId: string; // e.g., 'openai', 'grok', 'claude'
    
    // API configuration
    api: ProviderAPIConfig;
    
    // UI configuration
    ui: ProviderUIConfig;
    
    // Validation configuration
    validation?: ProviderValidationConfig;
    
    // Capabilities configuration
    capabilities?: ProviderCapabilitiesConfig;
    
    // Custom hooks or functions
    customHooks?: {
        useProviders?: () => any;
        useModelConfigs?: () => any;
        useFetchModels?: () => any;
    };
}

// Type-safe provider configurations
export type ProviderType = 'openai' | 'grok' | 'claude' | 'google' | 'openrouter';

// Provider-specific type extensions
export interface OpenAIProviderConfig extends AIProviderConfig {
    providerId: 'openai';
}

export interface GrokProviderConfig extends AIProviderConfig {
    providerId: 'grok';
}

export interface ClaudeProviderConfig extends AIProviderConfig {
    providerId: 'claude';
}

export interface GoogleProviderConfig extends AIProviderConfig {
    providerId: 'google';
}

export interface OpenRouterProviderConfig extends AIProviderConfig {
    providerId: 'openrouter';
}
