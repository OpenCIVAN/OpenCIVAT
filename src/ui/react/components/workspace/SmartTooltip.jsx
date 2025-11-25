// src/ui/react/components/workspace/SmartTooltip.jsx
// Tooltip that automatically positions itself to stay within viewport

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
// import './SmartTooltip.css';

/**
 * Smart tooltip that positions itself to avoid viewport edges
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Tooltip content
 * @param {React.RefObject} props.targetRef - Ref to the button/element that triggers tooltip
 * @param {boolean} props.show - Whether to show tooltip
 * @param {number} props.delay - Delay before showing (ms)
 */
export function SmartTooltip({ children, targetRef, show, delay = 400 }) {
    const tooltipRef = useRef(null);
    const [position, setPosition] = useState({ x: 0, y: 0, placement: 'top' });
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef(null);

    useEffect(() => {
        if (show) {
            // Start delay timer
            timeoutRef.current = setTimeout(() => {
                setIsVisible(true);
            }, delay);
        } else {
            // Clear timer and hide
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            setIsVisible(false);
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [show, delay]);

    useEffect(() => {
        if (!isVisible || !targetRef.current || !tooltipRef.current) return;

        const calculatePosition = () => {
            const target = targetRef.current.getBoundingClientRect();
            const tooltip = tooltipRef.current.getBoundingClientRect();

            const viewport = {
                width: window.innerWidth,
                height: window.innerHeight
            };

            const gap = 8; // Space between button and tooltip
            const edgePadding = 10; // Minimum distance from viewport edge

            let x = 0;
            let y = 0;
            let placement = 'top'; // top, bottom, left, right

            // Try to place above (preferred)
            y = target.top - tooltip.height - gap;
            x = target.left + (target.width / 2) - (tooltip.width / 2);

            // Check if tooltip fits above
            if (y < edgePadding) {
                // Not enough space above, try below
                y = target.bottom + gap;
                placement = 'bottom';

                // If still doesn't fit, try sides
                if (y + tooltip.height > viewport.height - edgePadding) {
                    // Try right side
                    x = target.right + gap;
                    y = target.top + (target.height / 2) - (tooltip.height / 2);
                    placement = 'right';

                    // If doesn't fit on right, try left
                    if (x + tooltip.width > viewport.width - edgePadding) {
                        x = target.left - tooltip.width - gap;
                        placement = 'left';
                    }
                }
            }

            // Adjust horizontal position to stay in viewport (for top/bottom placement)
            if (placement === 'top' || placement === 'bottom') {
                if (x < edgePadding) {
                    x = edgePadding;
                } else if (x + tooltip.width > viewport.width - edgePadding) {
                    x = viewport.width - tooltip.width - edgePadding;
                }
            }

            // Adjust vertical position to stay in viewport (for left/right placement)
            if (placement === 'left' || placement === 'right') {
                if (y < edgePadding) {
                    y = edgePadding;
                } else if (y + tooltip.height > viewport.height - edgePadding) {
                    y = viewport.height - tooltip.height - edgePadding;
                }
            }

            setPosition({ x, y, placement });
        };

        calculatePosition();

        // Recalculate on scroll or resize
        window.addEventListener('scroll', calculatePosition, true);
        window.addEventListener('resize', calculatePosition);

        return () => {
            window.removeEventListener('scroll', calculatePosition, true);
            window.removeEventListener('resize', calculatePosition);
        };
    }, [isVisible, targetRef]);

    if (!isVisible) return null;

    return createPortal(
        <div
            ref={tooltipRef}
            className={`smart-tooltip placement-${position.placement}`}
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
            }}
        >
            {children}
        </div>,
        document.body
    );
}

/**
 * Hook version for easier use in existing code
 * 
 * Usage:
 * const { tooltipProps, targetRef } = useSmartTooltip();
 * 
 * return (
 *   <>
 *     <button ref={targetRef} {...tooltipProps}>
 *       Click me
 *     </button>
 *     <SmartTooltip {...tooltipProps}>
 *       Tooltip content
 *     </SmartTooltip>
 *   </>
 * );
 */
export function useSmartTooltip(delay = 400) {
    const targetRef = useRef(null);
    const [show, setShow] = useState(false);

    const handleMouseEnter = () => setShow(true);
    const handleMouseLeave = () => setShow(false);

    return {
        targetRef,
        tooltipProps: {
            show,
            targetRef,
            delay
        },
        buttonProps: {
            onMouseEnter: handleMouseEnter,
            onMouseLeave: handleMouseLeave
        }
    };
}