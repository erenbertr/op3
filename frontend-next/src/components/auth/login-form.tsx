"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/lib/i18n';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
    onLogin?: (credentials: { email: string; password: string }) => Promise<void>;
    onRegister?: (credentials: { email: string; password: string; name?: string }) => Promise<void>;
    isLoading?: boolean;
}

export function LoginForm({ onLogin, onRegister, isLoading: externalLoading }: LoginFormProps) {
    const { t } = useI18n();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const loading = externalLoading || isLoading;
    const [error, setError] = useState('');

    // Fetch public system settings to check if registration is enabled
    const { data: systemSettings } = useQuery({
        queryKey: ['public-system-settings'],
        queryFn: async () => {
            return await apiClient.getPublicSystemSettings();
        },
    });

    const registrationEnabled = systemSettings?.settings?.registrationEnabled || false;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (isRegistering) {
                if (onRegister) {
                    await onRegister({ email, password, name: name || undefined });
                } else {
                    console.log('Registration attempt:', { email, password: '***', name });
                    alert('Registration functionality will be implemented in the next phase.');
                }
            } else {
                if (onLogin) {
                    await onLogin({ email, password });
                } else {
                    // Default login logic - for now just show a message
                    console.log('Login attempt:', { email, password: '***' });
                    alert('Login functionality will be implemented in the next phase.');
                }
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : (isRegistering ? 'Registration failed' : 'Login failed'));
        } finally {
            setIsLoading(false);
        }
    };

    const toggleMode = () => {
        setIsRegistering(!isRegistering);
        setError('');
        setEmail('');
        setPassword('');
        setName('');
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
                        {error}
                    </div>
                )}

                {isRegistering && (
                    <div className="space-y-2">
                        <Label htmlFor="name">Name (Optional)</Label>
                        <Input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your name"
                            disabled={loading}
                        />
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="email">{t('login.email.label')}</Label>
                    <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('login.email.placeholder')}
                        required
                        disabled={loading}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password">{t('login.password.label')}</Label>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t('login.password.placeholder')}
                            required
                            disabled={loading}
                            className="pr-10"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={loading}
                        >
                            {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                            ) : (
                                <Eye className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || !email || !password}
                >
                    {loading ?
                        (isRegistering ? 'Creating Account...' : t('login.button.loading')) :
                        (isRegistering ? 'Create Account' : t('login.button.submit'))
                    }
                </Button>

                {registrationEnabled && (
                    <div className="text-center">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={toggleMode}
                            disabled={loading}
                            className="text-sm"
                        >
                            {isRegistering ?
                                'Already have an account? Sign in' :
                                'Don\'t have an account? Create one'
                            }
                        </Button>
                    </div>
                )}
            </form>
        </div>
    );
}
