import { DatabaseManager } from '../config/database';
import {
    WorkspaceAIFavorite,
    CreateAIFavoriteRequest,
    UpdateAIFavoriteRequest,
    WorkspaceAIFavoritesResponse,
    CreateAIFavoriteResponse,
    DeleteAIFavoriteResponse
} from '../types/ai-provider';
import crypto from 'crypto';

export class WorkspaceAIFavoritesService {
    private dbManager: DatabaseManager;

    constructor() {
        this.dbManager = DatabaseManager.getInstance();
    }

    /**
     * Get all AI favorites for a workspace
     */
    public async getWorkspaceAIFavorites(workspaceId: string): Promise<WorkspaceAIFavoritesResponse> {
        try {
            const { connection, config } = await this.dbManager.getConnection();
            await this.createTableIfNotExists(connection, config.type);

            let favorites: WorkspaceAIFavorite[] = [];

            switch (config.type) {
                case 'mongodb':
                    const mongoResults = await connection.collection('workspace_ai_favorites')
                        .find({ workspaceId })
                        .sort({ sortOrder: 1 })
                        .toArray();
                    favorites = mongoResults.map(this.mapMongoToFavorite);
                    break;

                case 'mysql':
                case 'postgresql':
                    const sqlResults = await connection.execute(
                        'SELECT * FROM workspace_ai_favorites WHERE workspaceId = ? ORDER BY sortOrder ASC',
                        [workspaceId]
                    );
                    favorites = sqlResults[0].map(this.mapSQLToFavorite);
                    break;

                case 'localdb':
                    favorites = await new Promise<WorkspaceAIFavorite[]>((resolve, reject) => {
                        connection.all(
                            'SELECT * FROM workspace_ai_favorites WHERE workspaceId = ? ORDER BY sortOrder ASC',
                            [workspaceId],
                            (err: any, rows: any[]) => {
                                if (err) reject(err);
                                else resolve(rows.map(this.mapSQLiteToFavorite));
                            }
                        );
                    });
                    break;

                case 'supabase':
                    const { data, error } = await connection
                        .from('workspace_ai_favorites')
                        .select('*')
                        .eq('workspace_id', workspaceId)
                        .order('sort_order', { ascending: true });

                    if (error) throw new Error(`Supabase error: ${error.message}`);
                    favorites = data.map(this.mapSupabaseToFavorite);
                    break;

                default:
                    throw new Error(`Database type ${config.type} not supported`);
            }

            return {
                success: true,
                favorites
            };
        } catch (error) {
            console.error('Error getting workspace AI favorites:', error);
            return {
                success: false,
                favorites: [],
                message: error instanceof Error ? error.message : 'Failed to get AI favorites'
            };
        }
    }

    /**
     * Add an AI provider to workspace favorites
     */
    public async addAIFavorite(request: CreateAIFavoriteRequest): Promise<CreateAIFavoriteResponse> {
        try {
            const { connection, config } = await this.dbManager.getConnection();
            await this.createTableIfNotExists(connection, config.type);

            // Check if already favorited
            const existing = await this.findExistingFavorite(connection, config.type, request.workspaceId, request.aiProviderId);
            if (existing) {
                return {
                    success: false,
                    message: 'AI provider is already in favorites'
                };
            }

            // Get next sort order
            const nextSortOrder = await this.getNextSortOrder(connection, config.type, request.workspaceId);

            const favorite: WorkspaceAIFavorite = {
                id: crypto.randomUUID(),
                workspaceId: request.workspaceId,
                aiProviderId: request.aiProviderId,
                isModelConfig: request.isModelConfig,
                displayName: request.displayName,
                sortOrder: nextSortOrder,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await this.saveFavoriteToDatabase(connection, config.type, favorite);

            return {
                success: true,
                favorite,
                message: 'AI provider added to favorites successfully'
            };
        } catch (error) {
            console.error('Error adding AI favorite:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to add AI favorite'
            };
        }
    }

    /**
     * Remove an AI provider from workspace favorites
     */
    public async removeAIFavorite(favoriteId: string): Promise<DeleteAIFavoriteResponse> {
        try {
            const { connection, config } = await this.dbManager.getConnection();

            switch (config.type) {
                case 'mongodb':
                    await connection.collection('workspace_ai_favorites').deleteOne({ id: favoriteId });
                    break;

                case 'mysql':
                case 'postgresql':
                    await connection.execute('DELETE FROM workspace_ai_favorites WHERE id = ?', [favoriteId]);
                    break;

                case 'localdb':
                    await new Promise<void>((resolve, reject) => {
                        connection.run('DELETE FROM workspace_ai_favorites WHERE id = ?', [favoriteId], (err: any) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                    break;

                case 'supabase':
                    const { error } = await connection
                        .from('workspace_ai_favorites')
                        .delete()
                        .eq('id', favoriteId);

                    if (error) throw new Error(`Supabase error: ${error.message}`);
                    break;

                default:
                    throw new Error(`Database type ${config.type} not supported`);
            }

            return {
                success: true,
                message: 'AI provider removed from favorites successfully'
            };
        } catch (error) {
            console.error('Error removing AI favorite:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to remove AI favorite'
            };
        }
    }

    /**
     * Update AI favorite (display name or sort order)
     */
    public async updateAIFavorite(favoriteId: string, request: UpdateAIFavoriteRequest): Promise<CreateAIFavoriteResponse> {
        try {
            const { connection, config } = await this.dbManager.getConnection();
            const updatedAt = new Date();

            const updateFields: any = { updatedAt };
            if (request.displayName !== undefined) updateFields.displayName = request.displayName;
            if (request.sortOrder !== undefined) updateFields.sortOrder = request.sortOrder;

            switch (config.type) {
                case 'mongodb':
                    await connection.collection('workspace_ai_favorites').updateOne(
                        { id: favoriteId },
                        { $set: updateFields }
                    );
                    break;

                case 'mysql':
                case 'postgresql':
                    const setClause = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
                    const values = Object.values(updateFields).map(val =>
                        val instanceof Date ? val.toISOString() : val
                    );
                    await connection.execute(
                        `UPDATE workspace_ai_favorites SET ${setClause} WHERE id = ?`,
                        [...values, favoriteId]
                    );
                    break;

                case 'localdb':
                    const sqliteSetClause = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
                    const sqliteValues = Object.values(updateFields).map(val =>
                        val instanceof Date ? val.toISOString() : val
                    );
                    await new Promise<void>((resolve, reject) => {
                        connection.run(
                            `UPDATE workspace_ai_favorites SET ${sqliteSetClause} WHERE id = ?`,
                            [...sqliteValues, favoriteId],
                            (err: any) => {
                                if (err) reject(err);
                                else resolve();
                            }
                        );
                    });
                    break;

                case 'supabase':
                    const supabaseFields: any = {};
                    if (request.displayName !== undefined) supabaseFields.display_name = request.displayName;
                    if (request.sortOrder !== undefined) supabaseFields.sort_order = request.sortOrder;
                    supabaseFields.updated_at = updatedAt.toISOString();

                    const { error } = await connection
                        .from('workspace_ai_favorites')
                        .update(supabaseFields)
                        .eq('id', favoriteId);

                    if (error) throw new Error(`Supabase error: ${error.message}`);
                    break;

                default:
                    throw new Error(`Database type ${config.type} not supported`);
            }

            return {
                success: true,
                message: 'AI favorite updated successfully'
            };
        } catch (error) {
            console.error('Error updating AI favorite:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to update AI favorite'
            };
        }
    }

    /**
     * Reorder AI favorites for a workspace
     */
    public async reorderAIFavorites(workspaceId: string, favoriteIds: string[]): Promise<DeleteAIFavoriteResponse> {
        try {
            const { connection, config } = await this.dbManager.getConnection();

            // Update sort order for each favorite
            for (let i = 0; i < favoriteIds.length; i++) {
                const favoriteId = favoriteIds[i];
                const sortOrder = i + 1;

                await this.updateAIFavorite(favoriteId, { sortOrder });
            }

            return {
                success: true,
                message: 'AI favorites reordered successfully'
            };
        } catch (error) {
            console.error('Error reordering AI favorites:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to reorder AI favorites'
            };
        }
    }

    // Helper methods
    private async createTableIfNotExists(connection: any, dbType: string): Promise<void> {
        switch (dbType) {
            case 'localdb':
                return new Promise<void>((resolve, reject) => {
                    connection.run(`
                        CREATE TABLE IF NOT EXISTS workspace_ai_favorites (
                            id TEXT PRIMARY KEY,
                            workspaceId TEXT NOT NULL,
                            aiProviderId TEXT NOT NULL,
                            isModelConfig INTEGER NOT NULL DEFAULT 0,
                            displayName TEXT NOT NULL,
                            sortOrder INTEGER NOT NULL DEFAULT 0,
                            createdAt TEXT NOT NULL,
                            updatedAt TEXT NOT NULL,
                            UNIQUE(workspaceId, aiProviderId)
                        )
                    `, (err: any) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

            case 'mongodb':
                // MongoDB doesn't need explicit table creation
                // Create index for better performance
                await connection.collection('workspace_ai_favorites').createIndex(
                    { workspaceId: 1, aiProviderId: 1 },
                    { unique: true }
                );
                await connection.collection('workspace_ai_favorites').createIndex({ workspaceId: 1, sortOrder: 1 });
                return Promise.resolve();

            case 'mysql':
                await connection.execute(`
                    CREATE TABLE IF NOT EXISTS workspace_ai_favorites (
                        id VARCHAR(36) PRIMARY KEY,
                        workspaceId VARCHAR(36) NOT NULL,
                        aiProviderId VARCHAR(255) NOT NULL,
                        isModelConfig BOOLEAN NOT NULL DEFAULT FALSE,
                        displayName VARCHAR(255) NOT NULL,
                        sortOrder INT NOT NULL DEFAULT 0,
                        createdAt DATETIME NOT NULL,
                        updatedAt DATETIME NOT NULL,
                        UNIQUE KEY unique_workspace_provider (workspaceId, aiProviderId),
                        INDEX idx_workspace_sort (workspaceId, sortOrder)
                    )
                `);
                break;

            case 'postgresql':
                await connection.execute(`
                    CREATE TABLE IF NOT EXISTS workspace_ai_favorites (
                        id VARCHAR(36) PRIMARY KEY,
                        workspaceId VARCHAR(36) NOT NULL,
                        aiProviderId VARCHAR(255) NOT NULL,
                        isModelConfig BOOLEAN NOT NULL DEFAULT FALSE,
                        displayName VARCHAR(255) NOT NULL,
                        sortOrder INTEGER NOT NULL DEFAULT 0,
                        createdAt TIMESTAMP NOT NULL,
                        updatedAt TIMESTAMP NOT NULL,
                        UNIQUE(workspaceId, aiProviderId)
                    );
                    CREATE INDEX IF NOT EXISTS idx_workspace_ai_favorites_workspace_sort
                    ON workspace_ai_favorites(workspaceId, sortOrder);
                `);
                break;

            case 'supabase':
                // Supabase table should be created manually or via migration
                // This is just for reference
                break;

            default:
                throw new Error(`Database type ${dbType} not supported`);
        }
    }

    private async findExistingFavorite(connection: any, dbType: string, workspaceId: string, aiProviderId: string): Promise<boolean> {
        switch (dbType) {
            case 'mongodb':
                const mongoResult = await connection.collection('workspace_ai_favorites')
                    .findOne({ workspaceId, aiProviderId });
                return !!mongoResult;

            case 'mysql':
            case 'postgresql':
                const sqlResult = await connection.execute(
                    'SELECT id FROM workspace_ai_favorites WHERE workspaceId = ? AND aiProviderId = ?',
                    [workspaceId, aiProviderId]
                );
                return sqlResult[0].length > 0;

            case 'localdb':
                return new Promise<boolean>((resolve, reject) => {
                    connection.get(
                        'SELECT id FROM workspace_ai_favorites WHERE workspaceId = ? AND aiProviderId = ?',
                        [workspaceId, aiProviderId],
                        (err: any, row: any) => {
                            if (err) reject(err);
                            else resolve(!!row);
                        }
                    );
                });

            case 'supabase':
                const { data, error } = await connection
                    .from('workspace_ai_favorites')
                    .select('id')
                    .eq('workspace_id', workspaceId)
                    .eq('ai_provider_id', aiProviderId)
                    .single();

                if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
                    throw new Error(`Supabase error: ${error.message}`);
                }
                return !!data;

            default:
                throw new Error(`Database type ${dbType} not supported`);
        }
    }

    private async getNextSortOrder(connection: any, dbType: string, workspaceId: string): Promise<number> {
        switch (dbType) {
            case 'mongodb':
                const mongoResult = await connection.collection('workspace_ai_favorites')
                    .findOne(
                        { workspaceId },
                        { sort: { sortOrder: -1 } }
                    );
                return mongoResult ? mongoResult.sortOrder + 1 : 1;

            case 'mysql':
            case 'postgresql':
                const sqlResult = await connection.execute(
                    'SELECT MAX(sortOrder) as maxOrder FROM workspace_ai_favorites WHERE workspaceId = ?',
                    [workspaceId]
                );
                return (sqlResult[0][0]?.maxOrder || 0) + 1;

            case 'localdb':
                return new Promise<number>((resolve, reject) => {
                    connection.get(
                        'SELECT MAX(sortOrder) as maxOrder FROM workspace_ai_favorites WHERE workspaceId = ?',
                        [workspaceId],
                        (err: any, row: any) => {
                            if (err) reject(err);
                            else resolve((row?.maxOrder || 0) + 1);
                        }
                    );
                });

            case 'supabase':
                const { data, error } = await connection
                    .from('workspace_ai_favorites')
                    .select('sort_order')
                    .eq('workspace_id', workspaceId)
                    .order('sort_order', { ascending: false })
                    .limit(1)
                    .single();

                if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
                    throw new Error(`Supabase error: ${error.message}`);
                }
                return data ? data.sort_order + 1 : 1;

            default:
                throw new Error(`Database type ${dbType} not supported`);
        }
    }

    private async saveFavoriteToDatabase(connection: any, dbType: string, favorite: WorkspaceAIFavorite): Promise<void> {
        switch (dbType) {
            case 'mongodb':
                await connection.collection('workspace_ai_favorites').insertOne(favorite);
                break;

            case 'mysql':
            case 'postgresql':
                await connection.execute(`
                    INSERT INTO workspace_ai_favorites
                    (id, workspaceId, aiProviderId, isModelConfig, displayName, sortOrder, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    favorite.id,
                    favorite.workspaceId,
                    favorite.aiProviderId,
                    favorite.isModelConfig,
                    favorite.displayName,
                    favorite.sortOrder,
                    favorite.createdAt.toISOString(),
                    favorite.updatedAt.toISOString()
                ]);
                break;

            case 'localdb':
                await new Promise<void>((resolve, reject) => {
                    connection.run(`
                        INSERT INTO workspace_ai_favorites
                        (id, workspaceId, aiProviderId, isModelConfig, displayName, sortOrder, createdAt, updatedAt)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        favorite.id,
                        favorite.workspaceId,
                        favorite.aiProviderId,
                        favorite.isModelConfig ? 1 : 0,
                        favorite.displayName,
                        favorite.sortOrder,
                        favorite.createdAt.toISOString(),
                        favorite.updatedAt.toISOString()
                    ], (err: any) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                break;

            case 'supabase':
                const { error } = await connection
                    .from('workspace_ai_favorites')
                    .insert([{
                        id: favorite.id,
                        workspace_id: favorite.workspaceId,
                        ai_provider_id: favorite.aiProviderId,
                        is_model_config: favorite.isModelConfig,
                        display_name: favorite.displayName,
                        sort_order: favorite.sortOrder,
                        created_at: favorite.createdAt.toISOString(),
                        updated_at: favorite.updatedAt.toISOString()
                    }]);

                if (error) throw new Error(`Supabase error: ${error.message}`);
                break;

            default:
                throw new Error(`Database type ${dbType} not supported`);
        }
    }

    // Data mapping methods
    private mapMongoToFavorite(doc: any): WorkspaceAIFavorite {
        return {
            id: doc.id,
            workspaceId: doc.workspaceId,
            aiProviderId: doc.aiProviderId,
            isModelConfig: doc.isModelConfig,
            displayName: doc.displayName,
            sortOrder: doc.sortOrder,
            createdAt: new Date(doc.createdAt),
            updatedAt: new Date(doc.updatedAt)
        };
    }

    private mapSQLToFavorite(row: any): WorkspaceAIFavorite {
        return {
            id: row.id,
            workspaceId: row.workspaceId,
            aiProviderId: row.aiProviderId,
            isModelConfig: row.isModelConfig,
            displayName: row.displayName,
            sortOrder: row.sortOrder,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt)
        };
    }

    private mapSQLiteToFavorite(row: any): WorkspaceAIFavorite {
        return {
            id: row.id,
            workspaceId: row.workspaceId,
            aiProviderId: row.aiProviderId,
            isModelConfig: !!row.isModelConfig,
            displayName: row.displayName,
            sortOrder: row.sortOrder,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt)
        };
    }

    private mapSupabaseToFavorite(row: any): WorkspaceAIFavorite {
        return {
            id: row.id,
            workspaceId: row.workspace_id,
            aiProviderId: row.ai_provider_id,
            isModelConfig: row.is_model_config,
            displayName: row.display_name,
            sortOrder: row.sort_order,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }
}
