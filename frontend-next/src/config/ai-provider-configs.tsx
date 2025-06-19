/**
 * Provider-specific configurations for the reusable AI Provider Settings component
 */

import React from 'react';
import { Bot, Brain, Search, FileUp, Image, FileText, Eye, Code, Calculator, Zap } from 'lucide-react';
import {
    AIProviderConfig,
    OpenAIProviderConfig,
    GrokProviderConfig,
    ClaudeProviderConfig,
    GoogleProviderConfig,
    OpenRouterProviderConfig
} from '@/types/ai-provider-config';

// OpenAI Configuration
export const openaiConfig: OpenAIProviderConfig = {
    providerId: 'openai',
    api: {
        providersEndpoint: '/openai-providers',
        modelConfigsEndpoint: '/openai-model-configs',
        fetchModelsEndpoint: '/ai-providers/openai/models',
        providersQueryKey: 'openai-keys',
        modelConfigsQueryKey: 'openai-model-configs'
    },
    ui: {
        displayName: 'OpenAI',
        description: 'Configure OpenAI API and models',
        icon: <Bot className="h-5 w-5" />,
        modelsTabLabel: 'Models',
        keysTabLabel: 'API Keys',
        modelsTabDescription: 'Configure models for each API key',
        keysTabDescription: 'Manage your OpenAI API keys',
        noKeysTitle: 'No API Keys',
        noKeysDescription: 'You haven\'t added any OpenAI API keys yet. Add your first key to get started with OpenAI models.',
        noModelsTitle: 'No Models',
        noModelsDescription: 'Add an OpenAI API key first to configure models',
        addKeyButtonLabel: 'Add Your First API Key',
        addModelButtonLabel: 'Add Model',
        addKeyModalTitle: 'Add New API Key',
        editKeyModalTitle: 'Edit API Key',
        addKeyModalDescription: 'Add a new OpenAI API key with a custom name',
        editKeyModalDescription: 'Update your OpenAI API key configuration'
    },
    validation: {
        validateApiKeyFormat: (apiKey: string) => {
            return apiKey.startsWith('sk-') && apiKey.length >= 23;
        },
        apiKeyFormatErrorMessage: 'Invalid OpenAI API key format. Keys should start with "sk-" followed by at least 20 characters.'
    },
    capabilities: {
        availableCapabilities: ['reasoning', 'search', 'fileUpload', 'image', 'pdf', 'vision', 'functionCalling', 'codeInterpreter'],
        capabilityLabels: {
            reasoning: 'Reasoning',
            search: 'Search',
            fileUpload: 'File Upload',
            image: 'Image',
            pdf: 'PDF',
            vision: 'Vision',
            functionCalling: 'Function Calling',
            codeInterpreter: 'Code Interpreter'
        },
        capabilityIcons: {
            reasoning: <Brain className="h-4 w-4" />,
            search: <Search className="h-4 w-4" />,
            fileUpload: <FileUp className="h-4 w-4" />,
            image: <Image className="h-4 w-4" />,
            pdf: <FileText className="h-4 w-4" />,
            vision: <Eye className="h-4 w-4" />,
            functionCalling: <Code className="h-4 w-4" />,
            codeInterpreter: <Calculator className="h-4 w-4" />
        },
        inferCapabilities: (modelId: string) => {
            const capabilities: Record<string, boolean> = {};

            if (modelId.includes('o1')) {
                capabilities.reasoning = true;
            } else if (modelId.includes('gpt-4o')) {
                capabilities.reasoning = true;
                capabilities.search = true;
                capabilities.vision = true;
                capabilities.image = true;
                capabilities.pdf = true;
                capabilities.functionCalling = true;
                capabilities.codeInterpreter = true;
                capabilities.fileUpload = true;
            } else if (modelId.includes('gpt-4')) {
                capabilities.reasoning = true;
                capabilities.functionCalling = true;
                if (modelId.includes('turbo')) {
                    capabilities.search = true;
                    capabilities.codeInterpreter = true;
                    capabilities.fileUpload = true;
                }
                if (modelId.includes('vision')) {
                    capabilities.vision = true;
                    capabilities.image = true;
                }
            }

            return capabilities;
        }
    }
};

// Grok Configuration
export const grokConfig: GrokProviderConfig = {
    providerId: 'grok',
    api: {
        providersEndpoint: '/grok-providers',
        modelConfigsEndpoint: '', // Not implemented yet
        fetchModelsEndpoint: '/ai-providers/grok/models',
        providersQueryKey: 'grok-keys',
        modelConfigsQueryKey: 'grok-model-configs'
    },
    ui: {
        displayName: 'xAI (Grok)',
        description: 'Configure xAI API and Grok models',
        icon: <Zap className="h-5 w-5" />,
        modelsTabLabel: 'Models',
        keysTabLabel: 'API Keys',
        modelsTabDescription: 'Configure models for each API key',
        keysTabDescription: 'Manage your xAI API keys',
        noKeysTitle: 'No API Keys',
        noKeysDescription: 'You haven\'t added any xAI API keys yet. Add your first key to get started with Grok models.',
        noModelsTitle: 'No Models',
        noModelsDescription: 'Add an xAI API key first to configure Grok models',
        addKeyButtonLabel: 'Add Your First API Key',
        addModelButtonLabel: 'Add Model',
        addKeyModalTitle: 'Add New API Key',
        editKeyModalTitle: 'Edit API Key',
        addKeyModalDescription: 'Add a new xAI API key with a custom name',
        editKeyModalDescription: 'Update your xAI API key configuration'
    },
    validation: {
        validateApiKeyFormat: (apiKey: string) => {
            return apiKey.startsWith('xai-') && apiKey.length >= 20;
        },
        apiKeyFormatErrorMessage: 'Invalid xAI API key format. Keys should start with "xai-" followed by at least 16 characters.'
    },
    capabilities: {
        availableCapabilities: ['reasoning', 'search'],
        capabilityLabels: {
            reasoning: 'Reasoning',
            search: 'Search'
        },
        capabilityIcons: {
            reasoning: <Brain className="h-4 w-4" />,
            search: <Search className="h-4 w-4" />
        },
        inferCapabilities: (modelId: string) => {
            return {
                reasoning: true,
                search: modelId.includes('grok-2') || modelId.includes('grok-beta')
            };
        }
    }
};

// Claude Configuration
export const claudeConfig: ClaudeProviderConfig = {
    providerId: 'claude',
    api: {
        providersEndpoint: '/anthropic-providers',
        modelConfigsEndpoint: '', // Not implemented yet
        fetchModelsEndpoint: '/ai-providers/anthropic/models',
        providersQueryKey: 'anthropic-keys',
        modelConfigsQueryKey: 'anthropic-model-configs'
    },
    ui: {
        displayName: 'Anthropic (Claude)',
        description: 'Configure Anthropic API and Claude models',
        icon: <Bot className="h-5 w-5" />,
        modelsTabLabel: 'Models',
        keysTabLabel: 'API Keys',
        modelsTabDescription: 'Configure models for each API key',
        keysTabDescription: 'Manage your Anthropic API keys',
        noKeysTitle: 'No API Keys',
        noKeysDescription: 'You haven\'t added any Anthropic API keys yet. Add your first key to get started with Claude models.',
        noModelsTitle: 'No Models',
        noModelsDescription: 'Add an Anthropic API key first to configure Claude models',
        addKeyButtonLabel: 'Add Your First API Key',
        addModelButtonLabel: 'Add Model',
        addKeyModalTitle: 'Add New API Key',
        editKeyModalTitle: 'Edit API Key',
        addKeyModalDescription: 'Add a new Anthropic API key with a custom name',
        editKeyModalDescription: 'Update your Anthropic API key configuration'
    },
    validation: {
        validateApiKeyFormat: (apiKey: string) => {
            return apiKey.startsWith('sk-ant-') && apiKey.length >= 20;
        },
        apiKeyFormatErrorMessage: 'Invalid Anthropic API key format. Keys should start with "sk-ant-" followed by additional characters.'
    },
    capabilities: {
        availableCapabilities: ['reasoning', 'vision', 'image', 'pdf', 'fileUpload'],
        capabilityLabels: {
            reasoning: 'Reasoning',
            vision: 'Vision',
            image: 'Image',
            pdf: 'PDF',
            fileUpload: 'File Upload'
        },
        capabilityIcons: {
            reasoning: <Brain className="h-4 w-4" />,
            vision: <Eye className="h-4 w-4" />,
            image: <Image className="h-4 w-4" />,
            pdf: <FileText className="h-4 w-4" />,
            fileUpload: <FileUp className="h-4 w-4" />
        },
        inferCapabilities: (modelId: string) => {
            const capabilities: Record<string, boolean> = {
                reasoning: true
            };

            if (modelId.includes('claude-3')) {
                capabilities.vision = true;
                capabilities.image = true;
                capabilities.pdf = true;
                capabilities.fileUpload = true;
            }

            return capabilities;
        }
    }
};

// Google Configuration
export const googleConfig: GoogleProviderConfig = {
    providerId: 'google',
    api: {
        providersEndpoint: '/google-providers',
        modelConfigsEndpoint: '', // Not implemented yet
        fetchModelsEndpoint: '/ai-providers/google/models',
        providersQueryKey: 'google-keys',
        modelConfigsQueryKey: 'google-model-configs'
    },
    ui: {
        displayName: 'Google (Gemini)',
        description: 'Configure Google API and Gemini models',
        icon: <Bot className="h-5 w-5" />,
        modelsTabLabel: 'Models',
        keysTabLabel: 'API Keys',
        modelsTabDescription: 'Configure models for each API key',
        keysTabDescription: 'Manage your Google API keys',
        noKeysTitle: 'No API Keys',
        noKeysDescription: 'You haven\'t added any Google API keys yet. Add your first key to get started with Gemini models.',
        noModelsTitle: 'No Models',
        noModelsDescription: 'Add a Google API key first to configure Gemini models',
        addKeyButtonLabel: 'Add Your First API Key',
        addModelButtonLabel: 'Add Model',
        addKeyModalTitle: 'Add New API Key',
        editKeyModalTitle: 'Edit API Key',
        addKeyModalDescription: 'Add a new Google API key with a custom name',
        editKeyModalDescription: 'Update your Google API key configuration'
    },
    validation: {
        validateApiKeyFormat: (apiKey: string) => {
            return apiKey.length >= 20; // Google API keys vary in format
        },
        apiKeyFormatErrorMessage: 'Invalid Google API key format. Please check your API key.'
    },
    capabilities: {
        availableCapabilities: ['reasoning', 'vision', 'image', 'pdf', 'functionCalling', 'codeInterpreter'],
        capabilityLabels: {
            reasoning: 'Reasoning',
            vision: 'Vision',
            image: 'Image',
            pdf: 'PDF',
            functionCalling: 'Function Calling',
            codeInterpreter: 'Code Interpreter'
        },
        capabilityIcons: {
            reasoning: <Brain className="h-4 w-4" />,
            vision: <Eye className="h-4 w-4" />,
            image: <Image className="h-4 w-4" />,
            pdf: <FileText className="h-4 w-4" />,
            functionCalling: <Code className="h-4 w-4" />,
            codeInterpreter: <Calculator className="h-4 w-4" />
        },
        inferCapabilities: (modelId: string) => {
            const capabilities: Record<string, boolean> = {
                reasoning: true
            };

            if (modelId.includes('gemini-1.5') || modelId.includes('gemini-2.0')) {
                capabilities.vision = true;
                capabilities.image = true;
                capabilities.pdf = true;
                capabilities.functionCalling = true;
                capabilities.codeInterpreter = true;
            }

            return capabilities;
        }
    }
};

// OpenRouter Configuration
export const openrouterConfig: OpenRouterProviderConfig = {
    providerId: 'openrouter',
    api: {
        providersEndpoint: '', // Not implemented yet - uses global config
        modelConfigsEndpoint: '', // Not implemented yet - uses global config
        fetchModelsEndpoint: '/ai-providers/openrouter/models',
        providersQueryKey: 'openrouter-keys',
        modelConfigsQueryKey: 'openrouter-model-configs'
    },
    ui: {
        displayName: 'OpenRouter',
        description: 'Configure OpenRouter API and models',
        icon: <Bot className="h-5 w-5" />,
        modelsTabLabel: 'Models',
        keysTabLabel: 'API Keys',
        modelsTabDescription: 'Configure models for each API key',
        keysTabDescription: 'Manage your OpenRouter API keys',
        noKeysTitle: 'No API Keys',
        noKeysDescription: 'You haven\'t added any OpenRouter API keys yet. Add your first key to get started with OpenRouter models.',
        noModelsTitle: 'No Models',
        noModelsDescription: 'Add an OpenRouter API key first to configure models',
        addKeyButtonLabel: 'Add Your First API Key',
        addModelButtonLabel: 'Add Model',
        addKeyModalTitle: 'Add New API Key',
        editKeyModalTitle: 'Edit API Key',
        addKeyModalDescription: 'Add a new OpenRouter API key with a custom name',
        editKeyModalDescription: 'Update your OpenRouter API key configuration'
    },
    validation: {
        validateApiKeyFormat: (apiKey: string) => {
            return apiKey.startsWith('sk-or-') && apiKey.length >= 20;
        },
        apiKeyFormatErrorMessage: 'Invalid OpenRouter API key format. Keys should start with "sk-or-" followed by additional characters.'
    },
    capabilities: {
        availableCapabilities: ['reasoning', 'search', 'vision', 'image', 'functionCalling'],
        capabilityLabels: {
            reasoning: 'Reasoning',
            search: 'Search',
            vision: 'Vision',
            image: 'Image',
            functionCalling: 'Function Calling'
        },
        capabilityIcons: {
            reasoning: <Brain className="h-4 w-4" />,
            search: <Search className="h-4 w-4" />,
            vision: <Eye className="h-4 w-4" />,
            image: <Image className="h-4 w-4" />,
            functionCalling: <Code className="h-4 w-4" />
        },
        inferCapabilities: (modelId: string) => {
            // OpenRouter capabilities depend on the underlying model
            const capabilities: Record<string, boolean> = {};

            if (modelId.includes('gpt-4') || modelId.includes('claude') || modelId.includes('gemini')) {
                capabilities.reasoning = true;
            }

            if (modelId.includes('vision') || modelId.includes('gpt-4o') || modelId.includes('claude-3') || modelId.includes('gemini-1.5')) {
                capabilities.vision = true;
                capabilities.image = true;
            }

            return capabilities;
        }
    }
};
