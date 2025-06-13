import { DatabaseManager } from '../config/database';

export async function initializeOpenAIProvidersTable(): Promise<void> {
    const dbManager = DatabaseManager.getInstance();
    const config = dbManager.getCurrentConfig();
    
    if (!config) {
        console.log('No database configuration found, skipping OpenAI providers table initialization');
        return;
    }

    try {
        const connection = await dbManager.getConnection();
        
        switch (config.type) {
            case 'localdb':
                await initLocalDBTable(connection);
                break;
                
            case 'mongodb':
                // MongoDB doesn't need explicit table creation
                console.log('MongoDB: OpenAI providers collection will be created automatically');
                break;
                
            case 'mysql':
                await initMySQLTable(connection);
                break;
                
            case 'postgresql':
                await initPostgreSQLTable(connection);
                break;
                
            default:
                console.log(`Database type ${config.type} not supported for OpenAI providers table initialization`);
        }
        
        console.log('OpenAI providers table initialized successfully');
    } catch (error) {
        console.error('Error initializing OpenAI providers table:', error);
        throw error;
    }
}

async function initLocalDBTable(connection: any): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        connection.run(`
            CREATE TABLE IF NOT EXISTS openai_providers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                apiKey TEXT NOT NULL,
                isActive INTEGER NOT NULL DEFAULT 1,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL
            )
        `, (err: any) => {
            if (err) {
                reject(err);
            } else {
                console.log('LocalDB: OpenAI providers table created/verified');
                resolve();
            }
        });
    });
}

async function initMySQLTable(connection: any): Promise<void> {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS openai_providers (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            apiKey TEXT NOT NULL,
            isActive BOOLEAN NOT NULL DEFAULT TRUE,
            createdAt DATETIME NOT NULL,
            updatedAt DATETIME NOT NULL,
            INDEX idx_name (name),
            INDEX idx_active (isActive),
            INDEX idx_created (createdAt)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await connection.execute(createTableQuery);
    console.log('MySQL: OpenAI providers table created/verified');
}

async function initPostgreSQLTable(connection: any): Promise<void> {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS openai_providers (
            id UUID PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            apiKey TEXT NOT NULL,
            isActive BOOLEAN NOT NULL DEFAULT TRUE,
            createdAt TIMESTAMP WITH TIME ZONE NOT NULL,
            updatedAt TIMESTAMP WITH TIME ZONE NOT NULL
        )
    `;
    
    const createIndexQueries = [
        'CREATE INDEX IF NOT EXISTS idx_openai_providers_name ON openai_providers(name)',
        'CREATE INDEX IF NOT EXISTS idx_openai_providers_active ON openai_providers(isActive)',
        'CREATE INDEX IF NOT EXISTS idx_openai_providers_created ON openai_providers(createdAt)'
    ];
    
    await connection.query(createTableQuery);
    
    for (const indexQuery of createIndexQueries) {
        await connection.query(indexQuery);
    }
    
    console.log('PostgreSQL: OpenAI providers table created/verified');
}
