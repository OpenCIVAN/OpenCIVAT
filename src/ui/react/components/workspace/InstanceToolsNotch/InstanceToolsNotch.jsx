// src/ui/react/components/workspace/InstanceToolsNotch/InstanceToolsNotch.jsx
// Full-width toolbar bar for instance-specific tools
//
// Sits above the canvas toolbar, displays tools for the active instance.
// Layout: [View Name] | [Tools...] | [More]
// Color-coded left accent matches the active view's accent color.

import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@UI/react/components/atoms';
import { hexToRgbString } from '@UI/react/utils/canvasColors.js';

import './InstanceToolsNotch.scss';

// =============================================================================
// TOOL MENU DROPDOWN
// =============================================================================

function ToolMenu({ isOpen, onClose, options, onSelect, triggerRef, accentColor }) {
    const menuRef = useRef(null);
    const [position, setPosition] = useState({ bottom: 0, left: 0 });

    useEffect(() => {
        if (!isOpen || !triggerRef?.current) return;

        const updatePosition = () => {
            const rect = triggerRef.current.getBoundingClientRect();
            setPosition({
                bottom: window.innerHeight - rect.top + 8,
                left: rect.left + rect.width / 2,
            });
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        return () => window.removeEventListener('resize', updatePosition);
    }, [isOpen, triggerRef]);

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

    if (!isOpen || !options?.length) return null;

    const handleSelect = (option) => {
        // Call onClick directly if the option has it
        if (option.onClick) {
            option.onClick();
        }
        onSelect?.(option);
        onClose();
    };

    // Handle camera-grid view selection
    const handleCameraViewSelect = (gridOption, viewId) => {
        if (gridOption.onViewSelect) {
            gridOption.onViewSelect(viewId);
        }
        onClose();
    };

    return createPortal(
        <div
            className="instance-tools-notch__menu"
            ref={menuRef}
            style={{
                '--notch-color': accentColor,
                '--notch-color-rgb': hexToRgbString(accentColor),
                bottom: position.bottom,
                left: position.left,
                transform: 'translateX(-50%)',
            }}
        >
            {options.map((option, index) => {
                // Handle separator
                if (option.type === 'separator') {
                    return <div key={`sep-${index}`} className="instance-tools-notch__menu-divider" />;
                }

                // Handle camera-grid (compact view buttons)
                if (option.type === 'camera-grid' && option.views) {
                    return (
                        <div key={option.id || index} className="instance-tools-notch__camera-grid">
                            {option.views.map((view) => (
                                <button
                                    key={view.id}
                                    className={`instance-tools-notch__camera-btn ${view.special ? 'special' : ''}`}
                                    onClick={() => handleCameraViewSelect(option, view.id)}
                                    disabled={option.disabled}
                                    title={view.label}
                                >
                                    {view.label}
                                </button>
                            ))}
                        </div>
                    );
                }

                // Regular menu item
                return (
                    <button
                        key={option.id || index}
                        className={`instance-tools-notch__menu-item ${option.active ? 'active' : ''}`}
                        onClick={() => handleSelect(option)}
                        disabled={option.disabled}
                    >
                        {option.icon && <Icon name={option.icon} size={14} />}
                        <span>{option.label}</span>
                        {option.shortcut && (
                            <span className="instance-tools-notch__menu-shortcut">{option.shortcut}</span>
                        )}
                    </button>
                );
            })}
        </div>,
        document.body
    );
}

// =============================================================================
// TOOL BUTTON
// =============================================================================

function ToolButton({ tool, accentColor, onSelect }) {
    const [showMenu, setShowMenu] = useState(false);
    const buttonRef = useRef(null);

    const hasMenu = tool.type === 'menu' && tool.options?.length > 0;

    const handleClick = () => {
        if (hasMenu) {
            setShowMenu(!showMenu);
        } else {
            onSelect?.(tool);
        }
    };

    return (
        <>
            <button
                ref={buttonRef}
                className={`instance-tools-notch__tool ${tool.active ? 'active' : ''} ${hasMenu && showMenu ? 'menu-open' : ''}`}
                onClick={handleClick}
                disabled={tool.disabled}
                title={tool.description || tool.label}
            >
                <Icon name={tool.icon || 'box'} size={16} />
                {hasMenu && (
                    <Icon name="chevronUp" size={10} className="instance-tools-notch__tool-chevron" />
                )}
            </button>
            {hasMenu && (
                <ToolMenu
                    isOpen={showMenu}
                    onClose={() => setShowMenu(false)}
                    options={tool.options}
                    onSelect={(option) => onSelect?.({ ...tool, selectedOption: option })}
                    triggerRef={buttonRef}
                    accentColor={accentColor}
                />
            )}
        </>
    );
}

// =============================================================================
// TOOL GROUP
// =============================================================================

function ToolGroup({ tools, accentColor, onSelectTool }) {
    return (
        <div className="instance-tools-notch__group">
            {tools.map((tool, index) => {
                if (tool.type === 'separator') {
                    return <div key={`sep-${index}`} className="instance-tools-notch__separator" />;
                }
                return (
                    <ToolButton
                        key={tool.id || index}
                        tool={tool}
                        accentColor={accentColor}
                        onSelect={onSelectTool}
                    />
                );
            })}
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * InstanceToolsNotch - Full-width toolbar for active instance tools
 *
 * Layout: [View Indicator] | [Nav Controls] | [Tools...] | [More Button]
 *
 * @param {Object} props
 * @param {Object} props.activeView - The currently active view (null if none)
 * @param {string} props.activeView.id - View ID
 * @param {string} props.activeView.name - Display name
 * @param {string} props.activeView.color - Accent color (hex)
 * @param {Array} props.tools - Array of tool objects or tool groups
 * @param {function} props.onSelectTool - Callback when tool is selected
 * @param {function} props.onOpenFullTools - Callback to open full Instance Tools panel
 * @param {number} props.zoomLevel - Current zoom level percentage
 * @param {function} props.onZoomIn - Callback to zoom in
 * @param {function} props.onZoomOut - Callback to zoom out
 * @param {function} props.onFit - Callback to fit view
 * @param {function} props.onResetCamera - Callback to reset camera
 * @param {'top'|'bottom'} props.accentPosition - Position of color accent bar (default: 'top')
 * @param {string} props.className - Additional CSS class
 */
export const InstanceToolsNotch = memo(function InstanceToolsNotch({
    activeView,
    tools = [],
    onSelectTool,
    onOpenFullTools,
    zoomLevel = 100,
    onZoomIn,
    onZoomOut,
    onFit,
    onResetCamera,
    accentPosition = 'top', // 'top' or 'bottom' - position of color accent bar
    className = '',
}) {
    const accentColor = activeView?.color || '#60a5fa';
    const colorRgb = hexToRgbString(accentColor);
    const hasTools = tools.length > 0;
    const isActive = !!activeView;

    // Flatten tools if they're grouped
    const flatTools = tools.flatMap(item =>
        Array.isArray(item) ? item : [item]
    );

    // Check if tools are in groups (arrays of arrays)
    const isGrouped = tools.length > 0 && Array.isArray(tools[0]);

    return (
        <div
            className={`instance-tools-notch ${isActive ? 'instance-tools-notch--active' : 'instance-tools-notch--inactive'} instance-tools-notch--accent-${accentPosition} ${className}`}
            style={{
                '--notch-color': accentColor,
                '--notch-color-rgb': colorRgb,
            }}
        >
            <div className="instance-tools-notch__container">
                {/* Left: View indicator */}
                <div className="instance-tools-notch__view-indicator">
                    <span
                        className="instance-tools-notch__view-dot"
                        style={{ background: isActive ? accentColor : undefined }}
                    />
                    <span className="instance-tools-notch__view-name">
                        {isActive ? activeView.name : 'No view selected'}
                    </span>
                    {!isActive && (
                        <span className="instance-tools-notch__hint">
                            — Click a view to see tools
                        </span>
                    )}
                </div>

                {/* Navigation controls - zoom, fit, reset */}
                {isActive && (
                    <>
                        <div className="instance-tools-notch__divider" />
                        <div className="instance-tools-notch__nav-controls">
                            <button
                                className="instance-tools-notch__tool"
                                onClick={onZoomOut}
                                title="Zoom out"
                            >
                                <Icon name="zoomOut" size={16} />
                            </button>
                            <span className="instance-tools-notch__zoom-display">
                                {Math.round(zoomLevel)}%
                            </span>
                            <button
                                className="instance-tools-notch__tool"
                                onClick={onZoomIn}
                                title="Zoom in"
                            >
                                <Icon name="zoomIn" size={16} />
                            </button>
                            <button
                                className="instance-tools-notch__tool"
                                onClick={onFit}
                                title="Fit to view"
                            >
                                <Icon name="scan" size={16} />
                            </button>
                            <button
                                className="instance-tools-notch__tool"
                                onClick={onResetCamera}
                                title="Reset camera"
                            >
                                <Icon name="rotateCcw" size={16} />
                            </button>
                        </div>
                    </>
                )}

                {/* Center: Instance-specific tools */}
                {isActive && hasTools && (
                    <>
                        <div className="instance-tools-notch__divider" />
                        <div className="instance-tools-notch__tools">
                            {isGrouped ? (
                                tools.map((group, groupIndex) => (
                                    <React.Fragment key={`group-${groupIndex}`}>
                                        {groupIndex > 0 && (
                                            <div className="instance-tools-notch__divider" />
                                        )}
                                        <ToolGroup
                                            tools={group}
                                            accentColor={accentColor}
                                            onSelectTool={onSelectTool}
                                        />
                                    </React.Fragment>
                                ))
                            ) : (
                                <ToolGroup
                                    tools={flatTools}
                                    accentColor={accentColor}
                                    onSelectTool={onSelectTool}
                                />
                            )}
                        </div>
                    </>
                )}

                {/* Right: Actions */}
                {isActive && onOpenFullTools && (
                    <div className="instance-tools-notch__actions">
                        <div className="instance-tools-notch__divider" />
                        <button
                            className="instance-tools-notch__more-btn"
                            onClick={onOpenFullTools}
                            title="Open full Instance Tools panel"
                        >
                            <Icon name="moreHorizontal" size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});

export default InstanceToolsNotch;
