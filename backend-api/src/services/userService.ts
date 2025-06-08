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
    public async createUser(request: CreateUserRequest): Promise<CreateUserResponse> {
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
                return {
                    success: false,
                    message: 'User with this email already exists'
                };
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
            return {
                success: false,
                message: 'Failed to create user'
            };
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

        return this.createUser({
            email: config.email,
            username: config.username,
            password: config.password,
            role: 'admin'
        });
    }

    /**
     * Get user by email
     */
    private async getUserByEmail(email: string): Promise<User | null> {
        // This will be implemented based on the database type
        // For now, return null (no existing users during setup)
        return null;
    }

    /**
     * Save user to database
     */
    private async saveUser(user: User): Promise<void> {
        // This will be implemented based on the database type
        // For now, we'll store it in memory or a simple file
        // The actual implementation will depend on the configured database
        console.log('Saving user:', { id: user.id, email: user.email, role: user.role });
    }
}
