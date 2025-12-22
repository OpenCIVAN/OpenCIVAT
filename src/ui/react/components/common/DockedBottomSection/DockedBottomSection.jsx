/**
 * DockedBottomSection Component
 *
 * A resizable, collapsible section that docks to the bottom of its container.
 * Supports shared height state across multiple instances via sharedHeightKey.
 *
 * Features:
 * - Resizable height via drag handle (min: 100px, max: 400px by default)
 * - Collapsible to header-only state
 * - Shared height state via React Context
 * - ⌘E / Ctrl+E keyboard shortcut to expand to overlay
 *
 * @param {ReactNode} children - Content to render in the section
 * @param {string} context - Context identifier for the section
 * @param {string} sharedHeightKey - Key for sharing height state across instances
 * @param {function} onExpand - Callback when expand shortcut is triggered
 * @param {number} minHeight - Minimum height in pixels (default: 100)
 * @param {number} maxHeight - Maximum height in pixels (default: 400)
 * @param {string} title - Section title
 * @param {ReactNode} headerControls - Additional controls for the header
 */

import { useState, useCallback, useEffect, useRef, memo } from 'react';
import { IconChevronDown, IconChevronUp, IconMaximize, IconGripHorizontal } from '@UI/react/components/common/Icon';
import { useDockedHeight } from './DockedHeightContext';
import './DockedBottomSection.scss';

const HEADER_HEIGHT = 36;

export const DockedBottomSection = memo(function DockedBottomSection({
    children,
    context = 'default',
    sharedHeightKey = 'default',
    onExpand,
    minHeight = 100,
    maxHeight = 400,
    title = 'Preview',
    headerControls = null,
    className = '',
}) {
    const { height, isCollapsed, setHeight, toggleCollapsed } = useDockedHeight(
        sharedHeightKey,
        200
    );
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef(null);
    const dragStartY = useRef(0);
    const dragStartHeight = useRef(0);

    // Handle drag start
    const handleDragStart = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
        dragStartY.current = e.clientY;
        dragStartHeight.current = height;
    }, [height]);

    // Handle drag move
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e) => {
            const deltaY = dragStartY.current - e.clientY;
            const newHeight = Math.min(
                maxHeight,
                Math.max(minHeight, dragStartHeight.current + deltaY)
            );
            setHeight(newHeight);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, maxHeight, minHeight, setHeight]);

    // Handle keyboard shortcut (⌘E / Ctrl+E)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
                e.preventDefault();
                if (onExpand) {
                    onExpand();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onExpand]);

    const computedHeight = isCollapsed ? HEADER_HEIGHT : height + HEADER_HEIGHT;

    return (
        <div
            ref={containerRef}
            className={`docked-bottom-section ${isDragging ? 'docked-bottom-section--dragging' : ''} ${isCollapsed ? 'docked-bottom-section--collapsed' : ''} ${className}`}
            style={{ height: computedHeight }}
            data-context={context}
        >
            {/* Resize Handle */}
            {!isCollapsed && (
                <div
                    className="docked-bottom-section__resize-handle"
                    onMouseDown={handleDragStart}
                >
                    <IconGripHorizontal sx={{ fontSize: 16 }} />
                </div>
            )}

            {/* Header */}
            <div className="docked-bottom-section__header">
                <button
                    className="docked-bottom-section__collapse-btn"
                    onClick={toggleCollapsed}
                    aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
                >
                    {isCollapsed ? <IconChevronUp sx={{ fontSize: 16 }} /> : <IconChevronDown sx={{ fontSize: 16 }} />}
                </button>

                <span className="docked-bottom-section__title">{title}</span>

                <div className="docked-bottom-section__header-controls">
                    {headerControls}

                    {onExpand && (
                        <button
                            className="docked-bottom-section__expand-btn"
                            onClick={onExpand}
                            aria-label="Expand to overlay (⌘E)"
                            title="Expand to overlay (⌘E)"
                        >
                            <IconMaximize sx={{ fontSize: 14 }} />
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            {!isCollapsed && (
                <div
                    className="docked-bottom-section__content"
                    style={{ height: height }}
                >
                    {children}
                </div>
            )}
        </div>
    );
});

export default DockedBottomSection;