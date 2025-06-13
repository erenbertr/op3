// This file will be used only on the server side for the API route
// Client-side auth is handled by auth-client.ts

// For now, let's create a simple server-side only auth configuration
// that will be imported only in the API route

export const authConfig = {
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    secret: process.env.BETTER_AUTH_SECRET || "your-secret-key-change-in-production",
    emailAndPassword: {
        enabled: true,
        autoSignIn: true,
        requireEmailVerification: false,
    },
    session: {
        expiresIn: 60 * 60 * 24, // 24 hours
        updateAge: 60 * 60 * 24,
        cookieCache: {
            enabled: true,
            maxAge: 60 * 5
        }
    },
    user: {
        additionalFields: {
            hasCompletedWorkspaceSetup: {
                type: "boolean" as const,
                defaultValue: false,
                required: false
            },
            role: {
                type: "string" as const,
                defaultValue: "user",
                required: false
            },
            username: {
                type: "string" as const,
                required: false
            }
        }
    }
};


