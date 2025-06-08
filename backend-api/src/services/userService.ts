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
                lastLoginAt, permissions, subscriptionId, subscriptionExpiry,
                firstName, lastName, avatar
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            user.id, user.email, user.username, user.password, user.role,
            user.isActive, user.createdAt, user.updatedAt, user.lastLoginAt,
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
                    "lastLoginAt", permissions, "subscriptionId", "subscriptionExpiry",
                    "firstName", "lastName", avatar
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            `, [
                user.id, user.email, user.username, user.password, user.role,
                user.isActive, user.createdAt, user.updatedAt, user.lastLoginAt,
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
                        lastLoginAt, permissions, subscriptionId, subscriptionExpiry,
                        firstName, lastName, avatar
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    user.id, user.email, user.username, user.password, user.role,
                    user.isActive ? 1 : 0, user.createdAt.toISOString(), user.updatedAt.toISOString(),
                    user.lastLoginAt?.toISOString(), JSON.stringify(user.permissions),
                    user.subscriptionId, user.subscriptionExpiry?.toISOString(),
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
}
