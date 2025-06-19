"use client"

import React from 'react';
import { BaseAIProviderSettings } from './base-ai-provider-settings';
import { googleConfig } from '@/config/ai-provider-configs';

export function GoogleSettingsView() {
    return <BaseAIProviderSettings config={googleConfig} />;
}