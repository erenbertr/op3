export interface AuthUser {
    id: string;
    email: string;
    hasCompletedWorkspaceSetup: boolean;
    token: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface LoginResponse {
    success: boolean;
    message: string;
    user?: AuthUser;
    token?: string;
}

const AUTH_TOKEN_KEY = 'op3_auth_token';
const AUTH_USER_KEY = 'op3_auth_user';

export class AuthService {
    private static instance: AuthService;

    private constructor() { }

    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    /**
     * Login user and store token
     */
    async login(credentials: LoginCredentials): Promise<LoginResponse> {
        try {
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006/api/v1';

            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.error?.message || 'Login failed'
                };
            }

            if (data.success && data.user && data.token) {
                const authUser: AuthUser = {
                    id: data.user.id,
                    email: data.user.email,
                    hasCompletedWorkspaceSetup: data.user.hasCompletedWorkspaceSetup,
                    token: data.token
                };

                // Store in localStorage
                this.setAuthData(authUser);

                return {
                    success: true,
                    message: data.message,
                    user: authUser,
                    token: data.token
                };
            } else {
                return {
                    success: false,
                    message: data.message || 'Login failed'
                };
            }
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Login failed'
            };
        }
    }

    /**
     * Logout user and clear stored data
     */
    logout(): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
    }

    /**
     * Get current authenticated user from localStorage
     */
    getCurrentUser(): AuthUser | null {
        if (typeof window === 'undefined') return null;
        try {
            const userStr = localStorage.getItem(AUTH_USER_KEY);
            const token = localStorage.getItem(AUTH_TOKEN_KEY);

            if (!userStr || !token) {
                return null;
            }

            const user = JSON.parse(userStr);
            return { ...user, token };
        } catch (error) {
            console.error('Error getting current user:', error);
            this.logout(); // Clear corrupted data
            return null;
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        const user = this.getCurrentUser();
        return !!user && !!user.token;
    }

    /**
     * Validate token format (basic JWT structure check)
     */
    private isValidJWTFormat(token: string): boolean {
        if (!token) return false;
        const parts = token.split('.');
        return parts.length === 3;
    }

    /**
     * Check if current token is valid and clear if not
     */
    validateAndCleanToken(): boolean {
        const token = this.getToken();
        if (token && !this.isValidJWTFormat(token)) {
            console.warn('Invalid token format detected, clearing authentication data');
            this.logout();
            return false;
        }
        return !!token;
    }

    /**
     * Get auth token
     */
    getToken(): string | null {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem(AUTH_TOKEN_KEY);
    }

    /**
     * Update user data (e.g., after workspace setup completion)
     */
    updateUser(updates: Partial<AuthUser>): void {
        const currentUser = this.getCurrentUser();
        if (currentUser) {
            const updatedUser = { ...currentUser, ...updates };
            this.setAuthData(updatedUser);
        }
    }

    /**
     * Store auth data in localStorage
     */
    private setAuthData(user: AuthUser): void {
        if (typeof window === 'undefined') return;
        localStorage.setItem(AUTH_TOKEN_KEY, user.token);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify({
            id: user.id,
            email: user.email,
            hasCompletedWorkspaceSetup: user.hasCompletedWorkspaceSetup
        }));
    }

    /**
     * Check workspace setup status from backend
     */
    async checkWorkspaceSetup(): Promise<boolean> {
        try {
            // In real implementation, this would call the backend API
            // For now, we'll use the stored user data
            const user = this.getCurrentUser();
            return user?.hasCompletedWorkspaceSetup || false;
        } catch (error) {
            console.error('Error checking workspace setup:', error);
            return false;
        }
    }
}

export const authService = AuthService.getInstance();
