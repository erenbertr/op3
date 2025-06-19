import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";
import { toNextJsHandler } from "better-auth/next-js";
import { v4 as uuidv4 } from 'uuid';

// MongoDB connection configuration (server-side only)
const mongoConnectionString = process.env.MONGODB_URI || "mongodb://root:SV9es2TJ6plfr5uy3eWnDLReuk1zSTDrdW6ySiY78gqP5MtFz0iAcClvCGjuj7B4@64.226.89.147:5001/op3test?directConnection=true&authSource=admin";
const databaseName = process.env.MONGODB_DATABASE || "op3test";

// Create MongoDB client for Better Auth (server-side only)
const mongoClient = new MongoClient(mongoConnectionString);

const auth = betterAuth({
    // Database configuration
    database: mongodbAdapter(mongoClient.db(databaseName)),

    // Base URL configuration
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",

    // Secret for encryption and signing
    secret: process.env.BETTER_AUTH_SECRET || "your-secret-key-change-in-production",

    // Enable email and password authentication
    emailAndPassword: {
        enabled: true,
        autoSignIn: true, // Automatically sign in after successful registration
        requireEmailVerification: false, // Disable email verification for now
    },

    // Session configuration
    session: {
        expiresIn: 60 * 60 * 24, // 24 hours (in seconds)
        updateAge: 60 * 60 * 24, // Update session every 24 hours
        cookieCache: {
            enabled: true,
            maxAge: 60 * 5 // 5 minutes
        }
    },

    // User configuration
    user: {
        additionalFields: {
            hasCompletedWorkspaceSetup: {
                type: "boolean",
                defaultValue: false,
                required: false
            },
            role: {
                type: "string",
                defaultValue: "user",
                required: false
            },
            username: {
                type: "string",
                required: false
            }
        }
    },

    // Advanced configuration
    advanced: {
        crossSubDomainCookies: {
            enabled: false
        },
        useSecureCookies: process.env.NODE_ENV === "production",
        generateId: () => {
            // Use the same ID generation as the existing system
            return uuidv4();
        }
    }
});

export const { GET, POST } = toNextJsHandler(auth);
