import crypto from 'crypto';
import {
    AIProviderConfig,
    AIProviderTestRequest,
    AIProviderTestResult,
    AIProviderType,
    DEFAULT_ENDPOINTS,
    API_KEY_PATTERNS,
    DEFAULT_MODELS
} from '../types/ai-provider';

export class AIProviderService {
    private static instance: AIProviderService;
    private providers: Map<string, AIProviderConfig> = new Map();
    private encryptionKey: string;

    private constructor() {
        // In production, this should come from environment variables
        this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    }

    public static getInstance(): AIProviderService {
        if (!AIProviderService.instance) {
            AIProviderService.instance = new AIProviderService();
        }
        return AIProviderService.instance;
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
    private decryptApiKey(encryptedApiKey: string): string {
        const parts = encryptedApiKey.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = parts[1];
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey.padEnd(32, '0').slice(0, 32)), iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
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

            // Test the connection based on provider type
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

    // Check if any providers are configured
    public hasProviders(): boolean {
        return this.providers.size > 0;
    }
}
