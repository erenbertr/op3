export type DatabaseType = 'mongodb' | 'mysql' | 'postgresql' | 'localdb';

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

export interface SetupData {
  database: DatabaseConfig;
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
