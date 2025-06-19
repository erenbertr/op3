"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, Save, User, Mail, Lock, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { apiClient } from '@/lib/api';

interface AccountSettingsProps {
    currentUser: {
        id: string;
        email: string;
        username?: string;
        firstName?: string;
        lastName?: string;
    };
}

export function AccountSettings({ currentUser }: AccountSettingsProps) {
    const { addToast } = useToast();

    // Profile state
    const [profileData, setProfileData] = useState({
        email: currentUser.email,
        username: currentUser.username || '',
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
    });

    // Password state
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });

    const [isLoading, setIsLoading] = useState({
        profile: false,
        password: false,
    });

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(prev => ({ ...prev, profile: true }));

        try {
            const response = await apiClient.patch(`/auth/profile`, {
                username: profileData.username,
                firstName: profileData.firstName,
                lastName: profileData.lastName,
            }) as { success?: boolean };

            if (response.success) {
                addToast({
                    title: "Profile Updated",
                    description: "Your profile information has been updated successfully.",
                });
            }
        } catch (error) {
            console.error('Profile update error:', error);
            addToast({
                title: "Update Failed",
                description: "Failed to update profile information. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(prev => ({ ...prev, profile: false }));
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            addToast({
                title: "Password Mismatch",
                description: "New password and confirmation do not match.",
                variant: "destructive",
            });
            return;
        }

        // Validate password requirements
        const passwordRequirements = [
            { met: passwordData.newPassword.length >= 8, text: 'At least 8 characters' },
            { met: /[A-Z]/.test(passwordData.newPassword), text: 'One uppercase letter' },
            { met: /[a-z]/.test(passwordData.newPassword), text: 'One lowercase letter' },
            { met: /\d/.test(passwordData.newPassword), text: 'One number' },
            { met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordData.newPassword), text: 'One special character' },
        ];

        const unmetRequirements = passwordRequirements.filter(req => !req.met);
        if (unmetRequirements.length > 0) {
            addToast({
                title: "Password Requirements Not Met",
                description: `Missing: ${unmetRequirements.map(req => req.text).join(', ')}`,
                variant: "destructive",
            });
            return;
        }

        setIsLoading(prev => ({ ...prev, password: true }));

        try {
            const response = await apiClient.patch(`/auth/password`, {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
            }) as { success?: boolean };

            if (response.success) {
                addToast({
                    title: "Password Updated",
                    description: "Your password has been changed successfully.",
                });
                setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                });
            }
        } catch (error: unknown) {
            console.error('Password change error:', error);

            // Extract error message from API response
            let errorMessage = "Failed to change password. Please try again.";
            if (error && typeof error === 'object' && 'response' in error) {
                const apiError = error as { response?: { data?: { error?: { message?: string } } } };
                if (apiError.response?.data?.error?.message) {
                    errorMessage = apiError.response.data.error.message;
                }
            } else if (error && typeof error === 'object' && 'message' in error) {
                const simpleError = error as { message: string };
                errorMessage = simpleError.message;
            }

            addToast({
                title: "Password Change Failed",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsLoading(prev => ({ ...prev, password: false }));
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
                <p className="text-muted-foreground">
                    Manage your account information and security settings.
                </p>
            </div>

            <Tabs defaultValue="profile" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="profile" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Profile
                    </TabsTrigger>
                    <TabsTrigger value="security" className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Security
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Profile Information
                            </CardTitle>
                            <CardDescription>
                                Update your personal information and preferences.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleProfileUpdate} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">First Name</Label>
                                        <Input
                                            id="firstName"
                                            type="text"
                                            value={profileData.firstName}
                                            onChange={(e) => setProfileData(prev => ({
                                                ...prev,
                                                firstName: e.target.value
                                            }))}
                                            placeholder="Enter your first name"
                                            disabled={isLoading.profile}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">Last Name</Label>
                                        <Input
                                            id="lastName"
                                            type="text"
                                            value={profileData.lastName}
                                            onChange={(e) => setProfileData(prev => ({
                                                ...prev,
                                                lastName: e.target.value
                                            }))}
                                            placeholder="Enter your last name"
                                            disabled={isLoading.profile}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="username">Username</Label>
                                    <Input
                                        id="username"
                                        type="text"
                                        value={profileData.username}
                                        onChange={(e) => setProfileData(prev => ({
                                            ...prev,
                                            username: e.target.value
                                        }))}
                                        placeholder="Enter your username"
                                        disabled={isLoading.profile}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email" className="flex items-center gap-2">
                                        <Mail className="h-4 w-4" />
                                        Email Address
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={profileData.email}
                                        disabled
                                        className="bg-muted"
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        Email address cannot be changed. Contact support if you need to update your email.
                                    </p>
                                </div>

                                <div className="flex justify-end">
                                    <Button
                                        type="submit"
                                        disabled={isLoading.profile}
                                        className="flex items-center gap-2"
                                    >
                                        <Save className="h-4 w-4" />
                                        {isLoading.profile ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lock className="h-5 w-5" />
                                Change Password
                            </CardTitle>
                            <CardDescription>
                                Update your password to keep your account secure.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="currentPassword">Current Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="currentPassword"
                                            type={showPasswords.current ? 'text' : 'password'}
                                            value={passwordData.currentPassword}
                                            onChange={(e) => setPasswordData(prev => ({
                                                ...prev,
                                                currentPassword: e.target.value
                                            }))}
                                            placeholder="Enter your current password"
                                            required
                                            disabled={isLoading.password}
                                            className="pr-10"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                            onClick={() => setShowPasswords(prev => ({
                                                ...prev,
                                                current: !prev.current
                                            }))}
                                            disabled={isLoading.password}
                                        >
                                            {showPasswords.current ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="newPassword">New Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="newPassword"
                                            type={showPasswords.new ? 'text' : 'password'}
                                            value={passwordData.newPassword}
                                            onChange={(e) => setPasswordData(prev => ({
                                                ...prev,
                                                newPassword: e.target.value
                                            }))}
                                            placeholder="Enter your new password"
                                            required
                                            disabled={isLoading.password}
                                            className="pr-10"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                            onClick={() => setShowPasswords(prev => ({
                                                ...prev,
                                                new: !prev.new
                                            }))}
                                            disabled={isLoading.password}
                                        >
                                            {showPasswords.new ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Password Requirements */}
                                {passwordData.newPassword && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Password Requirements:
                                        </p>
                                        <div className="grid grid-cols-1 gap-1">
                                            {[
                                                { key: 'length', met: passwordData.newPassword.length >= 8, text: 'At least 8 characters' },
                                                { key: 'uppercase', met: /[A-Z]/.test(passwordData.newPassword), text: 'One uppercase letter' },
                                                { key: 'lowercase', met: /[a-z]/.test(passwordData.newPassword), text: 'One lowercase letter' },
                                                { key: 'number', met: /\d/.test(passwordData.newPassword), text: 'One number' },
                                                { key: 'special', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordData.newPassword), text: 'One special character' },
                                            ].map((req) => (
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

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="confirmPassword"
                                            type={showPasswords.confirm ? 'text' : 'password'}
                                            value={passwordData.confirmPassword}
                                            onChange={(e) => setPasswordData(prev => ({
                                                ...prev,
                                                confirmPassword: e.target.value
                                            }))}
                                            placeholder="Confirm your new password"
                                            required
                                            disabled={isLoading.password}
                                            className="pr-10"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                            onClick={() => setShowPasswords(prev => ({
                                                ...prev,
                                                confirm: !prev.confirm
                                            }))}
                                            disabled={isLoading.password}
                                        >
                                            {showPasswords.confirm ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <Button
                                        type="submit"
                                        disabled={isLoading.password}
                                        className="flex items-center gap-2"
                                    >
                                        <Lock className="h-4 w-4" />
                                        {isLoading.password ? 'Updating...' : 'Update Password'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
