import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import {
    User,
    CreateUserRequest,
    CreateUserResponse,
    UserValidationError,
    PasswordRequirements,
    DEFAULT_PASSWORD_REQUIREMENTS,
    AdminConfig
} from '../types/user';
import { DatabaseManager } from '../config/database';

export class UserService {
    private static instance: UserService;
    private dbManager: DatabaseManager;
    private saltRounds = 12;

    private constructor() {
        this.dbManager = DatabaseManager.getInstance();
    }

    public static getInstance(): UserService {
        if (!UserService.instance) {
            UserService.instance = new UserService();
        }
        return UserService.instance;
    }

    /**
     * Validate password against requirements
     */
    public validatePassword(password: string, requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS): UserValidationError[] {
        const errors: UserValidationError[] = [];

        if (password.length < requirements.minLength) {
            errors.push({
                field: 'password',
                message: `Password must be at least ${requirements.minLength} characters long`
            });
        }

        if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
            errors.push({
                field: 'password',
                message: 'Password must contain at least one uppercase letter'
            });
        }

        if (requirements.requireLowercase && !/[a-z]/.test(password)) {
            errors.push({
                field: 'password',
                message: 'Password must contain at least one lowercase letter'
            });
        }

        if (requirements.requireNumbers && !/\d/.test(password)) {
            errors.push({
                field: 'password',
                message: 'Password must contain at least one number'
            });
        }

        if (requirements.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.push({
                field: 'password',
                message: 'Password must contain at least one special character'
            });
        }

        return errors;
    }

    /**
     * Validate email format
     */
    public validateEmail(email: string): UserValidationError[] {
        const errors: UserValidationError[] = [];
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email) {
            errors.push({
                field: 'email',
                message: 'Email is required'
            });
        } else if (!emailRegex.test(email)) {
            errors.push({
                field: 'email',
                message: 'Please enter a valid email address'
            });
        }

        return errors;
    }

    /**
     * Validate admin configuration
     */
    public validateAdminConfig(config: AdminConfig): UserValidationError[] {
        const errors: UserValidationError[] = [];

        // Validate email
        errors.push(...this.validateEmail(config.email));

        // Validate password
        errors.push(...this.validatePassword(config.password));

        // Validate password confirmation
        if (config.password !== config.confirmPassword) {
            errors.push({
                field: 'confirmPassword',
                message: 'Passwords do not match'
            });
        }

        // Validate username if provided
        if (config.username && config.username.length < 3) {
            errors.push({
                field: 'username',
                message: 'Username must be at least 3 characters long'
            });
        }

        return errors;
    }

    /**
     * Hash password using bcrypt
     */
    public async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, this.saltRounds);
    }

    /**
     * Verify password against hash
     */
    public async verifyPassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

    /**
     * Create a new user
     */
    public async createUser(request: CreateUserRequest, isSetupMode: boolean = false): Promise<CreateUserResponse> {
        try {
            // Validate email
            const emailErrors = this.validateEmail(request.email);
            if (emailErrors.length > 0) {
                return {
                    success: false,
                    message: emailErrors[0].message
                };
            }

            // Validate password
            const passwordErrors = this.validatePassword(request.password);
            if (passwordErrors.length > 0) {
                return {
                    success: false,
                    message: passwordErrors[0].message
                };
            }

            // Check if user already exists
            const existingUser = await this.getUserByEmail(request.email);
            if (existingUser) {
                if (isSetupMode) {
                    // In setup mode, we override the existing user
                    console.log('Setup mode: Overriding existing user with email:', request.email);
                    await this.deleteUserByEmail(request.email);
                } else {
                    // In normal operation, return error
                    return {
                        success: false,
                        message: 'User with this email already exists'
                    };
                }
            }

            // Hash password
            const hashedPassword = await this.hashPassword(request.password);

            // Create user object
            const user: User = {
                id: uuidv4(),
                email: request.email,
                username: request.username,
                password: hashedPassword,
                role: request.role,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                firstName: request.firstName,
                lastName: request.lastName
            };

            // Save user to database
            await this.saveUser(user);

            return {
                success: true,
                message: 'User created successfully',
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    role: user.role,
                    createdAt: user.createdAt
                }
            };
        } catch (error) {
            console.error('Error creating user:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return {
                success: false,
                message: `Failed to create user: ${errorMessage}`
            };
        }
    }

    /**
     * Check if the application is in setup mode
     */
    public async isInSetupMode(): Promise<boolean> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                return true; // No database config = setup mode
            }

            const adminExists = await this.adminExists();
            return !adminExists; // No admin = setup mode
        } catch (error) {
            console.error('Error checking setup mode:', error);
            return true; // Default to setup mode on error
        }
    }

    /**
     * Create admin user from config
     */
    public async createAdminUser(config: AdminConfig): Promise<CreateUserResponse> {
        // Validate admin config
        const validationErrors = this.validateAdminConfig(config);
        if (validationErrors.length > 0) {
            return {
                success: false,
                message: validationErrors[0].message
            };
        }

        // Check if we're in setup mode
        const isSetupMode = await this.isInSetupMode();

        return this.createUser({
            email: config.email,
            username: config.username,
            password: config.password,
            role: 'admin'
        }, isSetupMode);
    }

    /**
     * Get user by email for authentication (public method)
     */
    public async getUserByEmailForAuth(email: string): Promise<User | null> {
        return this.getUserByEmail(email);
    }

    /**
     * Update user's last login time
     */
    public async updateLastLogin(userId: string): Promise<void> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            const now = new Date();

            switch (config.type) {
                case 'mongodb':
                    await connection.collection('users').updateOne(
                        { _id: userId },
                        { $set: { lastLoginAt: now } }
                    );
                    break;

                case 'mysql':
                case 'postgresql':
                    const query = 'UPDATE users SET lastLoginAt = ? WHERE id = ?';
                    await connection.execute(query, [now, userId]);
                    break;

                case 'localdb':
                    return new Promise((resolve, reject) => {
                        connection.run(
                            'UPDATE users SET lastLoginAt = ? WHERE id = ?',
                            [now.toISOString(), userId],
                            (err: any) => {
                                if (err) reject(err);
                                else resolve();
                            }
                        );
                    });

                default:
                    throw new Error(`Database type ${config.type} not supported for user operations yet`);
            }
        } catch (error) {
            console.error('Error updating last login:', error);
            throw error;
        }
    }

    /**
     * Get user by email
     */
    private async getUserByEmail(email: string): Promise<User | null> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();

            switch (config.type) {
                case 'mongodb':
                    const mongoUser = await connection.collection('users').findOne({ email });
                    return mongoUser ? this.mapMongoUser(mongoUser) : null;

                case 'mysql':
                case 'postgresql':
                    const query = 'SELECT * FROM users WHERE email = ?';
                    const [rows] = await connection.execute(query, [email]);
                    return rows.length > 0 ? this.mapSQLUser(rows[0]) : null;

                case 'localdb':
                    return new Promise((resolve, reject) => {
                        connection.get('SELECT * FROM users WHERE email = ?', [email], (err: any, row: any) => {
                            if (err) {
                                // If table doesn't exist, return null (no user found)
                                if (err.code === 'SQLITE_ERROR' && err.message.includes('no such table')) {
                                    resolve(null);
                                } else {
                                    reject(err);
                                }
                            } else {
                                resolve(row ? this.mapSQLUser(row) : null);
                            }
                        });
                    });

                case 'supabase':
                    const { data, error } = await connection
                        .from('users')
                        .select('*')
                        .eq('email', email)
                        .single();

                    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
                        throw error;
                    }
                    return data ? this.mapSupabaseUser(data) : null;

                default:
                    throw new Error(`Database type ${config.type} not supported for user operations yet`);
            }
        } catch (error) {
            console.error('Error getting user by email:', error);
            return null;
        }
    }

    /**
     * Mark user as having completed workspace setup
     */
    public async markWorkspaceSetupComplete(userId: string): Promise<void> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();

            switch (config.type) {
                case 'mongodb':
                    await connection.collection('users').updateOne(
                        { _id: userId },
                        { $set: { hasCompletedWorkspaceSetup: true, updatedAt: new Date() } }
                    );
                    break;

                case 'mysql':
                case 'postgresql':
                    const query = 'UPDATE users SET hasCompletedWorkspaceSetup = ?, updatedAt = ? WHERE id = ?';
                    await connection.execute(query, [true, new Date().toISOString(), userId]);
                    break;

                case 'localdb':
                    return new Promise((resolve, reject) => {
                        connection.run(
                            'UPDATE users SET hasCompletedWorkspaceSetup = ?, updatedAt = ? WHERE id = ?',
                            [1, new Date().toISOString(), userId],
                            (err: any) => {
                                if (err) reject(err);
                                else resolve();
                            }
                        );
                    });

                case 'supabase':
                    const { error } = await connection
                        .from('users')
                        .update({
                            hasCompletedWorkspaceSetup: true,
                            updatedAt: new Date().toISOString()
                        })
                        .eq('id', userId);

                    if (error) {
                        throw error;
                    }
                    break;

                default:
                    throw new Error(`Database type ${config.type} not supported for user operations yet`);
            }

            console.log('User workspace setup marked as complete:', userId);
        } catch (error) {
            console.error('Error marking workspace setup as complete:', error);
            throw error;
        }
    }

    /**
     * Delete user by email
     */
    private async deleteUserByEmail(email: string): Promise<void> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();

            switch (config.type) {
                case 'mongodb':
                    await connection.collection('users').deleteOne({ email });
                    break;

                case 'mysql':
                case 'postgresql':
                    const query = 'DELETE FROM users WHERE email = ?';
                    await connection.execute(query, [email]);
                    break;

                case 'localdb':
                    return new Promise((resolve, reject) => {
                        connection.run('DELETE FROM users WHERE email = ?', [email], (err: any) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });

                case 'supabase':
                    const { error } = await connection
                        .from('users')
                        .delete()
                        .eq('email', email);

                    if (error) {
                        throw error;
                    }
                    break;

                default:
                    throw new Error(`Database type ${config.type} not supported for user operations yet`);
            }

            console.log('User deleted successfully:', email);
        } catch (error) {
            console.error('Error deleting user by email:', error);
            throw error;
        }
    }

    /**
     * Save user to database
     */
    private async saveUser(user: User): Promise<void> {
        const config = this.dbManager.getCurrentConfig();
        if (!config) {
            throw new Error('No database configuration found. Please configure database first.');
        }

        console.log('Attempting to save user to database:', {
            type: config.type,
            userId: user.id,
            email: user.email,
            role: user.role
        });

        const connection = await this.dbManager.getConnection();

        try {
            switch (config.type) {
                case 'mongodb':
                    await this.saveUserMongo(connection, user);
                    break;

                case 'mysql':
                    await this.saveUserMySQL(connection, user);
                    break;

                case 'postgresql':
                    await this.saveUserPostgreSQL(connection, user);
                    break;

                case 'localdb':
                    await this.saveUserSQLite(connection, user);
                    break;

                case 'supabase':
                    await this.saveUserSupabase(connection, user);
                    break;

                default:
                    throw new Error(`Database type ${config.type} not supported for user operations yet`);
            }

            console.log('User saved successfully:', { id: user.id, email: user.email, role: user.role });
        } catch (error) {
            console.error('Error saving user:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to save user to ${config.type} database: ${errorMessage}`);
        }
    }

    /**
     * Database-specific save methods
     */
    private async saveUserMongo(db: any, user: User): Promise<void> {
        // Ensure users collection exists and create if needed
        const collection = db.collection('users');

        // Create indexes for better performance
        await collection.createIndex({ email: 1 }, { unique: true });
        await collection.createIndex({ username: 1 }, { sparse: true });

        await collection.insertOne({
            _id: user.id,
            email: user.email,
            username: user.username,
            password: user.password,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            lastLoginAt: user.lastLoginAt,
            permissions: user.permissions,
            subscriptionId: user.subscriptionId,
            subscriptionExpiry: user.subscriptionExpiry,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar
        });
    }

    private async saveUserMySQL(connection: any, user: User): Promise<void> {
        // Create users table if it doesn't exist
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(36) PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                username VARCHAR(255),
                password VARCHAR(255) NOT NULL,
                role ENUM('admin', 'subscribed', 'normal') NOT NULL,
                isActive BOOLEAN DEFAULT TRUE,
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL,
                lastLoginAt DATETIME,
                hasCompletedWorkspaceSetup BOOLEAN DEFAULT FALSE,
                permissions JSON,
                subscriptionId VARCHAR(255),
                subscriptionExpiry DATETIME,
                firstName VARCHAR(255),
                lastName VARCHAR(255),
                avatar TEXT,
                INDEX idx_email (email),
                INDEX idx_username (username)
            )
        `);

        await connection.execute(`
            INSERT INTO users (
                id, email, username, password, role, isActive, createdAt, updatedAt,
                lastLoginAt, hasCompletedWorkspaceSetup, permissions, subscriptionId, subscriptionExpiry,
                firstName, lastName, avatar
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            user.id, user.email, user.username, user.password, user.role,
            user.isActive, user.createdAt, user.updatedAt, user.lastLoginAt,
            user.hasCompletedWorkspaceSetup || false,
            JSON.stringify(user.permissions), user.subscriptionId, user.subscriptionExpiry,
            user.firstName, user.lastName, user.avatar
        ]);
    }

    private async saveUserPostgreSQL(client: any, user: User): Promise<void> {
        try {
            console.log('Creating PostgreSQL users table if not exists...');
            // Create users table if it doesn't exist
            await client.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id VARCHAR(36) PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    username VARCHAR(255),
                    password VARCHAR(255) NOT NULL,
                    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'subscribed', 'normal')),
                    "isActive" BOOLEAN DEFAULT TRUE,
                    "createdAt" TIMESTAMP NOT NULL,
                    "updatedAt" TIMESTAMP NOT NULL,
                    "lastLoginAt" TIMESTAMP,
                    "hasCompletedWorkspaceSetup" BOOLEAN DEFAULT FALSE,
                    permissions JSONB,
                    "subscriptionId" VARCHAR(255),
                    "subscriptionExpiry" TIMESTAMP,
                    "firstName" VARCHAR(255),
                    "lastName" VARCHAR(255),
                    avatar TEXT
                )
            `);

            console.log('Creating PostgreSQL indexes...');
            // Create indexes
            await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');

            console.log('Inserting user into PostgreSQL database...');
            await client.query(`
                INSERT INTO users (
                    id, email, username, password, role, "isActive", "createdAt", "updatedAt",
                    "lastLoginAt", "hasCompletedWorkspaceSetup", permissions, "subscriptionId", "subscriptionExpiry",
                    "firstName", "lastName", avatar
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            `, [
                user.id, user.email, user.username, user.password, user.role,
                user.isActive, user.createdAt, user.updatedAt, user.lastLoginAt,
                user.hasCompletedWorkspaceSetup || false,
                JSON.stringify(user.permissions), user.subscriptionId, user.subscriptionExpiry,
                user.firstName, user.lastName, user.avatar
            ]);
            console.log('User successfully inserted into PostgreSQL database');
        } catch (error) {
            console.error('PostgreSQL save user error:', error);
            throw error;
        }
    }

    private async saveUserSQLite(db: any, user: User): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log('SQLite: Creating users table if not exists...');
            // Create users table if it doesn't exist
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    username TEXT,
                    password TEXT NOT NULL,
                    role TEXT NOT NULL CHECK (role IN ('admin', 'subscribed', 'normal')),
                    isActive INTEGER DEFAULT 1,
                    createdAt TEXT NOT NULL,
                    updatedAt TEXT NOT NULL,
                    lastLoginAt TEXT,
                    hasCompletedWorkspaceSetup INTEGER DEFAULT 0,
                    permissions TEXT,
                    subscriptionId TEXT,
                    subscriptionExpiry TEXT,
                    firstName TEXT,
                    lastName TEXT,
                    avatar TEXT
                )
            `, (err: any) => {
                if (err) {
                    console.error('SQLite: Error creating table:', err);
                    reject(err);
                    return;
                }

                console.log('SQLite: Table created successfully, inserting user...');
                // Insert user
                db.run(`
                    INSERT INTO users (
                        id, email, username, password, role, isActive, createdAt, updatedAt,
                        lastLoginAt, hasCompletedWorkspaceSetup, permissions, subscriptionId, subscriptionExpiry,
                        firstName, lastName, avatar
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    user.id, user.email, user.username, user.password, user.role,
                    user.isActive ? 1 : 0, user.createdAt.toISOString(), user.updatedAt.toISOString(),
                    user.lastLoginAt?.toISOString(), user.hasCompletedWorkspaceSetup ? 1 : 0,
                    JSON.stringify(user.permissions), user.subscriptionId, user.subscriptionExpiry?.toISOString(),
                    user.firstName, user.lastName, user.avatar
                ], (err: any) => {
                    if (err) {
                        console.error('SQLite: Error inserting user:', err);
                        reject(err);
                    } else {
                        console.log('SQLite: User inserted successfully');
                        resolve();
                    }
                });
            });
        });
    }

    private async saveUserSupabase(supabase: any, user: User): Promise<void> {
        const { error } = await supabase
            .from('users')
            .insert([{
                id: user.id,
                email: user.email,
                username: user.username,
                password: user.password,
                role: user.role,
                isActive: user.isActive,
                createdAt: user.createdAt.toISOString(),
                updatedAt: user.updatedAt.toISOString(),
                lastLoginAt: user.lastLoginAt?.toISOString(),
                hasCompletedWorkspaceSetup: user.hasCompletedWorkspaceSetup || false,
                permissions: user.permissions,
                subscriptionId: user.subscriptionId,
                subscriptionExpiry: user.subscriptionExpiry?.toISOString(),
                firstName: user.firstName,
                lastName: user.lastName,
                avatar: user.avatar
            }]);

        if (error) {
            throw error;
        }
    }

    /**
     * Mapping functions to convert database records to User objects
     */
    private mapMongoUser(mongoUser: any): User {
        return {
            id: mongoUser._id,
            email: mongoUser.email,
            username: mongoUser.username,
            password: mongoUser.password,
            role: mongoUser.role,
            isActive: mongoUser.isActive,
            createdAt: mongoUser.createdAt,
            updatedAt: mongoUser.updatedAt,
            lastLoginAt: mongoUser.lastLoginAt,
            hasCompletedWorkspaceSetup: mongoUser.hasCompletedWorkspaceSetup || false,
            permissions: mongoUser.permissions,
            subscriptionId: mongoUser.subscriptionId,
            subscriptionExpiry: mongoUser.subscriptionExpiry,
            firstName: mongoUser.firstName,
            lastName: mongoUser.lastName,
            avatar: mongoUser.avatar
        };
    }

    private mapSQLUser(sqlUser: any): User {
        return {
            id: sqlUser.id,
            email: sqlUser.email,
            username: sqlUser.username,
            password: sqlUser.password,
            role: sqlUser.role,
            isActive: sqlUser.isActive === 1 || sqlUser.isActive === true,
            createdAt: new Date(sqlUser.createdAt),
            updatedAt: new Date(sqlUser.updatedAt),
            lastLoginAt: sqlUser.lastLoginAt ? new Date(sqlUser.lastLoginAt) : undefined,
            hasCompletedWorkspaceSetup: sqlUser.hasCompletedWorkspaceSetup === 1 || sqlUser.hasCompletedWorkspaceSetup === true,
            permissions: sqlUser.permissions ? JSON.parse(sqlUser.permissions) : undefined,
            subscriptionId: sqlUser.subscriptionId,
            subscriptionExpiry: sqlUser.subscriptionExpiry ? new Date(sqlUser.subscriptionExpiry) : undefined,
            firstName: sqlUser.firstName,
            lastName: sqlUser.lastName,
            avatar: sqlUser.avatar
        };
    }

    private mapSupabaseUser(supabaseUser: any): User {
        return {
            id: supabaseUser.id,
            email: supabaseUser.email,
            username: supabaseUser.username,
            password: supabaseUser.password,
            role: supabaseUser.role,
            isActive: supabaseUser.isActive,
            createdAt: new Date(supabaseUser.createdAt),
            updatedAt: new Date(supabaseUser.updatedAt),
            lastLoginAt: supabaseUser.lastLoginAt ? new Date(supabaseUser.lastLoginAt) : undefined,
            hasCompletedWorkspaceSetup: supabaseUser.hasCompletedWorkspaceSetup || false,
            permissions: supabaseUser.permissions,
            subscriptionId: supabaseUser.subscriptionId,
            subscriptionExpiry: supabaseUser.subscriptionExpiry ? new Date(supabaseUser.subscriptionExpiry) : undefined,
            firstName: supabaseUser.firstName,
            lastName: supabaseUser.lastName,
            avatar: supabaseUser.avatar
        };
    }

    /**
     * Check if admin user exists in database
     */
    public async adminExists(): Promise<boolean> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                return false;
            }

            const connection = await this.dbManager.getConnection();

            switch (config.type) {
                case 'mongodb':
                    const adminUser = await connection.collection('users').findOne({ role: 'admin' });
                    return !!adminUser;

                case 'mysql':
                case 'postgresql':
                    const query = 'SELECT COUNT(*) as count FROM users WHERE role = ?';
                    const [rows] = await connection.execute(query, ['admin']);
                    return rows[0].count > 0;

                case 'localdb':
                    return new Promise((resolve, reject) => {
                        connection.get('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin'], (err: any, row: any) => {
                            if (err) resolve(false); // If table doesn't exist, no admin exists
                            else resolve(row.count > 0);
                        });
                    });

                case 'supabase':
                    const { data, error } = await connection
                        .from('users')
                        .select('id')
                        .eq('role', 'admin')
                        .limit(1);

                    if (error) return false;
                    return data && data.length > 0;

                default:
                    return false;
            }
        } catch (error) {
            console.error('Error checking if admin exists:', error);
            return false;
        }
    }

    /**
     * Update user profile information
     */
    public async updateUserProfile(userId: string, profileData: {
        username?: string;
        firstName?: string;
        lastName?: string;
    }): Promise<any> {
        try {
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            const now = new Date();

            // Build update object with only provided fields
            const updateFields: any = { updatedAt: now };
            if (profileData.username !== undefined) updateFields.username = profileData.username;
            if (profileData.firstName !== undefined) updateFields.firstName = profileData.firstName;
            if (profileData.lastName !== undefined) updateFields.lastName = profileData.lastName;

            switch (config.type) {
                case 'mongodb':
                    await connection.collection('users').updateOne(
                        { _id: userId },
                        { $set: updateFields }
                    );
                    break;

                case 'mysql':
                case 'postgresql':
                    const setClause = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
                    const values = Object.values(updateFields);
                    const query = `UPDATE users SET ${setClause} WHERE id = ?`;
                    await connection.execute(query, [...values, userId]);
                    break;

                case 'localdb':
                    return new Promise((resolve, reject) => {
                        const setClause = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
                        const values = Object.values(updateFields).map(val =>
                            val instanceof Date ? val.toISOString() : val
                        );
                        const query = `UPDATE users SET ${setClause} WHERE id = ?`;
                        connection.run(query, [...values, userId], (err: any) => {
                            if (err) reject(err);
                            else resolve(undefined);
                        });
                    });

                case 'supabase':
                    const { error } = await connection
                        .from('users')
                        .update(updateFields)
                        .eq('id', userId);

                    if (error) {
                        throw error;
                    }
                    break;

                default:
                    throw new Error(`Database type ${config.type} not supported for user operations yet`);
            }

            return { success: true };
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    }

    /**
     * Change user password
     */
    public async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<any> {
        try {
            // First, get the user to verify current password
            const user = await this.getUserById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Verify current password
            const isCurrentPasswordValid = await this.verifyPassword(currentPassword, user.password);
            if (!isCurrentPasswordValid) {
                throw new Error('Invalid current password');
            }

            // Validate new password
            const passwordErrors = this.validatePassword(newPassword);
            if (passwordErrors.length > 0) {
                throw new Error(passwordErrors[0].message);
            }

            // Hash new password
            const hashedNewPassword = await this.hashPassword(newPassword);

            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            const now = new Date();

            switch (config.type) {
                case 'mongodb':
                    await connection.collection('users').updateOne(
                        { _id: userId },
                        { $set: { password: hashedNewPassword, updatedAt: now } }
                    );
                    break;

                case 'mysql':
                case 'postgresql':
                    const query = 'UPDATE users SET password = ?, updatedAt = ? WHERE id = ?';
                    await connection.execute(query, [hashedNewPassword, now, userId]);
                    break;

                case 'localdb':
                    await new Promise((resolve, reject) => {
                        connection.run(
                            'UPDATE users SET password = ?, updatedAt = ? WHERE id = ?',
                            [hashedNewPassword, now.toISOString(), userId],
                            (err: any) => {
                                if (err) reject(err);
                                else resolve(undefined);
                            }
                        );
                    });
                    break;

                case 'supabase':
                    const { error } = await connection
                        .from('users')
                        .update({
                            password: hashedNewPassword,
                            updatedAt: now.toISOString()
                        })
                        .eq('id', userId);

                    if (error) {
                        throw error;
                    }
                    break;

                default:
                    throw new Error(`Database type ${config.type} not supported for user operations yet`);
            }

            return { success: true };
        } catch (error) {
            console.error('Error changing password:', error);
            throw error;
        }
    }

    /**
     * Get user by ID
     */
    public async getUserById(userId: string): Promise<User | null> {
        try {
            console.log('🔍 getUserById called with userId:', userId);
            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();

            switch (config.type) {
                case 'mongodb':
                    console.log('🔍 Searching MongoDB for user with _id:', userId);
                    const mongoUser = await connection.collection('users').findOne({ _id: userId });
                    console.log('🔍 MongoDB query result:', mongoUser ? 'User found' : 'User not found');
                    if (!mongoUser) {
                        // Let's also try to see what users exist
                        const allUsers = await connection.collection('users').find({}).toArray();
                        console.log('🔍 All users in database:', allUsers.map((u: any) => ({ _id: u._id, email: u.email })));
                    }
                    return mongoUser ? this.mapMongoUser(mongoUser) : null;

                case 'mysql':
                case 'postgresql':
                    const query = 'SELECT * FROM users WHERE id = ?';
                    const [rows] = await connection.execute(query, [userId]);
                    return rows.length > 0 ? this.mapSQLUser(rows[0]) : null;

                case 'localdb':
                    return new Promise((resolve, reject) => {
                        connection.get('SELECT * FROM users WHERE id = ?', [userId], (err: any, row: any) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(row ? this.mapSQLUser(row) : null);
                            }
                        });
                    });

                case 'supabase':
                    const { data, error } = await connection
                        .from('users')
                        .select('*')
                        .eq('id', userId)
                        .single();

                    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
                        throw error;
                    }
                    return data ? this.mapSupabaseUser(data) : null;

                default:
                    throw new Error(`Database type ${config.type} not supported for user operations yet`);
            }
        } catch (error) {
            console.error('Error getting user by ID:', error);
            return null;
        }
    }

    /**
     * Admin: Get all users with pagination and filtering
     */
    public async getAllUsers(options: {
        page?: number;
        limit?: number;
        search?: string;
        role?: string;
        isActive?: boolean;
        sortBy?: 'email' | 'username' | 'createdAt' | 'lastLoginAt';
        sortOrder?: 'asc' | 'desc';
    } = {}): Promise<{
        users: User[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        try {
            const {
                page = 1,
                limit = 20,
                search = '',
                role,
                isActive,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = options;

            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();
            const offset = (page - 1) * limit;

            switch (config.type) {
                case 'mongodb':
                    return await this.getAllUsersMongoDB(connection, { page, limit, search, role, isActive, sortBy, sortOrder, offset });

                case 'mysql':
                case 'postgresql':
                    return await this.getAllUsersSQL(connection, config.type, { page, limit, search, role, isActive, sortBy, sortOrder, offset });

                case 'localdb':
                    return await this.getAllUsersSQLite(connection, { page, limit, search, role, isActive, sortBy, sortOrder, offset });

                case 'supabase':
                    return await this.getAllUsersSupabase(connection, { page, limit, search, role, isActive, sortBy, sortOrder, offset });

                default:
                    throw new Error(`Database type ${config.type} not supported for user operations yet`);
            }
        } catch (error) {
            console.error('Error getting all users:', error);
            return {
                users: [],
                total: 0,
                page: 1,
                limit: 20,
                totalPages: 0
            };
        }
    }

    /**
     * Admin: Update user (role, status, profile)
     */
    public async updateUser(userId: string, updates: {
        email?: string;
        username?: string;
        role?: 'admin' | 'subscribed' | 'normal';
        isActive?: boolean;
        firstName?: string;
        lastName?: string;
    }, updatedBy: string): Promise<{ success: boolean; message: string; user?: User }> {
        try {
            // Prevent admin from changing their own role
            if (userId === updatedBy && updates.role && updates.role !== 'admin') {
                return {
                    success: false,
                    message: 'You cannot change your own admin role'
                };
            }

            const existingUser = await this.getUserById(userId);
            if (!existingUser) {
                return {
                    success: false,
                    message: 'User not found'
                };
            }

            // Check if email is being changed and if it already exists
            if (updates.email && updates.email !== existingUser.email) {
                const emailExists = await this.getUserByEmailForAuth(updates.email);
                if (emailExists) {
                    return {
                        success: false,
                        message: 'Email already exists'
                    };
                }
            }

            const updatedUser: User = {
                ...existingUser,
                ...updates,
                updatedAt: new Date()
            };

            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();

            switch (config.type) {
                case 'mongodb':
                    await this.updateUserMongoDB(connection, updatedUser);
                    break;

                case 'mysql':
                    await this.updateUserMySQL(connection, updatedUser);
                    break;

                case 'postgresql':
                    await this.updateUserPostgreSQL(connection, updatedUser);
                    break;

                case 'localdb':
                    await this.updateUserSQLite(connection, updatedUser);
                    break;

                case 'supabase':
                    await this.updateUserSupabase(connection, updatedUser);
                    break;

                default:
                    throw new Error(`Database type ${config.type} not supported for user operations yet`);
            }

            return {
                success: true,
                message: 'User updated successfully',
                user: updatedUser
            };
        } catch (error) {
            console.error('Error updating user:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return {
                success: false,
                message: `Failed to update user: ${errorMessage}`
            };
        }
    }

    /**
     * Admin: Delete user
     */
    public async deleteUser(userId: string, deletedBy: string): Promise<{ success: boolean; message: string }> {
        try {
            // Prevent admin from deleting themselves
            if (userId === deletedBy) {
                return {
                    success: false,
                    message: 'You cannot delete your own account'
                };
            }

            const existingUser = await this.getUserById(userId);
            if (!existingUser) {
                return {
                    success: false,
                    message: 'User not found'
                };
            }

            const config = this.dbManager.getCurrentConfig();
            if (!config) {
                throw new Error('No database configuration found');
            }

            const connection = await this.dbManager.getConnection();

            switch (config.type) {
                case 'mongodb':
                    await connection.collection('users').deleteOne({ id: userId });
                    break;

                case 'mysql':
                case 'postgresql':
                    await connection.execute('DELETE FROM users WHERE id = ?', [userId]);
                    break;

                case 'localdb':
                    await new Promise((resolve, reject) => {
                        connection.run('DELETE FROM users WHERE id = ?', [userId], (err: any) => {
                            if (err) reject(err);
                            else resolve(undefined);
                        });
                    });
                    break;

                case 'supabase':
                    const { error } = await connection
                        .from('users')
                        .delete()
                        .eq('id', userId);
                    if (error) throw error;
                    break;

                default:
                    throw new Error(`Database type ${config.type} not supported for user operations yet`);
            }

            return {
                success: true,
                message: 'User deleted successfully'
            };
        } catch (error) {
            console.error('Error deleting user:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return {
                success: false,
                message: `Failed to delete user: ${errorMessage}`
            };
        }
    }

    // Database-specific methods for getAllUsers
    private async getAllUsersMongoDB(connection: any, options: any): Promise<any> {
        const { page, limit, search, role, isActive, sortBy, sortOrder, offset } = options;

        const filter: any = {};
        if (search) {
            filter.$or = [
                { email: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } }
            ];
        }
        if (role) filter.role = role;
        if (isActive !== undefined) filter.isActive = isActive;

        const sort: any = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const [users, total] = await Promise.all([
            connection.collection('users')
                .find(filter)
                .sort(sort)
                .skip(offset)
                .limit(limit)
                .toArray(),
            connection.collection('users').countDocuments(filter)
        ]);

        return {
            users: users.map((user: any) => this.mapMongoUser(user)),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    private async getAllUsersSQL(connection: any, dbType: string, options: any): Promise<any> {
        const { page, limit, search, role, isActive, sortBy, sortOrder, offset } = options;

        let whereClause = 'WHERE 1=1';
        const params: any[] = [];

        if (search) {
            whereClause += ' AND (email LIKE ? OR username LIKE ? OR firstName LIKE ? OR lastName LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }
        if (role) {
            whereClause += ' AND role = ?';
            params.push(role);
        }
        if (isActive !== undefined) {
            whereClause += ' AND isActive = ?';
            params.push(isActive);
        }

        const orderClause = `ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
        const limitClause = `LIMIT ? OFFSET ?`;

        const [usersResult, countResult] = await Promise.all([
            connection.execute(`SELECT * FROM users ${whereClause} ${orderClause} ${limitClause}`, [...params, limit, offset]),
            connection.execute(`SELECT COUNT(*) as total FROM users ${whereClause}`, params)
        ]);

        const users = usersResult[0].map((user: any) => this.mapSQLUser(user));
        const total = countResult[0][0].total;

        return {
            users,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    private async getAllUsersSQLite(connection: any, options: any): Promise<any> {
        const { page, limit, search, role, isActive, sortBy, sortOrder, offset } = options;

        return new Promise((resolve, reject) => {
            let whereClause = 'WHERE 1=1';
            const params: any[] = [];

            if (search) {
                whereClause += ' AND (email LIKE ? OR username LIKE ? OR firstName LIKE ? OR lastName LIKE ?)';
                const searchPattern = `%${search}%`;
                params.push(searchPattern, searchPattern, searchPattern, searchPattern);
            }
            if (role) {
                whereClause += ' AND role = ?';
                params.push(role);
            }
            if (isActive !== undefined) {
                whereClause += ' AND isActive = ?';
                params.push(isActive ? 1 : 0);
            }

            const orderClause = `ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
            const limitClause = `LIMIT ? OFFSET ?`;

            // Get total count first
            connection.get(`SELECT COUNT(*) as total FROM users ${whereClause}`, params, (err: any, countRow: any) => {
                if (err) {
                    reject(err);
                    return;
                }

                const total = countRow.total;

                // Get users
                connection.all(`SELECT * FROM users ${whereClause} ${orderClause} ${limitClause}`, [...params, limit, offset], (err: any, rows: any[]) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    const users = rows.map((user: any) => this.mapSQLUser(user));
                    resolve({
                        users,
                        total,
                        page,
                        limit,
                        totalPages: Math.ceil(total / limit)
                    });
                });
            });
        });
    }

    private async getAllUsersSupabase(connection: any, options: any): Promise<any> {
        const { page, limit, search, role, isActive, sortBy, sortOrder, offset } = options;

        let query = connection.from('users').select('*', { count: 'exact' });

        if (search) {
            query = query.or(`email.ilike.%${search}%,username.ilike.%${search}%,firstName.ilike.%${search}%,lastName.ilike.%${search}%`);
        }
        if (role) {
            query = query.eq('role', role);
        }
        if (isActive !== undefined) {
            query = query.eq('isActive', isActive);
        }

        query = query.order(sortBy, { ascending: sortOrder === 'asc' });
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) throw error;

        return {
            users: data ? data.map((user: any) => this.mapSupabaseUser(user)) : [],
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        };
    }

    // Database-specific methods for updateUser
    private async updateUserMongoDB(connection: any, user: User): Promise<void> {
        await connection.collection('users').updateOne(
            { id: user.id },
            { $set: user }
        );
    }

    private async updateUserMySQL(connection: any, user: User): Promise<void> {
        await connection.execute(`
            UPDATE users SET
                email = ?, username = ?, role = ?, isActive = ?, updatedAt = ?,
                firstName = ?, lastName = ?, hasCompletedWorkspaceSetup = ?
            WHERE id = ?
        `, [
            user.email, user.username, user.role, user.isActive, user.updatedAt,
            user.firstName, user.lastName, user.hasCompletedWorkspaceSetup, user.id
        ]);
    }

    private async updateUserPostgreSQL(connection: any, user: User): Promise<void> {
        await connection.query(`
            UPDATE users SET
                email = $1, username = $2, role = $3, "isActive" = $4, "updatedAt" = $5,
                "firstName" = $6, "lastName" = $7, "hasCompletedWorkspaceSetup" = $8
            WHERE id = $9
        `, [
            user.email, user.username, user.role, user.isActive, user.updatedAt,
            user.firstName, user.lastName, user.hasCompletedWorkspaceSetup, user.id
        ]);
    }

    private async updateUserSQLite(connection: any, user: User): Promise<void> {
        return new Promise((resolve, reject) => {
            connection.run(`
                UPDATE users SET
                    email = ?, username = ?, role = ?, isActive = ?, updatedAt = ?,
                    firstName = ?, lastName = ?, hasCompletedWorkspaceSetup = ?
                WHERE id = ?
            `, [
                user.email, user.username, user.role, user.isActive ? 1 : 0, user.updatedAt.toISOString(),
                user.firstName, user.lastName, user.hasCompletedWorkspaceSetup ? 1 : 0, user.id
            ], (err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    private async updateUserSupabase(connection: any, user: User): Promise<void> {
        const { error } = await connection
            .from('users')
            .update({
                email: user.email,
                username: user.username,
                role: user.role,
                isActive: user.isActive,
                updatedAt: user.updatedAt.toISOString(),
                firstName: user.firstName,
                lastName: user.lastName,
                hasCompletedWorkspaceSetup: user.hasCompletedWorkspaceSetup
            })
            .eq('id', user.id);

        if (error) throw error;
    }
}
