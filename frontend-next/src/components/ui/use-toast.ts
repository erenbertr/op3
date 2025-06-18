// Re-export the existing toast functionality
export { useToast } from './toast';

// Create a toast function that can be used directly
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
