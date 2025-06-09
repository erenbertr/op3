import { useSyncExternalStore } from 'react';

// Global state for pathname tracking
let currentPathname = '/';
const listeners = new Set<() => void>();
let isInitialized = false;

// Initialize pathname safely
function initializePathname() {
    if (typeof window !== 'undefined' && !isInitialized) {
        currentPathname = window.location.pathname;
        isInitialized = true;
    }
}

// Notify all listeners of pathname changes
function notifyListeners() {
    if (typeof window === 'undefined') return;

    const newPathname = window.location.pathname;
    if (newPathname !== currentPathname) {
        currentPathname = newPathname;
        listeners.forEach(listener => {
            try {
                listener();
            } catch (error) {
                console.error('Error in pathname listener:', error);
            }
        });
    }
}

/**
 * Subscribe to browser navigation changes
 */
function subscribeToPathname(callback: () => void) {
    // Initialize on first subscription
    initializePathname();

    listeners.add(callback);

    const handlePopState = () => {
        notifyListeners();
    };

    const handleBeforeUnload = () => {
        // Clean up on page unload
        listeners.clear();
    };

    // Listen to navigation events
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
        listeners.delete(callback);
        window.removeEventListener('popstate', handlePopState);
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
}

/**
 * Get current pathname snapshot with guaranteed accuracy
 */
function getPathnameSnapshot(): string {
    if (typeof window === 'undefined') return '/';

    // Always sync with actual browser state
    const browserPathname = window.location.pathname;
    if (browserPathname !== currentPathname) {
        currentPathname = browserPathname;
    }

    return currentPathname;
}

/**
 * Server-side snapshot for SSR
 */
function getServerPathnameSnapshot(): string {
    return '/';
}

/**
 * Custom hook for tracking browser pathname changes using useSyncExternalStore.
 * Replaces useEffect pattern for listening to navigation events.
 */
export function usePathname() {
    return useSyncExternalStore(
        subscribeToPathname,
        getPathnameSnapshot,
        getServerPathnameSnapshot
    );
}

/**
 * Robust navigation utilities that work with the pathname hook
 */
export const navigationUtils = {
    pushState: (url: string) => {
        if (typeof window === 'undefined') return;

        try {
            // Normalize URL
            const normalizedUrl = url.startsWith('/') ? url : `/${url}`;

            // Only navigate if URL is different
            if (window.location.pathname !== normalizedUrl) {
                window.history.pushState(null, '', normalizedUrl);
                // Force immediate notification
                setTimeout(() => notifyListeners(), 0);
            }
        } catch (error) {
            console.error('Navigation error:', error);
        }
    },

    replaceState: (url: string) => {
        if (typeof window === 'undefined') return;

        try {
            // Normalize URL
            const normalizedUrl = url.startsWith('/') ? url : `/${url}`;

            window.history.replaceState(null, '', normalizedUrl);
            // Force immediate notification
            setTimeout(() => notifyListeners(), 0);
        } catch (error) {
            console.error('Navigation error:', error);
        }
    },

    // Get current pathname (useful for debugging)
    getCurrentPathname: () => {
        return typeof window !== 'undefined' ? window.location.pathname : '/';
    }
};
