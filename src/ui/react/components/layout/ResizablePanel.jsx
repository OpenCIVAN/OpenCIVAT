// src/ui/react/components/layout/ResizablePanel.jsx
// Updated: Passes isCollapsed and onToggle to children
// Children are responsible for rendering both collapsed and expanded states

import React from 'react';
import { useResizeHandler, PANEL_CONSTRAINTS } from '@UI/react/components/layout/ThreeEdgeLayout.logic';
import '@UI/react/components/layout/ThreeEdgeLayout.scss';

/**
 * ResizablePanel - Generic panel wrapper with resize functionality
 * 
 * Key Change: Children receive isCollapsed and onToggle props
 * and are responsible for rendering their own collapsed state.
 * 
 * @param {Object} props
 * @param {string} props.side - 'left' or 'right'
 * @param {boolean} props.isOpen - Panel open/closed state
 * @param {Function} props.onToggle - Toggle callback
 * @param {number} props.width - Current panel width
 * @param {Function} props.onWidthChange - Width change callback
 * @param {React.ReactNode} props.children - Panel content (receives isCollapsed, onToggle)
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
            className={`resizable-panel resizable-panel--${side} ${!isOpen ? 'resizable-panel--collapsed' : ''}`}
            style={{
                width: `${currentWidth}px`,
                flexShrink: 0
            }}
        >
            {/* Panel Content - Clone children with isCollapsed and onToggle props */}
            <div className="resizable-panel__content">
                {React.cloneElement(children, {
                    isCollapsed: !isOpen,
                    onToggle: onToggle,
                    side: side
                })}
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
 */
function PanelDivider({ side, isResizing, onMouseDown }) {
    return (
        <div
            className={`panel-divider panel-divider--${side} ${isResizing ? 'panel-divider--active' : ''}`}
            onMouseDown={onMouseDown}
        >
            <div className="panel-divider__handle" />
        </div>
    );
}