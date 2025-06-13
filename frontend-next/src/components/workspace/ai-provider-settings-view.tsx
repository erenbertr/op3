"use client"

import React, { useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AIProviderManagement } from './ai-provider-management';
import { useSession } from '@/lib/temp-auth';

export function AIProviderSettingsView() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const aiProviderManagementRef = useRef<{ handleAddProvider: () => void } | null>(null);

    const { data: session } = useSession();

    React.useLayoutEffect(() => {
        if (!session?.user) {
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
                router.replace('/ai-providers/openai');
            }, 100);
        }
    }, [session?.user, router, searchParams]);

    if (!session?.user) {
        return null;
    }

    return (
        <AIProviderManagement ref={aiProviderManagementRef} />
    );
}
