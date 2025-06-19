// Temporary auth implementation while we migrate to Better Auth
// This provides the same interface as Better Auth but uses the old system

import { useState, useEffect } from 'react';

export interface User {
    id: string;
    email: string;
    hasCompletedWorkspaceSetup: boolean;
    role?: string;
    username?: string;
}

export interface Session {
    user: User;
}

// Mock session hook that checks localStorage
export function useSession() {
    const [session, setSession] = useState<{ data: Session | null; isPending: boolean }>({
        data: null,
        isPending: true
    });

    useEffect(() => {
        // Check for existing session in localStorage
        const checkSession = () => {
            try {
                const token = localStorage.getItem('op3_auth_token');
                const userStr = localStorage.getItem('op3_auth_user');

                if (token && userStr) {
                    const user = JSON.parse(userStr);
                    setSession({
                        data: { user },
                        isPending: false
                    });
                } else {
                    setSession({
                        data: null,
                        isPending: false
                    });
                }
            } catch (error) {
                setSession({
                    data: null,
                    isPending: false
                });
            }
        };

        // Initial check with a small delay to ensure localStorage is ready
        const timer = setTimeout(checkSession, 100);

        // Listen for storage changes (for cross-tab synchronization)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'op3_auth_token' || e.key === 'op3_auth_user') {
                checkSession();
            }
        };

        window.addEventListener('storage', handleStorageChange);

        // Listen for custom auth events (for same-tab updates)
        const handleAuthChange = () => {
            checkSession();
        };

        window.addEventListener('auth-change', handleAuthChange);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('auth-change', handleAuthChange);
        };
    }, []);

    return session;
}

// Mock sign in function that works with the existing backend
export const signIn = {
    email: async (options: { email: string; password: string }) => {
        try {
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006/api/v1';

            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(options),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    error: {
                        message: data.error?.message || 'Login failed'
                    }
                };
            }

            if (data.success && data.user && data.token) {
                // Store in localStorage for now (will be replaced with Better Auth)
                localStorage.setItem('op3_auth_token', data.token);
                localStorage.setItem('op3_auth_user', JSON.stringify(data.user));

                // Trigger a custom event to update the session without page reload
                window.dispatchEvent(new CustomEvent('auth-change'));

                return {
                    data: {
                        user: data.user
                    }
                };
            } else {
                return {
                    error: {
                        message: data.message || 'Login failed'
                    }
                };
            }
        } catch (error) {
            return {
                error: {
                    message: error instanceof Error ? error.message : 'Login failed'
                }
            };
        }
    }
};

// Mock sign up function that works with the existing backend
export const signUp = {
    email: async (options: { email: string; password: string; name?: string }) => {
        try {
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006/api/v1';

            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: options.email,
                    password: options.password,
                    name: options.name
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    error: {
                        message: data.error?.message || 'Registration failed'
                    }
                };
            }

            if (data.success && data.user && data.token) {
                // Store in localStorage for now (will be replaced with Better Auth)
                localStorage.setItem('op3_auth_token', data.token);
                localStorage.setItem('op3_auth_user', JSON.stringify(data.user));

                // Trigger a custom event to update the session without page reload
                window.dispatchEvent(new CustomEvent('auth-change'));

                return {
                    data: {
                        user: data.user
                    }
                };
            } else {
                return {
                    error: {
                        message: data.message || 'Registration failed'
                    }
                };
            }
        } catch (error) {
            return {
                error: {
                    message: error instanceof Error ? error.message : 'Registration failed'
                }
            };
        }
    }
};

// Mock sign out function
export async function signOut() {
    try {
        // Clear localStorage
        localStorage.removeItem('op3_auth_token');
        localStorage.removeItem('op3_auth_user');

        // Trigger a custom event to update the session without page reload
        window.dispatchEvent(new CustomEvent('auth-change'));

        return { success: true };
    } catch (error) {
        console.error('Sign out error:', error);
        return { error: 'Sign out failed' };
    }
}
