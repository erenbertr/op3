import {
    SchemaDefinition,
    QueryOptions,
    InsertResult,
    UpdateResult,
    DeleteResult,
    FindResult
} from '../types/database';
import { UniversalDatabaseImplementations } from './universalDatabaseImplementations';

/**
 * Supabase-specific implementations for the Universal Database Service
 */
export class UniversalDatabaseSupabase extends UniversalDatabaseImplementations {

    // ==================== SUPABASE IMPLEMENTATIONS ====================

    protected async insertSupabase(connection: any, tableName: string, data: any, schema?: SchemaDefinition): Promise<InsertResult> {
        const transformedData = this.transformDataForStorage(data, schema, 'supabase');
        const mappedData = this.mapFieldNames(transformedData, schema, 'supabase');
        
        const { data: result, error } = await connection
            .from(tableName)
            .insert([mappedData])
            .select();
        
        if (error) {
            throw new Error(`Supabase insert error: ${error.message}`);
        }
        
        return {
            success: true,
            insertedId: result?.[0]?.id?.toString(),
            insertedCount: 1
        };
    }

    protected async insertManySupabase(connection: any, tableName: string, data: any[], schema?: SchemaDefinition): Promise<InsertResult> {
        if (data.length === 0) {
            return { success: true, insertedCount: 0 };
        }

        const transformedData = data.map(item => {
            const transformed = this.transformDataForStorage(item, schema, 'supabase');
            return this.mapFieldNames(transformed, schema, 'supabase');
        });
        
        const { data: result, error } = await connection
            .from(tableName)
            .insert(transformedData)
            .select();
        
        if (error) {
            throw new Error(`Supabase insertMany error: ${error.message}`);
        }
        
        return {
            success: true,
            insertedCount: result?.length || 0
        };
    }

    protected async findOneSupabase<T>(connection: any, tableName: string, options?: QueryOptions, schema?: SchemaDefinition): Promise<T | null> {
        let query = connection.from(tableName);
        
        // Apply field selection
        if (options?.select) {
            const mappedFields = options.select.map(field => this.mapFieldNames({ [field]: true }, schema, 'supabase'));
            const selectFields = mappedFields.map(mapped => Object.keys(mapped)[0]).join(', ');
            query = query.select(selectFields);
        } else {
            query = query.select('*');
        }
        
        // Apply query conditions
        query = this.buildSupabaseQuery(query, options);
        
        // Limit to 1
        query = query.limit(1).single();
        
        const { data, error } = await query;
        
        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
            throw new Error(`Supabase findOne error: ${error.message}`);
        }
        
        if (!data) return null;
        
        const reverseMapped = this.reverseMapFieldNames(data, schema, 'supabase');
        return this.transformDataFromStorage(reverseMapped, schema, 'supabase');
    }

    protected async findManySupabase<T>(connection: any, tableName: string, options?: QueryOptions, schema?: SchemaDefinition): Promise<FindResult<T>> {
        let query = connection.from(tableName);
        
        // Apply field selection
        if (options?.select) {
            const mappedFields = options.select.map(field => this.mapFieldNames({ [field]: true }, schema, 'supabase'));
            const selectFields = mappedFields.map(mapped => Object.keys(mapped)[0]).join(', ');
            query = query.select(selectFields);
        } else {
            query = query.select('*');
        }
        
        // Apply query conditions, ordering, and pagination
        query = this.buildSupabaseQuery(query, options);
        
        const { data, error, count } = await query;
        
        if (error) {
            throw new Error(`Supabase findMany error: ${error.message}`);
        }
        
        const transformedResults = (data || []).map((item: any) => {
            const reverseMapped = this.reverseMapFieldNames(item, schema, 'supabase');
            return this.transformDataFromStorage(reverseMapped, schema, 'supabase');
        });
        
        return {
            data: transformedResults,
            total: count || 0
        };
    }

    protected async updateSupabase(connection: any, tableName: string, id: string, data: any, schema?: SchemaDefinition): Promise<UpdateResult> {
        const transformedData = this.transformDataForStorage(data, schema, 'supabase');
        const mappedData = this.mapFieldNames(transformedData, schema, 'supabase');
        
        const { data: result, error } = await connection
            .from(tableName)
            .update(mappedData)
            .eq('id', id)
            .select();
        
        if (error) {
            throw new Error(`Supabase update error: ${error.message}`);
        }
        
        return {
            success: true,
            modifiedCount: result?.length || 0
        };
    }

    protected async updateManySupabase(connection: any, tableName: string, data: any, options?: QueryOptions, schema?: SchemaDefinition): Promise<UpdateResult> {
        const transformedData = this.transformDataForStorage(data, schema, 'supabase');
        const mappedData = this.mapFieldNames(transformedData, schema, 'supabase');
        
        let query = connection
            .from(tableName)
            .update(mappedData);
        
        // Apply where conditions
        query = this.buildSupabaseQuery(query, options);
        
        const { data: result, error } = await query.select();
        
        if (error) {
            throw new Error(`Supabase updateMany error: ${error.message}`);
        }
        
        return {
            success: true,
            modifiedCount: result?.length || 0
        };
    }

    protected async deleteManySupabase(connection: any, tableName: string, options?: QueryOptions, schema?: SchemaDefinition): Promise<DeleteResult> {
        let query = connection.from(tableName).delete();
        
        // Apply where conditions
        query = this.buildSupabaseQuery(query, options);
        
        const { data: result, error } = await query.select();
        
        if (error) {
            throw new Error(`Supabase deleteMany error: ${error.message}`);
        }
        
        return {
            success: true,
            deletedCount: result?.length || 0
        };
    }

    protected async countSupabase(connection: any, tableName: string, options?: QueryOptions, schema?: SchemaDefinition): Promise<number> {
        let query = connection
            .from(tableName)
            .select('*', { count: 'exact', head: true });
        
        // Apply where conditions
        query = this.buildSupabaseQuery(query, options);
        
        const { count, error } = await query;
        
        if (error) {
            throw new Error(`Supabase count error: ${error.message}`);
        }
        
        return count || 0;
    }

    /**
     * Build Supabase query with proper field mapping
     */
    protected buildSupabaseQuery(query: any, options?: QueryOptions): any {
        if (!options?.where) return query;

        for (const condition of options.where) {
            // Map field name to database convention
            const mappedField = this.mapFieldNames({ [condition.field]: true }, undefined, 'supabase');
            const dbFieldName = Object.keys(mappedField)[0];
            
            switch (condition.operator) {
                case 'eq':
                    query = query.eq(dbFieldName, condition.value);
                    break;
                case 'ne':
                    query = query.neq(dbFieldName, condition.value);
                    break;
                case 'gt':
                    query = query.gt(dbFieldName, condition.value);
                    break;
                case 'gte':
                    query = query.gte(dbFieldName, condition.value);
                    break;
                case 'lt':
                    query = query.lt(dbFieldName, condition.value);
                    break;
                case 'lte':
                    query = query.lte(dbFieldName, condition.value);
                    break;
                case 'in':
                    query = query.in(dbFieldName, condition.value);
                    break;
                case 'like':
                    query = query.ilike(dbFieldName, `%${condition.value}%`);
                    break;
                case 'exists':
                    if (condition.value) {
                        query = query.not(dbFieldName, 'is', null);
                    } else {
                        query = query.is(dbFieldName, null);
                    }
                    break;
            }
        }

        // Add ordering
        if (options.orderBy) {
            for (const order of options.orderBy) {
                const mappedField = this.mapFieldNames({ [order.field]: true }, undefined, 'supabase');
                const dbFieldName = Object.keys(mappedField)[0];
                query = query.order(dbFieldName, { ascending: order.direction === 'asc' });
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
}
