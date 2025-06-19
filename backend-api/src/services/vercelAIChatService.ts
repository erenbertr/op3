import { streamText, generateText, CoreMessage } from 'ai';
import { VercelAIProviderService } from './vercelAIProviderService';
import { ChatService } from './chatService';
import { PersonalityService } from './personalityService';
import { WorkspaceService } from './workspaceService';
import { GoogleModelConfigService } from './googleModelConfigService';
import { GoogleProviderService } from './googleProviderService';
import { OpenAIModelConfigService } from './openaiModelConfigService';
import { OpenAIProviderService } from './openaiProviderService';
import { OpenAIFileService } from './openaiFileService';
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
    private openaiFileService: OpenAIFileService;

    private constructor() {
        this.vercelAIService = VercelAIProviderService.getInstance();
        this.chatService = ChatService.getInstance();
        this.personalityService = PersonalityService.getInstance();
        this.workspaceService = WorkspaceService.getInstance();
        this.googleModelConfigService = GoogleModelConfigService.getInstance();
        this.googleProviderService = GoogleProviderService.getInstance();
        this.openaiModelConfigService = OpenAIModelConfigService.getInstance();
        this.openaiProviderService = OpenAIProviderService.getInstance();
        this.openaiFileService = OpenAIFileService.getInstance();
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
            console.log('Generating streaming response for request:', {
                aiProviderId: request.aiProviderId,
                sessionId: request.sessionId,
                userId: request.userId
            });

            // Resolve the provider configuration
            const providerConfig = request.aiProviderId
                ? await this.resolveProviderConfig(request.aiProviderId)
                : await this.getActiveProviderConfig();

            console.log('Resolved provider config:', providerConfig ? { ...providerConfig, apiKey: '***' } : null);

            if (!providerConfig) {
                console.log('No provider config found');
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
            console.log('Creating language model for provider:', providerConfig.type, providerConfig.model);
            const model = this.vercelAIService.createLanguageModel(providerConfig);
            console.log('Language model created:', !!model);

            if (!model) {
                console.log('Failed to create language model');
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

            // Handle OpenAI-specific features
            if (providerConfig.type === 'openai') {
                return await this.handleOpenAIStreaming(
                    providerConfig,
                    messages,
                    messageId,
                    onChunk,
                    request.searchEnabled,
                    request.reasoningEnabled,
                    request.fileAttachments,
                    request.sessionId
                );
            }

            // Handle search if enabled for non-OpenAI providers
            if (request.searchEnabled) {
                onChunk({
                    type: 'search_start',
                    messageId
                });
                // Web search not supported for non-OpenAI providers
                onChunk({
                    type: 'chunk',
                    messageId,
                    content: '[Note: Web search is only supported for OpenAI models.]\n\n'
                });
            }

            // Stream the response for non-OpenAI providers
            console.log('Starting streaming for provider:', providerConfig.type);
            console.log('Messages to send:', messages.length);

            try {
                console.log('Calling streamText with model:', model.modelId);
                console.log('Messages for streaming:', messages.map(m => ({
                    role: m.role,
                    content: typeof m.content === 'string' ? m.content.substring(0, 50) + '...' : '[complex]'
                })));

                const result = await streamText({
                    model,
                    messages,
                    maxTokens: 2000,
                    temperature: 0.7,
                });

                console.log('Stream result obtained:', !!result);
                console.log('Stream result properties:', Object.keys(result));

                let fullContent = '';
                let chunkCount = 0;

                // Use streaming for all providers now that Google is working
                console.log('Using textStream for streaming');
                for await (const delta of result.textStream) {
                    chunkCount++;
                    console.log(`Received delta ${chunkCount}:`, JSON.stringify(delta));
                    fullContent += delta;
                    onChunk({
                        type: 'chunk',
                        messageId,
                        content: delta
                    });
                }

                console.log('Streaming completed, full content length:', fullContent.length);
                console.log('Total chunks received:', chunkCount);

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
            } catch (streamError) {
                console.error('Error during streaming:', streamError);
                if (streamError instanceof Error) {
                    console.error('Stream error details:', {
                        name: streamError.name,
                        message: streamError.message,
                        stack: streamError.stack
                    });
                }
                throw streamError;
            }



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
     * Handle OpenAI-specific streaming with web search, reasoning, and O1 model support
     */
    private async handleOpenAIStreaming(
        providerConfig: AIProviderConfig,
        messages: CoreMessage[],
        messageId: string,
        onChunk: (chunk: VercelAIStreamChunk) => void,
        searchEnabled?: boolean,
        reasoningEnabled?: boolean,
        fileAttachments?: string[],
        sessionId?: string
    ): Promise<{ success: boolean; message: string; finalContent?: string; metadata?: ApiMetadata }> {
        const startTime = Date.now();
        const isO1Model = providerConfig.model.startsWith('o1');

        // Handle O1 models separately (they don't support web search or streaming)
        if (isO1Model) {
            return await this.handleO1ModelGeneration(
                providerConfig,
                messages,
                messageId,
                onChunk,
                reasoningEnabled
            );
        }

        // Handle web search for supported models
        if (searchEnabled && this.supportsOpenAIWebSearch(providerConfig)) {
            onChunk({
                type: 'search_start',
                messageId,
                searchQuery: messages[messages.length - 1].content as string
            });

            try {
                return await this.handleOpenAIResponsesAPI(
                    providerConfig,
                    messages,
                    messageId,
                    onChunk,
                    fileAttachments,
                    sessionId,
                    reasoningEnabled
                );
            } catch (error) {
                console.error('OpenAI Responses API error:', error);
                onChunk({
                    type: 'chunk',
                    messageId,
                    content: '[Note: Web search failed. Responding with training data and general knowledge.]\n\n'
                });
            }
        } else if (searchEnabled) {
            onChunk({
                type: 'chunk',
                messageId,
                content: '[Note: This model does not support web search. Please use gpt-4o, gpt-4o-mini, or gpt-4-turbo for web search capabilities.]\n\n'
            });
        }

        // Standard OpenAI streaming using Vercel AI SDK
        const model = this.vercelAIService.createLanguageModel(providerConfig);

        // Prepare streaming options
        const streamOptions: any = {
            model,
            messages,
            maxTokens: 2000,
            temperature: 0.7,
        };

        // Add file search tool if file attachments are present
        if (fileAttachments && fileAttachments.length > 0) {
            // Get userId from the session or request context
            const session = await this.chatService.getChatSession(sessionId || '');
            const userId = session.session?.userId;

            if (userId) {
                const vectorStoreId = await this.getVectorStoreForSession(sessionId, userId);
                if (vectorStoreId) {
                    streamOptions.tools = [{
                        type: 'file_search',
                        file_search: {
                            vector_store_ids: [vectorStoreId]
                        }
                    }];
                }
            }
        }

        const result = await streamText(streamOptions);

        let fullContent = '';
        for await (const delta of result.textStream) {
            fullContent += delta;
            onChunk({
                type: 'chunk',
                messageId,
                content: delta
            });
        }

        const usage = await result.usage;
        const finishReason = await result.finishReason;

        const metadata: ApiMetadata = {
            model: providerConfig.model,
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
    }

    /**
     * Check if OpenAI model supports web search via Responses API
     */
    private supportsOpenAIWebSearch(providerConfig: AIProviderConfig): boolean {
        const webSearchModels = [
            'gpt-4o',
            'gpt-4o-mini',
            'gpt-4-turbo',
            'gpt-4-turbo-preview'
        ];
        return webSearchModels.includes(providerConfig.model);
    }

    /**
     * Handle O1 model generation with reasoning steps
     */
    private async handleO1ModelGeneration(
        providerConfig: AIProviderConfig,
        messages: CoreMessage[],
        messageId: string,
        onChunk: (chunk: VercelAIStreamChunk) => void,
        reasoningEnabled?: boolean
    ): Promise<{ success: boolean; message: string; finalContent?: string; metadata?: ApiMetadata }> {
        const startTime = Date.now();

        try {
            // O1 models don't support streaming, so we use generateText
            const model = this.vercelAIService.createLanguageModel(providerConfig);

            // Prepare generation options
            const generateOptions: any = {
                model,
                messages,
                maxTokens: 2000,
                temperature: 1.0, // O1 models use temperature 1.0
            };

            // Note: O1 models don't support file search tools yet
            // This can be added when OpenAI adds support

            const result = await generateText(generateOptions);

            let content = result.text;
            let reasoningSteps: string[] = [];

            // Extract reasoning steps if enabled and present
            if (reasoningEnabled && content.includes('<thinking>')) {
                const thinkingMatch = content.match(/<thinking>([\s\S]*?)<\/thinking>/);
                if (thinkingMatch) {
                    const thinkingContent = thinkingMatch[1].trim();
                    reasoningSteps = thinkingContent.split('\n').filter(step => step.trim());
                    content = content.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim();
                }
            }

            // Send reasoning steps if available
            if (reasoningSteps.length > 0) {
                for (const step of reasoningSteps) {
                    onChunk({
                        type: 'chunk',
                        messageId,
                        content: `[Reasoning] ${step}\n`
                    });
                }
                onChunk({
                    type: 'chunk',
                    messageId,
                    content: '\n---\n\n'
                });
            }

            // Send the main content
            onChunk({
                type: 'chunk',
                messageId,
                content: content
            });

            const metadata: ApiMetadata = {
                model: providerConfig.model,
                usage: result.usage ? {
                    promptTokens: result.usage.promptTokens,
                    completionTokens: result.usage.completionTokens,
                    totalTokens: result.usage.totalTokens
                } : undefined,
                finishReason: result.finishReason || 'stop',
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
                finalContent: content,
                metadata
            };

        } catch (error) {
            console.error('Error in O1 model generation:', error);
            throw error;
        }
    }

    /**
     * Handle OpenAI Responses API for web search
     */
    private async handleOpenAIResponsesAPI(
        providerConfig: AIProviderConfig,
        messages: CoreMessage[],
        messageId: string,
        onChunk: (chunk: VercelAIStreamChunk) => void,
        fileAttachments?: string[],
        sessionId?: string,
        reasoningEnabled?: boolean
    ): Promise<{ success: boolean; message: string; finalContent?: string; metadata?: ApiMetadata }> {
        const startTime = Date.now();
        const endpoint = providerConfig.endpoint || 'https://api.openai.com/v1';

        // Get the last user message for search input
        const lastUserMessage = messages[messages.length - 1];
        let input = lastUserMessage.content as string;

        // Add context from previous messages if available
        if (messages.length > 1) {
            const previousMessages = messages.slice(0, -1);
            if (previousMessages.length > 0) {
                const contextString = previousMessages.map(msg =>
                    `${msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System'}: ${msg.content}`
                ).join('\n\n');
                input = `Previous conversation:\n${contextString}\n\nCurrent question: ${lastUserMessage.content}`;
            }
        }

        // Build tools array for web search
        const tools: any[] = [{
            type: "web_search_preview",
            search_context_size: "medium"
        }];

        const requestBody: any = {
            model: providerConfig.model,
            input: input,
            tools: tools
        };

        const response = await fetch(`${endpoint}/responses`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${providerConfig.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`OpenAI Responses API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as any;
        let finalContent = '';
        let searchResults: any[] = [];

        // Process the response output
        if (data.output && Array.isArray(data.output)) {
            for (const output of data.output) {
                if (output.type === 'web_search_call') {
                    console.log('Web search call completed:', output.id);
                } else if (output.type === 'message' && output.content) {
                    for (const content of output.content) {
                        if (content.type === 'output_text') {
                            finalContent = content.text;

                            // Extract citations as search results
                            if (content.annotations) {
                                searchResults = content.annotations
                                    .filter((ann: any) => ann.type === 'url_citation')
                                    .map((ann: any) => ({
                                        title: ann.title || 'Web Result',
                                        url: ann.url,
                                        snippet: ann.title || 'Citation from web search'
                                    }));
                            }

                            // Send search results if available
                            if (searchResults.length > 0) {
                                onChunk({
                                    type: 'search_results',
                                    messageId,
                                    searchResults
                                });
                            }

                            // Send the content
                            onChunk({
                                type: 'chunk',
                                messageId,
                                content: finalContent
                            });
                        }
                    }
                }
            }
        }

        const metadata: ApiMetadata = {
            model: providerConfig.model,
            usage: data.usage ? {
                promptTokens: data.usage.input_tokens || 0,
                completionTokens: data.usage.output_tokens || 0,
                totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0)
            } : undefined,
            finishReason: 'stop',
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
            finalContent: finalContent,
            metadata
        };
    }

    /**
     * Get vector store ID for a session (for file search)
     */
    private async getVectorStoreForSession(sessionId?: string, userId?: string): Promise<string | null> {
        if (!sessionId || !userId) return null;

        try {
            const vectorStoreResult = await this.openaiFileService.getOrCreateVectorStore(sessionId, userId);
            if (vectorStoreResult.success && vectorStoreResult.vectorStore) {
                return vectorStoreResult.vectorStore.openaiVectorStoreId;
            }
            return null;
        } catch (error) {
            console.error('Error getting vector store for session:', error);
            return null;
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
            console.log('Resolving Google model config for ID:', modelConfigId);

            const allConfigsResult = await this.googleModelConfigService.getAllModelConfigs();
            console.log('Google model configs result:', allConfigsResult);

            if (!allConfigsResult.success || !allConfigsResult.data) {
                console.log('No Google model configs found or failed to fetch');
                return null;
            }

            const allConfigs = Array.isArray(allConfigsResult.data) ? allConfigsResult.data : [allConfigsResult.data];
            console.log('All Google configs:', allConfigs);

            const modelConfig = allConfigs.find((config: any) => config.id === modelConfigId);
            console.log('Found model config:', modelConfig);

            if (!modelConfig || !modelConfig.isActive) {
                console.log('Model config not found or not active');
                return null;
            }

            const decryptedApiKey = await this.googleProviderService.getDecryptedApiKey(modelConfig.keyId);
            console.log('Decrypted API key available:', !!decryptedApiKey);

            if (!decryptedApiKey) {
                console.log('Failed to decrypt API key for keyId:', modelConfig.keyId);
                return null;
            }

            const providerConfig = {
                id: modelConfig.id,
                type: 'google' as const,
                name: modelConfig.customName || modelConfig.modelName,
                apiKey: decryptedApiKey,
                model: modelConfig.modelId,
                endpoint: 'https://generativelanguage.googleapis.com',
                isActive: modelConfig.isActive,
                createdAt: modelConfig.createdAt,
                updatedAt: modelConfig.updatedAt
            };

            console.log('Resolved Google provider config:', { ...providerConfig, apiKey: '***' });
            return providerConfig;
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
