import { useToast as useToastOriginal } from './toast';

export function useToast() {
    const { addToast } = useToastOriginal();

    const toast = (options: {
        title?: string;
        description?: string;
        variant?: "default" | "destructive" | "success";
        duration?: number;
    }) => {
        addToast(options);
    };

    return { toast };
}

export const toast = (options: {
    title?: string;
    description?: string;
    variant?: "default" | "destructive" | "success";
    duration?: number;
}) => {
    // This is a simplified version for direct import
    // In a real app, you'd want to use a global toast manager
    console.warn('Direct toast import used. Use useToast hook instead.');
};
