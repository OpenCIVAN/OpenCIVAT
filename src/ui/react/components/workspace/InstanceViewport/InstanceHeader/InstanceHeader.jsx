// src/ui/react/components/workspace/InstanceViewport/InstanceHeader/InstanceHeader.jsx
// Simplified, always-visible header bar for InstanceViewport
// Renders even before instance data loads to allow early close actions

import React, { useState, useRef, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@UI/react/components/atoms';
import { MenuItem } from '@UI/react/components/molecules';

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
 * This component ALWAYS renders with all its content visible.
 * No responsive hiding of elements - everything is always shown.
 * This ensures the header is usable at all times.
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
    onDuplicate,
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

    // Force inline styles to ensure visibility
    const forceVisible = {
        visibility: 'visible',
        opacity: 1,
        display: 'flex',
    };

    return (
        <div
            className={`instance-viewport__header ${isActive ? 'instance-viewport__header--active' : ''}`}
            style={{
                '--instance-color': colorHex,
                '--instance-color-rgb': colorRgb,
                ...forceVisible,
                alignItems: 'center',
                justifyContent: 'space-between',
            }}
            onMouseEnter={onShowToolbar}
            onMouseLeave={onHideToolbar}
        >
            {/* Left section - Instance Tools + Label */}
            <div className="instance-viewport__header-left" style={forceVisible}>
                <button
                    onClick={onOpenInstanceTools}
                    className="instance-viewport__header-button"
                    title="Instance Tools (T)"
                    style={forceVisible}
                >
                    <Icon name="wrench" size={12} />
                </button>

                {/* Instance Label */}
                <div className="instance-viewport__label" style={forceVisible}>
                    <span className="instance-viewport__label-icon" style={forceVisible}>
                        <Icon name={typeIconName} size={12} />
                    </span>
                    <span className="instance-viewport__label-text" style={{ visibility: 'visible', opacity: 1 }}>
                        {displayName || 'Loading...'}
                    </span>
                </div>
            </div>

            {/* Right Controls - Always visible */}
            <div className="instance-viewport__header-controls" style={forceVisible}>
                {/* More Menu Button */}
                <div className="instance-viewport__more-wrapper" ref={moreButtonRef} style={forceVisible}>
                    <button
                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                        className={`instance-viewport__header-button ${showMoreMenu ? 'active' : ''}`}
                        title="More options"
                        style={forceVisible}
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
                        onDuplicate={onDuplicate}
                        onCloseView={onClose}
                        onDeleteView={onTrash}
                        triggerRef={moreButtonRef}
                        isFullscreen={isFullscreen}
                    />
                </div>

                {/* Fullscreen button */}
                <button
                    onClick={onFullscreen}
                    className="instance-viewport__header-button"
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                    style={forceVisible}
                >
                    <Icon name={isFullscreen ? "minimize2" : "maximize2"} size={12} />
                </button>

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="instance-viewport__header-button instance-viewport__header-button--danger"
                    title="Close"
                    style={forceVisible}
                >
                    <Icon name="close" size={12} />
                </button>
            </div>
        </div>
    );
});

export default InstanceHeader;
