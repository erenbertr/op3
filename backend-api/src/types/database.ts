export type DatabaseType = 'mongodb' | 'mysql' | 'postgresql' | 'localdb' | 'supabase' | 'convex' | 'firebase' | 'planetscale' | 'neon' | 'turso';

export interface DatabaseConfig {
    type: DatabaseType;
    host?: string;
    port?: number;
    database: string;
    username?: string;
    password?: string;
    connectionString?: string;
    ssl?: boolean;
    options?: Record<string, any>;
    // New fields for modern providers
    apiKey?: string;
    projectId?: string;
    region?: string;
    authToken?: string;
    url?: string;
}

export interface MongoDBConfig extends DatabaseConfig {
    type: 'mongodb';
    connectionString: string;
}

export interface MySQLConfig extends DatabaseConfig {
    type: 'mysql';
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
}

export interface PostgreSQLConfig extends DatabaseConfig {
    type: 'postgresql';
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
}

export interface LocalDBConfig extends DatabaseConfig {
    type: 'localdb';
    database: string; // file path for SQLite
}

export interface SupabaseConfig extends DatabaseConfig {
    type: 'supabase';
    url: string; // Supabase project URL
    apiKey: string; // Supabase anon/service role key
    database: string; // Database name (usually 'postgres')
}

export interface ConvexConfig extends DatabaseConfig {
    type: 'convex';
    url: string; // Convex deployment URL
    authToken: string; // Convex auth token
    database: string; // Project name
}

export interface FirebaseConfig extends DatabaseConfig {
    type: 'firebase';
    projectId: string; // Firebase project ID
    apiKey: string; // Firebase API key
    database: string; // Firestore database ID (usually '(default)')
}

export interface PlanetScaleConfig extends DatabaseConfig {
    type: 'planetscale';
    host: string; // PlanetScale host
    username: string; // PlanetScale username
    password: string; // PlanetScale password
    database: string; // Database name
    ssl: boolean; // Always true for PlanetScale
}

export interface NeonConfig extends DatabaseConfig {
    type: 'neon';
    connectionString: string; // Neon connection string
    database: string; // Database name
}

export interface TursoConfig extends DatabaseConfig {
    type: 'turso';
    url: string; // Turso database URL
    authToken: string; // Turso auth token
    database: string; // Database name
}

export interface SetupData {
    database: DatabaseConfig;
    admin?: {
        email: string;
        username?: string;
        password: string;
    };
    // Future setup steps will add more properties here
}

export interface SetupResponse {
    success: boolean;
    message: string;
    step?: string;
    data?: any;
}

export interface DatabaseConnectionResult {
    success: boolean;
    message: string;
    connectionInfo?: {
        type: DatabaseType;
        host?: string;
        database: string;
        connected: boolean;
    };
}

// Universal Database Abstraction Types
export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'json' | 'text' | 'uuid';

export interface FieldDefinition {
    type: FieldType;
    required?: boolean;
    unique?: boolean;
    primaryKey?: boolean;
    autoIncrement?: boolean;
    defaultValue?: any;
    maxLength?: number;
    index?: boolean;
}

export interface SchemaDefinition {
    tableName: string;
    collectionName?: string; // For NoSQL databases
    fields: Record<string, FieldDefinition>;
    indexes?: string[][];
    timestamps?: boolean; // Auto-add createdAt/updatedAt
}

export interface QueryCondition {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'like' | 'exists';
    value: any;
}

export interface QueryOptions {
    where?: QueryCondition[];
    orderBy?: { field: string; direction: 'asc' | 'desc' }[];
    limit?: number;
    offset?: number;
    select?: string[];
}

export interface InsertResult {
    success: boolean;
    insertedId?: string;
    insertedCount?: number;
}

export interface UpdateResult {
    success: boolean;
    modifiedCount: number;
}

export interface DeleteResult {
    success: boolean;
    deletedCount: number;
}

export interface FindResult<T = any> {
    data: T[];
    total?: number;
    hasMore?: boolean;
}
