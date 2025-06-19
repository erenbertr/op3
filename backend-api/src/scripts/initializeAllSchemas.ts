import { UniversalDatabaseService } from '../services/universalDatabaseService';

/**
 * Script to initialize all database schemas
 * This ensures all tables/collections are created in the database
 */
async function initializeAllSchemas() {
    try {
        console.log('🔧 Initializing all database schemas...');
        
        const universalDb = UniversalDatabaseService.getInstance();
        await universalDb.initializeAllSchemas();
        
        console.log('✅ All schemas initialized successfully!');
        console.log('📋 The following schemas were processed:');
        console.log('   - users');
        console.log('   - workspaces');
        console.log('   - chat_sessions');
        console.log('   - chat_messages');
        console.log('   - shared_chats');
        console.log('   - workspace_groups');
        console.log('   - ai_provider_configs');
        console.log('   - personalities');
        console.log('   - openai_model_configs');
        console.log('   - global_openrouter_settings');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error initializing schemas:', error);
        process.exit(1);
    }
}

// Run the script
initializeAllSchemas();
