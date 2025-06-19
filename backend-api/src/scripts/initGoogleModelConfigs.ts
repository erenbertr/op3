import { UniversalDatabaseService } from '../services/universalDatabaseService';
import { GoogleModelConfigSchema } from '../schemas';

/**
 * REFACTORED: Initialize Google Model Configs table using Universal Database Service
 * Works with ANY database type - no more switch statements!
 */
export async function initGoogleModelConfigsTable(): Promise<void> {
    try {
        const universalDb = UniversalDatabaseService.getInstance();

        console.log('🔧 Initializing Google model configs schema using Universal Database Service...');

        // ONE SIMPLE METHOD FOR ALL DATABASES!
        await universalDb.ensureSchema(GoogleModelConfigSchema);

        console.log('✅ Google model configs schema initialized successfully for ANY database type!');
    } catch (error) {
        console.error('❌ Error initializing Google model configs schema:', error);
        throw error;
    }
}


