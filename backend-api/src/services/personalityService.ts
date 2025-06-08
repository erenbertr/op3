import { DatabaseManager } from '../config/database';
import {
    Personality,
    CreatePersonalityRequest,
    UpdatePersonalityRequest,
    PersonalityResponse,
    PersonalitiesListResponse,
    DeletePersonalityResponse
} from '../types/personality';
import { v4 as uuidv4 } from 'uuid';

export class PersonalityService {
    private dbManager: DatabaseManager;

    constructor() {
        this.dbManager = DatabaseManager.getInstance();
    }

    async createPersonality(userId: string, request: CreatePersonalityRequest): Promise<PersonalityResponse> {
        try {
            const connection = await this.dbManager.getConnection();
            const dbType = this.dbManager.getCurrentConfig()?.type;

            if (!connection || !dbType) {
                return {
                    success: false,
                    message: 'Database connection not available'
                };
            }

            // Validate input
            if (!request.title || request.title.trim() === '') {
                return {
                    success: false,
                    message: 'Title is required'
                };
            }

            if (!request.prompt || request.prompt.trim() === '') {
                return {
                    success: false,
                    message: 'Prompt is required'
                };
            }

            const personality: Personality = {
                id: uuidv4(),
                userId,
                title: request.title.trim(),
                prompt: request.prompt.trim(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Insert personality based on database type
            switch (dbType) {
                case 'mongodb':
                    await connection.collection('personalities').insertOne(personality);
                    break;

                case 'localdb':
                    await this.createPersonalityTableIfNotExists(connection, dbType);
                    await this.createPersonalitySQLite(connection, personality);
                    break;

                case 'mysql':
                case 'postgresql':
                    await this.createPersonalityTableIfNotExists(connection, dbType);
                    await this.createPersonalitySQL(connection, personality, dbType);
                    break;

                default:
                    throw new Error(`Database type ${dbType} not supported for personality operations`);
            }

            return {
                success: true,
                message: 'Personality created successfully',
                personality
            };
        } catch (error) {
            console.error('Error creating personality:', error);
            return {
                success: false,
                message: 'Failed to create personality'
            };
        }
    }

    async getPersonalities(userId: string): Promise<PersonalitiesListResponse> {
        try {
            const connection = await this.dbManager.getConnection();
            const dbType = this.dbManager.getCurrentConfig()?.type;

            if (!connection || !dbType) {
                return {
                    success: false,
                    message: 'Database connection not available',
                    personalities: []
                };
            }

            let personalities: Personality[] = [];

            switch (dbType) {
                case 'mongodb':
                    const mongoPersonalities = await connection.collection('personalities').find({ userId }).toArray();
                    personalities = mongoPersonalities.map(this.mapMongoPersonality);
                    break;

                case 'localdb':
                    await this.createPersonalityTableIfNotExists(connection, dbType);
                    personalities = await this.getPersonalitiesSQLite(connection, userId);
                    break;

                case 'mysql':
                case 'postgresql':
                    await this.createPersonalityTableIfNotExists(connection, dbType);
                    personalities = await this.getPersonalitiesSQL(connection, userId);
                    break;

                default:
                    throw new Error(`Database type ${dbType} not supported for personality operations`);
            }

            return {
                success: true,
                message: 'Personalities retrieved successfully',
                personalities
            };
        } catch (error) {
            console.error('Error getting personalities:', error);
            return {
                success: false,
                message: 'Failed to retrieve personalities',
                personalities: []
            };
        }
    }

    async updatePersonality(personalityId: string, userId: string, request: UpdatePersonalityRequest): Promise<PersonalityResponse> {
        try {
            const connection = await this.dbManager.getConnection();
            const dbType = this.dbManager.getCurrentConfig()?.type;

            if (!connection || !dbType) {
                return {
                    success: false,
                    message: 'Database connection not available'
                };
            }

            // Validate that at least one field is being updated
            if (!request.title && !request.prompt) {
                return {
                    success: false,
                    message: 'At least one field (title or prompt) must be provided for update'
                };
            }

            // Get existing personality to verify ownership
            const existingPersonalities = await this.getPersonalities(userId);
            const existingPersonality = existingPersonalities.personalities.find(p => p.id === personalityId);

            if (!existingPersonality) {
                return {
                    success: false,
                    message: 'Personality not found or access denied'
                };
            }

            const updatedPersonality: Personality = {
                ...existingPersonality,
                title: request.title?.trim() || existingPersonality.title,
                prompt: request.prompt?.trim() || existingPersonality.prompt,
                updatedAt: new Date().toISOString()
            };

            switch (dbType) {
                case 'mongodb':
                    await connection.collection('personalities').updateOne(
                        { id: personalityId, userId },
                        {
                            $set: {
                                title: updatedPersonality.title,
                                prompt: updatedPersonality.prompt,
                                updatedAt: updatedPersonality.updatedAt
                            }
                        }
                    );
                    break;

                case 'localdb':
                    await this.updatePersonalitySQLite(connection, updatedPersonality);
                    break;

                case 'mysql':
                case 'postgresql':
                    await this.updatePersonalitySQL(connection, updatedPersonality, dbType);
                    break;

                default:
                    throw new Error(`Database type ${dbType} not supported for personality operations`);
            }

            return {
                success: true,
                message: 'Personality updated successfully',
                personality: updatedPersonality
            };
        } catch (error) {
            console.error('Error updating personality:', error);
            return {
                success: false,
                message: 'Failed to update personality'
            };
        }
    }

    async deletePersonality(personalityId: string, userId: string): Promise<DeletePersonalityResponse> {
        try {
            const connection = await this.dbManager.getConnection();
            const dbType = this.dbManager.getCurrentConfig()?.type;

            if (!connection || !dbType) {
                return {
                    success: false,
                    message: 'Database connection not available'
                };
            }

            // Verify ownership before deletion
            const existingPersonalities = await this.getPersonalities(userId);
            const existingPersonality = existingPersonalities.personalities.find(p => p.id === personalityId);

            if (!existingPersonality) {
                return {
                    success: false,
                    message: 'Personality not found or access denied'
                };
            }

            switch (dbType) {
                case 'mongodb':
                    await connection.collection('personalities').deleteOne({ id: personalityId, userId });
                    break;

                case 'localdb':
                    await this.deletePersonalitySQLite(connection, personalityId);
                    break;

                case 'mysql':
                case 'postgresql':
                    await this.deletePersonalitySQL(connection, personalityId, dbType);
                    break;

                default:
                    throw new Error(`Database type ${dbType} not supported for personality operations`);
            }

            return {
                success: true,
                message: 'Personality deleted successfully'
            };
        } catch (error) {
            console.error('Error deleting personality:', error);
            return {
                success: false,
                message: 'Failed to delete personality'
            };
        }
    }

    // Helper method to map MongoDB document to Personality interface
    private mapMongoPersonality(doc: any): Personality {
        return {
            id: doc.id,
            userId: doc.userId,
            title: doc.title,
            prompt: doc.prompt,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt
        };
    }

    // Helper methods for database table creation
    private async createPersonalityTableIfNotExists(connection: any, dbType: string): Promise<void> {
        const createTableQuery = dbType === 'mysql' ? `
            CREATE TABLE IF NOT EXISTS personalities (
                id VARCHAR(36) PRIMARY KEY,
                userId VARCHAR(36) NOT NULL,
                title VARCHAR(255) NOT NULL,
                prompt TEXT NOT NULL,
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL,
                INDEX idx_userId (userId)
            )
        ` : `
            CREATE TABLE IF NOT EXISTS personalities (
                id VARCHAR(36) PRIMARY KEY,
                userId VARCHAR(36) NOT NULL,
                title VARCHAR(255) NOT NULL,
                prompt TEXT NOT NULL,
                createdAt TIMESTAMP NOT NULL,
                updatedAt TIMESTAMP NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_personalities_userId ON personalities(userId);
        `;

        if (dbType === 'localdb') {
            await this.createPersonalityTableIfNotExistsSQLite(connection);
        } else {
            await connection.execute(createTableQuery);
        }
    }

    private async createPersonalityTableIfNotExistsSQLite(connection: any): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            connection.run(`
                CREATE TABLE IF NOT EXISTS personalities (
                    id TEXT PRIMARY KEY,
                    userId TEXT NOT NULL,
                    title TEXT NOT NULL,
                    prompt TEXT NOT NULL,
                    createdAt TEXT NOT NULL,
                    updatedAt TEXT NOT NULL
                )
            `, (err: any) => {
                if (err) {
                    reject(err);
                } else {
                    // Create index
                    connection.run(`
                        CREATE INDEX IF NOT EXISTS idx_personalities_userId ON personalities(userId)
                    `, (indexErr: any) => {
                        if (indexErr) reject(indexErr);
                        else resolve();
                    });
                }
            });
        });
    }

    // SQL operations for MySQL/PostgreSQL
    private async createPersonalitySQL(connection: any, personality: Personality, dbType: string): Promise<void> {
        const query = `
            INSERT INTO personalities (id, userId, title, prompt, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        await connection.execute(query, [
            personality.id,
            personality.userId,
            personality.title,
            personality.prompt,
            personality.createdAt,
            personality.updatedAt
        ]);
    }

    private async getPersonalitiesSQL(connection: any, userId: string): Promise<Personality[]> {
        const query = `
            SELECT id, userId, title, prompt, createdAt, updatedAt
            FROM personalities
            WHERE userId = ?
            ORDER BY createdAt DESC
        `;

        const [rows] = await connection.execute(query, [userId]);
        return rows as Personality[];
    }

    private async updatePersonalitySQL(connection: any, personality: Personality, dbType: string): Promise<void> {
        const query = `
            UPDATE personalities
            SET title = ?, prompt = ?, updatedAt = ?
            WHERE id = ?
        `;

        await connection.execute(query, [
            personality.title,
            personality.prompt,
            personality.updatedAt,
            personality.id
        ]);
    }

    private async deletePersonalitySQL(connection: any, personalityId: string, dbType: string): Promise<void> {
        const query = `DELETE FROM personalities WHERE id = ?`;
        await connection.execute(query, [personalityId]);
    }

    // SQLite operations
    private async createPersonalitySQLite(connection: any, personality: Personality): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const query = `
                INSERT INTO personalities (id, userId, title, prompt, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            connection.run(query, [
                personality.id,
                personality.userId,
                personality.title,
                personality.prompt,
                personality.createdAt,
                personality.updatedAt
            ], (err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    private async getPersonalitiesSQLite(connection: any, userId: string): Promise<Personality[]> {
        return new Promise<Personality[]>((resolve, reject) => {
            const query = `
                SELECT id, userId, title, prompt, createdAt, updatedAt
                FROM personalities
                WHERE userId = ?
                ORDER BY createdAt DESC
            `;

            connection.all(query, [userId], (err: any, rows: any[]) => {
                if (err) reject(err);
                else resolve(rows as Personality[]);
            });
        });
    }

    private async updatePersonalitySQLite(connection: any, personality: Personality): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const query = `
                UPDATE personalities
                SET title = ?, prompt = ?, updatedAt = ?
                WHERE id = ?
            `;

            connection.run(query, [
                personality.title,
                personality.prompt,
                personality.updatedAt,
                personality.id
            ], (err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    private async deletePersonalitySQLite(connection: any, personalityId: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const query = `DELETE FROM personalities WHERE id = ?`;

            connection.run(query, [personalityId], (err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}
