/**
 * LayoutPanel Component
 *
 * Main container for the Layout Panel in the left sidebar.
 * Manages canvas navigation, view configuration, and layout tools.
 */

import React, { memo, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { LayoutGrid, Map, Layers, Loader2, WifiOff, AlertCircle } from 'lucide-react';
import { useLayoutPanel } from './LayoutPanel.logic';
import LayoutPanelContext from './LayoutPanelContext';
import { CanvasNavigator } from './components/CanvasNavigator/CanvasNavigator';
import { CanvasSubtab } from './subtabs/CanvasSubtab';
import { ViewsSubtab } from './subtabs/ViewsSubtab';
import './LayoutPanel.scss';

// Subtab configuration
const SUBTABS = [
    { id: 'canvas', label: 'Canvas', icon: Map, color: 'amber' },
    { id: 'views', label: 'Views', icon: Layers, color: 'purple' },
];

/**
 * LayoutPanel - Main panel component
 */
export const LayoutPanel = memo(function LayoutPanel({
    canvasId,
    onPopOut,
    className = '',
}) {
    const context = useContext(LayoutPanelContext);
    const standaloneLogic = useLayoutPanel(context ? null : { canvasId });
    const logic = context?.logic || standaloneLogic;

    const {
        panelSubtab,
        setPanelSubtab,
        navigatorDocked,
        loading,
        error,
        isConnected,
        cells,
    } = logic;

    // Loading state
    if (loading) {
        return (
            <div className={`layout-panel layout-panel--loading ${className}`}>
                <div className="layout-panel__loading">
                    <Loader2 size={24} className="spin" />
                    <span>Loading canvas...</span>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className={`layout-panel layout-panel--error ${className}`}>
                <div className="layout-panel__error">
                    <AlertCircle size={24} />
                    <span>{error}</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`layout-panel ${!isConnected ? 'layout-panel--disabled' : ''} ${className}`}>
            {/* Header */}
            <div className="layout-panel__header">
                <LayoutGrid size={14} className="layout-panel__header-icon" />
                <span className="layout-panel__title">Layout</span>
                {!isConnected && (
                    <WifiOff size={12} className="layout-panel__header-offline" title="Disconnected" />
                )}
            </div>

            {/* Subtabs */}
            <div className="layout-panel__tabs">
                {SUBTABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = panelSubtab === tab.id;
                    const badge = tab.id === 'views' ? cells.length : null;

                    return (
                        <button
                            key={tab.id}
                            className={`layout-panel__tab ${isActive ? 'layout-panel__tab--active' : ''}`}
                            data-color={tab.color}
                            onClick={() => setPanelSubtab(tab.id)}
                        >
                            <Icon size={12} />
                            <span>{tab.label}</span>
                            {badge !== null && badge > 0 && (
                                <span className="layout-panel__tab-badge">{badge}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Subtab Content */}
            <div className="layout-panel__content">
                {panelSubtab === 'canvas' ? (
                    <CanvasSubtab logic={logic} />
                ) : (
                    <ViewsSubtab logic={logic} />
                )}
            </div>

            {/* Docked Navigator */}
            {navigatorDocked && (
                <div className="layout-panel__navigator">
                    <CanvasNavigator
                        isDocked={true}
                        logic={logic}
                        onPopOut={onPopOut}
                    />
                </div>
            )}
        </div>
    );
});

/**
 * FloatingCanvasNavigator - Draggable floating navigator
 */
export const FloatingCanvasNavigator = memo(function FloatingCanvasNavigator({
    onPopOut,
    className = '',
    initialPosition = { x: 16, y: null },
}) {
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
                y: window.innerHeight - rect.height - 16,
            });
        }
    }, [position.y, position.x]);

    // Handle drag start
    const handleDragStart = useCallback((e) => {
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

        const handleMouseUp = () => setIsDragging(false);

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    if (!context) {
        console.warn('FloatingCanvasNavigator must be used within a LayoutPanelProvider.');
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

export default LayoutPanel;