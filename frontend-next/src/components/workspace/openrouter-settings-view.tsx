"use client"

import React from 'react';
import { BaseAIProviderSettings } from './base-ai-provider-settings';
import { openrouterConfig } from '@/config/ai-provider-configs';

export function OpenRouterSettingsView() {
    return <BaseAIProviderSettings config={openrouterConfig} />;
}