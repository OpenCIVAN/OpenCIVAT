// src/ui/react/components/workspace/InstanceViewport/InstanceToolbar.jsx
// Pinnable hover toolbar for instance viewports
//
// Based on canvas-floating-architecture-prototype.jsx
// Features:
// - Shows on hover (FULL mode only)
// - Can be pinned to stay visible
// - Contains pointer/pan/zoom/rotate tools

import React, { memo, useState, useCallback } from 'react';
import { IconButton, Icon } from '@UI/react/components/atoms';
import './InstanceToolbar.scss';

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

const TOOLS = [
    { id: 'pointer', icon: 'mouse-pointer', label: 'Select' },
    { id: 'pan', icon: 'hand', label: 'Pan' },
    { id: 'zoom', icon: 'zoom-in', label: 'Zoom' },
    { id: 'rotate', icon: 'rotate-3d', label: 'Rotate' },
];

// =============================================================================
// INSTANCE TOOLBAR
// =============================================================================

/**
 * InstanceToolbar - Pinnable floating toolbar for instance viewports
 *
 * Props:
 * - visible: Whether toolbar should be visible (from hover state)
 * - pinned: Whether toolbar is pinned (stays visible)
 * - activeTool: Currently active tool ID
 * - onSelectTool: Callback when tool is selected
 * - onTogglePin: Callback to toggle pin state
 * - position: 'top' | 'bottom' (default: 'top')
 */
export function InstanceToolbar({
    visible = false,
    pinned = false,
    activeTool = 'pointer',
    onSelectTool,
    onTogglePin,
    position = 'top',
}) {
    const isVisible = visible || pinned;

    return (
        <div
            className={`instance-toolbar instance-toolbar--${position} ${isVisible ? 'instance-toolbar--visible' : ''}`}
        >
            <div className="instance-toolbar__container">
                {/* Tools */}
                <div className="instance-toolbar__tools">
                    {TOOLS.map((tool) => (
                        <button
                            key={tool.id}
                            type="button"
                            className={`instance-toolbar__tool ${activeTool === tool.id ? 'instance-toolbar__tool--active' : ''}`}
                            onClick={() => onSelectTool?.(tool.id)}
                            title={tool.label}
                        >
                            <Icon name={tool.icon} size={14} />
                        </button>
                    ))}
                </div>

                {/* Separator */}
                <div className="instance-toolbar__separator" />

                {/* Pin button */}
                <button
                    type="button"
                    className={`instance-toolbar__pin ${pinned ? 'instance-toolbar__pin--active' : ''}`}
                    onClick={onTogglePin}
                    title={pinned ? 'Unpin toolbar' : 'Pin toolbar'}
                >
                    <Icon name={pinned ? 'pin-off' : 'pin'} size={12} />
                </button>
            </div>
        </div>
    );
}

// =============================================================================
// HOOK FOR MANAGING TOOLBAR STATE
// =============================================================================

/**
 * useInstanceToolbar - Hook to manage toolbar visibility and tool state
 *
 * Returns:
 * - toolbarVisible: Whether toolbar is visible (from hover)
 * - toolbarPinned: Whether toolbar is pinned
 * - activeTool: Currently selected tool
 * - setToolbarVisible: Function to set visibility
 * - setToolbarPinned: Function to set pin state
 * - setActiveTool: Function to set active tool
 * - handleMouseEnter: Handler for mouse enter
 * - handleMouseLeave: Handler for mouse leave
 */
export function useInstanceToolbar(initialTool = 'pointer') {
    const [toolbarVisible, setToolbarVisible] = useState(false);
    const [toolbarPinned, setToolbarPinned] = useState(false);
    const [activeTool, setActiveTool] = useState(initialTool);

    const handleMouseEnter = useCallback(() => {
        setToolbarVisible(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setToolbarVisible(false);
    }, []);

    const togglePin = useCallback(() => {
        setToolbarPinned(prev => !prev);
    }, []);

    return {
        toolbarVisible,
        toolbarPinned,
        activeTool,
        setToolbarVisible,
        setToolbarPinned,
        setActiveTool,
        togglePin,
        handleMouseEnter,
        handleMouseLeave,
    };
}

export default memo(InstanceToolbar);
