// Re-export from the auth provider to avoid duplication
export {
    signIn,
    signUp,
    signOut,
    useSession,
    getSession
} from '@/components/providers/auth-provider';
