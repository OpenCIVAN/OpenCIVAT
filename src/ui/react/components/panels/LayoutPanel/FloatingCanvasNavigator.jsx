/**
 * FloatingCanvasNavigator
 *
 * Renders when navigator is undocked.
 * Positioned in the canvas/workspace area with drag support.
 *
 * MUST be used inside LayoutPanelProvider to share state with LayoutPanel.
 */

import React, { memo, useContext, useState, useCallback, useRef, useEffect } from 'react';
import LayoutPanelContext from './LayoutPanelContext';
import { CanvasNavigator } from './components/CanvasNavigator/CanvasNavigator';

export const FloatingCanvasNavigator = memo(function FloatingCanvasNavigator({
    onPopOut,
    className = '',
    initialPosition = { x: 16, y: null }, // y: null means bottom-positioned
}) {
    // Get shared logic from context
    const context = useContext(LayoutPanelContext);

    // Drag state
    const [position, setPosition] = useState(initialPosition);
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const containerRef = useRef(null);

    // Calculate initial bottom position on mount
    useEffect(() => {
        if (position.y === null && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setPosition({
                x: position.x,
                y: window.innerHeight - rect.height - 16, // 16px from bottom
            });
        }
    }, [position.y, position.x]);

    // Handle drag start
    const handleDragStart = useCallback((e) => {
        // Only start drag from header
        if (!e.target.closest('.canvas-navigator__header')) return;
        
        e.preventDefault();
        setIsDragging(true);
        
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
            dragOffset.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };
        }
    }, []);

    // Handle drag move
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e) => {
            const newX = Math.max(0, Math.min(window.innerWidth - 420, e.clientX - dragOffset.current.x));
            const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.current.y));
            setPosition({ x: newX, y: newY });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    if (!context) {
        console.warn(
            'FloatingCanvasNavigator must be used within a LayoutPanelProvider.'
        );
        return null;
    }

    const { logic } = context;

    // Only render when undocked
    if (logic.navigatorDocked) return null;

    const style = {
        position: 'absolute',
        left: `${position.x}px`,
        ...(position.y !== null ? { top: `${position.y}px` } : { bottom: '16px' }),
    };

    return (
        <div
            ref={containerRef}
            className={`floating-canvas-navigator ${isDragging ? 'floating-canvas-navigator--dragging' : ''} ${className}`}
            style={style}
            onMouseDown={handleDragStart}
        >
            <CanvasNavigator
                isDocked={false}
                logic={logic}
                onPopOut={onPopOut}
            />
        </div>
    );
});

export default FloatingCanvasNavigator;