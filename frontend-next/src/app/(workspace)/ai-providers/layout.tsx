"use client"

import React from 'react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function AIProvidersLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="h-screen bg-background">
            {/* Header with theme toggle */}
            <header className="border-b">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold">OP3</h1>
                        <span className="text-sm text-muted-foreground">AI Providers</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main>
                {children}
            </main>
        </div>
    );
}
