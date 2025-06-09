"use client"

import React from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
    const router = useRouter();

    // Immediate redirect using useLayoutEffect for routing
    React.useLayoutEffect(() => {
        router.replace('/settings/workspaces');
    }, [router]);

    return null;
}
