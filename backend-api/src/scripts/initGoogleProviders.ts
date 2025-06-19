import { UniversalDatabaseService } from '../services/universalDatabaseService';
import { AIProviderConfigSchema } from '../schemas';

/**
 * REFACTORED: Initialize Google Providers table using Universal Database Service
 * Works with ANY database type - no more switch statements!
 */
export async function initializeGoogleProvidersTable(): Promise<void> {
    try {
        const universalDb = UniversalDatabaseService.getInstance();

        console.log('🔧 Initializing Google providers schema using Universal Database Service...');

        // ONE SIMPLE METHOD FOR ALL DATABASES!
        await universalDb.ensureSchema(AIProviderConfigSchema);

        console.log('✅ Google providers schema initialized successfully for ANY database type!');
    } catch (error) {
        console.error('❌ Error initializing Google providers schema:', error);
        throw error;
    }
}


