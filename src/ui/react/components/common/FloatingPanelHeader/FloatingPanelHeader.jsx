// src/ui/react/components/common/FloatingPanelHeader/FloatingPanelHeader.jsx
// Reusable header component for floating panels
// Provides consistent styling across floating panels

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/common/Icon';
import './FloatingPanelHeader.scss';

/**
 * FloatingPanelHeader - Consistent header for floating panels
 *
 * @param {string} title - Panel title (optional, won't show if not provided)
 * @param {string} icon - Icon name (optional)
 * @param {string} color - Accent color (blue, purple, teal, amber, etc.)
 * @param {boolean} showDragHandle - Show the drag grip handle
 * @param {boolean} isMinimized - Whether panel is currently minimized (for toggle button)
 * @param {function} onToggleMinimize - Toggle minimize/expand (optional)
 * @param {function} onMinimize - Minimize button handler (optional, simpler than toggle)
 * @param {function} onDock - Dock button handler (optional)
 * @param {function} onClose - Close button handler
 * @param {function} onMouseDown - Mouse down handler for dragging
 * @param {React.ReactNode} children - Additional content to render in header
 */
export const FloatingPanelHeader = memo(function FloatingPanelHeader({
    title,
    icon,
    color = 'blue',
    showDragHandle = true,
    isMinimized = false,
    onToggleMinimize,
    onMinimize,
    onDock,
    onClose,
    onMouseDown,
    children,
}) {
    return (
        <div
            className="floating-panel-header"
            data-color={color}
            onMouseDown={onMouseDown}
        >
            {showDragHandle && (
                <div className="floating-panel-header__drag-handle">
                    <Icon name="gripVertical" size={14} />
                </div>
            )}

            {icon && (
                <div className="floating-panel-header__icon">
                    <Icon name={icon} size={16} />
                </div>
            )}

            {title && (
                <div className="floating-panel-header__title">{title}</div>
            )}

            {/* Spacer to push controls to the right */}
            <div className="floating-panel-header__spacer" />

            {/* Custom content */}
            {children}

            {/* Control buttons */}
            <div className="floating-panel-header__controls">
                {/* Toggle minimize (expand/collapse) */}
                {onToggleMinimize && (
                    <button
                        className="floating-panel-header__btn"
                        onClick={onToggleMinimize}
                        title={isMinimized ? 'Expand' : 'Minimize'}
                    >
                        <Icon name={isMinimized ? 'maximize2' : 'minus'} size={14} />
                    </button>
                )}
                {/* Simple minimize (just minimize, no toggle) */}
                {onMinimize && !onToggleMinimize && (
                    <button
                        className="floating-panel-header__btn"
                        onClick={onMinimize}
                        title="Minimize"
                    >
                        <Icon name="minus" size={14} />
                    </button>
                )}
                {onDock && (
                    <button
                        className="floating-panel-header__btn"
                        onClick={onDock}
                        title="Dock panel"
                    >
                        <Icon name="pinOff" size={14} />
                    </button>
                )}
                {onClose && (
                    <button
                        className="floating-panel-header__btn floating-panel-header__btn--close"
                        onClick={onClose}
                        title="Close"
                    >
                        <Icon name="close" size={14} />
                    </button>
                )}
            </div>
        </div>
    );
});

export default FloatingPanelHeader;
