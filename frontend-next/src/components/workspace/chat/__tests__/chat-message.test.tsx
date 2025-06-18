import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChatMessage } from '../chat-message';
import { ChatMessage as ChatMessageType } from '@/lib/api';

// Mock the dependencies
jest.mock('@/lib/hooks/use-query-hooks', () => ({
    useOpenAIModelConfigs: () => ({ data: [] })
}));

jest.mock('../api-metadata-tooltip', () => ({
    ApiMetadataTooltip: () => <div data-testid="api-metadata-tooltip">API Metadata</div>
}));

jest.mock('../file-attachment-display', () => ({
    FileAttachmentDisplay: () => <div data-testid="file-attachment-display">File Attachments</div>
}));

jest.mock('../ai-provider-selector', () => ({
    AIProviderSelector: () => <div data-testid="ai-provider-selector">AI Provider Selector</div>
}));

jest.mock('../message-share-modal', () => ({
    MessageShareModal: () => <div data-testid="message-share-modal">Message Share Modal</div>
}));

// Mock clipboard API
Object.assign(navigator, {
    clipboard: {
        writeText: jest.fn(() => Promise.resolve()),
    },
});

describe('ChatMessage', () => {
    const mockMessage: ChatMessageType = {
        id: 'test-message-1',
        role: 'user',
        content: 'This is a short message',
        timestamp: new Date().toISOString(),
        chatId: 'test-chat-1'
    };

    const mockLongMessage: ChatMessageType = {
        id: 'test-message-2',
        role: 'assistant',
        content: 'This is a very long message that contains more than 500 words. '.repeat(50), // Creates ~500+ words
        timestamp: new Date().toISOString(),
        chatId: 'test-chat-1'
    };

    const defaultProps = {
        message: mockMessage,
        onRetry: jest.fn(),
        onContinue: jest.fn(),
        onBranch: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders message content correctly', () => {
        render(<ChatMessage {...defaultProps} />);
        expect(screen.getByText('This is a short message')).toBeInTheDocument();
    });

    it('shows actions on hover for short messages', () => {
        render(<ChatMessage {...defaultProps} />);
        
        const messageContainer = screen.getByText('This is a short message').closest('.group');
        expect(messageContainer).toBeInTheDocument();
        
        // Simulate hover
        fireEvent.mouseEnter(messageContainer!);
        
        // Should show copy button
        expect(screen.getByTitle(/copy/i)).toBeInTheDocument();
    });

    it('shows duplicate actions for long messages (500+ words)', () => {
        render(<ChatMessage {...defaultProps} message={mockLongMessage} />);
        
        const messageContainer = screen.getByText(/This is a very long message/).closest('.group');
        expect(messageContainer).toBeInTheDocument();
        
        // Simulate hover to show top actions
        fireEvent.mouseEnter(messageContainer!);
        
        // Should show both top and bottom actions for long messages
        const copyButtons = screen.getAllByTitle(/copy/i);
        expect(copyButtons).toHaveLength(2); // One at top (hover), one at bottom (permanent)
    });

    it('does not show bottom actions for short messages', () => {
        render(<ChatMessage {...defaultProps} />);
        
        // Should only have one set of actions (hover actions)
        const messageContainer = screen.getByText('This is a short message').closest('.group');
        fireEvent.mouseEnter(messageContainer!);
        
        const copyButtons = screen.getAllByTitle(/copy/i);
        expect(copyButtons).toHaveLength(1); // Only hover actions
    });

    it('handles copy functionality', async () => {
        render(<ChatMessage {...defaultProps} />);
        
        const messageContainer = screen.getByText('This is a short message').closest('.group');
        fireEvent.mouseEnter(messageContainer!);
        
        const copyButton = screen.getByTitle(/copy/i);
        fireEvent.click(copyButton);
        
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('This is a short message');
    });

    it('shows share button in actions', () => {
        render(<ChatMessage {...defaultProps} />);
        
        const messageContainer = screen.getByText('This is a short message').closest('.group');
        fireEvent.mouseEnter(messageContainer!);
        
        expect(screen.getByTitle(/share message/i)).toBeInTheDocument();
    });

    it('shows branch button when onBranch is provided', () => {
        render(<ChatMessage {...defaultProps} />);
        
        const messageContainer = screen.getByText('This is a short message').closest('.group');
        fireEvent.mouseEnter(messageContainer!);
        
        expect(screen.getByTitle(/branch conversation/i)).toBeInTheDocument();
    });

    it('shows retry button for non-partial messages', () => {
        render(<ChatMessage {...defaultProps} />);
        
        const messageContainer = screen.getByText('This is a short message').closest('.group');
        fireEvent.mouseEnter(messageContainer!);
        
        expect(screen.getByTitle(/retry message/i)).toBeInTheDocument();
    });

    it('shows continue button for partial messages', () => {
        const partialMessage = { ...mockMessage, isPartial: true };
        render(<ChatMessage {...defaultProps} message={partialMessage} />);
        
        const messageContainer = screen.getByText('This is a short message').closest('.group');
        fireEvent.mouseEnter(messageContainer!);
        
        expect(screen.getByTitle(/continue message/i)).toBeInTheDocument();
    });
});
