import { UniversalDatabaseService } from '../services/universalDatabaseService';
import { OpenAIModelConfigSchema } from '../schemas';

/**
 * REFACTORED: Initialize OpenAI Model Configs table using Universal Database Service
 * Works with ANY database type - no more switch statements!
 */
export async function initOpenAIModelConfigsTable(): Promise<void> {
    try {
        const universalDb = UniversalDatabaseService.getInstance();

        console.log('🔧 Initializing OpenAI model configs schema using Universal Database Service...');

        // ONE SIMPLE METHOD FOR ALL DATABASES!
        await universalDb.ensureSchema(OpenAIModelConfigSchema);

        console.log('✅ OpenAI model configs schema initialized successfully for ANY database type!');
    } catch (error) {
        console.error('❌ Error initializing OpenAI model configs schema:', error);
        throw error;
    }
}


