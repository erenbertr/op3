import { ChatService } from '../services/chatService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Script to test the sharing functionality
 */
async function testSharing() {
    try {
        console.log('🧪 Testing sharing functionality...');

        const chatService = ChatService.getInstance();

        // First, let's try to create a test chat session
        const testUserId = uuidv4();
        const testWorkspaceId = uuidv4();
        const testSessionId = uuidv4();

        console.log('📝 Creating test chat session...');
        const createSessionResult = await chatService.createChatSession({
            userId: testUserId,
            workspaceId: testWorkspaceId,
            title: 'Test Chat for Sharing'
        });

        if (!createSessionResult.success) {
            console.error('❌ Failed to create test session:', createSessionResult.message);
            return;
        }

        const sessionId = createSessionResult.session!.id;
        console.log('✅ Test session created:', sessionId);

        // Add a test message using the universal database directly
        console.log('💬 Adding test message...');
        const messageId = uuidv4();
        const messageResult = await chatService['universalDb'].insert('chat_messages', {
            id: messageId,
            sessionId,
            content: 'Hello, this is a test message for sharing!',
            role: 'user',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        console.log('✅ Test message added');

        // Now test sharing
        console.log('🔗 Testing share creation...');
        const shareResult = await chatService.createChatShare(sessionId);

        if (shareResult.success) {
            console.log('✅ Share created successfully!');
            console.log('📋 Share ID:', shareResult.shareId);
            console.log('🔗 Share URL:', shareResult.shareUrl);

            // Test retrieving the shared chat
            console.log('📖 Testing share retrieval...');
            const retrieveResult = await chatService.getSharedChat(shareResult.shareId!);

            if (retrieveResult.success) {
                console.log('✅ Share retrieved successfully!');
                console.log('📄 Shared chat title:', retrieveResult.sharedChat?.title);
                console.log('💬 Message count:', retrieveResult.sharedChat?.messageCount);
            } else {
                console.error('❌ Failed to retrieve share:', retrieveResult.message);
            }
        } else {
            console.error('❌ Failed to create share:', shareResult.message);
        }

        // Clean up - delete the test session
        console.log('🧹 Cleaning up test data...');
        await chatService.deleteChatSession(sessionId);

        console.log('✅ Test completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during test:', error);
        process.exit(1);
    }
}

// Run the test
testSharing();
