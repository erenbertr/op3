import { streamText, generateText, CoreMessage } from 'ai';
import { VercelAIProviderService } from './vercelAIProviderService';
import { ChatService } from './chatService';
import { PersonalityService } from './personalityService';
import { WorkspaceService } from './workspaceService';
import { GoogleModelConfigService } from './googleModelConfigService';
import { GoogleProviderService } from './googleProviderService';
import { OpenAIModelConfigService } from './openaiModelConfigService';
import { OpenAIProviderService } from './openaiProviderService';
import { ChatMessage } from '../types/chat';
import { AIProviderConfig } from '../types/ai-provider';
import crypto from 'crypto';

// Define ApiMetadata interface locally since it doesn't exist
export interface ApiMetadata {
    model: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    finishReason: string;
    responseTime: number;
}

export interface VercelStreamingChatRequest {
    content: string;
    personalityId?: string;
    aiProviderId?: string;
    sessionId: string;
    userId: string;
    searchEnabled?: boolean;
    reasoningEnabled?: boolean;
    fileAttachments?: string[];
}

export interface VercelAIStreamChunk {
    type: 'start' | 'chunk' | 'end' | 'error' | 'search_start' | 'search_results';
    content?: string;
    messageId?: string;
    error?: string;
    metadata?: ApiMetadata;
    searchQuery?: string;
    searchResults?: any[];
}

export interface VercelConversationMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export class VercelAIChatService {
    private static instance: VercelAIChatService;
    private vercelAIService: VercelAIProviderService;
    private chatService: ChatService;
    private personalityService: PersonalityService;
    private workspaceService: WorkspaceService;
    private googleModelConfigService: GoogleModelConfigService;
    private googleProviderService: GoogleProviderService;
    private openaiModelConfigService: OpenAIModelConfigService;
    private openaiProviderService: OpenAIProviderService;

    private constructor() {
        this.vercelAIService = VercelAIProviderService.getInstance();
        this.chatService = ChatService.getInstance();
        this.personalityService = PersonalityService.getInstance();
        this.workspaceService = WorkspaceService.getInstance();
        this.googleModelConfigService = GoogleModelConfigService.getInstance();
        this.googleProviderService = GoogleProviderService.getInstance();
        this.openaiModelConfigService = OpenAIModelConfigService.getInstance();
        this.openaiProviderService = OpenAIProviderService.getInstance();
    }

    public static getInstance(): VercelAIChatService {
        if (!VercelAIChatService.instance) {
            VercelAIChatService.instance = new VercelAIChatService();
        }
        return VercelAIChatService.instance;
    }

    /**
     * Generate streaming AI response using Vercel AI SDK
     */
    public async generateStreamingResponse(
        request: VercelStreamingChatRequest,
        onChunk: (chunk: VercelAIStreamChunk) => void
    ): Promise<{ success: boolean; message: string; finalContent?: string; metadata?: ApiMetadata }> {
        try {
            // Resolve the provider configuration
            const providerConfig = request.aiProviderId
                ? await this.resolveProviderConfig(request.aiProviderId)
                : await this.getActiveProviderConfig();

            if (!providerConfig) {
                onChunk({
                    type: 'error',
                    error: 'No active AI provider found'
                });
                return {
                    success: false,
                    message: 'No active AI provider configured'
                };
            }

            // Create the language model using the resolved provider config
            const model = this.vercelAIService.createLanguageModel(providerConfig);

            if (!model) {
                onChunk({
                    type: 'error',
                    error: 'Failed to create language model'
                });
                return {
                    success: false,
                    message: 'Failed to create language model'
                };
            }

            // Build system prompt and conversation history
            const systemPrompt = await this.buildSystemPrompt(request.sessionId, request.personalityId, request.userId);
            const conversationHistory = await this.buildConversationHistory(request.sessionId, systemPrompt);

            // Convert to Vercel AI SDK format
            const messages: CoreMessage[] = conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            // Add the current user message
            messages.push({
                role: 'user',
                content: request.content
            });

            const messageId = crypto.randomUUID();
            const startTime = Date.now();

            onChunk({
                type: 'start',
                messageId
            });

            // Handle search if enabled
            if (request.searchEnabled) {
                onChunk({
                    type: 'search_start',
                    messageId
                });
                // TODO: Implement web search functionality
                // For now, we'll skip search and proceed with generation
            }

            // Stream the response
            const result = await streamText({
                model,
                messages,
                maxTokens: 2000,
                temperature: 0.7,
            });

            let fullContent = '';

            for await (const delta of result.textStream) {
                fullContent += delta;
                onChunk({
                    type: 'chunk',
                    messageId,
                    content: delta
                });
            }

            // Get final metadata
            const usage = await result.usage;
            const finishReason = await result.finishReason;

            const metadata: ApiMetadata = {
                model: model.modelId || 'unknown',
                usage: usage ? {
                    promptTokens: usage.promptTokens,
                    completionTokens: usage.completionTokens,
                    totalTokens: usage.totalTokens
                } : undefined,
                finishReason: finishReason || 'stop',
                responseTime: Date.now() - startTime
            };

            onChunk({
                type: 'end',
                messageId,
                metadata
            });

            return {
                success: true,
                message: 'Response generated successfully',
                finalContent: fullContent,
                metadata
            };

        } catch (error) {
            console.error('Error in Vercel AI streaming:', error);
            onChunk({
                type: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Resolve provider configuration from aiProviderId
     * This handles OpenAI model configs, Google model configs, and legacy AI providers
     */
    private async resolveProviderConfig(aiProviderId: string): Promise<AIProviderConfig | null> {
        try {
            // Try OpenAI model config first
            const openaiConfig = await this.resolveOpenAIModelConfig(aiProviderId);
            if (openaiConfig) {
                return openaiConfig;
            }

            // Try Google model config
            const googleConfig = await this.resolveGoogleModelConfig(aiProviderId);
            if (googleConfig) {
                return googleConfig;
            }

            // Try legacy AI provider system
            const legacyConfig = await this.resolveLegacyProviderConfig(aiProviderId);
            if (legacyConfig) {
                return legacyConfig;
            }

            return null;
        } catch (error) {
            console.error('Error resolving provider config:', error);
            return null;
        }
    }

    /**
     * Get active provider configuration
     */
    private async getActiveProviderConfig(): Promise<AIProviderConfig | null> {
        try {
            // Try OpenAI model configs first
            const openaiConfigs = await this.openaiModelConfigService.getAllModelConfigs();
            if (openaiConfigs.success && openaiConfigs.data && Array.isArray(openaiConfigs.data)) {
                const activeConfig = openaiConfigs.data.find((config: any) => config.isActive);
                if (activeConfig) {
                    return await this.resolveOpenAIModelConfig(activeConfig.id);
                }
            }

            // Try Google model configs
            const googleConfigs = await this.googleModelConfigService.getAllModelConfigs();
            if (googleConfigs.success && googleConfigs.data && Array.isArray(googleConfigs.data)) {
                const activeConfig = googleConfigs.data.find((config: any) => config.isActive);
                if (activeConfig) {
                    return await this.resolveGoogleModelConfig(activeConfig.id);
                }
            }

            // Try legacy AI providers
            const legacyProviders = this.vercelAIService.getActiveLanguageModel();
            if (legacyProviders) {
                // This would need to be implemented if we have legacy providers
                return null;
            }

            return null;
        } catch (error) {
            console.error('Error getting active provider config:', error);
            return null;
        }
    }

    /**
     * Resolve OpenAI model configuration
     */
    private async resolveOpenAIModelConfig(modelConfigId: string): Promise<AIProviderConfig | null> {
        try {
            const allConfigsResult = await this.openaiModelConfigService.getAllModelConfigs();
            if (!allConfigsResult.success || !allConfigsResult.data) {
                return null;
            }

            const allConfigs = Array.isArray(allConfigsResult.data) ? allConfigsResult.data : [allConfigsResult.data];
            const modelConfig = allConfigs.find((config: any) => config.id === modelConfigId);

            if (!modelConfig || !modelConfig.isActive) {
                return null;
            }

            const decryptedApiKey = await this.openaiProviderService.getDecryptedApiKey(modelConfig.keyId);
            if (!decryptedApiKey) {
                return null;
            }

            return {
                id: modelConfig.id,
                type: 'openai',
                name: modelConfig.customName || modelConfig.modelName,
                apiKey: decryptedApiKey,
                model: modelConfig.modelId,
                endpoint: 'https://api.openai.com/v1',
                isActive: modelConfig.isActive,
                createdAt: modelConfig.createdAt,
                updatedAt: modelConfig.updatedAt
            };
        } catch (error) {
            console.error('Error resolving OpenAI model config:', error);
            return null;
        }
    }

    /**
     * Resolve Google model configuration
     */
    private async resolveGoogleModelConfig(modelConfigId: string): Promise<AIProviderConfig | null> {
        try {
            const allConfigsResult = await this.googleModelConfigService.getAllModelConfigs();
            if (!allConfigsResult.success || !allConfigsResult.data) {
                return null;
            }

            const allConfigs = Array.isArray(allConfigsResult.data) ? allConfigsResult.data : [allConfigsResult.data];
            const modelConfig = allConfigs.find((config: any) => config.id === modelConfigId);

            if (!modelConfig || !modelConfig.isActive) {
                return null;
            }

            const decryptedApiKey = await this.googleProviderService.getDecryptedApiKey(modelConfig.keyId);
            if (!decryptedApiKey) {
                return null;
            }

            return {
                id: modelConfig.id,
                type: 'google',
                name: modelConfig.customName || modelConfig.modelName,
                apiKey: decryptedApiKey,
                model: modelConfig.modelId,
                endpoint: 'https://generativelanguage.googleapis.com',
                isActive: modelConfig.isActive,
                createdAt: modelConfig.createdAt,
                updatedAt: modelConfig.updatedAt
            };
        } catch (error) {
            console.error('Error resolving Google model config:', error);
            return null;
        }
    }

    /**
     * Resolve legacy AI provider configuration
     */
    private async resolveLegacyProviderConfig(providerId: string): Promise<AIProviderConfig | null> {
        try {
            // This would use the old AIProviderService if needed
            // For now, return null since we're focusing on the new provider systems
            return null;
        } catch (error) {
            console.error('Error resolving legacy provider config:', error);
            return null;
        }
    }

    /**
     * Build system prompt from workspace rules and personality
     */
    private async buildSystemPrompt(sessionId: string, personalityId?: string, userId?: string): Promise<string> {
        try {
            let systemPrompt = '';

            // Get workspace rules if we have a session
            if (sessionId) {
                const session = await this.chatService.getChatSession(sessionId);
                if (session.success && session.session?.workspaceId && userId) {
                    const workspace = await this.workspaceService.getWorkspaceById(session.session.workspaceId, userId);
                    if (workspace?.workspaceRules) {
                        systemPrompt += `Workspace Rules:\n${workspace.workspaceRules}\n\n`;
                    }
                }
            }

            // Add personality if specified
            if (personalityId && userId) {
                const personality = await this.personalityService.getPersonalityById(personalityId, userId);
                if (personality?.prompt) {
                    systemPrompt += `Personality:\n${personality.prompt}\n\n`;
                }
            }

            // Default system prompt if none specified
            if (!systemPrompt.trim()) {
                systemPrompt = 'You are a helpful AI assistant. Provide accurate, helpful, and concise responses.';
            }

            return systemPrompt.trim();
        } catch (error) {
            console.error('Error building system prompt:', error);
            return 'You are a helpful AI assistant. Provide accurate, helpful, and concise responses.';
        }
    }

    /**
     * Build conversation history for the session
     */
    private async buildConversationHistory(sessionId: string, systemPrompt: string): Promise<VercelConversationMessage[]> {
        try {
            const messages: VercelConversationMessage[] = [];

            // Add system prompt
            if (systemPrompt) {
                messages.push({
                    role: 'system',
                    content: systemPrompt
                });
            }

            // Get chat messages for the session
            const chatMessages = await this.chatService.getChatMessages(sessionId);
            if (chatMessages.success && chatMessages.messages) {
                // Convert chat messages to conversation format
                for (const message of chatMessages.messages) {
                    messages.push({
                        role: message.role,
                        content: message.content
                    });
                }
            }

            return messages;
        } catch (error) {
            console.error('Error building conversation history:', error);
            // Return just the system prompt if there's an error
            return systemPrompt ? [{
                role: 'system',
                content: systemPrompt
            }] : [];
        }
    }

    /**
     * Generate a non-streaming response (for testing or simple use cases)
     */
    public async generateResponse(
        request: VercelStreamingChatRequest
    ): Promise<{ success: boolean; message: string; content?: string; metadata?: ApiMetadata }> {
        try {
            // Resolve the provider configuration
            const providerConfig = request.aiProviderId
                ? await this.resolveProviderConfig(request.aiProviderId)
                : await this.getActiveProviderConfig();

            if (!providerConfig) {
                return {
                    success: false,
                    message: 'No active AI provider configured'
                };
            }

            // Create the language model using the resolved provider config
            const model = this.vercelAIService.createLanguageModel(providerConfig);

            if (!model) {
                return {
                    success: false,
                    message: 'Failed to create language model'
                };
            }

            // Build system prompt and conversation history
            const systemPrompt = await this.buildSystemPrompt(request.sessionId, request.personalityId, request.userId);
            const conversationHistory = await this.buildConversationHistory(request.sessionId, systemPrompt);

            // Convert to Vercel AI SDK format
            const messages: CoreMessage[] = conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            // Add the current user message
            messages.push({
                role: 'user',
                content: request.content
            });

            const startTime = Date.now();

            // Generate the response
            const result = await generateText({
                model,
                messages,
                maxTokens: 2000,
                temperature: 0.7,
            });

            const metadata: ApiMetadata = {
                model: model.modelId || 'unknown',
                usage: result.usage ? {
                    promptTokens: result.usage.promptTokens,
                    completionTokens: result.usage.completionTokens,
                    totalTokens: result.usage.totalTokens
                } : undefined,
                finishReason: result.finishReason || 'stop',
                responseTime: Date.now() - startTime
            };

            return {
                success: true,
                message: 'Response generated successfully',
                content: result.text,
                metadata
            };

        } catch (error) {
            console.error('Error in Vercel AI generation:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}
