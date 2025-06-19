import { UniversalDatabaseService } from '../services/universalDatabaseService';

/**
 * New cleanup utility using Universal Database Abstraction
 * Eliminates all database-specific switch statements!
 */

interface EchoMessage {
    id: string;
    sessionId: string;
    content: string;
    role: string;
    createdAt: Date;
}

/**
 * Clean up Echo messages from chat_messages table - ONE SIMPLE METHOD FOR ALL DATABASES!
 */
async function cleanupEchoMessages(): Promise<void> {
    console.log('🧹 Starting Echo messages cleanup...');
    
    try {
        const universalDb = UniversalDatabaseService.getInstance();
        
        // Initialize schema to ensure table exists
        const schema = universalDb.getSchemaByTableName('chat_messages');
        if (schema) {
            await universalDb.ensureSchema(schema);
        }
        
        console.log('📊 Searching for Echo messages...');
        
        // Find all Echo messages - works with ANY database type!
        const echoMessages = await universalDb.findMany<EchoMessage>('chat_messages', {
            where: [
                { field: 'content', operator: 'eq', value: 'Echo' }
            ],
            orderBy: [{ field: 'createdAt', direction: 'asc' }]
        });
        
        console.log(`📋 Found ${echoMessages.data.length} Echo messages`);
        
        if (echoMessages.data.length === 0) {
            console.log('✅ No Echo messages found. Database is clean!');
            return;
        }
        
        // Show some examples
        console.log('\n📝 Examples of Echo messages to be deleted:');
        echoMessages.data.slice(0, 5).forEach((msg, index) => {
            console.log(`   ${index + 1}. ID: ${msg.id}, Session: ${msg.sessionId}, Role: ${msg.role}, Created: ${msg.createdAt}`);
        });
        
        if (echoMessages.data.length > 5) {
            console.log(`   ... and ${echoMessages.data.length - 5} more`);
        }
        
        console.log('\n🗑️ Deleting Echo messages...');
        
        // Delete all Echo messages - works with ANY database type!
        const deleteResult = await universalDb.deleteMany('chat_messages', {
            where: [
                { field: 'content', operator: 'eq', value: 'Echo' }
            ]
        });
        
        console.log(`✅ Cleanup completed! Removed ${deleteResult.deletedCount} Echo messages.`);
        
        // Verify cleanup
        const remainingEchoMessages = await universalDb.count('chat_messages', {
            where: [
                { field: 'content', operator: 'eq', value: 'Echo' }
            ]
        });
        
        if (remainingEchoMessages === 0) {
            console.log('🎉 Verification successful: No Echo messages remain in the database.');
        } else {
            console.log(`⚠️ Warning: ${remainingEchoMessages} Echo messages still remain. You may need to run the cleanup again.`);
        }
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    }
}

/**
 * Clean up messages by pattern - ONE SIMPLE METHOD FOR ALL DATABASES!
 */
async function cleanupMessagesByPattern(pattern: string, description: string): Promise<number> {
    console.log(`🧹 Cleaning up ${description}...`);
    
    try {
        const universalDb = UniversalDatabaseService.getInstance();
        
        // Find messages matching the pattern - works with ANY database type!
        const messages = await universalDb.findMany<EchoMessage>('chat_messages', {
            where: [
                { field: 'content', operator: 'like', value: pattern }
            ]
        });
        
        console.log(`📋 Found ${messages.data.length} ${description}`);
        
        if (messages.data.length === 0) {
            return 0;
        }
        
        // Delete matching messages - works with ANY database type!
        const deleteResult = await universalDb.deleteMany('chat_messages', {
            where: [
                { field: 'content', operator: 'like', value: pattern }
            ]
        });
        
        console.log(`✅ Removed ${deleteResult.deletedCount} ${description}`);
        return deleteResult.deletedCount;
        
    } catch (error) {
        console.error(`❌ Error cleaning up ${description}:`, error);
        return 0;
    }
}

/**
 * Clean up old messages - ONE SIMPLE METHOD FOR ALL DATABASES!
 */
async function cleanupOldMessages(daysOld: number): Promise<number> {
    console.log(`🧹 Cleaning up messages older than ${daysOld} days...`);
    
    try {
        const universalDb = UniversalDatabaseService.getInstance();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        
        // Find old messages - works with ANY database type!
        const oldMessages = await universalDb.findMany<EchoMessage>('chat_messages', {
            where: [
                { field: 'createdAt', operator: 'lt', value: cutoffDate }
            ]
        });
        
        console.log(`📋 Found ${oldMessages.data.length} messages older than ${daysOld} days`);
        
        if (oldMessages.data.length === 0) {
            return 0;
        }
        
        // Delete old messages - works with ANY database type!
        const deleteResult = await universalDb.deleteMany('chat_messages', {
            where: [
                { field: 'createdAt', operator: 'lt', value: cutoffDate }
            ]
        });
        
        console.log(`✅ Removed ${deleteResult.deletedCount} old messages`);
        return deleteResult.deletedCount;
        
    } catch (error) {
        console.error('❌ Error cleaning up old messages:', error);
        return 0;
    }
}

/**
 * Get cleanup statistics - ONE SIMPLE METHOD FOR ALL DATABASES!
 */
async function getCleanupStatistics(): Promise<void> {
    console.log('📊 Getting cleanup statistics...');
    
    try {
        const universalDb = UniversalDatabaseService.getInstance();
        
        // Get total message count - works with ANY database type!
        const totalMessages = await universalDb.count('chat_messages');
        
        // Get Echo message count - works with ANY database type!
        const echoMessages = await universalDb.count('chat_messages', {
            where: [
                { field: 'content', operator: 'eq', value: 'Echo' }
            ]
        });
        
        // Get messages from last 7 days - works with ANY database type!
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        const recentMessages = await universalDb.count('chat_messages', {
            where: [
                { field: 'createdAt', operator: 'gte', value: lastWeek }
            ]
        });
        
        // Get user vs assistant message counts - works with ANY database type!
        const userMessages = await universalDb.count('chat_messages', {
            where: [
                { field: 'role', operator: 'eq', value: 'user' }
            ]
        });
        
        const assistantMessages = await universalDb.count('chat_messages', {
            where: [
                { field: 'role', operator: 'eq', value: 'assistant' }
            ]
        });
        
        console.log('\n📈 Database Statistics:');
        console.log(`   Total messages: ${totalMessages}`);
        console.log(`   Echo messages: ${echoMessages}`);
        console.log(`   Recent messages (last 7 days): ${recentMessages}`);
        console.log(`   User messages: ${userMessages}`);
        console.log(`   Assistant messages: ${assistantMessages}`);
        console.log(`   Other messages: ${totalMessages - userMessages - assistantMessages}`);
        
        if (echoMessages > 0) {
            const percentage = ((echoMessages / totalMessages) * 100).toFixed(2);
            console.log(`   Echo messages represent ${percentage}% of total messages`);
        }
        
    } catch (error) {
        console.error('❌ Error getting statistics:', error);
    }
}

/**
 * Main cleanup function with options
 */
async function runCleanup(options: {
    echoMessages?: boolean;
    oldMessages?: { enabled: boolean; daysOld: number };
    patterns?: { pattern: string; description: string }[];
    statistics?: boolean;
} = {}): Promise<void> {
    console.log('🚀 UNIVERSAL DATABASE CLEANUP UTILITY');
    console.log('====================================');
    console.log('Works with MongoDB, MySQL, PostgreSQL, SQLite, Supabase!');
    console.log('');
    
    try {
        const universalDb = UniversalDatabaseService.getInstance();
        
        // Initialize schema
        await universalDb.initializeAllSchemas();
        console.log('✅ Database schemas initialized');
        
        let totalDeleted = 0;
        
        // Show statistics if requested
        if (options.statistics !== false) {
            await getCleanupStatistics();
            console.log('');
        }
        
        // Clean up Echo messages
        if (options.echoMessages !== false) {
            await cleanupEchoMessages();
            console.log('');
        }
        
        // Clean up by patterns
        if (options.patterns) {
            for (const { pattern, description } of options.patterns) {
                const deleted = await cleanupMessagesByPattern(pattern, description);
                totalDeleted += deleted;
            }
            console.log('');
        }
        
        // Clean up old messages
        if (options.oldMessages?.enabled) {
            const deleted = await cleanupOldMessages(options.oldMessages.daysOld);
            totalDeleted += deleted;
            console.log('');
        }
        
        console.log(`🎉 Cleanup completed! Total messages processed: ${totalDeleted}`);
        console.log('');
        console.log('💡 Benefits of Universal Database Abstraction:');
        console.log('   ✅ Same cleanup code works with ALL database types');
        console.log('   ✅ No database-specific switch statements');
        console.log('   ✅ Consistent behavior across all databases');
        console.log('   ✅ Easy to maintain and extend');
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    }
}

// Export functions for use
export {
    cleanupEchoMessages,
    cleanupMessagesByPattern,
    cleanupOldMessages,
    getCleanupStatistics,
    runCleanup
};

// Run cleanup if called directly
if (require.main === module) {
    runCleanup({
        echoMessages: true,
        statistics: true,
        // oldMessages: { enabled: true, daysOld: 30 },
        // patterns: [
        //     { pattern: 'test%', description: 'test messages' },
        //     { pattern: 'debug%', description: 'debug messages' }
        // ]
    }).catch(console.error);
}

// AMAZING IMPROVEMENT: No more database-specific switch statements!
// Universal compatibility with all database types!
// Clean, maintainable, and extensible code!
