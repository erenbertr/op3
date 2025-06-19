import crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
    AIProviderConfig,
    AIProviderTestRequest,
    AIProviderTestResult,
    AIProviderType,
    DEFAULT_ENDPOINTS,
    API_KEY_PATTERNS,
    FALLBACK_MODELS
} from '../types/ai-provider';
import { VercelAIProviderService } from './vercelAIProviderService';

export class AIProviderService {
    private static instance: AIProviderService;
    private providers: Map<string, AIProviderConfig> = new Map();
    private encryptionKey: string;
    private configFilePath: string;

    private constructor() {
        // In production, this should come from environment variables
        this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

        // Create data directory if it doesn't exist
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        this.configFilePath = path.join(dataDir, 'ai-providers.json');
        this.loadProviders();
    }

    public static getInstance(): AIProviderService {
        if (!AIProviderService.instance) {
            AIProviderService.instance = new AIProviderService();
        }
        return AIProviderService.instance;
    }

    // Load providers from file
    private loadProviders(): void {
        try {
            if (fs.existsSync(this.configFilePath)) {
                const configData = fs.readFileSync(this.configFilePath, 'utf8');
                const providersArray: AIProviderConfig[] = JSON.parse(configData);

                // Convert array to Map
                this.providers.clear();
                for (const provider of providersArray) {
                    this.providers.set(provider.id!, provider);
                }

                console.log(`AI Provider Service: Loaded ${providersArray.length} provider(s) from file`);
            }
        } catch (error) {
            console.error('Error loading AI provider configurations:', error);
            this.providers.clear();
        }
    }

    // Save providers to file
    private saveProvidersToFile(): void {
        try {
            const providersArray = Array.from(this.providers.values());
            fs.writeFileSync(this.configFilePath, JSON.stringify(providersArray, null, 2));
            console.log(`AI Provider Service: Saved ${providersArray.length} provider(s) to file`);
        } catch (error) {
            console.error('Error saving AI provider configurations:', error);
        }
    }

    // Encrypt API key for secure storage
    private encryptApiKey(apiKey: string): string {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey.padEnd(32, '0').slice(0, 32)), iv);
        let encrypted = cipher.update(apiKey, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }

    // Decrypt API key for use
    public decryptApiKey(encryptedApiKey: string): string {
        try {
            const parts = encryptedApiKey.split(':');
            if (parts.length !== 2) {
                throw new Error(`Invalid encrypted API key format. Expected 'iv:encryptedText', got ${parts.length} parts`);
            }

            const ivHex = parts[0];
            const encryptedText = parts[1];

            if (!ivHex || !encryptedText) {
                throw new Error('Invalid encrypted API key: missing IV or encrypted text');
            }

            const iv = Buffer.from(ivHex, 'hex');
            if (iv.length !== 16) {
                throw new Error(`Invalid initialization vector length. Expected 16 bytes, got ${iv.length} bytes`);
            }

            const key = Buffer.from(this.encryptionKey.padEnd(32, '0').slice(0, 32));
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            console.error('Error decrypting API key:', error);
            throw new Error(`Failed to decrypt API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Validate API key format based on provider type
    public validateApiKeyFormat(type: AIProviderType, apiKey: string): boolean {
        const pattern = API_KEY_PATTERNS[type];
        if (!pattern) return true; // No validation for custom providers
        return pattern.test(apiKey);
    }

    // Get expected API key format description for better error messages
    public getApiKeyFormatDescription(type: AIProviderType): string {
        switch (type) {
            case 'openai':
                return 'OpenAI API keys should start with "sk-" followed by at least 20 characters (supports both regular and project-based keys)';
            case 'anthropic':
                return 'Anthropic API keys should start with "sk-ant-" followed by at least 95 characters';
            case 'google':
                return 'Google API keys should be at least 20 characters long';
            case 'replicate':
                return 'Replicate API keys should start with "r8_" followed by exactly 40 characters';
            case 'custom':
                return 'Custom provider API keys can have any format';
            default:
                return 'Invalid provider type';
        }
    }

    // Test connection to AI provider
    public async testConnection(request: AIProviderTestRequest): Promise<AIProviderTestResult> {
        const startTime = Date.now();

        try {
            // Validate API key format
            if (!this.validateApiKeyFormat(request.type, request.apiKey)) {
                return {
                    success: false,
                    message: `Invalid API key format for ${request.type}. ${this.getApiKeyFormatDescription(request.type)}`,
                    error: 'INVALID_API_KEY_FORMAT'
                };
            }

            const endpoint = request.endpoint || DEFAULT_ENDPOINTS[request.type];
            if (!endpoint) {
                return {
                    success: false,
                    message: 'Endpoint is required for custom providers',
                    error: 'MISSING_ENDPOINT'
                };
            }

            // Try using Vercel AI SDK first for supported providers
            if (['openai', 'anthropic', 'google', 'openrouter'].includes(request.type)) {
                const vercelAIService = VercelAIProviderService.getInstance();
                const providerConfig: AIProviderConfig = {
                    id: 'test',
                    type: request.type,
                    name: 'Test Provider',
                    apiKey: request.apiKey,
                    model: request.model,
                    endpoint: endpoint,
                    isActive: false
                };

                const vercelResult = await vercelAIService.testProviderWithVercelAI(providerConfig);
                const responseTime = Date.now() - startTime;

                if (vercelResult.success) {
                    return {
                        success: true,
                        message: `Successfully connected to ${request.type} using Vercel AI SDK`,
                        providerInfo: {
                            type: request.type,
                            endpoint,
                            responseTime,
                            model: request.model
                        }
                    };
                } else {
                    // Fall back to legacy testing if Vercel AI SDK fails
                    console.log(`Vercel AI SDK test failed for ${request.type}, falling back to legacy test:`, vercelResult.message);
                }
            }

            // Test the connection using legacy method
            const result = await this.testProviderConnection(request.type, request.apiKey, request.model, endpoint);
            const responseTime = Date.now() - startTime;

            if (result.success) {
                return {
                    success: true,
                    message: `Successfully connected to ${request.type}`,
                    providerInfo: {
                        type: request.type,
                        endpoint,
                        responseTime,
                        model: result.model
                    }
                };
            } else {
                return {
                    success: false,
                    message: result.message || `Failed to connect to ${request.type}`,
                    error: result.error
                };
            }
        } catch (error) {
            return {
                success: false,
                message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                error: 'CONNECTION_ERROR'
            };
        }
    }

    // Test specific provider connection
    private async testProviderConnection(
        type: AIProviderType,
        apiKey: string,
        model: string,
        endpoint: string
    ): Promise<{ success: boolean; message?: string; error?: string; model?: string }> {
        try {
            switch (type) {
                case 'openai':
                    return await this.testOpenAI(apiKey, model, endpoint);
                case 'anthropic':
                    return await this.testAnthropic(apiKey, model, endpoint);
                case 'google':
                    return await this.testGoogle(apiKey, model, endpoint);
                case 'replicate':
                    return await this.testReplicate(apiKey, model, endpoint);
                case 'openrouter':
                    return await this.testOpenRouter(apiKey, model, endpoint);
                case 'custom':
                    return await this.testCustomProvider(apiKey, model, endpoint);
                default:
                    return {
                        success: false,
                        message: `Unsupported provider type: ${type}`,
                        error: 'UNSUPPORTED_PROVIDER'
                    };
            }
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
                error: 'PROVIDER_ERROR'
            };
        }
    }

    // Test OpenAI connection
    private async testOpenAI(apiKey: string, model: string, endpoint: string): Promise<{ success: boolean; message?: string; error?: string; model?: string }> {
        try {
            const response = await fetch(`${endpoint}/models`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json() as any;
                const models = data.data || [];
                const firstModel = models.length > 0 ? models[0].id : 'Unknown';
                return {
                    success: true,
                    message: 'OpenAI connection successful',
                    model: model
                };
            } else {
                const errorData = await response.json().catch(() => ({})) as any;
                return {
                    success: false,
                    message: errorData.error?.message || `HTTP ${response.status}`,
                    error: 'API_ERROR'
                };
            }
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Network error',
                error: 'NETWORK_ERROR'
            };
        }
    }

    // Test Anthropic connection
    private async testAnthropic(apiKey: string, model: string, endpoint: string): Promise<{ success: boolean; message?: string; error?: string; model?: string }> {
        try {
            // Anthropic doesn't have a simple models endpoint, so we'll make a minimal completion request
            const response = await fetch(`${endpoint}/v1/messages`, {
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: model,
                    max_tokens: 1,
                    messages: [{ role: 'user', content: 'test' }]
                })
            });

            if (response.ok || response.status === 400) { // 400 might be expected for minimal request
                return {
                    success: true,
                    message: 'Anthropic connection successful',
                    model: model
                };
            } else {
                const errorData = await response.json().catch(() => ({})) as any;
                return {
                    success: false,
                    message: errorData.error?.message || `HTTP ${response.status}`,
                    error: 'API_ERROR'
                };
            }
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Network error',
                error: 'NETWORK_ERROR'
            };
        }
    }

    // Test Google connection
    private async testGoogle(apiKey: string, model: string, endpoint: string): Promise<{ success: boolean; message?: string; error?: string; model?: string }> {
        try {
            const response = await fetch(`${endpoint}/v1/models?key=${apiKey}`);

            if (response.ok) {
                const data = await response.json() as any;
                const models = data.models || [];
                const firstModel = models.length > 0 ? models[0].name : 'Unknown';
                return {
                    success: true,
                    message: 'Google connection successful',
                    model: model
                };
            } else {
                const errorData = await response.json().catch(() => ({})) as any;
                return {
                    success: false,
                    message: errorData.error?.message || `HTTP ${response.status}`,
                    error: 'API_ERROR'
                };
            }
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Network error',
                error: 'NETWORK_ERROR'
            };
        }
    }

    // Test Replicate connection
    private async testReplicate(apiKey: string, model: string, endpoint: string): Promise<{ success: boolean; message?: string; error?: string; model?: string }> {
        try {
            const response = await fetch(`${endpoint}/v1/account`, {
                headers: {
                    'Authorization': `Token ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                return {
                    success: true,
                    message: 'Replicate connection successful',
                    model: model
                };
            } else {
                const errorData = await response.json().catch(() => ({})) as any;
                return {
                    success: false,
                    message: errorData.detail || `HTTP ${response.status}`,
                    error: 'API_ERROR'
                };
            }
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Network error',
                error: 'NETWORK_ERROR'
            };
        }
    }

    // Test OpenRouter connection
    private async testOpenRouter(apiKey: string, model: string, endpoint: string): Promise<{ success: boolean; message?: string; error?: string; model?: string }> {
        try {
            // Test with a simple models list request
            const response = await fetch(`${endpoint}/models`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json() as any;
                // Check if the response has the expected structure
                if (data && Array.isArray(data.data)) {
                    return {
                        success: true,
                        message: 'OpenRouter connection successful',
                        model: model
                    };
                } else {
                    return {
                        success: false,
                        message: 'Invalid response format from OpenRouter API',
                        error: 'INVALID_RESPONSE'
                    };
                }
            } else {
                const errorData = await response.json().catch(() => ({})) as any;
                return {
                    success: false,
                    message: errorData.error?.message || `HTTP ${response.status}`,
                    error: 'API_ERROR'
                };
            }
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Network error',
                error: 'NETWORK_ERROR'
            };
        }
    }

    // Test custom provider connection
    private async testCustomProvider(apiKey: string, model: string, endpoint: string): Promise<{ success: boolean; message?: string; error?: string; model?: string }> {
        try {
            // For custom providers, we'll try a simple GET request to the endpoint
            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                return {
                    success: true,
                    message: 'Custom provider connection successful',
                    model: model
                };
            } else {
                return {
                    success: false,
                    message: `HTTP ${response.status}`,
                    error: 'API_ERROR'
                };
            }
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Network error',
                error: 'NETWORK_ERROR'
            };
        }
    }

    // Save AI provider configurations
    public async saveProviders(providers: AIProviderConfig[]): Promise<{ success: boolean; message: string; savedProviders?: AIProviderConfig[] }> {
        try {
            const savedProviders: AIProviderConfig[] = [];

            for (const provider of providers) {
                // Encrypt the API key before storing
                const encryptedProvider = {
                    ...provider,
                    id: provider.id || crypto.randomUUID(),
                    apiKey: this.encryptApiKey(provider.apiKey),
                    createdAt: provider.createdAt || new Date(),
                    updatedAt: new Date()
                };

                this.providers.set(encryptedProvider.id, encryptedProvider);
                savedProviders.push({
                    ...encryptedProvider,
                    apiKey: '***' // Don't return the actual API key
                });
            }

            // Persist to file
            this.saveProvidersToFile();

            return {
                success: true,
                message: `Successfully saved ${savedProviders.length} AI provider(s)`,
                savedProviders
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to save providers: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    // Get all configured providers (with masked API keys)
    public getProviders(): AIProviderConfig[] {
        return Array.from(this.providers.values()).map(provider => ({
            ...provider,
            apiKey: '***' // Mask the API key
        }));
    }

    // Get all configured providers with encrypted API keys (for internal use only)
    public getProvidersWithEncryptedKeys(): AIProviderConfig[] {
        return Array.from(this.providers.values());
    }

    // Delete a provider by ID
    public deleteProvider(providerId: string): { success: boolean; message: string } {
        try {
            if (!this.providers.has(providerId)) {
                return {
                    success: false,
                    message: 'AI provider not found'
                };
            }

            this.providers.delete(providerId);
            this.saveProvidersToFile();

            return {
                success: true,
                message: 'AI provider deleted successfully'
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to delete provider: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    // Check if any providers are configured
    public hasProviders(): boolean {
        return this.providers.size > 0;
    }

    // Get available models for a provider (unified method)
    public async getAvailableModels(type: AIProviderType, apiKey: string, endpoint?: string): Promise<{
        success: boolean;
        models?: Array<{ id: string; name: string; description?: string }>;
        error?: string;
    }> {
        try {
            // Try to use Vercel AI SDK for supported providers first
            if (['openai', 'anthropic', 'google', 'openrouter', 'grok'].includes(type)) {
                const vercelAIService = VercelAIProviderService.getInstance();
                const result = await vercelAIService.getAvailableModels(type, apiKey);

                if (result.success && result.models) {
                    return {
                        success: true,
                        models: result.models
                    };
                }

                // Log the fallback but continue with existing methods
                console.log(`Vercel AI SDK model fetching failed for ${type}, using existing methods:`, result.error);
            }

            // Use existing provider-specific methods as fallback
            switch (type) {
                case 'openai':
                    const openaiResult = await this.fetchOpenAIModels(apiKey);
                    return {
                        success: openaiResult.success,
                        models: openaiResult.models?.map(m => ({
                            id: m.id,
                            name: m.name || m.id,
                            description: m.description
                        })),
                        error: openaiResult.error
                    };

                case 'anthropic':
                    const anthropicResult = await this.fetchAnthropicModels(apiKey);
                    return {
                        success: anthropicResult.success,
                        models: anthropicResult.models?.map(m => ({
                            id: m.id,
                            name: m.name || m.id,
                            description: m.description
                        })),
                        error: anthropicResult.error
                    };

                case 'google':
                    const googleResult = await this.fetchGoogleModels(apiKey);
                    return {
                        success: googleResult.success,
                        models: googleResult.models?.map(m => ({
                            id: m.id,
                            name: m.name || m.id,
                            description: m.description
                        })),
                        error: googleResult.error
                    };

                case 'openrouter':
                    const openrouterResult = await this.fetchOpenRouterModels(apiKey);
                    return {
                        success: openrouterResult.success,
                        models: openrouterResult.models?.map(m => ({
                            id: m.id,
                            name: m.name || m.id,
                            description: m.description
                        })),
                        error: openrouterResult.error
                    };

                case 'grok':
                    const grokResult = await this.fetchGrokModels(apiKey);
                    return {
                        success: grokResult.success,
                        models: grokResult.models?.map(m => ({
                            id: m.id,
                            name: m.name || m.id,
                            description: m.description
                        })),
                        error: grokResult.error
                    };

                default:
                    // Use fallback models for unsupported providers
                    const fallbackModelIds = FALLBACK_MODELS[type as keyof typeof FALLBACK_MODELS] || [];
                    const models: Array<{ id: string; name: string; description?: string }> = fallbackModelIds.map(id => ({
                        id,
                        name: id,
                        description: `${type} model`
                    }));
                    return {
                        success: true,
                        models
                    };
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    // Fetch available models from OpenAI
    public async fetchOpenAIModels(apiKey: string): Promise<{ success: boolean; models?: any[]; message?: string; error?: string }> {
        try {
            const endpoint = DEFAULT_ENDPOINTS.openai;
            if (!endpoint) {
                return {
                    success: false,
                    message: 'OpenAI endpoint not configured',
                    error: 'MISSING_ENDPOINT'
                };
            }

            const response = await fetch(`${endpoint}/models`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json() as any;
                if (data && Array.isArray(data.data)) {
                    // Add basic enhancements using only the data from /v1/models endpoint
                    const enhancedModels = this.addBasicEnhancements(data.data);

                    return {
                        success: true,
                        models: enhancedModels,
                        message: 'Models fetched successfully'
                    };
                } else {
                    return {
                        success: false,
                        message: 'Invalid response format from OpenAI API',
                        error: 'INVALID_RESPONSE'
                    };
                }
            } else {
                const errorData = await response.json().catch(() => ({})) as any;
                return {
                    success: false,
                    message: errorData.error?.message || `HTTP ${response.status}`,
                    error: 'API_ERROR'
                };
            }
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Network error',
                error: 'NETWORK_ERROR'
            };
        }
    }

    // Fetch available models from OpenRouter
    public async fetchOpenRouterModels(apiKey: string): Promise<{ success: boolean; models?: any[]; message?: string; error?: string }> {
        try {
            const endpoint = DEFAULT_ENDPOINTS.openrouter;
            if (!endpoint) {
                return {
                    success: false,
                    message: 'OpenRouter endpoint not configured',
                    error: 'MISSING_ENDPOINT'
                };
            }

            const response = await fetch(`${endpoint}/models`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json() as any;
                if (data && Array.isArray(data.data)) {
                    return {
                        success: true,
                        models: data.data,
                        message: 'Models fetched successfully'
                    };
                } else {
                    return {
                        success: false,
                        message: 'Invalid response format from OpenRouter API',
                        error: 'INVALID_RESPONSE'
                    };
                }
            } else {
                const errorData = await response.json().catch(() => ({})) as any;
                return {
                    success: false,
                    message: errorData.error?.message || `HTTP ${response.status}`,
                    error: 'API_ERROR'
                };
            }
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Network error',
                error: 'NETWORK_ERROR'
            };
        }
    }

    // Fetch available models from Grok (xAI)
    public async fetchGrokModels(apiKey: string): Promise<{ success: boolean; models?: any[]; message?: string; error?: string }> {
        try {
            // Try to fetch models from xAI API
            const response = await fetch('https://api.x.ai/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json() as any;

                // Transform xAI API response to our format
                const models = data.data?.map((model: any) => ({
                    id: model.id,
                    name: model.id.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
                    description: model.description || `${model.id} model`,
                    capabilities: ['reasoning', 'search'] // All Grok models support reasoning and search
                })) || [];

                return {
                    success: true,
                    models,
                    message: 'Models fetched successfully from xAI API'
                };
            } else {
                // If API call fails, fall back to known models
                console.warn('xAI API call failed, using fallback models');
                const fallbackModels = [
                    { id: 'grok-beta', name: 'Grok Beta', capabilities: ['reasoning', 'search'] },
                    { id: 'grok-2', name: 'Grok 2', capabilities: ['reasoning', 'search'] },
                    { id: 'grok-2-1212', name: 'Grok 2 1212', capabilities: ['reasoning', 'search'] },
                    { id: 'grok-2-vision-1212', name: 'Grok 2 Vision 1212', capabilities: ['reasoning', 'search', 'vision'] }
                ];

                return {
                    success: true,
                    models: fallbackModels,
                    message: 'Models fetched successfully (using fallback list - API call failed)'
                };
            }
        } catch (error) {
            // If there's an error, fall back to known models
            console.warn('Error fetching Grok models, using fallback:', error);
            const fallbackModels = [
                { id: 'grok-beta', name: 'Grok Beta', capabilities: ['reasoning', 'search'] },
                { id: 'grok-2', name: 'Grok 2', capabilities: ['reasoning', 'search'] },
                { id: 'grok-2-1212', name: 'Grok 2 1212', capabilities: ['reasoning', 'search'] },
                { id: 'grok-2-vision-1212', name: 'Grok 2 Vision 1212', capabilities: ['reasoning', 'search', 'vision'] }
            ];

            return {
                success: true,
                models: fallbackModels,
                message: 'Models fetched successfully (using fallback list - network error)'
            };
        }
    }

    // Fetch available models from Anthropic
    public async fetchAnthropicModels(apiKey: string): Promise<{ success: boolean; models?: any[]; message?: string; error?: string }> {
        try {
            // Anthropic doesn't have a public models endpoint, so we return known models
            const fallbackModels = [
                { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', capabilities: ['reasoning', 'vision', 'image', 'pdf', 'fileUpload'] },
                { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', capabilities: ['reasoning', 'vision', 'image', 'pdf', 'fileUpload'] },
                { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', capabilities: ['reasoning', 'vision', 'image', 'pdf', 'fileUpload'] }
            ];

            return {
                success: true,
                models: fallbackModels,
                message: 'Models fetched successfully (using known model list)'
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Network error',
                error: 'NETWORK_ERROR'
            };
        }
    }

    // Fetch available models from Google
    public async fetchGoogleModels(apiKey: string): Promise<{ success: boolean; models?: any[]; message?: string; error?: string }> {
        try {
            const endpoint = DEFAULT_ENDPOINTS.google;
            if (!endpoint) {
                return {
                    success: false,
                    message: 'Google endpoint not configured',
                    error: 'MISSING_ENDPOINT'
                };
            }

            const response = await fetch(`${endpoint}/v1/models?key=${apiKey}`);

            if (response.ok) {
                const data = await response.json() as any;
                if (data && Array.isArray(data.models)) {
                    // Filter and format Google models
                    const formattedModels = data.models
                        .filter((model: any) => model.name && model.name.includes('gemini'))
                        .map((model: any) => ({
                            id: model.name.replace('models/', ''),
                            name: model.displayName || model.name,
                            capabilities: this.inferGoogleModelCapabilities(model.name)
                        }));

                    return {
                        success: true,
                        models: formattedModels,
                        message: 'Models fetched successfully'
                    };
                } else {
                    return {
                        success: false,
                        message: 'Invalid response format from Google API',
                        error: 'INVALID_RESPONSE'
                    };
                }
            } else {
                const errorData = await response.json().catch(() => ({})) as any;
                return {
                    success: false,
                    message: errorData.error?.message || `HTTP ${response.status}`,
                    error: 'API_ERROR'
                };
            }
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Network error',
                error: 'NETWORK_ERROR'
            };
        }
    }

    // Add basic enhancements without making additional API calls (fast)
    private addBasicEnhancements(models: any[]): any[] {
        return models.map(model => ({
            ...model,
            capabilities: this.inferModelCapabilities(model.id),
            category: this.categorizeModel(model.id),
            isRecommended: this.isRecommendedModel(model.id)
        }));
    }



    // Infer model capabilities based on model ID
    private inferModelCapabilities(modelId: string): any {
        const capabilities: any = {};

        if (modelId.includes('o1')) {
            capabilities.reasoning = true;
            capabilities.complexTasks = true;
        }

        if (modelId.includes('gpt-4o')) {
            capabilities.vision = true;
            capabilities.multimodal = true;
            capabilities.functionCalling = true;
            capabilities.webSearch = true;
            capabilities.fileUpload = true;
        }

        if (modelId.includes('gpt-4')) {
            capabilities.functionCalling = true;
            capabilities.reasoning = true;
            if (modelId.includes('turbo')) {
                capabilities.webSearch = true;
            }
            if (modelId.includes('vision')) {
                capabilities.vision = true;
                capabilities.multimodal = true;
            }
        }

        if (modelId.includes('gpt-3.5')) {
            capabilities.functionCalling = true;
            capabilities.fastResponse = true;
        }

        return capabilities;
    }

    // Categorize models for better organization
    private categorizeModel(modelId: string): string {
        if (modelId.includes('o1')) return 'reasoning';
        if (modelId.includes('gpt-4o')) return 'multimodal';
        if (modelId.includes('gpt-4')) return 'advanced';
        if (modelId.includes('gpt-3.5')) return 'standard';
        if (modelId.includes('whisper')) return 'audio';
        if (modelId.includes('dall-e')) return 'image-generation';
        if (modelId.includes('tts')) return 'text-to-speech';
        if (modelId.includes('embedding')) return 'embedding';
        return 'other';
    }

    // Infer Google model capabilities based on model name
    private inferGoogleModelCapabilities(modelName: string): string[] {
        const capabilities: string[] = ['reasoning', 'search']; // All Gemini models support web search

        if (modelName.includes('gemini-1.5') || modelName.includes('gemini-2.0')) {
            capabilities.push('vision', 'image', 'pdf', 'functionCalling', 'codeInterpreter');
        }

        return capabilities;
    }

    // Determine if model is recommended for general use
    private isRecommendedModel(modelId: string): boolean {
        const recommendedModels = [
            'gpt-4o',
            'gpt-4o-mini',
            'gpt-4-turbo',
            'o1-preview',
            'o1-mini'
        ];
        return recommendedModels.some(recommended => modelId.includes(recommended));
    }

    // Refresh model metadata from APIs
    public async refreshModelMetadata(modelId: string, apiKey: string): Promise<{ success: boolean; message: string; data?: any }> {
        try {
            // Fetch fresh model data from OpenAI API
            const response = await fetch(`https://api.openai.com/v1/models/${modelId}`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                return {
                    success: false,
                    message: `Failed to fetch model data: ${response.status} ${response.statusText}`
                };
            }

            const modelData = await response.json();

            // Enhance with capabilities and other metadata
            const enhancedData = {
                ...(modelData || {}),
                capabilities: this.inferModelCapabilities(modelId),
                category: this.categorizeModel(modelId),
                isRecommended: this.isRecommendedModel(modelId),
                lastUpdated: new Date().toISOString()
            };

            return {
                success: true,
                message: 'Model metadata refreshed successfully',
                data: enhancedData
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to refresh model metadata'
            };
        }
    }
}
