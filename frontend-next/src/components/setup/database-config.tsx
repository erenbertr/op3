"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { DatabaseConfig } from '@/lib/api';
import { useDatabaseConnectionTest } from '@/lib/hooks/use-query-hooks';

// Create schema function that takes translation function
const createDatabaseSchema = (t: (key: string) => string) => z.object({
    type: z.enum(['mongodb', 'mysql', 'postgresql', 'localdb', 'supabase', 'convex', 'firebase', 'planetscale', 'neon', 'turso']),
    host: z.string().optional(),
    port: z.number().optional(),
    database: z.string().min(1, t('validation.database.required')),
    username: z.string().optional(),
    password: z.string().optional(),
    connectionString: z.string().optional(),
    ssl: z.boolean().optional(),
    // New fields for modern providers
    url: z.string().optional(),
    apiKey: z.string().optional(),
    projectId: z.string().optional(),
    authToken: z.string().optional(),
    region: z.string().optional(),
});

type DatabaseFormData = z.infer<ReturnType<typeof createDatabaseSchema>>;

interface DatabaseConfigProps {
    onNext: (config: DatabaseConfig) => void;
    onBack?: () => void;
    defaultValues?: DatabaseConfig | null;
}

export function DatabaseConfigForm({ onNext, onBack, defaultValues }: DatabaseConfigProps) {
    const { t } = useI18n();
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [connectionMessage, setConnectionMessage] = useState('');

    // Use TanStack Query for database connection testing
    const connectionTestMutation = useDatabaseConnectionTest();

    const databaseSchema = createDatabaseSchema(t);

    // Create form default values based on props or fallback defaults
    const getDefaultValues = useCallback((): DatabaseFormData => {
        if (defaultValues) {
            return {
                type: defaultValues.type || 'postgresql',
                host: defaultValues.host || 'localhost',
                port: defaultValues.port || 5432,
                database: defaultValues.database || '',
                username: defaultValues.username || '',
                password: defaultValues.password || '',
                connectionString: defaultValues.connectionString || '',
                ssl: defaultValues.ssl || false,
                url: defaultValues.url || '',
                apiKey: defaultValues.apiKey || '',
                projectId: defaultValues.projectId || '',
                authToken: defaultValues.authToken || '',
                region: defaultValues.region || '',
            };
        }
        return {
            type: 'postgresql',
            host: 'localhost',
            port: 5432,
            database: '',
            username: '',
            password: '',
            connectionString: '',
            ssl: false,
            url: '',
            apiKey: '',
            projectId: '',
            authToken: '',
            region: '',
        };
    }, [defaultValues]);

    const form = useForm<DatabaseFormData>({
        resolver: zodResolver(databaseSchema),
        defaultValues: getDefaultValues(),
    });

    // Reset form when defaultValues change - use a ref to track if we've already reset
    const hasResetRef = useRef(false);
    useEffect(() => {
        if (!hasResetRef.current && defaultValues) {
            const newDefaults = getDefaultValues();
            form.reset(newDefaults);
            hasResetRef.current = true;
        }
    }, [defaultValues, getDefaultValues, form]);

    const watchedType = form.watch('type');

    // Clear connection status when specific form values change
    const clearConnectionStatus = useCallback(() => {
        if (connectionStatus !== 'idle') {
            setConnectionStatus('idle');
            setConnectionMessage('');
        }
    }, [connectionStatus]);

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
        } else if (formData.type === 'supabase') {
            if (!formData.url) {
                form.setError('url', { message: t('validation.url.required') });
                return;
            }
            if (!formData.apiKey) {
                form.setError('apiKey', { message: t('validation.apiKey.required') });
                return;
            }
            config.url = formData.url;
            config.apiKey = formData.apiKey;
        } else if (formData.type === 'convex') {
            if (!formData.url) {
                form.setError('url', { message: t('validation.url.required') });
                return;
            }
            if (!formData.authToken) {
                form.setError('authToken', { message: t('validation.authToken.required') });
                return;
            }
            config.url = formData.url;
            config.authToken = formData.authToken;
        } else if (formData.type === 'firebase') {
            if (!formData.projectId) {
                form.setError('projectId', { message: t('validation.projectId.required') });
                return;
            }
            if (!formData.apiKey) {
                form.setError('apiKey', { message: t('validation.apiKey.required') });
                return;
            }
            config.projectId = formData.projectId;
            config.apiKey = formData.apiKey;
        } else if (formData.type === 'neon') {
            if (!formData.connectionString) {
                form.setError('connectionString', { message: t('validation.connectionString.required') });
                return;
            }
            config.connectionString = formData.connectionString;
        } else if (formData.type === 'turso') {
            if (!formData.url) {
                form.setError('url', { message: t('validation.url.required') });
                return;
            }
            if (!formData.authToken) {
                form.setError('authToken', { message: t('validation.authToken.required') });
                return;
            }
            config.url = formData.url;
            config.authToken = formData.authToken;
        } else if (formData.type === 'planetscale') {
            // PlanetScale validation
            if (!formData.host || !formData.username || !formData.password) {
                if (!formData.host) form.setError('host', { message: t('validation.host.required') });
                if (!formData.username) form.setError('username', { message: t('validation.username.required') });
                if (!formData.password) form.setError('password', { message: t('validation.password.required') });
                return;
            }
            config.host = formData.host;
            config.username = formData.username;
            config.password = formData.password;
            config.ssl = true; // Always true for PlanetScale
        } else if (formData.type === 'mysql' || formData.type === 'postgresql') {
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

        // Reset connection status
        setConnectionMessage('');
        setConnectionStatus('idle');

        // Use TanStack Query mutation for connection testing
        connectionTestMutation.mutate(config, {
            onSuccess: (result) => {
                if (result.success) {
                    setConnectionStatus('success');
                    setConnectionMessage(result.message);
                } else {
                    setConnectionStatus('error');
                    setConnectionMessage(result.message);
                }
            },
            onError: (error) => {
                setConnectionStatus('error');
                setConnectionMessage(error instanceof Error ? error.message : t('validation.connection.failed'));
            }
        });
    };

    const onSubmit = async (data: DatabaseFormData) => {
        const config: DatabaseConfig = {
            type: data.type,
            database: data.database,
        };

        if (data.type === 'mongodb') {
            config.connectionString = data.connectionString;
        } else if (data.type === 'supabase') {
            config.url = data.url;
            config.apiKey = data.apiKey;
        } else if (data.type === 'convex') {
            config.url = data.url;
            config.authToken = data.authToken;
        } else if (data.type === 'firebase') {
            config.projectId = data.projectId;
            config.apiKey = data.apiKey;
        } else if (data.type === 'planetscale') {
            config.host = data.host;
            config.username = data.username;
            config.password = data.password;
            config.ssl = true; // Always true for PlanetScale
        } else if (data.type === 'neon') {
            config.connectionString = data.connectionString;
        } else if (data.type === 'turso') {
            config.url = data.url;
            config.authToken = data.authToken;
        } else if (data.type !== 'localdb') {
            config.host = data.host;
            config.port = data.port;
            config.username = data.username;
            config.password = data.password;
            config.ssl = data.ssl;
        }

        // Test connection first using TanStack Query
        connectionTestMutation.mutate(config, {
            onSuccess: (result) => {
                if (result.success) {
                    setConnectionStatus('success');
                    setConnectionMessage(result.message);
                    onNext(config);
                } else {
                    setConnectionStatus('error');
                    setConnectionMessage(result.message);
                }
            },
            onError: (error) => {
                setConnectionStatus('error');
                setConnectionMessage(error instanceof Error ? error.message : t('validation.connection.failed'));
            }
        });
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
                                            clearConnectionStatus();
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

            case 'supabase':
                return (
                    <>
                        <FormField
                            control={form.control}
                            name="url"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('setup.database.url')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="https://your-project.supabase.co"
                                            value={field.value || ''}
                                            onChange={(e) => {
                                                field.onChange(e.target.value);
                                                if (form.formState.errors.url) {
                                                    form.clearErrors('url');
                                                }
                                                clearConnectionStatus();
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="apiKey"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('setup.database.apiKey')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="password"
                                            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                            value={field.value || ''}
                                            onChange={(e) => {
                                                field.onChange(e.target.value);
                                                if (form.formState.errors.apiKey) {
                                                    form.clearErrors('apiKey');
                                                }
                                                clearConnectionStatus();
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </>
                );

            case 'convex':
                return (
                    <>
                        <FormField
                            control={form.control}
                            name="url"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('setup.database.url')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="https://your-deployment.convex.cloud"
                                            value={field.value || ''}
                                            onChange={(e) => {
                                                field.onChange(e.target.value);
                                                if (form.formState.errors.url) {
                                                    form.clearErrors('url');
                                                }
                                                clearConnectionStatus();
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="authToken"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('setup.database.authToken')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="password"
                                            placeholder="convex_auth_token_..."
                                            value={field.value || ''}
                                            onChange={(e) => {
                                                field.onChange(e.target.value);
                                                if (form.formState.errors.authToken) {
                                                    form.clearErrors('authToken');
                                                }
                                                clearConnectionStatus();
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </>
                );

            case 'firebase':
                return (
                    <>
                        <FormField
                            control={form.control}
                            name="projectId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('setup.database.projectId')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="your-firebase-project"
                                            value={field.value || ''}
                                            onChange={(e) => {
                                                field.onChange(e.target.value);
                                                if (form.formState.errors.projectId) {
                                                    form.clearErrors('projectId');
                                                }
                                                clearConnectionStatus();
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="apiKey"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('setup.database.apiKey')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="password"
                                            placeholder="AIzaSyC..."
                                            value={field.value || ''}
                                            onChange={(e) => {
                                                field.onChange(e.target.value);
                                                if (form.formState.errors.apiKey) {
                                                    form.clearErrors('apiKey');
                                                }
                                                clearConnectionStatus();
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </>
                );

            case 'neon':
                return (
                    <FormField
                        control={form.control}
                        name="connectionString"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('setup.database.connectionString')}</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/dbname"
                                        value={field.value || ''}
                                        onChange={(e) => {
                                            field.onChange(e.target.value);
                                            if (form.formState.errors.connectionString) {
                                                form.clearErrors('connectionString');
                                            }
                                            clearConnectionStatus();
                                        }}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                );

            case 'turso':
                return (
                    <>
                        <FormField
                            control={form.control}
                            name="url"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('setup.database.url')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="libsql://your-database.turso.io"
                                            value={field.value || ''}
                                            onChange={(e) => {
                                                field.onChange(e.target.value);
                                                if (form.formState.errors.url) {
                                                    form.clearErrors('url');
                                                }
                                                clearConnectionStatus();
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="authToken"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('setup.database.authToken')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="password"
                                            placeholder="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9..."
                                            value={field.value || ''}
                                            onChange={(e) => {
                                                field.onChange(e.target.value);
                                                if (form.formState.errors.authToken) {
                                                    form.clearErrors('authToken');
                                                }
                                                clearConnectionStatus();
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </>
                );

            case 'planetscale': // PlanetScale uses MySQL protocol but with specific requirements
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
                                                    clearConnectionStatus();
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
                                                    clearConnectionStatus();
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
                                                    clearConnectionStatus();
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
                                                    clearConnectionStatus();
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
                                            <SelectItem value="supabase">{t('database.type.supabase')}</SelectItem>
                                            <SelectItem value="convex">{t('database.type.convex')}</SelectItem>
                                            <SelectItem value="firebase">{t('database.type.firebase')}</SelectItem>
                                            <SelectItem value="planetscale">{t('database.type.planetscale')}</SelectItem>
                                            <SelectItem value="neon">{t('database.type.neon')}</SelectItem>
                                            <SelectItem value="turso">{t('database.type.turso')}</SelectItem>
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
                                            : watchedType === 'firebase'
                                                ? t('setup.database.name') + ' (Database ID)'
                                                : watchedType === 'convex'
                                                    ? t('setup.database.name') + ' (Project Name)'
                                                    : t('setup.database.name')
                                        }
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={
                                                watchedType === 'localdb'
                                                    ? './data/myapp.db'
                                                    : watchedType === 'firebase'
                                                        ? '(default)'
                                                        : watchedType === 'convex'
                                                            ? 'my-project'
                                                            : watchedType === 'supabase'
                                                                ? 'postgres'
                                                                : 'myapp'
                                            }
                                            value={field.value || ''}
                                            onChange={(e) => {
                                                field.onChange(e.target.value);
                                                // Clear the specific error for this field
                                                if (form.formState.errors.database) {
                                                    form.clearErrors('database');
                                                }
                                                clearConnectionStatus();
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
                            {onBack && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onBack}
                                >
                                    {t('button.back')}
                                </Button>
                            )}

                            <Button
                                type="button"
                                variant="outline"
                                onClick={testConnection}
                                disabled={connectionTestMutation.isPending}
                            >
                                {connectionTestMutation.isPending ? (
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
                                className="ml-auto"
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
