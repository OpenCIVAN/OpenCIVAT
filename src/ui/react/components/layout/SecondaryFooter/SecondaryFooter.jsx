/**
 * @file SecondaryFooter.jsx
 * @deprecated This component has been replaced by canvas-embedded chrome components.
 * Use the new canvas chrome components instead:
 * - CanvasHeader: Navigation (back, home, breadcrumb, viewport nav, grid size)
 * - CanvasToolbar: Actions (view mode, history, subset, active view, actions)
 * - CanvasStatusBar: Info (canvas size, viewport size, render mode, sync status)
 *
 * Voice controls have been moved to the RightActivityBar.
 * These are now rendered inside CanvasWorkspace, not in ThreeEdgeLayout.
 * See: src/ui/react/components/workspace/Canvas/
 *
 * @description Secondary footer bar with editing tools, view context, and voice controls.
 * Height: 90px (18px label bar + 72px content) | z-index: 90
 *
 * This component manages its own internal zones rather than receiving
 * zone content from the parent.
 *
 * Layout (with label bar):
 * ┌──────────────┬──────────┬─────────┬────────────────────┬─────────────────────┐
 * │  PANELS      │ EDITING  │ HISTORY │   VIEW CONTEXT     │      VOICE          │  ← Label Bar
 * ├──────────────┼──────────┼─────────┼────────────────────┼─────────────────────┤
 * │  Popouts     │ EditBlk  │ Undo/Rd │ Mode + ViewSelect  │  VoiceControls      │  ← Content
 * └──────────────┴──────────┴─────────┴────────────────────┴─────────────────────┘
 *
 * @example
 * <SecondaryFooter
 *   isEditMode={true}
 *   activeTool="select"
 *   viewMode="normal"
 *   onViewModeChange={handleViewModeChange}
 *   isMuted={false}
 *   isInChannel={true}
 * />
 */

import React, { useCallback, memo } from 'react';

// Shared bar components (from common bars/ folder)
import {
    ViewContextBlock
} from '@UI/react/components/bars';

// Atomic design components
import { ButtonGroup, IconButton, Icon } from '@UI/react/components/atoms';

// Hook for view logic (using backwards compat alias)
import { useViewContextLogic } from '@UI/react/hooks/useViewContextLogic';

import './SecondaryFooter.scss';

// =============================================================================
// ZONE LABEL BAR COMPONENT
// =============================================================================

/**
 * Displays zone labels above the content row.
 */
const ZoneLabelBar = memo(function ZoneLabelBar({ labels }) {
    return (
        <div className="secondary-footer__label-bar">
            {labels.map((zone, i) => (
                <div
                    key={i}
                    className={`secondary-footer__label ${zone.className || ''}`}
                    style={{
                        flex: zone.flex,
                        minWidth: zone.minWidth,
                        width: zone.width,
                        '--zone-color': zone.color,
                    }}
                >
                    {zone.label && (
                        <span className="secondary-footer__label-text">
                            {zone.label}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
});

// =============================================================================
// CONSTANTS
// =============================================================================

// Icons are now string names for the Icon component
const FLOW_OPTIONS = [
    { value: 'row', icon: 'arrowRight', label: 'Row Flow', accent: 'var(--color-accent-blue)' },
    { value: 'column', icon: 'arrowDown', label: 'Column Flow', accent: 'var(--color-accent-blue)' },
];

const EDIT_TOOLS = [
    { id: 'select', icon: 'select', label: 'Select', accent: 'var(--color-accent-blue)' },
    { id: 'pan', icon: 'pan_tool', label: 'Pan', accent: 'var(--color-accent-teal)' },
    { id: 'merge', icon: 'merge', label: 'Merge Cells', accent: 'var(--color-accent-purple)' },
];

// Zone labels configuration - class names must match zone widths exactly
// NOTE: Panels zone (Nav, Notes, Ops) moved to left activity bar
// NOTE: Voice zone moved to right activity bar
const FOOTER_ZONE_LABELS = [
    { label: 'Editing', color: 'var(--color-accent-amber)', className: 'secondary-footer__label--editing' },
    { label: 'History', color: 'var(--color-text-muted)', className: 'secondary-footer__label--history' },
    { label: 'View Context', color: 'var(--color-accent-purple)', className: 'secondary-footer__label--view-context' },
];

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Secondary Footer bar component.
 * Manages its own internal zones for edit tools, view context, and voice controls.
 * NOTE: Panels zone (Nav, Notes, Ops) moved to left activity bar.
 */
function SecondaryFooter({
    // Edit props
    isEditMode = false,
    activeTool = 'select',
    onToolChange,
    onToggleEditMode,
    canUndo = false,
    canRedo = false,
    onUndo,
    onRedo,

    // View mode props (for ViewContextBlock)
    viewMode = 'normal',
    onViewModeChange,

    // NOTE: Voice props removed - voice controls moved to right activity bar

    className = '',
}) {
    // Get view logic from context
    const {
        activeView,
        onCanvasViews,
        availableViews,
        onSelectView,
        onPlaceView,
        onViewAction,
        subsetIds,
        onSubsetChange,
        onUpdateLink,
    } = useViewContextLogic();

    // Handle tool selection - auto-enable edit mode
    const handleToolChange = useCallback((toolId) => {
        onToolChange?.(toolId);
        if (!isEditMode) {
            onToggleEditMode?.();
        }
    }, [onToolChange, isEditMode, onToggleEditMode]);

    return (
        <div className={`secondary-footer ${className}`}>
            {/* Zone Label Bar - displays above content */}
            <ZoneLabelBar labels={FOOTER_ZONE_LABELS} />

            {/* Content Row */}
            {/* NOTE: Panels zone (Nav, Notes, Ops) moved to left activity bar */}
            <div className="secondary-footer__content">
                {/* ================================================================= */}
                {/* EDITING ZONE: Edit Mode Toggle + Tools (v3 stacked style) */}
                {/* ================================================================= */}
                <div className="secondary-footer__zone secondary-footer__zone--editing">
                    <div className="secondary-footer__edit-block">
                        {/* Edit toggle button - custom styled */}
                        <button
                            type="button"
                            className="secondary-footer__edit-toggle"
                            data-active={isEditMode}
                            onClick={onToggleEditMode}
                        >
                            <Icon name="edit" size={12} />
                            <span>{isEditMode ? 'Editing' : 'Edit'}</span>
                        </button>
                        {/* Tool buttons row */}
                        <ButtonGroup gap="xs">
                            {EDIT_TOOLS.map((tool) => (
                                <IconButton
                                    key={tool.id}
                                    icon={tool.icon}
                                    label={tool.label}
                                    active={isEditMode && activeTool === tool.id}
                                    size="sm"
                                    disabled={!isEditMode}
                                    onClick={() => handleToolChange(tool.id)}
                                    data-tool={tool.id}
                                />
                            ))}
                        </ButtonGroup>
                    </div>
                </div>

                <div className="secondary-footer__divider secondary-footer__divider--tall" />

                {/* ================================================================= */}
                {/* HISTORY ZONE: Undo/Redo */}
                {/* ================================================================= */}
                <div className="secondary-footer__zone secondary-footer__zone--history">
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

                <div className="secondary-footer__divider secondary-footer__divider--tall" />

                {/* ================================================================= */}
                {/* VIEW CONTEXT ZONE: ViewContextBlock (two rows) */}
                {/* ================================================================= */}
                <div className="secondary-footer__zone secondary-footer__zone--view-context">
                    <ViewContextBlock
                        viewMode={viewMode}
                        onModeChange={onViewModeChange}
                        activeView={activeView}
                        onCanvasViews={onCanvasViews}
                        availableViews={availableViews}
                        onSelectView={onSelectView}
                        onViewAction={onViewAction}
                        subsetIds={subsetIds}
                        onSubsetChange={onSubsetChange}
                        onUpdateLink={onUpdateLink}
                    />
                </div>

                {/* NOTE: Voice zone removed - voice controls moved to right activity bar */}
            </div>
        </div>
    );
}

export default memo(SecondaryFooter);
export { SecondaryFooter };