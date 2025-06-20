#!/usr/bin/env ts-node

/**
 * Cleanup script to remove "Echo:" messages from the database
 * This removes the mock/test messages that were created by the old sendMessage method
 *
 * REFACTORED: Now uses Universal Database Service - works with ANY database!
 */

import { UniversalDatabaseService } from '../services/universalDatabaseService';

async function cleanupEchoMessages() {
    console.log('🧹 Starting cleanup of Echo messages...');

    try {
        const universalDb = UniversalDatabaseService.getInstance();

        console.log('📊 Using Universal Database Service - works with ANY database type!');

        // ONE SIMPLE METHOD FOR ALL DATABASES!
        const result = await universalDb.deleteMany('chat_messages', {
            where: [
                { field: 'role', operator: 'eq', value: 'assistant' },
                { field: 'content', operator: 'like', value: 'Echo:' }
            ]
        });

        if (result.success) {
            console.log(`✅ Cleanup completed! Removed ${result.deletedCount || 0} Echo messages.`);
        } else {
            throw new Error('Failed to delete Echo messages');
        }

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    }
}



// Run the cleanup if this script is executed directly
if (require.main === module) {
    cleanupEchoMessages();
}

export { cleanupEchoMessages };
