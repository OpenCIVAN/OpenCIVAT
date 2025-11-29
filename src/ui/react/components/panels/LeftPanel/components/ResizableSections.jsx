// src/ui/react/components/panels/LeftPanel/components/ResizableSections.jsx
// Resizable and collapsible sections
//
// Features:
// - Sections can be expanded/collapsed by clicking header
// - When multiple sections are open, they can be resized by dragging dividers
// - Sections fill available vertical space proportionally
// - Collapsed sections anchor appropriately (top→top, bottom→bottom, middle→below)

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import './ResizableSections.scss';

// =============================================================================
// SECTION HEADER
// =============================================================================

function SectionHeader({
    icon: Icon,
    iconColorClass,
    label,
    count,
    badge,
    isExpanded,
    onToggle,
}) {
    return (
        <div
            className="resizable-section__header"
            onClick={onToggle}
        >
            <span className="resizable-section__chevron">
                {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            </span>
            {Icon && <Icon size={11} className={`resizable-section__icon ${iconColorClass || ''}`} />}
            <span className="resizable-section__label">{label}</span>
            {badge > 0 && (
                <span className="resizable-section__badge">{badge}</span>
            )}
            <span className="resizable-section__count">{count}</span>
        </div>
    );
}

// =============================================================================
// RESIZE DIVIDER
// =============================================================================

function ResizeDivider({ onDragStart, isActive }) {
    return (
        <div
            className={`resizable-section__divider ${isActive ? 'resizable-section__divider--active' : ''}`}
            onMouseDown={onDragStart}
        >
            <div className="resizable-section__divider-handle" />
        </div>
    );
}

// =============================================================================
// SINGLE SECTION
// =============================================================================

export function ResizableSection({
    id,
    icon,
    iconColorClass,
    label,
    count = 0,
    badge = 0,
    isExpanded,
    onToggle,
    flexGrow = 1,
    minHeight = 32,
    children,
    showDivider = false,
    onDividerDrag,
    isDividerActive = false,
}) {
    return (
        <div
            className={`resizable-section ${isExpanded ? 'resizable-section--expanded' : 'resizable-section--collapsed'}`}
            style={{
                flexGrow: isExpanded ? flexGrow : 0,
                flexShrink: isExpanded ? 1 : 0,
                flexBasis: isExpanded ? 0 : 'auto',
                minHeight: isExpanded ? minHeight : 'auto',
            }}
            data-section-id={id}
        >
            <SectionHeader
                icon={icon}
                iconColorClass={iconColorClass}
                label={label}
                count={count}
                badge={badge}
                isExpanded={isExpanded}
                onToggle={onToggle}
            />

            {isExpanded && (
                <div className="resizable-section__content">
                    {children}
                </div>
            )}

            {showDivider && isExpanded && (
                <ResizeDivider
                    onDragStart={onDividerDrag}
                    isActive={isDividerActive}
                />
            )}
        </div>
    );
}

// =============================================================================
// SECTIONS CONTAINER - Manages resize logic
// =============================================================================

export function ResizableSectionsContainer({
    children,
    sectionStates, // { [id]: { expanded: boolean, flexGrow: number } }
    onSectionToggle,
    onSectionResize,
}) {
    const containerRef = useRef(null);
    const [resizing, setResizing] = useState(null); // { index, startY, startHeights }

    // Get array of section IDs that are expanded
    const expandedSections = Object.entries(sectionStates)
        .filter(([_, state]) => state.expanded)
        .map(([id]) => id);

    // Handle resize drag start
    const handleDragStart = useCallback((e, sectionIndex) => {
        e.preventDefault();

        if (!containerRef.current) return;

        // Get current heights of all expanded sections
        const sectionElements = containerRef.current.querySelectorAll('.resizable-section--expanded');
        const startHeights = Array.from(sectionElements).map(el => el.getBoundingClientRect().height);

        setResizing({
            index: sectionIndex,
            startY: e.clientY,
            startHeights,
        });
    }, []);

    // Handle mouse move during resize
    useEffect(() => {
        if (!resizing) return;

        const handleMouseMove = (e) => {
            const deltaY = e.clientY - resizing.startY;
            const { index, startHeights } = resizing;

            // Calculate new heights
            const newHeights = [...startHeights];
            const minHeight = 60; // Minimum section height

            // Adjust the section being resized and the one below it
            newHeights[index] = Math.max(minHeight, startHeights[index] + deltaY);
            if (index + 1 < newHeights.length) {
                newHeights[index + 1] = Math.max(minHeight, startHeights[index + 1] - deltaY);
            }

            // Convert heights to flex-grow ratios
            const totalHeight = newHeights.reduce((a, b) => a + b, 0);
            const flexGrows = newHeights.map(h => h / totalHeight * expandedSections.length);

            // Update section states
            expandedSections.forEach((id, i) => {
                if (flexGrows[i] !== undefined) {
                    onSectionResize?.(id, flexGrows[i]);
                }
            });
        };

        const handleMouseUp = () => {
            setResizing(null);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizing, expandedSections, onSectionResize]);

    // Clone children with resize props
    const enhancedChildren = React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;

        const sectionId = child.props.id;
        const state = sectionStates[sectionId] || { expanded: false, flexGrow: 1 };
        const isLastExpanded = expandedSections.indexOf(sectionId) === expandedSections.length - 1;
        const sectionIndex = expandedSections.indexOf(sectionId);

        // When only one section is expanded, it should fill all available space
        // regardless of any previously set flexGrow ratio
        const effectiveFlexGrow = expandedSections.length === 1 ? 1 : state.flexGrow;

        return React.cloneElement(child, {
            isExpanded: state.expanded,
            flexGrow: effectiveFlexGrow,
            onToggle: () => onSectionToggle?.(sectionId),
            showDivider: state.expanded && !isLastExpanded && expandedSections.length > 1,
            onDividerDrag: (e) => handleDragStart(e, sectionIndex),
            isDividerActive: resizing?.index === sectionIndex,
        });
    });

    return (
        <div
            ref={containerRef}
            className={`resizable-sections-container ${resizing ? 'resizable-sections-container--resizing' : ''}`}
        >
            {enhancedChildren}
        </div>
    );
}

// =============================================================================
// HOOK FOR MANAGING SECTION STATE
// =============================================================================

export function useSectionStates(initialStates) {
    const [states, setStates] = useState(initialStates);

    const toggleSection = useCallback((id) => {
        setStates(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                expanded: !prev[id]?.expanded,
            }
        }));
    }, []);

    const resizeSection = useCallback((id, flexGrow) => {
        setStates(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                flexGrow,
            }
        }));
    }, []);

    const setExpanded = useCallback((id, expanded) => {
        setStates(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                expanded,
            }
        }));
    }, []);

    return {
        states,
        toggleSection,
        resizeSection,
        setExpanded,
        setStates,
    };
}

export default ResizableSectionsContainer;