"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DialogFooter } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface PersonalityFormProps {
    initialData?: {
        title: string;
        prompt: string;
    };
    onSubmit: (data: { title: string; prompt: string }) => Promise<void>;
    onCancel: () => void;
    submitLabel?: string;
}

export function PersonalityForm({ 
    initialData, 
    onSubmit, 
    onCancel, 
    submitLabel = "Create Personality" 
}: PersonalityFormProps) {
    const [title, setTitle] = useState(initialData?.title || '');
    const [prompt, setPrompt] = useState(initialData?.prompt || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<{ title?: string; prompt?: string }>({});

    const validateForm = () => {
        const newErrors: { title?: string; prompt?: string } = {};

        if (!title.trim()) {
            newErrors.title = 'Title is required';
        } else if (title.trim().length < 3) {
            newErrors.title = 'Title must be at least 3 characters long';
        } else if (title.trim().length > 100) {
            newErrors.title = 'Title must be less than 100 characters';
        }

        if (!prompt.trim()) {
            newErrors.prompt = 'Prompt is required';
        } else if (prompt.trim().length < 10) {
            newErrors.prompt = 'Prompt must be at least 10 characters long';
        } else if (prompt.trim().length > 5000) {
            newErrors.prompt = 'Prompt must be less than 5000 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit({
                title: title.trim(),
                prompt: prompt.trim()
            });
        } catch (error) {
            console.error('Error submitting form:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
        if (errors.title) {
            setErrors(prev => ({ ...prev, title: undefined }));
        }
    };

    const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setPrompt(e.target.value);
        if (errors.prompt) {
            setErrors(prev => ({ ...prev, prompt: undefined }));
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                {/* Title Field */}
                <div className="space-y-2">
                    <Label htmlFor="title">
                        Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="title"
                        value={title}
                        onChange={handleTitleChange}
                        placeholder="e.g., Code Reviewer, Creative Writer, Translator..."
                        className={errors.title ? 'border-destructive' : ''}
                        disabled={isSubmitting}
                    />
                    {errors.title && (
                        <p className="text-sm text-destructive">{errors.title}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                        A descriptive name for this personality (3-100 characters)
                    </p>
                </div>

                {/* Prompt Field */}
                <div className="space-y-2">
                    <Label htmlFor="prompt">
                        Prompt <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                        id="prompt"
                        value={prompt}
                        onChange={handlePromptChange}
                        placeholder="You are a professional code reviewer. Analyze code for bugs, performance issues, and best practices. Provide constructive feedback with specific suggestions for improvement..."
                        className={`min-h-[200px] resize-y ${errors.prompt ? 'border-destructive' : ''}`}
                        disabled={isSubmitting}
                    />
                    {errors.prompt && (
                        <p className="text-sm text-destructive">{errors.prompt}</p>
                    )}
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">
                            Define the AI's behavior, role, and instructions (10-5000 characters)
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {prompt.length}/5000
                        </p>
                    </div>
                </div>

                {/* Example personalities for inspiration */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <h4 className="text-sm font-medium">Example Personalities:</h4>
                    <div className="space-y-2 text-xs text-muted-foreground">
                        <div>
                            <strong>Translator:</strong> "You are a professional translator. Translate the following text from German to English only."
                        </div>
                        <div>
                            <strong>Code Reviewer:</strong> "You are an expert code reviewer. Analyze code for bugs, performance issues, and best practices."
                        </div>
                        <div>
                            <strong>Creative Writer:</strong> "You are a creative writing assistant. Help with storytelling, character development, and narrative structure."
                        </div>
                    </div>
                </div>
            </div>

            <DialogFooter>
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSubmitting}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={isSubmitting || !title.trim() || !prompt.trim()}
                >
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {submitLabel}
                </Button>
            </DialogFooter>
        </form>
    );
}
