import { DatabaseManager } from '../config/database';
import { Workspace, CreateWorkspaceRequest, CreateWorkspaceResponse, WorkspaceStatusResponse } from '../types/workspace';
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
            // Check if user already has a workspace
            const existingWorkspace = await this.getUserWorkspace(userId);
            if (existingWorkspace.hasWorkspace) {
                return {
                    success: false,
                    message: 'User already has a workspace configured'
                };
            }

            const workspace: Workspace = {
                id: uuidv4(),
                userId,
                templateType: request.templateType,
                workspaceRules: request.workspaceRules,
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
                        INSERT INTO workspaces (id, userId, templateType, workspaceRules, createdAt, updatedAt)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `;
                    await connection.execute(query, [
                        workspace.id,
                        workspace.userId,
                        workspace.templateType,
                        workspace.workspaceRules,
                        workspace.createdAt.toISOString(),
                        workspace.updatedAt.toISOString()
                    ]);
                    break;

                case 'localdb':
                    await this.createWorkspaceTableIfNotExistsSQLite(connection);
                    await new Promise<void>((resolve, reject) => {
                        connection.run(`
                            INSERT INTO workspaces (id, userId, templateType, workspaceRules, createdAt, updatedAt)
                            VALUES (?, ?, ?, ?, ?, ?)
                        `, [
                            workspace.id,
                            workspace.userId,
                            workspace.templateType,
                            workspace.workspaceRules,
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
                            template_type: workspace.templateType,
                            workspace_rules: workspace.workspaceRules,
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
                    templateType: workspace.templateType,
                    workspaceRules: workspace.workspaceRules,
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
                    const mongoWorkspace = await connection.collection('workspaces').findOne({ userId });
                    workspace = mongoWorkspace ? this.mapMongoWorkspace(mongoWorkspace) : null;
                    break;

                case 'mysql':
                case 'postgresql':
                    const query = 'SELECT * FROM workspaces WHERE userId = ? LIMIT 1';
                    const [rows] = await connection.execute(query, [userId]);
                    workspace = rows.length > 0 ? this.mapSQLWorkspace(rows[0]) : null;
                    break;

                case 'localdb':
                    workspace = await new Promise((resolve, reject) => {
                        connection.get('SELECT * FROM workspaces WHERE userId = ? LIMIT 1', [userId], (err: any, row: any) => {
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
                    templateType: workspace.templateType,
                    workspaceRules: workspace.workspaceRules,
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

    // Helper methods for database table creation
    private async createWorkspaceTableIfNotExists(connection: any, dbType: string): Promise<void> {
        const createTableQuery = dbType === 'mysql' ? `
            CREATE TABLE IF NOT EXISTS workspaces (
                id VARCHAR(36) PRIMARY KEY,
                userId VARCHAR(36) NOT NULL,
                templateType VARCHAR(50) NOT NULL,
                workspaceRules TEXT,
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL,
                INDEX idx_userId (userId)
            )
        ` : `
            CREATE TABLE IF NOT EXISTS workspaces (
                id VARCHAR(36) PRIMARY KEY,
                userId VARCHAR(36) NOT NULL,
                templateType VARCHAR(50) NOT NULL,
                workspaceRules TEXT,
                createdAt TIMESTAMP NOT NULL,
                updatedAt TIMESTAMP NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_workspaces_userId ON workspaces(userId);
        `;

        await connection.execute(createTableQuery);
    }

    private async createWorkspaceTableIfNotExistsSQLite(connection: any): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            connection.run(`
                CREATE TABLE IF NOT EXISTS workspaces (
                    id TEXT PRIMARY KEY,
                    userId TEXT NOT NULL,
                    templateType TEXT NOT NULL,
                    workspaceRules TEXT,
                    createdAt TEXT NOT NULL,
                    updatedAt TEXT NOT NULL
                )
            `, (err: any) => {
                if (err) {
                    reject(err);
                } else {
                    // Create index
                    connection.run(`
                        CREATE INDEX IF NOT EXISTS idx_workspaces_userId ON workspaces(userId)
                    `, (indexErr: any) => {
                        if (indexErr) reject(indexErr);
                        else resolve();
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
            templateType: doc.templateType,
            workspaceRules: doc.workspaceRules,
            createdAt: new Date(doc.createdAt),
            updatedAt: new Date(doc.updatedAt)
        };
    }

    private mapSQLWorkspace(row: any): Workspace {
        return {
            id: row.id,
            userId: row.userId,
            templateType: row.templateType,
            workspaceRules: row.workspaceRules,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt)
        };
    }

    private mapSupabaseWorkspace(data: any): Workspace {
        return {
            id: data.id,
            userId: data.user_id,
            templateType: data.template_type,
            workspaceRules: data.workspace_rules,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at)
        };
    }
}
