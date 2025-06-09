"use client"

import { AppWrapper } from '@/components/app-wrapper';

/**
 * Unified workspace route handler
 * 
 * This catch-all route handles all workspace-related URLs:
 * - /workspaces
 * - /personalities  
 * - /statistics
 * - /settings/workspaces
 * - /settings/ai-providers
 * - /ws/[workspaceId]
 * - /ws/[workspaceId]/chat/[chatId]
 * - /add/workspace
 * - /add/chat/[workspaceId]
 * 
 * All routing logic is handled by WorkspaceApplication component
 * for consistent SPA behavior regardless of entry point.
 */
export default function WorkspacePage() {
    return <AppWrapper />;
}
