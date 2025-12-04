/**
 * LayoutPanel Component
 *
 * Main container for the Layout Panel in the left sidebar.
 * Manages canvas navigation, view configuration, and layout tools.
 *
 * Features:
 * - Subtabs: Canvas (amber) and Views (purple)
 * - Dockable Canvas Navigator at bottom
 * - Conditional UI based on navigator docking state
 */

import React, { memo } from 'react';
import { LayoutGrid, Map, Layers } from 'lucide-react';
import { useLayoutPanel } from './LayoutPanel.logic';
import { CanvasNavigator } from './components/CanvasNavigator/CanvasNavigator';
import { CanvasSubtab } from './subtabs/CanvasSubtab';
import { ViewsSubtab } from './subtabs/ViewsSubtab';
import './LayoutPanel.scss';

// Subtab configuration
const SUBTABS = [
    { id: 'canvas', label: 'Canvas', icon: Map, color: 'amber' },
    { id: 'views', label: 'Views', icon: Layers, color: 'purple' },
];

export const LayoutPanel = memo(function LayoutPanel({
    initialCells = [],
    initialCanvasSize,
    initialViewport,
    onCellsChange,
    onCanvasSizeChange,
    onViewportChange,
    onPopOut,
    className = '',
}) {
    // Get all state and handlers from logic hook
    const logic = useLayoutPanel({
        initialCells,
        initialCanvasSize,
        initialViewport,
        onCellsChange,
        onCanvasSizeChange,
        onViewportChange,
    });

    const {
        panelSubtab,
        setPanelSubtab,
        navigatorDocked,
        cells,
    } = logic;

    return (
        <div className={`layout-panel ${className}`}>
            {/* Panel Header */}
            <div className="layout-panel__header">
                <LayoutGrid size={14} className="layout-panel__header-icon" />
                <span className="layout-panel__header-title">Layout</span>
            </div>

            {/* Subtab Navigation */}
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
                            {badge !== null && (
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
 * Floating Canvas Navigator
 *
 * Renders when navigator is undocked.
 * Should be positioned in the canvas area.
 */
export const FloatingCanvasNavigator = memo(function FloatingCanvasNavigator({
    logic,
    onPopOut,
    className = '',
}) {
    if (logic.navigatorDocked) return null;

    return (
        <div className={`floating-canvas-navigator ${className}`}>
            <CanvasNavigator
                isDocked={false}
                logic={logic}
                onPopOut={onPopOut}
            />
        </div>
    );
});

export default LayoutPanel;