// src/ui/react/components/workspace/InstanceViewport/InstanceHeader/InstanceHeader.jsx
// Simplified, always-visible header bar for InstanceViewport
// Renders even before instance data loads to allow early close actions
//
// Updated to match canvas-floating-architecture-prototype.jsx:
// - Removed wrench button (access tools via More menu)
// - Added LiveIndicator for collaborators
// - Added Focus button
// - Color-coded label badge with glow
// - Responsive render modes (full, compact, thumbnail, snapshot)

import React, { useState, useRef, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { Icon, IconButton } from '@UI/react/components/atoms';
import { MenuItem } from '@UI/react/components/molecules';
import { LiveIndicatorCompact } from '../LiveIndicator';

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

// ============================================================================
// MORE MENU COMPONENT
// ============================================================================

/**
 * MoreMenu - Dropdown menu with instance actions
 */
function MoreMenu({
    isOpen,
    onClose,
    onOpenInstanceTools,
    onFullscreen,
    onVRMode,
    onResetCamera,
    onFitView,
    onDuplicate,
    onAddToSubset,
    onShare,
    onCloseView,
    onDeleteView,
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
            if (menuRef.current && !menuRef.current.contains(e.target) &&
                triggerRef.current && !triggerRef.current.contains(e.target)) {
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
    }, [isOpen, onClose, triggerRef]);

    if (!isOpen) return null;

    const handleItemClick = (action) => {
        action?.();
        onClose();
    };

    const menuContent = (
        <div
            className={`instance-viewport__more-menu ${isFullscreen ? 'instance-viewport__more-menu--inline' : ''}`}
            ref={menuRef}
            style={isFullscreen ? {} : { top: position.top, right: position.right }}
        >
            <div className="instance-viewport__more-menu__section-header">Tools</div>
            <MenuItem
                icon="wrench"
                label="Instance Tools Panel"
                shortcut="T"
                onClick={() => handleItemClick(onOpenInstanceTools)}
            />
            <MenuItem
                icon="maximize2"
                label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                onClick={() => handleItemClick(onFullscreen)}
            />
            <MenuItem
                icon="glasses"
                label="Enter VR Mode"
                onClick={() => handleItemClick(onVRMode)}
            />

            <div className="instance-viewport__more-menu__divider" />

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

            <div className="instance-viewport__more-menu__divider" />

            <div className="instance-viewport__more-menu__section-header">View</div>
            <MenuItem
                icon="copy"
                label="Duplicate View"
                onClick={() => handleItemClick(onDuplicate)}
            />
            <MenuItem
                icon="bookmark"
                label="Add to Subset"
                onClick={() => handleItemClick(onAddToSubset)}
            />
            <MenuItem
                icon="share2"
                label="Share View"
                onClick={() => handleItemClick(onShare)}
            />

            <div className="instance-viewport__more-menu__divider" />

            <MenuItem
                icon="close"
                label="Close View"
                onClick={() => handleItemClick(onCloseView)}
            />
            {onDeleteView && (
                <MenuItem
                    icon="delete"
                    label="Delete View"
                    danger
                    onClick={() => handleItemClick(onDeleteView)}
                />
            )}
        </div>
    );

    if (isFullscreen) {
        return menuContent;
    }

    return createPortal(menuContent, document.body);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * InstanceHeader - Always-visible header bar
 *
 * Matches canvas-floating-architecture-prototype.jsx design:
 * - No wrench button (access tools via More menu)
 * - LiveIndicator for collaborators
 * - Focus button for focus mode
 * - Color-coded label badge with glow
 * - Responsive render modes
 */
export const InstanceHeader = memo(function InstanceHeader({
    displayName,
    fileTypeDisplayInfo,
    instanceColor,
    isFullscreen,
    isActive,
    isLoading,
    isInFocusMode = false,
    renderMode = 'full', // 'full' | 'compact' | 'thumbnail' | 'snapshot'
    collaborators = [],
    onFullscreen,
    onFocus,
    onClose,
    onTrash,
    onOpenInstanceTools,
    onVRMode,
    onResetCamera,
    onFitView,
    onDuplicate,
    onAddToSubset,
    onShare,
    instanceId,
    onShowToolbar,
    onHideToolbar,
}) {
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const moreButtonRef = useRef(null);

    // Get icon from file type display info (from manifest), fallback to 'box'
    const typeIconName = fileTypeDisplayInfo?.icon || 'box';
    const colorHex = instanceColor?.hex || '#60a5fa';
    const colorRgb = hexToRgb(colorHex);

    // Render mode flags
    const isCompact = renderMode === 'compact' || renderMode === 'thumbnail';
    const isMinimal = renderMode === 'thumbnail';
    const isSnapshot = renderMode === 'snapshot';

    // Don't render header in snapshot mode
    if (isSnapshot) return null;

    // Icon sizes based on render mode
    const iconSize = isMinimal ? 10 : (isCompact ? 11 : 12);
    const buttonSize = isMinimal ? 16 : (isCompact ? 18 : 20);

    return (
        <div
            className={`instance-viewport__header instance-viewport__header--${renderMode} ${isActive ? 'instance-viewport__header--active' : ''}`}
            style={{
                '--instance-color': colorHex,
                '--instance-color-rgb': colorRgb,
            }}
            onMouseEnter={onShowToolbar}
            onMouseLeave={onHideToolbar}
        >
            {/* Left section - Live indicator + Label Badge */}
            <div className="instance-viewport__header-left">
                {/* Live indicator for collaborators */}
                {collaborators.length > 0 && !isMinimal && (
                    <LiveIndicatorCompact count={collaborators.length} />
                )}

                {/* Label Badge - color-coded */}
                <div className="instance-viewport__label-badge">
                    <span className="instance-viewport__label-dot" />
                    <span className="instance-viewport__label-text">
                        {displayName || 'Loading...'}
                    </span>
                    {!isMinimal && (
                        <span className="instance-viewport__label-icon">
                            <Icon name={typeIconName} size={iconSize} />
                        </span>
                    )}
                </div>
            </div>

            {/* Right Controls */}
            <div className="instance-viewport__header-controls">
                {/* More Menu Button - hidden in minimal mode */}
                {!isMinimal && (
                    <div className="instance-viewport__more-wrapper" ref={moreButtonRef}>
                        <button
                            onClick={() => setShowMoreMenu(!showMoreMenu)}
                            className={`instance-viewport__header-button ${showMoreMenu ? 'active' : ''}`}
                            title="More options"
                            style={{ width: buttonSize, height: buttonSize }}
                        >
                            <Icon name="moreHorizontal" size={iconSize} />
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
                            onAddToSubset={onAddToSubset}
                            onShare={onShare}
                            onCloseView={onClose}
                            onDeleteView={onTrash}
                            triggerRef={moreButtonRef}
                            isFullscreen={isFullscreen}
                        />
                    </div>
                )}

                {/* Focus button - hidden when already in focus mode */}
                {!isInFocusMode && onFocus && (
                    <button
                        onClick={onFocus}
                        className="instance-viewport__header-button"
                        title="Focus Mode (F)"
                        style={{ width: buttonSize, height: buttonSize }}
                    >
                        <Icon name="focus" size={iconSize} />
                    </button>
                )}

                {/* Close button - ALWAYS visible */}
                <button
                    onClick={onClose}
                    className="instance-viewport__header-button instance-viewport__header-button--danger"
                    title="Close"
                    style={{ width: buttonSize, height: buttonSize }}
                >
                    <Icon name="close" size={iconSize} />
                </button>
            </div>
        </div>
    );
});

export default InstanceHeader;
