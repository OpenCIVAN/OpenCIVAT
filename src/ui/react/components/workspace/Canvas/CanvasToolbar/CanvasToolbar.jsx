// src/ui/react/components/workspace/Canvas/CanvasToolbar/CanvasToolbar.jsx
// Canvas toolbar footer with view mode, navigation, history, and view actions
//
// Based on canvas-chrome-v12.jsx spec
// Height: 66px (18px label bar + 48px content bar)
// Layout: View Mode | Navigation | History | [Subset] | Active View | Actions

import React, { memo, useState, useCallback, useMemo } from 'react';
import { IconButton, ButtonGroup, Icon } from '@UI/react/components/atoms';
import { useViewStack, VIEW_TYPES } from '@UI/react/hooks/useViewStack.js';
import { LinksDropdown } from '../LinksDropdown/LinksDropdown.jsx';
import { CANVAS_MODES, ASPECT_RATIOS } from '../FloatingCanvas';
import './CanvasToolbar.scss';

// =============================================================================
// ZONE DEFINITIONS (per canvas-chrome-v12 spec)
// =============================================================================

const ZONES = {
    viewMode: { width: 110, label: 'View Mode' },
    navigation: { width: 160, label: 'Navigation' },
    history: { width: 70, label: 'History' },
    subset: { width: 100, label: 'Subset' },
    activeView: { label: 'Active View' }, // flex
    actions: { width: 160, label: 'View Actions' },
};

// =============================================================================
// ZONE LABEL BAR
// =============================================================================

const ZoneLabelBar = memo(function ZoneLabelBar({ showSubset }) {
    return (
        <div className="canvas-toolbar__label-bar">
            <div className="canvas-toolbar__label" style={{ width: ZONES.viewMode.width }}>
                {ZONES.viewMode.label}
            </div>
            <div className="canvas-toolbar__label-separator" />
            <div className="canvas-toolbar__label" style={{ width: ZONES.navigation.width }}>
                {ZONES.navigation.label}
            </div>
            <div className="canvas-toolbar__label-separator" />
            <div className="canvas-toolbar__label" style={{ width: ZONES.history.width }}>
                {ZONES.history.label}
            </div>

            {/* Center - flexible zones */}
            <div className="canvas-toolbar__label-center">
                {showSubset && (
                    <>
                        <div className="canvas-toolbar__label" style={{ width: ZONES.subset.width }}>
                            {ZONES.subset.label}
                        </div>
                        <div className="canvas-toolbar__label-separator" />
                    </>
                )}
                <div className="canvas-toolbar__label canvas-toolbar__label--flex">
                    {showSubset ? 'Active in Subset' : 'Active View'}
                </div>
            </div>

            <div className="canvas-toolbar__label-separator" />
            <div className="canvas-toolbar__label" style={{ width: ZONES.actions.width, textAlign: 'right' }}>
                {ZONES.actions.label}
            </div>
        </div>
    );
});

// =============================================================================
// VIEW MODE TOGGLE (Grid/Focus/Subset)
// =============================================================================

const VIEW_MODES = [
    { id: 'grid', icon: 'grid', label: 'Grid' },
    { id: 'focus', icon: 'focus', label: 'Focus' },
    { id: 'subset', icon: 'layers', label: 'Subset' },
];

const ViewModeZone = memo(function ViewModeZone({
    focusDisabled,
    subsetDisabled,
    onEnterFocus,
    onEnterSubset,
}) {
    const { isGridView, isFocusView, isSubsetView, goHome } = useViewStack();

    const currentMode = isSubsetView ? 'subset' : isFocusView ? 'focus' : 'grid';

    const handleModeChange = useCallback((mode) => {
        if (mode === 'grid') goHome();
        else if (mode === 'focus' && onEnterFocus) onEnterFocus();
        else if (mode === 'subset' && onEnterSubset) onEnterSubset();
    }, [goHome, onEnterFocus, onEnterSubset]);

    return (
        <div className="canvas-toolbar__zone" style={{ width: ZONES.viewMode.width }}>
            <div className="canvas-toolbar__mode-toggle">
                {VIEW_MODES.map(({ id, icon, label }) => {
                    const isActive = currentMode === id;
                    const isDisabled = (id === 'focus' && focusDisabled) || (id === 'subset' && subsetDisabled);
                    return (
                        <button
                            key={id}
                            type="button"
                            className={`canvas-toolbar__mode-btn ${isActive ? 'canvas-toolbar__mode-btn--active' : ''}`}
                            onClick={() => handleModeChange(id)}
                            disabled={isDisabled || isActive}
                            title={isDisabled ? `${label} unavailable` : label}
                        >
                            <Icon name={icon} size={14} />
                        </button>
                    );
                })}
            </div>
        </div>
    );
});

// =============================================================================
// NAVIGATION ZONE (Home, Bookmark, Arrows, Position)
// =============================================================================

const NavigationZone = memo(function NavigationZone({
    viewportPosition = { row: 0, col: 0 },
    homePosition = { row: 0, col: 0 },
    onNavigate,
    onGoHome,
    onBookmark,
}) {
    const isAtHome = viewportPosition.row === homePosition.row &&
                     viewportPosition.col === homePosition.col;

    return (
        <div className="canvas-toolbar__zone" style={{ width: ZONES.navigation.width }}>
            <div className="canvas-toolbar__nav-controls">
                <IconButton
                    icon="home"
                    label="Go to Home Position"
                    size="sm"
                    active={isAtHome}
                    onClick={onGoHome}
                />
                <IconButton
                    icon="bookmark"
                    label="Save Position"
                    size="sm"
                    onClick={onBookmark}
                />

                <div className="canvas-toolbar__nav-arrows">
                    <IconButton
                        icon="chevronLeft"
                        label="Pan Left"
                        size="xs"
                        onClick={() => onNavigate?.('left')}
                    />
                    <div className="canvas-toolbar__nav-arrows-vertical">
                        <IconButton
                            icon="chevronUp"
                            label="Pan Up"
                            size="xs"
                            onClick={() => onNavigate?.('up')}
                        />
                        <IconButton
                            icon="chevronDown"
                            label="Pan Down"
                            size="xs"
                            onClick={() => onNavigate?.('down')}
                        />
                    </div>
                    <IconButton
                        icon="chevronRight"
                        label="Pan Right"
                        size="xs"
                        onClick={() => onNavigate?.('right')}
                    />
                </div>

                <span className="canvas-toolbar__position">
                    {viewportPosition.col},{viewportPosition.row}
                </span>
            </div>
        </div>
    );
});

// =============================================================================
// HISTORY ZONE (Undo/Redo)
// =============================================================================

const HistoryZone = memo(function HistoryZone({
    canUndo,
    canRedo,
    onUndo,
    onRedo,
}) {
    return (
        <div className="canvas-toolbar__zone" style={{ width: ZONES.history.width }}>
            <div className="canvas-toolbar__history-controls">
                <IconButton
                    icon="undo"
                    label="Undo (Ctrl+Z)"
                    size="sm"
                    disabled={!canUndo}
                    onClick={onUndo}
                />
                <IconButton
                    icon="redo"
                    label="Redo (Ctrl+Shift+Z)"
                    size="sm"
                    disabled={!canRedo}
                    onClick={onRedo}
                />
            </div>
        </div>
    );
});

// =============================================================================
// SUBSET ZONE (Subset picker - only visible in subset mode)
// =============================================================================

const SubsetZone = memo(function SubsetZone({
    subsetSelection = [],
    availableViews = [],
    onToggleView,
    onSelectAll,
    onClear,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const { isSubsetView } = useViewStack();

    if (!isSubsetView) return null;

    return (
        <div className="canvas-toolbar__zone" style={{ width: ZONES.subset.width }}>
            <div className="canvas-toolbar__subset-picker">
                <button
                    type="button"
                    className={`canvas-toolbar__subset-btn ${isOpen ? 'canvas-toolbar__subset-btn--open' : ''}`}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <Icon name="layers" size={12} />
                    <span>Subset ({subsetSelection.length})</span>
                    <Icon name="chevronDown" size={10} />
                </button>

                {isOpen && (
                    <div className="canvas-toolbar__subset-dropdown">
                        <div className="canvas-toolbar__subset-header">
                            Select views for subset
                        </div>
                        <div className="canvas-toolbar__subset-list">
                            {availableViews.map(view => (
                                <button
                                    key={view.id}
                                    type="button"
                                    className="canvas-toolbar__subset-item"
                                    onClick={() => onToggleView?.(view.id)}
                                >
                                    <span className={`canvas-toolbar__subset-check ${subsetSelection.includes(view.id) ? 'canvas-toolbar__subset-check--checked' : ''}`}>
                                        {subsetSelection.includes(view.id) && <Icon name="check" size={10} />}
                                    </span>
                                    <span
                                        className="canvas-toolbar__subset-dot"
                                        style={{ background: view.color }}
                                    />
                                    <span className="canvas-toolbar__subset-name">{view.name}</span>
                                </button>
                            ))}
                        </div>
                        <div className="canvas-toolbar__subset-footer">
                            <button type="button" onClick={onSelectAll}>Select All</button>
                            <button type="button" onClick={onClear}>Clear</button>
                        </div>
                    </div>
                )}
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
    isSubsetMode,
    subsetIds = [],
}) {
    const [isOpen, setIsOpen] = useState(false);
    const { isFocusView, currentView } = useViewStack();

    // In focus mode, show the focused view
    const viewInfo = isFocusView ? currentView?.data : activeView;

    // Filter views based on mode
    const visibleViews = isSubsetMode
        ? availableViews.filter(v => subsetIds.includes(v.id))
        : availableViews.filter(v => v.onCanvas !== false);

    // Close dropdown when clicking outside
    const handleClickOutside = useCallback((e) => {
        if (!e.target.closest('.canvas-toolbar__active-view')) {
            setIsOpen(false);
        }
    }, []);

    // Add/remove click listener
    React.useEffect(() => {
        if (isOpen) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [isOpen, handleClickOutside]);

    // No views available at all
    if (visibleViews.length === 0) {
        return (
            <div className="canvas-toolbar__zone canvas-toolbar__zone--active-view">
                <div className="canvas-toolbar__active-view">
                    <span className="canvas-toolbar__no-view">No views on canvas</span>
                </div>
            </div>
        );
    }

    // No view selected - show selector button
    if (!viewInfo) {
        return (
            <div className="canvas-toolbar__zone canvas-toolbar__zone--active-view">
                <div className="canvas-toolbar__active-view">
                    <button
                        type="button"
                        className={`canvas-toolbar__view-btn canvas-toolbar__view-btn--placeholder ${isOpen ? 'canvas-toolbar__view-btn--open' : ''}`}
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        <Icon name="eye" size={12} className="canvas-toolbar__view-icon" />
                        <span className="canvas-toolbar__view-name">Select a view ({visibleViews.length})</span>
                        <Icon name={isOpen ? 'chevronUp' : 'chevronDown'} size={12} />
                    </button>

                    {isOpen && (
                        <div className="canvas-toolbar__view-dropdown">
                            <div className="canvas-toolbar__view-header">
                                {isSubsetMode ? `In Subset (${visibleViews.length})` : `On Canvas (${visibleViews.length})`}
                            </div>
                            <div className="canvas-toolbar__view-list">
                                {visibleViews.map(v => (
                                    <button
                                        key={v.id}
                                        type="button"
                                        className="canvas-toolbar__view-item"
                                        onClick={() => { onSelectView?.(v.id); setIsOpen(false); }}
                                        style={{ '--view-color': v.color }}
                                    >
                                        <span
                                            className="canvas-toolbar__view-dot"
                                            style={{ background: v.color }}
                                        />
                                        <span className="canvas-toolbar__view-name">{v.name}</span>
                                        {v.position && (
                                            <span className="canvas-toolbar__view-position">
                                                {v.position.col},{v.position.row}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // View selected - show it with dropdown
    return (
        <div className="canvas-toolbar__zone canvas-toolbar__zone--active-view">
            <div className="canvas-toolbar__active-view">
                <button
                    type="button"
                    className={`canvas-toolbar__view-btn ${isOpen ? 'canvas-toolbar__view-btn--open' : ''}`}
                    onClick={() => setIsOpen(!isOpen)}
                    style={{ '--view-color': viewInfo.color }}
                >
                    <span
                        className="canvas-toolbar__view-dot"
                        style={{ background: viewInfo.color }}
                    />
                    <span className="canvas-toolbar__view-name">{viewInfo.name}</span>
                    <Icon name={isOpen ? 'chevronUp' : 'chevronDown'} size={12} />
                </button>

                {isOpen && (
                    <div className="canvas-toolbar__view-dropdown">
                        <div className="canvas-toolbar__view-header">
                            {isSubsetMode ? `In Subset (${visibleViews.length})` : `On Canvas (${visibleViews.length})`}
                        </div>
                        <div className="canvas-toolbar__view-list">
                            {visibleViews.map(v => (
                                <button
                                    key={v.id}
                                    type="button"
                                    className={`canvas-toolbar__view-item ${v.id === viewInfo.id ? 'canvas-toolbar__view-item--active' : ''}`}
                                    onClick={() => { onSelectView?.(v.id); setIsOpen(false); }}
                                    style={{ '--view-color': v.color }}
                                >
                                    <span
                                        className="canvas-toolbar__view-dot"
                                        style={{ background: v.color }}
                                    />
                                    <span className="canvas-toolbar__view-name">{v.name}</span>
                                    {v.position && (
                                        <span className="canvas-toolbar__view-position">
                                            {v.position.col},{v.position.row}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

// =============================================================================
// ACTIONS ZONE (Links, Snapshot, Duplicate, Settings)
// =============================================================================

const ActionsZone = memo(function ActionsZone({
    activeView,
    allViews = [],
    links = {},
    recentUnlinks = [],
    onUpdateLink,
    onRestoreLink,
    onSnapshot,
    onDuplicate,
    onSettings,
}) {
    return (
        <div className="canvas-toolbar__zone" style={{ width: ZONES.actions.width }}>
            <div className="canvas-toolbar__actions">
                <LinksDropdown
                    activeView={activeView}
                    allViews={allViews}
                    links={links}
                    recentUnlinks={recentUnlinks}
                    onUpdateLink={onUpdateLink}
                    onRestoreLink={onRestoreLink}
                />

                <div className="canvas-toolbar__actions-divider" />

                <IconButton
                    icon="camera"
                    label="Snapshot"
                    size="sm"
                    onClick={onSnapshot}
                />
                <IconButton
                    icon="copy"
                    label="Duplicate View"
                    size="sm"
                    onClick={onDuplicate}
                />
                <IconButton
                    icon="settings"
                    label="View Settings"
                    size="sm"
                    onClick={onSettings}
                />
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
 * Based on canvas-chrome-v12.jsx spec
 * Height: 66px (18px label bar + 48px content bar)
 *
 * Label bar: Zone labels (View Mode | Navigation | History | ...)
 * Content bar: View Mode | Navigation | History | Subset | Active View | Actions
 */
export function CanvasToolbar({
    // View mode
    focusDisabled = false,
    subsetDisabled = false,
    onEnterFocus,
    onEnterSubset,

    // Navigation
    viewportPosition = { row: 0, col: 0 },
    homePosition = { row: 0, col: 0 },
    onNavigate,
    onGoHome,
    onBookmark,

    // History
    canUndo = false,
    canRedo = false,
    onUndo,
    onRedo,

    // Subset
    subsetSelection = [],
    onSubsetToggle,
    onSubsetSelectAll,
    onSubsetClear,

    // Active view
    activeView,
    availableViews = [],
    onSelectView,

    // Links
    links = {},
    recentUnlinks = [],
    onUpdateLink,
    onRestoreLink,

    // Actions
    onSnapshot,
    onDuplicate,
    onSettings,

    className = '',
}) {
    const { isSubsetView } = useViewStack();

    return (
        <div className={`canvas-toolbar ${className}`}>
            {/* Zone Label Bar */}
            <ZoneLabelBar showSubset={isSubsetView} />

            {/* Content Bar */}
            <div className="canvas-toolbar__content-bar">
                {/* View Mode */}
                <ViewModeZone
                    focusDisabled={focusDisabled}
                    subsetDisabled={subsetDisabled}
                    onEnterFocus={onEnterFocus}
                    onEnterSubset={onEnterSubset}
                />

                <div className="canvas-toolbar__divider" />

                {/* Navigation */}
                <NavigationZone
                    viewportPosition={viewportPosition}
                    homePosition={homePosition}
                    onNavigate={onNavigate}
                    onGoHome={onGoHome}
                    onBookmark={onBookmark}
                />

                <div className="canvas-toolbar__divider" />

                {/* History */}
                <HistoryZone
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onUndo={onUndo}
                    onRedo={onRedo}
                />

                {/* Center - Subset + Active View */}
                <div className="canvas-toolbar__center">
                    {/* Subset (conditional) */}
                    {isSubsetView && (
                        <>
                            <SubsetZone
                                subsetSelection={subsetSelection}
                                availableViews={availableViews}
                                onToggleView={onSubsetToggle}
                                onSelectAll={onSubsetSelectAll}
                                onClear={onSubsetClear}
                            />
                            <div className="canvas-toolbar__divider" />
                        </>
                    )}

                    {/* Active View */}
                    <ActiveViewZone
                        activeView={activeView}
                        availableViews={availableViews}
                        onSelectView={onSelectView}
                        isSubsetMode={isSubsetView}
                        subsetIds={subsetSelection}
                    />
                </div>

                <div className="canvas-toolbar__divider" />

                {/* Actions */}
                <ActionsZone
                    activeView={activeView}
                    allViews={availableViews}
                    links={links}
                    recentUnlinks={recentUnlinks}
                    onUpdateLink={onUpdateLink}
                    onRestoreLink={onRestoreLink}
                    onSnapshot={onSnapshot}
                    onDuplicate={onDuplicate}
                    onSettings={onSettings}
                />
            </div>
        </div>
    );
}

export default memo(CanvasToolbar);

// Re-export for convenience
export { CANVAS_MODES, ASPECT_RATIOS };
