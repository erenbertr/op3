"use client"

import React from 'react';
import { createAuthClient } from "better-auth/react";

// Create auth client
const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
});

interface AuthProviderProps {
    children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    return (
        <authClient.Provider>
            {children}
        </authClient.Provider>
    );
}

// Export auth methods for use in components
export const {
    signIn,
    signUp,
    signOut,
    useSession,
    getSession
} = authClient;
