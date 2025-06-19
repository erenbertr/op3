import { UniversalDatabaseService } from '../services/universalDatabaseService';
import { AnthropicModelConfigSchema } from '../schemas';

/**
 * REFACTORED: Initialize Anthropic Model Configs table using Universal Database Service
 * Works with ANY database type - no more switch statements!
 */
export async function initAnthropicModelConfigsTable(): Promise<void> {
    try {
        const universalDb = UniversalDatabaseService.getInstance();

        console.log('🔧 Initializing Anthropic model configs schema using Universal Database Service...');

        // ONE SIMPLE METHOD FOR ALL DATABASES!
        await universalDb.ensureSchema(AnthropicModelConfigSchema);

        console.log('✅ Anthropic model configs schema initialized successfully for ANY database type!');
    } catch (error) {
        console.error('❌ Error initializing Anthropic model configs schema:', error);
        throw error;
    }
}


