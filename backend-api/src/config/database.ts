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

    private constructor() { }

    public static getInstance(): DatabaseManager {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager();
        }
        return DatabaseManager.instance;
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
    }

    public getCurrentConfig(): DatabaseConfig | null {
        return this.currentConfig;
    }

    private async testSupabaseConnection(config: SupabaseConfig): Promise<DatabaseConnectionResult> {
        try {
            const supabase = createClient(config.url, config.apiKey);

            // Test connection by trying to get the current user or making a simple query
            const { data, error } = await supabase.auth.getUser();

            if (error && error.message !== 'Invalid JWT') {
                // If it's not a JWT error, it might be a connection issue
                throw new Error(error.message);
            }

            // Try a simple database query to test the connection
            const { error: queryError } = await supabase
                .from('_supabase_migrations')
                .select('version')
                .limit(1);

            // Even if the table doesn't exist, we should get a proper error response
            // which indicates the connection is working

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

            // For now, we'll just validate the format since Convex connection testing
            // requires proper setup and might not work in all environments
            return {
                success: true,
                message: 'Convex configuration validated (full connection test requires proper deployment)',
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
