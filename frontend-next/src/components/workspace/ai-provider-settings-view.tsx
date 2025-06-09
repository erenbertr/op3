"use client"

import React, { useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AIProviderManagement } from './ai-provider-management';
import { authService } from '@/lib/auth';

export function AIProviderSettingsView() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const aiProviderManagementRef = useRef<{ handleAddProvider: () => void } | null>(null);

    const user = authService.getCurrentUser();

    React.useLayoutEffect(() => {
        if (!user) {
            router.push('/');
            return;
        }

        // Check if we should trigger the add provider action
        const action = searchParams.get('action');
        if (action === 'add' && aiProviderManagementRef.current) {
            // Trigger add provider after component mounts
            setTimeout(() => {
                aiProviderManagementRef.current?.handleAddProvider();
                // Remove the action parameter from URL
                router.replace('/settings/ai-providers');
            }, 100);
        }
    }, [user, router, searchParams]);

    if (!user) {
        return null;
    }

    return (
        <AIProviderManagement ref={aiProviderManagementRef} />
    );
}
