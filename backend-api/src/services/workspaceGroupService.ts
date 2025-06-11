import { v4 as uuidv4 } from 'uuid';
import { DatabaseManager } from '../config/database';
import {
    WorkspaceGroup,
    CreateWorkspaceGroupRequest,
    UpdateWorkspaceGroupRequest,
    WorkspaceGroupResponse,
    WorkspaceGroupsResponse,
    ReorderGroupsRequest,
    MoveWorkspaceToGroupRequest
} from '../types/workspace-group';

export class WorkspaceGroupService {
    private static instance: WorkspaceGroupService;
    private dbManager: DatabaseManager;

    private constructor() {
        this.dbManager = DatabaseManager.getInstance();
    }

    public static getInstance(): WorkspaceGroupService {
        if (!WorkspaceGroupService.instance) {
            WorkspaceGroupService.instance = new WorkspaceGroupService();
        }
        return WorkspaceGroupService.instance;
    }

    /**
     * Create a new workspace group
     */
    public async createGroup(userId: string, request: CreateWorkspaceGroupRequest): Promise<WorkspaceGroupResponse> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            if (!connection) {
                throw new Error('Failed to get database connection');
            }

            // Get the next sort order if not provided
            let sortOrder = request.sortOrder;
            if (sortOrder === undefined) {
                sortOrder = await this.getNextSortOrder(userId);
            }

            const group: WorkspaceGroup = {
                id: uuidv4(),
                userId,
                name: request.name,
                sortOrder,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            switch (config.type) {
                case 'mongodb':
                    await connection.collection('workspace_groups').insertOne(group);
                    break;

                case 'mysql':
                case 'postgresql':
                    await this.createGroupTableIfNotExists(connection, config.type);
                    const query = `
                        INSERT INTO workspace_groups (id, userId, name, sortOrder, createdAt, updatedAt)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `;
                    await connection.execute(query, [
                        group.id,
                        group.userId,
                        group.name,
                        group.sortOrder,
                        group.createdAt.toISOString(),
                        group.updatedAt.toISOString()
                    ]);
                    break;

                case 'localdb':
                    await this.createGroupTableIfNotExistsSQLite(connection);
                    await new Promise<void>((resolve, reject) => {
                        connection.run(`
                            INSERT INTO workspace_groups (id, userId, name, sortOrder, createdAt, updatedAt)
                            VALUES (?, ?, ?, ?, ?, ?)
                        `, [
                            group.id,
                            group.userId,
                            group.name,
                            group.sortOrder,
                            group.createdAt.toISOString(),
                            group.updatedAt.toISOString()
                        ], (err: any) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                    break;

                case 'supabase':
                    const { error } = await connection
                        .from('workspace_groups')
                        .insert([{
                            id: group.id,
                            user_id: group.userId,
                            name: group.name,
                            sort_order: group.sortOrder,
                            created_at: group.createdAt.toISOString(),
                            updated_at: group.updatedAt.toISOString()
                        }]);

                    if (error) {
                        throw new Error(`Supabase error: ${error.message}`);
                    }
                    break;

                default:
                    throw new Error(`Database type ${config.type} not supported for workspace group operations`);
            }

            return {
                success: true,
                message: 'Workspace group created successfully',
                group: {
                    id: group.id,
                    name: group.name,
                    sortOrder: group.sortOrder,
                    createdAt: group.createdAt.toISOString()
                }
            };

        } catch (error) {
            console.error('Error creating workspace group:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to create workspace group'
            };
        }
    }

    /**
     * Get user's workspace groups
     */
    public async getUserGroups(userId: string): Promise<WorkspaceGroupsResponse> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            if (!connection) {
                throw new Error('Failed to get database connection');
            }

            let groups: any[] = [];

            switch (config.type) {
                case 'mongodb':
                    // Get groups with workspace count
                    const pipeline = [
                        { $match: { userId } },
                        {
                            $lookup: {
                                from: 'workspaces',
                                localField: 'id',
                                foreignField: 'groupId',
                                as: 'workspaces'
                            }
                        },
                        {
                            $project: {
                                id: 1,
                                name: 1,
                                sortOrder: 1,
                                createdAt: 1,
                                workspaceCount: { $size: '$workspaces' }
                            }
                        },
                        { $sort: { sortOrder: 1 } }
                    ];
                    groups = await connection.collection('workspace_groups').aggregate(pipeline).toArray();
                    break;

                case 'mysql':
                case 'postgresql':
                    await this.createGroupTableIfNotExists(connection, config.type);
                    const query = `
                        SELECT 
                            wg.id, wg.name, wg.sortOrder, wg.createdAt,
                            COUNT(w.id) as workspaceCount
                        FROM workspace_groups wg
                        LEFT JOIN workspaces w ON wg.id = w.groupId
                        WHERE wg.userId = ?
                        GROUP BY wg.id, wg.name, wg.sortOrder, wg.createdAt
                        ORDER BY wg.sortOrder ASC
                    `;
                    const [rows] = await connection.execute(query, [userId]);
                    groups = rows as any[];
                    break;

                case 'localdb':
                    await this.createGroupTableIfNotExistsSQLite(connection);
                    groups = await new Promise<any[]>((resolve, reject) => {
                        connection.all(`
                            SELECT 
                                wg.id, wg.name, wg.sortOrder, wg.createdAt,
                                COUNT(w.id) as workspaceCount
                            FROM workspace_groups wg
                            LEFT JOIN workspaces w ON wg.id = w.groupId
                            WHERE wg.userId = ?
                            GROUP BY wg.id, wg.name, wg.sortOrder, wg.createdAt
                            ORDER BY wg.sortOrder ASC
                        `, [userId], (err: any, rows: any[]) => {
                            if (err) reject(err);
                            else resolve(rows || []);
                        });
                    });
                    break;

                case 'supabase':
                    const { data, error } = await connection
                        .from('workspace_groups')
                        .select(`
                            id,
                            name,
                            sort_order,
                            created_at,
                            workspaces!workspace_groups_id_fkey(count)
                        `)
                        .eq('user_id', userId)
                        .order('sort_order', { ascending: true });

                    if (error) {
                        throw new Error(`Supabase error: ${error.message}`);
                    }

                    groups = (data || []).map((group: any) => ({
                        id: group.id,
                        name: group.name,
                        sortOrder: group.sort_order,
                        createdAt: group.created_at,
                        workspaceCount: group.workspaces?.length || 0
                    }));
                    break;

                default:
                    throw new Error(`Database type ${config.type} not supported for workspace group operations`);
            }

            return {
                success: true,
                message: 'Groups retrieved successfully',
                groups: groups.map(group => ({
                    id: group.id,
                    name: group.name,
                    sortOrder: group.sortOrder || 0,
                    createdAt: group.createdAt,
                    workspaceCount: group.workspaceCount || 0
                }))
            };

        } catch (error) {
            console.error('Error getting user groups:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to get groups',
                groups: []
            };
        }
    }

    /**
     * Get next sort order for a user's groups
     */
    private async getNextSortOrder(userId: string): Promise<number> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                return 0;
            }

            const connection = await this.dbManager.getConnection();
            if (!connection) {
                return 0;
            }

            let maxOrder = 0;

            switch (config.type) {
                case 'mongodb':
                    const result = await connection.collection('workspace_groups')
                        .findOne(
                            { userId },
                            { sort: { sortOrder: -1 } }
                        );
                    maxOrder = result?.sortOrder || 0;
                    break;

                case 'mysql':
                case 'postgresql':
                    const query = 'SELECT MAX(sortOrder) as maxOrder FROM workspace_groups WHERE userId = ?';
                    const [rows] = await connection.execute(query, [userId]);
                    maxOrder = (rows as any[])[0]?.maxOrder || 0;
                    break;

                case 'localdb':
                    maxOrder = await new Promise<number>((resolve, reject) => {
                        connection.get(
                            'SELECT MAX(sortOrder) as maxOrder FROM workspace_groups WHERE userId = ?',
                            [userId],
                            (err: any, row: any) => {
                                if (err) reject(err);
                                else resolve(row?.maxOrder || 0);
                            }
                        );
                    });
                    break;

                case 'supabase':
                    const { data, error } = await connection
                        .from('workspace_groups')
                        .select('sort_order')
                        .eq('user_id', userId)
                        .order('sort_order', { ascending: false })
                        .limit(1);

                    if (!error && data && data.length > 0) {
                        maxOrder = data[0].sort_order || 0;
                    }
                    break;
            }

            return maxOrder + 1;

        } catch (error) {
            console.error('Error getting next sort order:', error);
            return 0;
        }
    }

    /**
     * Update workspace group
     */
    public async updateGroup(userId: string, groupId: string, request: UpdateWorkspaceGroupRequest): Promise<WorkspaceGroupResponse> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            if (!connection) {
                throw new Error('Failed to get database connection');
            }

            const updatedAt = new Date();

            switch (config.type) {
                case 'mongodb':
                    const updateDoc: any = { updatedAt };
                    if (request.name !== undefined) updateDoc.name = request.name;
                    if (request.sortOrder !== undefined) updateDoc.sortOrder = request.sortOrder;

                    await connection.collection('workspace_groups').updateOne(
                        { id: groupId, userId },
                        { $set: updateDoc }
                    );
                    break;

                case 'mysql':
                case 'postgresql':
                    const setParts: string[] = ['updatedAt = ?'];
                    const values: any[] = [updatedAt.toISOString()];

                    if (request.name !== undefined) {
                        setParts.push('name = ?');
                        values.push(request.name);
                    }
                    if (request.sortOrder !== undefined) {
                        setParts.push('sortOrder = ?');
                        values.push(request.sortOrder);
                    }

                    values.push(groupId, userId);

                    const query = `UPDATE workspace_groups SET ${setParts.join(', ')} WHERE id = ? AND userId = ?`;
                    await connection.execute(query, values);
                    break;

                case 'localdb':
                    const setPartsLite: string[] = ['updatedAt = ?'];
                    const valuesLite: any[] = [updatedAt.toISOString()];

                    if (request.name !== undefined) {
                        setPartsLite.push('name = ?');
                        valuesLite.push(request.name);
                    }
                    if (request.sortOrder !== undefined) {
                        setPartsLite.push('sortOrder = ?');
                        valuesLite.push(request.sortOrder);
                    }

                    valuesLite.push(groupId, userId);

                    await new Promise<void>((resolve, reject) => {
                        connection.run(
                            `UPDATE workspace_groups SET ${setPartsLite.join(', ')} WHERE id = ? AND userId = ?`,
                            valuesLite,
                            (err: any) => {
                                if (err) reject(err);
                                else resolve();
                            }
                        );
                    });
                    break;

                case 'supabase':
                    const updateData: any = { updated_at: updatedAt.toISOString() };
                    if (request.name !== undefined) updateData.name = request.name;
                    if (request.sortOrder !== undefined) updateData.sort_order = request.sortOrder;

                    const { error } = await connection
                        .from('workspace_groups')
                        .update(updateData)
                        .eq('id', groupId)
                        .eq('user_id', userId);

                    if (error) {
                        throw new Error(`Supabase error: ${error.message}`);
                    }
                    break;

                default:
                    throw new Error(`Database type ${config.type} not supported for workspace group operations`);
            }

            return {
                success: true,
                message: 'Workspace group updated successfully'
            };

        } catch (error) {
            console.error('Error updating workspace group:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to update workspace group'
            };
        }
    }

    /**
     * Delete workspace group
     */
    public async deleteGroup(userId: string, groupId: string): Promise<WorkspaceGroupResponse> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            if (!connection) {
                throw new Error('Failed to get database connection');
            }

            // First, move all workspaces in this group to ungrouped
            await this.moveWorkspacesToUngrouped(userId, groupId);

            switch (config.type) {
                case 'mongodb':
                    await connection.collection('workspace_groups').deleteOne({ id: groupId, userId });
                    break;

                case 'mysql':
                case 'postgresql':
                    const query = 'DELETE FROM workspace_groups WHERE id = ? AND userId = ?';
                    await connection.execute(query, [groupId, userId]);
                    break;

                case 'localdb':
                    await new Promise<void>((resolve, reject) => {
                        connection.run(
                            'DELETE FROM workspace_groups WHERE id = ? AND userId = ?',
                            [groupId, userId],
                            (err: any) => {
                                if (err) reject(err);
                                else resolve();
                            }
                        );
                    });
                    break;

                case 'supabase':
                    const { error } = await connection
                        .from('workspace_groups')
                        .delete()
                        .eq('id', groupId)
                        .eq('user_id', userId);

                    if (error) {
                        throw new Error(`Supabase error: ${error.message}`);
                    }
                    break;

                default:
                    throw new Error(`Database type ${config.type} not supported for workspace group operations`);
            }

            return {
                success: true,
                message: 'Workspace group deleted successfully'
            };

        } catch (error) {
            console.error('Error deleting workspace group:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to delete workspace group'
            };
        }
    }

    /**
     * Delete workspace group and all workspaces inside it
     */
    public async deleteGroupWithWorkspaces(userId: string, groupId: string): Promise<WorkspaceGroupResponse> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            if (!connection) {
                throw new Error('Failed to get database connection');
            }

            // First, delete all workspaces in this group
            await this.deleteWorkspacesInGroup(userId, groupId);

            // Then delete the group itself
            switch (config.type) {
                case 'mongodb':
                    await connection.collection('workspace_groups').deleteOne({ id: groupId, userId });
                    break;

                case 'mysql':
                case 'postgresql':
                    const query = 'DELETE FROM workspace_groups WHERE id = ? AND userId = ?';
                    await connection.execute(query, [groupId, userId]);
                    break;

                case 'localdb':
                    await new Promise<void>((resolve, reject) => {
                        connection.run(
                            'DELETE FROM workspace_groups WHERE id = ? AND userId = ?',
                            [groupId, userId],
                            (err: any) => {
                                if (err) reject(err);
                                else resolve();
                            }
                        );
                    });
                    break;

                case 'supabase':
                    const { error } = await connection
                        .from('workspace_groups')
                        .delete()
                        .eq('id', groupId)
                        .eq('user_id', userId);

                    if (error) {
                        throw new Error(`Supabase error: ${error.message}`);
                    }
                    break;

                default:
                    throw new Error(`Database type ${config.type} not supported for workspace group operations`);
            }

            return {
                success: true,
                message: 'Workspace group and all workspaces deleted successfully'
            };

        } catch (error) {
            console.error('Error deleting workspace group with workspaces:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to delete workspace group with workspaces'
            };
        }
    }

    /**
     * Reorder groups
     */
    public async reorderGroups(userId: string, request: ReorderGroupsRequest): Promise<WorkspaceGroupResponse> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            if (!connection) {
                throw new Error('Failed to get database connection');
            }

            const updatedAt = new Date();

            // Update each group's sort order
            for (const groupOrder of request.groupOrders) {
                switch (config.type) {
                    case 'mongodb':
                        await connection.collection('workspace_groups').updateOne(
                            { id: groupOrder.groupId, userId },
                            { $set: { sortOrder: groupOrder.sortOrder, updatedAt } }
                        );
                        break;

                    case 'mysql':
                    case 'postgresql':
                        const query = 'UPDATE workspace_groups SET sortOrder = ?, updatedAt = ? WHERE id = ? AND userId = ?';
                        await connection.execute(query, [
                            groupOrder.sortOrder,
                            updatedAt.toISOString(),
                            groupOrder.groupId,
                            userId
                        ]);
                        break;

                    case 'localdb':
                        await new Promise<void>((resolve, reject) => {
                            connection.run(
                                'UPDATE workspace_groups SET sortOrder = ?, updatedAt = ? WHERE id = ? AND userId = ?',
                                [groupOrder.sortOrder, updatedAt.toISOString(), groupOrder.groupId, userId],
                                (err: any) => {
                                    if (err) reject(err);
                                    else resolve();
                                }
                            );
                        });
                        break;

                    case 'supabase':
                        const { error } = await connection
                            .from('workspace_groups')
                            .update({
                                sort_order: groupOrder.sortOrder,
                                updated_at: updatedAt.toISOString()
                            })
                            .eq('id', groupOrder.groupId)
                            .eq('user_id', userId);

                        if (error) {
                            throw new Error(`Supabase error: ${error.message}`);
                        }
                        break;

                    default:
                        throw new Error(`Database type ${config.type} not supported for workspace group operations`);
                }
            }

            return {
                success: true,
                message: 'Groups reordered successfully'
            };

        } catch (error) {
            console.error('Error reordering groups:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to reorder groups'
            };
        }
    }

    /**
     * Move workspaces to ungrouped when deleting a group
     */
    private async moveWorkspacesToUngrouped(userId: string, groupId: string): Promise<void> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                return;
            }

            const connection = await this.dbManager.getConnection();
            if (!connection) {
                return;
            }

            const updatedAt = new Date();

            switch (config.type) {
                case 'mongodb':
                    await connection.collection('workspaces').updateMany(
                        { userId, groupId },
                        { $set: { groupId: null, updatedAt } }
                    );
                    break;

                case 'mysql':
                case 'postgresql':
                    const query = 'UPDATE workspaces SET groupId = NULL, updatedAt = ? WHERE userId = ? AND groupId = ?';
                    await connection.execute(query, [updatedAt.toISOString(), userId, groupId]);
                    break;

                case 'localdb':
                    await new Promise<void>((resolve, reject) => {
                        connection.run(
                            'UPDATE workspaces SET groupId = NULL, updatedAt = ? WHERE userId = ? AND groupId = ?',
                            [updatedAt.toISOString(), userId, groupId],
                            (err: any) => {
                                if (err) reject(err);
                                else resolve();
                            }
                        );
                    });
                    break;

                case 'supabase':
                    const { error } = await connection
                        .from('workspaces')
                        .update({
                            group_id: null,
                            updated_at: updatedAt.toISOString()
                        })
                        .eq('user_id', userId)
                        .eq('group_id', groupId);

                    if (error) {
                        throw new Error(`Supabase error: ${error.message}`);
                    }
                    break;
            }

        } catch (error) {
            console.error('Error moving workspaces to ungrouped:', error);
        }
    }

    /**
     * Delete all workspaces in a group
     */
    private async deleteWorkspacesInGroup(userId: string, groupId: string): Promise<void> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                return;
            }

            const connection = await this.dbManager.getConnection();
            if (!connection) {
                return;
            }

            switch (config.type) {
                case 'mongodb':
                    await connection.collection('workspaces').deleteMany({ userId, groupId });
                    break;

                case 'mysql':
                case 'postgresql':
                    const query = 'DELETE FROM workspaces WHERE userId = ? AND groupId = ?';
                    await connection.execute(query, [userId, groupId]);
                    break;

                case 'localdb':
                    await new Promise<void>((resolve, reject) => {
                        connection.run(
                            'DELETE FROM workspaces WHERE userId = ? AND groupId = ?',
                            [userId, groupId],
                            (err: any) => {
                                if (err) reject(err);
                                else resolve();
                            }
                        );
                    });
                    break;

                case 'supabase':
                    const { error } = await connection
                        .from('workspaces')
                        .delete()
                        .eq('user_id', userId)
                        .eq('group_id', groupId);

                    if (error) {
                        throw new Error(`Supabase error: ${error.message}`);
                    }
                    break;
            }

        } catch (error) {
            console.error('Error deleting workspaces in group:', error);
        }
    }

    // Helper methods for database table creation
    private async createGroupTableIfNotExists(connection: any, dbType: string): Promise<void> {
        const createTableQuery = dbType === 'mysql' ? `
            CREATE TABLE IF NOT EXISTS workspace_groups (
                id VARCHAR(36) PRIMARY KEY,
                userId VARCHAR(36) NOT NULL,
                name VARCHAR(255) NOT NULL,
                sortOrder INT NOT NULL DEFAULT 0,
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL,
                INDEX idx_userId (userId),
                INDEX idx_sortOrder (sortOrder)
            )
        ` : `
            CREATE TABLE IF NOT EXISTS workspace_groups (
                id VARCHAR(36) PRIMARY KEY,
                userId VARCHAR(36) NOT NULL,
                name VARCHAR(255) NOT NULL,
                sortOrder INTEGER NOT NULL DEFAULT 0,
                createdAt TIMESTAMP NOT NULL,
                updatedAt TIMESTAMP NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_workspace_groups_userId ON workspace_groups(userId);
            CREATE INDEX IF NOT EXISTS idx_workspace_groups_sortOrder ON workspace_groups(sortOrder);
        `;

        await connection.execute(createTableQuery);
    }

    private async createGroupTableIfNotExistsSQLite(connection: any): Promise<void> {
        await new Promise<void>((resolve, reject) => {
            connection.run(`
                CREATE TABLE IF NOT EXISTS workspace_groups (
                    id TEXT PRIMARY KEY,
                    userId TEXT NOT NULL,
                    name TEXT NOT NULL,
                    sortOrder INTEGER NOT NULL DEFAULT 0,
                    createdAt TEXT NOT NULL,
                    updatedAt TEXT NOT NULL
                )
            `, (err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Create indexes
        await new Promise<void>((resolve, reject) => {
            connection.run(`
                CREATE INDEX IF NOT EXISTS idx_workspace_groups_userId ON workspace_groups(userId)
            `, (err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });

        await new Promise<void>((resolve, reject) => {
            connection.run(`
                CREATE INDEX IF NOT EXISTS idx_workspace_groups_sortOrder ON workspace_groups(sortOrder)
            `, (err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}
