/**
 * @file TiledCanvasView.logic.js
 * @description Logic hooks for TiledCanvasView component
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Design tokens for canvas sizing
 */
export const CANVAS_SIZING = {
    minCanvasWidth: 280,
    minCanvasHeight: 200,
    dividerSize: 6,
    splitRatioMin: 0.2,
    splitRatioMax: 0.8,
};

/**
 * Workspace type configurations
 */
export const WORKSPACE_TYPE_CONFIG = {
    workspace: { icon: 'square', prefix: null, color: 'blue' },
    subset: { icon: 'filter', prefix: 'Subset:', color: 'amber' },
    scratch: { icon: 'pencil', prefix: null, color: 'green' },
};

/**
 * Hook to manage split ratio and divider dragging
 */
export function useSplitRatio(initialRatio = { h: 0.5, v: 0.5 }) {
    const [splitRatio, setSplitRatio] = useState(initialRatio);
    const [isDragging, setIsDragging] = useState(null);
    const containerRef = useRef(null);

    const handleDividerMouseDown = useCallback((type) => (e) => {
        e.preventDefault();
        setIsDragging(type);
    }, []);

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();

            if (isDragging === 'h') {
                const newRatio = (e.clientX - rect.left) / rect.width;
                setSplitRatio(prev => ({
                    ...prev,
                    h: Math.max(CANVAS_SIZING.splitRatioMin, Math.min(CANVAS_SIZING.splitRatioMax, newRatio)),
                }));
            } else if (isDragging === 'v') {
                const newRatio = (e.clientY - rect.top) / rect.height;
                setSplitRatio(prev => ({
                    ...prev,
                    v: Math.max(CANVAS_SIZING.splitRatioMin, Math.min(CANVAS_SIZING.splitRatioMax, newRatio)),
                }));
            }
        };

        const handleMouseUp = () => {
            setIsDragging(null);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    return {
        splitRatio,
        setSplitRatio,
        isDragging,
        setIsDragging,
        containerRef,
        handleDividerMouseDown,
    };
}

/**
 * Hook to get open workspaces (max 4)
 */
export function useOpenWorkspaces(workspaces) {
    const openWorkspaces = workspaces.filter(w => w.isOpen);
    const visibleCount = Math.min(openWorkspaces.length, 4);
    const visibleWorkspaces = openWorkspaces.slice(0, 4);

    return {
        openWorkspaces: visibleWorkspaces,
        count: visibleCount,
    };
}

/**
 * Get layout configuration based on count
 */
export function getLayoutConfig(count) {
    switch (count) {
        case 1:
            return { type: 'single' };
        case 2:
            return { type: 'horizontal-split' };
        case 3:
        case 4:
            return { type: 'grid' };
        default:
            return { type: 'empty' };
    }
}
