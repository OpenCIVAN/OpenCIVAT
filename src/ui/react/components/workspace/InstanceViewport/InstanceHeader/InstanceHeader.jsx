// src/ui/react/components/workspace/InstanceViewport/InstanceHeader/InstanceHeader.jsx
// Responsive header bar for InstanceViewport
// Renders even before instance data loads to allow early close actions

import React, { useState, useRef, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@UI/react/components/atoms';
import { MenuItem, VRButton } from '@UI/react/components/molecules';

// Note: Styles are in parent InstanceViewport.scss using instance-viewport__header classes

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert hex color to RGB string for rgba() usage in CSS
 */
export const hexToRgb = (hex) => {
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
export const getHeaderMode = (width) => {
    if (width >= 450) return 'full';
    if (width >= 380) return 'large';
    if (width >= 300) return 'medium';
    if (width >= 220) return 'small';
    if (width >= 160) return 'tiny';
    return 'micro';
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * ColorDot - Status indicator that shows loading state or static color
 */
export const ColorDot = memo(function ColorDot({ color, isLoading, size = 8 }) {
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
 * MoreMenu - Dropdown menu with all instance tools and actions
 */
export function MoreMenu({
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
    isFullscreen = false,
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

    // Menu content - shared between portal and inline rendering
    const menuContent = (
        <div
            className={`instance-viewport__more-menu ${isFullscreen ? 'instance-viewport__more-menu--inline' : ''}`}
            ref={menuRef}
            style={isFullscreen ? {} : { top: position.top, right: position.right }}
        >
            {/* Tools Section */}
            <div className="instance-viewport__more-menu__section-header">Tools</div>
            <MenuItem
                icon="wrench"
                label="Instance Tools Panel"
                shortcut="T"
                onClick={() => handleItemClick(onOpenInstanceTools)}
            />
            {headerMode === 'small' && (
                <MenuItem
                    icon="maximize2"
                    label="Expand"
                    onClick={() => handleItemClick(onFullscreen)}
                />
            )}
            {(headerMode === 'small' || headerMode === 'medium') && (
                <MenuItem
                    icon="glasses"
                    label="Enter VR Mode"
                    onClick={() => handleItemClick(onVRMode)}
                />
            )}

            <div className="instance-viewport__more-menu__divider" />

            {/* Navigation Section */}
            <div className="instance-viewport__more-menu__section-header">Navigation</div>
            <MenuItem
                icon="rotateCcw"
                label="Reset Camera"
                onClick={() => handleItemClick(onResetCamera)}
            />
            <MenuItem
                icon="scan"
                label="Fit to View"
                onClick={() => handleItemClick(onFitView)}
            />
            <MenuItem
                icon="crosshair"
                label="Center on Selection"
                onClick={() => handleItemClick(onCenterSelection)}
            />

            <div className="instance-viewport__more-menu__divider" />

            {/* Representation Section */}
            <div className="instance-viewport__more-menu__section-header">Representation</div>
            <MenuItem
                icon="box"
                label="Surface"
                active={currentRepresentation === 'surface'}
                onClick={() => handleItemClick(() => onRepresentationChange?.('surface'))}
            />
            <MenuItem
                icon="grid3x3"
                label="Wireframe"
                active={currentRepresentation === 'wireframe'}
                onClick={() => handleItemClick(() => onRepresentationChange?.('wireframe'))}
            />
            <MenuItem
                icon="circle"
                label="Points"
                active={currentRepresentation === 'points'}
                onClick={() => handleItemClick(() => onRepresentationChange?.('points'))}
            />

            <div className="instance-viewport__more-menu__divider" />

            {/* View Section */}
            <div className="instance-viewport__more-menu__section-header">View</div>
            <MenuItem
                icon="camera"
                label="Capture Thumbnail"
                onClick={() => handleItemClick(onCaptureThumbnail)}
            />
            <MenuItem
                icon="bookmark"
                label="Save as Bookmark"
                onClick={() => handleItemClick(onSaveBookmark)}
            />
            <MenuItem
                icon="copy"
                label="Duplicate View"
                onClick={() => handleItemClick(onDuplicate)}
            />
            <MenuItem
                icon="link"
                label="Link Settings..."
                onClick={() => handleItemClick(onLinkSettings)}
            />

            <div className="instance-viewport__more-menu__divider" />

            {/* Danger Section */}
            <MenuItem
                icon="close"
                label="Close View"
                danger
                onClick={() => handleItemClick(onCloseView)}
            />
            <MenuItem
                icon="delete"
                label="Delete View"
                danger
                onClick={() => handleItemClick(onDeleteView)}
            />
        </div>
    );

    // In fullscreen mode, render inline (no portal) so it stays visible
    if (isFullscreen) {
        return menuContent;
    }

    return createPortal(menuContent, document.body);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * InstanceHeader - Responsive header with 6 breakpoints
 *
 * Breakpoints:
 * - Full (>=450px): [Wrench] View Name ... [More] [Expand] [VR] [Close]
 * - Large (>=380px): [Wrench] View Name ... [More] [Expand] [Close] (VR in menu)
 * - Medium (>=300px): [Wrench] View Name ... [More] [Close] (Expand/VR in menu)
 * - Small (>=220px): View Name ... [More] [Close] (Wrench/Expand/VR in menu)
 * - Tiny (>=160px): [Dot] Name [More] [Close] (minimal)
 * - Micro (<160px): [Dot] [More] [Close] (icons only)
 *
 * NOTE: This component renders even before instance data loads,
 * allowing users to close instances during initialization.
 */
export const InstanceHeader = memo(function InstanceHeader({
    displayName,
    fileTypeDisplayInfo,
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
                        isFullscreen={isFullscreen}
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
                        className="instance-viewport__header-button instance-viewport__header-close"
                        title="Close (view stays in Datasets list)"
                    >
                        <Icon name="close" size={12} />
                    </button>
                )}
            </div>
        </div>
    );
});

export default InstanceHeader;
