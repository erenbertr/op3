import { DatabaseManager } from '../config/database';

export async function initGrokModelConfigsTable(): Promise<void> {
    const dbManager = DatabaseManager.getInstance();
    const config = dbManager.getCurrentConfig();
    
    if (!config) {
        throw new Error('No database configuration found');
    }

    const connection = await dbManager.getConnection();

    try {
        switch (config.type) {
            case 'localdb':
                await new Promise<void>((resolve, reject) => {
                    connection.run(`
                        CREATE TABLE IF NOT EXISTS grok_model_configs (
                            id TEXT PRIMARY KEY,
                            keyId TEXT NOT NULL,
                            keyName TEXT NOT NULL,
                            modelId TEXT NOT NULL,
                            modelName TEXT NOT NULL,
                            customName TEXT,
                            capabilities TEXT,
                            pricing TEXT,
                            isActive INTEGER DEFAULT 1,
                            createdAt TEXT NOT NULL,
                            updatedAt TEXT NOT NULL,
                            UNIQUE(keyId, modelId)
                        )
                    `, (err: any) => {
                        if (err) {
                            console.error('Error creating grok_model_configs table:', err);
                            reject(err);
                        } else {
                            console.log('Grok model configs table initialized successfully');
                            resolve();
                        }
                    });
                });
                break;

            case 'mongodb':
                // MongoDB doesn't require explicit table creation
                // But we can create indexes for better performance
                try {
                    await connection.collection('grok_model_configs').createIndex(
                        { keyId: 1, modelId: 1 }, 
                        { unique: true }
                    );
                    console.log('Grok model configs collection indexes created successfully');
                } catch (error) {
                    // Index might already exist, which is fine
                    console.log('Grok model configs collection indexes already exist or created');
                }
                break;

            case 'mysql':
                await connection.execute(`
                    CREATE TABLE IF NOT EXISTS grok_model_configs (
                        id VARCHAR(255) PRIMARY KEY,
                        keyId VARCHAR(255) NOT NULL,
                        keyName VARCHAR(255) NOT NULL,
                        modelId VARCHAR(255) NOT NULL,
                        modelName VARCHAR(255) NOT NULL,
                        customName VARCHAR(255),
                        capabilities TEXT,
                        pricing TEXT,
                        isActive BOOLEAN DEFAULT TRUE,
                        createdAt TIMESTAMP NOT NULL,
                        updatedAt TIMESTAMP NOT NULL,
                        UNIQUE KEY unique_key_model (keyId, modelId)
                    )
                `);
                console.log('Grok model configs table initialized successfully (MySQL)');
                break;

            case 'postgresql':
                await connection.execute(`
                    CREATE TABLE IF NOT EXISTS grok_model_configs (
                        id VARCHAR(255) PRIMARY KEY,
                        keyId VARCHAR(255) NOT NULL,
                        keyName VARCHAR(255) NOT NULL,
                        modelId VARCHAR(255) NOT NULL,
                        modelName VARCHAR(255) NOT NULL,
                        customName VARCHAR(255),
                        capabilities TEXT,
                        pricing TEXT,
                        isActive BOOLEAN DEFAULT TRUE,
                        createdAt TIMESTAMP NOT NULL,
                        updatedAt TIMESTAMP NOT NULL,
                        UNIQUE (keyId, modelId)
                    )
                `);
                console.log('Grok model configs table initialized successfully (PostgreSQL)');
                break;

            default:
                throw new Error(`Database type ${config.type} not supported`);
        }
    } catch (error) {
        console.error('Error initializing grok_model_configs table:', error);
        throw error;
    }
}
