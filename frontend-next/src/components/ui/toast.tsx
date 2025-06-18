"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Toast {
    id: string
    title?: string
    description?: string
    variant?: "default" | "destructive" | "success"
    duration?: number
}

interface ToastContextType {
    toasts: Toast[]
    addToast: (toast: Omit<Toast, "id">) => void
    removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<Toast[]>([])

    const removeToast = React.useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, [])

    const addToast = React.useCallback((toast: Omit<Toast, "id">) => {
        const id = Math.random().toString(36).substr(2, 9)
        const newToast = { ...toast, id }
        setToasts((prev) => [...prev, newToast])

        // Auto remove after duration
        const duration = toast.duration ?? 5000
        if (duration > 0) {
            setTimeout(() => {
                removeToast(id)
            }, duration)
        }
    }, [removeToast])

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
            <ToastContainer />
        </ToastContext.Provider>
    )
}

export function useToast() {
    const context = React.useContext(ToastContext)
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider")
    }
    return context
}

function ToastContainer() {
    const { toasts, removeToast } = useToast()

    return (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] flex flex-col gap-2 max-w-sm w-full px-4">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
            ))}
        </div>
    )
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
    return (
        <div
            className={cn(
                "relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md p-4 pr-8 shadow-lg transition-all backdrop-blur-sm",
                "animate-in slide-in-from-top-2 duration-300",
                {
                    "bg-background/95 border border-border text-foreground": toast.variant === "default" || !toast.variant,
                    "bg-destructive border border-destructive text-white": toast.variant === "destructive",
                    "bg-green-500 border border-green-500 text-white": toast.variant === "success",
                }
            )}
        >
            <div className="grid gap-1">
                {toast.title && (
                    <div className="text-sm font-semibold">{toast.title}</div>
                )}
                {toast.description && (
                    <div className="text-sm opacity-90">{toast.description}</div>
                )}
            </div>
            <button
                onClick={() => onRemove(toast.id)}
                className={cn(
                    "absolute right-2 top-2 rounded-md p-1 opacity-0 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100",
                    toast.variant === "destructive" ? "text-white/70 hover:text-white" : "text-current/50 hover:text-current"
                )}
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    )
}
