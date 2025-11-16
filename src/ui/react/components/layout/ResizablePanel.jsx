// src/ui/react/components/layout/ResizablePanel.jsx
// Generic resizable panel wrapper component
// Handles collapse/expand, resize, and activity bar display

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useResizeHandler, PANEL_CONSTRAINTS } from '@UI/react/components/layout/ThreeEdgeLayout.logic';
import '@UI/react/components/layout/layout.scss';

/**
 * ResizablePanel - Generic panel wrapper with resize and collapse functionality
 * 
 * Features:
 * - Collapses to 48px activity bar
 * - Drag-to-resize from edge
 * - Smooth animations
 * - Visual feedback on hover/drag
 * 
 * @param {Object} props
 * @param {string} props.side - 'left' or 'right'
 * @param {boolean} props.isOpen - Panel open/closed state
 * @param {Function} props.onToggle - Toggle callback
 * @param {number} props.width - Current panel width
 * @param {Function} props.onWidthChange - Width change callback
 * @param {React.ReactNode} props.children - Panel content
 */
export function ResizablePanel({
    side,
    isOpen,
    onToggle,
    width,
    onWidthChange,
    children
}) {
    const { isResizing, handleMouseDown } = useResizeHandler(side, onWidthChange);

    const collapsedWidth = PANEL_CONSTRAINTS[side].collapsed;
    const currentWidth = isOpen ? width : collapsedWidth;

    const resizeHandlePosition = side === 'left' ? 'right' : 'left';

    return (
        <div
            className={`resizable-panel resizable-panel--${side}`}
            style={{
                width: `${currentWidth}px`,
                flexShrink: 0
            }}
        >
            {/* Panel Content */}
            <div className="resizable-panel__content">
                {isOpen ? (
                    <>
                        {/* Expanded: Show full content */}
                        {children}
                    </>
                ) : (
                    <>
                        {/* Collapsed: Show activity bar */}
                        <ActivityBar side={side} onExpand={onToggle} />
                    </>
                )}
            </div>

            {/* Resize Handle (only when expanded) */}
            {isOpen && (
                <PanelDivider
                    side={resizeHandlePosition}
                    isResizing={isResizing}
                    onMouseDown={handleMouseDown}
                />
            )}
        </div>
    );
}

/**
 * PanelDivider - Draggable resize handle
 * 
 * @param {Object} props
 * @param {string} props.side - 'left' or 'right' (position of handle)
 * @param {boolean} props.isResizing - Currently resizing state
 * @param {Function} props.onMouseDown - Mouse down handler
 */
function PanelDivider({ side, isResizing, onMouseDown }) {
    return (
        <div
            className={`panel-divider panel-divider--${side} ${isResizing ? 'panel-divider--active' : ''}`}
            onMouseDown={onMouseDown}
        >
            {/* Visual indicator (optional) */}
            <div className="panel-divider__handle" />
        </div>
    );
}

/**
 * ActivityBar - Collapsed panel state with expand button
 * 
 * Shows when panel is collapsed. Displays icon and expand button.
 * Child components should provide their own activity bar content
 * via a prop or context.
 * 
 * @param {Object} props
 * @param {string} props.side - 'left' or 'right'
 * @param {Function} props.onExpand - Expand callback
 */
function ActivityBar({ side, onExpand }) {
    const ExpandIcon = side === 'left' ? ChevronRight : ChevronLeft;

    return (
        <div className="activity-bar">
            <div className="activity-bar__content">
                {/* Content provided by child components via context/props */}
                {/* For now, just show expand button */}
            </div>

            <button
                className="activity-bar__expand"
                onClick={onExpand}
                title={`Expand ${side} panel`}
            >
                <ExpandIcon size={20} />
            </button>
        </div>
    );
}

/**
 * Helper component for panel headers with collapse button
 * Child components can use this for consistent header styling
 */
export function PanelHeader({ title, side, onCollapse, children }) {
    const CollapseIcon = side === 'left' ? ChevronLeft : ChevronRight;

    return (
        <div className="panel-header">
            <div className="panel-header__content">
                {title && <h3 className="panel-header__title">{title}</h3>}
                {children}
            </div>

            {onCollapse && (
                <button
                    className="panel-header__collapse"
                    onClick={onCollapse}
                    title={`Collapse ${side} panel`}
                >
                    <CollapseIcon size={16} />
                </button>
            )}
        </div>
    );
}