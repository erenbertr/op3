"use client"

import React from 'react';
import { BaseAIProviderSettings } from './base-ai-provider-settings';
import { openaiConfig } from '@/config/ai-provider-configs';

export function OpenAISettingsView() {
    return <BaseAIProviderSettings config={openaiConfig} />;
}