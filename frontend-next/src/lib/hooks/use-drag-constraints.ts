"use client"

import { useEffect, useRef } from 'react';

interface DragConstraintsOptions {
    containerId?: string;
    margin?: number;
}

export function useDragConstraints(options: DragConstraintsOptions = {}) {
    const { containerId = 'workspace-drag-container', margin = 20 } = options;
    const constraintsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = constraintsRef.current;
        if (!container) return;

        // Add container ID for reference
        container.id = containerId;

        // Function to constrain drag position
        const constrainDragPosition = () => {
            const draggedElements = document.querySelectorAll('[data-rbd-draggable-id][style*="position: fixed"]');

            draggedElements.forEach((element) => {
                const htmlElement = element as HTMLElement;
                const style = htmlElement.style;
                const transform = style.transform;

                if (transform && transform.includes('translate')) {
                    // Extract translate values
                    const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
                    if (match) {
                        const x = parseFloat(match[1]);
                        const y = parseFloat(match[2]);

                        // Get element dimensions
                        const rect = htmlElement.getBoundingClientRect();
                        const containerRect = container.getBoundingClientRect();

                        // Calculate constraints
                        const maxX = containerRect.right - rect.width - margin;
                        const minX = containerRect.left + margin;

                        // Constrain X position
                        const constrainedX = Math.max(minX, Math.min(maxX, x));

                        // Apply constrained transform
                        if (constrainedX !== x) {
                            style.transform = `translate(${constrainedX}px, ${y}px)`;
                        }
                    }
                }
            });
        };

        // Set up mutation observer to watch for style changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const target = mutation.target as HTMLElement;
                    if (target.hasAttribute('data-rbd-draggable-id') &&
                        target.style.position === 'fixed') {
                        constrainDragPosition();
                    }
                }
            });
        });

        // Start observing
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['style'],
            subtree: true
        });

        // Cleanup
        return () => {
            observer.disconnect();
        };
    }, [containerId, margin]);

    return constraintsRef;
}
