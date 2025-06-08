import { MongoClient } from 'mongodb';
import mysql from 'mysql2/promise';
import { Client as PgClient } from 'pg';
import sqlite3 from 'sqlite3';
import { createClient } from '@supabase/supabase-js';
import { ConvexHttpClient } from 'convex/browser';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { connect } from '@planetscale/database';
import { neon } from '@neondatabase/serverless';
import { createClient as createLibsqlClient } from '@libsql/client';
import * as fs from 'fs';
import * as path from 'path';
import {
    DatabaseConfig,
    DatabaseConnectionResult,
    MongoDBConfig,
    MySQLConfig,
    PostgreSQLConfig,
    LocalDBConfig,
    SupabaseConfig,
    ConvexConfig,
    FirebaseConfig,
    PlanetScaleConfig,
    NeonConfig,
    TursoConfig
} from '../types/database';

export class DatabaseManager {
    private static instance: DatabaseManager;
    private currentConfig: DatabaseConfig | null = null;
    private configFilePath: string;
    private setupStatusFilePath: string;

    private constructor() {
        // Create data directory if it doesn't exist
        const dataDir = path.join(process.cwd(), 'data');
        console.log('DatabaseManager: Data directory path:', dataDir);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
            console.log('DatabaseManager: Created data directory');
        }
        this.configFilePath = path.join(dataDir, 'config.json');
        this.setupStatusFilePath = path.join(dataDir, 'setup-status.json');
        console.log('DatabaseManager: Config file path:', this.configFilePath);
        console.log('DatabaseManager: Setup status file path:', this.setupStatusFilePath);
        this.loadConfig();
    }

    public static getInstance(): DatabaseManager {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager();
        }
        return DatabaseManager.instance;
    }

    private loadConfig(): void {
        try {
            if (fs.existsSync(this.configFilePath)) {
                const configData = fs.readFileSync(this.configFilePath, 'utf8');
                this.currentConfig = JSON.parse(configData);
                console.log('Database configuration loaded from file:', { type: this.currentConfig?.type });
            }
        } catch (error) {
            console.error('Error loading database configuration:', error);
            this.currentConfig = null;
        }
    }

    private saveConfig(): void {
        try {
            if (this.currentConfig) {
                fs.writeFileSync(this.configFilePath, JSON.stringify(this.currentConfig, null, 2));
                console.log('Database configuration saved to file');
            }
        } catch (error) {
            console.error('Error saving database configuration:', error);
        }
    }

    public async testConnection(config: DatabaseConfig): Promise<DatabaseConnectionResult> {
        try {
            switch (config.type) {
                case 'mongodb':
                    return await this.testMongoConnection(config as MongoDBConfig);
                case 'mysql':
                    return await this.testMySQLConnection(config as MySQLConfig);
                case 'postgresql':
                    return await this.testPostgreSQLConnection(config as PostgreSQLConfig);
                case 'localdb':
                    return await this.testLocalDBConnection(config as LocalDBConfig);
                case 'supabase':
                    return await this.testSupabaseConnection(config as SupabaseConfig);
                case 'convex':
                    return await this.testConvexConnection(config as ConvexConfig);
                case 'firebase':
                    return await this.testFirebaseConnection(config as FirebaseConfig);
                case 'planetscale':
                    return await this.testPlanetScaleConnection(config as PlanetScaleConfig);
                case 'neon':
                    return await this.testNeonConnection(config as NeonConfig);
                case 'turso':
                    return await this.testTursoConnection(config as TursoConfig);
                default:
                    return {
                        success: false,
                        message: `Unsupported database type: ${config.type}`
                    };
            }
        } catch (error) {
            return {
                success: false,
                message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    private async testMongoConnection(config: MongoDBConfig): Promise<DatabaseConnectionResult> {
        // Enhanced connection options for better compatibility
        const clientOptions = {
            serverSelectionTimeoutMS: 10000, // 10 second timeout
            connectTimeoutMS: 10000,
            socketTimeoutMS: 10000,
            maxPoolSize: 1, // Minimal pool for testing
            retryWrites: true,
            retryReads: true
        };

        const client = new MongoClient(config.connectionString, clientOptions);

        try {
            console.log('Attempting MongoDB connection to:', config.connectionString.replace(/\/\/.*@/, '//***:***@'));

            // Connect with timeout
            await client.connect();
            console.log('MongoDB client connected successfully');

            // Test the connection with a simple ping
            const adminDb = client.db().admin();
            const pingResult = await adminDb.ping();
            console.log('MongoDB ping result:', pingResult);

            // Also test access to the specific database
            const targetDb = client.db(config.database);
            await targetDb.stats();
            console.log('MongoDB database access verified');

            return {
                success: true,
                message: 'MongoDB connection successful',
                connectionInfo: {
                    type: 'mongodb',
                    database: config.database,
                    connected: true
                }
            };
        } catch (error) {
            console.error('MongoDB connection error:', error);
            throw error; // Re-throw to be caught by the outer try-catch
        } finally {
            try {
                await client.close();
                console.log('MongoDB client closed');
            } catch (closeError) {
                console.error('Error closing MongoDB client:', closeError);
            }
        }
    }

    private async testMySQLConnection(config: MySQLConfig): Promise<DatabaseConnectionResult> {
        const connection = await mysql.createConnection({
            host: config.host,
            port: config.port,
            user: config.username,
            password: config.password,
            database: config.database
        });

        try {
            await connection.ping();

            return {
                success: true,
                message: 'MySQL connection successful',
                connectionInfo: {
                    type: 'mysql',
                    host: config.host,
                    database: config.database,
                    connected: true
                }
            };
        } finally {
            await connection.end();
        }
    }

    private async testPostgreSQLConnection(config: PostgreSQLConfig): Promise<DatabaseConnectionResult> {
        const client = new PgClient({
            host: config.host,
            port: config.port,
            database: config.database,
            user: config.username,
            password: config.password
        });

        try {
            await client.connect();
            await client.query('SELECT 1');

            return {
                success: true,
                message: 'PostgreSQL connection successful',
                connectionInfo: {
                    type: 'postgresql',
                    host: config.host,
                    database: config.database,
                    connected: true
                }
            };
        } finally {
            await client.end();
        }
    }

    private async testLocalDBConnection(config: LocalDBConfig): Promise<DatabaseConnectionResult> {
        return new Promise((resolve) => {
            const db = new sqlite3.Database(config.database, (err) => {
                if (err) {
                    resolve({
                        success: false,
                        message: `SQLite connection failed: ${err.message}`
                    });
                } else {
                    db.close();
                    resolve({
                        success: true,
                        message: 'SQLite connection successful',
                        connectionInfo: {
                            type: 'localdb',
                            database: config.database,
                            connected: true
                        }
                    });
                }
            });
        });
    }

    public setCurrentConfig(config: DatabaseConfig): void {
        this.currentConfig = config;
        this.saveConfig();
    }

    public getCurrentConfig(): DatabaseConfig | null {
        return this.currentConfig;
    }

    public async markSetupComplete(): Promise<{ success: boolean; message: string }> {
        try {
            const setupStatus = {
                completed: true,
                completedAt: new Date().toISOString(),
                version: '1.0.0'
            };

            fs.writeFileSync(this.setupStatusFilePath, JSON.stringify(setupStatus, null, 2));
            console.log('Setup marked as complete');

            return {
                success: true,
                message: 'Setup completion status saved successfully'
            };
        } catch (error) {
            console.error('Error marking setup as complete:', error);
            return {
                success: false,
                message: `Failed to mark setup as complete: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    public async isSetupComplete(): Promise<boolean> {
        try {
            if (!fs.existsSync(this.setupStatusFilePath)) {
                return false;
            }

            const statusData = fs.readFileSync(this.setupStatusFilePath, 'utf8');
            const setupStatus = JSON.parse(statusData);

            return setupStatus.completed === true;
        } catch (error) {
            console.error('Error checking setup completion status:', error);
            return false;
        }
    }

    /**
     * Get a database connection for operations
     */
    public async getConnection(): Promise<any> {
        if (!this.currentConfig) {
            throw new Error('No database configuration found. Please configure database first.');
        }

        switch (this.currentConfig.type) {
            case 'mongodb':
                return this.getMongoConnection(this.currentConfig as MongoDBConfig);
            case 'mysql':
                return this.getMySQLConnection(this.currentConfig as MySQLConfig);
            case 'postgresql':
                return this.getPostgreSQLConnection(this.currentConfig as PostgreSQLConfig);
            case 'localdb':
                return this.getLocalDBConnection(this.currentConfig as LocalDBConfig);
            case 'supabase':
                return this.getSupabaseConnection(this.currentConfig as SupabaseConfig);
            default:
                throw new Error(`Database type ${this.currentConfig.type} not supported for operations yet`);
        }
    }

    private async getMongoConnection(config: MongoDBConfig) {
        const client = new MongoClient(config.connectionString, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000,
        });
        await client.connect();
        return client.db(config.database);
    }

    private async getMySQLConnection(config: MySQLConfig) {
        const connectionConfig: any = {
            host: config.host,
            port: config.port,
            user: config.username,
            password: config.password,
            database: config.database
        };

        if (config.ssl) {
            connectionConfig.ssl = {};
        }

        return mysql.createConnection(connectionConfig);
    }

    private async getPostgreSQLConnection(config: PostgreSQLConfig) {
        const client = new PgClient({
            host: config.host,
            port: config.port,
            user: config.username,
            password: config.password,
            database: config.database,
            ssl: config.ssl
        });
        await client.connect();
        return client;
    }

    private async getLocalDBConnection(config: LocalDBConfig) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(config.database, (err) => {
                if (err) reject(err);
                else resolve(db);
            });
        });
    }

    private getSupabaseConnection(config: SupabaseConfig) {
        return createClient(config.url, config.apiKey);
    }

    private async testSupabaseConnection(config: SupabaseConfig): Promise<DatabaseConnectionResult> {
        try {
            const supabase = createClient(config.url, config.apiKey);

            // Test connection by making a simple query to the REST API
            // We'll try to access the health endpoint or make a simple query
            const { data, error } = await supabase
                .from('_supabase_migrations')
                .select('version')
                .limit(1);

            // Check if we get a proper response (even if it's an error about table not existing)
            // This indicates the connection and API key are working
            if (error) {
                // If it's a table not found error, that's actually good - it means we connected
                if (error.message.includes('relation') && error.message.includes('does not exist')) {
                    return {
                        success: true,
                        message: 'Supabase connection successful',
                        connectionInfo: {
                            type: 'supabase',
                            database: config.database,
                            connected: true
                        }
                    };
                }
                // If it's an auth error, the API key is wrong
                if (error.message.includes('JWT') || error.message.includes('Invalid API key')) {
                    throw new Error('Invalid API key');
                }
                // Other errors might indicate connection issues
                throw new Error(error.message);
            }

            return {
                success: true,
                message: 'Supabase connection successful',
                connectionInfo: {
                    type: 'supabase',
                    database: config.database,
                    connected: true
                }
            };
        } catch (error) {
            console.error('Supabase connection error:', error);
            throw error;
        }
    }

    private async testConvexConnection(config: ConvexConfig): Promise<DatabaseConnectionResult> {
        try {
            // Validate URL format
            if (!config.url || !config.url.includes('convex.cloud')) {
                throw new Error('Invalid Convex URL format');
            }

            if (!config.authToken || config.authToken.length < 10) {
                throw new Error('Invalid auth token format');
            }

            // Test the connection by making a simple HTTP request to the Convex API
            const response = await fetch(`${config.url}/api/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.authToken}`,
                },
                body: JSON.stringify({
                    path: '_system/listFunctions',
                    args: {},
                }),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Invalid auth token');
                } else if (response.status === 404) {
                    throw new Error('Invalid Convex URL or deployment not found');
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }

            // If we get here, the connection is working
            return {
                success: true,
                message: 'Convex connection successful',
                connectionInfo: {
                    type: 'convex',
                    database: config.database,
                    connected: true
                }
            };
        } catch (error) {
            console.error('Convex connection error:', error);
            throw error;
        }
    }

    private async testFirebaseConnection(config: FirebaseConfig): Promise<DatabaseConnectionResult> {
        try {
            // For Firebase, we'll do a simple validation of the project ID format
            // A full connection test would require service account credentials
            if (!config.projectId || config.projectId.length < 3) {
                throw new Error('Invalid project ID format');
            }

            if (!config.apiKey || config.apiKey.length < 10) {
                throw new Error('Invalid API key format');
            }

            // For now, we'll just validate the format since we can't easily test
            // Firebase connection without proper service account setup
            return {
                success: true,
                message: 'Firebase configuration validated (connection test requires service account)',
                connectionInfo: {
                    type: 'firebase',
                    database: config.database,
                    connected: true
                }
            };
        } catch (error) {
            console.error('Firebase connection error:', error);
            throw error;
        }
    }

    private async testPlanetScaleConnection(config: PlanetScaleConfig): Promise<DatabaseConnectionResult> {
        try {
            const connection = connect({
                host: config.host,
                username: config.username,
                password: config.password,
            });

            // Test with a simple query
            await connection.execute('SELECT 1');

            return {
                success: true,
                message: 'PlanetScale connection successful',
                connectionInfo: {
                    type: 'planetscale',
                    host: config.host,
                    database: config.database,
                    connected: true
                }
            };
        } catch (error) {
            console.error('PlanetScale connection error:', error);
            throw error;
        }
    }

    private async testNeonConnection(config: NeonConfig): Promise<DatabaseConnectionResult> {
        try {
            const sql = neon(config.connectionString);

            // Test with a simple query
            await sql`SELECT 1`;

            return {
                success: true,
                message: 'Neon connection successful',
                connectionInfo: {
                    type: 'neon',
                    database: config.database,
                    connected: true
                }
            };
        } catch (error) {
            console.error('Neon connection error:', error);
            throw error;
        }
    }

    private async testTursoConnection(config: TursoConfig): Promise<DatabaseConnectionResult> {
        try {
            const client = createLibsqlClient({
                url: config.url,
                authToken: config.authToken,
            });

            // Test with a simple query
            await client.execute('SELECT 1');

            return {
                success: true,
                message: 'Turso connection successful',
                connectionInfo: {
                    type: 'turso',
                    database: config.database,
                    connected: true
                }
            };
        } catch (error) {
            console.error('Turso connection error:', error);
            throw error;
        }
    }
}
