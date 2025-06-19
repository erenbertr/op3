import {
    SchemaDefinition,
    QueryOptions,
    QueryCondition,
    InsertResult,
    UpdateResult,
    DeleteResult,
    FindResult,
    DatabaseType
} from '../types/database';

/**
 * Database-specific implementation methods for the Universal Database Service
 * This file contains all the database-specific CRUD operations
 */

export class UniversalDatabaseImplementations {
    
    // ==================== QUERY BUILDERS ====================

    /**
     * Build MongoDB query from QueryOptions
     */
    protected buildMongoQuery(options?: QueryOptions): any {
        if (!options?.where) return {};

        const query: any = {};
        
        for (const condition of options.where) {
            switch (condition.operator) {
                case 'eq':
                    query[condition.field] = condition.value;
                    break;
                case 'ne':
                    query[condition.field] = { $ne: condition.value };
                    break;
                case 'gt':
                    query[condition.field] = { $gt: condition.value };
                    break;
                case 'gte':
                    query[condition.field] = { $gte: condition.value };
                    break;
                case 'lt':
                    query[condition.field] = { $lt: condition.value };
                    break;
                case 'lte':
                    query[condition.field] = { $lte: condition.value };
                    break;
                case 'in':
                    query[condition.field] = { $in: condition.value };
                    break;
                case 'nin':
                    query[condition.field] = { $nin: condition.value };
                    break;
                case 'like':
                    query[condition.field] = { $regex: condition.value, $options: 'i' };
                    break;
                case 'exists':
                    query[condition.field] = { $exists: condition.value };
                    break;
            }
        }

        return query;
    }

    /**
     * Build SQL WHERE clause from QueryOptions
     */
    protected buildSQLWhere(options?: QueryOptions): { whereClause: string; values: any[] } {
        if (!options?.where || options.where.length === 0) {
            return { whereClause: '', values: [] };
        }

        const conditions: string[] = [];
        const values: any[] = [];

        for (const condition of options.where) {
            switch (condition.operator) {
                case 'eq':
                    conditions.push(`${condition.field} = ?`);
                    values.push(condition.value);
                    break;
                case 'ne':
                    conditions.push(`${condition.field} != ?`);
                    values.push(condition.value);
                    break;
                case 'gt':
                    conditions.push(`${condition.field} > ?`);
                    values.push(condition.value);
                    break;
                case 'gte':
                    conditions.push(`${condition.field} >= ?`);
                    values.push(condition.value);
                    break;
                case 'lt':
                    conditions.push(`${condition.field} < ?`);
                    values.push(condition.value);
                    break;
                case 'lte':
                    conditions.push(`${condition.field} <= ?`);
                    values.push(condition.value);
                    break;
                case 'in':
                    const placeholders = condition.value.map(() => '?').join(', ');
                    conditions.push(`${condition.field} IN (${placeholders})`);
                    values.push(...condition.value);
                    break;
                case 'nin':
                    const notPlaceholders = condition.value.map(() => '?').join(', ');
                    conditions.push(`${condition.field} NOT IN (${notPlaceholders})`);
                    values.push(...condition.value);
                    break;
                case 'like':
                    conditions.push(`${condition.field} LIKE ?`);
                    values.push(`%${condition.value}%`);
                    break;
                case 'exists':
                    if (condition.value) {
                        conditions.push(`${condition.field} IS NOT NULL`);
                    } else {
                        conditions.push(`${condition.field} IS NULL`);
                    }
                    break;
            }
        }

        return {
            whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
            values
        };
    }

    /**
     * Build SQL ORDER BY clause from QueryOptions
     */
    protected buildSQLOrderBy(options?: QueryOptions): string {
        if (!options?.orderBy || options.orderBy.length === 0) {
            return '';
        }

        const orderClauses = options.orderBy.map(order => 
            `${order.field} ${order.direction.toUpperCase()}`
        );

        return `ORDER BY ${orderClauses.join(', ')}`;
    }

    /**
     * Build SQL LIMIT clause from QueryOptions
     */
    protected buildSQLLimit(options?: QueryOptions): string {
        if (!options?.limit) {
            return '';
        }

        let limitClause = `LIMIT ${options.limit}`;
        if (options.offset) {
            limitClause += ` OFFSET ${options.offset}`;
        }

        return limitClause;
    }

    /**
     * Build Supabase query from QueryOptions
     */
    protected buildSupabaseQuery(query: any, options?: QueryOptions): any {
        if (!options?.where) return query;

        for (const condition of options.where) {
            switch (condition.operator) {
                case 'eq':
                    query = query.eq(condition.field, condition.value);
                    break;
                case 'ne':
                    query = query.neq(condition.field, condition.value);
                    break;
                case 'gt':
                    query = query.gt(condition.field, condition.value);
                    break;
                case 'gte':
                    query = query.gte(condition.field, condition.value);
                    break;
                case 'lt':
                    query = query.lt(condition.field, condition.value);
                    break;
                case 'lte':
                    query = query.lte(condition.field, condition.value);
                    break;
                case 'in':
                    query = query.in(condition.field, condition.value);
                    break;
                case 'like':
                    query = query.ilike(condition.field, `%${condition.value}%`);
                    break;
                case 'exists':
                    if (condition.value) {
                        query = query.not(condition.field, 'is', null);
                    } else {
                        query = query.is(condition.field, null);
                    }
                    break;
            }
        }

        // Add ordering
        if (options.orderBy) {
            for (const order of options.orderBy) {
                query = query.order(order.field, { ascending: order.direction === 'asc' });
            }
        }

        // Add limit and offset
        if (options.limit) {
            query = query.limit(options.limit);
        }
        if (options.offset) {
            query = query.range(options.offset, (options.offset + (options.limit || 100)) - 1);
        }

        return query;
    }

    // ==================== DATA TRANSFORMATION HELPERS ====================

    /**
     * Convert data for database storage
     */
    protected transformDataForStorage(data: any, schema?: SchemaDefinition, dbType?: DatabaseType): any {
        if (!schema) return data;

        const transformed = { ...data };

        for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
            if (transformed[fieldName] !== undefined) {
                transformed[fieldName] = this.convertValueForStorage(
                    transformed[fieldName], 
                    fieldDef.type, 
                    dbType
                );
            }
        }

        return transformed;
    }

    /**
     * Convert data from database format
     */
    protected transformDataFromStorage(data: any, schema?: SchemaDefinition, dbType?: DatabaseType): any {
        if (!schema || !data) return data;

        const transformed = { ...data };

        for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
            if (transformed[fieldName] !== undefined) {
                transformed[fieldName] = this.convertValueFromStorage(
                    transformed[fieldName], 
                    fieldDef.type, 
                    dbType
                );
            }
        }

        return transformed;
    }

    /**
     * Convert value for storage in specific database type
     */
    private convertValueForStorage(value: any, fieldType: string, dbType?: DatabaseType): any {
        if (value === null || value === undefined) return value;

        switch (fieldType) {
            case 'date':
                if (value instanceof Date) {
                    return dbType === 'localdb' ? value.toISOString() : value;
                }
                return value;
            case 'boolean':
                if (dbType === 'localdb') {
                    return value ? 1 : 0;
                }
                return value;
            case 'json':
                if (typeof value === 'object') {
                    return dbType === 'mongodb' ? value : JSON.stringify(value);
                }
                return value;
            default:
                return value;
        }
    }

    /**
     * Convert value from storage format
     */
    private convertValueFromStorage(value: any, fieldType: string, dbType?: DatabaseType): any {
        if (value === null || value === undefined) return value;

        switch (fieldType) {
            case 'date':
                if (typeof value === 'string') {
                    return new Date(value);
                }
                return value;
            case 'boolean':
                if (dbType === 'localdb' && typeof value === 'number') {
                    return value === 1;
                }
                return value;
            case 'json':
                if (typeof value === 'string' && dbType !== 'mongodb') {
                    try {
                        return JSON.parse(value);
                    } catch {
                        return value;
                    }
                }
                return value;
            default:
                return value;
        }
    }

    /**
     * Map field names for different database conventions
     */
    protected mapFieldNames(data: any, schema?: SchemaDefinition, dbType?: DatabaseType): any {
        if (!schema || dbType === 'mongodb') return data;

        // For Supabase, convert camelCase to snake_case
        if (dbType === 'supabase') {
            const mapped: any = {};
            for (const [key, value] of Object.entries(data)) {
                const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                mapped[snakeKey] = value;
            }
            return mapped;
        }

        return data;
    }

    /**
     * Reverse map field names from database format
     */
    protected reverseMapFieldNames(data: any, schema?: SchemaDefinition, dbType?: DatabaseType): any {
        if (!schema || dbType === 'mongodb') return data;

        // For Supabase, convert snake_case to camelCase
        if (dbType === 'supabase') {
            const mapped: any = {};
            for (const [key, value] of Object.entries(data)) {
                const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                mapped[camelKey] = value;
            }
            return mapped;
        }

        return data;
    }
}
