/**
 * SlidingPanel Component (v4 - Enhanced)
 *
 * Glassmorphism frosted glass panel that slides out on hover.
 * Now includes per-property parent dropdown selectors.
 * Renders in a portal for better visibility in constrained containers.
 *
 * Row 0: Tooltip Area
 * Row 1: Action Button Groups + Size Picker
 * Row 2: Linked Parent Info (conditional)
 * Row 3: Link Properties with Per-Parent Dropdowns (NEW!)
 *
 * Location: src/ui/react/components/panels/LeftPanel/tabs/DatasetsTab/ViewItem/components/SlidingPanel.jsx
 */

import React, { memo, useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    Folder,
    Globe,
    Save,
    Download,
    Share2,
    Plus,
    Link2,
    GitBranch,
    Grid3x3,
} from 'lucide-react';
import { ButtonGroup } from './ButtonGroup';
import { SizePicker } from './SizePicker';
import { LinkPropertyRow } from './LinkPropertyRow';
import './SlidingPanel.scss';

// =============================================================================
// ICON BUTTON
// =============================================================================

const IconBtn = memo(function IconBtn({
    icon: Icon,
    isActive = false,
    activeColor,
    onClick,
    onHover,
    disabled = false,
    title,
}) {
    return (
        <button
            className={`sliding-panel__icon-btn ${isActive ? 'sliding-panel__icon-btn--active' : ''}`}
            data-active-color={isActive ? activeColor : undefined}
            onClick={onClick}
            onMouseEnter={() => onHover?.(title)}
            onMouseLeave={() => onHover?.(null)}
            disabled={disabled}
            title={title}
        >
            <Icon size={12} />
        </button>
    );
});

// =============================================================================
// MAIN SLIDING PANEL COMPONENT
// =============================================================================

export const SlidingPanel = memo(function SlidingPanel({
    isVisible,
    view,
    anchorRef,                // Ref to the ViewItem element for positioning
    onPanelEnter,             // Called when mouse enters panel
    onPanelLeave,             // Called when mouse leaves panel
    // Link configuration
    linkConfig = {},          // { camera: { enabled, parentId }, filters: { enabled, parentId }, ... }
    availableViews = [],      // Views that can be linked to (excluding current view)
    linkedParent = null,      // { id, name } - if spawned from another view
    // Status
    linkedCount = 0,
    // Callbacks
    onStarWorkspace,
    onStarPersonal,
    onSaveState,
    onLoadState,
    onShareView,
    onSpawn,
    onConfigureLinks,
    onSizeChange,
    onLinkPropertyChange,     // (propertyId, config) => void
    onToggleAllLinks,         // (allEnabled: boolean) => void
}) {
    const [tooltipText, setTooltipText] = useState(null);
    const [showSizePicker, setShowSizePicker] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const panelRef = useRef(null);

    // Determine if linking is enabled (has available views to link to)
    const linkingEnabled = availableViews.length > 0;

    // Check if any properties are linked
    const hasActiveLinks = useMemo(() => {
        return Object.values(linkConfig).some(c => c?.enabled && c?.parentId);
    }, [linkConfig]);

    // Calculate position based on anchor element
    const updatePosition = useCallback(() => {
        if (!anchorRef?.current) return;

        const anchorRect = anchorRef.current.getBoundingClientRect();
        const panelWidth = 280; // Approximate panel width
        const panelHeight = 200; // Approximate panel height
        const padding = 8;

        let top = anchorRect.bottom + padding;
        let left = anchorRect.left;

        // Check if panel would go off-screen bottom
        if (top + panelHeight > window.innerHeight) {
            // Position above the anchor instead
            top = anchorRect.top - panelHeight - padding;
        }

        // Check if panel would go off-screen right
        if (left + panelWidth > window.innerWidth) {
            left = window.innerWidth - panelWidth - padding;
        }

        // Ensure not off-screen left
        if (left < padding) {
            left = padding;
        }

        // TODO: Add logic for when panel is too small to render below
        // For now, just position it as best we can

        setPosition({ top, left });
    }, [anchorRef]);

    // Update position when visibility changes
    useEffect(() => {
        if (isVisible) {
            updatePosition();
        }
    }, [isVisible, updatePosition]);

    if (!isVisible) return null;

    const panelContent = (
        <div
            ref={panelRef}
            className="sliding-panel sliding-panel--portal"
            style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                width: 280,
                maxWidth: 'calc(100vw - 16px)',
                zIndex: 9999,
            }}
            onMouseEnter={onPanelEnter}
            onMouseLeave={onPanelLeave}
        >
            {/* Row 0: Tooltip Area */}
            <div className="sliding-panel__tooltip">
                {tooltipText || (
                    <span className="sliding-panel__tooltip-hint">
                        Hover actions for details
                    </span>
                )}
            </div>

            {/* Row 1: Action Buttons + Size */}
            <div className="sliding-panel__actions">
                {/* Save Group */}
                <ButtonGroup>
                    <IconBtn
                        icon={Folder}
                        isActive={view?.starredWorkspace}
                        activeColor="purple"
                        onClick={onStarWorkspace}
                        onHover={setTooltipText}
                        title="Save to Workspace"
                    />
                    <IconBtn
                        icon={Globe}
                        isActive={view?.starredPersonal}
                        activeColor="gold"
                        onClick={onStarPersonal}
                        onHover={setTooltipText}
                        title="Save to Personal"
                    />
                </ButtonGroup>

                {/* State Group */}
                <ButtonGroup>
                    <IconBtn
                        icon={Save}
                        isActive={view?.hasSavedState}
                        activeColor="amber"
                        onClick={onSaveState}
                        onHover={setTooltipText}
                        title="Save current state"
                    />
                    <IconBtn
                        icon={Download}
                        onClick={onLoadState}
                        onHover={setTooltipText}
                        title="Load saved state"
                    />
                </ButtonGroup>

                {/* Share */}
                <IconBtn
                    icon={Share2}
                    isActive={view?.shared}
                    activeColor="pink"
                    onClick={onShareView}
                    onHover={setTooltipText}
                    title="Share view"
                />

                {/* Spawn Group */}
                <ButtonGroup>
                    <IconBtn
                        icon={Plus}
                        onClick={onSpawn}
                        onHover={setTooltipText}
                        title="Spawn linked copy"
                    />
                    <IconBtn
                        icon={Link2}
                        isActive={hasActiveLinks}
                        activeColor="teal"
                        onClick={onConfigureLinks}
                        onHover={setTooltipText}
                        title="Configure link targets"
                    />
                </ButtonGroup>

                {/* Spacer */}
                <div className="sliding-panel__spacer" />

                {/* Size Picker */}
                <div className="sliding-panel__size-control">
                    <button
                        className={`sliding-panel__size-btn ${showSizePicker ? 'sliding-panel__size-btn--active' : ''}`}
                        onClick={() => setShowSizePicker(!showSizePicker)}
                        onMouseEnter={() => setTooltipText('Change view size')}
                        onMouseLeave={() => setTooltipText(null)}
                    >
                        <Grid3x3 size={12} />
                        <span>
                            {view?.rowSpan || 1}×{view?.colSpan || 1}
                        </span>
                    </button>

                    {showSizePicker && (
                        <SizePicker
                            currentSize={{ rows: view?.rowSpan || 1, cols: view?.colSpan || 1 }}
                            onSelect={(size) => {
                                onSizeChange?.(size);
                                setShowSizePicker(false);
                            }}
                            onClose={() => setShowSizePicker(false)}
                        />
                    )}
                </div>
            </div>

            {/* Row 2: Linked Parent Info (if spawned from another view) */}
            {linkedParent && (
                <div className="sliding-panel__linked-parent">
                    <GitBranch size={10} />
                    <span className="sliding-panel__linked-parent-label">Spawned from:</span>
                    <span className="sliding-panel__linked-parent-name">{linkedParent.name}</span>
                </div>
            )}

            {/* Row 3: Link Properties with Per-Parent Dropdowns */}
            <LinkPropertyRow
                linkConfig={linkConfig}
                availableViews={availableViews}
                disabled={!linkingEnabled}
                onPropertyChange={onLinkPropertyChange}
                onToggleAll={onToggleAllLinks}
            />
        </div>
    );

    // Render in a portal for better visibility
    return createPortal(panelContent, document.body);
});

export default SlidingPanel;