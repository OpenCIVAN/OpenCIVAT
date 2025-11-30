// src/ui/react/components/common/PortalPopover/PortalPopover.jsx
// Renders popover content at document.body level to escape parent overflow constraints.

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './PortalPopover.scss';

/**
 * PortalPopover - Renders popover content at document.body level
 * to escape parent overflow constraints.
 *
 * @param {ReactNode} children - Popover content
 * @param {React.RefObject} anchorRef - Reference to the trigger element
 * @param {boolean} isOpen - Whether popover is visible
 * @param {string} position - 'above' | 'below' (default: 'above')
 * @param {string} align - 'start' | 'center' | 'end' (default: 'center')
 * @param {Function} onClose - Called when clicking outside
 * @param {string} className - Additional CSS classes
 */
export function PortalPopover({
    children,
    anchorRef,
    isOpen,
    position = 'above',
    align = 'center',
    onClose,
    className = '',
}) {
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const [actualPosition, setActualPosition] = useState(position);
    const popoverRef = useRef(null);

    // Calculate position based on anchor element
    useEffect(() => {
        if (!isOpen || !anchorRef?.current) return;

        const updatePosition = () => {
            const anchor = anchorRef.current.getBoundingClientRect();
            const popover = popoverRef.current?.getBoundingClientRect();
            const popoverHeight = popover?.height || 200;
            const popoverWidth = popover?.width || 200;

            let top, left;
            let finalPosition = position;

            // Vertical positioning
            if (position === 'above') {
                top = anchor.top - popoverHeight - 8;
                // Flip to below if not enough space above
                if (top < 8) {
                    top = anchor.bottom + 8;
                    finalPosition = 'below';
                }
            } else {
                top = anchor.bottom + 8;
                // Flip to above if not enough space below
                if (top + popoverHeight > window.innerHeight - 8) {
                    top = anchor.top - popoverHeight - 8;
                    finalPosition = 'above';
                }
            }

            // Horizontal alignment
            if (align === 'start') {
                left = anchor.left;
            } else if (align === 'end') {
                left = anchor.right - popoverWidth;
            } else {
                left = anchor.left + (anchor.width / 2) - (popoverWidth / 2);
            }

            // Keep within viewport
            left = Math.max(8, Math.min(left, window.innerWidth - popoverWidth - 8));
            top = Math.max(8, top);

            setCoords({ top, left });
            setActualPosition(finalPosition);
        };

        updatePosition();
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen, anchorRef, position, align]);

    // Handle click outside
    useEffect(() => {
        if (!isOpen || !onClose) return;

        const handleClickOutside = (e) => {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(e.target) &&
                anchorRef?.current &&
                !anchorRef.current.contains(e.target)
            ) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose, anchorRef]);

    if (!isOpen) return null;

    return createPortal(
        <div
            ref={popoverRef}
            className={`portal-popover portal-popover--${actualPosition} ${className}`}
            style={{
                position: 'fixed',
                top: coords.top,
                left: coords.left,
                zIndex: 99999,
            }}
        >
            {children}
        </div>,
        document.body
    );
}

export default PortalPopover;