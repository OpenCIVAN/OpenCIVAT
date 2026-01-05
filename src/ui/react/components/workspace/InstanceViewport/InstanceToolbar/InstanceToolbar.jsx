// src/ui/react/components/workspace/InstanceViewport/InstanceToolbar/InstanceToolbar.jsx
// Simplified toolbar for InstanceViewport
// Shows when viewport is focused OR when pinned

import React, { useState, useRef, memo } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { VRButton } from '@UI/react/components/molecules';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * InstanceToolbar - Tool overlay at top of content area
 *
 * Visibility rules:
 * - Shows when viewport is focused (isFocused prop)
 * - Shows when pinned (pinned prop)
 * - Hides otherwise
 *
 * No complex hover states - just focused or pinned.
 */
export const InstanceToolbar = memo(function InstanceToolbar({
    tools,
    isFocused,
    pinned,
    onTogglePin,
    renderTool,
    onOpenInstanceTools,
    instanceId,
    isFullscreen,
    onFullscreen,
    onVRMode,
    onResetCamera,
    onFitView,
    onDuplicate,
    onClose,
    onTrash,
}) {
    // Toolbar is visible when focused OR pinned
    const isVisible = isFocused || pinned;

    // Inline styles to force visibility when active
    const overlayStyle = isVisible ? {
        opacity: 1,
        visibility: 'visible',
        pointerEvents: 'auto',
        transform: 'translateY(34px)',
    } : {};

    return (
        <div
            className={`instance-viewport__toolbar-overlay ${isVisible ? 'instance-viewport__toolbar-overlay--visible' : ''} ${pinned ? 'instance-viewport__toolbar-overlay--pinned' : ''}`}
            style={overlayStyle}
        >
            <div className="instance-toolbar">
                {/* Tool Groups */}
                <div className="instance-toolbar__groups">
                    {tools.map((tool, index) => renderTool(tool, index))}
                </div>

                {/* Global Tools */}
                <div className="instance-toolbar__global-tools">
                    <div className="instance-toolbar__separator" />
                    <button
                        className="instance-toolbar__tool-button"
                        onClick={onOpenInstanceTools}
                        title="Instance Tools (T)"
                    >
                        <Icon name="wrench" size={16} />
                    </button>
                    <VRButton instanceId={instanceId} size="sm" />
                </div>

                {/* Pin Button */}
                <button
                    className={`instance-toolbar__pin-button ${pinned ? 'active' : ''}`}
                    onClick={onTogglePin}
                    title={pinned ? 'Unpin toolbar' : 'Pin toolbar (stays visible)'}
                >
                    <Icon name={pinned ? 'pinOff' : 'pin'} size={14} />
                </button>
            </div>
        </div>
    );
});

export default InstanceToolbar;
