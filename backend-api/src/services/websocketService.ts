import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { AIChatService, StreamingChatRequest, AIStreamChunk } from './aiChatService';
import { ChatService } from './chatService';
import { ChatMessage } from '../types/chat';

interface WebSocketClient {
    id: string;
    ws: WebSocket;
    userId?: string;
    sessionId?: string;
}

interface ChatStreamMessage {
    type: 'chat_stream_request';
    data: StreamingChatRequest;
}

interface ChatStreamResponse {
    type: 'chat_stream_chunk' | 'chat_stream_complete' | 'chat_stream_error';
    data: AIStreamChunk | { userMessage: ChatMessage; aiMessage: ChatMessage } | { error: string };
}

export class WebSocketService {
    private static instance: WebSocketService;
    private wss: WebSocketServer | null = null;
    private clients: Map<string, WebSocketClient> = new Map();
    private aiChatService: AIChatService;
    private chatService: ChatService;

    private constructor() {
        this.aiChatService = AIChatService.getInstance();
        this.chatService = ChatService.getInstance();
    }

    public static getInstance(): WebSocketService {
        if (!WebSocketService.instance) {
            WebSocketService.instance = new WebSocketService();
        }
        return WebSocketService.instance;
    }

    public setupServer(server: HTTPServer): void {
        this.wss = new WebSocketServer({
            server,
            path: '/ws'
        });

        this.wss.on('connection', (ws: WebSocket, request) => {
            const clientId = uuidv4();
            const client: WebSocketClient = {
                id: clientId,
                ws
            };

            this.clients.set(clientId, client);
            console.log(`WebSocket client connected: ${clientId} from ${request.socket.remoteAddress}`);

            // Send connection confirmation
            this.sendToClient(clientId, {
                type: 'connection_established',
                data: { clientId }
            });

            ws.on('message', async (data: Buffer) => {
                try {
                    const message = JSON.parse(data.toString()) as any;
                    await this.handleMessage(clientId, message);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                    this.sendToClient(clientId, {
                        type: 'error',
                        data: { error: 'Invalid message format' }
                    });
                }
            });

            ws.on('close', (code, reason) => {
                console.log(`WebSocket client disconnected: ${clientId}, code: ${code}, reason: ${reason}`);
                this.clients.delete(clientId);
            });

            ws.on('error', (error) => {
                console.error(`WebSocket error for client ${clientId}:`, error);
                this.clients.delete(clientId);
            });
        });

        this.wss.on('error', (error) => {
            console.error('WebSocket server error:', error);
        });

        console.log('WebSocket server setup complete');
    }

    private async handleMessage(clientId: string, message: any): Promise<void> {
        const client = this.clients.get(clientId);
        if (!client) {
            return;
        }

        switch (message.type) {
            case 'authenticate':
                await this.handleAuthentication(clientId, message.data);
                break;
            case 'chat_stream_request':
                await this.handleChatStreamRequest(clientId, message.data);
                break;
            default:
                this.sendToClient(clientId, {
                    type: 'error',
                    data: { error: `Unknown message type: ${message.type}` }
                });
        }
    }

    private async handleAuthentication(clientId: string, data: { userId: string; sessionId?: string }): Promise<void> {
        const client = this.clients.get(clientId);
        if (!client) {
            return;
        }

        client.userId = data.userId;
        client.sessionId = data.sessionId;

        this.sendToClient(clientId, {
            type: 'authenticated',
            data: { success: true }
        });
    }

    private async handleChatStreamRequest(clientId: string, data: StreamingChatRequest): Promise<void> {
        const client = this.clients.get(clientId);
        if (!client || !client.userId) {
            this.sendToClient(clientId, {
                type: 'chat_stream_error',
                data: { error: 'Client not authenticated' }
            });
            return;
        }

        try {
            // Create and save user message first
            const userMessage: ChatMessage = {
                id: uuidv4(),
                sessionId: data.sessionId,
                content: data.content,
                role: 'user',
                personalityId: data.personalityId,
                aiProviderId: data.aiProviderId,
                createdAt: new Date()
            };

            // Save user message to database
            const saveResult = await this.chatService.saveChatMessage(userMessage);
            if (!saveResult.success) {
                this.sendToClient(clientId, {
                    type: 'chat_stream_error',
                    data: { error: 'Failed to save user message' }
                });
                return;
            }

            let aiMessageContent = '';
            let aiMessageId = '';

            // Generate streaming AI response
            const result = await this.aiChatService.generateStreamingResponse(
                data,
                (chunk: AIStreamChunk) => {
                    // Forward streaming chunks to client
                    this.sendToClient(clientId, {
                        type: 'chat_stream_chunk',
                        data: chunk
                    });

                    // Accumulate content for final message
                    if (chunk.type === 'start' && chunk.messageId) {
                        aiMessageId = chunk.messageId;
                    } else if (chunk.type === 'chunk' && chunk.content) {
                        aiMessageContent += chunk.content;
                    }
                }
            );

            if (result.success && result.finalContent) {
                // Create and save AI response message
                const aiMessage: ChatMessage = {
                    id: aiMessageId || uuidv4(),
                    sessionId: data.sessionId,
                    content: result.finalContent,
                    role: 'assistant',
                    personalityId: data.personalityId,
                    aiProviderId: data.aiProviderId,
                    createdAt: new Date()
                };

                // Save AI message to database
                const aiSaveResult = await this.chatService.saveChatMessage(aiMessage);
                if (aiSaveResult.success) {
                    // Send completion message with both messages
                    this.sendToClient(clientId, {
                        type: 'chat_stream_complete',
                        data: {
                            userMessage,
                            aiMessage
                        }
                    });
                } else {
                    this.sendToClient(clientId, {
                        type: 'chat_stream_error',
                        data: { error: 'Failed to save AI response' }
                    });
                }
            } else {
                this.sendToClient(clientId, {
                    type: 'chat_stream_error',
                    data: { error: result.message || 'Failed to generate AI response' }
                });
            }
        } catch (error) {
            console.error('Error handling chat stream request:', error);
            this.sendToClient(clientId, {
                type: 'chat_stream_error',
                data: { error: error instanceof Error ? error.message : 'Unknown error' }
            });
        }
    }

    private sendToClient(clientId: string, message: any): void {
        const client = this.clients.get(clientId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(message));
        }
    }

    public broadcastToSession(sessionId: string, message: any): void {
        for (const client of this.clients.values()) {
            if (client.sessionId === sessionId && client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(JSON.stringify(message));
            }
        }
    }

    public getConnectedClients(): number {
        return this.clients.size;
    }
}

// Export setup function for use in main server
export function setupWebSocketServer(server: HTTPServer): void {
    const wsService = WebSocketService.getInstance();
    wsService.setupServer(server);
}
