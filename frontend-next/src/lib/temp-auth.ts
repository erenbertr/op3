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

// Mock session hook for now
export function useSession() {
    const [session, setSession] = useState<{ data: Session | null; isPending: boolean }>({
        data: null,
        isPending: true
    });

    useEffect(() => {
        // Simulate loading
        const timer = setTimeout(() => {
            setSession({
                data: null, // No session for now
                isPending: false
            });
        }, 100);

        return () => clearTimeout(timer);
    }, []);

    return session;
}

// Mock sign in function
export async function signIn(options: { email: string; password: string }) {
    // This will be replaced with actual Better Auth implementation
    throw new Error('Sign in not implemented yet');
}

// Mock sign up function  
export async function signUp(options: { email: string; password: string; name?: string }) {
    // This will be replaced with actual Better Auth implementation
    throw new Error('Sign up not implemented yet');
}

// Mock sign out function
export async function signOut() {
    // This will be replaced with actual Better Auth implementation
    console.log('Sign out not implemented yet');
}
