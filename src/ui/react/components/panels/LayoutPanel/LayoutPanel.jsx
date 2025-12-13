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
    // IMPORTANT: Always pass an object, never null/undefined
    // Using empty object {} when context exists (hooks must always be called)
    const standaloneLogic = useLayoutPanel(context ? {} : { canvasId });

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
            {/* Header - using standard panel-header */}
            <div className="panel-header panel-header--amber">
                <LayoutGrid size={14} className="panel-header__icon" />
                <span className="panel-header__title">Layout</span>
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

export default LayoutPanel;