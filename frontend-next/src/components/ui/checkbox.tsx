"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface CheckboxProps {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
    className?: string;
    id?: string;
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
    ({ className, checked = false, onCheckedChange, disabled = false, id, ...props }, ref) => {
        const handleClick = () => {
            if (!disabled && onCheckedChange) {
                onCheckedChange(!checked);
            }
        };

        return (
            <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                id={id}
                ref={ref}
                className={cn(
                    "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    checked ? "bg-primary text-primary-foreground" : "bg-background",
                    className
                )}
                disabled={disabled}
                onClick={handleClick}
                {...props}
            >
                {checked && (
                    <Check className="h-3 w-3" />
                )}
            </button>
        );
    }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
