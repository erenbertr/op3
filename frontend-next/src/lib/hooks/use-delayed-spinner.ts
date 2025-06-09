import { useState, useCallback, useRef } from 'react';

/**
 * Custom hook for managing delayed spinner display using state-driven approach.
 * Avoids useEffect by using callbacks and state management.
 */
export function useDelayedSpinner(delay: number = 3000) {
    const [isLoading, setIsLoading] = useState(false);
    const [showSpinner, setShowSpinner] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const startLoading = useCallback(() => {
        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        setIsLoading(true);
        setShowSpinner(false);

        // Set timeout to show spinner after delay
        timeoutRef.current = setTimeout(() => {
            setShowSpinner(true);
        }, delay);
    }, [delay]);

    const stopLoading = useCallback(() => {
        // Clear timeout and hide spinner
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        setIsLoading(false);
        setShowSpinner(false);
    }, []);

    const cleanup = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    return {
        isLoading,
        showSpinner: isLoading && showSpinner,
        startLoading,
        stopLoading,
        cleanup
    };
}
