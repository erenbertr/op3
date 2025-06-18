import { DatabaseManager } from '../config/database';
import {
    WorkspacePersonalityFavorite,
    CreatePersonalityFavoriteRequest,
    UpdatePersonalityFavoriteRequest,
    WorkspacePersonalityFavoritesResponse,
    CreatePersonalityFavoriteResponse,
    DeletePersonalityFavoriteResponse,
    ReorderPersonalityFavoritesRequest
} from '../types/personality';
import crypto from 'crypto';

export class WorkspacePersonalityFavoritesService {
    private dbManager: DatabaseManager;

    constructor() {
        this.dbManager = DatabaseManager.getInstance();
    }

    /**
     * Get all personality favorites for a workspace
     */
    public async getWorkspacePersonalityFavorites(workspaceId: string): Promise<WorkspacePersonalityFavoritesResponse> {
        try {
            const connection = await this.dbManager.getConnection();
            const config = this.dbManager.getCurrentConfig();
            if (!connection || !config) {
                return {
                    success: false,
                    favorites: [],
                    message: 'Database connection not available'
                };
            }
            await this.createTableIfNotExists(connection, config.type);

            let favorites: WorkspacePersonalityFavorite[] = [];

            switch (config.type) {
                case 'mongodb':
                    const mongoFavorites = await connection.collection('workspace_personality_favorites')
                        .find({ workspaceId })
                        .sort({ sortOrder: 1 })
                        .toArray();
                    favorites = mongoFavorites.map(this.mapMongoToFavorite);
                    break;

                case 'mysql':
                case 'postgresql':
                    const [rows] = await connection.execute(
                        'SELECT * FROM workspace_personality_favorites WHERE workspaceId = ? ORDER BY sortOrder ASC',
                        [workspaceId]
                    );
                    favorites = (rows as any[]).map(this.mapSQLToFavorite);
                    break;

                case 'localdb':
                    favorites = await new Promise<WorkspacePersonalityFavorite[]>((resolve, reject) => {
                        connection.all(
                            'SELECT * FROM workspace_personality_favorites WHERE workspaceId = ? ORDER BY sortOrder ASC',
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
                        .from('workspace_personality_favorites')
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
            console.error('Error getting workspace personality favorites:', error);
            return {
                success: false,
                favorites: [],
                message: error instanceof Error ? error.message : 'Failed to get personality favorites'
            };
        }
    }

    /**
     * Add a personality to workspace favorites
     */
    public async addPersonalityFavorite(request: CreatePersonalityFavoriteRequest): Promise<CreatePersonalityFavoriteResponse> {
        try {
            const connection = await this.dbManager.getConnection();
            const config = this.dbManager.getCurrentConfig();
            if (!connection || !config) {
                return {
                    success: false,
                    message: 'Database connection not available'
                };
            }
            await this.createTableIfNotExists(connection, config.type);

            // Check if already favorited
            const existing = await this.findExistingFavorite(connection, config.type, request.workspaceId, request.personalityId);
            if (existing) {
                return {
                    success: false,
                    message: 'Personality is already in favorites'
                };
            }

            // Get next sort order
            const nextSortOrder = request.sortOrder ?? await this.getNextSortOrder(connection, config.type, request.workspaceId);

            const favorite: WorkspacePersonalityFavorite = {
                id: crypto.randomUUID(),
                workspaceId: request.workspaceId,
                personalityId: request.personalityId,
                sortOrder: nextSortOrder,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await this.saveFavoriteToDatabase(connection, config.type, favorite);

            return {
                success: true,
                favorite,
                message: 'Personality added to favorites successfully'
            };
        } catch (error) {
            console.error('Error adding personality favorite:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to add personality favorite'
            };
        }
    }

    /**
     * Remove a personality from workspace favorites
     */
    public async removePersonalityFavorite(favoriteId: string): Promise<DeletePersonalityFavoriteResponse> {
        try {
            const connection = await this.dbManager.getConnection();
            const config = this.dbManager.getCurrentConfig();
            if (!connection || !config) {
                return {
                    success: false,
                    message: 'Database connection not available'
                };
            }

            switch (config.type) {
                case 'mongodb':
                    await connection.collection('workspace_personality_favorites').deleteOne({ id: favoriteId });
                    break;

                case 'mysql':
                case 'postgresql':
                    await connection.execute('DELETE FROM workspace_personality_favorites WHERE id = ?', [favoriteId]);
                    break;

                case 'localdb':
                    await new Promise<void>((resolve, reject) => {
                        connection.run('DELETE FROM workspace_personality_favorites WHERE id = ?', [favoriteId], (err: any) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                    break;

                case 'supabase':
                    const { error } = await connection
                        .from('workspace_personality_favorites')
                        .delete()
                        .eq('id', favoriteId);

                    if (error) throw new Error(`Supabase error: ${error.message}`);
                    break;

                default:
                    throw new Error(`Database type ${config.type} not supported`);
            }

            return {
                success: true,
                message: 'Personality removed from favorites successfully'
            };
        } catch (error) {
            console.error('Error removing personality favorite:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to remove personality favorite'
            };
        }
    }

    /**
     * Reorder personality favorites
     */
    public async reorderPersonalityFavorites(request: ReorderPersonalityFavoritesRequest): Promise<{ success: boolean; message: string }> {
        try {
            const connection = await this.dbManager.getConnection();
            const config = this.dbManager.getCurrentConfig();
            if (!connection || !config) {
                return {
                    success: false,
                    message: 'Database connection not available'
                };
            }

            // Update sort orders based on the new order
            for (let i = 0; i < request.favoriteIds.length; i++) {
                const favoriteId = request.favoriteIds[i];
                const newSortOrder = i;

                switch (config.type) {
                    case 'mongodb':
                        await connection.collection('workspace_personality_favorites').updateOne(
                            { id: favoriteId, workspaceId: request.workspaceId },
                            { $set: { sortOrder: newSortOrder, updatedAt: new Date() } }
                        );
                        break;

                    case 'mysql':
                    case 'postgresql':
                        await connection.execute(
                            'UPDATE workspace_personality_favorites SET sortOrder = ?, updatedAt = ? WHERE id = ? AND workspaceId = ?',
                            [newSortOrder, new Date(), favoriteId, request.workspaceId]
                        );
                        break;

                    case 'localdb':
                        await new Promise<void>((resolve, reject) => {
                            connection.run(
                                'UPDATE workspace_personality_favorites SET sortOrder = ?, updatedAt = ? WHERE id = ? AND workspaceId = ?',
                                [newSortOrder, new Date().toISOString(), favoriteId, request.workspaceId],
                                (err: any) => {
                                    if (err) reject(err);
                                    else resolve();
                                }
                            );
                        });
                        break;

                    case 'supabase':
                        const { error } = await connection
                            .from('workspace_personality_favorites')
                            .update({ sort_order: newSortOrder, updated_at: new Date() })
                            .eq('id', favoriteId)
                            .eq('workspace_id', request.workspaceId);

                        if (error) throw new Error(`Supabase error: ${error.message}`);
                        break;

                    default:
                        throw new Error(`Database type ${config.type} not supported`);
                }
            }

            return {
                success: true,
                message: 'Personality favorites reordered successfully'
            };
        } catch (error) {
            console.error('Error reordering personality favorites:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to reorder personality favorites'
            };
        }
    }

    // Helper methods
    private async createTableIfNotExists(connection: any, dbType: string): Promise<void> {
        switch (dbType) {
            case 'localdb':
                return new Promise<void>((resolve, reject) => {
                    connection.run(`
                        CREATE TABLE IF NOT EXISTS workspace_personality_favorites (
                            id TEXT PRIMARY KEY,
                            workspaceId TEXT NOT NULL,
                            personalityId TEXT NOT NULL,
                            sortOrder INTEGER NOT NULL DEFAULT 0,
                            createdAt TEXT NOT NULL,
                            updatedAt TEXT NOT NULL,
                            UNIQUE(workspaceId, personalityId)
                        )
                    `, (err: any) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

            case 'mongodb':
                // MongoDB doesn't need explicit table creation
                // Create index for better performance
                await connection.collection('workspace_personality_favorites').createIndex(
                    { workspaceId: 1, personalityId: 1 },
                    { unique: true }
                );
                break;

            case 'mysql':
                await connection.execute(`
                    CREATE TABLE IF NOT EXISTS workspace_personality_favorites (
                        id VARCHAR(36) PRIMARY KEY,
                        workspaceId VARCHAR(36) NOT NULL,
                        personalityId VARCHAR(36) NOT NULL,
                        sortOrder INT NOT NULL DEFAULT 0,
                        createdAt DATETIME NOT NULL,
                        updatedAt DATETIME NOT NULL,
                        UNIQUE KEY unique_workspace_personality (workspaceId, personalityId),
                        INDEX idx_workspace_sort (workspaceId, sortOrder)
                    )
                `);
                break;

            case 'postgresql':
                await connection.execute(`
                    CREATE TABLE IF NOT EXISTS workspace_personality_favorites (
                        id VARCHAR(36) PRIMARY KEY,
                        workspaceId VARCHAR(36) NOT NULL,
                        personalityId VARCHAR(36) NOT NULL,
                        sortOrder INTEGER NOT NULL DEFAULT 0,
                        createdAt TIMESTAMP NOT NULL,
                        updatedAt TIMESTAMP NOT NULL,
                        UNIQUE(workspaceId, personalityId)
                    );
                    CREATE INDEX IF NOT EXISTS idx_workspace_personality_favorites_workspace_sort
                    ON workspace_personality_favorites(workspaceId, sortOrder);
                `);
                break;

            case 'supabase':
                // Supabase table should be created manually or via migration
                break;

            default:
                throw new Error(`Database type ${dbType} not supported`);
        }
    }

    private async findExistingFavorite(connection: any, dbType: string, workspaceId: string, personalityId: string): Promise<boolean> {
        switch (dbType) {
            case 'mongodb':
                const mongoResult = await connection.collection('workspace_personality_favorites')
                    .findOne({ workspaceId, personalityId });
                return !!mongoResult;

            case 'mysql':
            case 'postgresql':
                const [rows] = await connection.execute(
                    'SELECT id FROM workspace_personality_favorites WHERE workspaceId = ? AND personalityId = ?',
                    [workspaceId, personalityId]
                );
                return (rows as any[]).length > 0;

            case 'localdb':
                return new Promise<boolean>((resolve, reject) => {
                    connection.get(
                        'SELECT id FROM workspace_personality_favorites WHERE workspaceId = ? AND personalityId = ?',
                        [workspaceId, personalityId],
                        (err: any, row: any) => {
                            if (err) reject(err);
                            else resolve(!!row);
                        }
                    );
                });

            case 'supabase':
                const { data, error } = await connection
                    .from('workspace_personality_favorites')
                    .select('id')
                    .eq('workspace_id', workspaceId)
                    .eq('personality_id', personalityId)
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
                const mongoResult = await connection.collection('workspace_personality_favorites')
                    .findOne({ workspaceId }, { sort: { sortOrder: -1 } });
                return mongoResult ? mongoResult.sortOrder + 1 : 0;

            case 'mysql':
            case 'postgresql':
                const [rows] = await connection.execute(
                    'SELECT MAX(sortOrder) as maxOrder FROM workspace_personality_favorites WHERE workspaceId = ?',
                    [workspaceId]
                );
                const maxOrder = (rows as any[])[0]?.maxOrder;
                return maxOrder !== null ? maxOrder + 1 : 0;

            case 'localdb':
                return new Promise<number>((resolve, reject) => {
                    connection.get(
                        'SELECT MAX(sortOrder) as maxOrder FROM workspace_personality_favorites WHERE workspaceId = ?',
                        [workspaceId],
                        (err: any, row: any) => {
                            if (err) reject(err);
                            else resolve(row?.maxOrder !== null ? row.maxOrder + 1 : 0);
                        }
                    );
                });

            case 'supabase':
                const { data, error } = await connection
                    .from('workspace_personality_favorites')
                    .select('sort_order')
                    .eq('workspace_id', workspaceId)
                    .order('sort_order', { ascending: false })
                    .limit(1)
                    .single();

                if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
                    throw new Error(`Supabase error: ${error.message}`);
                }
                return data ? data.sort_order + 1 : 0;

            default:
                throw new Error(`Database type ${dbType} not supported`);
        }
    }

    private async saveFavoriteToDatabase(connection: any, dbType: string, favorite: WorkspacePersonalityFavorite): Promise<void> {
        switch (dbType) {
            case 'mongodb':
                await connection.collection('workspace_personality_favorites').insertOne(favorite);
                break;

            case 'mysql':
            case 'postgresql':
                await connection.execute(`
                    INSERT INTO workspace_personality_favorites
                    (id, workspaceId, personalityId, sortOrder, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    favorite.id,
                    favorite.workspaceId,
                    favorite.personalityId,
                    favorite.sortOrder,
                    favorite.createdAt,
                    favorite.updatedAt
                ]);
                break;

            case 'localdb':
                await new Promise<void>((resolve, reject) => {
                    connection.run(`
                        INSERT INTO workspace_personality_favorites
                        (id, workspaceId, personalityId, sortOrder, createdAt, updatedAt)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [
                        favorite.id,
                        favorite.workspaceId,
                        favorite.personalityId,
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
                    .from('workspace_personality_favorites')
                    .insert({
                        id: favorite.id,
                        workspace_id: favorite.workspaceId,
                        personality_id: favorite.personalityId,
                        sort_order: favorite.sortOrder,
                        created_at: favorite.createdAt,
                        updated_at: favorite.updatedAt
                    });

                if (error) throw new Error(`Supabase error: ${error.message}`);
                break;

            default:
                throw new Error(`Database type ${dbType} not supported`);
        }
    }

    // Mapping functions
    private mapMongoToFavorite(doc: any): WorkspacePersonalityFavorite {
        return {
            id: doc.id,
            workspaceId: doc.workspaceId,
            personalityId: doc.personalityId,
            sortOrder: doc.sortOrder,
            createdAt: new Date(doc.createdAt),
            updatedAt: new Date(doc.updatedAt)
        };
    }

    private mapSQLToFavorite(row: any): WorkspacePersonalityFavorite {
        return {
            id: row.id,
            workspaceId: row.workspaceId,
            personalityId: row.personalityId,
            sortOrder: row.sortOrder,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt)
        };
    }

    private mapSQLiteToFavorite(row: any): WorkspacePersonalityFavorite {
        return {
            id: row.id,
            workspaceId: row.workspaceId,
            personalityId: row.personalityId,
            sortOrder: row.sortOrder,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt)
        };
    }

    private mapSupabaseToFavorite(row: any): WorkspacePersonalityFavorite {
        return {
            id: row.id,
            workspaceId: row.workspace_id,
            personalityId: row.personality_id,
            sortOrder: row.sort_order,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }
}
