"use client"

import React from 'react';
import { BaseAIProviderSettings } from './base-ai-provider-settings';
import { claudeConfig } from '@/config/ai-provider-configs';

export function AnthropicSettingsView() {
    return <BaseAIProviderSettings config={claudeConfig} />;
}
