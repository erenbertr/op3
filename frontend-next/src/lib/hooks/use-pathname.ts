import { useSyncExternalStore } from 'react';

/**
 * Subscribe to browser navigation changes (popstate events)
 */
function subscribeToPathname(callback: () => void) {
    const handlePopState = () => {
        callback();
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
        window.removeEventListener('popstate', handlePopState);
    };
}

/**
 * Get current pathname snapshot
 */
function getPathnameSnapshot(): string {
    if (typeof window === 'undefined') return '/';
    return window.location.pathname;
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
        window.dispatchEvent(new PopStateEvent('popstate'));
    },
    
    replaceState: (url: string) => {
        window.history.replaceState(null, '', url);
        window.dispatchEvent(new PopStateEvent('popstate'));
    }
};
