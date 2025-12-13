// src/ui/react/components/panels/LayoutPanel/FloatingCanvasNavigator.jsx
// Floating Canvas Navigator - renders the navigator based on dock position
//
// IMPORTANT: Import DOCK_POSITIONS from LayoutPanelContext, NOT from
// CanvasNavigator.logic.js to ensure consistent comparisons.
//
// SIZE CONSTRAINTS UPDATED:
// - MIN_SIZE: 400x300 (was 280x200) - ensures controls always fit
// - DEFAULT_SIZE: 580x400 (was 520x380) - comfortable default
// - MAX_SIZE: 900x700 - prevents over-sizing
// - COMPACT_THRESHOLD: 480 (was 350) - switch to compact layout

import React, { memo, useState, useEffect, useCallback, useRef } from 'react';
import { useLayoutPanelContext, DOCK_POSITIONS } from './LayoutPanelContext';
import { CanvasNavigator } from './components/CanvasNavigator/CanvasNavigator';
import { Grid3X3, Maximize2 } from 'lucide-react';
import './FloatingCanvasNavigator.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

// Corner position styles
const CORNER_POSITIONS = {
    [DOCK_POSITIONS.TOP_LEFT]: { top: 70, left: 16 },
    [DOCK_POSITIONS.TOP_RIGHT]: { top: 70, right: 16 },
    [DOCK_POSITIONS.BOTTOM_LEFT]: { bottom: 70, left: 16 },
    [DOCK_POSITIONS.BOTTOM_RIGHT]: { bottom: 70, right: 16 },
};

// LocalStorage keys
const FLOAT_POSITION_KEY = 'cia-navigator-float-position';
const FLOAT_SIZE_KEY = 'cia-navigator-float-size';

// Size constraints - UPDATED for better usability
const DEFAULT_SIZE = { width: 580, height: 400 };   // Comfortable default
const MIN_SIZE = { width: 400, height: 300 };       // Ensures controls always fit
const MAX_SIZE = { width: 900, height: 700 };       // Prevents over-sizing
const COMPACT_THRESHOLD = 480;                       // Width to switch to compact mode

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Load float position from localStorage
 */
function loadFloatPosition() {
    try {
        const stored = localStorage.getItem(FLOAT_POSITION_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
                return {
                    x: Math.max(0, Math.min(window.innerWidth - MIN_SIZE.width, parsed.x)),
                    y: Math.max(60, Math.min(window.innerHeight - MIN_SIZE.height, parsed.y)),
                };
            }
        }
    } catch (e) {
        console.warn('[FloatingCanvasNavigator] Failed to load position:', e);
    }
    return { x: 100, y: 100 };
}

/**
 * Load float size from localStorage with MIN/MAX bounds
 */
function loadFloatSize() {
    try {
        const stored = localStorage.getItem(FLOAT_SIZE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
                return {
                    width: Math.max(MIN_SIZE.width, Math.min(MAX_SIZE.width, parsed.width)),
                    height: Math.max(MIN_SIZE.height, Math.min(MAX_SIZE.height, parsed.height)),
                };
            }
        }
    } catch (e) {
        console.warn('[FloatingCanvasNavigator] Failed to load size:', e);
    }
    return { ...DEFAULT_SIZE };
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * FloatingCanvasNavigator
 *
 * Renders the CanvasNavigator in floating/corner positions.
 *
 * RENDER CONDITIONS:
 * - Returns null if dockPosition === LEFT_PANEL (LayoutPanel handles that)
 * - Returns minimized button if dockPosition === MINIMIZED
 * - Otherwise renders the full navigator
 */
export const FloatingCanvasNavigator = memo(function FloatingCanvasNavigator({
    className = '',
}) {
    const context = useLayoutPanelContext();

    // Float position state (persisted)
    const [floatPosition, setFloatPosition] = useState(loadFloatPosition);

    // Float size state (persisted)
    const [floatSize, setFloatSize] = useState(loadFloatSize);

    // Drag state
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef(null);
    const containerRef = useRef(null);

    // Resize state
    const [isResizing, setIsResizing] = useState(false);
    const [resizeDirection, setResizeDirection] = useState(null);
    const resizeStartRef = useRef(null);

    // Compact mode based on width
    const isCompact = floatSize.width < COMPACT_THRESHOLD;

    // Extract values from context (with safe defaults)
    const logic = context?.logic;
    const contextDockPosition = context?.dockPosition;
    const dockPosition = contextDockPosition || logic?.dockPosition || DOCK_POSITIONS.FLOAT;
    const setDockPosition = logic?.setDockPosition || (() => { });

    // ==========================================================================
    // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
    // ==========================================================================

    // Save float position to localStorage when it changes
    useEffect(() => {
        if (dockPosition === DOCK_POSITIONS.FLOAT && !isDragging) {
            try {
                localStorage.setItem(FLOAT_POSITION_KEY, JSON.stringify(floatPosition));
            } catch (e) {
                console.warn('[FloatingCanvasNavigator] Failed to save position:', e);
            }
        }
    }, [floatPosition, dockPosition, isDragging]);

    // Save float size to localStorage when it changes
    useEffect(() => {
        if (dockPosition === DOCK_POSITIONS.FLOAT && !isResizing) {
            try {
                localStorage.setItem(FLOAT_SIZE_KEY, JSON.stringify(floatSize));
            } catch (e) {
                console.warn('[FloatingCanvasNavigator] Failed to save size:', e);
            }
        }
    }, [floatSize, dockPosition, isResizing]);

    // ==========================================================================
    // DRAG HANDLERS
    // ==========================================================================

    const handleDragStart = useCallback((e) => {
        // Only allow dragging in float mode
        if (dockPosition !== DOCK_POSITIONS.FLOAT) return;

        // Don't drag from interactive elements
        if (e.target.closest('button, input, .canvas-navigator__grid')) return;

        // Only drag from header area
        if (!e.target.closest('.canvas-navigator__header, .canvas-navigator__drag-handle')) return;

        e.preventDefault();
        setIsDragging(true);
        dragStartRef.current = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            posX: floatPosition.x,
            posY: floatPosition.y,
        };

        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
    }, [dockPosition, floatPosition]);

    const handleDragMove = useCallback((e) => {
        if (!isDragging || !dragStartRef.current) return;

        const dx = e.clientX - dragStartRef.current.mouseX;
        const dy = e.clientY - dragStartRef.current.mouseY;

        setFloatPosition({
            x: Math.max(0, Math.min(window.innerWidth - MIN_SIZE.width, dragStartRef.current.posX + dx)),
            y: Math.max(60, Math.min(window.innerHeight - MIN_SIZE.height, dragStartRef.current.posY + dy)),
        });
    }, [isDragging]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
        dragStartRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, []);

    // Global mouse event listeners for drag
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
            return () => {
                window.removeEventListener('mousemove', handleDragMove);
                window.removeEventListener('mouseup', handleDragEnd);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            };
        }
    }, [isDragging, handleDragMove, handleDragEnd]);

    // ==========================================================================
    // RESIZE HANDLERS
    // ==========================================================================

    const handleResizeStart = useCallback((direction, e) => {
        if (dockPosition !== DOCK_POSITIONS.FLOAT) return;

        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        setResizeDirection(direction);
        resizeStartRef.current = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            width: floatSize.width,
            height: floatSize.height,
            posX: floatPosition.x,
            posY: floatPosition.y,
        };

        document.body.style.userSelect = 'none';
    }, [dockPosition, floatSize, floatPosition]);

    const handleResizeMove = useCallback((e) => {
        if (!isResizing || !resizeStartRef.current) return;

        const dx = e.clientX - resizeStartRef.current.mouseX;
        const dy = e.clientY - resizeStartRef.current.mouseY;
        const dir = resizeDirection;

        let newWidth = resizeStartRef.current.width;
        let newHeight = resizeStartRef.current.height;
        let newX = resizeStartRef.current.posX;
        let newY = resizeStartRef.current.posY;

        // Handle horizontal resize with MIN and MAX bounds
        if (dir.includes('e')) {
            newWidth = Math.min(MAX_SIZE.width, Math.max(MIN_SIZE.width, resizeStartRef.current.width + dx));
        }
        if (dir.includes('w')) {
            const maxDelta = resizeStartRef.current.width - MIN_SIZE.width;
            const minDelta = resizeStartRef.current.width - MAX_SIZE.width;
            const widthDelta = Math.max(minDelta, Math.min(maxDelta, dx));
            newWidth = resizeStartRef.current.width - widthDelta;
            newX = resizeStartRef.current.posX + widthDelta;
        }

        // Handle vertical resize with MIN and MAX bounds
        if (dir.includes('s')) {
            newHeight = Math.min(MAX_SIZE.height, Math.max(MIN_SIZE.height, resizeStartRef.current.height + dy));
        }
        if (dir.includes('n')) {
            const maxDelta = resizeStartRef.current.height - MIN_SIZE.height;
            const minDelta = resizeStartRef.current.height - MAX_SIZE.height;
            const heightDelta = Math.max(minDelta, Math.min(maxDelta, dy));
            newHeight = resizeStartRef.current.height - heightDelta;
            newY = resizeStartRef.current.posY + heightDelta;
        }

        setFloatSize({ width: newWidth, height: newHeight });
        if (dir.includes('w') || dir.includes('n')) {
            setFloatPosition({ x: newX, y: newY });
        }
    }, [isResizing, resizeDirection]);

    const handleResizeEnd = useCallback(() => {
        setIsResizing(false);
        setResizeDirection(null);
        resizeStartRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, []);

    // Global mouse event listeners for resize
    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', handleResizeMove);
            window.addEventListener('mouseup', handleResizeEnd);
            return () => {
                window.removeEventListener('mousemove', handleResizeMove);
                window.removeEventListener('mouseup', handleResizeEnd);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            };
        }
    }, [isResizing, handleResizeMove, handleResizeEnd]);

    // ==========================================================================
    // CONDITIONAL RETURNS - Only AFTER all hooks have been called
    // ==========================================================================

    // Don't render if no context available
    if (!context?.logic) {
        return null;
    }

    // DON'T render if docked in left panel - LayoutPanel handles that
    if (dockPosition === DOCK_POSITIONS.LEFT_PANEL) {
        return null;
    }

    // ==========================================================================
    // RENDER - MINIMIZED STATE
    // ==========================================================================

    if (dockPosition === DOCK_POSITIONS.MINIMIZED) {
        return null;
    }

    // ==========================================================================
    // RENDER - FLOATING/CORNER STATE
    // ==========================================================================

    // Calculate position style
    let positionStyle = {};

    if (dockPosition === DOCK_POSITIONS.FLOAT) {
        positionStyle = {
            position: 'fixed',
            left: floatPosition.x,
            top: floatPosition.y,
            width: floatSize.width,
            height: floatSize.height,
        };
    } else if (CORNER_POSITIONS[dockPosition]) {
        positionStyle = {
            position: 'fixed',
            ...CORNER_POSITIONS[dockPosition],
            // Corner positions use default size
            width: DEFAULT_SIZE.width,
            height: DEFAULT_SIZE.height,
        };
    }

    // Check if corner docked (for opacity effect)
    const isCornerDocked = Object.keys(CORNER_POSITIONS).includes(dockPosition);
    const isFloating = dockPosition === DOCK_POSITIONS.FLOAT;

    return (
        <div
            ref={containerRef}
            className={`floating-canvas-navigator ${isDragging ? 'floating-canvas-navigator--dragging' : ''} ${isResizing ? 'floating-canvas-navigator--resizing' : ''} ${isCornerDocked ? 'floating-canvas-navigator--corner' : ''} ${isCompact ? 'floating-canvas-navigator--compact' : ''} ${className}`}
            style={positionStyle}
            onMouseDown={handleDragStart}
        >
            <CanvasNavigator
                logic={logic}
                onClose={() => setDockPosition(DOCK_POSITIONS.MINIMIZED)}
                isCompact={isCompact}
            />

            {/* Resize handles - only in float mode */}
            {isFloating && (
                <>
                    {/* Edge handles */}
                    <div
                        className="floating-canvas-navigator__resize-handle floating-canvas-navigator__resize-handle--e"
                        onMouseDown={(e) => handleResizeStart('e', e)}
                    />
                    <div
                        className="floating-canvas-navigator__resize-handle floating-canvas-navigator__resize-handle--s"
                        onMouseDown={(e) => handleResizeStart('s', e)}
                    />
                    <div
                        className="floating-canvas-navigator__resize-handle floating-canvas-navigator__resize-handle--w"
                        onMouseDown={(e) => handleResizeStart('w', e)}
                    />
                    <div
                        className="floating-canvas-navigator__resize-handle floating-canvas-navigator__resize-handle--n"
                        onMouseDown={(e) => handleResizeStart('n', e)}
                    />
                    {/* Corner handles */}
                    <div
                        className="floating-canvas-navigator__resize-handle floating-canvas-navigator__resize-handle--se"
                        onMouseDown={(e) => handleResizeStart('se', e)}
                    />
                    <div
                        className="floating-canvas-navigator__resize-handle floating-canvas-navigator__resize-handle--sw"
                        onMouseDown={(e) => handleResizeStart('sw', e)}
                    />
                    <div
                        className="floating-canvas-navigator__resize-handle floating-canvas-navigator__resize-handle--ne"
                        onMouseDown={(e) => handleResizeStart('ne', e)}
                    />
                    <div
                        className="floating-canvas-navigator__resize-handle floating-canvas-navigator__resize-handle--nw"
                        onMouseDown={(e) => handleResizeStart('nw', e)}
                    />
                </>
            )}
        </div>
    );
});

// =============================================================================
// HOOK EXPORT - For secondary bottom bar integration
// =============================================================================

/**
 * Hook for rendering the Navigator button in the secondary bottom bar
 * Provides state and methods to control the navigator from external components.
 */
export function useNavigatorButton() {
    const context = useLayoutPanelContext();
    const logic = context?.logic;
    const dockPosition = context?.dockPosition || logic?.dockPosition || DOCK_POSITIONS.FLOAT;
    const setDockPosition = logic?.setDockPosition || (() => { });

    const isMinimized = dockPosition === DOCK_POSITIONS.MINIMIZED;
    const isDocked = dockPosition === DOCK_POSITIONS.LEFT_PANEL;
    const isFloating = !isMinimized && !isDocked;

    const openNavigator = useCallback(() => {
        setDockPosition(DOCK_POSITIONS.FLOAT);
    }, [setDockPosition]);

    const minimizeNavigator = useCallback(() => {
        setDockPosition(DOCK_POSITIONS.MINIMIZED);
    }, [setDockPosition]);

    const toggleNavigator = useCallback(() => {
        if (isMinimized || isDocked) {
            setDockPosition(DOCK_POSITIONS.FLOAT);
        } else {
            setDockPosition(DOCK_POSITIONS.MINIMIZED);
        }
    }, [isMinimized, isDocked, setDockPosition]);

    return {
        isMinimized,
        isDocked,
        isFloating,
        openNavigator,
        minimizeNavigator,
        toggleNavigator,
        dockPosition,
        setDockPosition,
    };
}

export default FloatingCanvasNavigator;