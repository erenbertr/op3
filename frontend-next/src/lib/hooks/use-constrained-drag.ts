"use client"

import { useEffect } from 'react';

export function useConstrainedDrag() {
    useEffect(() => {
        let animationFrame: number;

        const constrainDraggedElements = () => {
            const draggedElements = document.querySelectorAll('[data-rbd-draggable-id][style*="position: fixed"]');
            
            draggedElements.forEach((element) => {
                const htmlElement = element as HTMLElement;
                const style = htmlElement.style;
                const transform = style.transform;
                
                if (transform && transform.includes('translate')) {
                    // Extract translate values using regex
                    const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
                    if (match) {
                        const x = parseFloat(match[1]);
                        const y = parseFloat(match[2]);
                        
                        // Get element dimensions
                        const rect = htmlElement.getBoundingClientRect();
                        const elementWidth = rect.width;
                        
                        // Calculate viewport constraints
                        const viewportWidth = window.innerWidth;
                        const margin = 20;
                        
                        // Calculate max X position (prevent going off right edge)
                        const maxX = viewportWidth - elementWidth - margin;
                        const minX = margin;
                        
                        // Constrain X position
                        const constrainedX = Math.max(minX, Math.min(maxX, x));
                        
                        // Apply constrained transform if needed
                        if (constrainedX !== x) {
                            style.transform = `translate(${constrainedX}px, ${y}px)`;
                        }
                    }
                }
            });
            
            // Continue monitoring
            animationFrame = requestAnimationFrame(constrainDraggedElements);
        };

        // Start monitoring when drag starts
        const handleDragStart = () => {
            constrainDraggedElements();
        };

        // Stop monitoring when drag ends
        const handleDragEnd = () => {
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
            }
        };

        // Listen for drag events
        document.addEventListener('dragstart', handleDragStart);
        document.addEventListener('dragend', handleDragEnd);

        // Also use MutationObserver as backup
        const observer = new MutationObserver((mutations) => {
            let shouldConstrain = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const target = mutation.target as HTMLElement;
                    if (target.hasAttribute('data-rbd-draggable-id') && 
                        target.style.position === 'fixed') {
                        shouldConstrain = true;
                    }
                }
            });
            
            if (shouldConstrain) {
                constrainDraggedElements();
            }
        });

        // Start observing
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['style'],
            subtree: true
        });

        // Cleanup
        return () => {
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
            }
            document.removeEventListener('dragstart', handleDragStart);
            document.removeEventListener('dragend', handleDragEnd);
            observer.disconnect();
        };
    }, []);
}
