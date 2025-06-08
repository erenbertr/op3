import { MongoClient } from 'mongodb';
import mysql from 'mysql2/promise';
import { Client as PgClient } from 'pg';
import sqlite3 from 'sqlite3';
import {
    DatabaseConfig,
    DatabaseConnectionResult,
    MongoDBConfig,
    MySQLConfig,
    PostgreSQLConfig,
    LocalDBConfig
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
        const client = new MongoClient(config.connectionString);

        try {
            await client.connect();
            await client.db().admin().ping();

            return {
                success: true,
                message: 'MongoDB connection successful',
                connectionInfo: {
                    type: 'mongodb',
                    database: config.database,
                    connected: true
                }
            };
        } finally {
            await client.close();
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
}
