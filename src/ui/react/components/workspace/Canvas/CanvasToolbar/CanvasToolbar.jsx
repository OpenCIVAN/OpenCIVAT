// src/ui/react/components/workspace/Canvas/CanvasToolbar/CanvasToolbar.jsx
// Canvas toolbar footer with view mode, navigation, history, and view actions
//
// Replaces SecondaryFooter for canvas-centric architecture
// Part of the new canvas chrome system

import React, { memo, useCallback } from 'react';
import { IconButton, ButtonGroup, Icon } from '@UI/react/components/atoms';
import { useViewStack, VIEW_TYPES } from '@UI/react/hooks/useViewStack.js';
import './CanvasToolbar.scss';

// =============================================================================
// VIEW MODE TOGGLE
// =============================================================================

const ViewModeToggle = memo(function ViewModeToggle({ disabled }) {
    const { currentView, isGridView, isFocusView, isSubsetView, goHome } = useViewStack();

    // In focus/subset mode, show the current mode with a back option
    // This is informational since navigation is handled via breadcrumb/back button
    return (
        <div className="canvas-toolbar__view-mode">
            <span className="canvas-toolbar__zone-label">View</span>
            <div className="canvas-toolbar__view-mode-display">
                <ButtonGroup gap="xs">
                    <button
                        type="button"
                        className={`canvas-toolbar__mode-btn ${isGridView ? 'canvas-toolbar__mode-btn--active' : ''}`}
                        onClick={goHome}
                        disabled={isGridView}
                        title="Grid View"
                    >
                        <Icon name="grid" size={14} />
                        <span>Grid</span>
                    </button>
                    {isFocusView && (
                        <button
                            type="button"
                            className="canvas-toolbar__mode-btn canvas-toolbar__mode-btn--active"
                            disabled
                            title="Focus View"
                        >
                            <Icon name="focus" size={14} />
                            <span>Focus</span>
                        </button>
                    )}
                    {isSubsetView && (
                        <button
                            type="button"
                            className="canvas-toolbar__mode-btn canvas-toolbar__mode-btn--active"
                            disabled
                            title="Subset View"
                        >
                            <Icon name="layers" size={14} />
                            <span>Subset</span>
                        </button>
                    )}
                </ButtonGroup>
            </div>
        </div>
    );
});

// =============================================================================
// HISTORY ZONE
// =============================================================================

const HistoryZone = memo(function HistoryZone({
    canUndo,
    canRedo,
    onUndo,
    onRedo,
}) {
    return (
        <div className="canvas-toolbar__zone canvas-toolbar__zone--history">
            <span className="canvas-toolbar__zone-label">History</span>
            <div className="canvas-toolbar__zone-content">
                <ButtonGroup gap="xs">
                    <IconButton
                        icon="undo"
                        label="Undo"
                        size="sm"
                        disabled={!canUndo}
                        onClick={onUndo}
                    />
                    <IconButton
                        icon="redo"
                        label="Redo"
                        size="sm"
                        disabled={!canRedo}
                        onClick={onRedo}
                    />
                </ButtonGroup>
            </div>
        </div>
    );
});

// =============================================================================
// SUBSET ZONE (only visible in subset mode)
// =============================================================================

const SubsetZone = memo(function SubsetZone({
    subset,
    subsets = [],
    onSubsetChange,
}) {
    const { isSubsetView } = useViewStack();

    if (!isSubsetView) return null;

    return (
        <div className="canvas-toolbar__zone canvas-toolbar__zone--subset">
            <span className="canvas-toolbar__zone-label">Subset</span>
            <div className="canvas-toolbar__zone-content">
                <select
                    className="canvas-toolbar__subset-select"
                    value={subset?.id || ''}
                    onChange={(e) => onSubsetChange?.(e.target.value)}
                >
                    {subsets.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
            </div>
        </div>
    );
});

// =============================================================================
// ACTIVE VIEW ZONE
// =============================================================================

const ActiveViewZone = memo(function ActiveViewZone({
    activeView,
    availableViews = [],
    onSelectView,
    onPlaceView,
}) {
    const { isFocusView, currentView } = useViewStack();

    // In focus mode, show the focused view info
    const viewInfo = isFocusView ? currentView?.data : activeView;

    if (!viewInfo) {
        return (
            <div className="canvas-toolbar__zone canvas-toolbar__zone--active-view">
                <span className="canvas-toolbar__zone-label">Active View</span>
                <div className="canvas-toolbar__zone-content">
                    <span className="canvas-toolbar__no-view">No view selected</span>
                </div>
            </div>
        );
    }

    return (
        <div className="canvas-toolbar__zone canvas-toolbar__zone--active-view">
            <span className="canvas-toolbar__zone-label">Active View</span>
            <div className="canvas-toolbar__zone-content">
                <div
                    className="canvas-toolbar__view-badge"
                    style={{ '--view-color': viewInfo.color || 'var(--color-accent-blue)' }}
                >
                    <span
                        className="canvas-toolbar__view-dot"
                        style={{ background: viewInfo.color }}
                    />
                    <span className="canvas-toolbar__view-name">{viewInfo.name}</span>
                </div>
                {availableViews.length > 1 && (
                    <select
                        className="canvas-toolbar__view-select"
                        value={viewInfo.id || ''}
                        onChange={(e) => onSelectView?.(e.target.value)}
                    >
                        {availableViews.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                    </select>
                )}
            </div>
        </div>
    );
});

// =============================================================================
// ACTIONS ZONE
// =============================================================================

const ActionsZone = memo(function ActionsZone({
    onSnapshot,
    onDuplicate,
    onSettings,
    onLinks,
    hasLinks,
}) {
    return (
        <div className="canvas-toolbar__zone canvas-toolbar__zone--actions">
            <span className="canvas-toolbar__zone-label">Actions</span>
            <div className="canvas-toolbar__zone-content">
                <ButtonGroup gap="xs">
                    <IconButton
                        icon="link"
                        label="Links"
                        size="sm"
                        active={hasLinks}
                        onClick={onLinks}
                    />
                    <IconButton
                        icon="camera"
                        label="Snapshot"
                        size="sm"
                        onClick={onSnapshot}
                    />
                    <IconButton
                        icon="copy"
                        label="Duplicate"
                        size="sm"
                        onClick={onDuplicate}
                    />
                    <IconButton
                        icon="settings"
                        label="Settings"
                        size="sm"
                        onClick={onSettings}
                    />
                </ButtonGroup>
            </div>
        </div>
    );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * CanvasToolbar - Footer toolbar for canvas workspace
 *
 * Zones:
 * - View Mode: Grid/Focus/Subset indicator
 * - History: Undo/Redo buttons
 * - Subset: Subset selector (subset mode only)
 * - Active View: Currently focused view info
 * - Actions: Links, Snapshot, Duplicate, Settings
 */
export function CanvasToolbar({
    // History
    canUndo = false,
    canRedo = false,
    onUndo,
    onRedo,

    // Subset
    activeSubset,
    subsets = [],
    onSubsetChange,

    // Active view
    activeView,
    availableViews = [],
    onSelectView,
    onPlaceView,

    // Actions
    onSnapshot,
    onDuplicate,
    onSettings,
    onLinks,
    hasLinks = false,

    className = '',
}) {
    return (
        <div className={`canvas-toolbar ${className}`}>
            {/* View Mode */}
            <ViewModeToggle />

            <div className="canvas-toolbar__divider" />

            {/* History */}
            <HistoryZone
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={onUndo}
                onRedo={onRedo}
            />

            <div className="canvas-toolbar__divider" />

            {/* Subset (conditional) */}
            <SubsetZone
                subset={activeSubset}
                subsets={subsets}
                onSubsetChange={onSubsetChange}
            />

            {/* Active View */}
            <ActiveViewZone
                activeView={activeView}
                availableViews={availableViews}
                onSelectView={onSelectView}
                onPlaceView={onPlaceView}
            />

            <div className="canvas-toolbar__spacer" />

            {/* Actions */}
            <ActionsZone
                onSnapshot={onSnapshot}
                onDuplicate={onDuplicate}
                onSettings={onSettings}
                onLinks={onLinks}
                hasLinks={hasLinks}
            />
        </div>
    );
}

export default memo(CanvasToolbar);
