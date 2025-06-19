import { UniversalDatabaseService } from './universalDatabaseService';
import { User } from '../types/user';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

/**
 * New User Service using Universal Database Abstraction
 * This demonstrates how much simpler the code becomes with the universal approach
 */
export class UserServiceNew {
    private static instance: UserServiceNew;
    private universalDb: UniversalDatabaseService;

    private constructor() {
        this.universalDb = UniversalDatabaseService.getInstance();
    }

    public static getInstance(): UserServiceNew {
        if (!UserServiceNew.instance) {
            UserServiceNew.instance = new UserServiceNew();
        }
        return UserServiceNew.instance;
    }

    /**
     * Create a new user - ONE SIMPLE METHOD FOR ALL DATABASES!
     */
    public async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; message: string; user?: Partial<User> }> {
        try {
            // Hash password
            const hashedPassword = await bcrypt.hash(userData.password, 10);

            // Create user object
            const user: User = {
                id: uuidv4(),
                ...userData,
                password: hashedPassword,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Insert user - works with ANY database type!
            const result = await this.universalDb.insert<User>('users', user);

            if (result.success) {
                return {
                    success: true,
                    message: 'User created successfully',
                    user: {
                        id: user.id,
                        email: user.email,
                        username: user.username,
                        role: user.role,
                        isActive: user.isActive,
                        createdAt: user.createdAt
                    }
                };
            } else {
                throw new Error('Failed to create user');
            }
        } catch (error) {
            console.error('Error creating user:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to create user'
            };
        }
    }

    /**
     * Get user by ID - ONE SIMPLE METHOD FOR ALL DATABASES!
     */
    public async getUserById(userId: string): Promise<User | null> {
        try {
            return await this.universalDb.findById<User>('users', userId);
        } catch (error) {
            console.error('Error getting user by ID:', error);
            return null;
        }
    }

    /**
     * Get user by email - ONE SIMPLE METHOD FOR ALL DATABASES!
     */
    public async getUserByEmail(email: string): Promise<User | null> {
        try {
            return await this.universalDb.findOne<User>('users', {
                where: [{ field: 'email', operator: 'eq', value: email }]
            });
        } catch (error) {
            console.error('Error getting user by email:', error);
            return null;
        }
    }

    /**
     * Update user - ONE SIMPLE METHOD FOR ALL DATABASES!
     */
    public async updateUser(userId: string, updateData: Partial<User>): Promise<{ success: boolean; message: string }> {
        try {
            // Hash password if it's being updated
            if (updateData.password) {
                updateData.password = await bcrypt.hash(updateData.password, 10);
            }

            const result = await this.universalDb.update<User>('users', userId, updateData);

            return {
                success: result.success,
                message: result.modifiedCount > 0 ? 'User updated successfully' : 'No changes made'
            };
        } catch (error) {
            console.error('Error updating user:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to update user'
            };
        }
    }

    /**
     * Delete user - ONE SIMPLE METHOD FOR ALL DATABASES!
     */
    public async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
        try {
            const result = await this.universalDb.delete('users', userId);

            return {
                success: result.success,
                message: result.deletedCount > 0 ? 'User deleted successfully' : 'User not found'
            };
        } catch (error) {
            console.error('Error deleting user:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to delete user'
            };
        }
    }

    /**
     * Get all users with pagination and filtering - ONE SIMPLE METHOD FOR ALL DATABASES!
     */
    public async getAllUsers(options: {
        page?: number;
        limit?: number;
        search?: string;
        role?: string;
        isActive?: boolean;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    } = {}): Promise<{
        success: boolean;
        users: Partial<User>[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        try {
            const {
                page = 1,
                limit = 10,
                search,
                role,
                isActive,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = options;

            const offset = (page - 1) * limit;

            // Build query conditions
            const where = [];
            
            if (search) {
                // Search in email and username
                where.push({ field: 'email', operator: 'like', value: search });
                // Note: In a real implementation, you'd want OR conditions
                // This is simplified for demonstration
            }
            
            if (role) {
                where.push({ field: 'role', operator: 'eq', value: role });
            }
            
            if (isActive !== undefined) {
                where.push({ field: 'isActive', operator: 'eq', value: isActive });
            }

            // Execute query - works with ANY database type!
            const result = await this.universalDb.findMany<User>('users', {
                where: where.length > 0 ? where : undefined,
                orderBy: [{ field: sortBy, direction: sortOrder }],
                limit,
                offset,
                select: ['id', 'email', 'username', 'role', 'isActive', 'createdAt', 'lastLoginAt']
            });

            const totalPages = Math.ceil((result.total || 0) / limit);

            return {
                success: true,
                users: result.data,
                total: result.total || 0,
                page,
                limit,
                totalPages
            };
        } catch (error) {
            console.error('Error getting all users:', error);
            return {
                success: false,
                users: [],
                total: 0,
                page: 1,
                limit: 10,
                totalPages: 0
            };
        }
    }

    /**
     * Update last login time - ONE SIMPLE METHOD FOR ALL DATABASES!
     */
    public async updateLastLogin(userId: string): Promise<void> {
        try {
            await this.universalDb.update<User>('users', userId, {
                lastLoginAt: new Date()
            });
        } catch (error) {
            console.error('Error updating last login:', error);
        }
    }

    /**
     * Count users by role - ONE SIMPLE METHOD FOR ALL DATABASES!
     */
    public async countUsersByRole(role: string): Promise<number> {
        try {
            return await this.universalDb.count('users', {
                where: [{ field: 'role', operator: 'eq', value: role }]
            });
        } catch (error) {
            console.error('Error counting users by role:', error);
            return 0;
        }
    }

    /**
     * Get active users - ONE SIMPLE METHOD FOR ALL DATABASES!
     */
    public async getActiveUsers(): Promise<User[]> {
        try {
            const result = await this.universalDb.findMany<User>('users', {
                where: [{ field: 'isActive', operator: 'eq', value: true }],
                orderBy: [{ field: 'createdAt', direction: 'desc' }]
            });
            return result.data;
        } catch (error) {
            console.error('Error getting active users:', error);
            return [];
        }
    }

    /**
     * Initialize user table/collection - ONE SIMPLE METHOD FOR ALL DATABASES!
     */
    public async initializeUserSchema(): Promise<void> {
        try {
            const schema = this.universalDb.getSchemaByTableName('users');
            if (schema) {
                await this.universalDb.ensureSchema(schema);
            }
        } catch (error) {
            console.error('Error initializing user schema:', error);
        }
    }
}

// Compare this to the old UserService - we went from 1000+ lines with complex switch statements
// to ~250 lines of clean, database-agnostic code!
