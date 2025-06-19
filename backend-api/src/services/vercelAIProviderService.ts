import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, streamText, LanguageModel } from 'ai';
import { AIProviderConfig, AIProviderType } from '../types/ai-provider';
import { AIProviderService } from './aiProviderService';

/**
 * Service that bridges our existing AI provider configuration system
 * with Vercel AI SDK providers
 */
export class VercelAIProviderService {
    private static instance: VercelAIProviderService;
    private aiProviderService: AIProviderService;

    private constructor() {
        this.aiProviderService = AIProviderService.getInstance();
    }

    public static getInstance(): VercelAIProviderService {
        if (!VercelAIProviderService.instance) {
            VercelAIProviderService.instance = new VercelAIProviderService();
        }
        return VercelAIProviderService.instance;
    }

    /**
     * Create a Vercel AI SDK language model instance from our provider configuration
     */
    public createLanguageModel(providerConfig: AIProviderConfig): LanguageModel {
        const apiKey = this.aiProviderService.decryptApiKey(providerConfig.apiKey);

        switch (providerConfig.type) {
            case 'openai':
                // Create OpenAI provider instance with API key
                const openaiProvider = createOpenAI({
                    apiKey,
                    baseURL: providerConfig.endpoint || 'https://api.openai.com/v1'
                });
                return openaiProvider(providerConfig.model);

            case 'anthropic':
                // Create Anthropic provider instance with API key
                const anthropicProvider = createAnthropic({
                    apiKey,
                    baseURL: providerConfig.endpoint || 'https://api.anthropic.com'
                });
                return anthropicProvider(providerConfig.model);

            case 'google':
                // Create Google provider instance with API key
                const googleProvider = createGoogleGenerativeAI({
                    apiKey,
                    baseURL: providerConfig.endpoint || 'https://generativelanguage.googleapis.com'
                });
                return googleProvider(providerConfig.model);

            case 'openrouter':
                const openrouter = createOpenRouter({
                    apiKey,
                    baseURL: providerConfig.endpoint || 'https://openrouter.ai/api/v1'
                });
                return openrouter.chat(providerConfig.model);

            case 'custom':
                // For custom providers, assume OpenAI-compatible API
                const customProvider = createOpenAI({
                    apiKey,
                    baseURL: providerConfig.endpoint
                });
                return customProvider(providerConfig.model);

            default:
                throw new Error(`Unsupported provider type: ${providerConfig.type}`);
        }
    }

    /**
     * Get the active provider configuration and create a language model
     */
    public getActiveLanguageModel(): LanguageModel | null {
        const providers = this.aiProviderService.getProvidersWithEncryptedKeys();
        const activeProvider = providers.find(p => p.isActive);

        if (!activeProvider) {
            return null;
        }

        return this.createLanguageModel(activeProvider);
    }

    /**
     * Get a specific provider by ID and create a language model
     */
    public getLanguageModelById(providerId: string): LanguageModel | null {
        const providers = this.aiProviderService.getProvidersWithEncryptedKeys();
        const provider = providers.find(p => p.id === providerId);

        if (!provider) {
            return null;
        }

        return this.createLanguageModel(provider);
    }

    /**
     * Test a provider configuration using Vercel AI SDK
     */
    public async testProviderWithVercelAI(providerConfig: AIProviderConfig): Promise<{
        success: boolean;
        message: string;
        error?: string;
    }> {
        try {
            const model = this.createLanguageModel(providerConfig);

            // Test with a simple generation
            const result = await generateText({
                model,
                prompt: 'Say "test" and nothing else.',
                maxTokens: 10,
                temperature: 0
            });

            if (result.text) {
                return {
                    success: true,
                    message: `Successfully tested ${providerConfig.type} provider`
                };
            } else {
                return {
                    success: false,
                    message: 'Provider test failed: No response generated',
                    error: 'NO_RESPONSE'
                };
            }
        } catch (error) {
            return {
                success: false,
                message: `Provider test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                error: 'TEST_FAILED'
            };
        }
    }

    /**
     * Generate text using the active provider
     */
    public async generateText(prompt: string, options?: {
        maxTokens?: number;
        temperature?: number;
        providerId?: string;
    }): Promise<{
        success: boolean;
        text?: string;
        error?: string;
    }> {
        try {
            const model = options?.providerId
                ? this.getLanguageModelById(options.providerId)
                : this.getActiveLanguageModel();

            if (!model) {
                return {
                    success: false,
                    error: 'No active AI provider found'
                };
            }

            const result = await generateText({
                model,
                prompt,
                maxTokens: options?.maxTokens || 2000,
                temperature: options?.temperature || 0.7
            });

            return {
                success: true,
                text: result.text
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Stream text using the active provider
     */
    public async streamText(prompt: string, options?: {
        maxTokens?: number;
        temperature?: number;
        providerId?: string;
    }) {
        const model = options?.providerId
            ? this.getLanguageModelById(options.providerId)
            : this.getActiveLanguageModel();

        if (!model) {
            throw new Error('No active AI provider found');
        }

        return streamText({
            model,
            prompt,
            maxTokens: options?.maxTokens || 2000,
            temperature: options?.temperature || 0.7
        });
    }

    /**
     * Get available models for a provider type using Vercel AI SDK
     */
    public async getAvailableModels(providerType: AIProviderType, apiKey: string): Promise<{
        success: boolean;
        models?: Array<{ id: string; name: string; description?: string }>;
        error?: string;
    }> {
        try {
            // For now, return fallback models since Vercel AI SDK doesn't expose model listing APIs
            // This can be enhanced later with direct API calls if needed
            const fallbackModels = this.getFallbackModels(providerType);

            return {
                success: true,
                models: fallbackModels
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Get fallback models for each provider type
     */
    private getFallbackModels(providerType: AIProviderType): Array<{ id: string; name: string; description?: string }> {
        switch (providerType) {
            case 'openai':
                return [
                    { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable multimodal model' },
                    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Affordable and intelligent small model' },
                    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Previous generation flagship model' },
                    { id: 'o1-preview', name: 'o1-preview', description: 'Reasoning model for complex tasks' },
                    { id: 'o1-mini', name: 'o1-mini', description: 'Faster reasoning model' }
                ];
            case 'anthropic':
                return [
                    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Most intelligent model' },
                    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fastest model' },
                    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Powerful model for complex tasks' }
                ];
            case 'google':
                return [
                    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Most capable model' },
                    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast and versatile model' },
                    { id: 'gemini-pro', name: 'Gemini Pro', description: 'Balanced performance model' }
                ];
            case 'openrouter':
                return [
                    { id: 'openai/gpt-4o', name: 'GPT-4o (via OpenRouter)', description: 'OpenAI GPT-4o through OpenRouter' },
                    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (via OpenRouter)', description: 'Anthropic Claude through OpenRouter' },
                    { id: 'google/gemini-pro', name: 'Gemini Pro (via OpenRouter)', description: 'Google Gemini through OpenRouter' }
                ];
            default:
                return [];
        }
    }
}
