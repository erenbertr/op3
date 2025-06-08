"use client"

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatabaseConfigForm } from './database-config';
import { AdminConfigForm } from './admin-config';
import { useI18n } from '@/lib/i18n';
import { DatabaseConfig, AdminConfig, apiClient } from '@/lib/api';
import { CheckCircle, Database, Shield } from 'lucide-react';

interface SetupStep {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    completed: boolean;
}

export function SetupWizard() {
    const { t } = useI18n();
    const [currentStep, setCurrentStep] = useState(0);
    const [databaseConfig, setDatabaseConfig] = useState<DatabaseConfig | null>(null);
    const [adminConfig, setAdminConfig] = useState<AdminConfig | null>(null);

    const steps: SetupStep[] = [
        {
            id: 'database',
            title: t('setup.database.title'),
            description: t('setup.database.description'),
            icon: <Database className="h-5 w-5" />,
            completed: !!databaseConfig,
        },
        {
            id: 'admin',
            title: t('setup.admin.title'),
            description: t('setup.admin.description'),
            icon: <Shield className="h-5 w-5" />,
            completed: !!adminConfig,
        },
        {
            id: 'complete',
            title: t('setup.complete.title'),
            description: t('setup.complete.description'),
            icon: <CheckCircle className="h-5 w-5" />,
            completed: false,
        },
    ];

    const handleDatabaseConfig = async (config: DatabaseConfig) => {
        try {
            // Save the configuration to the backend
            const result = await apiClient.saveDatabaseConfig(config);

            if (result.success) {
                setDatabaseConfig(config);
                setCurrentStep(1); // Move to admin step
            } else {
                console.error('Failed to save database configuration:', result.message);
            }
        } catch (error) {
            console.error('Error saving database configuration:', error);
        }
    };

    const handleAdminConfig = async (config: AdminConfig) => {
        try {
            // Save the admin configuration to the backend
            const result = await apiClient.saveAdminConfig(config);

            if (result.success) {
                setAdminConfig(config);
                setCurrentStep(2); // Move to complete step
            } else {
                console.error('Failed to save admin configuration:', result.message);
            }
        } catch (error) {
            console.error('Error saving admin configuration:', error);
        }
    };

    const renderCurrentStep = () => {
        switch (currentStep) {
            case 0:
                return <DatabaseConfigForm onNext={handleDatabaseConfig} />;
            case 1:
                return <AdminConfigForm onNext={handleAdminConfig} />;
            case 2:
                return (
                    <Card className="w-full max-w-2xl mx-auto">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                {t('setup.complete.title')}
                            </CardTitle>
                            <CardDescription>
                                {t('setup.complete.success.title')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                    <h3 className="font-medium text-green-900 dark:text-green-100">
                                        {t('setup.complete.database.saved')}
                                    </h3>
                                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                        {t('setup.complete.database.connected')
                                            .replace('{type}', databaseConfig?.type || '')
                                            .replace('{name}', databaseConfig?.database || '')}
                                    </p>
                                </div>

                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <h3 className="font-medium text-blue-900 dark:text-blue-100">
                                        {t('setup.admin.success')}
                                    </h3>
                                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                        Admin account created for: {adminConfig?.email}
                                    </p>
                                </div>

                                <div className="text-center">
                                    <p className="text-muted-foreground">
                                        {t('setup.complete.final.message')}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">{t('setup.title')}</h1>
                    <p className="text-muted-foreground">
                        {t('setup.subtitle')}
                    </p>
                </div>

                {/* Stacked Steps Overview */}
                <div className="max-w-2xl mx-auto mb-8">
                    <div className="relative h-32 overflow-hidden">
                        {steps.map((step, index) => {
                            const isActive = index === currentStep;
                            const isCompleted = step.completed;
                            const isFuture = index > currentStep;

                            // Calculate positioning and styling for true stacked effect
                            let zIndex = steps.length - Math.abs(index - currentStep);
                            let translateY = 0;
                            let scale = 1;
                            let opacity = 1;
                            let blur = 0;

                            if (isActive) {
                                // Active step: fully visible at the top
                                translateY = 0;
                                scale = 1;
                                opacity = 1;
                                blur = 0;
                                zIndex = steps.length;
                            } else if (isCompleted) {
                                // Completed steps: stacked behind, only top edge visible
                                const stackOffset = (currentStep - index) * 4; // 4px per step
                                translateY = -stackOffset;
                                scale = 0.98;
                                opacity = 0.8;
                                blur = 0.5;
                                zIndex = steps.length - (currentStep - index);
                            } else if (isFuture) {
                                // Future steps: stacked below, only top edge visible
                                const stackOffset = (index - currentStep) * 4; // 4px per step
                                translateY = 96 + stackOffset; // Position below active card
                                scale = 0.98;
                                opacity = 0.7;
                                blur = 0.5;
                                zIndex = steps.length - (index - currentStep);
                            }

                            return (
                                <div
                                    key={step.id}
                                    className="absolute inset-x-0 transition-all duration-700 ease-in-out"
                                    style={{
                                        transform: `translateY(${translateY}px) scale(${scale})`,
                                        zIndex,
                                        opacity,
                                        filter: `blur(${blur}px)`,
                                        height: '120px', // Fixed height for consistent stacking
                                    }}
                                >
                                    <div
                                        className={`p-6 rounded-xl border-2 shadow-lg transition-all duration-300 h-full overflow-hidden ${isActive
                                            ? 'border-primary bg-white dark:bg-gray-900 shadow-xl'
                                            : isCompleted
                                                ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900'
                                                : 'border-muted bg-gray-100 dark:bg-gray-800'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div
                                                className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${isCompleted
                                                    ? 'bg-green-500 text-white'
                                                    : isActive
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-muted text-muted-foreground'
                                                    }`}
                                            >
                                                {isCompleted ? (
                                                    <CheckCircle className="h-6 w-6" />
                                                ) : (
                                                    <div className="h-6 w-6">{step.icon}</div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-lg font-semibold">{step.title}</h3>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {step.description}
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                {isCompleted && (
                                                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                                        {t('badge.complete')}
                                                    </Badge>
                                                )}
                                                {isActive && !isCompleted && (
                                                    <Badge variant="default">
                                                        {t('badge.current')}
                                                    </Badge>
                                                )}
                                                {isFuture && (
                                                    <Badge variant="outline" className="opacity-60">
                                                        {t('badge.upcoming')}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Current Step Content */}
                <div className="mb-8">
                    {renderCurrentStep()}
                </div>
            </div>
        </div>
    );
}
