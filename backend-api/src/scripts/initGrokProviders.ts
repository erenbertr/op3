import { DatabaseManager } from '../config/database';

export async function initializeGrokProvidersTable(): Promise<void> {
    const dbManager = DatabaseManager.getInstance();
    const config = dbManager.getCurrentConfig();
    
    if (!config) {
        console.log('No database configuration found, skipping Grok providers table initialization');
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
                console.log('MongoDB: Grok providers collection will be created automatically');
                break;
                
            case 'mysql':
                await initMySQLTable(connection);
                break;
                
            case 'postgresql':
                await initPostgreSQLTable(connection);
                break;
                
            default:
                console.log(`Database type ${config.type} not supported for Grok providers table initialization`);
        }
        
        console.log('Grok providers table initialized successfully');
    } catch (error) {
        console.error('Error initializing Grok providers table:', error);
        throw error;
    }
}

async function initLocalDBTable(connection: any): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        connection.run(`
            CREATE TABLE IF NOT EXISTS grok_providers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                api_key TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        `, (err: any) => {
            if (err) {
                reject(err);
            } else {
                console.log('LocalDB: Grok providers table created/verified');
                resolve();
            }
        });
    });
}

async function initMySQLTable(connection: any): Promise<void> {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS grok_providers (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            api_key TEXT NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            INDEX idx_name (name),
            INDEX idx_active (is_active),
            INDEX idx_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await connection.execute(createTableQuery);
    console.log('MySQL: Grok providers table created/verified');
}

async function initPostgreSQLTable(connection: any): Promise<void> {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS grok_providers (
            id UUID PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            api_key TEXT NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL
        )
    `;
    
    const createIndexQueries = [
        'CREATE INDEX IF NOT EXISTS idx_grok_providers_name ON grok_providers(name)',
        'CREATE INDEX IF NOT EXISTS idx_grok_providers_active ON grok_providers(is_active)',
        'CREATE INDEX IF NOT EXISTS idx_grok_providers_created ON grok_providers(created_at)'
    ];
    
    await connection.query(createTableQuery);
    
    for (const indexQuery of createIndexQueries) {
        await connection.query(indexQuery);
    }
    
    console.log('PostgreSQL: Grok providers table created/verified');
}
