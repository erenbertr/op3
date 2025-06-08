"use client"

import React, { useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatabaseConfigForm } from './database-config';
import { useI18n } from '@/lib/i18n';
import { DatabaseConfig, apiClient } from '@/lib/api';
import { CheckCircle, Settings, Database } from 'lucide-react';

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

  const steps: SetupStep[] = [
    {
      id: 'database',
      title: t('setup.database.title'),
      description: t('setup.database.description'),
      icon: <Database className="h-5 w-5" />,
      completed: !!databaseConfig,
    },
    // Future steps will be added here
    {
      id: 'complete',
      title: 'Setup Complete',
      description: 'Your application is ready to use',
      icon: <CheckCircle className="h-5 w-5" />,
      completed: false,
    },
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleDatabaseConfig = async (config: DatabaseConfig) => {
    try {
      // Save the configuration to the backend
      const result = await apiClient.saveDatabaseConfig(config);
      
      if (result.success) {
        setDatabaseConfig(config);
        setCurrentStep(1); // Move to next step
      } else {
        console.error('Failed to save database configuration:', result.message);
      }
    } catch (error) {
      console.error('Error saving database configuration:', error);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return <DatabaseConfigForm onNext={handleDatabaseConfig} />;
      case 1:
        return (
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Setup Complete
              </CardTitle>
              <CardDescription>
                Your OP3 application has been successfully configured!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h3 className="font-medium text-green-900 dark:text-green-100">
                    Database Configuration Saved
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Connected to {databaseConfig?.type} database: {databaseConfig?.database}
                  </p>
                </div>
                
                <div className="text-center">
                  <p className="text-muted-foreground">
                    You can now start using your application. Additional configuration steps will be available in future updates.
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
            Configure your application settings to get started
          </p>
        </div>

        {/* Progress */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">
              {t('setup.step')} {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}% complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps Overview */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="grid gap-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  index === currentStep
                    ? 'border-primary bg-primary/5'
                    : step.completed
                    ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                    : 'border-muted bg-muted/30'
                }`}
              >
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    step.completed
                      ? 'bg-green-500 text-white'
                      : index === currentStep
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    step.icon
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
                {step.completed && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    Complete
                  </Badge>
                )}
                {index === currentStep && !step.completed && (
                  <Badge variant="default">
                    Current
                  </Badge>
                )}
              </div>
            ))}
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
