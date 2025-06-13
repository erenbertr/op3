"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

import { FileText } from 'lucide-react';

interface WorkspaceRulesModalProps {
    rules: string;
    workspaceName?: string;
    triggerText?: string;
    triggerVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    triggerSize?: "default" | "sm" | "lg" | "icon";
}

export function WorkspaceRulesModal({
    rules,
    workspaceName,
    triggerText = "Rules",
    triggerVariant = "outline",
    triggerSize = "sm"
}: WorkspaceRulesModalProps) {
    const [isOpen, setIsOpen] = useState(false);

    if (!rules || rules.trim() === '') {
        return (
            <Button
                variant={triggerVariant}
                size={triggerSize}
                disabled
                className="opacity-50 cursor-not-allowed"
            >
                <FileText className="h-4 w-4" />
                {triggerText}
            </Button>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant={triggerVariant} size={triggerSize}>
                    <FileText className="h-4 w-4 mr-2" />
                    {triggerText}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>
                        Workspace Rules
                        {workspaceName && (
                            <span className="text-muted-foreground font-normal ml-2">
                                - {workspaceName}
                            </span>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        Custom AI behavior guidelines for this workspace
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] w-full rounded-md border p-4 overflow-y-auto">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {rules}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
