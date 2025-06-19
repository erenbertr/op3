"use client"

import React from 'react';
import { BaseAIProviderSettings } from './base-ai-provider-settings';
import { grokConfig } from '@/config/ai-provider-configs';

export function GrokSettingsView() {
    return <BaseAIProviderSettings config={grokConfig} />;
}