"use client"

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { Loader2 } from 'lucide-react';

interface User {
    id: string;
    email: string;
    username?: string;
    role: 'admin' | 'subscribed' | 'normal';
    isActive: boolean;
    firstName?: string;
    lastName?: string;
    createdAt: string;
    lastLoginAt?: string;
}

interface UserDialogsProps {
    showCreateDialog: boolean;
    setShowCreateDialog: (show: boolean) => void;
    showEditDialog: boolean;
    setShowEditDialog: (show: boolean) => void;
    showDeleteDialog: boolean;
    setShowDeleteDialog: (show: boolean) => void;
    selectedUser: User | null;
    currentUser: {
        id: string;
        email: string;
        role?: string;
    };
}

export function UserDialogs({
    showCreateDialog,
    setShowCreateDialog,
    showEditDialog,
    setShowEditDialog,
    showDeleteDialog,
    setShowDeleteDialog,
    selectedUser,
    currentUser
}: UserDialogsProps) {
    const [createForm, setCreateForm] = useState({
        email: '',
        username: '',
        password: '',
        role: 'normal' as 'admin' | 'subscribed' | 'normal',
        firstName: '',
        lastName: ''
    });

    const [editForm, setEditForm] = useState({
        email: '',
        username: '',
        role: 'normal' as 'admin' | 'subscribed' | 'normal',
        isActive: true,
        firstName: '',
        lastName: ''
    });

    const queryClient = useQueryClient();
    const { addToast } = useToast();

    // Reset forms when dialogs open/close
    useEffect(() => {
        if (showCreateDialog) {
            setCreateForm({
                email: '',
                username: '',
                password: '',
                role: 'normal',
                firstName: '',
                lastName: ''
            });
        }
    }, [showCreateDialog]);

    useEffect(() => {
        if (showEditDialog && selectedUser) {
            setEditForm({
                email: selectedUser.email,
                username: selectedUser.username || '',
                role: selectedUser.role,
                isActive: selectedUser.isActive,
                firstName: selectedUser.firstName || '',
                lastName: selectedUser.lastName || ''
            });
        }
    }, [showEditDialog, selectedUser]);

    // Create user mutation
    const createUserMutation = useMutation({
        mutationFn: async (userData: typeof createForm) => {
            const response = await fetch('/api/v1/admin/users', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('op3_auth_token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create user');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            queryClient.invalidateQueries({ queryKey: ['user-stats'] });
            setShowCreateDialog(false);
            addToast({
                title: "User Created",
                description: "New user has been created successfully.",
            });
        },
        onError: (error) => {
            addToast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to create user",
                variant: "destructive",
            });
        },
    });

    // Update user mutation
    const updateUserMutation = useMutation({
        mutationFn: async (userData: typeof editForm) => {
            const response = await fetch(`/api/v1/admin/users/${selectedUser?.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('op3_auth_token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to update user');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            queryClient.invalidateQueries({ queryKey: ['user-stats'] });
            setShowEditDialog(false);
            addToast({
                title: "User Updated",
                description: "User has been updated successfully.",
            });
        },
        onError: (error) => {
            addToast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to update user",
                variant: "destructive",
            });
        },
    });

    // Delete user mutation
    const deleteUserMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch(`/api/v1/admin/users/${selectedUser?.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('op3_auth_token')}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to delete user');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            queryClient.invalidateQueries({ queryKey: ['user-stats'] });
            setShowDeleteDialog(false);
            addToast({
                title: "User Deleted",
                description: "User has been deleted successfully.",
            });
        },
        onError: (error) => {
            addToast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to delete user",
                variant: "destructive",
            });
        },
    });

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!createForm.email || !createForm.password) {
            addToast({
                title: "Validation Error",
                description: "Email and password are required",
                variant: "destructive",
            });
            return;
        }
        createUserMutation.mutate(createForm);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editForm.email) {
            addToast({
                title: "Validation Error",
                description: "Email is required",
                variant: "destructive",
            });
            return;
        }
        updateUserMutation.mutate(editForm);
    };

    const handleDeleteConfirm = () => {
        deleteUserMutation.mutate();
    };

    return (
        <>
            {/* Create User Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Create New User</DialogTitle>
                        <DialogDescription>
                            Add a new user to the system. They will receive login credentials.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="create-email">Email *</Label>
                                <Input
                                    id="create-email"
                                    type="email"
                                    value={createForm.email}
                                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-username">Username</Label>
                                <Input
                                    id="create-username"
                                    value={createForm.username}
                                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="create-password">Password *</Label>
                            <Input
                                id="create-password"
                                type="password"
                                value={createForm.password}
                                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="create-firstName">First Name</Label>
                                <Input
                                    id="create-firstName"
                                    value={createForm.firstName}
                                    onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-lastName">Last Name</Label>
                                <Input
                                    id="create-lastName"
                                    value={createForm.lastName}
                                    onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="create-role">Role</Label>
                            <Select
                                value={createForm.role}
                                onValueChange={(value: 'admin' | 'subscribed' | 'normal') =>
                                    setCreateForm({ ...createForm, role: value })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="normal">Normal User</SelectItem>
                                    <SelectItem value="subscribed">Subscribed User</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowCreateDialog(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={createUserMutation.isPending}
                            >
                                {createUserMutation.isPending && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Create User
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit User Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>
                            Update user information and permissions.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-email">Email *</Label>
                                <Input
                                    id="edit-email"
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-username">Username</Label>
                                <Input
                                    id="edit-username"
                                    value={editForm.username}
                                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-firstName">First Name</Label>
                                <Input
                                    id="edit-firstName"
                                    value={editForm.firstName}
                                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-lastName">Last Name</Label>
                                <Input
                                    id="edit-lastName"
                                    value={editForm.lastName}
                                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-role">Role</Label>
                                <Select
                                    value={editForm.role}
                                    onValueChange={(value: 'admin' | 'subscribed' | 'normal') =>
                                        setEditForm({ ...editForm, role: value })
                                    }
                                    disabled={selectedUser?.id === currentUser.id && currentUser.role === 'admin'}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="normal">Normal User</SelectItem>
                                        <SelectItem value="subscribed">Subscribed User</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                                {selectedUser?.id === currentUser.id && currentUser.role === 'admin' && (
                                    <p className="text-xs text-muted-foreground">
                                        You cannot change your own admin role
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-isActive" className="flex items-center gap-2">
                                    Account Status
                                </Label>
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="edit-isActive"
                                        checked={editForm.isActive}
                                        onCheckedChange={(checked) =>
                                            setEditForm({ ...editForm, isActive: checked })
                                        }
                                    />
                                    <Label htmlFor="edit-isActive" className="text-sm">
                                        {editForm.isActive ? 'Active' : 'Inactive'}
                                    </Label>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowEditDialog(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={updateUserMutation.isPending}
                            >
                                {updateUserMutation.isPending && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Update User
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete User Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete User</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this user? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedUser && (
                        <div className="py-4">
                            <div className="bg-muted p-4 rounded-lg">
                                <div className="font-medium">{selectedUser.email}</div>
                                {(selectedUser.firstName || selectedUser.lastName) && (
                                    <div className="text-sm text-muted-foreground">
                                        {selectedUser.firstName} {selectedUser.lastName}
                                    </div>
                                )}
                                <div className="text-sm text-muted-foreground">
                                    Role: {selectedUser.role} • Status: {selectedUser.isActive ? 'Active' : 'Inactive'}
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteConfirm}
                            disabled={deleteUserMutation.isPending}
                        >
                            {deleteUserMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Delete User
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
