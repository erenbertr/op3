#!/usr/bin/env ts-node

/**
 * Cleanup script to remove "Echo:" messages from the database
 * This removes the mock/test messages that were created by the old sendMessage method
 */

import { DatabaseManager } from '../config/database';

async function cleanupEchoMessages() {
    console.log('🧹 Starting cleanup of Echo messages...');
    
    try {
        const dbManager = DatabaseManager.getInstance();
        const config = dbManager.getCurrentConfig();
        
        if (!config) {
            console.error('❌ No database configuration found');
            process.exit(1);
        }
        
        console.log(`📊 Using database type: ${config.type}`);
        
        const connection = await dbManager.getConnection();
        let deletedCount = 0;
        
        switch (config.type) {
            case 'mongodb':
                deletedCount = await cleanupEchoMessagesMongo(connection);
                break;
            case 'localdb':
                deletedCount = await cleanupEchoMessagesSQLite(connection);
                break;
            case 'mysql':
            case 'postgresql':
                deletedCount = await cleanupEchoMessagesSQL(connection);
                break;
            case 'supabase':
                deletedCount = await cleanupEchoMessagesSupabase(connection);
                break;
            default:
                console.error(`❌ Database type ${config.type} not supported`);
                process.exit(1);
        }
        
        console.log(`✅ Cleanup completed! Removed ${deletedCount} Echo messages.`);
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    }
}

async function cleanupEchoMessagesMongo(db: any): Promise<number> {
    const collection = db.collection('chat_messages');
    
    // Find messages that start with "Echo:"
    const result = await collection.deleteMany({
        role: 'assistant',
        content: { $regex: '^Echo:' }
    });
    
    console.log(`🗑️  MongoDB: Deleted ${result.deletedCount} Echo messages`);
    return result.deletedCount;
}

async function cleanupEchoMessagesSQLite(db: any): Promise<number> {
    return new Promise((resolve, reject) => {
        db.run(
            `DELETE FROM chat_messages WHERE role = 'assistant' AND content LIKE 'Echo:%'`,
            function(this: any, err: any) {
                if (err) {
                    reject(err);
                } else {
                    console.log(`🗑️  SQLite: Deleted ${this.changes} Echo messages`);
                    resolve(this.changes);
                }
            }
        );
    });
}

async function cleanupEchoMessagesSQL(connection: any): Promise<number> {
    const [result] = await connection.execute(
        `DELETE FROM chat_messages WHERE role = 'assistant' AND content LIKE 'Echo:%'`
    );
    
    const deletedCount = result.affectedRows || 0;
    console.log(`🗑️  SQL: Deleted ${deletedCount} Echo messages`);
    return deletedCount;
}

async function cleanupEchoMessagesSupabase(supabase: any): Promise<number> {
    const { data, error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('role', 'assistant')
        .like('content', 'Echo:%');
    
    if (error) {
        throw error;
    }
    
    const deletedCount = data ? data.length : 0;
    console.log(`🗑️  Supabase: Deleted ${deletedCount} Echo messages`);
    return deletedCount;
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
    cleanupEchoMessages();
}

export { cleanupEchoMessages };
