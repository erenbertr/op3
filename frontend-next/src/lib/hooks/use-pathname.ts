import { useSyncExternalStore } from 'react';

// Global state for pathname tracking
let currentPathname = typeof window !== 'undefined' ? window.location.pathname : '/';
const listeners = new Set<() => void>();

// Notify all listeners of pathname changes
function notifyListeners() {
    const newPathname = window.location.pathname;
    if (newPathname !== currentPathname) {
        currentPathname = newPathname;
        listeners.forEach(listener => listener());
    }
}

/**
 * Subscribe to browser navigation changes
 */
function subscribeToPathname(callback: () => void) {
    listeners.add(callback);

    const handlePopState = () => {
        notifyListeners();
    };

    // Listen to both popstate and our custom navigation events
    window.addEventListener('popstate', handlePopState);

    return () => {
        listeners.delete(callback);
        window.removeEventListener('popstate', handlePopState);
    };
}

/**
 * Get current pathname snapshot
 */
function getPathnameSnapshot(): string {
    if (typeof window === 'undefined') return '/';
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
 * Navigation utilities that work with the pathname hook
 */
export const navigationUtils = {
    pushState: (url: string) => {
        window.history.pushState(null, '', url);
        // Manually trigger the notification since pushState doesn't fire popstate
        notifyListeners();
    },

    replaceState: (url: string) => {
        window.history.replaceState(null, '', url);
        // Manually trigger the notification since replaceState doesn't fire popstate
        notifyListeners();
    }
};
