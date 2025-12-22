// src/ui/react/components/workspace/Canvas/CanvasCell/CanvasCellHeader.jsx
// Lightweight header component for canvas cells - renders independently of InstanceViewport
//
// PURPOSE:
// Keep the instance header (name + control buttons) visible and functional even when
// a view is COLD (thumbnail-only, no InstanceViewport). This gives the illusion that
// the view is "there" even without mounting a full instance handler.
//
// ARCHITECTURE:
// - Uses useViewMetadata hook (reads from ViewConfigurationManager, not instance handlers)
// - Does NOT import or depend on any instance handler code (VTK, image, etc.)
// - Can render without InstanceViewport or any rendering context mounted
//
// FEATURES:
// - displayName from useViewMetadata hook (reads from workspace state)
// - Remove from canvas button (removes placement only, keeps view config)
// - Trash/delete button (moves view config to Recently Deleted)
// - Optional kebab menu for additional options

import React, { memo, useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Trash2,
    MoreHorizontal,
    Wrench,
    Maximize2,
    Copy,
    Camera,
    Bookmark,
    Link,
} from 'lucide-react';
import { useViewMetadata } from '@UI/react/hooks/useViewMetadata.js';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert hex color to RGB string for rgba() usage in CSS
 */
const hexToRgb = (hex) => {
    if (!hex) return '96, 165, 250';
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
        : '96, 165, 250';
};

// ============================================================================
// MORE MENU COMPONENT
// ============================================================================

/**
 * CanvasCellMenu - Dropdown menu for cold view actions
 * Subset of InstanceViewport's MoreMenu (no instance-dependent actions)
 */
function CanvasCellMenu({
    isOpen,
    onClose,
    onRemove,
    onTrash,
    onDuplicate,
    onCaptureThumbnail,
    onOpenInIsolation,
    triggerRef,
    viewId,
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
            className="canvas-cell-header__menu"
            ref={menuRef}
            style={{ top: position.top, right: position.right }}
        >
            {/* View Actions */}
            <div className="canvas-cell-header__menu-section">View</div>

            {onOpenInIsolation && (
                <button
                    className="canvas-cell-header__menu-item"
                    onClick={() => handleItemClick(onOpenInIsolation)}
                >
                    <Maximize2 size={14} />
                    <span>Open in Isolation</span>
                </button>
            )}

            {onDuplicate && (
                <button
                    className="canvas-cell-header__menu-item"
                    onClick={() => handleItemClick(onDuplicate)}
                >
                    <Copy size={14} />
                    <span>Duplicate View</span>
                </button>
            )}

            <div className="canvas-cell-header__menu-divider" />

            {/* Danger Zone */}
            <button
                className="canvas-cell-header__menu-item"
                onClick={() => handleItemClick(onRemove)}
            >
                <X size={14} />
                <span>Remove from Canvas</span>
            </button>

            {onTrash && (
                <button
                    className="canvas-cell-header__menu-item canvas-cell-header__menu-item--danger"
                    onClick={() => handleItemClick(onTrash)}
                >
                    <Trash2 size={14} />
                    <span>Delete View</span>
                </button>
            )}
        </div>,
        document.body
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * CanvasCellHeader - Lightweight header for canvas cells (works without instance handler)
 *
 * Renders the view name and control buttons even when the view is in COLD mode
 * (thumbnail-only, no InstanceViewport mounted).
 *
 * @param {Object} props
 * @param {string} props.viewId - The view configuration ID
 * @param {function} props.onRemove - Called when removing view from canvas (keeps view config)
 * @param {function} props.onTrash - Called when trashing the view (moves to Recently Deleted)
 * @param {function} props.onActivate - Called when user clicks to activate (mount InstanceViewport)
 * @param {boolean} props.isCold - Whether the view is in cold mode (no instance mounted)
 * @param {string} props.headerMode - 'full' | 'medium' | 'small' based on cell width
 * @param {string} props.fallbackColor - Fallback color hex (from placement content) if hook returns no color
 */
export const CanvasCellHeader = memo(function CanvasCellHeader({
    viewId,
    onRemove,
    onTrash,
    onActivate,
    onDuplicate,
    onOpenInIsolation,
    isCold = true,
    headerMode = 'full',
    fallbackColor = null,
}) {
    const [showMenu, setShowMenu] = useState(false);
    const menuButtonRef = useRef(null);

    // Get metadata from workspace state (no instance handler required)
    const { displayName, color, isLoading } = useViewMetadata(viewId);

    // Use color from hook, fallback to prop, then default to blue
    const colorHex = color?.hex || fallbackColor || '#60a5fa';
    const colorRgb = hexToRgb(colorHex);

    // Handle clicks on header (to activate view)
    const handleHeaderClick = useCallback((e) => {
        // Don't activate if clicking a button
        if (e.target.closest('button')) return;
        onActivate?.();
    }, [onActivate]);

    return (
        <div
            className={`canvas-cell-header canvas-cell-header--${headerMode} ${isCold ? 'canvas-cell-header--cold' : ''}`}
            style={{
                '--instance-color': colorHex,
                '--instance-color-rgb': colorRgb,
            }}
            onClick={handleHeaderClick}
        >
            {/* Left section - Wrench + Label */}
            <div className="canvas-cell-header__left">
                {/* Wrench button - decorative in cold mode, activates view on click */}
                {headerMode !== 'small' && (
                    <button
                        className="canvas-cell-header__button canvas-cell-header__wrench"
                        title={isCold ? 'Click to activate view' : 'Instance Tools'}
                        onClick={(e) => {
                            e.stopPropagation();
                            onActivate?.();
                        }}
                        disabled={false}
                    >
                        <Wrench size={12} />
                    </button>
                )}

                {/* Instance Label Badge */}
                <div
                    className="canvas-cell-header__label"
                    style={{
                        '--instance-color': colorHex,
                        '--instance-color-rgb': colorRgb,
                    }}
                >
                    <div className="canvas-cell-header__label-dot" />
                    <span className="canvas-cell-header__label-text">
                        {isLoading ? 'Loading...' : displayName}
                    </span>
                </div>
            </div>

            {/* Right Controls */}
            <div className="canvas-cell-header__controls">
                {/* More Menu Button */}
                <div className="canvas-cell-header__menu-wrapper" ref={menuButtonRef}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(!showMenu);
                        }}
                        className={`canvas-cell-header__button ${showMenu ? 'active' : ''}`}
                        title="More options"
                    >
                        <MoreHorizontal size={12} />
                    </button>
                    <CanvasCellMenu
                        isOpen={showMenu}
                        onClose={() => setShowMenu(false)}
                        onRemove={onRemove}
                        onTrash={onTrash}
                        onDuplicate={onDuplicate}
                        onOpenInIsolation={onOpenInIsolation}
                        triggerRef={menuButtonRef}
                        viewId={viewId}
                    />
                </div>

                {/* Close button - Always visible, removes from canvas */}
                {onRemove && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove();
                        }}
                        className="canvas-cell-header__button"
                        title="Remove from canvas (view stays in Datasets list)"
                    >
                        <X size={12} />
                    </button>
                )}
            </div>
        </div>
    );
});

export default CanvasCellHeader;