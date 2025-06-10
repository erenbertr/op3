import { DatabaseManager } from '../config/database';
import {
    Workspace,
    CreateWorkspaceRequest,
    CreateWorkspaceResponse,
    WorkspaceStatusResponse,
    WorkspaceListResponse,
    UpdateWorkspaceRequest,
    WorkspaceUpdateResponse,
    WorkspaceDeleteResponse
} from '../types/workspace';
import { v4 as uuidv4 } from 'uuid';

export class WorkspaceService {
    private static instance: WorkspaceService;
    private dbManager: DatabaseManager;

    private constructor() {
        this.dbManager = DatabaseManager.getInstance();
    }

    public static getInstance(): WorkspaceService {
        if (!WorkspaceService.instance) {
            WorkspaceService.instance = new WorkspaceService();
        }
        return WorkspaceService.instance;
    }

    /**
     * Create a new workspace for a user
     */
    public async createWorkspace(userId: string, request: CreateWorkspaceRequest): Promise<CreateWorkspaceResponse> {

        try {
            // Get existing workspaces to determine if this should be the active one
            const existingWorkspaces = await this.getUserWorkspaces(userId);
            const isFirstWorkspace = existingWorkspaces.workspaces.length === 0;

            // If this is the first workspace, make it active
            // If not, deactivate all existing workspaces and make this one active
            if (!isFirstWorkspace) {
                await this.deactivateAllWorkspaces(userId);
            }

            const workspace: Workspace = {
                id: uuidv4(),
                userId,
                name: request.name,
                templateType: request.templateType,
                workspaceRules: request.workspaceRules,
                isActive: true, // New workspaces are always set as active
                groupId: null, // New workspaces start ungrouped
                sortOrder: 0, // Will be updated if needed
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();

            switch (config.type) {
                case 'mongodb':
                    await connection.collection('workspaces').insertOne(workspace);
                    break;

                case 'mysql':
                case 'postgresql':
                    await this.createWorkspaceTableIfNotExists(connection, config.type);
                    const query = `
                        INSERT INTO workspaces (id, userId, name, templateType, workspaceRules, isActive, groupId, sortOrder, createdAt, updatedAt)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                    await connection.execute(query, [
                        workspace.id,
                        workspace.userId,
                        workspace.name,
                        workspace.templateType,
                        workspace.workspaceRules,
                        workspace.isActive,
                        workspace.groupId,
                        workspace.sortOrder,
                        workspace.createdAt.toISOString(),
                        workspace.updatedAt.toISOString()
                    ]);
                    break;

                case 'localdb':
                    await this.createWorkspaceTableIfNotExistsSQLite(connection);
                    await new Promise<void>((resolve, reject) => {
                        connection.run(`
                            INSERT INTO workspaces (id, userId, name, templateType, workspaceRules, isActive, groupId, sortOrder, createdAt, updatedAt)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            workspace.id,
                            workspace.userId,
                            workspace.name,
                            workspace.templateType,
                            workspace.workspaceRules,
                            workspace.isActive ? 1 : 0,
                            workspace.groupId,
                            workspace.sortOrder,
                            workspace.createdAt.toISOString(),
                            workspace.updatedAt.toISOString()
                        ], (err: any) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                    break;

                case 'supabase':
                    const { error } = await connection
                        .from('workspaces')
                        .insert([{
                            id: workspace.id,
                            user_id: workspace.userId,
                            name: workspace.name,
                            template_type: workspace.templateType,
                            workspace_rules: workspace.workspaceRules,
                            is_active: workspace.isActive,
                            group_id: workspace.groupId,
                            sort_order: workspace.sortOrder,
                            created_at: workspace.createdAt.toISOString(),
                            updated_at: workspace.updatedAt.toISOString()
                        }]);

                    if (error) {
                        throw new Error(`Supabase error: ${error.message}`);
                    }
                    break;

                default:
                    throw new Error(`Database type ${config.type} not supported for workspace operations`);
            }

            return {
                success: true,
                message: 'Workspace created successfully',
                workspace: {
                    id: workspace.id,
                    name: workspace.name,
                    templateType: workspace.templateType,
                    workspaceRules: workspace.workspaceRules,
                    isActive: workspace.isActive,
                    createdAt: workspace.createdAt.toISOString()
                }
            };

        } catch (error) {
            console.error('Error creating workspace:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to create workspace'
            };
        }
    }

    /**
     * Get user's workspace
     */
    public async getUserWorkspace(userId: string): Promise<WorkspaceStatusResponse> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            let workspace: Workspace | null = null;

            switch (config.type) {
                case 'mongodb':
                    const mongoWorkspace = await connection.collection('workspaces').findOne({ userId, isActive: true });
                    workspace = mongoWorkspace ? this.mapMongoWorkspace(mongoWorkspace) : null;
                    break;

                case 'mysql':
                case 'postgresql':
                    const query = 'SELECT * FROM workspaces WHERE userId = ? AND isActive = ? LIMIT 1';
                    const [rows] = await connection.execute(query, [userId, true]);
                    workspace = rows.length > 0 ? this.mapSQLWorkspace(rows[0]) : null;
                    break;

                case 'localdb':
                    workspace = await new Promise((resolve, reject) => {
                        connection.get('SELECT * FROM workspaces WHERE userId = ? AND isActive = ? LIMIT 1', [userId, 1], (err: any, row: any) => {
                            if (err) {
                                // If table doesn't exist, return null
                                if (err.code === 'SQLITE_ERROR' && err.message.includes('no such table')) {
                                    resolve(null);
                                } else {
                                    reject(err);
                                }
                            } else {
                                resolve(row ? this.mapSQLWorkspace(row) : null);
                            }
                        });
                    });
                    break;

                case 'supabase':
                    const { data, error } = await connection
                        .from('workspaces')
                        .select('*')
                        .eq('user_id', userId)
                        .eq('is_active', true)
                        .single();

                    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
                        throw new Error(`Supabase error: ${error.message}`);
                    }

                    workspace = data ? this.mapSupabaseWorkspace(data) : null;
                    break;

                default:
                    throw new Error(`Database type ${config.type} not supported for workspace operations`);
            }

            return {
                success: true,
                hasWorkspace: !!workspace,
                workspace: workspace ? {
                    id: workspace.id,
                    name: workspace.name,
                    templateType: workspace.templateType,
                    workspaceRules: workspace.workspaceRules,
                    isActive: workspace.isActive,
                    createdAt: workspace.createdAt.toISOString()
                } : undefined
            };

        } catch (error) {
            console.error('Error getting user workspace:', error);
            return {
                success: false,
                hasWorkspace: false
            };
        }
    }

    /**
     * Get all workspaces for a user
     */
    public async getUserWorkspaces(userId: string): Promise<WorkspaceListResponse> {


        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            let workspaces: Workspace[] = [];

            switch (config.type) {
                case 'mongodb':
                    const mongoWorkspaces = await connection.collection('workspaces')
                        .find({ userId })
                        .sort({ groupId: 1, sortOrder: 1, createdAt: 1 })
                        .toArray();
                    workspaces = mongoWorkspaces.map((doc: any) => this.mapMongoWorkspace(doc));
                    break;

                case 'mysql':
                case 'postgresql':
                    const query = 'SELECT * FROM workspaces WHERE userId = ? ORDER BY groupId ASC, sortOrder ASC, createdAt ASC';
                    const [rows] = await connection.execute(query, [userId]);
                    workspaces = rows.map((row: any) => this.mapSQLWorkspace(row));
                    break;

                case 'localdb':
                    workspaces = await new Promise((resolve, reject) => {
                        connection.all('SELECT * FROM workspaces WHERE userId = ? ORDER BY groupId ASC, sortOrder ASC, createdAt ASC', [userId], (err: any, rows: any[]) => {
                            if (err) {
                                // If table doesn't exist, return empty array
                                if (err.code === 'SQLITE_ERROR' && err.message.includes('no such table')) {
                                    resolve([]);
                                } else {
                                    reject(err);
                                }
                            } else {
                                resolve(rows ? rows.map(row => this.mapSQLWorkspace(row)) : []);
                            }
                        });
                    });
                    break;

                case 'supabase':
                    const { data, error } = await connection
                        .from('workspaces')
                        .select('*')
                        .eq('user_id', userId)
                        .order('group_id', { ascending: true })
                        .order('sort_order', { ascending: true })
                        .order('created_at', { ascending: true });

                    if (error) {
                        throw new Error(`Supabase error: ${error.message}`);
                    }

                    workspaces = data ? data.map((item: any) => this.mapSupabaseWorkspace(item)) : [];
                    break;

                default:
                    throw new Error(`Database type ${config.type} not supported for workspace operations`);
            }

            return {
                success: true,
                workspaces: workspaces.map(workspace => ({
                    id: workspace.id,
                    name: workspace.name,
                    templateType: workspace.templateType,
                    workspaceRules: workspace.workspaceRules,
                    isActive: workspace.isActive,
                    groupId: workspace.groupId,
                    sortOrder: workspace.sortOrder,
                    createdAt: workspace.createdAt.toISOString()
                }))
            };

        } catch (error) {
            console.error('Error getting user workspaces:', error);
            return {
                success: true,
                workspaces: []
            };
        }
    }

    /**
     * Update a workspace
     */
    public async updateWorkspace(workspaceId: string, userId: string, request: UpdateWorkspaceRequest): Promise<WorkspaceUpdateResponse> {
        try {
            console.log('🔧 UpdateWorkspace called:', { workspaceId, userId, request });

            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            const updatedAt = new Date();

            // If we're updating sortOrder or groupId, we need to handle reordering
            if (request.sortOrder !== undefined || request.groupId !== undefined) {
                await this.handleWorkspaceReordering(workspaceId, userId, request, connection, config);
            } else {
                // Simple update without reordering
                switch (config.type) {
                    case 'mongodb':
                        const updateDoc: any = { updatedAt };
                        if (request.name !== undefined) updateDoc.name = request.name;
                        if (request.workspaceRules !== undefined) updateDoc.workspaceRules = request.workspaceRules;

                        await connection.collection('workspaces').updateOne(
                            { id: workspaceId, userId },
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
                        if (request.workspaceRules !== undefined) {
                            setParts.push('workspaceRules = ?');
                            values.push(request.workspaceRules);
                        }
                        if (request.groupId !== undefined) {
                            setParts.push('groupId = ?');
                            values.push(request.groupId);
                        }
                        if (request.sortOrder !== undefined) {
                            setParts.push('sortOrder = ?');
                            values.push(request.sortOrder);
                        }

                        values.push(workspaceId, userId);
                        const updateQuery = `UPDATE workspaces SET ${setParts.join(', ')} WHERE id = ? AND userId = ?`;
                        await connection.execute(updateQuery, values);
                        break;

                    case 'localdb':
                        const sqliteParts: string[] = ['updatedAt = ?'];
                        const sqliteValues: any[] = [updatedAt.toISOString()];

                        if (request.name !== undefined) {
                            sqliteParts.push('name = ?');
                            sqliteValues.push(request.name);
                        }
                        if (request.workspaceRules !== undefined) {
                            sqliteParts.push('workspaceRules = ?');
                            sqliteValues.push(request.workspaceRules);
                        }
                        if (request.groupId !== undefined) {
                            sqliteParts.push('groupId = ?');
                            sqliteValues.push(request.groupId);
                        }
                        if (request.sortOrder !== undefined) {
                            sqliteParts.push('sortOrder = ?');
                            sqliteValues.push(request.sortOrder);
                        }

                        sqliteValues.push(workspaceId, userId);
                        await new Promise<void>((resolve, reject) => {
                            connection.run(
                                `UPDATE workspaces SET ${sqliteParts.join(', ')} WHERE id = ? AND userId = ?`,
                                sqliteValues,
                                (err: any) => {
                                    if (err) reject(err);
                                    else resolve();
                                }
                            );
                        });
                        break;

                    case 'supabase':
                        const supabaseUpdate: any = { updated_at: updatedAt.toISOString() };
                        if (request.name !== undefined) supabaseUpdate.name = request.name;
                        if (request.workspaceRules !== undefined) supabaseUpdate.workspace_rules = request.workspaceRules;
                        if (request.groupId !== undefined) supabaseUpdate.group_id = request.groupId;
                        if (request.sortOrder !== undefined) supabaseUpdate.sort_order = request.sortOrder;

                        const { error } = await connection
                            .from('workspaces')
                            .update(supabaseUpdate)
                            .eq('id', workspaceId)
                            .eq('user_id', userId);

                        if (error) {
                            throw new Error(`Supabase error: ${error.message}`);
                        }
                        break;

                    default:
                        throw new Error(`Database type ${config.type} not supported for workspace operations`);
                }
            }

            // Get the updated workspace for both cases
            const updatedWorkspace = await this.getWorkspaceById(workspaceId, userId);
            if (!updatedWorkspace) {
                throw new Error('Workspace not found after update');
            }

            return {
                success: true,
                message: 'Workspace updated successfully',
                workspace: {
                    id: updatedWorkspace.id,
                    name: updatedWorkspace.name,
                    templateType: updatedWorkspace.templateType,
                    workspaceRules: updatedWorkspace.workspaceRules,
                    isActive: updatedWorkspace.isActive,
                    createdAt: updatedWorkspace.createdAt.toISOString()
                }
            };

        } catch (error) {
            console.error('Error updating workspace:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to update workspace'
            };
        }
    }

    /**
     * Handle workspace reordering when sortOrder or groupId changes
     */
    private async handleWorkspaceReordering(
        workspaceId: string,
        userId: string,
        request: UpdateWorkspaceRequest,
        connection: any,
        config: any
    ): Promise<void> {
        const updatedAt = new Date();

        // Get the current workspace to know its current position
        let currentWorkspace: any;

        switch (config.type) {
            case 'mongodb':
                currentWorkspace = await connection.collection('workspaces').findOne({ id: workspaceId, userId });
                break;
            case 'mysql':
            case 'postgresql':
                const [rows] = await connection.execute('SELECT * FROM workspaces WHERE id = ? AND userId = ?', [workspaceId, userId]);
                currentWorkspace = rows[0];
                break;
            case 'localdb':
                currentWorkspace = await new Promise((resolve, reject) => {
                    connection.get('SELECT * FROM workspaces WHERE id = ? AND userId = ?', [workspaceId, userId], (err: any, row: any) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });
                break;
            case 'supabase':
                const { data, error } = await connection.from('workspaces').select('*').eq('id', workspaceId).eq('user_id', userId).single();
                if (error) throw error;
                currentWorkspace = data;
                break;
        }

        if (!currentWorkspace) {
            throw new Error('Workspace not found');
        }

        const oldGroupId = currentWorkspace.groupId || null;
        const newGroupId = request.groupId !== undefined ? request.groupId : oldGroupId;
        const newSortOrder = request.sortOrder !== undefined ? request.sortOrder : currentWorkspace.sortOrder || 0;

        // Update the moved workspace first
        const updateDoc: any = { updatedAt };
        if (request.name !== undefined) updateDoc.name = request.name;
        if (request.workspaceRules !== undefined) updateDoc.workspaceRules = request.workspaceRules;
        updateDoc.groupId = newGroupId;
        updateDoc.sortOrder = newSortOrder;



        switch (config.type) {
            case 'mongodb':
                await connection.collection('workspaces').updateOne(
                    { id: workspaceId, userId },
                    { $set: updateDoc }
                );

                // If moving between groups or changing sort order, reorder other workspaces
                if (oldGroupId !== newGroupId || request.sortOrder !== undefined) {
                    await this.reorderWorkspacesInGroup(userId, newGroupId, connection, config, workspaceId, newSortOrder);

                    // If moving between groups, also reorder the old group
                    if (oldGroupId !== newGroupId) {
                        await this.reorderWorkspacesInGroup(userId, oldGroupId, connection, config);
                    }
                }
                break;

            // Add other database types as needed
            default:
                throw new Error(`Database type ${config.type} not supported for workspace reordering`);
        }
    }

    /**
     * Reorder workspaces in a group to maintain sequential sortOrder
     */
    private async reorderWorkspacesInGroup(
        userId: string,
        groupId: string | null,
        connection: any,
        config: any,
        excludeWorkspaceId?: string,
        insertAtIndex?: number
    ): Promise<void> {
        switch (config.type) {
            case 'mongodb':
                // Get all workspaces in the group (excluding the moved one)
                const filter: any = { userId };
                if (groupId) {
                    filter.groupId = groupId;
                } else {
                    filter.$or = [{ groupId: null }, { groupId: { $exists: false } }];
                }

                if (excludeWorkspaceId) {
                    filter.id = { $ne: excludeWorkspaceId };
                }

                const workspaces = await connection.collection('workspaces')
                    .find(filter)
                    .sort({ sortOrder: 1 })
                    .toArray();

                // Reorder all workspaces to have sequential sortOrder values
                const bulkOps = [];
                let currentIndex = 0;

                for (const workspace of workspaces) {
                    // If we need to insert at a specific index, skip that position
                    if (insertAtIndex !== undefined && currentIndex === insertAtIndex) {
                        currentIndex++;
                    }

                    if (workspace.sortOrder !== currentIndex) {
                        bulkOps.push({
                            updateOne: {
                                filter: { id: workspace.id, userId },
                                update: { $set: { sortOrder: currentIndex, updatedAt: new Date() } }
                            }
                        });
                    }
                    currentIndex++;
                }

                if (bulkOps.length > 0) {
                    await connection.collection('workspaces').bulkWrite(bulkOps);
                }
                break;
        }
    }

    /**
     * Batch update workspaces (for reordering)
     */
    public async batchUpdateWorkspaces(
        userId: string,
        updates: Array<{ workspaceId: string; groupId: string | null; sortOrder: number }>
    ): Promise<{ success: boolean; message?: string }> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            const updatedAt = new Date();

            switch (config.type) {
                case 'mongodb':
                    // Use bulk operations for efficiency
                    const bulkOps = updates.map(update => ({
                        updateOne: {
                            filter: { id: update.workspaceId, userId },
                            update: {
                                $set: {
                                    groupId: update.groupId,
                                    sortOrder: update.sortOrder,
                                    updatedAt
                                }
                            }
                        }
                    }));

                    await connection.collection('workspaces').bulkWrite(bulkOps);
                    break;

                case 'mysql':
                case 'postgresql':
                    // Use transaction for consistency
                    await connection.beginTransaction();

                    try {
                        for (const update of updates) {
                            await connection.execute(
                                'UPDATE workspaces SET groupId = ?, sortOrder = ?, updatedAt = ? WHERE id = ? AND userId = ?',
                                [update.groupId, update.sortOrder, updatedAt.toISOString(), update.workspaceId, userId]
                            );
                        }
                        await connection.commit();
                    } catch (error) {
                        await connection.rollback();
                        throw error;
                    }
                    break;

                case 'localdb':
                    // SQLite transaction
                    await new Promise<void>((resolve, reject) => {
                        connection.serialize(() => {
                            connection.run('BEGIN TRANSACTION');

                            let completed = 0;
                            const total = updates.length;

                            for (const update of updates) {
                                connection.run(
                                    'UPDATE workspaces SET groupId = ?, sortOrder = ?, updatedAt = ? WHERE id = ? AND userId = ?',
                                    [update.groupId, update.sortOrder, updatedAt.toISOString(), update.workspaceId, userId],
                                    (err: any) => {
                                        if (err) {
                                            connection.run('ROLLBACK');
                                            reject(err);
                                            return;
                                        }

                                        completed++;
                                        if (completed === total) {
                                            connection.run('COMMIT', (commitErr: any) => {
                                                if (commitErr) reject(commitErr);
                                                else resolve();
                                            });
                                        }
                                    }
                                );
                            }
                        });
                    });
                    break;

                case 'supabase':
                    // Concurrent updates for Supabase
                    const supabasePromises = updates.map(update =>
                        connection
                            .from('workspaces')
                            .update({
                                group_id: update.groupId,
                                sort_order: update.sortOrder,
                                updated_at: updatedAt.toISOString()
                            })
                            .eq('id', update.workspaceId)
                            .eq('user_id', userId)
                    );

                    const results = await Promise.all(supabasePromises);

                    // Check for errors
                    for (const result of results) {
                        if (result.error) {
                            throw new Error(`Supabase error: ${result.error.message}`);
                        }
                    }
                    break;

                default:
                    throw new Error(`Database type ${config.type} not supported for batch workspace operations`);
            }

            return { success: true, message: 'Workspaces updated successfully' };
        } catch (error) {
            console.error('Error in batch update workspaces:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to update workspaces'
            };
        }
    }

    /**
     * Delete a workspace
     */
    public async deleteWorkspace(workspaceId: string, userId: string): Promise<WorkspaceDeleteResponse> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            // Check if this is the user's only workspace
            const userWorkspaces = await this.getUserWorkspaces(userId);

            if (userWorkspaces.workspaces.length <= 1) {
                return {
                    success: false,
                    message: 'Cannot delete the last workspace. Users must have at least one workspace.'
                };
            }

            const connection = await this.dbManager.getConnection();
            const workspaceToDelete = userWorkspaces.workspaces.find(w => w.id === workspaceId);

            switch (config.type) {
                case 'mongodb':
                    await connection.collection('workspaces').deleteOne({ id: workspaceId, userId });
                    break;

                case 'mysql':
                case 'postgresql':
                    await connection.execute('DELETE FROM workspaces WHERE id = ? AND userId = ?', [workspaceId, userId]);
                    break;

                case 'localdb':
                    await new Promise<void>((resolve, reject) => {
                        connection.run('DELETE FROM workspaces WHERE id = ? AND userId = ?', [workspaceId, userId], (err: any) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                    break;

                case 'supabase':
                    const { error } = await connection
                        .from('workspaces')
                        .delete()
                        .eq('id', workspaceId)
                        .eq('user_id', userId);

                    if (error) {
                        throw new Error(`Supabase error: ${error.message}`);
                    }
                    break;

                default:
                    throw new Error(`Database type ${config.type} not supported for workspace operations`);
            }

            // If the deleted workspace was active, make another workspace active
            if (workspaceToDelete?.isActive) {
                const remainingWorkspaces = await this.getUserWorkspaces(userId);
                if (remainingWorkspaces.workspaces.length > 0) {
                    await this.setActiveWorkspace(remainingWorkspaces.workspaces[0].id, userId);
                }
            }

            return {
                success: true,
                message: 'Workspace deleted successfully'
            };

        } catch (error) {
            console.error('Error deleting workspace:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to delete workspace'
            };
        }
    }

    /**
     * Get workspace details by ID
     */
    public async getWorkspace(workspaceId: string, userId: string): Promise<{ success: boolean; workspace?: Workspace; message?: string }> {
        try {
            const workspace = await this.getWorkspaceById(workspaceId, userId);
            if (!workspace) {
                return {
                    success: false,
                    message: 'Workspace not found'
                };
            }
            return {
                success: true,
                workspace
            };
        } catch (error) {
            console.error('Error getting workspace:', error);
            return {
                success: false,
                message: `Failed to get workspace: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Set a workspace as active (and deactivate others)
     */
    public async setActiveWorkspace(workspaceId: string, userId: string): Promise<WorkspaceUpdateResponse> {
        try {
            // First deactivate all workspaces for the user
            await this.deactivateAllWorkspaces(userId);

            // Then activate the specified workspace
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            const updatedAt = new Date();

            switch (config.type) {
                case 'mongodb':
                    await connection.collection('workspaces').updateOne(
                        { id: workspaceId, userId },
                        { $set: { isActive: true, updatedAt } }
                    );
                    break;

                case 'mysql':
                case 'postgresql':
                    await connection.execute(
                        'UPDATE workspaces SET isActive = ?, updatedAt = ? WHERE id = ? AND userId = ?',
                        [true, updatedAt.toISOString(), workspaceId, userId]
                    );
                    break;

                case 'localdb':
                    await new Promise<void>((resolve, reject) => {
                        connection.run(
                            'UPDATE workspaces SET isActive = ?, updatedAt = ? WHERE id = ? AND userId = ?',
                            [1, updatedAt.toISOString(), workspaceId, userId],
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
                        .update({ is_active: true, updated_at: updatedAt.toISOString() })
                        .eq('id', workspaceId)
                        .eq('user_id', userId);

                    if (error) {
                        throw new Error(`Supabase error: ${error.message}`);
                    }
                    break;

                default:
                    throw new Error(`Database type ${config.type} not supported for workspace operations`);
            }

            // Get the updated workspace
            const updatedWorkspace = await this.getWorkspaceById(workspaceId, userId);
            if (!updatedWorkspace) {
                throw new Error('Workspace not found after activation');
            }

            return {
                success: true,
                message: 'Workspace activated successfully',
                workspace: {
                    id: updatedWorkspace.id,
                    name: updatedWorkspace.name,
                    templateType: updatedWorkspace.templateType,
                    workspaceRules: updatedWorkspace.workspaceRules,
                    isActive: updatedWorkspace.isActive,
                    createdAt: updatedWorkspace.createdAt.toISOString()
                }
            };

        } catch (error) {
            console.error('Error setting active workspace:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to set active workspace'
            };
        }
    }

    /**
     * Deactivate all workspaces for a user
     */
    private async deactivateAllWorkspaces(userId: string): Promise<void> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();
        const updatedAt = new Date();

        switch (config.type) {
            case 'mongodb':
                await connection.collection('workspaces').updateMany(
                    { userId },
                    { $set: { isActive: false, updatedAt } }
                );
                break;

            case 'mysql':
            case 'postgresql':
                await connection.execute(
                    'UPDATE workspaces SET isActive = ?, updatedAt = ? WHERE userId = ?',
                    [false, updatedAt.toISOString(), userId]
                );
                break;

            case 'localdb':
                await new Promise<void>((resolve, reject) => {
                    connection.run(
                        'UPDATE workspaces SET isActive = ?, updatedAt = ? WHERE userId = ?',
                        [0, updatedAt.toISOString(), userId],
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
                    .update({ is_active: false, updated_at: updatedAt.toISOString() })
                    .eq('user_id', userId);

                if (error) {
                    throw new Error(`Supabase error: ${error.message}`);
                }
                break;

            default:
                throw new Error(`Database type ${config.type} not supported for workspace operations`);
        }
    }

    /**
     * Get a specific workspace by ID
     */
    private async getWorkspaceById(workspaceId: string, userId: string): Promise<Workspace | null> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found');
        }

        const connection = await this.dbManager.getConnection();

        switch (config.type) {
            case 'mongodb':
                const mongoWorkspace = await connection.collection('workspaces').findOne({ id: workspaceId, userId });
                return mongoWorkspace ? this.mapMongoWorkspace(mongoWorkspace) : null;

            case 'mysql':
            case 'postgresql':
                const query = 'SELECT * FROM workspaces WHERE id = ? AND userId = ? LIMIT 1';
                const [rows] = await connection.execute(query, [workspaceId, userId]);
                return rows.length > 0 ? this.mapSQLWorkspace(rows[0]) : null;

            case 'localdb':
                return new Promise((resolve, reject) => {
                    connection.get('SELECT * FROM workspaces WHERE id = ? AND userId = ? LIMIT 1', [workspaceId, userId], (err: any, row: any) => {
                        if (err) reject(err);
                        else resolve(row ? this.mapSQLWorkspace(row) : null);
                    });
                });

            case 'supabase':
                const { data, error } = await connection
                    .from('workspaces')
                    .select('*')
                    .eq('id', workspaceId)
                    .eq('user_id', userId)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    throw new Error(`Supabase error: ${error.message}`);
                }

                return data ? this.mapSupabaseWorkspace(data) : null;

            default:
                throw new Error(`Database type ${config.type} not supported for workspace operations`);
        }
    }

    // Helper methods for database table creation
    private async createWorkspaceTableIfNotExists(connection: any, dbType: string): Promise<void> {
        const createTableQuery = dbType === 'mysql' ? `
            CREATE TABLE IF NOT EXISTS workspaces (
                id VARCHAR(36) PRIMARY KEY,
                userId VARCHAR(36) NOT NULL,
                name VARCHAR(255) NOT NULL,
                templateType VARCHAR(50) NOT NULL,
                workspaceRules TEXT,
                isActive BOOLEAN NOT NULL DEFAULT FALSE,
                groupId VARCHAR(36) NULL,
                sortOrder INT NOT NULL DEFAULT 0,
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL,
                INDEX idx_userId (userId),
                INDEX idx_groupId (groupId),
                INDEX idx_sortOrder (sortOrder)
            )
        ` : `
            CREATE TABLE IF NOT EXISTS workspaces (
                id VARCHAR(36) PRIMARY KEY,
                userId VARCHAR(36) NOT NULL,
                name VARCHAR(255) NOT NULL,
                templateType VARCHAR(50) NOT NULL,
                workspaceRules TEXT,
                isActive BOOLEAN NOT NULL DEFAULT FALSE,
                groupId VARCHAR(36) NULL,
                sortOrder INTEGER NOT NULL DEFAULT 0,
                createdAt TIMESTAMP NOT NULL,
                updatedAt TIMESTAMP NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_workspaces_userId ON workspaces(userId);
            CREATE INDEX IF NOT EXISTS idx_workspaces_groupId ON workspaces(groupId);
            CREATE INDEX IF NOT EXISTS idx_workspaces_sortOrder ON workspaces(sortOrder);
        `;

        await connection.execute(createTableQuery);
    }

    private async createWorkspaceTableIfNotExistsSQLite(connection: any): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            connection.run(`
                CREATE TABLE IF NOT EXISTS workspaces (
                    id TEXT PRIMARY KEY,
                    userId TEXT NOT NULL,
                    name TEXT NOT NULL,
                    templateType TEXT NOT NULL,
                    workspaceRules TEXT,
                    isActive INTEGER NOT NULL DEFAULT 0,
                    groupId TEXT NULL,
                    sortOrder INTEGER NOT NULL DEFAULT 0,
                    createdAt TEXT NOT NULL,
                    updatedAt TEXT NOT NULL
                )
            `, (err: any) => {
                if (err) {
                    reject(err);
                } else {
                    // Create indexes
                    connection.run(`
                        CREATE INDEX IF NOT EXISTS idx_workspaces_userId ON workspaces(userId)
                    `, (indexErr: any) => {
                        if (indexErr) {
                            reject(indexErr);
                        } else {
                            connection.run(`
                                CREATE INDEX IF NOT EXISTS idx_workspaces_groupId ON workspaces(groupId)
                            `, (groupIndexErr: any) => {
                                if (groupIndexErr) {
                                    reject(groupIndexErr);
                                } else {
                                    connection.run(`
                                        CREATE INDEX IF NOT EXISTS idx_workspaces_sortOrder ON workspaces(sortOrder)
                                    `, (sortIndexErr: any) => {
                                        if (sortIndexErr) reject(sortIndexErr);
                                        else resolve();
                                    });
                                }
                            });
                        }
                    });
                }
            });
        });
    }

    // Helper methods for mapping database results
    private mapMongoWorkspace(doc: any): Workspace {
        return {
            id: doc.id || doc._id,
            userId: doc.userId,
            name: doc.name,
            templateType: doc.templateType,
            workspaceRules: doc.workspaceRules,
            isActive: doc.isActive,
            groupId: doc.groupId || null,
            sortOrder: doc.sortOrder || 0,
            createdAt: new Date(doc.createdAt),
            updatedAt: new Date(doc.updatedAt)
        };
    }

    private mapSQLWorkspace(row: any): Workspace {
        return {
            id: row.id,
            userId: row.userId,
            name: row.name,
            templateType: row.templateType,
            workspaceRules: row.workspaceRules,
            isActive: row.isActive === 1 || row.isActive === true,
            groupId: row.groupId || null,
            sortOrder: row.sortOrder || 0,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt)
        };
    }

    private mapSupabaseWorkspace(data: any): Workspace {
        return {
            id: data.id,
            userId: data.user_id,
            name: data.name,
            templateType: data.template_type,
            workspaceRules: data.workspace_rules,
            isActive: data.is_active,
            groupId: data.group_id || null,
            sortOrder: data.sort_order || 0,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at)
        };
    }
}
