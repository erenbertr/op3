"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OpenRouterSettingsRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to AI providers settings since OpenRouter is now integrated there
        router.replace('/settings/ai-providers');
    }, [router]);

    return (
        <div className="h-screen bg-background flex items-center justify-center">
            <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted-foreground/20 border-t-muted-foreground/40 mx-auto"></div>
                <p className="text-muted-foreground">Redirecting to AI Providers settings...</p>
            </div>
        </div>
    );
}
