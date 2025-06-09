"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to workspaces settings by default
        router.replace('/settings/workspaces');
    }, [router]);

    return null;
}
