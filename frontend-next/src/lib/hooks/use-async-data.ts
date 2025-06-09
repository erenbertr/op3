import { useState, useCallback, useRef } from 'react';

interface AsyncDataState<T> {
    data: T | null;
    isLoading: boolean;
    error: string | null;
}

interface AsyncDataActions<T> {
    execute: (...args: unknown[]) => Promise<void>;
    reset: () => void;
    setData: (data: T) => void;
}

/**
 * Custom hook for managing async data fetching without useEffect.
 * Uses callback-driven approach instead of effect-driven approach.
 */
export function useAsyncData<T>(
    asyncFunction: (...args: unknown[]) => Promise<T>
): AsyncDataState<T> & AsyncDataActions<T> {
    const [state, setState] = useState<AsyncDataState<T>>({
        data: null,
        isLoading: false,
        error: null
    });

    const isMountedRef = useRef(true);

    const execute = useCallback(async (...args: unknown[]) => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const result = await asyncFunction(...args);

            // Only update state if component is still mounted
            if (isMountedRef.current) {
                setState({
                    data: result,
                    isLoading: false,
                    error: null
                });
            }
        } catch (error) {
            if (isMountedRef.current) {
                setState({
                    data: null,
                    isLoading: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
    }, [asyncFunction]);

    const reset = useCallback(() => {
        setState({
            data: null,
            isLoading: false,
            error: null
        });
    }, []);

    const setData = useCallback((data: T) => {
        setState(prev => ({ ...prev, data }));
    }, []);

    // Cleanup function to prevent state updates after unmount
    const cleanup = useCallback(() => {
        isMountedRef.current = false;
    }, []);

    return {
        ...state,
        execute,
        reset,
        setData,
        cleanup
    };
}

/**
 * Hook for managing multiple async operations
 */
export function useAsyncOperations() {
    const [operations, setOperations] = useState<Record<string, AsyncDataState<unknown>>>({});

    const executeOperation = useCallback(async <TResult>(
        key: string,
        asyncFunction: () => Promise<TResult>
    ): Promise<TResult | null> => {
        setOperations(prev => ({
            ...prev,
            [key]: { data: null, isLoading: true, error: null }
        }));

        try {
            const result = await asyncFunction();
            setOperations(prev => ({
                ...prev,
                [key]: { data: result, isLoading: false, error: null }
            }));
            return result;
        } catch (error) {
            setOperations(prev => ({
                ...prev,
                [key]: {
                    data: null,
                    isLoading: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                }
            }));
            return null;
        }
    }, []);

    const getOperation = useCallback((key: string) => {
        return operations[key] || { data: null, isLoading: false, error: null };
    }, [operations]);

    const resetOperation = useCallback((key: string) => {
        setOperations(prev => {
            const newOps = { ...prev };
            delete newOps[key];
            return newOps;
        });
    }, []);

    return {
        executeOperation,
        getOperation,
        resetOperation,
        operations
    };
}
