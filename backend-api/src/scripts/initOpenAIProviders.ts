import { UniversalDatabaseService } from '../services/universalDatabaseService';
import { AIProviderConfigSchema } from '../schemas';

/**
 * REFACTORED: Initialize OpenAI Providers table using Universal Database Service
 * Works with ANY database type - no more switch statements!
 */
export async function initializeOpenAIProvidersTable(): Promise<void> {
    try {
        const universalDb = UniversalDatabaseService.getInstance();

        console.log('🔧 Initializing OpenAI providers schema using Universal Database Service...');

        // ONE SIMPLE METHOD FOR ALL DATABASES!
        await universalDb.ensureSchema(AIProviderConfigSchema);

        console.log('✅ OpenAI providers schema initialized successfully for ANY database type!');
    } catch (error) {
        console.error('❌ Error initializing OpenAI providers schema:', error);
        throw error;
    }
}


