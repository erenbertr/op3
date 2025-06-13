import { DatabaseManager } from '../config/database';

export async function initOpenAIModelConfigsTable(): Promise<void> {
    const dbManager = DatabaseManager.getInstance();
    const config = dbManager.getCurrentConfig();
    
    if (!config) {
        throw new Error('No database configuration found');
    }

    try {
        const connection = await dbManager.getConnection();
        
        switch (config.type) {
            case 'localdb':
                await initLocalDBTable(connection);
                break;
                
            case 'mongodb':
                // MongoDB doesn't need explicit table creation
                console.log('MongoDB: OpenAI model configs collection will be created automatically');
                break;
                
            case 'mysql':
                await initMySQLTable(connection);
                break;
                
            case 'postgresql':
                await initPostgreSQLTable(connection);
                break;
                
            default:
                console.log(`Database type ${config.type} not supported for OpenAI model configs table initialization`);
        }
        
        console.log('OpenAI model configs table initialized successfully');
    } catch (error) {
        console.error('Error initializing OpenAI model configs table:', error);
        throw error;
    }
}

async function initLocalDBTable(connection: any): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        connection.run(`
            CREATE TABLE IF NOT EXISTS openai_model_configs (
                id TEXT PRIMARY KEY,
                keyId TEXT NOT NULL,
                keyName TEXT NOT NULL,
                modelId TEXT NOT NULL,
                modelName TEXT NOT NULL,
                customName TEXT,
                capabilities TEXT,
                pricing TEXT,
                isActive INTEGER NOT NULL DEFAULT 1,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                UNIQUE(keyId, modelId)
            )
        `, (err: any) => {
            if (err) {
                reject(err);
            } else {
                console.log('LocalDB: OpenAI model configs table created/verified');
                resolve();
            }
        });
    });
}

async function initMySQLTable(connection: any): Promise<void> {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS openai_model_configs (
            id VARCHAR(36) PRIMARY KEY,
            keyId VARCHAR(36) NOT NULL,
            keyName VARCHAR(255) NOT NULL,
            modelId VARCHAR(255) NOT NULL,
            modelName VARCHAR(255) NOT NULL,
            customName VARCHAR(255),
            capabilities JSON,
            pricing JSON,
            isActive BOOLEAN NOT NULL DEFAULT TRUE,
            createdAt DATETIME NOT NULL,
            updatedAt DATETIME NOT NULL,
            UNIQUE KEY unique_key_model (keyId, modelId),
            INDEX idx_keyId (keyId),
            INDEX idx_active (isActive),
            INDEX idx_created (createdAt)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await connection.execute(createTableQuery);
    console.log('MySQL: OpenAI model configs table created/verified');
}

async function initPostgreSQLTable(connection: any): Promise<void> {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS openai_model_configs (
            id VARCHAR(36) PRIMARY KEY,
            keyId VARCHAR(36) NOT NULL,
            keyName VARCHAR(255) NOT NULL,
            modelId VARCHAR(255) NOT NULL,
            modelName VARCHAR(255) NOT NULL,
            customName VARCHAR(255),
            capabilities JSONB,
            pricing JSONB,
            isActive BOOLEAN NOT NULL DEFAULT TRUE,
            createdAt TIMESTAMP WITH TIME ZONE NOT NULL,
            updatedAt TIMESTAMP WITH TIME ZONE NOT NULL,
            UNIQUE(keyId, modelId)
        )
    `;
    
    const createIndexQueries = [
        'CREATE INDEX IF NOT EXISTS idx_openai_model_configs_keyId ON openai_model_configs(keyId)',
        'CREATE INDEX IF NOT EXISTS idx_openai_model_configs_active ON openai_model_configs(isActive)',
        'CREATE INDEX IF NOT EXISTS idx_openai_model_configs_created ON openai_model_configs(createdAt)'
    ];
    
    await connection.execute(createTableQuery);
    
    for (const indexQuery of createIndexQueries) {
        await connection.execute(indexQuery);
    }
    
    console.log('PostgreSQL: OpenAI model configs table created/verified');
}
