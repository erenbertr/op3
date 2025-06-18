"use client"

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatabaseConfigForm } from './database-config';
import { AdminConfigForm } from './admin-config';
import { useI18n } from '@/lib/i18n';
import { DatabaseConfig, AdminConfig, apiClient } from '@/lib/api';
import { CheckCircle, Database, Shield, ArrowRight } from 'lucide-react';

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

    const handleAdminConfig = (config: AdminConfig) => {
        // The AdminConfigForm component already handles the API call and shows toast
        // We just need to handle the navigation here
        console.log('Setup wizard: Admin config received, moving to complete step');
        setAdminConfig(config);
        setCurrentStep(2); // Move to complete step
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleCompleteSetup = async () => {
        try {
            console.log('Completing setup...');
            const response = await apiClient.completeSetup();

            if (response.success) {
                console.log('Setup completed successfully, redirecting to AI providers...');
                // Redirect to AI providers page to set up AI providers
                window.location.href = '/ai-providers/openai';
            } else {
                console.error('Failed to complete setup:', response.message);
                alert('Failed to complete setup. Please try again.');
            }
        } catch (error) {
            console.error('Error completing setup:', error);
            alert('An error occurred while completing setup. Please try again.');
        }
    };

    const renderCurrentStep = () => {
        switch (currentStep) {
            case 0:
                return (
                    <DatabaseConfigForm
                        onNext={handleDatabaseConfig}
                        defaultValues={databaseConfig}
                    />
                );
            case 1:
                return (
                    <AdminConfigForm
                        onNext={handleAdminConfig}
                        onBack={handleBack}
                        defaultValues={adminConfig}
                    />
                );
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

                                <div className="text-center space-y-4">
                                    <p className="text-muted-foreground">
                                        {t('setup.complete.final.message')}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {t('setup.complete.login.description')}
                                    </p>
                                    <Button
                                        onClick={handleCompleteSetup}
                                        size="lg"
                                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3"
                                    >
                                        {t('setup.complete.login.button')}
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
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

                {/* Horizontal Steps Overview */}
                <div className="mb-8">
                    <div className="flex items-center justify-center gap-4 p-4">
                        {steps.map((step, index) => {
                            const isActive = index === currentStep;
                            const isCompleted = step.completed;

                            return (
                                <React.Fragment key={step.id}>
                                    {/* Step */}
                                    <div className={`flex items-center gap-3 transition-all duration-300 ${isActive
                                        ? 'bg-white dark:bg-gray-900 p-4 rounded-xl border-2 border-primary shadow-lg'
                                        : 'p-2'
                                        }`}>
                                        {/* Icon */}
                                        <div
                                            className={`flex items-center justify-center rounded-full transition-all duration-300 ${isActive
                                                ? 'w-12 h-12 bg-primary text-primary-foreground'
                                                : isCompleted
                                                    ? 'w-10 h-10 bg-green-500 text-white'
                                                    : 'w-10 h-10 bg-muted text-muted-foreground'
                                                }`}
                                        >
                                            {isCompleted ? (
                                                <CheckCircle className={isActive ? "h-6 w-6" : "h-5 w-5"} />
                                            ) : (
                                                <div className={`flex items-center justify-center ${isActive ? "h-6 w-6" : "h-5 w-5"}`}>
                                                    {React.cloneElement(step.icon as React.ReactElement<{ className?: string }>, {
                                                        className: isActive ? "h-6 w-6" : "h-5 w-5"
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* Title and Description - Only for active step */}
                                        {isActive && (
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-semibold truncate">{step.title}</h3>
                                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                    {step.description}
                                                </p>
                                            </div>
                                        )}

                                        {/* Badge for active step */}
                                        {isActive && isCompleted && (
                                            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 ml-2">
                                                {t('badge.complete')}
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Connector Line */}
                                    {index < steps.length - 1 && (
                                        <div className={`h-0.5 w-8 transition-all duration-300 ${isCompleted ? 'bg-green-500' : 'bg-muted'
                                            }`} />
                                    )}
                                </React.Fragment>
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
