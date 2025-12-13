// src/ui/react/components/panels/LayoutPanel/FloatingCanvasNavigator.jsx
// Floating Canvas Navigator - renders the navigator based on dock position
//
// This component handles:
// - Float position with drag-and-drop
// - Corner snapping positions
// - Minimized state
// - localStorage persistence for position
//
// When docked to left panel, LayoutTab handles rendering instead.

import React, { memo, useState, useEffect, useCallback, useRef } from 'react';
import { useLayoutPanelContext } from './LayoutPanelContext';
import { CanvasNavigator } from './components/CanvasNavigator/CanvasNavigator';
import { DOCK_POSITIONS } from './components/CanvasNavigator/CanvasNavigator.logic';
import { Grid3X3, Maximize2 } from 'lucide-react';
import './FloatingCanvasNavigator.scss';

// Corner position styles
const CORNER_POSITIONS = {
    [DOCK_POSITIONS.TOP_LEFT]: { top: 70, left: 16 },
    [DOCK_POSITIONS.TOP_RIGHT]: { top: 70, right: 16 },
    [DOCK_POSITIONS.BOTTOM_LEFT]: { bottom: 70, left: 16 },
    [DOCK_POSITIONS.BOTTOM_RIGHT]: { bottom: 70, right: 16 },
};

// LocalStorage key for float position
const FLOAT_POSITION_KEY = 'cia-navigator-float-position';

/**
 * Load float position from localStorage
 */
function loadFloatPosition() {
    try {
        const stored = localStorage.getItem(FLOAT_POSITION_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Validate it's within viewport
            if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
                return {
                    x: Math.max(0, Math.min(window.innerWidth - 500, parsed.x)),
                    y: Math.max(60, Math.min(window.innerHeight - 400, parsed.y)),
                };
            }
        }
    } catch (e) {
        console.warn('Failed to load navigator position:', e);
    }
    return { x: 100, y: 100 };
}

/**
 * FloatingCanvasNavigator
 * 
 * Renders the CanvasNavigator in floating/corner positions.
 * When docked to left panel, rendering is handled by LayoutTab instead.
 */
export const FloatingCanvasNavigator = memo(function FloatingCanvasNavigator({
    className = '',
}) {
    const context = useLayoutPanelContext();

    // Float position state (persisted)
    const [floatPosition, setFloatPosition] = useState(loadFloatPosition);

    // Drag state
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef(null);
    const containerRef = useRef(null);

    // Don't render if no context
    if (!context?.logic) {
        return null;
    }

    const { logic } = context;

    // Get dock position from logic or default to FLOAT
    const dockPosition = logic.dockPosition || DOCK_POSITIONS.FLOAT;
    const setDockPosition = logic.setDockPosition || (() => { });

    // Save float position to localStorage when it changes
    useEffect(() => {
        if (dockPosition === DOCK_POSITIONS.FLOAT && !isDragging) {
            try {
                localStorage.setItem(FLOAT_POSITION_KEY, JSON.stringify(floatPosition));
            } catch (e) {
                console.warn('Failed to save navigator position:', e);
            }
        }
    }, [floatPosition, dockPosition, isDragging]);

    // Drag start handler
    const handleDragStart = useCallback((e) => {
        // Only allow dragging in float mode
        if (dockPosition !== DOCK_POSITIONS.FLOAT) return;

        // Don't drag from interactive elements
        if (e.target.closest('button, input, .canvas-navigator__grid')) return;

        // Only drag from header area
        if (!e.target.closest('.canvas-navigator__header, .canvas-navigator__drag-handle')) return;

        setIsDragging(true);
        dragStartRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startPosX: floatPosition.x,
            startPosY: floatPosition.y,
        };
        e.preventDefault();
    }, [dockPosition, floatPosition]);

    // Drag move handler
    const handleDragMove = useCallback((e) => {
        if (!isDragging || !dragStartRef.current) return;

        const { startX, startY, startPosX, startPosY } = dragStartRef.current;
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        // Clamp to viewport bounds
        const maxX = window.innerWidth - 500; // navigator width
        const maxY = window.innerHeight - 400; // approximate height

        setFloatPosition({
            x: Math.max(0, Math.min(maxX, startPosX + deltaX)),
            y: Math.max(60, Math.min(maxY, startPosY + deltaY)), // 60px for top bar
        });
    }, [isDragging]);

    // Drag end handler
    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
        dragStartRef.current = null;
    }, []);

    // Global mouse handlers for dragging
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
            document.body.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';

            return () => {
                window.removeEventListener('mousemove', handleDragMove);
                window.removeEventListener('mouseup', handleDragEnd);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            };
        }
    }, [isDragging, handleDragMove, handleDragEnd]);

    // Don't render if docked in left panel (LayoutTab handles that)
    if (dockPosition === DOCK_POSITIONS.LEFT_PANEL) {
        return null;
    }

    // Minimized state - just show a button
    if (dockPosition === DOCK_POSITIONS.MINIMIZED) {
        return (
            <button
                className={`floating-canvas-navigator floating-canvas-navigator--minimized ${className}`}
                onClick={() => setDockPosition(DOCK_POSITIONS.FLOAT)}
                title="Open Canvas Navigator"
            >
                <Grid3X3 size={14} />
                <span>Navigator</span>
                <Maximize2 size={12} />
            </button>
        );
    }

    // Calculate position style
    let positionStyle = {};

    if (dockPosition === DOCK_POSITIONS.FLOAT) {
        positionStyle = {
            position: 'fixed',
            left: floatPosition.x,
            top: floatPosition.y,
        };
    } else if (CORNER_POSITIONS[dockPosition]) {
        positionStyle = {
            position: 'fixed',
            ...CORNER_POSITIONS[dockPosition],
        };
    }

    // Check if corner docked (for opacity effect)
    const isCornerDocked = Object.keys(CORNER_POSITIONS).includes(dockPosition);

    return (
        <div
            ref={containerRef}
            className={`floating-canvas-navigator ${isDragging ? 'floating-canvas-navigator--dragging' : ''} ${isCornerDocked ? 'floating-canvas-navigator--corner' : ''} ${className}`}
            style={positionStyle}
            onMouseDown={handleDragStart}
        >
            <CanvasNavigator
                logic={logic}
                onClose={() => setDockPosition(DOCK_POSITIONS.MINIMIZED)}
            />
        </div>
    );
});

export default FloatingCanvasNavigator;