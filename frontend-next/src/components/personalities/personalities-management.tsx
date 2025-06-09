"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, ExternalLink, User, Loader2 } from 'lucide-react';
import { Personality } from '@/lib/api';
import { usePersonalities, useCreatePersonality, useUpdatePersonality, useDeletePersonality } from '@/lib/hooks/use-query-hooks';
import { PersonalityForm } from './personality-form';

interface PersonalitiesManagementProps {
    userId: string;
}

export function PersonalitiesManagement({ userId }: PersonalitiesManagementProps) {
    const [error, setError] = useState('');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingPersonality, setEditingPersonality] = useState<Personality | null>(null);
    const [deletingPersonality, setDeletingPersonality] = useState<Personality | null>(null);

    // Use TanStack Query hooks
    const {
        data: personalitiesData,
        isLoading,
        error: queryError
    } = usePersonalities(userId);

    const createPersonalityMutation = useCreatePersonality();
    const updatePersonalityMutation = useUpdatePersonality();
    const deletePersonalityMutation = useDeletePersonality();

    // Extract personalities from query data
    const personalities = personalitiesData?.success ? personalitiesData.personalities : [];

    // Handle query errors (using useMemo for derived state)
    const derivedError = React.useMemo(() => {
        if (queryError) {
            console.error('Error loading personalities:', queryError);
            return 'Failed to load personalities';
        }
        return '';
    }, [queryError]);

    React.useMemo(() => {
        setError(derivedError);
    }, [derivedError]);

    const handleCreatePersonality = async (data: { title: string; prompt: string }) => {
        createPersonalityMutation.mutate(
            { title: data.title, prompt: data.prompt, userId },
            {
                onSuccess: (result) => {
                    if (result.success) {
                        setIsCreateDialogOpen(false);
                        setError('');
                    } else {
                        setError(result.message || 'Failed to create personality');
                    }
                },
                onError: (error) => {
                    console.error('Error creating personality:', error);
                    setError('Failed to create personality');
                }
            }
        );
    };

    const handleUpdatePersonality = async (data: { title: string; prompt: string }) => {
        if (!editingPersonality) return;

        updatePersonalityMutation.mutate(
            {
                personalityId: editingPersonality.id,
                userId,
                title: data.title,
                prompt: data.prompt
            },
            {
                onSuccess: (result) => {
                    if (result.success) {
                        setEditingPersonality(null);
                        setError('');
                    } else {
                        setError(result.message || 'Failed to update personality');
                    }
                },
                onError: (error) => {
                    console.error('Error updating personality:', error);
                    setError('Failed to update personality');
                }
            }
        );
    };

    const handleDeletePersonality = async () => {
        if (!deletingPersonality) return;

        deletePersonalityMutation.mutate(
            { personalityId: deletingPersonality.id, userId },
            {
                onSuccess: (result) => {
                    if (result.success) {
                        setDeletingPersonality(null);
                        setError('');
                    } else {
                        setError(result.message || 'Failed to delete personality');
                    }
                },
                onError: (error) => {
                    console.error('Error deleting personality:', error);
                    setError('Failed to delete personality');
                }
            }
        );
    };

    const truncateText = (text: string, maxLength: number = 150) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    const openInspirationsLink = () => {
        window.open('https://prompts.chat/', '_blank', 'noopener,noreferrer');
    };

    // Show loading state
    if (isLoading && personalities.length === 0) {
        return (
            <div className="space-y-6">
                {/* Header with actions */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                        <p className="text-muted-foreground">
                            Create and manage AI personalities with custom prompts and instructions.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={openInspirationsLink}
                            className="flex items-center gap-2"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Inspirations
                        </Button>
                        <Button className="flex items-center gap-2" disabled>
                            <Plus className="h-4 w-4" />
                            Create Personality
                        </Button>
                    </div>
                </div>

                {/* Loading spinner */}
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin opacity-50" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                    <p className="text-muted-foreground">
                        Create and manage AI personalities with custom prompts and instructions.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={openInspirationsLink}
                        className="flex items-center gap-2"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Inspirations
                    </Button>
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Create Personality
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Create New Personality</DialogTitle>
                                <DialogDescription>
                                    Define a new AI personality with custom instructions and behavior.
                                </DialogDescription>
                            </DialogHeader>
                            <PersonalityForm
                                onSubmit={handleCreatePersonality}
                                onCancel={() => setIsCreateDialogOpen(false)}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Error display */}
            {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                    <p className="text-destructive text-sm">{error}</p>
                </div>
            )}

            {/* Personalities grid */}
            {personalities.length === 0 ? (
                <div className="text-center py-12">
                    <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No personalities yet</h3>
                    <p className="text-muted-foreground mb-4">
                        Create your first AI personality to get started.
                    </p>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Personality
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {personalities.map((personality) => (
                        <Card key={personality.id} className="flex flex-col">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-base truncate">
                                            {personality.title}
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Created {new Date(personality.createdAt).toLocaleDateString()}
                                        </CardDescription>
                                    </div>
                                    <Badge variant="secondary" className="ml-2 flex-shrink-0">
                                        <User className="h-3 w-3 mr-1" />
                                        AI
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col">
                                <div className="flex-1 mb-4">
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {truncateText(personality.prompt)}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Dialog
                                        open={editingPersonality?.id === personality.id}
                                        onOpenChange={(open) => !open && setEditingPersonality(null)}
                                    >
                                        <DialogTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => setEditingPersonality(personality)}
                                            >
                                                <Edit className="h-3 w-3 mr-1" />
                                                Edit
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl">
                                            <DialogHeader>
                                                <DialogTitle>Edit Personality</DialogTitle>
                                                <DialogDescription>
                                                    Update the personality&apos;s title and prompt.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <PersonalityForm
                                                initialData={{
                                                    title: personality.title,
                                                    prompt: personality.prompt
                                                }}
                                                onSubmit={handleUpdatePersonality}
                                                onCancel={() => setEditingPersonality(null)}
                                                submitLabel="Update Personality"
                                            />
                                        </DialogContent>
                                    </Dialog>

                                    <AlertDialog
                                        open={deletingPersonality?.id === personality.id}
                                        onOpenChange={(open) => !open && setDeletingPersonality(null)}
                                    >
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setDeletingPersonality(personality)}
                                                className="text-destructive hover:text-destructive"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete Personality</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Are you sure you want to delete &quot;{personality.title}&quot;?
                                                    This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={handleDeletePersonality}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
