import { AIProviderConfig } from '../types/ai-provider';
import { ChatMessage, ApiMetadata } from '../types/chat';
import { AIProviderService } from './aiProviderService';
import { OpenAIModelConfigServiceNew } from './openaiModelConfigServiceNew';
import { OpenAIProviderService } from './openaiProviderService';
import { GoogleModelConfigService } from './googleModelConfigService';
import { GoogleProviderService } from './googleProviderService';
import { PersonalityService } from './personalityService';
import { ChatService } from './chatService';
import { WorkspaceService } from './workspaceService';



export interface StreamingChatRequest {
    content: string;
    personalityId?: string;
    aiProviderId?: string;
    sessionId: string;
    userId: string;
    searchEnabled?: boolean;
    reasoningEnabled?: boolean;
    fileAttachments?: string[];
}

export interface StreamingChatResponse {
    success: boolean;
    message: string;
    userMessage?: ChatMessage;
    error?: string;
}

export interface AIStreamChunk {
    type: 'start' | 'chunk' | 'end' | 'error' | 'search_start' | 'search_results';
    content?: string;
    messageId?: string;
    error?: string;
    metadata?: ApiMetadata;
    searchQuery?: string;
    searchResults?: any[];
}

export interface ConversationMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export class AIChatService {
    private static instance: AIChatService;
    private aiProviderService: AIProviderService;
    private openaiModelConfigService: OpenAIModelConfigServiceNew;
    private openaiProviderService: OpenAIProviderService;
    private googleModelConfigService: GoogleModelConfigService;
    private googleProviderService: GoogleProviderService;
    private personalityService: PersonalityService;
    private chatService: ChatService;
    private workspaceService: WorkspaceService;



    private constructor() {
        this.aiProviderService = AIProviderService.getInstance();
        this.openaiModelConfigService = OpenAIModelConfigServiceNew.getInstance();
        this.openaiProviderService = OpenAIProviderService.getInstance();
        this.googleModelConfigService = GoogleModelConfigService.getInstance();
        this.googleProviderService = GoogleProviderService.getInstance();
        this.personalityService = PersonalityService.getInstance();
        this.chatService = ChatService.getInstance();
        this.workspaceService = WorkspaceService.getInstance();


    }

    public static getInstance(): AIChatService {
        if (!AIChatService.instance) {
            AIChatService.instance = new AIChatService();
        }
        return AIChatService.instance;
    }

    /**
     * Generate AI response with streaming support
     */
    public async generateStreamingResponse(
        request: StreamingChatRequest,
        onChunk: (chunk: AIStreamChunk) => void
    ): Promise<{ success: boolean; message: string; finalContent?: string; metadata?: ApiMetadata }> {
        try {
            let selectedProvider: AIProviderConfig | undefined;

            if (request.aiProviderId) {
                // First try to resolve as OpenAI model configuration
                selectedProvider = await this.resolveOpenAIModelConfig(request.aiProviderId);

                // If not found, try Google model configuration
                if (!selectedProvider) {
                    selectedProvider = await this.resolveGoogleModelConfig(request.aiProviderId);
                }

                // If not found, try old AI provider system
                if (!selectedProvider) {
                    const providers = this.aiProviderService.getProvidersWithEncryptedKeys();
                    selectedProvider = providers.find(p => p.id === request.aiProviderId && p.isActive);
                }
            } else {
                // Use first active provider as default (try OpenAI model configs first)
                const openaiModelConfigs = await this.openaiModelConfigService.getModelConfigs();
                if (openaiModelConfigs.success && openaiModelConfigs.modelConfigs && Array.isArray(openaiModelConfigs.modelConfigs) && openaiModelConfigs.modelConfigs.length > 0) {
                    const activeConfig = openaiModelConfigs.modelConfigs.find((config: any) => config.isActive);
                    if (activeConfig) {
                        selectedProvider = await this.resolveOpenAIModelConfig(activeConfig.id);
                    }
                }

                // Try Google model configs if no OpenAI configs
                if (!selectedProvider) {
                    const googleModelConfigs = await this.googleModelConfigService.getAllModelConfigs();
                    if (googleModelConfigs.success && googleModelConfigs.data && Array.isArray(googleModelConfigs.data) && googleModelConfigs.data.length > 0) {
                        const activeConfig = googleModelConfigs.data.find((config: any) => config.isActive);
                        if (activeConfig) {
                            selectedProvider = await this.resolveGoogleModelConfig(activeConfig.id);
                        }
                    }
                }

                // Fall back to old AI provider system
                if (!selectedProvider) {
                    const providers = this.aiProviderService.getProvidersWithEncryptedKeys();
                    selectedProvider = providers.find(p => p.isActive);
                }
            }

            if (!selectedProvider) {
                onChunk({
                    type: 'error',
                    error: 'No active AI provider found'
                });
                return {
                    success: false,
                    message: 'No active AI provider configured'
                };
            }

            // Build system prompt from workspace rules and personality
            const systemPrompt = await this.buildSystemPrompt(request.sessionId, request.personalityId, request.userId);

            // Get conversation history
            const conversationHistory = await this.buildConversationHistory(request.sessionId, systemPrompt);

            // Generate streaming response based on provider type
            const result = await this.streamFromProvider(
                selectedProvider,
                request.content,
                conversationHistory,
                onChunk,
                request.searchEnabled,
                request.fileAttachments,
                request.sessionId,
                request.reasoningEnabled
            );

            return result;
        } catch (error) {
            console.error('Error generating streaming response:', error);
            onChunk({
                type: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                message: `Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Resolve OpenAI model configuration to AIProviderConfig format
     */
    private async resolveOpenAIModelConfig(modelConfigId: string): Promise<AIProviderConfig | undefined> {
        try {
            // Get all model configurations and find the one with matching ID
            const allConfigsResult = await this.openaiModelConfigService.getModelConfigs();
            if (!allConfigsResult.success || !allConfigsResult.modelConfigs) {
                return undefined;
            }

            const allConfigs = Array.isArray(allConfigsResult.modelConfigs) ? allConfigsResult.modelConfigs : [allConfigsResult.modelConfigs];
            const modelConfig = allConfigs.find((config: any) => config.id === modelConfigId);

            if (!modelConfig || !modelConfig.isActive) {
                return undefined;
            }

            // Get the decrypted API key for this model config
            const decryptedApiKey = await this.openaiProviderService.getDecryptedApiKey(modelConfig.keyId);
            if (!decryptedApiKey) {
                return undefined;
            }

            // Convert to AIProviderConfig format
            const aiProviderConfig: AIProviderConfig = {
                id: modelConfig.id,
                type: 'openai',
                name: modelConfig.customName || modelConfig.modelName,
                apiKey: decryptedApiKey, // Use decrypted API key directly
                model: modelConfig.modelId,
                endpoint: 'https://api.openai.com/v1',
                isActive: modelConfig.isActive,
                createdAt: modelConfig.createdAt,
                updatedAt: modelConfig.updatedAt
            };

            return aiProviderConfig;
        } catch (error) {
            console.error('Error resolving OpenAI model config:', error);
            return undefined;
        }
    }

    /**
     * Resolve Google model configuration to AIProviderConfig format
     */
    private async resolveGoogleModelConfig(modelConfigId: string): Promise<AIProviderConfig | undefined> {
        try {
            // Get all Google model configurations and find the one with matching ID
            const allConfigsResult = await this.googleModelConfigService.getAllModelConfigs();
            if (!allConfigsResult.success || !allConfigsResult.data) {
                return undefined;
            }

            const allConfigs = Array.isArray(allConfigsResult.data) ? allConfigsResult.data : [allConfigsResult.data];
            const modelConfig = allConfigs.find((config: any) => config.id === modelConfigId);

            if (!modelConfig || !modelConfig.isActive) {
                return undefined;
            }

            // Get the decrypted API key for this model config
            const decryptedApiKey = await this.googleProviderService.getDecryptedApiKey(modelConfig.keyId);
            if (!decryptedApiKey) {
                return undefined;
            }

            // Convert to AIProviderConfig format
            const aiProviderConfig: AIProviderConfig = {
                id: modelConfig.id,
                type: 'google',
                name: modelConfig.customName || modelConfig.modelName,
                apiKey: decryptedApiKey, // Use decrypted API key directly
                model: modelConfig.modelId,
                endpoint: 'https://generativelanguage.googleapis.com',
                isActive: modelConfig.isActive,
                createdAt: modelConfig.createdAt,
                updatedAt: modelConfig.updatedAt
            };

            return aiProviderConfig;
        } catch (error) {
            console.error('Error resolving Google model config:', error);
            return undefined;
        }
    }

    /**
     * Build system prompt from workspace rules and personality
     */
    private async buildSystemPrompt(sessionId: string, personalityId?: string, userId?: string): Promise<string> {
        const systemParts: string[] = [];

        try {
            // Get chat session to find workspace ID
            const chatSession = await this.chatService.getChatSession(sessionId);
            if (chatSession.success && chatSession.session) {
                // Get workspace rules
                const workspace = await this.workspaceService.getWorkspaceById(chatSession.session.workspaceId, chatSession.session.userId);
                if (workspace && workspace.workspaceRules && workspace.workspaceRules.trim()) {
                    systemParts.push(`Workspace Context: ${workspace.workspaceRules.trim()}`);
                }
            }

            // Get personality prompt if specified
            if (personalityId && userId) {
                const personalitiesResult = await this.personalityService.getPersonalities(userId);
                if (personalitiesResult.success) {
                    const personality = personalitiesResult.personalities.find(p => p.id === personalityId);
                    if (personality && personality.prompt && personality.prompt.trim()) {
                        systemParts.push(`Personality: ${personality.prompt.trim()}`);
                    }
                }
            }
        } catch (error) {
            console.error('Error building system prompt:', error);
            // Continue without system prompt if there's an error
        }

        return systemParts.join('\n\n');
    }

    /**
     * Build conversation history from chat messages
     */
    private async buildConversationHistory(sessionId: string, systemPrompt: string): Promise<ConversationMessage[]> {
        const messages: ConversationMessage[] = [];

        // Add system prompt if provided
        if (systemPrompt) {
            messages.push({
                role: 'system',
                content: systemPrompt
            });
        }

        // Get chat messages for the session
        const chatMessagesResult = await this.chatService.getChatMessages(sessionId);
        if (chatMessagesResult.success && chatMessagesResult.messages) {
            // Sort messages by creation date to ensure proper order
            const sortedMessages = chatMessagesResult.messages.sort((a, b) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );

            // Convert chat messages to conversation format
            for (const chatMessage of sortedMessages) {
                messages.push({
                    role: chatMessage.role as 'user' | 'assistant',
                    content: chatMessage.content
                });
            }
        }

        return messages;
    }

    /**
     * Stream response from specific AI provider
     */
    private async streamFromProvider(
        provider: AIProviderConfig,
        userMessage: string,
        conversationHistory: ConversationMessage[],
        onChunk: (chunk: AIStreamChunk) => void,
        searchEnabled?: boolean,
        fileAttachments?: string[],
        sessionId?: string,
        reasoningEnabled?: boolean
    ): Promise<{ success: boolean; message: string; finalContent?: string; metadata?: ApiMetadata }> {
        const messageId = crypto.randomUUID();
        const startTime = Date.now();

        onChunk({
            type: 'start',
            messageId
        });

        // Add the current user message to conversation history
        const fullConversation = [...conversationHistory, { role: 'user' as const, content: userMessage }];

        try {
            let result: { success: boolean; message: string; finalContent?: string; metadata?: ApiMetadata };

            switch (provider.type) {
                case 'openai':
                    throw new Error('OpenAI provider should use VercelAIChatService instead of legacy aiChatService');
                case 'anthropic':
                    result = await this.streamFromAnthropic(provider, fullConversation, messageId, onChunk);
                    break;
                case 'google':
                    result = await this.streamFromGoogle(provider, fullConversation, messageId, onChunk);
                    break;
                case 'replicate':
                    result = await this.streamFromReplicate(provider, fullConversation, messageId, onChunk);
                    break;
                case 'custom':
                    result = await this.streamFromCustom(provider, fullConversation, messageId, onChunk);
                    break;
                default:
                    throw new Error(`Unsupported provider type: ${provider.type}`);
            }

            // Add timing metadata
            const responseTimeMs = Date.now() - startTime;
            const metadata: ApiMetadata = {
                ...result.metadata,
                responseTimeMs,
                provider: provider.name || provider.type,
                model: provider.model,
                requestId: messageId
            };

            return {
                ...result,
                metadata
            };
        } catch (error) {
            onChunk({
                type: 'error',
                messageId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }



















    /**
     * Stream from Anthropic API
     */
    private async streamFromAnthropic(
        provider: AIProviderConfig,
        conversationHistory: ConversationMessage[],
        messageId: string,
        onChunk: (chunk: AIStreamChunk) => void
    ): Promise<{ success: boolean; message: string; finalContent?: string; metadata?: ApiMetadata }> {
        const endpoint = provider.endpoint || 'https://api.anthropic.com';
        const apiKey = this.aiProviderService.decryptApiKey(provider.apiKey);

        // Separate system messages from user/assistant messages for Anthropic
        const systemMessages = conversationHistory.filter(msg => msg.role === 'system');
        const chatMessages = conversationHistory.filter(msg => msg.role !== 'system');

        const requestBody: any = {
            model: provider.model,
            max_tokens: 2000,
            messages: chatMessages.map(msg => ({
                role: msg.role,
                content: msg.content
            })),
            stream: true
        };

        // Combine all system messages into one system prompt for Anthropic
        if (systemMessages.length > 0) {
            requestBody.system = systemMessages.map(msg => msg.content).join('\n\n');
        }

        const response = await fetch(`${endpoint}/v1/messages`, {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
        }

        return await this.processAnthropicStream(response, messageId, onChunk, provider.model, conversationHistory);
    }

    /**
     * Process Anthropic streaming response
     */
    private async processAnthropicStream(
        response: Response,
        messageId: string,
        onChunk: (chunk: AIStreamChunk) => void,
        model: string,
        conversationHistory: ConversationMessage[] = []
    ): Promise<{ success: boolean; message: string; finalContent?: string; metadata?: ApiMetadata }> {
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('No response body reader available');
        }

        const decoder = new TextDecoder();
        let finalContent = '';
        let inputTokens = 0;
        let outputTokens = 0;

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);

                        try {
                            const parsed = JSON.parse(data);

                            if (parsed.type === 'content_block_delta') {
                                const content = parsed.delta?.text;
                                if (content) {
                                    finalContent += content;
                                    onChunk({
                                        type: 'chunk',
                                        messageId,
                                        content
                                    });
                                }
                            } else if (parsed.type === 'message_stop') {
                                // If no token usage was captured, estimate based on content length
                                if (inputTokens === 0 && outputTokens === 0) {
                                    // Rough estimation: ~4 characters per token for English text
                                    const estimatedInputTokens = Math.ceil(conversationHistory.reduce((acc: number, msg: any) => acc + msg.content.length, 0) / 4);
                                    const estimatedOutputTokens = Math.ceil(finalContent.length / 4);

                                    inputTokens = estimatedInputTokens;
                                    outputTokens = estimatedOutputTokens;
                                }

                                const metadata: ApiMetadata = {
                                    inputTokens,
                                    outputTokens,
                                    totalTokens: inputTokens + outputTokens,
                                    model
                                };

                                onChunk({
                                    type: 'end',
                                    messageId,
                                    metadata
                                });
                                return {
                                    success: true,
                                    message: 'Response generated successfully',
                                    finalContent,
                                    metadata
                                };
                            } else if (parsed.type === 'message_start' && parsed.message?.usage) {
                                // Capture token usage from message start
                                inputTokens = parsed.message.usage.input_tokens || 0;
                                outputTokens = parsed.message.usage.output_tokens || 0;
                            }
                        } catch (parseError) {
                            // Skip invalid JSON chunks
                            continue;
                        }
                    }
                }
            }

            // If no token usage was captured, estimate based on content length
            if (inputTokens === 0 && outputTokens === 0) {
                // Rough estimation: ~4 characters per token for English text
                const estimatedInputTokens = Math.ceil(conversationHistory.reduce((acc: number, msg: any) => acc + msg.content.length, 0) / 4);
                const estimatedOutputTokens = Math.ceil(finalContent.length / 4);

                inputTokens = estimatedInputTokens;
                outputTokens = estimatedOutputTokens;
            }

            const metadata: ApiMetadata = {
                inputTokens,
                outputTokens,
                totalTokens: inputTokens + outputTokens,
                model
            };

            onChunk({
                type: 'end',
                messageId,
                metadata
            });

            return {
                success: true,
                message: 'Response generated successfully',
                finalContent,
                metadata
            };
        } finally {
            reader.releaseLock();
        }
    }

    /**
     * Stream from Google AI API
     */
    private async streamFromGoogle(
        provider: AIProviderConfig,
        conversationHistory: ConversationMessage[],
        messageId: string,
        onChunk: (chunk: AIStreamChunk) => void
    ): Promise<{ success: boolean; message: string; finalContent?: string; metadata?: ApiMetadata }> {
        const endpoint = provider.endpoint || 'https://generativelanguage.googleapis.com';
        // Check if API key is already decrypted (from Google model config) or needs decryption (from old provider system)
        const apiKey = provider.apiKey.includes(':') ? this.aiProviderService.decryptApiKey(provider.apiKey) : provider.apiKey;

        // Convert conversation history to Google's format
        const contents = [];
        let systemInstruction = '';

        for (const msg of conversationHistory) {
            if (msg.role === 'system') {
                systemInstruction = msg.content;
            } else if (msg.role === 'user') {
                contents.push({
                    role: 'user',
                    parts: [{ text: msg.content }]
                });
            } else if (msg.role === 'assistant') {
                contents.push({
                    role: 'model',
                    parts: [{ text: msg.content }]
                });
            }
        }

        const requestBody: any = {
            contents: contents,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
                topP: 0.8,
                topK: 40
            }
        };

        // Add system instruction if present
        if (systemInstruction) {
            requestBody.systemInstruction = {
                parts: [{ text: systemInstruction }]
            };
        }

        console.log('Google API Request:', JSON.stringify(requestBody, null, 2));

        // Use the regular generateContent endpoint (Google's streaming is not reliable)
        const response = await fetch(`${endpoint}/v1beta/models/${provider.model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        console.log('Google API Response Status:', response.status, response.statusText);
        console.log('Google API Response Headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Google AI API error:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            throw new Error(`Google AI API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        return await this.processGoogleResponse(response, messageId, onChunk, provider.model, conversationHistory);
    }

    /**
     * Process Google response
     */
    private async processGoogleResponse(
        response: Response,
        messageId: string,
        onChunk: (chunk: AIStreamChunk) => void,
        model: string,
        conversationHistory: ConversationMessage[] = []
    ): Promise<{ success: boolean; message: string; finalContent?: string; metadata?: ApiMetadata }> {
        let finalContent = '';
        let inputTokens = 0;
        let outputTokens = 0;

        console.log('Processing Google response...');

        try {
            const responseText = await response.text();
            console.log('Google Response Text:', responseText);

            const parsed = JSON.parse(responseText);
            console.log('Google Parsed Response:', JSON.stringify(parsed, null, 2));

            // Check for errors
            if (parsed.error) {
                onChunk({
                    type: 'error',
                    error: `Google AI API error: ${parsed.error.message || 'Unknown error'}`
                });
                return {
                    success: false,
                    message: `Google AI API error: ${parsed.error.message || 'Unknown error'}`
                };
            }

            // Extract content from candidates
            const candidate = parsed.candidates?.[0];
            if (candidate) {
                // Check for safety blocks
                if (candidate.finishReason === 'SAFETY') {
                    onChunk({
                        type: 'error',
                        error: 'Content was blocked by Google AI safety filters'
                    });
                    return {
                        success: false,
                        message: 'Content was blocked by Google AI safety filters'
                    };
                }

                // Extract text content
                const content = candidate.content?.parts?.[0]?.text;
                if (content) {
                    finalContent = content;
                    // Send the complete content as one chunk
                    onChunk({
                        type: 'chunk',
                        messageId,
                        content
                    });
                }
            }

            // Extract usage metadata if available
            if (parsed.usageMetadata) {
                inputTokens = parsed.usageMetadata.promptTokenCount || 0;
                outputTokens = parsed.usageMetadata.candidatesTokenCount || 0;
            }

            // Estimate tokens if not provided
            if (inputTokens === 0) {
                inputTokens = Math.ceil(conversationHistory.reduce((acc: number, msg: any) => acc + msg.content.length, 0) / 4);
            }
            if (outputTokens === 0) {
                outputTokens = Math.ceil(finalContent.length / 4);
            }

            const metadata: ApiMetadata = {
                model,
                inputTokens,
                outputTokens,
                totalTokens: inputTokens + outputTokens
            };

            onChunk({
                type: 'end',
                messageId,
                metadata
            });

            return {
                success: true,
                message: 'Response generated successfully',
                finalContent,
                metadata
            };
        } catch (parseError) {
            console.error('Error parsing Google response:', parseError);
            onChunk({
                type: 'error',
                error: 'Failed to parse Google AI response'
            });
            return {
                success: false,
                message: 'Failed to parse Google AI response'
            };
        }
    }

    /**
     * Stream from Replicate API
     */
    private async streamFromReplicate(
        provider: AIProviderConfig,
        conversationHistory: ConversationMessage[],
        messageId: string,
        onChunk: (chunk: AIStreamChunk) => void
    ): Promise<{ success: boolean; message: string; finalContent?: string; metadata?: ApiMetadata }> {
        // Replicate streaming implementation
        const endpoint = provider.endpoint || 'https://api.replicate.com';
        const apiKey = this.aiProviderService.decryptApiKey(provider.apiKey);

        // Build prompt from conversation history
        const prompt = conversationHistory.map(msg => {
            if (msg.role === 'system') return msg.content;
            if (msg.role === 'user') return `User: ${msg.content}`;
            if (msg.role === 'assistant') return `Assistant: ${msg.content}`;
            return msg.content;
        }).join('\n\n');

        const response = await fetch(`${endpoint}/v1/predictions`, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                version: provider.model,
                input: {
                    prompt: prompt,
                    max_new_tokens: 2000
                },
                stream: true
            })
        });

        if (!response.ok) {
            throw new Error(`Replicate API error: ${response.status} ${response.statusText}`);
        }

        return await this.processReplicateStream(response, messageId, onChunk, provider.model, conversationHistory);
    }

    /**
     * Process Replicate streaming response
     */
    private async processReplicateStream(
        response: Response,
        messageId: string,
        onChunk: (chunk: AIStreamChunk) => void,
        model: string,
        conversationHistory: ConversationMessage[] = []
    ): Promise<{ success: boolean; message: string; finalContent?: string; metadata?: ApiMetadata }> {
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('No response body reader available');
        }

        const decoder = new TextDecoder();
        let finalContent = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);

                        try {
                            const parsed = JSON.parse(data);

                            if (parsed.output) {
                                const content = Array.isArray(parsed.output) ? parsed.output.join('') : parsed.output;
                                if (content && content !== finalContent) {
                                    const newContent = content.slice(finalContent.length);
                                    finalContent = content;
                                    onChunk({
                                        type: 'chunk',
                                        messageId,
                                        content: newContent
                                    });
                                }
                            }

                            if (parsed.status === 'succeeded') {
                                const estimatedInputTokens = Math.ceil(conversationHistory.reduce((acc: number, msg: any) => acc + msg.content.length, 0) / 4);
                                const estimatedOutputTokens = Math.ceil(finalContent.length / 4);

                                const metadata: ApiMetadata = {
                                    model,
                                    inputTokens: estimatedInputTokens,
                                    outputTokens: estimatedOutputTokens,
                                    totalTokens: estimatedInputTokens + estimatedOutputTokens
                                };

                                onChunk({
                                    type: 'end',
                                    messageId,
                                    metadata
                                });
                                return {
                                    success: true,
                                    message: 'Response generated successfully',
                                    finalContent,
                                    metadata
                                };
                            }
                        } catch (parseError) {
                            // Skip invalid JSON chunks
                            continue;
                        }
                    }
                }
            }

            const estimatedInputTokens = Math.ceil(conversationHistory.reduce((acc: number, msg: any) => acc + msg.content.length, 0) / 4);
            const estimatedOutputTokens = Math.ceil(finalContent.length / 4);

            const metadata: ApiMetadata = {
                model,
                inputTokens: estimatedInputTokens,
                outputTokens: estimatedOutputTokens,
                totalTokens: estimatedInputTokens + estimatedOutputTokens
            };

            onChunk({
                type: 'end',
                messageId,
                metadata
            });

            return {
                success: true,
                message: 'Response generated successfully',
                finalContent,
                metadata
            };
        } finally {
            reader.releaseLock();
        }
    }

    /**
     * Stream from custom provider
     */
    private async streamFromCustom(
        provider: AIProviderConfig,
        conversationHistory: ConversationMessage[],
        messageId: string,
        onChunk: (chunk: AIStreamChunk) => void
    ): Promise<{ success: boolean; message: string; finalContent?: string; metadata?: ApiMetadata }> {
        // Custom provider implementation - assumes OpenAI-compatible API
        if (!provider.endpoint) {
            throw new Error('Custom provider requires an endpoint');
        }

        const apiKey = this.aiProviderService.decryptApiKey(provider.apiKey);

        // Use the full conversation history (assuming OpenAI-compatible format)
        const messages = conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        const response = await fetch(`${provider.endpoint}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: provider.model,
                messages,
                stream: true,
                max_tokens: 2000,
                temperature: 0.7,
                stream_options: {
                    include_usage: true
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Custom provider API error: ${response.status} ${response.statusText}`);
        }

        // Custom providers should use VercelAIChatService instead
        throw new Error('Custom providers should use VercelAIChatService instead of legacy aiChatService');
    }


}
