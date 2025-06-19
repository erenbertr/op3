import { DatabaseManager } from '../config/database';
import {
    SchemaDefinition,
    QueryOptions,
    QueryCondition,
    InsertResult,
    UpdateResult,
    DeleteResult,
    FindResult,
    FieldDefinition,
    DatabaseType
} from '../types/database';
import { UniversalDatabaseImplementations } from './universalDatabaseImplementations';
import { UniversalDatabaseSupabase } from './universalDatabaseSupabase';
import { AllSchemas, initializeSchemas } from '../schemas';

export interface IUniversalDatabase {
    // Schema operations
    ensureSchema(schema: SchemaDefinition): Promise<void>;

    // CRUD operations
    insert<T>(tableName: string, data: Partial<T>): Promise<InsertResult>;
    insertMany<T>(tableName: string, data: Partial<T>[]): Promise<InsertResult>;

    findOne<T>(tableName: string, options?: QueryOptions): Promise<T | null>;
    findMany<T>(tableName: string, options?: QueryOptions): Promise<FindResult<T>>;
    findById<T>(tableName: string, id: string): Promise<T | null>;

    update<T>(tableName: string, id: string, data: Partial<T>): Promise<UpdateResult>;
    updateMany<T>(tableName: string, data: Partial<T>, options?: QueryOptions): Promise<UpdateResult>;

    delete(tableName: string, id: string): Promise<DeleteResult>;
    deleteMany(tableName: string, options?: QueryOptions): Promise<DeleteResult>;

    // Utility operations
    count(tableName: string, options?: QueryOptions): Promise<number>;
    exists(tableName: string, options?: QueryOptions): Promise<boolean>;
}

export class UniversalDatabaseService extends UniversalDatabaseSupabase implements IUniversalDatabase {
    private static instance: UniversalDatabaseService;
    private dbManager: DatabaseManager;
    private schemas: Map<string, SchemaDefinition> = new Map();

    private constructor() {
        this.dbManager = DatabaseManager.getInstance();
        // Initialize all schemas
        initializeSchemas(this);
    }

    public static getInstance(): UniversalDatabaseService {
        if (!UniversalDatabaseService.instance) {
            UniversalDatabaseService.instance = new UniversalDatabaseService();
        }
        return UniversalDatabaseService.instance;
    }

    /**
     * Register a schema definition for a table/collection
     */
    public registerSchema(schema: SchemaDefinition): void {
        this.schemas.set(schema.tableName, schema);
    }

    /**
     * Get registered schema for a table
     */
    private getSchema(tableName: string): SchemaDefinition | undefined {
        return this.schemas.get(tableName);
    }

    /**
     * Ensure table/collection exists with proper schema
     */
    public async ensureSchema(schema: SchemaDefinition): Promise<void> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();

        switch (config.type) {
            case 'mongodb':
                // MongoDB doesn't require schema creation, but we can create indexes
                await this.ensureMongoSchema(connection, schema);
                break;
            case 'mysql':
            case 'postgresql':
                await this.ensureSQLSchema(connection, schema, config.type);
                break;
            case 'localdb':
                await this.ensureSQLiteSchema(connection, schema);
                break;
            case 'supabase':
                await this.ensureSupabaseSchema(connection, schema);
                break;
            default:
                throw new Error(`Database type ${config.type} not supported yet`);
        }

        // Register the schema
        this.registerSchema(schema);
    }

    /**
     * Insert a single record
     */
    public async insert<T>(tableName: string, data: Partial<T>): Promise<InsertResult> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();
        const schema = this.getSchema(tableName);

        // Add timestamps if enabled
        const processedData = this.addTimestamps(data, schema, 'insert');

        switch (config.type) {
            case 'mongodb':
                return await this.insertMongo(connection, tableName, processedData, schema);
            case 'mysql':
            case 'postgresql':
                return await this.insertSQL(connection, tableName, processedData, schema, config.type);
            case 'localdb':
                return await this.insertSQLite(connection, tableName, processedData, schema);
            case 'supabase':
                return await this.insertSupabase(connection, tableName, processedData, schema);
            default:
                throw new Error(`Database type ${config.type} not supported yet`);
        }
    }

    /**
     * Insert multiple records
     */
    public async insertMany<T>(tableName: string, data: Partial<T>[]): Promise<InsertResult> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();
        const schema = this.getSchema(tableName);

        // Add timestamps to all records if enabled
        const processedData = data.map(item => this.addTimestamps(item, schema, 'insert'));

        switch (config.type) {
            case 'mongodb':
                return await this.insertManyMongo(connection, tableName, processedData, schema);
            case 'mysql':
            case 'postgresql':
                return await this.insertManySQL(connection, tableName, processedData, schema, config.type);
            case 'localdb':
                return await this.insertManySQLite(connection, tableName, processedData, schema);
            case 'supabase':
                return await this.insertManySupabase(connection, tableName, processedData, schema);
            default:
                throw new Error(`Database type ${config.type} not supported yet`);
        }
    }

    /**
     * Find a single record
     */
    public async findOne<T>(tableName: string, options?: QueryOptions): Promise<T | null> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();
        const schema = this.getSchema(tableName);

        switch (config.type) {
            case 'mongodb':
                return await this.findOneMongo<T>(connection, tableName, options, schema);
            case 'mysql':
            case 'postgresql':
                return await this.findOneSQL<T>(connection, tableName, options, schema, config.type);
            case 'localdb':
                return await this.findOneSQLite<T>(connection, tableName, options, schema);
            case 'supabase':
                return await this.findOneSupabase<T>(connection, tableName, options, schema);
            default:
                throw new Error(`Database type ${config.type} not supported yet`);
        }
    }

    /**
     * Find multiple records
     */
    public async findMany<T>(tableName: string, options?: QueryOptions): Promise<FindResult<T>> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();
        const schema = this.getSchema(tableName);

        switch (config.type) {
            case 'mongodb':
                return await this.findManyMongo<T>(connection, tableName, options, schema);
            case 'mysql':
            case 'postgresql':
                return await this.findManySQL<T>(connection, tableName, options, schema, config.type);
            case 'localdb':
                return await this.findManySQLite<T>(connection, tableName, options, schema);
            case 'supabase':
                return await this.findManySupabase<T>(connection, tableName, options, schema);
            default:
                throw new Error(`Database type ${config.type} not supported yet`);
        }
    }

    /**
     * Find record by ID
     */
    public async findById<T>(tableName: string, id: string): Promise<T | null> {
        return await this.findOne<T>(tableName, {
            where: [{ field: 'id', operator: 'eq', value: id }]
        });
    }

    /**
     * Update a single record by ID
     */
    public async update<T>(tableName: string, id: string, data: Partial<T>): Promise<UpdateResult> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();
        const schema = this.getSchema(tableName);

        // Add timestamps if enabled
        const processedData = this.addTimestamps(data, schema, 'update');

        switch (config.type) {
            case 'mongodb':
                return await this.updateMongo(connection, tableName, id, processedData, schema);
            case 'mysql':
            case 'postgresql':
                return await this.updateSQL(connection, tableName, id, processedData, schema, config.type);
            case 'localdb':
                return await this.updateSQLite(connection, tableName, id, processedData, schema);
            case 'supabase':
                return await this.updateSupabase(connection, tableName, id, processedData, schema);
            default:
                throw new Error(`Database type ${config.type} not supported yet`);
        }
    }

    /**
     * Update multiple records
     */
    public async updateMany<T>(tableName: string, data: Partial<T>, options?: QueryOptions): Promise<UpdateResult> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();
        const schema = this.getSchema(tableName);

        // Add timestamps if enabled
        const processedData = this.addTimestamps(data, schema, 'update');

        switch (config.type) {
            case 'mongodb':
                return await this.updateManyMongo(connection, tableName, processedData, options, schema);
            case 'mysql':
            case 'postgresql':
                return await this.updateManySQL(connection, tableName, processedData, options, schema, config.type);
            case 'localdb':
                return await this.updateManySQLite(connection, tableName, processedData, options, schema);
            case 'supabase':
                return await this.updateManySupabase(connection, tableName, processedData, options, schema);
            default:
                throw new Error(`Database type ${config.type} not supported yet`);
        }
    }

    /**
     * Delete a single record by ID
     */
    public async delete(tableName: string, id: string): Promise<DeleteResult> {
        return await this.deleteMany(tableName, {
            where: [{ field: 'id', operator: 'eq', value: id }]
        });
    }

    /**
     * Delete multiple records
     */
    public async deleteMany(tableName: string, options?: QueryOptions): Promise<DeleteResult> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();
        const schema = this.getSchema(tableName);

        switch (config.type) {
            case 'mongodb':
                return await this.deleteManyMongo(connection, tableName, options, schema);
            case 'mysql':
            case 'postgresql':
                return await this.deleteManySQL(connection, tableName, options, schema, config.type);
            case 'localdb':
                return await this.deleteManySQLite(connection, tableName, options, schema);
            case 'supabase':
                return await this.deleteManySupabase(connection, tableName, options, schema);
            default:
                throw new Error(`Database type ${config.type} not supported yet`);
        }
    }

    /**
     * Count records
     */
    public async count(tableName: string, options?: QueryOptions): Promise<number> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();
        const schema = this.getSchema(tableName);

        switch (config.type) {
            case 'mongodb':
                return await this.countMongo(connection, tableName, options, schema);
            case 'mysql':
            case 'postgresql':
                return await this.countSQL(connection, tableName, options, schema, config.type);
            case 'localdb':
                return await this.countSQLite(connection, tableName, options, schema);
            case 'supabase':
                return await this.countSupabase(connection, tableName, options, schema);
            default:
                throw new Error(`Database type ${config.type} not supported yet`);
        }
    }

    /**
     * Check if records exist
     */
    public async exists(tableName: string, options?: QueryOptions): Promise<boolean> {
        const count = await this.count(tableName, options);
        return count > 0;
    }

    /**
     * Initialize all database schemas
     */
    public async initializeAllSchemas(): Promise<void> {
        for (const schema of Object.values(AllSchemas)) {
            await this.ensureSchema(schema);
        }
    }

    /**
     * Get schema by table name
     */
    public getSchemaByTableName(tableName: string): SchemaDefinition | undefined {
        return AllSchemas[tableName as keyof typeof AllSchemas];
    }

    /**
     * Add timestamps to data if schema has timestamps enabled
     */
    private addTimestamps<T>(data: Partial<T>, schema?: SchemaDefinition, operation: 'insert' | 'update' = 'insert'): Partial<T> {
        if (!schema?.timestamps) {
            return data;
        }

        const now = new Date();
        const result = { ...data } as any;

        if (operation === 'insert') {
            result.createdAt = now;
        }
        result.updatedAt = now;

        return result;
    }

    // ==================== SCHEMA CREATION METHODS ====================

    private async ensureMongoSchema(connection: any, schema: SchemaDefinition): Promise<void> {
        const collectionName = schema.collectionName || schema.tableName;

        // Create collection if it doesn't exist
        const collections = await connection.listCollections({ name: collectionName }).toArray();
        if (collections.length === 0) {
            await connection.createCollection(collectionName);
        }

        // Create indexes if specified
        if (schema.indexes && schema.indexes.length > 0) {
            const collection = connection.collection(collectionName);
            for (const indexFields of schema.indexes) {
                const indexSpec = indexFields.reduce((acc, field) => {
                    acc[field] = 1;
                    return acc;
                }, {} as any);
                await collection.createIndex(indexSpec);
            }
        }

        // Create unique indexes for unique fields
        const collection = connection.collection(collectionName);
        for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
            if (fieldDef.unique) {
                await collection.createIndex({ [fieldName]: 1 }, { unique: true });
            }
        }
    }

    private async ensureSQLSchema(connection: any, schema: SchemaDefinition, dbType: 'mysql' | 'postgresql'): Promise<void> {
        const tableName = schema.tableName;
        const columns: string[] = [];

        // Build column definitions
        for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
            let columnDef = `${fieldName} ${this.getSQLType(fieldDef, dbType)}`;

            if (fieldDef.primaryKey) {
                columnDef += ' PRIMARY KEY';
            }
            if (fieldDef.required && !fieldDef.primaryKey) {
                columnDef += ' NOT NULL';
            }
            if (fieldDef.unique && !fieldDef.primaryKey) {
                columnDef += ' UNIQUE';
            }
            if (fieldDef.defaultValue !== undefined) {
                columnDef += ` DEFAULT ${this.formatSQLValue(fieldDef.defaultValue, fieldDef.type)}`;
            }

            columns.push(columnDef);
        }

        // Add timestamps if enabled
        if (schema.timestamps) {
            const timestampType = dbType === 'postgresql' ? 'TIMESTAMP' : 'DATETIME';
            columns.push(`createdAt ${timestampType} NOT NULL`);
            columns.push(`updatedAt ${timestampType} NOT NULL`);
        }

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS ${tableName} (
                ${columns.join(',\n                ')}
            )
        `;

        await connection.execute(createTableQuery);

        // Create indexes
        if (schema.indexes) {
            for (const indexFields of schema.indexes) {
                const indexName = `idx_${tableName}_${indexFields.join('_')}`;
                const indexQuery = `CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${indexFields.join(', ')})`;
                await connection.execute(indexQuery);
            }
        }
    }

    private async ensureSQLiteSchema(connection: any, schema: SchemaDefinition): Promise<void> {
        const tableName = schema.tableName;
        const columns: string[] = [];

        // Build column definitions
        for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
            let columnDef = `${fieldName} ${this.getSQLiteType(fieldDef)}`;

            if (fieldDef.primaryKey) {
                columnDef += ' PRIMARY KEY';
            }
            if (fieldDef.required && !fieldDef.primaryKey) {
                columnDef += ' NOT NULL';
            }
            if (fieldDef.unique && !fieldDef.primaryKey) {
                columnDef += ' UNIQUE';
            }
            if (fieldDef.defaultValue !== undefined) {
                columnDef += ` DEFAULT ${this.formatSQLValue(fieldDef.defaultValue, fieldDef.type)}`;
            }

            columns.push(columnDef);
        }

        // Add timestamps if enabled
        if (schema.timestamps) {
            columns.push('createdAt TEXT NOT NULL');
            columns.push('updatedAt TEXT NOT NULL');
        }

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS ${tableName} (
                ${columns.join(',\n                ')}
            )
        `;

        await new Promise<void>((resolve, reject) => {
            connection.run(createTableQuery, (err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Create indexes
        if (schema.indexes) {
            for (const indexFields of schema.indexes) {
                const indexName = `idx_${tableName}_${indexFields.join('_')}`;
                const indexQuery = `CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${indexFields.join(', ')})`;
                await new Promise<void>((resolve, reject) => {
                    connection.run(indexQuery, (err: any) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }
        }
    }

    private async ensureSupabaseSchema(connection: any, schema: SchemaDefinition): Promise<void> {
        // Supabase uses PostgreSQL, but we can't create tables via the client
        // This would typically be done via migrations or SQL commands
        // For now, we'll assume tables exist or use RPC calls
        console.warn('Supabase schema creation should be done via migrations');
    }

    // ==================== TYPE CONVERSION HELPERS ====================

    private getSQLType(fieldDef: FieldDefinition, dbType: 'mysql' | 'postgresql'): string {
        switch (fieldDef.type) {
            case 'string':
                return fieldDef.maxLength ? `VARCHAR(${fieldDef.maxLength})` : 'VARCHAR(255)';
            case 'text':
                return dbType === 'postgresql' ? 'TEXT' : 'TEXT';
            case 'number':
                return dbType === 'postgresql' ? 'INTEGER' : 'INT';
            case 'boolean':
                return dbType === 'postgresql' ? 'BOOLEAN' : 'BOOLEAN';
            case 'date':
                return dbType === 'postgresql' ? 'TIMESTAMP' : 'DATETIME';
            case 'json':
                return dbType === 'postgresql' ? 'JSONB' : 'JSON';
            case 'uuid':
                return dbType === 'postgresql' ? 'UUID' : 'VARCHAR(36)';
            default:
                return 'VARCHAR(255)';
        }
    }

    private getSQLiteType(fieldDef: FieldDefinition): string {
        switch (fieldDef.type) {
            case 'string':
            case 'text':
            case 'uuid':
                return 'TEXT';
            case 'number':
                return 'INTEGER';
            case 'boolean':
                return 'INTEGER'; // SQLite uses 0/1 for boolean
            case 'date':
                return 'TEXT'; // SQLite stores dates as ISO strings
            case 'json':
                return 'TEXT'; // SQLite stores JSON as text
            default:
                return 'TEXT';
        }
    }

    private formatSQLValue(value: any, type: string): string {
        if (value === null || value === undefined) {
            return 'NULL';
        }

        switch (type) {
            case 'string':
            case 'text':
            case 'uuid':
                return `'${value.toString().replace(/'/g, "''")}'`;
            case 'number':
                return value.toString();
            case 'boolean':
                return value ? 'TRUE' : 'FALSE';
            case 'date':
                return `'${value instanceof Date ? value.toISOString() : value}'`;
            case 'json':
                return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
            default:
                return `'${value.toString().replace(/'/g, "''")}'`;
        }
    }

    // ==================== MONGODB IMPLEMENTATIONS ====================

    protected async insertMongo(connection: any, tableName: string, data: any, schema?: SchemaDefinition): Promise<InsertResult> {
        const collectionName = schema?.collectionName || tableName;
        const collection = connection.collection(collectionName);

        const transformedData = this.transformDataForStorage(data, schema, 'mongodb');
        const result = await collection.insertOne(transformedData);

        return {
            success: true,
            insertedId: result.insertedId.toString(),
            insertedCount: 1
        };
    }

    protected async insertManyMongo(connection: any, tableName: string, data: any[], schema?: SchemaDefinition): Promise<InsertResult> {
        const collectionName = schema?.collectionName || tableName;
        const collection = connection.collection(collectionName);

        const transformedData = data.map(item => this.transformDataForStorage(item, schema, 'mongodb'));
        const result = await collection.insertMany(transformedData);

        return {
            success: true,
            insertedCount: result.insertedCount
        };
    }

    protected async findOneMongo<T>(connection: any, tableName: string, options?: QueryOptions, schema?: SchemaDefinition): Promise<T | null> {
        const collectionName = schema?.collectionName || tableName;
        const collection = connection.collection(collectionName);

        const query = this.buildMongoQuery(options);
        let cursor = collection.findOne(query);

        // Apply field selection
        if (options?.select) {
            const projection = options.select.reduce((acc, field) => {
                acc[field] = 1;
                return acc;
            }, {} as any);
            cursor = collection.findOne(query, { projection });
        }

        const result = await cursor;
        return result ? this.transformDataFromStorage(result, schema, 'mongodb') : null;
    }

    protected async findManyMongo<T>(connection: any, tableName: string, options?: QueryOptions, schema?: SchemaDefinition): Promise<FindResult<T>> {
        const collectionName = schema?.collectionName || tableName;
        const collection = connection.collection(collectionName);

        const query = this.buildMongoQuery(options);
        let cursor = collection.find(query);

        // Apply field selection
        if (options?.select) {
            const projection = options.select.reduce((acc, field) => {
                acc[field] = 1;
                return acc;
            }, {} as any);
            cursor = cursor.project(projection);
        }

        // Apply sorting
        if (options?.orderBy) {
            const sort = options.orderBy.reduce((acc, order) => {
                acc[order.field] = order.direction === 'asc' ? 1 : -1;
                return acc;
            }, {} as any);
            cursor = cursor.sort(sort);
        }

        // Apply pagination
        if (options?.offset) {
            cursor = cursor.skip(options.offset);
        }
        if (options?.limit) {
            cursor = cursor.limit(options.limit);
        }

        const results = await cursor.toArray();
        const transformedResults = results.map(item => this.transformDataFromStorage(item, schema, 'mongodb'));

        return {
            data: transformedResults,
            total: await collection.countDocuments(query)
        };
    }

    protected async updateMongo(connection: any, tableName: string, id: string, data: any, schema?: SchemaDefinition): Promise<UpdateResult> {
        const collectionName = schema?.collectionName || tableName;
        const collection = connection.collection(collectionName);

        const transformedData = this.transformDataForStorage(data, schema, 'mongodb');
        const result = await collection.updateOne(
            { id },
            { $set: transformedData }
        );

        return {
            success: true,
            modifiedCount: result.modifiedCount
        };
    }

    protected async updateManyMongo(connection: any, tableName: string, data: any, options?: QueryOptions, schema?: SchemaDefinition): Promise<UpdateResult> {
        const collectionName = schema?.collectionName || tableName;
        const collection = connection.collection(collectionName);

        const query = this.buildMongoQuery(options);
        const transformedData = this.transformDataForStorage(data, schema, 'mongodb');
        const result = await collection.updateMany(query, { $set: transformedData });

        return {
            success: true,
            modifiedCount: result.modifiedCount
        };
    }

    protected async deleteManyMongo(connection: any, tableName: string, options?: QueryOptions, schema?: SchemaDefinition): Promise<DeleteResult> {
        const collectionName = schema?.collectionName || tableName;
        const collection = connection.collection(collectionName);

        const query = this.buildMongoQuery(options);
        const result = await collection.deleteMany(query);

        return {
            success: true,
            deletedCount: result.deletedCount
        };
    }

    protected async countMongo(connection: any, tableName: string, options?: QueryOptions, schema?: SchemaDefinition): Promise<number> {
        const collectionName = schema?.collectionName || tableName;
        const collection = connection.collection(collectionName);

        const query = this.buildMongoQuery(options);
        return await collection.countDocuments(query);
    }

    // ==================== SQL IMPLEMENTATIONS (MySQL/PostgreSQL) ====================

    protected async insertSQL(connection: any, tableName: string, data: any, schema?: SchemaDefinition, dbType?: 'mysql' | 'postgresql'): Promise<InsertResult> {
        const transformedData = this.transformDataForStorage(data, schema, dbType);
        const fields = Object.keys(transformedData);
        const values = Object.values(transformedData);
        const placeholders = fields.map(() => '?').join(', ');

        const query = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
        const result = await connection.execute(query, values);

        return {
            success: true,
            insertedId: result.insertId?.toString(),
            insertedCount: 1
        };
    }

    protected async insertManySQL(connection: any, tableName: string, data: any[], schema?: SchemaDefinition, dbType?: 'mysql' | 'postgresql'): Promise<InsertResult> {
        if (data.length === 0) {
            return { success: true, insertedCount: 0 };
        }

        const transformedData = data.map(item => this.transformDataForStorage(item, schema, dbType));
        const fields = Object.keys(transformedData[0]);
        const placeholders = fields.map(() => '?').join(', ');
        const valueRows = transformedData.map(() => `(${placeholders})`).join(', ');

        const query = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES ${valueRows}`;
        const allValues = transformedData.flatMap(item => Object.values(item));

        const result = await connection.execute(query, allValues);

        return {
            success: true,
            insertedCount: result.affectedRows || data.length
        };
    }

    protected async findOneSQL<T>(connection: any, tableName: string, options?: QueryOptions, schema?: SchemaDefinition, dbType?: 'mysql' | 'postgresql'): Promise<T | null> {
        const { whereClause, values } = this.buildSQLWhere(options);
        const orderBy = this.buildSQLOrderBy(options);
        const selectFields = options?.select ? options.select.join(', ') : '*';

        const query = `SELECT ${selectFields} FROM ${tableName} ${whereClause} ${orderBy} LIMIT 1`;
        const [rows] = await connection.execute(query, values);

        if (rows.length === 0) return null;

        return this.transformDataFromStorage(rows[0], schema, dbType);
    }

    protected async findManySQL<T>(connection: any, tableName: string, options?: QueryOptions, schema?: SchemaDefinition, dbType?: 'mysql' | 'postgresql'): Promise<FindResult<T>> {
        const { whereClause, values } = this.buildSQLWhere(options);
        const orderBy = this.buildSQLOrderBy(options);
        const limit = this.buildSQLLimit(options);
        const selectFields = options?.select ? options.select.join(', ') : '*';

        const query = `SELECT ${selectFields} FROM ${tableName} ${whereClause} ${orderBy} ${limit}`;
        const [rows] = await connection.execute(query, values);

        // Get total count for pagination
        const countQuery = `SELECT COUNT(*) as total FROM ${tableName} ${whereClause}`;
        const [countRows] = await connection.execute(countQuery, values);
        const total = countRows[0].total;

        const transformedResults = rows.map((row: any) => this.transformDataFromStorage(row, schema, dbType));

        return {
            data: transformedResults,
            total
        };
    }

    protected async updateSQL(connection: any, tableName: string, id: string, data: any, schema?: SchemaDefinition, dbType?: 'mysql' | 'postgresql'): Promise<UpdateResult> {
        const transformedData = this.transformDataForStorage(data, schema, dbType);
        const fields = Object.keys(transformedData);
        const values = Object.values(transformedData);
        const setClause = fields.map(field => `${field} = ?`).join(', ');

        const query = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;
        const result = await connection.execute(query, [...values, id]);

        return {
            success: true,
            modifiedCount: result.affectedRows || 0
        };
    }

    protected async updateManySQL(connection: any, tableName: string, data: any, options?: QueryOptions, schema?: SchemaDefinition, dbType?: 'mysql' | 'postgresql'): Promise<UpdateResult> {
        const transformedData = this.transformDataForStorage(data, schema, dbType);
        const fields = Object.keys(transformedData);
        const values = Object.values(transformedData);
        const setClause = fields.map(field => `${field} = ?`).join(', ');

        const { whereClause, values: whereValues } = this.buildSQLWhere(options);

        const query = `UPDATE ${tableName} SET ${setClause} ${whereClause}`;
        const result = await connection.execute(query, [...values, ...whereValues]);

        return {
            success: true,
            modifiedCount: result.affectedRows || 0
        };
    }

    protected async deleteManySQL(connection: any, tableName: string, options?: QueryOptions, schema?: SchemaDefinition, dbType?: 'mysql' | 'postgresql'): Promise<DeleteResult> {
        const { whereClause, values } = this.buildSQLWhere(options);

        const query = `DELETE FROM ${tableName} ${whereClause}`;
        const result = await connection.execute(query, values);

        return {
            success: true,
            deletedCount: result.affectedRows || 0
        };
    }

    protected async countSQL(connection: any, tableName: string, options?: QueryOptions, schema?: SchemaDefinition, dbType?: 'mysql' | 'postgresql'): Promise<number> {
        const { whereClause, values } = this.buildSQLWhere(options);

        const query = `SELECT COUNT(*) as total FROM ${tableName} ${whereClause}`;
        const [rows] = await connection.execute(query, values);

        return rows[0].total;
    }

    // ==================== SQLITE IMPLEMENTATIONS ====================

    protected async insertSQLite(connection: any, tableName: string, data: any, schema?: SchemaDefinition): Promise<InsertResult> {
        const transformedData = this.transformDataForStorage(data, schema, 'localdb');
        const fields = Object.keys(transformedData);
        const values = Object.values(transformedData);
        const placeholders = fields.map(() => '?').join(', ');

        const query = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`;

        return new Promise((resolve, reject) => {
            connection.run(query, values, function (this: any, err: any) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        success: true,
                        insertedId: this.lastID?.toString(),
                        insertedCount: 1
                    });
                }
            });
        });
    }

    protected async insertManySQLite(connection: any, tableName: string, data: any[], schema?: SchemaDefinition): Promise<InsertResult> {
        if (data.length === 0) {
            return { success: true, insertedCount: 0 };
        }

        const transformedData = data.map(item => this.transformDataForStorage(item, schema, 'localdb'));
        let insertedCount = 0;

        return new Promise((resolve, reject) => {
            connection.serialize(() => {
                connection.run('BEGIN TRANSACTION');

                const fields = Object.keys(transformedData[0]);
                const placeholders = fields.map(() => '?').join(', ');
                const query = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`;

                const stmt = connection.prepare(query);

                for (const item of transformedData) {
                    stmt.run(Object.values(item), (err: any) => {
                        if (err) {
                            connection.run('ROLLBACK');
                            reject(err);
                            return;
                        }
                        insertedCount++;
                    });
                }

                stmt.finalize((err: any) => {
                    if (err) {
                        connection.run('ROLLBACK');
                        reject(err);
                    } else {
                        connection.run('COMMIT', (commitErr: any) => {
                            if (commitErr) {
                                reject(commitErr);
                            } else {
                                resolve({
                                    success: true,
                                    insertedCount
                                });
                            }
                        });
                    }
                });
            });
        });
    }

    protected async findOneSQLite<T>(connection: any, tableName: string, options?: QueryOptions, schema?: SchemaDefinition): Promise<T | null> {
        const { whereClause, values } = this.buildSQLWhere(options);
        const orderBy = this.buildSQLOrderBy(options);
        const selectFields = options?.select ? options.select.join(', ') : '*';

        const query = `SELECT ${selectFields} FROM ${tableName} ${whereClause} ${orderBy} LIMIT 1`;

        return new Promise((resolve, reject) => {
            connection.get(query, values, (err: any, row: any) => {
                if (err) {
                    reject(err);
                } else {
                    const result = row ? this.transformDataFromStorage(row, schema, 'localdb') : null;
                    resolve(result);
                }
            });
        });
    }

    protected async findManySQLite<T>(connection: any, tableName: string, options?: QueryOptions, schema?: SchemaDefinition): Promise<FindResult<T>> {
        const { whereClause, values } = this.buildSQLWhere(options);
        const orderBy = this.buildSQLOrderBy(options);
        const limit = this.buildSQLLimit(options);
        const selectFields = options?.select ? options.select.join(', ') : '*';

        const query = `SELECT ${selectFields} FROM ${tableName} ${whereClause} ${orderBy} ${limit}`;
        const countQuery = `SELECT COUNT(*) as total FROM ${tableName} ${whereClause}`;

        return new Promise((resolve, reject) => {
            // Get total count first
            connection.get(countQuery, values, (err: any, countRow: any) => {
                if (err) {
                    reject(err);
                    return;
                }

                const total = countRow.total;

                // Get the actual data
                connection.all(query, values, (err: any, rows: any[]) => {
                    if (err) {
                        reject(err);
                    } else {
                        const transformedResults = rows.map(row => this.transformDataFromStorage(row, schema, 'localdb'));
                        resolve({
                            data: transformedResults,
                            total
                        });
                    }
                });
            });
        });
    }

    protected async updateSQLite(connection: any, tableName: string, id: string, data: any, schema?: SchemaDefinition): Promise<UpdateResult> {
        const transformedData = this.transformDataForStorage(data, schema, 'localdb');
        const fields = Object.keys(transformedData);
        const values = Object.values(transformedData);
        const setClause = fields.map(field => `${field} = ?`).join(', ');

        const query = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;

        return new Promise((resolve, reject) => {
            connection.run(query, [...values, id], function (this: any, err: any) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        success: true,
                        modifiedCount: this.changes || 0
                    });
                }
            });
        });
    }

    protected async updateManySQLite(connection: any, tableName: string, data: any, options?: QueryOptions, schema?: SchemaDefinition): Promise<UpdateResult> {
        const transformedData = this.transformDataForStorage(data, schema, 'localdb');
        const fields = Object.keys(transformedData);
        const values = Object.values(transformedData);
        const setClause = fields.map(field => `${field} = ?`).join(', ');

        const { whereClause, values: whereValues } = this.buildSQLWhere(options);

        const query = `UPDATE ${tableName} SET ${setClause} ${whereClause}`;

        return new Promise((resolve, reject) => {
            connection.run(query, [...values, ...whereValues], function (this: any, err: any) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        success: true,
                        modifiedCount: this.changes || 0
                    });
                }
            });
        });
    }

    protected async deleteManySQLite(connection: any, tableName: string, options?: QueryOptions, schema?: SchemaDefinition): Promise<DeleteResult> {
        const { whereClause, values } = this.buildSQLWhere(options);

        const query = `DELETE FROM ${tableName} ${whereClause}`;

        return new Promise((resolve, reject) => {
            connection.run(query, values, function (this: any, err: any) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        success: true,
                        deletedCount: this.changes || 0
                    });
                }
            });
        });
    }

    protected async countSQLite(connection: any, tableName: string, options?: QueryOptions, schema?: SchemaDefinition): Promise<number> {
        const { whereClause, values } = this.buildSQLWhere(options);

        const query = `SELECT COUNT(*) as total FROM ${tableName} ${whereClause}`;

        return new Promise((resolve, reject) => {
            connection.get(query, values, (err: any, row: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row.total);
                }
            });
        });
    }
}
