import { AIProviderConfig } from '../types/ai-provider';
import { ChatMessage, ApiMetadata } from '../types/chat';
import { AIProviderService } from './aiProviderService';
import { OpenAIModelConfigService } from './openaiModelConfigService';
import { OpenAIProviderService } from './openaiProviderService';
import { PersonalityService } from './personalityService';
import { ChatService } from './chatService';
import { WorkspaceService } from './workspaceService';
import { GoogleSearchService, createGoogleSearchService } from './googleSearchService';
import { OpenAIFileService } from './openaiFileService';

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
    private openaiModelConfigService: OpenAIModelConfigService;
    private openaiProviderService: OpenAIProviderService;
    private personalityService: PersonalityService;
    private chatService: ChatService;
    private workspaceService: WorkspaceService;
    private googleSearchService: GoogleSearchService | null;
    private openaiFileService: OpenAIFileService;

    private constructor() {
        this.aiProviderService = AIProviderService.getInstance();
        this.openaiModelConfigService = OpenAIModelConfigService.getInstance();
        this.openaiProviderService = OpenAIProviderService.getInstance();
        this.personalityService = new PersonalityService();
        this.chatService = ChatService.getInstance();
        this.workspaceService = WorkspaceService.getInstance();
        this.googleSearchService = createGoogleSearchService();
        this.openaiFileService = OpenAIFileService.getInstance();
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

                // If not found, try old AI provider system
                if (!selectedProvider) {
                    const providers = this.aiProviderService.getProvidersWithEncryptedKeys();
                    selectedProvider = providers.find(p => p.id === request.aiProviderId && p.isActive);
                }
            } else {
                // Use first active provider as default (try OpenAI model configs first)
                const modelConfigs = await this.openaiModelConfigService.getAllModelConfigs();
                if (modelConfigs.success && modelConfigs.data && Array.isArray(modelConfigs.data) && modelConfigs.data.length > 0) {
                    const activeConfig = modelConfigs.data.find((config: any) => config.isActive);
                    if (activeConfig) {
                        selectedProvider = await this.resolveOpenAIModelConfig(activeConfig.id);
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
            const allConfigsResult = await this.openaiModelConfigService.getAllModelConfigs();
            if (!allConfigsResult.success || !allConfigsResult.data) {
                return undefined;
            }

            const allConfigs = Array.isArray(allConfigsResult.data) ? allConfigsResult.data : [allConfigsResult.data];
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
     * Build system prompt from workspace rules and personality
     */
    private async buildSystemPrompt(sessionId: string, personalityId?: string, userId?: string): Promise<string> {
        const systemParts: string[] = [];

        try {
            // Get chat session to find workspace ID
            const chatSession = await this.chatService.getChatSession(sessionId);
            if (chatSession.success && chatSession.session) {
                // Get workspace rules
                const workspaceResult = await this.workspaceService.getWorkspace(chatSession.session.workspaceId, chatSession.session.userId);
                if (workspaceResult.success && workspaceResult.workspace && workspaceResult.workspace.workspaceRules && workspaceResult.workspace.workspaceRules.trim()) {
                    systemParts.push(`Workspace Context: ${workspaceResult.workspace.workspaceRules.trim()}`);
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
                    result = await this.streamFromOpenAI(provider, fullConversation, messageId, onChunk, searchEnabled, fileAttachments, sessionId, reasoningEnabled);
                    break;
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
     * Stream from OpenAI API
     */
    private async streamFromOpenAI(
        provider: AIProviderConfig,
        conversationHistory: ConversationMessage[],
        messageId: string,
        onChunk: (chunk: AIStreamChunk) => void,
        searchEnabled?: boolean,
        fileAttachments?: string[],
        sessionId?: string,
        reasoningEnabled?: boolean
    ): Promise<{ success: boolean; message: string; finalContent?: string; metadata?: ApiMetadata }> {
        const endpoint = provider.endpoint || 'https://api.openai.com/v1';
        // Check if API key is already decrypted (from OpenAI model config) or needs decryption (from old provider system)
        const apiKey = provider.apiKey.includes(':') ? this.aiProviderService.decryptApiKey(provider.apiKey) : provider.apiKey;

        // Use the full conversation history
        const messages = conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        // Build request body
        const requestBody: any = {
            model: provider.model,
            messages,
            stream: true,
            max_tokens: 2000,
            temperature: 0.7,
            stream_options: {
                include_usage: true
            }
        };

        // Handle o1 models separately (they don't support Responses API)
        const isO1Model = provider.model.startsWith('o1');
        if (isO1Model) {
            // O1 models use regular Chat Completions API but with special handling
            return await this.streamFromOpenAIO1(provider, conversationHistory, messageId, onChunk, reasoningEnabled);
        }

        // Handle file search or web search using Responses API (for non-o1 models)
        const requiresResponsesApi = provider.model.startsWith('o') && !isO1Model; // Exclude o1 models
        if (requiresResponsesApi || (fileAttachments && fileAttachments.length > 0) || (searchEnabled && this.supportsOpenAIWebSearch(provider))) {
            try {
                // Use Responses API for file search or web search
                return await this.streamFromOpenAIResponses(provider, conversationHistory, messageId, onChunk, fileAttachments, sessionId, reasoningEnabled);
            } catch (error) {
                console.warn('OpenAI Responses API failed:', error);
                if (searchEnabled) {
                    console.warn('Falling back to Google Custom Search');
                    // Fall back to Google Custom Search if Responses API fails
                    await this.performWebSearch(conversationHistory, onChunk, messageId);
                }
            }
        } else if (searchEnabled) {
            // Fall back to Google Custom Search for models that don't support OpenAI web search
            await this.performWebSearch(conversationHistory, onChunk, messageId);
        }

        const response = await fetch(`${endpoint}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
        }

        return await this.processOpenAIStream(response, messageId, onChunk, provider.model);
    }

    /**
     * Stream from OpenAI O1 models (special handling for reasoning models)
     */
    private async streamFromOpenAIO1(
        provider: AIProviderConfig,
        conversationHistory: ConversationMessage[],
        messageId: string,
        onChunk: (chunk: AIStreamChunk) => void,
        reasoningEnabled?: boolean
    ): Promise<{ success: boolean; message: string; finalContent?: string; metadata?: ApiMetadata }> {
        const endpoint = provider.endpoint || 'https://api.openai.com/v1';
        const apiKey = provider.apiKey.includes(':') ? this.aiProviderService.decryptApiKey(provider.apiKey) : provider.apiKey;

        // O1 models don't support system messages, so we need to convert them to user messages
        const processedMessages = conversationHistory.map(msg => {
            if (msg.role === 'system') {
                return {
                    role: 'user' as const,
                    content: `[System instruction: ${msg.content}]`
                };
            }
            return msg;
        });

        const requestBody = {
            model: provider.model,
            messages: processedMessages,
            stream: false, // O1 models don't support streaming
            max_completion_tokens: 32768, // O1 models use max_completion_tokens instead of max_tokens
        };

        console.log('OpenAI O1 API Request:', JSON.stringify(requestBody, null, 2));

        const response = await fetch(`${endpoint}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('OpenAI O1 API error:', errorData);
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as any;
        console.log('OpenAI O1 API Response:', JSON.stringify(data, null, 2));

        const content = data.choices?.[0]?.message?.content || 'No response generated';
        const usage = data.usage || {};

        // Simulate streaming by sending the content in chunks
        const words = content.split(' ');
        for (let i = 0; i < words.length; i += 5) {
            const chunk = words.slice(i, i + 5).join(' ') + (i + 5 < words.length ? ' ' : '');
            onChunk({
                type: 'chunk',
                messageId,
                content: chunk
            });
            // Small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return {
            success: true,
            message: 'Response generated successfully',
            finalContent: content,
            metadata: {
                inputTokens: usage.prompt_tokens || 0,
                outputTokens: usage.completion_tokens || 0,
                totalTokens: usage.total_tokens || 0,
                model: provider.model,
                provider: 'openai',
                reasoningEnabled: reasoningEnabled || false
            }
        };
    }

    /**
     * Perform web search using Google Custom Search
     */
    private async performWebSearch(
        conversationHistory: ConversationMessage[],
        onChunk: (chunk: AIStreamChunk) => void,
        messageId: string
    ): Promise<void> {
        if (!this.googleSearchService || !this.googleSearchService.isConfigured()) {
            onChunk({
                type: 'chunk',
                messageId,
                content: '[Note: Web search is not configured. Please set GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID environment variables.]\n\n'
            });
            return;
        }

        // Get the last user message as the search query
        const lastUserMessage = conversationHistory.filter(msg => msg.role === 'user').pop();
        if (!lastUserMessage) {
            return;
        }

        const searchQuery = lastUserMessage.content;

        try {
            // Notify that search is starting
            onChunk({
                type: 'search_start',
                searchQuery
            });

            // Perform the search
            const searchResults = await this.googleSearchService.search(searchQuery, 5);

            // Notify about search results
            onChunk({
                type: 'search_results',
                searchQuery,
                searchResults
            });

            // Add search results context to the conversation
            if (searchResults.length > 0) {
                const searchContext = `Based on recent web search results for "${searchQuery}":\n\n` +
                    searchResults.map((result, index) =>
                        `${index + 1}. ${result.title}\n   ${result.snippet}\n   Source: ${result.url}`
                    ).join('\n\n') +
                    '\n\nPlease use this information along with your training data to provide a comprehensive answer.\n\n';

                onChunk({
                    type: 'chunk',
                    messageId,
                    content: searchContext
                });
            }
        } catch (error) {
            console.error('Web search error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            onChunk({
                type: 'chunk',
                messageId,
                content: `[Note: Web search failed: ${errorMessage}. Responding with training data only.]\n\n`
            });
        }
    }



    /**
     * Check if OpenAI model supports web search via Responses API
     */
    private supportsOpenAIWebSearch(provider: AIProviderConfig): boolean {
        // Models that support web search via Responses API
        // Also include older models that might work with Responses API
        const webSearchModels = [
            'gpt-4.1',
            'gpt-4.1-mini',
            'gpt-4o',
            'gpt-4o-mini',
            'gpt-4-turbo',
            'gpt-4'
        ];
        return webSearchModels.includes(provider.model);
    }

    /**
     * Stream from OpenAI Responses API with web search and/or file search
     */
    private async streamFromOpenAIResponses(
        provider: AIProviderConfig,
        conversationHistory: ConversationMessage[],
        messageId: string,
        onChunk: (chunk: AIStreamChunk) => void,
        fileAttachments?: string[],
        sessionId?: string,
        reasoningEnabled?: boolean
    ): Promise<{ success: boolean; message: string; finalContent?: string; metadata?: ApiMetadata }> {
        const endpoint = provider.endpoint || 'https://api.openai.com/v1';
        // Check if API key is already decrypted (from OpenAI model config) or needs decryption (from old provider system)
        const apiKey = provider.apiKey.includes(':') ? this.aiProviderService.decryptApiKey(provider.apiKey) : provider.apiKey;

        // Get the last user message as input
        const lastUserMessage = conversationHistory.filter(msg => msg.role === 'user').pop();
        if (!lastUserMessage) {
            throw new Error('No user message found');
        }

        // Build context from conversation history
        let input = lastUserMessage.content;
        if (conversationHistory.length > 1) {
            const previousMessages = conversationHistory.slice(0, -1);
            if (previousMessages.length > 0) {
                const contextString = previousMessages.map(msg =>
                    `${msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System'}: ${msg.content}`
                ).join('\n\n');
                input = `Previous conversation:\n${contextString}\n\nCurrent question: ${lastUserMessage.content}`;
            }
        }

        // Notify that search is starting
        onChunk({
            type: 'search_start',
            searchQuery: lastUserMessage.content
        });

        // Build tools array based on what's needed
        const tools: any[] = [];

        // Add web search if no file attachments (or both if needed)
        if (!fileAttachments || fileAttachments.length === 0) {
            tools.push({
                type: "web_search_preview",
                search_context_size: "medium"
            });
        }

        // Add file search if file attachments are present
        if (fileAttachments && fileAttachments.length > 0 && sessionId) {
            // Get vector store for the session
            const vectorStoreResult = await this.getVectorStoreForSession(sessionId);
            if (vectorStoreResult) {
                tools.push({
                    type: "file_search",
                    vector_store_ids: [vectorStoreResult]
                });
            }
        }

        const requestBody: any = {
            model: provider.model,
            input: input,
            tools: tools
        } as any;

        // Include reasoning parameter when enabled or required by model
        const requiresReasoning = provider.model.startsWith('o');
        if (reasoningEnabled || requiresReasoning) {
            requestBody.reasoning = { effort: 'medium' };
        }

        console.log('OpenAI Responses API Request:', JSON.stringify(requestBody, null, 2));
        console.log('File attachments provided:', fileAttachments);
        console.log('Session ID:', sessionId);
        if (sessionId) {
            const vectorStoreId = await this.getVectorStoreForSession(sessionId);
            console.log('Vector store result:', vectorStoreId);
        }

        const response = await fetch(`${endpoint}/responses`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenAI Responses API error response:', errorText);
            throw new Error(`OpenAI Responses API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data: any = await response.json();
        console.log('OpenAI Responses API Response:', JSON.stringify(data, null, 2));
        let finalContent = '';
        let searchResults: any[] = [];

        // Process the response output
        if (data.output && Array.isArray(data.output)) {
            for (const output of data.output) {
                if (output.type === 'web_search_call') {
                    // Web search was performed
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
                                        snippet: finalContent.substring(ann.start_index, ann.end_index) || 'Citation from web search'
                                    }));
                            }

                            // Notify about search results
                            if (searchResults.length > 0) {
                                onChunk({
                                    type: 'search_results',
                                    searchQuery: lastUserMessage.content,
                                    searchResults
                                });
                            }

                            // Simulate streaming by sending content in chunks
                            const words = finalContent.split(' ');
                            for (let i = 0; i < words.length; i += 5) {
                                const chunk = words.slice(i, i + 5).join(' ') + (i + 5 < words.length ? ' ' : '');
                                onChunk({
                                    type: 'chunk',
                                    messageId,
                                    content: chunk
                                });
                                // Small delay to simulate streaming
                                await new Promise(resolve => setTimeout(resolve, 30));
                            }
                        }
                    }
                }
            }
        }

        const metadata: ApiMetadata = {
            model: provider.model,
            totalTokens: data.usage?.total_tokens || 0,
            inputTokens: data.usage?.input_tokens || 0,
            outputTokens: data.usage?.output_tokens || 0,
            searchResults,
            searchQuery: lastUserMessage.content
        };

        onChunk({
            type: 'end',
            messageId,
            metadata
        });

        return {
            success: true,
            message: 'Response generated successfully with web search',
            finalContent,
            metadata
        };
    }

    /**
     * Process OpenAI streaming response
     */
    private async processOpenAIStream(
        response: Response,
        messageId: string,
        onChunk: (chunk: AIStreamChunk) => void,
        model: string
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
                        if (data === '[DONE]') {
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
                        }

                        try {
                            const parsed = JSON.parse(data);

                            // Handle regular content
                            const content = parsed.choices?.[0]?.delta?.content;
                            if (content) {
                                finalContent += content;
                                onChunk({
                                    type: 'chunk',
                                    messageId,
                                    content
                                });
                            }

                            // Handle tool calls (web search)
                            const toolCalls = parsed.choices?.[0]?.delta?.tool_calls;
                            if (toolCalls && Array.isArray(toolCalls)) {
                                for (const toolCall of toolCalls) {
                                    if (toolCall.type === 'web_search') {
                                        // Notify that search results are available
                                        onChunk({
                                            type: 'search_results',
                                            searchQuery: toolCall.web_search?.query || '',
                                            searchResults: toolCall.web_search?.results || []
                                        });
                                    }
                                }
                            }

                            // Handle function calls (alternative format for tool calls)
                            const functionCall = parsed.choices?.[0]?.delta?.function_call;
                            if (functionCall && functionCall.name === 'web_search') {
                                try {
                                    const args = JSON.parse(functionCall.arguments || '{}');
                                    if (args.query) {
                                        onChunk({
                                            type: 'search_start',
                                            searchQuery: args.query
                                        });
                                    }
                                } catch (e) {
                                    // Ignore parsing errors for partial function calls
                                }
                            }

                            // Capture token usage if available (OpenAI includes this in final chunk)
                            if (parsed.usage) {
                                inputTokens = parsed.usage.prompt_tokens || 0;
                                outputTokens = parsed.usage.completion_tokens || 0;
                            }

                            // Also check for finish_reason to capture final usage
                            if (parsed.choices?.[0]?.finish_reason && parsed.usage) {
                                inputTokens = parsed.usage.prompt_tokens || 0;
                                outputTokens = parsed.usage.completion_tokens || 0;
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
                const estimatedInputTokens = Math.ceil(finalContent.length / 8); // Rough estimate for input
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
        // For now, implement a simple non-streaming response for Google
        // Google's Gemini API streaming implementation can be added later
        const endpoint = provider.endpoint || 'https://generativelanguage.googleapis.com';
        const apiKey = this.aiProviderService.decryptApiKey(provider.apiKey);

        // Build prompt from conversation history
        const prompt = conversationHistory.map(msg => {
            if (msg.role === 'system') return msg.content;
            if (msg.role === 'user') return `User: ${msg.content}`;
            if (msg.role === 'assistant') return `Assistant: ${msg.content}`;
            return msg.content;
        }).join('\n\n');

        const response = await fetch(`${endpoint}/v1beta/models/${provider.model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`Google AI API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as any;
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';

        // Simulate streaming by sending the content in chunks
        const words = content.split(' ');
        for (let i = 0; i < words.length; i += 3) {
            const chunk = words.slice(i, i + 3).join(' ') + (i + 3 < words.length ? ' ' : '');
            onChunk({
                type: 'chunk',
                messageId,
                content: chunk
            });
            // Small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        const estimatedInputTokens = Math.ceil(conversationHistory.reduce((acc: number, msg: any) => acc + msg.content.length, 0) / 4);
        const estimatedOutputTokens = Math.ceil(content.length / 4);

        const metadata: ApiMetadata = {
            model: provider.model,
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
            finalContent: content,
            metadata
        };
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

        // Use OpenAI stream processing for custom providers (assuming compatibility)
        return await this.processOpenAIStream(response, messageId, onChunk, provider.model);
    }

    /**
     * Get vector store ID for a session
     */
    private async getVectorStoreForSession(sessionId: string): Promise<string | null> {
        try {
            // Get the first user from the session (simplified approach)
            const chatSession = await this.chatService.getChatSession(sessionId);
            if (!chatSession.success || !chatSession.session) {
                return null;
            }

            const vectorStoreResult = await this.openaiFileService.getOrCreateVectorStore(sessionId, chatSession.session.userId);
            if (vectorStoreResult.success && vectorStoreResult.vectorStore) {
                return vectorStoreResult.vectorStore.openaiVectorStoreId;
            }
            return null;
        } catch (error) {
            console.error('Error getting vector store for session:', error);
            return null;
        }
    }
}
