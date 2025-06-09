"use client"

import { ChatMessage } from './api';

export interface StreamingChatRequest {
    content: string;
    personalityId?: string;
    aiProviderId?: string;
    sessionId: string;
    userId: string;
}

export interface AIStreamChunk {
    type: 'start' | 'chunk' | 'end' | 'error';
    content?: string;
    messageId?: string;
    error?: string;
}

export interface WebSocketMessage {
    type: string;
    data: unknown;
}

export interface ChatStreamCallbacks {
    onChunk?: (chunk: AIStreamChunk) => void;
    onComplete?: (data: { userMessage: ChatMessage; aiMessage: ChatMessage }) => void;
    onError?: (error: string) => void;
}

export class WebSocketService {
    private static instance: WebSocketService;
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private isConnecting = false;
    private messageQueue: WebSocketMessage[] = [];
    private callbacks: Map<string, ChatStreamCallbacks> = new Map();
    private currentUserId: string | null = null;

    private constructor() { }

    public static getInstance(): WebSocketService {
        if (!WebSocketService.instance) {
            WebSocketService.instance = new WebSocketService();
        }
        return WebSocketService.instance;
    }

    public async connect(userId: string): Promise<boolean> {
        // If already connected to the same user, return true
        if (this.ws?.readyState === WebSocket.OPEN && this.currentUserId === userId) {
            return true;
        }

        // If connecting to a different user, disconnect first
        if (this.ws?.readyState === WebSocket.OPEN && this.currentUserId !== userId) {
            this.disconnect();
        }

        if (this.isConnecting) {
            return false;
        }

        this.isConnecting = true;
        this.currentUserId = userId;

        try {
            const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3006/ws';
            console.log('Attempting to connect to WebSocket:', wsUrl);
            this.ws = new WebSocket(wsUrl);

            return new Promise((resolve, reject) => {
                if (!this.ws) {
                    reject(new Error('Failed to create WebSocket'));
                    return;
                }

                // Set a timeout for the connection attempt
                const connectionTimeout = setTimeout(() => {
                    reject(new Error('WebSocket connection timeout'));
                }, 5000); // 5 second timeout

                this.ws.onopen = () => {
                    console.log('WebSocket connected');
                    clearTimeout(connectionTimeout);
                    this.isConnecting = false;
                    this.reconnectAttempts = 0;

                    // Authenticate with the server
                    this.send({
                        type: 'authenticate',
                        data: { userId }
                    });

                    // Send any queued messages
                    this.processMessageQueue();

                    resolve(true);
                };

                this.ws.onmessage = (event) => {
                    try {
                        const message: WebSocketMessage = JSON.parse(event.data);
                        this.handleMessage(message);
                    } catch (error) {
                        console.error('Error parsing WebSocket message:', error);
                    }
                };

                this.ws.onclose = () => {
                    console.log('WebSocket disconnected');
                    clearTimeout(connectionTimeout);
                    this.isConnecting = false;
                    this.ws = null;
                    this.scheduleReconnect();
                    reject(new Error('WebSocket connection closed'));
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    clearTimeout(connectionTimeout);
                    this.isConnecting = false;
                    // Don't reject immediately - let the close handler manage reconnection
                };
            });
        } catch (error) {
            this.isConnecting = false;
            console.error('Error connecting to WebSocket:', error);
            return false;
        }
    }

    public disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.callbacks.clear();
        this.messageQueue = [];
        this.currentUserId = null;
    }

    public sendChatMessage(
        request: StreamingChatRequest,
        callbacks: ChatStreamCallbacks
    ): string {
        const requestId = crypto.randomUUID();
        this.callbacks.set(requestId, callbacks);

        const message: WebSocketMessage = {
            type: 'chat_stream_request',
            data: { ...request, requestId }
        };

        this.send(message);
        return requestId;
    }

    private send(message: WebSocketMessage): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            // Queue message for when connection is established
            this.messageQueue.push(message);

            // Try to reconnect if not already connecting
            if (!this.isConnecting && this.currentUserId) {
                this.connect(this.currentUserId);
            }
        }
    }

    private handleMessage(message: WebSocketMessage): void {
        switch (message.type) {
            case 'connection_established':
                console.log('WebSocket connection established:', message.data);
                break;

            case 'authenticated':
                console.log('WebSocket authenticated:', message.data);
                break;

            case 'chat_stream_chunk':
                this.handleStreamChunk(message.data as AIStreamChunk);
                break;

            case 'chat_stream_complete':
                this.handleStreamComplete(message.data as { userMessage: ChatMessage; aiMessage: ChatMessage });
                break;

            case 'chat_stream_error':
                this.handleStreamError(message.data as { error: string });
                break;

            case 'error':
                console.error('WebSocket server error:', message.data);
                break;

            default:
                console.warn('Unknown WebSocket message type:', message.type);
        }
    }

    private handleStreamChunk(chunk: AIStreamChunk): void {
        // Find the appropriate callback based on messageId
        for (const [, callbacks] of this.callbacks.entries()) {
            if (callbacks.onChunk) {
                callbacks.onChunk(chunk);
            }
        }
    }

    private handleStreamComplete(data: { userMessage: ChatMessage; aiMessage: ChatMessage }): void {
        // Find and call the appropriate callback
        for (const [, callbacks] of this.callbacks.entries()) {
            if (callbacks.onComplete) {
                callbacks.onComplete(data);
            }
        }

        // Clean up callbacks after completion
        this.callbacks.clear();
    }

    private handleStreamError(data: { error: string }): void {
        // Find and call the appropriate callback
        for (const [, callbacks] of this.callbacks.entries()) {
            if (callbacks.onError) {
                callbacks.onError(data.error);
            }
        }

        // Clean up callbacks after error
        this.callbacks.clear();
    }

    private processMessageQueue(): void {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            if (message) {
                this.send(message);
            }
        }
    }

    private scheduleReconnect(): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts && this.currentUserId) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

            console.log(`Scheduling WebSocket reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

            setTimeout(() => {
                if (this.currentUserId) {
                    this.connect(this.currentUserId);
                }
            }, delay);
        } else {
            console.error('Max WebSocket reconnect attempts reached');
        }
    }

    public isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    public isConnectedToUser(userId: string): boolean {
        return this.ws?.readyState === WebSocket.OPEN && this.currentUserId === userId;
    }

    public getConnectionState(): string {
        if (!this.ws) return 'disconnected';

        switch (this.ws.readyState) {
            case WebSocket.CONNECTING: return 'connecting';
            case WebSocket.OPEN: return 'connected';
            case WebSocket.CLOSING: return 'closing';
            case WebSocket.CLOSED: return 'disconnected';
            default: return 'unknown';
        }
    }
}

// Export singleton instance
export const websocketService = WebSocketService.getInstance();
