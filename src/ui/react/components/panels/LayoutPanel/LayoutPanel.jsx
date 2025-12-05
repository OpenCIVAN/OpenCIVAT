/**
 * LayoutPanel Component
 *
 * Main container for the Layout Panel in the left sidebar.
 * Manages canvas navigation, view configuration, and layout tools.
 *
 * ARCHITECTURE:
 * - Uses LayoutPanelContext for shared state with FloatingCanvasNavigator
 * - If used inside LayoutPanelProvider: uses shared context
 * - If used standalone: creates its own useLayoutPanel instance
 *
 * Features:
 * - Subtabs: Canvas (amber) and Views (purple)
 * - Dockable Canvas Navigator at bottom
 * - Conditional UI based on navigator docking state
 * - Loading/error states from server connection
 */

import React, { memo, useContext } from 'react';
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
 *
 * @param {Object} props
 * @param {string} [props.canvasId] - Target canvas ID (uses active canvas if not provided)
 * @param {Function} [props.onPopOut] - Callback when user clicks pop-out button
 * @param {string} [props.className] - Additional CSS classes
 */
export const LayoutPanel = memo(function LayoutPanel({
    canvasId,
    onPopOut,
    className = '',
}) {
    // Check if we're inside a LayoutPanelProvider (shared context)
    const context = useContext(LayoutPanelContext);

    // Create standalone logic only if no context is available
    // This allows LayoutPanel to work both with and without the provider
    const standaloneLogic = useLayoutPanel(context ? undefined : { canvasId });

    // Use context logic if available, otherwise use standalone
    const logic = context?.logic || standaloneLogic;

    const {
        panelSubtab,
        setPanelSubtab,
        navigatorDocked,
        cells,
        loading,
        error,
        isConnected,
    } = logic;

    // Render loading state
    if (loading) {
        return (
            <div className={`layout-panel layout-panel--loading ${className}`}>
                <div className="layout-panel__header">
                    <LayoutGrid size={14} className="layout-panel__header-icon" />
                    <span className="layout-panel__header-title">Layout</span>
                </div>
                <div className="layout-panel__loading">
                    <Loader2 size={20} className="layout-panel__loading-spinner" />
                    <span>Loading canvas...</span>
                </div>
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div className={`layout-panel layout-panel--error ${className}`}>
                <div className="layout-panel__header">
                    <LayoutGrid size={14} className="layout-panel__header-icon" />
                    <span className="layout-panel__header-title">Layout</span>
                </div>
                <div className="layout-panel__error">
                    <AlertCircle size={20} />
                    <span>Failed to load canvas</span>
                    <span className="layout-panel__error-detail">
                        {error.message || 'Unknown error'}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className={`layout-panel ${className}`}>
            {/* Panel Header */}
            <div className="layout-panel__header">
                <LayoutGrid size={14} className="layout-panel__header-icon" />
                <span className="layout-panel__header-title">Layout</span>
                {/* Connection indicator */}
                {!isConnected && (
                    <WifiOff
                        size={12}
                        className="layout-panel__header-offline"
                        title="Offline - changes will sync when reconnected"
                    />
                )}
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
 * Floating Canvas Navigator
 *
 * Renders when navigator is undocked.
 * Should be positioned in the canvas/workspace area.
 *
 * MUST be used inside LayoutPanelProvider to share state with LayoutPanel.
 */
export const FloatingCanvasNavigator = memo(function FloatingCanvasNavigator({
    onPopOut,
    className = '',
}) {
    // Get shared logic from context
    const context = useContext(LayoutPanelContext);

    if (!context) {
        console.warn(
            'FloatingCanvasNavigator must be used within a LayoutPanelProvider. ' +
            'The navigator will not render.'
        );
        return null;
    }

    const { logic } = context;

    // Only render when undocked
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