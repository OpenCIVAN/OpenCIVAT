// src/ui/react/components/workspace/InstanceViewport/InstanceViewport.jsx
import React, { useRef, useEffect, useState, useCallback, useMemo, memo } from "react";
import { createPortal } from 'react-dom';
import { Icon } from '@UI/react/components/common/Icon';

import { instance as log } from "@Utils/logger.js";
import { getToolIcon } from "@UI/react/components/workspace/ToolbarIconRegistry.js";
import { workspaceManager } from "@Core/instances/workspaceManager.js";
import { setActiveInstance } from '@Collaboration/presence/cursors.js';
import { SliderMenuOption } from '@UI/react/components/workspace/Sliders/SliderMenuOption';
import { CameraViewGridPicker } from '@UI/react/components/workspace/Pickers/CameraViewGridPicker';
import { SliderWithPresets } from '@UI/react/components/workspace/Sliders/SliderWithPresets';
import { ColorSwatchGrid } from '@UI/react/components/workspace/Pickers/ColorSwatchGrid';
import { PositionGridPicker } from '@UI/react/components/workspace/Pickers/PositionGridPicker';
import { VRButton } from '@UI/react/components/common/VRButton';
import { vrManager } from '@Core/vr/VRManager.js';
import { useFloatingPanels } from '@UI/react/components/panels/FloatingPanel/FloatingPanelContext';

import { getViewConfigurationManager, getDatasetManager } from "@Init/appInitializer.js";
import { getFileTypeDisplayInfo } from "@Core/instances/types/instanceTypesInit.js";
import { canvasManager } from "@Core/data/managers/CanvasManager.js";
import { viewLifecycleService } from "@Services/ViewLifecycleService.js";

import { useInstanceSize, getConstraintMessage } from './useInstanceSize';
import { TOOL_GROUPS, GLOBAL_TOOLS, HISTORY_TOOLS, NAV_TOOLS, CORNER_TOOLS, GEAR_DROPDOWN_ITEMS, getTierConfig } from './ToolbarTiers';
import { NavigationNotch } from './NavigationNotch';

// Instance Tools panel content for embedded fullscreen mode
import { InstanceToolsPanelContent } from "@UI/react/components/panels/LeftPanel/tabs/InstanceToolsTab";

import "./InstanceViewport.scss";

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * TopToolbar - Overlay toolbar at top of content area
 * Slides down on hover, contains tiered tool display
 */
function TopToolbar({
    tools,
    uiMode,
    visible,
    pinned,
    onTogglePin,
    openMenuId,
    setOpenMenuId,
    dropdownPosition,
    menuButtonRefs,
    onShowToolbar,
    onHideToolbar,
    renderTool,
    onOpenInstanceTools,
    instanceToolsTabActive,
    instanceId,
    // More menu handlers
    onFullscreen,
    onVRMode,
    onResetCamera,
    onFitView,
    onDuplicate,
    onClose,
    onTrash,
}) {
    const tierConfig = getTierConfig(uiMode);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const moreButtonRef = useRef(null);

    return (
        <div
            className={`instance-viewport__toolbar-overlay ${visible || pinned ? 'instance-viewport__toolbar-overlay--visible' : ''} ${pinned ? 'instance-viewport__toolbar-overlay--pinned' : ''}`}
            onMouseEnter={onShowToolbar}
            onMouseLeave={onHideToolbar}
        >
            <div className="instance-toolbar">
                {/* Tool Groups */}
                <div className="instance-toolbar__groups">
                    {tools.map((tool, index) => renderTool(tool, index))}
                </div>

                {/* History Tools (Undo/Redo) */}
                {tierConfig.showHistoryButtons && (
                    <div className="instance-toolbar__history">
                        <div className="instance-toolbar__separator" />
                        <button
                            className="instance-toolbar__tool-button"
                            title="Undo (Ctrl+Z)"
                        >
                            <Icon name="undo2" size={16} />
                        </button>
                        <button
                            className="instance-toolbar__tool-button"
                            title="Redo (Ctrl+Shift+Z)"
                        >
                            <Icon name="redo2" size={16} />
                        </button>
                    </div>
                )}

                {/* Global Tools - Always visible */}
                <div className="instance-toolbar__global-tools">
                    <div className="instance-toolbar__separator" />
                    <button
                        className={`instance-toolbar__tool-button ${instanceToolsTabActive ? 'instance-toolbar__tool-button--primary' : ''}`}
                        onClick={onOpenInstanceTools}
                        title="Instance Tools (T)"
                    >
                        <Icon name="wrench" size={16} />
                    </button>
                    <VRButton instanceId={instanceId} size="sm" />
                    <div className="instance-toolbar__more-wrapper" ref={moreButtonRef}>
                        <button
                            className={`instance-toolbar__tool-button ${showMoreMenu ? 'instance-toolbar__tool-button--active' : ''}`}
                            onClick={() => setShowMoreMenu(!showMoreMenu)}
                            title="More options"
                        >
                            <Icon name="moreHorizontal" size={16} />
                        </button>
                        <MoreMenu
                            isOpen={showMoreMenu}
                            onClose={() => setShowMoreMenu(false)}
                            onOpenInstanceTools={onOpenInstanceTools}
                            onFullscreen={onFullscreen}
                            onVRMode={onVRMode}
                            onResetCamera={onResetCamera}
                            onFitView={onFitView}
                            onDuplicate={onDuplicate}
                            onCloseView={onClose}
                            onDeleteView={onTrash}
                            triggerRef={moreButtonRef}
                            instanceId={instanceId}
                        />
                    </div>
                </div>

                {/* Pin Button */}
                <button
                    className={`instance-toolbar__pin-button ${pinned ? 'active' : ''}`}
                    onClick={onTogglePin}
                    title={pinned ? 'Unpin toolbar' : 'Pin toolbar'}
                >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v8M12 18v4M5 12h14" />
                        {pinned && <circle cx="12" cy="12" r="3" fill="currentColor" />}
                    </svg>
                </button>
            </div>
        </div>
    );
}

/**
 * BottomNavBar - Navigation bar at bottom of content area
 * Slides up on focus/click, contains zoom controls and fit button
 *
 * Design rationale:
 * - Mouse/trackpad already handles rotation, pan, and zoom naturally
 * - Zoom percentage syncs with actual camera state from all input sources
 * - Zoom is relative to initial view (100% = fit view after data load)
 * - Fit button provides quick reset to frame all content
 */
function BottomNavBar({
    visible,
    zoomLevel,
    onZoomChange,
    onFit,
}) {
    return (
        <div className={`instance-viewport__navbar-overlay ${visible ? 'instance-viewport__navbar-overlay--visible' : ''}`}>
            <div className="instance-navbar">
                {/* Zoom Display with +/- */}
                <div className="instance-navbar__zoom-display">
                    <button
                        className="instance-navbar__zoom-button"
                        onClick={() => onZoomChange(zoomLevel * 0.9)}
                        title="Zoom out 10%"
                    >
                        <Icon name="remove" size={12} />
                    </button>
                    <span className="instance-navbar__zoom-value">{Math.round(zoomLevel)}%</span>
                    <button
                        className="instance-navbar__zoom-button"
                        onClick={() => onZoomChange(zoomLevel * 1.1)}
                        title="Zoom in 10%"
                    >
                        <Icon name="add" size={12} />
                    </button>
                </div>

                {/* Fit Button */}
                <div className="instance-navbar__quick-actions">
                    <button
                        className="instance-navbar__action-button"
                        onClick={onFit}
                        title="Fit to view (reset to 100%)"
                    >
                        <Icon name="scan" size={14} />
                        Fit
                    </button>
                </div>
            </div>
        </div>
    );
}


/**
 * GearOnlyDropdown - Minimal controls for small viewports
 * Single gear button with portal dropdown menu
 */
function GearOnlyDropdown({
    open,
    onToggle,
    onOpenInstanceTools,
    onMaximize,
    onDuplicate,
    onClose,
    onTrash,
    instanceId,
}) {
    const buttonRef = useRef(null);
    const menuRef = useRef(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

    // Position menu relative to button - smart positioning
    useEffect(() => {
        if (!open || !buttonRef.current) return;

        const updatePosition = () => {
            const rect = buttonRef.current.getBoundingClientRect();
            const menuWidth = 180;
            const menuHeight = 260;
            const padding = 8;

            let left, top;

            // Horizontal: prefer right-aligned with button, but keep in viewport
            left = rect.right - menuWidth;
            if (left < padding) {
                left = rect.left; // Align left edge with button instead
            }
            if (left + menuWidth > window.innerWidth - padding) {
                left = window.innerWidth - menuWidth - padding;
            }

            // Vertical: prefer below button, but flip to above if not enough space
            const spaceBelow = window.innerHeight - rect.bottom - padding;
            const spaceAbove = rect.top - padding;

            if (spaceBelow >= menuHeight) {
                // Enough space below
                top = rect.bottom + 4;
            } else if (spaceAbove >= menuHeight) {
                // Not enough below, but enough above - flip
                top = rect.top - menuHeight - 4;
            } else {
                // Not enough space either way - position at edge
                if (spaceBelow > spaceAbove) {
                    top = window.innerHeight - menuHeight - padding;
                } else {
                    top = padding;
                }
            }

            setMenuPosition({ top, left });
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [open]);

    // Close on click outside
    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (e) => {
            if (
                buttonRef.current?.contains(e.target) ||
                menuRef.current?.contains(e.target)
            ) {
                return;
            }
            onToggle();
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') onToggle();
        };

        // Delay to prevent immediate close
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }, 10);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open, onToggle]);

    const handleItemClick = (e, action) => {
        e.stopPropagation();
        e.preventDefault();
        if (typeof action === 'function') {
            action();
        }
        onToggle();
    };

    const handleButtonClick = (e) => {
        e.stopPropagation(); // Prevent triggering isolation mode
        onToggle();
    };

    return (
        <div
            className="instance-viewport__gear-dropdown"
            onClick={(e) => e.stopPropagation()} // Prevent bubbling to cell
        >
            <button
                ref={buttonRef}
                className={`instance-viewport__gear-button ${open ? 'active' : ''}`}
                onClick={handleButtonClick}
                title="Options"
            >
                <Icon name="settings" size={16} />
            </button>
            {open && createPortal(
                <div
                    ref={menuRef}
                    className="instance-viewport__gear-menu"
                    style={{
                        position: 'fixed',
                        top: menuPosition.top,
                        left: menuPosition.left,
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        className="instance-viewport__gear-item instance-viewport__gear-item--primary"
                        onClick={(e) => handleItemClick(e, onOpenInstanceTools)}
                    >
                        <Icon name="wrench" size={14} />
                        Instance Tools
                    </button>
                    <button
                        className="instance-viewport__gear-item"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle(); // Close menu, VRButton handles its own logic
                        }}
                    >
                        <VRButton instanceId={instanceId} size="sm" showLabel />
                    </button>
                    <button
                        className="instance-viewport__gear-item"
                        onClick={(e) => handleItemClick(e, onMaximize)}
                    >
                        <Icon name="maximize2" size={14} />
                        Maximize
                    </button>
                    <button
                        className="instance-viewport__gear-item"
                        onClick={(e) => handleItemClick(e, onDuplicate)}
                    >
                        <Icon name="copy" size={14} />
                        Duplicate
                    </button>
                    <div className="instance-viewport__gear-separator" />
                    <button
                        className="instance-viewport__gear-item"
                        onClick={(e) => handleItemClick(e, onClose)}
                    >
                        <Icon name="close" size={14} />
                        Close
                    </button>
                    {onTrash && (
                        <button
                            className="instance-viewport__gear-item instance-viewport__gear-item--danger"
                            onClick={(e) => handleItemClick(e, onTrash)}
                        >
                            <Icon name="delete" size={14} />
                            Delete View
                        </button>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
}

/**
 * VRModeIndicator - Shows when viewport is in VR mode
 */
function VRModeIndicator({ onExit }) {
    return (
        <div className="vr-mode-indicator">
            <span className="vr-mode-indicator__icon">
                <Icon name="glasses" size={12} />
            </span>
            <span className="vr-mode-indicator__text">VR Mode</span>
            <button
                className="vr-mode-indicator__exit"
                onClick={onExit}
                title="Exit VR mode"
            >
                Exit
            </button>
        </div>
    );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert hex color to RGB string for rgba() usage in CSS
 */
const hexToRgb = (hex) => {
    if (!hex) return '255, 255, 255';
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
        : '255, 255, 255';
};

/**
 * Get header mode based on viewport width
 * 6 responsive breakpoints per spec:
 * - Full: 450px+ (all elements)
 * - Large: 380px+ (VR hidden in header)
 * - Medium: 300px+ (Expand/VR in menu)
 * - Small: 220px+ (Expand/VR/Wrench in menu)
 * - Tiny: 160px+ (only dot, name, more, close)
 * - Micro: <160px (minimal icons)
 *
 * @param {number} width - Viewport width in pixels
 * @returns {'full'|'large'|'medium'|'small'|'tiny'|'micro'}
 */
const getHeaderMode = (width) => {
    if (width >= 450) return 'full';
    if (width >= 380) return 'large';
    if (width >= 300) return 'medium';
    if (width >= 220) return 'small';
    if (width >= 160) return 'tiny';
    return 'micro';
};

/**
 * MoreMenu - Dropdown menu with all instance tools and actions
 */
function MoreMenu({
    isOpen,
    onClose,
    onOpenInstanceTools,
    onFullscreen,
    onVRMode,
    onResetCamera,
    onFitView,
    onCenterSelection,
    onRepresentationChange,
    currentRepresentation,
    onCaptureThumbnail,
    onSaveBookmark,
    onDuplicate,
    onLinkSettings,
    onCloseView,
    onDeleteView,
    headerMode,
    instanceId,
    triggerRef,
}) {
    const menuRef = useRef(null);
    const [position, setPosition] = useState({ top: 0, right: 0 });

    // Position menu relative to trigger button
    useEffect(() => {
        if (!isOpen || !triggerRef?.current) return;

        const updatePosition = () => {
            const rect = triggerRef.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + 4,
                right: window.innerWidth - rect.right,
            });
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        return () => window.removeEventListener('resize', updatePosition);
    }, [isOpen, triggerRef]);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };

        // Delay to prevent immediate close
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }, 10);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleItemClick = (action) => {
        action?.();
        onClose();
    };

    return createPortal(
        <div
            className="instance-viewport__more-menu"
            ref={menuRef}
            style={{ top: position.top, right: position.right }}
        >
            {/* Tools Section */}
            <div className="instance-viewport__more-menu__section-header">Tools</div>
            <button
                className="instance-viewport__more-menu__item"
                onClick={() => handleItemClick(onOpenInstanceTools)}
            >
                <Icon name="wrench" size={14} />
                <span>Instance Tools Panel</span>
                <span className="instance-viewport__more-menu__shortcut">T</span>
            </button>
            {headerMode === 'small' && (
                <button
                    className="instance-viewport__more-menu__item"
                    onClick={() => handleItemClick(onFullscreen)}
                >
                    <Icon name="maximize2" size={14} />
                    <span>Expand</span>
                </button>
            )}
            {(headerMode === 'small' || headerMode === 'medium') && (
                <button
                    className="instance-viewport__more-menu__item"
                    onClick={() => handleItemClick(onVRMode)}
                >
                    <Icon name="glasses" size={14} />
                    <span>Enter VR Mode</span>
                </button>
            )}

            <div className="instance-viewport__more-menu__divider" />

            {/* Navigation Section */}
            <div className="instance-viewport__more-menu__section-header">Navigation</div>
            <button
                className="instance-viewport__more-menu__item"
                onClick={() => handleItemClick(onResetCamera)}
            >
                <Icon name="rotateCcw" size={14} />
                <span>Reset Camera</span>
            </button>
            <button
                className="instance-viewport__more-menu__item"
                onClick={() => handleItemClick(onFitView)}
            >
                <Icon name="scan" size={14} />
                <span>Fit to View</span>
            </button>
            <button
                className="instance-viewport__more-menu__item"
                onClick={() => handleItemClick(onCenterSelection)}
            >
                <Icon name="crosshair" size={14} />
                <span>Center on Selection</span>
            </button>

            <div className="instance-viewport__more-menu__divider" />

            {/* Representation Section */}
            <div className="instance-viewport__more-menu__section-header">Representation</div>
            <button
                className={`instance-viewport__more-menu__item ${currentRepresentation === 'surface' ? 'instance-viewport__more-menu__item--active' : ''}`}
                onClick={() => handleItemClick(() => onRepresentationChange?.('surface'))}
            >
                <Icon name="box" size={14} />
                <span>Surface</span>
            </button>
            <button
                className={`instance-viewport__more-menu__item ${currentRepresentation === 'wireframe' ? 'instance-viewport__more-menu__item--active' : ''}`}
                onClick={() => handleItemClick(() => onRepresentationChange?.('wireframe'))}
            >
                <Icon name="grid3x3" size={14} />
                <span>Wireframe</span>
            </button>
            <button
                className={`instance-viewport__more-menu__item ${currentRepresentation === 'points' ? 'instance-viewport__more-menu__item--active' : ''}`}
                onClick={() => handleItemClick(() => onRepresentationChange?.('points'))}
            >
                <Icon name="circle" size={14} />
                <span>Points</span>
            </button>

            <div className="instance-viewport__more-menu__divider" />

            {/* View Section */}
            <div className="instance-viewport__more-menu__section-header">View</div>
            <button
                className="instance-viewport__more-menu__item"
                onClick={() => handleItemClick(onCaptureThumbnail)}
            >
                <Icon name="camera" size={14} />
                <span>Capture Thumbnail</span>
            </button>
            <button
                className="instance-viewport__more-menu__item"
                onClick={() => handleItemClick(onSaveBookmark)}
            >
                <Icon name="bookmark" size={14} />
                <span>Save as Bookmark</span>
            </button>
            <button
                className="instance-viewport__more-menu__item"
                onClick={() => handleItemClick(onDuplicate)}
            >
                <Icon name="copy" size={14} />
                <span>Duplicate View</span>
            </button>
            <button
                className="instance-viewport__more-menu__item"
                onClick={() => handleItemClick(onLinkSettings)}
            >
                <Icon name="link" size={14} />
                <span>Link Settings...</span>
            </button>

            <div className="instance-viewport__more-menu__divider" />

            {/* Danger Section */}
            <button
                className="instance-viewport__more-menu__item instance-viewport__more-menu__item--danger"
                onClick={() => handleItemClick(onCloseView)}
            >
                <Icon name="close" size={14} />
                <span>Close View</span>
            </button>
            <button
                className="instance-viewport__more-menu__item instance-viewport__more-menu__item--danger"
                onClick={() => handleItemClick(onDeleteView)}
            >
                <Icon name="delete" size={14} />
                <span>Delete View</span>
            </button>
        </div>,
        document.body
    );
}

/**
 * ColorDot - Status indicator that shows loading state or static color
 */
const ColorDot = memo(function ColorDot({ color, isLoading, size = 8 }) {
    const colorHex = color?.hex || '#60a5fa';

    return (
        <span
            className={`instance-viewport__color-dot ${isLoading ? 'instance-viewport__color-dot--loading' : ''}`}
            style={{
                '--dot-color': colorHex,
                width: size,
                height: size,
            }}
        />
    );
});

/**
 * HeaderBar - Responsive header with 6 breakpoints
 *
 * Breakpoints:
 * - Full (≥450px): [Wrench] View Name ... [More] [Expand] [VR] [Close]
 * - Large (≥380px): [Wrench] View Name ... [More] [Expand] [Close] (VR in menu)
 * - Medium (≥300px): [Wrench] View Name ... [More] [Close] (Expand/VR in menu)
 * - Small (≥220px): View Name ... [More] [Close] (Wrench/Expand/VR in menu)
 * - Tiny (≥160px): [Dot] Name [More] [Close] (minimal)
 * - Micro (<160px): [Dot] [More] [Close] (icons only)
 */
function HeaderBar({
    displayName,
    fileTypeDisplayInfo,  // { icon, color, displayName, handlerType } from manifest
    instanceColor,
    isFullscreen,
    isActive,
    isLoading,
    onFullscreen,
    onClose,
    onTrash,
    onOpenInstanceTools,
    onVRMode,
    onResetCamera,
    onFitView,
    onCenterSelection,
    onRepresentationChange,
    currentRepresentation,
    onCaptureThumbnail,
    onSaveBookmark,
    onDuplicate,
    onLinkSettings,
    viewportWidth,
    onShowToolbar,
    onHideToolbar,
    instanceId,
}) {
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const moreButtonRef = useRef(null);

    // Get icon from file type display info (from manifest), fallback to 'box'
    const typeIconName = fileTypeDisplayInfo?.icon || 'box';
    const typeDisplayName = fileTypeDisplayInfo?.displayName || 'View';

    const colorHex = instanceColor?.hex || '#60a5fa';
    const colorRgb = hexToRgb(colorHex);
    const headerMode = getHeaderMode(viewportWidth);

    // Determine which elements to show based on mode
    const showWrench = ['full', 'large', 'medium'].includes(headerMode);
    const showExpand = ['full', 'large'].includes(headerMode);
    const showVR = headerMode === 'full';
    const showTypeIcon = !['tiny', 'micro'].includes(headerMode);
    const showName = headerMode !== 'micro';

    return (
        <div
            className={`instance-viewport__header instance-viewport__header--${headerMode} ${isActive ? 'instance-viewport__header--active' : ''}`}
            style={{
                '--instance-color': colorHex,
                '--instance-color-rgb': colorRgb,
            }}
            onMouseEnter={onShowToolbar}
            onMouseLeave={onHideToolbar}
        >
            {/* Left section - Wrench + Label together */}
            <div className="instance-viewport__header-left">
                {showWrench && (
                    <button
                        onClick={onOpenInstanceTools}
                        className="instance-viewport__header-button instance-viewport__header-wrench"
                        title="Instance Tools (T)"
                    >
                        <Icon name="wrench" size={12} />
                    </button>
                )}

                {/* Instance Label Badge */}
                <div className="instance-viewport__label">
                    {/* Color dot for tiny/micro modes, or type icon for larger modes */}
                    {showTypeIcon ? (
                        <span
                            className="instance-viewport__label-icon"
                            title={typeDisplayName}
                        >
                            <Icon name={typeIconName} size={12} />
                        </span>
                    ) : (
                        <ColorDot color={instanceColor} isLoading={isLoading} size={8} />
                    )}

                    {showName && (
                        <span className="instance-viewport__label-text">
                            {displayName}
                        </span>
                    )}
                </div>
            </div>

            {/* Right Controls */}
            <div className="instance-viewport__header-controls">
                {/* More Menu Button - Always visible */}
                <div className="instance-viewport__more-wrapper" ref={moreButtonRef}>
                    <button
                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                        className={`instance-viewport__header-button ${showMoreMenu ? 'active' : ''}`}
                        title="More options"
                    >
                        <Icon name="moreHorizontal" size={12} />
                    </button>
                    <MoreMenu
                        isOpen={showMoreMenu}
                        onClose={() => setShowMoreMenu(false)}
                        onOpenInstanceTools={onOpenInstanceTools}
                        onFullscreen={onFullscreen}
                        onVRMode={onVRMode}
                        onResetCamera={onResetCamera}
                        onFitView={onFitView}
                        onCenterSelection={onCenterSelection}
                        onRepresentationChange={onRepresentationChange}
                        currentRepresentation={currentRepresentation}
                        onCaptureThumbnail={onCaptureThumbnail}
                        onSaveBookmark={onSaveBookmark}
                        onDuplicate={onDuplicate}
                        onLinkSettings={onLinkSettings}
                        onCloseView={onClose}
                        onDeleteView={onTrash}
                        headerMode={headerMode}
                        instanceId={instanceId}
                        triggerRef={moreButtonRef}
                    />
                </div>

                {/* Expand button - Hidden in medium/small/tiny/micro modes */}
                {showExpand && (
                    <button
                        onClick={onFullscreen}
                        className="instance-viewport__header-button instance-viewport__header-expand"
                        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                    >
                        {isFullscreen ? <Icon name="minimize2" size={12} /> : <Icon name="maximize2" size={12} />}
                    </button>
                )}

                {/* VR button - Only in full mode */}
                {showVR && (
                    <button
                        onClick={onVRMode}
                        className="instance-viewport__header-button instance-viewport__header-vr"
                        title="Enter VR Mode"
                    >
                        <Icon name="glasses" size={12} />
                    </button>
                )}

                {/* Close button - Always visible */}
                {onClose && (
                    <button
                        onClick={onClose}
                        className="instance-viewport__header-button"
                        title="Close (view stays in Datasets list)"
                    >
                        <Icon name="close" size={12} />
                    </button>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * InstanceViewport
 *
 * A viewport component that displays a ViewConfiguration using a handler.
 * Features overlay toolbars with size constraints and graceful degradation.
 */
export function InstanceViewport({
    viewConfigId = null,
    isRemote = false,
    remoteInstanceId = null,
    ownerUserName = null,
    displayName: propDisplayName,
    onClose,      // Called when user clicks X (close without delete)
    onTrash,      // Called when user clicks trash (move to Recently Deleted)
    onChangeSpan,
    onReady,      // Called when instance has loaded data and is ready to display
    currentSpan = '1x1',
    lifecycle = 'live', // 'live' | 'paused' - controls instance render loop and interactions
}) {
    // =========================================================================
    // REFS
    // =========================================================================

    const containerRef = useRef(null);
    const viewportRef = useRef(null);
    const initOnce = useRef(false);
    const instanceIdRef = useRef(null);
    const menuButtonRefs = useRef(new Map());
    const toolbarHideTimeout = useRef(null);
    const spanPickerRef = useRef(null);

    // =========================================================================
    // STATE
    // =========================================================================

    const [actualInstanceId, setActualInstanceId] = useState(
        isRemote ? remoteInstanceId : null
    );
    const [initialized, setInitialized] = useState(false);
    const [instanceType, setInstanceType] = useState(null);
    const [instanceColor, setInstanceColor] = useState(null);
    const [hasData, setHasData] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [tools, setTools] = useState([]);
    const [headerInfo, setHeaderInfo] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });

    // Toolbar visibility state
    const [toolbarVisible, setToolbarVisible] = useState(false);
    const [toolbarPinned, setToolbarPinned] = useState(false);

    // Bottom nav bar state
    const [navbarVisible, setNavbarVisible] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    // Zoom state - tracks zoom relative to initial fit view (100%)
    const [zoomLevel, setZoomLevel] = useState(100);
    const zoomFromCameraRef = useRef(false); // Flag to prevent feedback loops

    // Span picker state
    const [showSpanPicker, setShowSpanPicker] = useState(false);

    // Gear dropdown state (for gear-only mode)
    const [gearDropdownOpen, setGearDropdownOpen] = useState(false);

    // Fullscreen state
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Embedded Instance Tools panel (for fullscreen mode)
    const [embeddedToolsOpen, setEmbeddedToolsOpen] = useState(false);
    const [embeddedToolsSide, setEmbeddedToolsSide] = useState('right'); // 'left' or 'right'

    // VR mode state
    const [isInVR, setIsInVR] = useState(false);

    // Track if Instance Tools tab is active in left panel
    const [instanceToolsTabActive, setInstanceToolsTabActive] = useState(false);

    // Refresh counter to re-render when view name/properties change
    const [viewRefreshCounter, setViewRefreshCounter] = useState(0);

    // =========================================================================
    // VIEW UPDATE LISTENER
    // =========================================================================

    // Listen for view updates to refresh display name
    useEffect(() => {
        if (!viewConfigId) return;

        const handleViewUpdate = (view) => {
            // Only re-render if this is our view
            if (view?.id === viewConfigId || view === viewConfigId) {
                setViewRefreshCounter(c => c + 1);
            }
        };

        getViewConfigurationManager()?.on?.('viewUpdated', handleViewUpdate);

        return () => {
            getViewConfigurationManager()?.off?.('viewUpdated', handleViewUpdate);
        };
    }, [viewConfigId]);

    // =========================================================================
    // LIFECYCLE MANAGEMENT (pause/resume for performance)
    // =========================================================================
    // When lifecycle prop changes between 'live' and 'paused':
    // - 'live': Resume the instance (rebind events, enable rendering)
    // - 'paused': Pause the instance (unbind events, stop render loop)
    //
    // This enables warm-caching of recently used views without GPU load.

    useEffect(() => {
        if (!actualInstanceId || !initialized) return;

        if (lifecycle === 'paused') {
            workspaceManager.pauseInstance(actualInstanceId);
            log.debug(`InstanceViewport: Pausing ${actualInstanceId}`);
        } else if (lifecycle === 'live') {
            workspaceManager.resumeInstance(actualInstanceId);
            log.debug(`InstanceViewport: Resuming ${actualInstanceId}`);
        }
    }, [lifecycle, actualInstanceId, initialized]);

    // =========================================================================
    // SIZE TRACKING
    // =========================================================================

    const {
        width,
        height,
        uiMode,
        constraintReason,
        constraintMessage,
        isConstrained,
        showFullToolbars
    } = useInstanceSize(viewportRef);

    // =========================================================================
    // DROPDOWN POSITIONING & CLICK AWAY
    // =========================================================================

    useEffect(() => {
        if (!openMenuId) return;

        const updatePosition = () => {
            const buttonElement = menuButtonRefs.current.get(openMenuId);
            if (!buttonElement) return;

            const rect = buttonElement.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            const toolbar = buttonElement.closest('.instance-toolbar');
            const toolbarRect = toolbar?.getBoundingClientRect();

            const dropdownWidth = 260;
            const dropdownHeight = 240;

            let x, y;

            // Calculate button center and toolbar center
            const buttonCenterX = rect.left + rect.width / 2;
            const toolbarCenterX = toolbarRect
                ? toolbarRect.left + toolbarRect.width / 2
                : viewportWidth / 2;

            // Menu direction logic:
            // - If button is RIGHT of toolbar center → menu opens to LEFT
            // - If button is LEFT of toolbar center → menu opens to RIGHT
            // This prevents menus from obscuring other toolbar buttons
            const isButtonOnRight = buttonCenterX > toolbarCenterX;

            if (isButtonOnRight) {
                // Button on right side → open menu to the left
                x = rect.left - dropdownWidth - 8;
            } else {
                // Button on left side → open menu to the right
                x = rect.right + 8;
            }

            // Vertical alignment - align with toolbar top
            y = toolbarRect ? toolbarRect.top : rect.top;

            // Fallback: if menu goes off-screen horizontally, try the other side
            if (x < 10) {
                x = rect.right + 8; // Try right side
            }
            if (x + dropdownWidth > viewportWidth - 10) {
                x = rect.left - dropdownWidth - 8; // Try left side
            }

            // If STILL no room horizontally, position BELOW button
            if (x < 10 || x + dropdownWidth > viewportWidth - 10) {
                x = Math.max(10, Math.min(rect.left, viewportWidth - dropdownWidth - 10));
                y = rect.bottom + 8;
            }

            // Ensure dropdown stays within viewport vertically
            if (y < 10) y = 10;
            if (y + dropdownHeight > viewportHeight - 10) {
                y = viewportHeight - dropdownHeight - 10;
            }

            setDropdownPosition({ x, y, buttonWidth: rect.width });
        };

        updatePosition();

        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        const handleClickAway = (e) => {
            const buttonElement = menuButtonRefs.current.get(openMenuId);
            const dropdownElement = document.querySelector('.toolbar-menu-dropdown--portal');

            if (
                buttonElement?.contains(e.target) ||
                dropdownElement?.contains(e.target)
            ) {
                return;
            }

            setOpenMenuId(null);
        };

        document.addEventListener('mousedown', handleClickAway, true);

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
            document.removeEventListener('mousedown', handleClickAway, true);
        };
    }, [openMenuId]);

    // =========================================================================
    // INSTANCE INITIALIZATION
    // =========================================================================

    useEffect(() => {
        if (initOnce.current || !containerRef.current) return;

        initOnce.current = true;

        const initialize = async () => {
            try {
                setLoading(true);
                log.debug(`Creating typeless instance (view: ${viewConfigId || 'none'})`);

                // Check if view is trashed or archived before creating instance
                if (viewConfigId) {
                    const viewConfig = getViewConfigurationManager()?.getView(viewConfigId);
                    if (viewConfig && (viewConfig.status === 'trashed' || viewConfig.status === 'archived')) {
                        log.warn(`Cannot create instance for ${viewConfig.status} view ${viewConfigId}`);
                        setError(`View has been ${viewConfig.status === 'trashed' ? 'deleted' : 'archived'}`);
                        setLoading(false);
                        return;
                    }
                }

                const instanceId = await workspaceManager.createInstance(
                    containerRef.current,
                    null,
                    { viewConfigId: viewConfigId }
                );

                instanceIdRef.current = instanceId;
                setActualInstanceId(instanceId);
                setInitialized(true);
                setActiveInstance(instanceId, viewConfigId);

                // Get the assigned color
                const color = workspaceManager.getInstanceColor(instanceId);
                setInstanceColor(color);

                if (viewConfigId) {
                    getViewConfigurationManager()?.activateView(viewConfigId);
                }

                const instanceHeader = workspaceManager.getInstanceHeaderInfo(instanceId);
                setHeaderInfo(instanceHeader);

                log.info(`Typeless instance ${instanceId} created with color ${color?.name}`);

            } catch (err) {
                log.error(`Instance initialization failed:`, err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        initialize();

        return () => {
            if (instanceIdRef.current) {
                log.debug(`Cleaning up instance ${instanceIdRef.current}`);
                workspaceManager.deleteInstance(instanceIdRef.current);
            }

            if (viewConfigId) {
                getViewConfigurationManager()?.deactivateView(viewConfigId);
            }
        };
    }, [viewConfigId]);

    // =========================================================================
    // DATA LOADING
    // =========================================================================

    useEffect(() => {
        if (!initialized || !actualInstanceId || !viewConfigId) return;

        const loadViewData = async () => {
            try {
                log.debug(`Loading view ${viewConfigId} into instance ${actualInstanceId}`);

                const viewConfig = getViewConfigurationManager()?.getView(viewConfigId);
                if (!viewConfig) {
                    log.warn(`View ${viewConfigId} not found`);
                    return;
                }

                // Don't load data for trashed or archived views
                if (viewConfig.status === 'trashed' || viewConfig.status === 'archived') {
                    log.warn(`View ${viewConfigId} is ${viewConfig.status}, skipping data load`);
                    return;
                }

                if (viewConfig.datasetId) {
                    await workspaceManager.loadDataIntoInstance(
                        actualInstanceId,
                        viewConfig.datasetId
                    );

                    const instance = workspaceManager.getInstance(actualInstanceId);
                    setInstanceType(instance.type);
                    setHasData(true);

                    log.info(`Instance ${actualInstanceId} is now type: ${instance.type}`);
                }

            } catch (err) {
                log.error(`Failed to load view data:`, err);
                setError(err.message);
            }
        };

        loadViewData();
    }, [initialized, actualInstanceId, viewConfigId]);

    // =========================================================================
    // READY CALLBACK
    // =========================================================================

    // Call onReady when data has loaded (for progressive loading)
    useEffect(() => {
        if (hasData && onReady) {
            onReady();
        }
    }, [hasData, onReady]);

    // =========================================================================
    // TOOLS LOADING
    // =========================================================================

    useEffect(() => {
        if (!initialized || !actualInstanceId || !instanceType) return;

        const loadTools = () => {
            try {
                const toolsList = workspaceManager.getInstanceTools(actualInstanceId);
                log.debug(`Loaded ${toolsList.length} tools for ${instanceType} instance`);
                setTools(toolsList);

                const updatedHeader = workspaceManager.getInstanceHeaderInfo(actualInstanceId);
                setHeaderInfo(updatedHeader);
            } catch (err) {
                log.warn(`Failed to load tools:`, err);
            }
        };

        loadTools();

        const handleToolsUpdate = (event) => {
            if (event.detail?.instanceId === actualInstanceId) {
                log.debug(`Tools updated for ${actualInstanceId}, refreshing toolbar`);
                const updatedTools = workspaceManager.getInstanceTools(actualInstanceId);
                setTools(updatedTools);
            }
        };

        window.addEventListener('cia:tools-updated', handleToolsUpdate);
        return () => window.removeEventListener('cia:tools-updated', handleToolsUpdate);
    }, [actualInstanceId, initialized, instanceType]);

    // =========================================================================
    // VIEW LIFECYCLE - Listen for view being trashed/deleted
    // If our view gets trashed or deleted, remove placement and close instance
    // =========================================================================

    useEffect(() => {
        if (!viewConfigId) return;

        const handleViewTrashed = async ({ viewId }) => {
            if (viewId === viewConfigId) {
                log.info(`View ${viewConfigId} was trashed, removing placement and closing instance`);
                // Remove the canvas placement - this will cause React to unmount this component
                try {
                    await canvasManager?.removeViewPlacements?.(viewId);
                } catch (err) {
                    log.warn(`Failed to remove placements for trashed view ${viewId}:`, err);
                }
            }
        };

        const handleViewDeleted = async ({ viewId }) => {
            if (viewId === viewConfigId) {
                log.info(`View ${viewConfigId} was permanently deleted, removing placement and closing instance`);
                // Remove the canvas placement - this will cause React to unmount this component
                try {
                    await canvasManager?.removeViewPlacements?.(viewId);
                } catch (err) {
                    log.warn(`Failed to remove placements for deleted view ${viewId}:`, err);
                }
            }
        };

        getViewConfigurationManager()?.on?.('viewTrashed', handleViewTrashed);
        getViewConfigurationManager()?.on?.('viewDeleted', handleViewDeleted);

        return () => {
            getViewConfigurationManager()?.off?.('viewTrashed', handleViewTrashed);
            getViewConfigurationManager()?.off?.('viewDeleted', handleViewDeleted);
        };
    }, [viewConfigId]);

    // =========================================================================
    // ZOOM SYNC WITH CAMERA
    // Subscribe to camera changes to sync zoom percentage display
    // Zoom is relative to initial fit view: 100% = data fits in view
    // =========================================================================

    useEffect(() => {
        if (!initialized || !actualInstanceId || !hasData) return;

        // Subscribe to camera changes from the instance
        const unsubscribe = workspaceManager.onCameraChange(actualInstanceId, (cameraState) => {
            // Skip if this update was triggered by our own zoom change
            if (zoomFromCameraRef.current) {
                zoomFromCameraRef.current = false;
                return;
            }

            if (cameraState?.zoomLevel != null) {
                // Update zoom level from actual camera state
                // No clamping - allow whatever zoom VTK supports
                setZoomLevel(Math.round(cameraState.zoomLevel));
            }
        });

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [initialized, actualInstanceId, hasData]);

    // =========================================================================
    // UI HELPERS
    // =========================================================================

    // Native browser fullscreen
    const handleFullscreen = useCallback(() => {
        if (!viewportRef.current) return;

        if (document.fullscreenElement === viewportRef.current) {
            document.exitFullscreen?.();
        } else {
            viewportRef.current.requestFullscreen?.();
        }
    }, []);

    // Listen for fullscreen changes (e.g., user presses Esc)
    useEffect(() => {
        const handleFullscreenChange = () => {
            const nowFullscreen = document.fullscreenElement === viewportRef.current;
            setIsFullscreen(nowFullscreen);
            // Close embedded tools when exiting fullscreen
            if (!nowFullscreen) {
                setEmbeddedToolsOpen(false);
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // =========================================================================
    // TOOLBAR VISIBILITY
    // =========================================================================

    const showToolbar = useCallback(() => {
        if (toolbarHideTimeout.current) {
            clearTimeout(toolbarHideTimeout.current);
            toolbarHideTimeout.current = null;
        }
        setToolbarVisible(true);
    }, []);

    const hideToolbar = useCallback(() => {
        if (toolbarPinned || openMenuId) return;

        toolbarHideTimeout.current = setTimeout(() => {
            setToolbarVisible(false);
        }, 800);
    }, [toolbarPinned, openMenuId]);

    const toggleToolbarPin = useCallback(() => {
        setToolbarPinned(prev => !prev);
    }, []);

    // Keep toolbar visible when menu is open
    useEffect(() => {
        if (openMenuId) {
            showToolbar();
        }
    }, [openMenuId, showToolbar]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (toolbarHideTimeout.current) {
                clearTimeout(toolbarHideTimeout.current);
            }
        };
    }, []);

    // =========================================================================
    // NAVBAR VISIBILITY (focus-based)
    // =========================================================================

    const handleFocus = useCallback(() => {
        setIsFocused(true);
        setNavbarVisible(true);

        if (actualInstanceId) {
            // Update cursor tracking (existing behavior)
            setActiveInstance(actualInstanceId, viewConfigId);

            // NEW: Update workspaceManager's active instance
            workspaceManager?.setActiveInstance?.(actualInstanceId);

            // NEW: Dispatch event for UI components
            window.dispatchEvent(
                new CustomEvent('cia:instance-focused', {
                    detail: {
                        instanceId: actualInstanceId,
                        viewId: viewConfigId
                    },
                })
            );
        }
    }, [actualInstanceId, viewConfigId]);

    /**
 * Handle click/mousedown on viewport container
 * Sets this instance as the active instance in workspaceManager
 */
    const handleActivateInstance = useCallback(() => {
        if (!actualInstanceId) return;

        // Update workspaceManager's active instance
        workspaceManager?.setActiveInstance?.(actualInstanceId);

        // Dispatch event for other components (InstanceSelector, InstanceToolsTab)
        window.dispatchEvent(
            new CustomEvent('cia:instance-focused', {
                detail: {
                    instanceId: actualInstanceId,
                    viewId: viewConfigId
                },
            })
        );
    }, [actualInstanceId, viewConfigId]);

    const handleBlur = useCallback(() => {
        setIsFocused(false);
        // Delay hiding navbar to allow for interaction
        setTimeout(() => {
            setNavbarVisible(false);
        }, 300);
    }, []);

    // =========================================================================
    // ZOOM CONTROLS
    // =========================================================================

    const handleZoomChange = useCallback((newZoom) => {
        // No clamping - allow whatever zoom VTK supports
        // Minimum of 1% to avoid divide-by-zero
        const safeZoom = Math.max(1, newZoom);
        const oldZoom = zoomLevel;

        // Set flag to prevent feedback loop from camera change callback
        zoomFromCameraRef.current = true;
        setZoomLevel(Math.round(safeZoom));

        // Apply zoom to the actual instance view
        if (actualInstanceId && oldZoom !== safeZoom && oldZoom > 0) {
            // Calculate zoom factor: new / old (> 1 = zoom in, < 1 = zoom out)
            const factor = safeZoom / oldZoom;
            workspaceManager.zoom(actualInstanceId, factor);
        }
    }, [zoomLevel, actualInstanceId]);

    const handleFit = useCallback(() => {
        // Fit resets to 100% (initial view)
        zoomFromCameraRef.current = true;
        setZoomLevel(100);
        if (actualInstanceId) {
            workspaceManager.fitView(actualInstanceId);
        }
    }, [actualInstanceId]);

    // =========================================================================
    // INSTANCE TOOLS PANEL
    // =========================================================================

    const handleOpenInstanceTools = useCallback(() => {
        // In fullscreen mode, toggle the embedded Instance Tools panel
        if (isFullscreen) {
            setEmbeddedToolsOpen(prev => !prev);
            return;
        }

        // Otherwise, emit event to open Instance Tools floating panel
        window.dispatchEvent(new CustomEvent('cia:open-instance-tools', {
            detail: { instanceId: actualInstanceId }
        }));
    }, [actualInstanceId, isFullscreen]);

    // =========================================================================
    // VR MODE
    // =========================================================================

    // Track VR session state
    useEffect(() => {
        const handleSessionStarted = () => setIsInVR(true);
        const handleSessionEnded = () => setIsInVR(false);

        vrManager.on('sessionStarted', handleSessionStarted);
        vrManager.on('sessionEnded', handleSessionEnded);

        // Check initial state
        setIsInVR(vrManager.isInVR());

        return () => {
            vrManager.off('sessionStarted', handleSessionStarted);
            vrManager.off('sessionEnded', handleSessionEnded);
        };
    }, []);

    const handleVRMode = useCallback(async () => {
        // Dispatch event to trigger VR mode - VRButton handles the actual logic
        window.dispatchEvent(new CustomEvent('cia:toggle-vr-mode', {
            detail: { instanceId: actualInstanceId }
        }));
    }, [actualInstanceId]);

    const handleExitVR = useCallback(async () => {
        try {
            await vrManager.exitVR();
        } catch (err) {
            console.error('Failed to exit VR:', err);
        }
    }, []);

    // =========================================================================
    // TRACK INSTANCE TOOLS TAB STATE
    // =========================================================================

    useEffect(() => {
        const handleTabChange = (event) => {
            const { isInstanceToolsActive } = event.detail || {};
            setInstanceToolsTabActive(isInstanceToolsActive || false);
        };

        window.addEventListener('cia:left-panel-tab-change', handleTabChange);
        return () => {
            window.removeEventListener('cia:left-panel-tab-change', handleTabChange);
        };
    }, []);

    // =========================================================================
    // KEYBOARD SHORTCUTS
    // =========================================================================

    useEffect(() => {
        if (!isFocused) return;

        const handleKeyDown = (e) => {
            // 'T' key opens Instance Tools panel
            if (e.key === 't' || e.key === 'T') {
                if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                    e.preventDefault();
                    handleOpenInstanceTools();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFocused, handleOpenInstanceTools]);

    // =========================================================================
    // MORE MENU HANDLERS
    // =========================================================================

    const handleResetCamera = useCallback(() => {
        if (actualInstanceId) {
            workspaceManager.resetCamera?.(actualInstanceId);
        }
    }, [actualInstanceId]);

    const handleCenterSelection = useCallback(() => {
        if (actualInstanceId) {
            workspaceManager.centerOnSelection?.(actualInstanceId);
        }
    }, [actualInstanceId]);

    const [currentRepresentation, setCurrentRepresentation] = useState('surface');

    const handleRepresentationChange = useCallback((representation) => {
        setCurrentRepresentation(representation);
        if (actualInstanceId) {
            workspaceManager.setRepresentation?.(actualInstanceId, representation);
        }
    }, [actualInstanceId]);

    const handleCaptureThumbnail = useCallback(() => {
        if (viewConfigId) {
            window.dispatchEvent(new CustomEvent('cia:capture-thumbnail', {
                detail: { viewConfigId, instanceId: actualInstanceId }
            }));
        }
    }, [viewConfigId, actualInstanceId]);

    const handleSaveBookmark = useCallback(() => {
        if (viewConfigId) {
            window.dispatchEvent(new CustomEvent('cia:save-bookmark', {
                detail: { viewConfigId, instanceId: actualInstanceId }
            }));
        }
    }, [viewConfigId, actualInstanceId]);

    const handleDuplicate = useCallback(() => {
        if (viewConfigId) {
            window.dispatchEvent(new CustomEvent('cia:duplicate-view', {
                detail: { viewConfigId }
            }));
        }
    }, [viewConfigId]);

    const handleLinkSettings = useCallback(() => {
        if (viewConfigId) {
            window.dispatchEvent(new CustomEvent('cia:open-link-settings', {
                detail: { viewConfigId }
            }));
        }
    }, [viewConfigId]);

    // =========================================================================
    // SPAN PICKER CLICK OUTSIDE
    // =========================================================================

    useEffect(() => {
        if (!showSpanPicker) return;

        const handleClickOutside = (e) => {
            if (spanPickerRef.current && !spanPickerRef.current.contains(e.target)) {
                setShowSpanPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showSpanPicker]);

    // =========================================================================
    // GEAR DROPDOWN CLICK OUTSIDE
    // =========================================================================

    useEffect(() => {
        if (!gearDropdownOpen) return;

        const handleClickOutside = (e) => {
            const gearDropdown = document.querySelector('.instance-viewport__gear-dropdown');
            if (gearDropdown && !gearDropdown.contains(e.target)) {
                setGearDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [gearDropdownOpen]);

    // =========================================================================
    // TOOL RENDERING
    // =========================================================================

    const renderMenuOption = (option, optIndex, menuId) => {
        if (option.type === 'separator') {
            return (
                <div
                    key={`menu-sep-${menuId}-${optIndex}`}
                    className="menu-separator"
                />
            );
        }

        if (option.type === 'header') {
            return (
                <div
                    key={option.id || `header-${menuId}-${optIndex}`}
                    className="menu-header"
                >
                    {option.label}
                </div>
            );
        }

        if (option.type === 'camera-grid') {
            return (
                <CameraViewGridPicker
                    key={option.id}
                    views={option.views}
                    disabled={option.disabled}
                    onViewChange={option.onViewSelect}
                />
            );
        }

        if (option.type === 'position-grid') {
            return (
                <PositionGridPicker
                    key={option.id}
                    positions={option.positions}
                    currentPosition={option.currentPosition}
                    disabled={option.disabled}
                    onPositionChange={option.onPositionChange}
                />
            );
        }

        if (option.type === 'color-swatch-grid') {
            return (
                <ColorSwatchGrid
                    key={option.id}
                    colormaps={option.colormaps}
                    currentColormap={option.currentColormap}
                    disabled={option.disabled}
                    onColormapChange={option.onColormapChange}
                />
            );
        }

        if (option.type === 'slider-with-presets') {
            const IconComponent = getToolIcon(option.icon);

            return (
                <SliderWithPresets
                    key={option.id}
                    icon={IconComponent ? <IconComponent size={14} /> : null}
                    label={option.label}
                    min={option.min}
                    max={option.max}
                    step={option.step}
                    value={option.value}
                    presets={option.presets}
                    unit={option.unit}
                    disabled={option.disabled}
                    onChange={option.onChange}
                />
            );
        }

        if (option.type === 'slider') {
            return (
                <SliderMenuOption
                    key={option.id}
                    label={option.label}
                    min={option.min}
                    max={option.max}
                    step={option.step}
                    value={option.value}
                    unit={option.unit}
                    disabled={option.disabled}
                    onChange={option.onChange}
                />
            );
        }

        const OptionIcon = getToolIcon(option.id, option.icon);

        return (
            <button
                key={option.id || `option-${menuId}-${optIndex}`}
                onClick={option.onClick}
                className={`menu-option ${option.active ? 'active' : ''}`}
                disabled={option.disabled}
                aria-label={option.label}
            >
                <OptionIcon size={14} className="option-icon" />
                <div className="option-text">
                    <span className="option-label">{option.label}</span>
                    {option.description && (
                        <span className="option-description">
                            {option.description}
                        </span>
                    )}
                </div>
            </button>
        );
    };

    const renderTool = (tool, index) => {
        if (tool.type === 'separator') {
            return (
                <div
                    key={`separator-${index}`}
                    className="instance-toolbar__separator"
                />
            );
        }

        const IconComponent = getToolIcon(tool.id, tool.icon);
        const isOpen = openMenuId === tool.id;

        if (tool.type === 'menu') {
            return (
                <div
                    key={tool.id || `menu-${index}`}
                    className="toolbar-menu"
                    onMouseEnter={() => setOpenMenuId(tool.id)}
                    onMouseLeave={(e) => {
                        const relatedTarget = e.relatedTarget;
                        const dropdownElement = document.querySelector('.toolbar-menu-dropdown--portal');

                        // Check relatedTarget is a valid Node before calling contains()
                        if (!dropdownElement || !relatedTarget || !(relatedTarget instanceof Node) || !dropdownElement.contains(relatedTarget)) {
                            setTimeout(() => {
                                const stillHoveringDropdown = document.querySelector('.toolbar-menu-dropdown--portal:hover');
                                if (!stillHoveringDropdown) {
                                    setOpenMenuId(null);
                                }
                            }, 100);
                        }
                    }}
                >
                    <button
                        ref={(el) => {
                            if (el) menuButtonRefs.current.set(tool.id, el);
                        }}
                        className={`instance-toolbar__tool-button ${tool.active ? 'active' : ''}`}
                        disabled={tool.disabled}
                        aria-label={tool.label}
                        aria-haspopup="true"
                        aria-expanded={isOpen}
                    >
                        {IconComponent && <IconComponent size={16} strokeWidth={2} />}
                        <Icon name="chevronDown" size={8} className="instance-toolbar__menu-indicator" />

                        <div className="instance-toolbar__tooltip">
                            <div className="tooltip-title">{tool.label}</div>
                            {tool.description && (
                                <div className="tooltip-desc">{tool.description}</div>
                            )}
                            {tool.shortcut && (
                                <div className="tooltip-shortcut">{tool.shortcut}</div>
                            )}
                        </div>
                    </button>

                    {isOpen && tool.options && tool.options.length > 0 && createPortal(
                        <div
                            className="toolbar-menu-dropdown toolbar-menu-dropdown--portal"
                            style={{
                                position: 'fixed',
                                left: `${dropdownPosition.x}px`,
                                top: `${dropdownPosition.y}px`,
                                minWidth: '220px',
                            }}
                            onMouseEnter={() => setOpenMenuId(tool.id)}
                            onMouseLeave={() => {
                                setTimeout(() => {
                                    const hoveringButton = menuButtonRefs.current.get(tool.id)?.matches(':hover');
                                    if (!hoveringButton) {
                                        setOpenMenuId(null);
                                    }
                                }, 100);
                            }}
                        >
                            {tool.options.map((option, optIndex) =>
                                renderMenuOption(option, optIndex, tool.id)
                            )}
                        </div>,
                        document.body
                    )}
                </div>
            );
        }

        return (
            <button
                key={tool.id || `tool-${index}`}
                onClick={tool.onClick}
                className={`instance-toolbar__tool-button ${tool.active ? 'active' : ''}`}
                disabled={tool.disabled}
                aria-label={tool.label}
            >
                {IconComponent && <IconComponent size={16} strokeWidth={2} />}
                <div className="instance-toolbar__tooltip">
                    <div className="tooltip-title">{tool.label}</div>
                    {tool.description && (
                        <div className="tooltip-desc">{tool.description}</div>
                    )}
                    {tool.shortcut && (
                        <div className="tooltip-shortcut">{tool.shortcut}</div>
                    )}
                </div>
            </button>
        );
    };

    // Close handler - deactivates view but doesn't delete
    const handleClose = useCallback(() => {
        // Clean up the instance
        if (instanceIdRef.current) {
            workspaceManager.deleteInstance(instanceIdRef.current);
        }

        // Deactivate the view (marks as inactive, keeps in Datasets list)
        if (viewConfigId) {
            getViewConfigurationManager()?.deactivateView(viewConfigId);
        }

        // Notify parent to remove from canvas
        onClose?.();
    }, [viewConfigId, onClose]);

    // Trash handler - moves to Recently Deleted
    const handleTrash = useCallback(async () => {
        // Clean up the instance first
        if (instanceIdRef.current) {
            workspaceManager.deleteInstance(instanceIdRef.current);
        }

        // Use viewLifecycleService for proper trash workflow
        // (removes from canvas AND trashes the view)
        if (viewConfigId) {
            try {
                await viewLifecycleService.trashView(viewConfigId);
                log.info(`View ${viewConfigId} moved to trash`);
            } catch (err) {
                log.error(`Failed to trash view ${viewConfigId}:`, err);
            }
        }

        // Notify parent
        onTrash?.();
    }, [viewConfigId, onTrash]);

    // =========================================================================
    // RENDER
    // =========================================================================

    const displayName = useMemo(() => {
        // If we have a display name prop from parent, use it
        if (propDisplayName) {
            return propDisplayName;
        }

        if (isRemote && ownerUserName) {
            if (viewConfigId) {
                try {
                    const view = getViewConfigurationManager()?.getView(viewConfigId);
                    if (view) {
                        const dataset = getDatasetManager()?.getDataset(view.datasetId);
                        const filename = dataset?.filename || 'Unknown';
                        return `${ownerUserName}'s view of ${filename}`;
                    }
                } catch (e) {
                    return `${ownerUserName}'s view`;
                }
            }
            return `${ownerUserName}'s view`;
        }

        if (viewConfigId) {
            try {
                const view = getViewConfigurationManager()?.getView(viewConfigId);
                if (view) {
                    const dataset = getDatasetManager()?.getDataset(view.datasetId);
                    // Show view name if it's been customized
                    const isDefaultName = !view.name ||
                        view.name === 'Untitled View' ||
                        view.name === 'Default View' ||
                        view.name === dataset?.filename;

                    if (!isDefaultName) {
                        return view.name;
                    }
                    return dataset?.filename || view.name || 'View';
                }
            } catch (e) {
                // Fall through
            }
        }

        // Show "Loading..." while data is loading, not the instance ID
        if (!hasData) {
            return 'Loading...';
        }

        // Final fallback - should rarely hit this now
        return `View ${viewConfigId?.slice(0, 8) || 'Unknown'}`;
    }, [viewConfigId, hasData, isRemote, ownerUserName, propDisplayName]);

    // =========================================================================
    // DERIVED STATE: File Type Display Info (from manifest)
    // =========================================================================

    const fileTypeDisplayInfo = useMemo(() => {
        if (!viewConfigId) return null;

        try {
            const view = getViewConfigurationManager()?.getView(viewConfigId);
            if (view?.datasetId) {
                const dataset = getDatasetManager()?.getDataset(view.datasetId);
                if (dataset?.fileType) {
                    // Get display info from manifest via instanceTypesInit
                    return getFileTypeDisplayInfo(dataset.fileType);
                }
            }
        } catch (e) {
            // Fall through
        }

        return null;
    }, [viewConfigId, hasData]); // Include hasData to re-derive after data loads

    const colorHex = instanceColor?.hex || '#60a5fa';
    const colorRgb = hexToRgb(colorHex);

    return (
        <div
            ref={viewportRef}
            className={`instance-viewport instance-viewport--${uiMode} ${isFocused ? 'instance-viewport--active' : ''} ${isInVR ? 'instance-viewport--vr-mode' : ''}`}
            style={{
                '--instance-color': colorHex,
                '--instance-color-rgb': colorRgb,
            }}
            tabIndex={0}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onMouseDown={handleActivateInstance}
        >
            {/* Header - Hidden in small viewport modes (gear-only/corner-controls) */}
            {showFullToolbars && (
                <HeaderBar
                    displayName={displayName}
                    fileTypeDisplayInfo={fileTypeDisplayInfo}
                    instanceColor={instanceColor}
                    isFullscreen={isFullscreen}
                    isActive={isFocused}
                    isLoading={loading || !hasData}
                    onFullscreen={handleFullscreen}
                    onClose={handleClose}
                    onTrash={handleTrash}
                    onOpenInstanceTools={handleOpenInstanceTools}
                    onVRMode={handleVRMode}
                    onResetCamera={handleResetCamera}
                    onFitView={handleFit}
                    onCenterSelection={handleCenterSelection}
                    onRepresentationChange={handleRepresentationChange}
                    currentRepresentation={currentRepresentation}
                    onCaptureThumbnail={handleCaptureThumbnail}
                    onSaveBookmark={handleSaveBookmark}
                    onDuplicate={handleDuplicate}
                    onLinkSettings={handleLinkSettings}
                    viewportWidth={width}
                    onShowToolbar={showToolbar}
                    onHideToolbar={hideToolbar}
                    instanceId={actualInstanceId}
                />
            )}

            {/* VR Mode Indicator - Shows when in VR */}
            {isInVR && <VRModeIndicator onExit={handleExitVR} />}

            {/* Top Toolbar - Overlay that slides down on hover */}
            {showFullToolbars && tools.length > 0 && (
                <TopToolbar
                    tools={tools}
                    uiMode={uiMode}
                    visible={toolbarVisible}
                    pinned={toolbarPinned}
                    onTogglePin={toggleToolbarPin}
                    openMenuId={openMenuId}
                    setOpenMenuId={setOpenMenuId}
                    dropdownPosition={dropdownPosition}
                    menuButtonRefs={menuButtonRefs}
                    onShowToolbar={showToolbar}
                    onHideToolbar={hideToolbar}
                    renderTool={renderTool}
                    onOpenInstanceTools={handleOpenInstanceTools}
                    instanceToolsTabActive={instanceToolsTabActive}
                    instanceId={actualInstanceId}
                    onFullscreen={handleFullscreen}
                    onVRMode={handleVRMode}
                    onResetCamera={handleResetCamera}
                    onFitView={handleFit}
                    onDuplicate={handleDuplicate}
                    onClose={handleClose}
                    onTrash={handleTrash}
                />
            )}

            {/* Content Area */}
            <div
                ref={containerRef}
                className="instance-viewport__content"
            >
                {loading && (
                    <div className="instance-viewport__loading">
                        Loading view...
                    </div>
                )}
                {error && (
                    <div className="instance-viewport__error">
                        <Icon name="alertCircle" size={24} />
                        <div className="error-message">{error}</div>
                    </div>
                )}
            </div>

            {/* Embedded Instance Tools Panel - For fullscreen mode */}
            {isFullscreen && (
                <div className={`instance-viewport__embedded-tools instance-viewport__embedded-tools--${embeddedToolsSide} ${embeddedToolsOpen ? 'instance-viewport__embedded-tools--open' : ''}`}>
                    <div className="instance-viewport__embedded-tools-header">
                        <div className="instance-viewport__embedded-tools-title">
                            <Icon name="wrench" size={14} />
                            <span>Instance Tools</span>
                        </div>
                        <div className="instance-viewport__embedded-tools-actions">
                            <button
                                className="instance-viewport__embedded-tools-toggle-side"
                                onClick={() => setEmbeddedToolsSide(side => side === 'right' ? 'left' : 'right')}
                                title={`Move to ${embeddedToolsSide === 'right' ? 'left' : 'right'} side`}
                            >
                                <Icon name={embeddedToolsSide === 'right' ? 'panelLeft' : 'panelRight'} size={14} />
                            </button>
                            <button
                                className="instance-viewport__embedded-tools-close"
                                onClick={() => setEmbeddedToolsOpen(false)}
                                title="Close (T)"
                            >
                                <Icon name="close" size={14} />
                            </button>
                        </div>
                    </div>
                    <div className="instance-viewport__embedded-tools-content">
                        <InstanceToolsPanelContent />
                    </div>
                </div>
            )}

            {/* Navigation Notch - Carved navigation control at bottom */}
            {showFullToolbars && hasData && (
                <NavigationNotch
                    position="bottom"
                    zoomLevel={zoomLevel}
                    onZoomChange={handleZoomChange}
                    onFit={handleFit}
                    onResetCamera={handleResetCamera}
                    onCenterSelection={handleCenterSelection}
                    instanceColor={instanceColor}
                    availableSpace={width}
                    visible={navbarVisible || isFocused}
                />
            )}

            {/* Gear Only Dropdown - For small viewports (corner-controls and gear-only modes) */}
            {!showFullToolbars && (
                <GearOnlyDropdown
                    open={gearDropdownOpen}
                    onToggle={() => setGearDropdownOpen(!gearDropdownOpen)}
                    onOpenInstanceTools={handleOpenInstanceTools}
                    onVRMode={handleVRMode}
                    onMaximize={handleFullscreen}
                    onDuplicate={handleDuplicate}
                    onClose={handleClose}
                    onTrash={handleTrash}
                    instanceId={actualInstanceId}
                />
            )}
        </div>
    );
}