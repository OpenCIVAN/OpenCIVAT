// src/ui/react/components/workspace/InstanceViewport/InstanceToolbar/InstanceToolbar.jsx
// Top toolbar overlay for InstanceViewport
// Slides down on hover, contains tiered tool display

import React, { useState, useRef, memo } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { VRButton } from '@UI/react/components/molecules';
import { getTierConfig } from '../ToolbarTiers';
import { MoreMenu } from '../InstanceHeader';

// Note: Styles are in parent InstanceViewport.scss using instance-viewport__toolbar-overlay classes

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * InstanceToolbar - Overlay toolbar at top of content area
 * Slides down on hover, contains tiered tool display
 *
 * @param {Array} tools - Array of tool definitions from instance
 * @param {string} uiMode - Current UI mode for tier config
 * @param {boolean} visible - Whether toolbar is currently visible
 * @param {boolean} pinned - Whether toolbar is pinned open
 * @param {function} onTogglePin - Handler to toggle pin state
 * @param {string} openMenuId - Currently open menu ID
 * @param {function} setOpenMenuId - Handler to set open menu
 * @param {Object} dropdownPosition - Position for dropdown menus
 * @param {Object} menuButtonRefs - Refs for menu buttons
 * @param {function} onShowToolbar - Handler to show toolbar
 * @param {function} onHideToolbar - Handler to hide toolbar
 * @param {function} renderTool - Function to render individual tools
 * @param {function} onOpenInstanceTools - Handler to open instance tools panel
 * @param {boolean} instanceToolsTabActive - Whether instance tools tab is active
 * @param {string} instanceId - Instance ID for VR button
 * @param {boolean} isFullscreen - Whether viewport is fullscreen
 * @param {function} onFullscreen - Handler for fullscreen toggle
 * @param {function} onVRMode - Handler for VR mode
 * @param {function} onResetCamera - Handler for camera reset
 * @param {function} onFitView - Handler for fit view
 * @param {function} onDuplicate - Handler for duplicate view
 * @param {function} onClose - Handler for close view
 * @param {function} onTrash - Handler for trash view
 */
export const InstanceToolbar = memo(function InstanceToolbar({
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
    isFullscreen,
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
                            isFullscreen={isFullscreen}
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
});

export default InstanceToolbar;
