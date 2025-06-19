import { UniversalDatabaseService } from '../services/universalDatabaseService';
import { GrokModelConfigSchema } from '../schemas';

/**
 * REFACTORED: Initialize Grok Model Configs table using Universal Database Service
 * Works with ANY database type - no more switch statements!
 */
export async function initGrokModelConfigsTable(): Promise<void> {
    try {
        const universalDb = UniversalDatabaseService.getInstance();

        console.log('🔧 Initializing Grok model configs schema using Universal Database Service...');

        // ONE SIMPLE METHOD FOR ALL DATABASES!
        await universalDb.ensureSchema(GrokModelConfigSchema);

        console.log('✅ Grok model configs schema initialized successfully for ANY database type!');
    } catch (error) {
        console.error('❌ Error initializing Grok model configs schema:', error);
        throw error;
    }
}


