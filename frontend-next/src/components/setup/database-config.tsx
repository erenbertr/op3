"use client"

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Database } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { apiClient, DatabaseConfig } from '@/lib/api';

// Create schema function that takes translation function
const createDatabaseSchema = (t: (key: string) => string) => z.object({
    type: z.enum(['mongodb', 'mysql', 'postgresql', 'localdb']),
    host: z.string().optional(),
    port: z.number().optional(),
    database: z.string().min(1, t('validation.database.required')),
    username: z.string().optional(),
    password: z.string().optional(),
    connectionString: z.string().optional(),
    ssl: z.boolean().optional(),
});

type DatabaseFormData = z.infer<ReturnType<typeof createDatabaseSchema>>;

interface DatabaseConfigProps {
    onNext: (config: DatabaseConfig) => void;
}

export function DatabaseConfigForm({ onNext }: DatabaseConfigProps) {
    const { t } = useI18n();
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [connectionMessage, setConnectionMessage] = useState('');

    const databaseSchema = createDatabaseSchema(t);
    const form = useForm<DatabaseFormData>({
        resolver: zodResolver(databaseSchema),
        defaultValues: {
            type: 'postgresql',
            host: 'localhost',
            port: 5432,
            database: '',
            username: '',
            password: '',
            connectionString: '',
            ssl: false,
        },
    });

    const watchedType = form.watch('type');
    const watchedValues = form.watch();

    // Clear connection status when form values change
    useEffect(() => {
        if (connectionStatus !== 'idle') {
            setConnectionStatus('idle');
            setConnectionMessage('');
        }
    }, [watchedValues.type, watchedValues.database, watchedValues.connectionString, watchedValues.host, watchedValues.port, watchedValues.username, watchedValues.password]);

    const testConnection = async () => {
        const formData = form.getValues();

        // Clear any existing errors first
        form.clearErrors();

        // Validate required fields based on database type
        const config: DatabaseConfig = {
            type: formData.type,
            database: formData.database,
        };

        if (formData.type === 'mongodb') {
            if (!formData.connectionString) {
                form.setError('connectionString', { message: t('validation.connectionString.required') });
                return;
            }
            config.connectionString = formData.connectionString;
        } else if (formData.type === 'localdb') {
            // For SQLite, database field is the file path
            if (!formData.database.endsWith('.db') && !formData.database.endsWith('.sqlite')) {
                form.setError('database', { message: t('validation.localdb.format') });
                return;
            }
        } else {
            // MySQL and PostgreSQL
            if (!formData.host || !formData.port || !formData.username || !formData.password) {
                if (!formData.host) form.setError('host', { message: t('validation.host.required') });
                if (!formData.port) form.setError('port', { message: t('validation.port.required') });
                if (!formData.username) form.setError('username', { message: t('validation.username.required') });
                if (!formData.password) form.setError('password', { message: t('validation.password.required') });
                return;
            }
            config.host = formData.host;
            config.port = formData.port;
            config.username = formData.username;
            config.password = formData.password;
            config.ssl = formData.ssl;
        }

        setIsTestingConnection(true);
        setConnectionMessage('');

        try {
            const result = await apiClient.testDatabaseConnection(config);

            if (result.success) {
                setConnectionStatus('success');
                setConnectionMessage(result.message);
            } else {
                setConnectionStatus('error');
                setConnectionMessage(result.message);
            }
        } catch (error) {
            setConnectionStatus('error');
            setConnectionMessage(error instanceof Error ? error.message : t('validation.connection.failed'));
        } finally {
            setIsTestingConnection(false);
        }
    };

    const onSubmit = async (data: DatabaseFormData) => {
        const config: DatabaseConfig = {
            type: data.type,
            database: data.database,
        };

        if (data.type === 'mongodb') {
            config.connectionString = data.connectionString;
        } else if (data.type !== 'localdb') {
            config.host = data.host;
            config.port = data.port;
            config.username = data.username;
            config.password = data.password;
            config.ssl = data.ssl;
        }

        // Test connection first
        setIsTestingConnection(true);
        try {
            const result = await apiClient.testDatabaseConnection(config);

            if (result.success) {
                setConnectionStatus('success');
                setConnectionMessage(result.message);
                onNext(config);
            } else {
                setConnectionStatus('error');
                setConnectionMessage(result.message);
            }
        } catch (error) {
            setConnectionStatus('error');
            setConnectionMessage(error instanceof Error ? error.message : t('validation.connection.failed'));
        } finally {
            setIsTestingConnection(false);
        }
    };

    const renderDatabaseFields = () => {
        switch (watchedType) {
            case 'mongodb':
                return (
                    <FormField
                        control={form.control}
                        name="connectionString"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('setup.database.connectionString')}</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="mongodb://localhost:27017/mydb"
                                        value={field.value || ''}
                                        onChange={(e) => {
                                            field.onChange(e.target.value);
                                            // Clear the specific error for this field
                                            if (form.formState.errors.connectionString) {
                                                form.clearErrors('connectionString');
                                            }
                                            // Reset connection status
                                            if (connectionStatus !== 'idle') {
                                                setConnectionStatus('idle');
                                                setConnectionMessage('');
                                            }
                                        }}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                );

            case 'localdb':
                return null; // Only database name (file path) is needed

            default: // mysql, postgresql
                return (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="host"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('setup.database.host')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="localhost"
                                                value={field.value || ''}
                                                onChange={(e) => {
                                                    field.onChange(e.target.value);
                                                    if (form.formState.errors.host) {
                                                        form.clearErrors('host');
                                                    }
                                                    // Reset connection status
                                                    if (connectionStatus !== 'idle') {
                                                        setConnectionStatus('idle');
                                                        setConnectionMessage('');
                                                    }
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="port"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('setup.database.port')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                placeholder={watchedType === 'mysql' ? '3306' : '5432'}
                                                value={field.value || ''}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    // Convert to number or undefined for empty string
                                                    field.onChange(value === '' ? undefined : parseInt(value) || undefined);
                                                    if (form.formState.errors.port) {
                                                        form.clearErrors('port');
                                                    }
                                                    // Reset connection status
                                                    if (connectionStatus !== 'idle') {
                                                        setConnectionStatus('idle');
                                                        setConnectionMessage('');
                                                    }
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="username"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('setup.database.username')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                value={field.value || ''}
                                                onChange={(e) => {
                                                    field.onChange(e.target.value);
                                                    if (form.formState.errors.username) {
                                                        form.clearErrors('username');
                                                    }
                                                    // Reset connection status
                                                    if (connectionStatus !== 'idle') {
                                                        setConnectionStatus('idle');
                                                        setConnectionMessage('');
                                                    }
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('setup.database.password')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                value={field.value || ''}
                                                onChange={(e) => {
                                                    field.onChange(e.target.value);
                                                    if (form.formState.errors.password) {
                                                        form.clearErrors('password');
                                                    }
                                                    // Reset connection status
                                                    if (connectionStatus !== 'idle') {
                                                        setConnectionStatus('idle');
                                                        setConnectionMessage('');
                                                    }
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </>
                );
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    {t('setup.database.title')}
                </CardTitle>
                <CardDescription>
                    {t('setup.database.description')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('setup.database.type')}</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="postgresql">{t('database.type.postgresql')}</SelectItem>
                                            <SelectItem value="mysql">{t('database.type.mysql')}</SelectItem>
                                            <SelectItem value="mongodb">{t('database.type.mongodb')}</SelectItem>
                                            <SelectItem value="localdb">{t('database.type.localdb')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="database"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        {watchedType === 'localdb'
                                            ? t('setup.database.filePath')
                                            : t('setup.database.name')
                                        }
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={
                                                watchedType === 'localdb'
                                                    ? './data/myapp.db'
                                                    : 'myapp'
                                            }
                                            value={field.value || ''}
                                            onChange={(e) => {
                                                field.onChange(e.target.value);
                                                // Clear the specific error for this field
                                                if (form.formState.errors.database) {
                                                    form.clearErrors('database');
                                                }
                                                // Reset connection status
                                                if (connectionStatus !== 'idle') {
                                                    setConnectionStatus('idle');
                                                    setConnectionMessage('');
                                                }
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {renderDatabaseFields()}

                        {connectionStatus !== 'idle' && (
                            <div className="flex items-center gap-2">
                                {connectionStatus === 'success' ? (
                                    <Badge variant="default" className="bg-green-500">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        {t('status.success')}
                                    </Badge>
                                ) : (
                                    <Badge variant="destructive">
                                        <XCircle className="h-3 w-3 mr-1" />
                                        {t('status.error')}
                                    </Badge>
                                )}
                                <span className="text-sm text-muted-foreground">
                                    {connectionMessage}
                                </span>
                            </div>
                        )}

                        <div className="flex gap-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={testConnection}
                                disabled={isTestingConnection}
                            >
                                {isTestingConnection ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t('status.testing')}
                                    </>
                                ) : (
                                    t('button.testConnection')
                                )}
                            </Button>

                            <Button
                                type="submit"
                                disabled={connectionStatus !== 'success'}
                            >
                                {t('button.next')}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
