"use client"

import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle, XCircle, Shield, Eye, EyeOff } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { apiClient, AdminConfig } from '@/lib/api';
import { useToast } from '@/components/ui/toast';

// Create schema function that takes translation function
const createAdminSchema = (t: (key: string) => string) => z.object({
    email: z.string()
        .min(1, t('validation.admin.email.required'))
        .email(t('validation.admin.email.invalid')),
    username: z.string().optional(),
    password: z.string()
        .min(8, t('validation.admin.password.minLength'))
        .regex(/[A-Z]/, t('validation.admin.password.uppercase'))
        .regex(/[a-z]/, t('validation.admin.password.lowercase'))
        .regex(/\d/, t('validation.admin.password.number'))
        .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, t('validation.admin.password.special')),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: t('validation.admin.confirmPassword.mismatch'),
    path: ['confirmPassword'],
});

type AdminFormData = z.infer<ReturnType<typeof createAdminSchema>>;

interface AdminConfigProps {
    onNext: (config: AdminConfig) => void;
    onBack?: () => void;
    defaultValues?: AdminConfig | null;
}

export function AdminConfigForm({ onNext, onBack, defaultValues }: AdminConfigProps) {
    const { t } = useI18n();
    const { addToast } = useToast();
    const [isCreating, setIsCreating] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const adminSchema = createAdminSchema(t);

    // Create form default values based on props or fallback defaults
    const getDefaultValues = useCallback((): AdminFormData => {
        if (defaultValues) {
            return {
                email: defaultValues.email || '',
                username: defaultValues.username || '',
                password: '', // Don't pre-fill passwords for security
                confirmPassword: '',
            };
        }
        return {
            email: '',
            username: '',
            password: '',
            confirmPassword: '',
        };
    }, [defaultValues]);

    const form = useForm<AdminFormData>({
        resolver: zodResolver(adminSchema),
        defaultValues: getDefaultValues(),
    });

    // Reset form when defaultValues change (using useMemo pattern)
    React.useMemo(() => {
        const newDefaults = getDefaultValues();
        form.reset(newDefaults);
    }, [getDefaultValues, form]);

    const password = form.watch('password');

    // Password requirement checks
    const passwordRequirements = [
        { key: 'length', met: password.length >= 8, text: t('setup.admin.requirements.length') },
        { key: 'uppercase', met: /[A-Z]/.test(password), text: t('setup.admin.requirements.uppercase') },
        { key: 'lowercase', met: /[a-z]/.test(password), text: t('setup.admin.requirements.lowercase') },
        { key: 'number', met: /\d/.test(password), text: t('setup.admin.requirements.number') },
        { key: 'special', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password), text: t('setup.admin.requirements.special') },
    ];

    const onSubmit = async (data: AdminFormData) => {
        // Prevent double submission
        if (isCreating) {
            console.log('Form submission already in progress, ignoring...');
            return;
        }

        setIsCreating(true);
        try {
            console.log('Submitting admin config:', { email: data.email, username: data.username });
            const result = await apiClient.saveAdminConfig(data);
            console.log('Admin config result:', result);

            if (result.success) {
                addToast({
                    title: "Success!",
                    description: "Admin account created successfully.",
                    variant: "success"
                });
                console.log('Calling onNext with data:', data);
                onNext(data);
            } else {
                console.error('Failed to create admin account:', result.message);
                addToast({
                    title: "Error",
                    description: result.message || 'Failed to create admin account. Please try again.',
                    variant: "destructive"
                });
            }
        } catch (error: unknown) {
            console.error('Error creating admin account:', error);
            const errorMessage = (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
                (error as Error)?.message ||
                'Failed to create admin account. Please check your database connection and try again.';
            addToast({
                title: "Error",
                description: errorMessage,
                variant: "destructive"
            });
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-500" />
                    {t('setup.admin.title')}
                </CardTitle>
                <CardDescription>
                    {t('setup.admin.description')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Email Field */}
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('setup.admin.email.label')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            placeholder={t('setup.admin.email.placeholder')}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Username Field */}
                        <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('setup.admin.username.label')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t('setup.admin.username.placeholder')}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Password Field */}
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('setup.admin.password.label')}</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder={t('setup.admin.password.placeholder')}
                                                {...field}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Password Requirements */}
                        {password && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">
                                    {t('setup.admin.requirements.title')}
                                </p>
                                <div className="grid grid-cols-1 gap-1">
                                    {passwordRequirements.map((req) => (
                                        <div key={req.key} className="flex items-center gap-2">
                                            {req.met ? (
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-red-500" />
                                            )}
                                            <span className={`text-sm ${req.met ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                                                {req.text}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Confirm Password Field */}
                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('setup.admin.confirmPassword.label')}</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                placeholder={t('setup.admin.confirmPassword.placeholder')}
                                                {...field}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            >
                                                {showConfirmPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />



                        {/* Action Buttons */}
                        <div className="flex gap-4">
                            {onBack && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onBack}
                                    disabled={isCreating}
                                >
                                    {t('button.back')}
                                </Button>
                            )}

                            <Button
                                type="submit"
                                className="flex-1"
                                disabled={isCreating}
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    t('setup.admin.button.create')
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
