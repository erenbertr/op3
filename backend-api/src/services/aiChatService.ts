import { AIProviderConfig, AIProviderType } from '../types/ai-provider';
import { ChatMessage, ApiMetadata, SearchResult } from '../types/chat';
import { AIProviderService } from './aiProviderService';
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
    private personalityService: PersonalityService;
    private chatService: ChatService;
    private workspaceService: WorkspaceService;

    private constructor() {
        this.aiProviderService = AIProviderService.getInstance();
        this.personalityService = new PersonalityService();
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
            // Get AI provider configuration with encrypted keys for internal use
            const providers = this.aiProviderService.getProvidersWithEncryptedKeys();
            let selectedProvider: AIProviderConfig | undefined;

            if (request.aiProviderId) {
                selectedProvider = providers.find(p => p.id === request.aiProviderId && p.isActive);
            } else {
                // Use first active provider as default
                selectedProvider = providers.find(p => p.isActive);
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
                request.searchEnabled
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
        searchEnabled?: boolean
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
                    result = await this.streamFromOpenAI(provider, fullConversation, messageId, onChunk, searchEnabled);
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
        searchEnabled?: boolean
    ): Promise<{ success: boolean; message: string; finalContent?: string; metadata?: ApiMetadata }> {
        const endpoint = provider.endpoint || 'https://api.openai.com/v1';
        const apiKey = this.aiProviderService.decryptApiKey(provider.apiKey);

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

        // Add web search tool if enabled
        if (searchEnabled) {
            requestBody.tools = [
                {
                    type: "web_search"
                }
            ];

            // Notify that search is starting
            onChunk({
                type: 'search_start',
                searchQuery: messages[messages.length - 1]?.content || ''
            });
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

        return await this.processOpenAIStream(response, messageId, onChunk, provider.model, conversationHistory);
    }

    /**
     * Process OpenAI streaming response
     */
    private async processOpenAIStream(
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
        return await this.processOpenAIStream(response, messageId, onChunk, provider.model, conversationHistory);
    }
}
