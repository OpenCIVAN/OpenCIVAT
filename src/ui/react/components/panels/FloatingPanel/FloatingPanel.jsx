// src/ui/react/components/panels/FloatingPanel/FloatingPanel.jsx
// Draggable, resizable floating panel component
// Can be used for popped-out panels on desktop or positioned in 3D space for VR

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Minus, Maximize2, Minimize2, PinOff, GripVertical } from 'lucide-react';
import { useFloatingPanels, FLOATING_PANEL_DEFAULTS } from './FloatingPanelContext';
import './FloatingPanel.scss';

// =============================================================================
// FLOATING PANEL COMPONENT
// =============================================================================

/**
 * FloatingPanel - A draggable, resizable panel that floats above the main UI
 *
 * @param {string} panelId - Unique identifier for this panel
 * @param {string} title - Panel title shown in header
 * @param {React.Element} icon - Icon component to show in header
 * @param {string} color - Accent color (blue, purple, teal, etc.)
 * @param {React.ReactNode} children - Panel content
 * @param {Function} onDock - Callback when user clicks dock button
 */
export function FloatingPanel({
    panelId,
    title,
    icon: Icon,
    color = 'blue',
    children,
    onDock,
}) {
    const {
        getPanelState,
        updatePanelPosition,
        updatePanelSize,
        bringToFront,
        dockPanel,
    } = useFloatingPanels();

    const panelState = getPanelState(panelId);
    const panelRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const resizeStart = useRef({ width: 0, height: 0, x: 0, y: 0 });

    // Don't render if not popped out
    if (!panelState) return null;

    const { x, y, width, height, zIndex } = panelState;

    // Handle drag start
    const handleDragStart = useCallback((e) => {
        if (e.target.closest('.floating-panel__controls')) return;
        e.preventDefault();
        setIsDragging(true);
        bringToFront(panelId);
        dragOffset.current = {
            x: e.clientX - x,
            y: e.clientY - y,
        };
    }, [x, y, panelId, bringToFront]);

    // Handle drag move
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e) => {
            const newX = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.current.x));
            const newY = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.current.y));
            updatePanelPosition(panelId, newX, newY);
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
    }, [isDragging, panelId, updatePanelPosition]);

    // Handle resize start
    const handleResizeStart = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        bringToFront(panelId);
        resizeStart.current = {
            width,
            height,
            x: e.clientX,
            y: e.clientY,
        };
    }, [width, height, panelId, bringToFront]);

    // Handle resize move
    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e) => {
            const deltaX = e.clientX - resizeStart.current.x;
            const deltaY = e.clientY - resizeStart.current.y;
            const newWidth = resizeStart.current.width + deltaX;
            const newHeight = resizeStart.current.height + deltaY;
            updatePanelSize(panelId, newWidth, newHeight);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, panelId, updatePanelSize]);

    // Handle panel focus on click
    const handlePanelClick = useCallback(() => {
        bringToFront(panelId);
    }, [panelId, bringToFront]);

    // Handle dock button
    const handleDock = useCallback(() => {
        if (onDock) {
            onDock();
        }
        dockPanel(panelId);
    }, [panelId, dockPanel, onDock]);

    const panelStyle = {
        left: `${x}px`,
        top: `${y}px`,
        width: minimized ? '280px' : `${width}px`,
        height: minimized ? 'auto' : `${height}px`,
        zIndex,
    };

    return createPortal(
        <div
            ref={panelRef}
            className={`floating-panel ${isDragging ? 'floating-panel--dragging' : ''} ${isResizing ? 'floating-panel--resizing' : ''} ${minimized ? 'floating-panel--minimized' : ''}`}
            style={panelStyle}
            onClick={handlePanelClick}
            data-color={color}
        >
            {/* Header - draggable area */}
            <div
                className="floating-panel__header"
                onMouseDown={handleDragStart}
            >
                <div className="floating-panel__drag-handle">
                    <GripVertical size={14} />
                </div>
                {Icon && (
                    <div className="floating-panel__icon">
                        <Icon size={16} />
                    </div>
                )}
                <div className="floating-panel__title">{title}</div>

                <div className="floating-panel__controls">
                    <button
                        className="floating-panel__control-btn"
                        onClick={() => setMinimized(!minimized)}
                        title={minimized ? 'Expand' : 'Minimize'}
                    >
                        {minimized ? <Maximize2 size={14} /> : <Minus size={14} />}
                    </button>
                    <button
                        className="floating-panel__control-btn"
                        onClick={handleDock}
                        title="Dock panel"
                    >
                        <PinOff size={14} />
                    </button>
                    <button
                        className="floating-panel__control-btn floating-panel__control-btn--close"
                        onClick={handleDock}
                        title="Close"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Content */}
            {!minimized && (
                <div className="floating-panel__content">
                    {children}
                </div>
            )}

            {/* Resize handle */}
            {!minimized && (
                <div
                    className="floating-panel__resize-handle"
                    onMouseDown={handleResizeStart}
                />
            )}
        </div>,
        document.body
    );
}

// =============================================================================
// FLOATING PANEL PORTAL - Renders all active floating panels
// =============================================================================

/**
 * FloatingPanelPortal - Renders all currently floating panels
 * Place this near the root of your app
 */
export function FloatingPanelPortal() {
    const { floatingPanels } = useFloatingPanels();

    // This component just provides the portal target
    // Individual panels render themselves via createPortal
    return null;
}

export default FloatingPanel;