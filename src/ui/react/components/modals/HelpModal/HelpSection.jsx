/**
 * @file HelpSection.jsx
 * @description Collapsible accordion section component for the HelpModal.
 * Provides smooth expand/collapse animations and keyboard navigation.
 *
 * Features:
 * - Collapsible content with smooth animations
 * - Icon and title display
 * - Keyboard accessible (Enter/Space to toggle)
 * - ARIA attributes for accessibility
 *
 * @example
 * <HelpSection
 *   id="quickstart"
 *   title="Quick Start"
 *   icon={Rocket}
 *   isExpanded={expandedSection === 'quickstart'}
 *   onToggle={() => toggleSection('quickstart')}
 * >
 *   <QuickStartContent />
 * </HelpSection>
 */

import React, { memo, useRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * @typedef {Object} HelpSectionProps
 * @property {string} id - Unique section identifier
 * @property {string} title - Section title text
 * @property {React.ComponentType} [icon] - Lucide icon component
 * @property {boolean} isExpanded - Whether section content is visible
 * @property {() => void} onToggle - Toggle expand/collapse handler
 * @property {React.ReactNode} children - Section content
 * @property {string} [className] - Additional CSS class
 */

/**
 * Collapsible accordion section for help content.
 *
 * @param {HelpSectionProps} props - Component props
 * @returns {React.ReactElement} The rendered section
 */
function HelpSection({
    id,
    title,
    icon: Icon,
    isExpanded,
    onToggle,
    children,
    className = ''
}) {
    const contentRef = useRef(null);
    const uniqueId = useId();
    const headerId = `help-section-header-${uniqueId}`;
    const contentId = `help-section-content-${uniqueId}`;

    /**
     * Handle keyboard interaction
     */
    const handleKeyDown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggle();
        }
    };

    // Build class names
    const sectionClassNames = [
        'help-section',
        isExpanded && 'help-section--expanded',
        className
    ].filter(Boolean).join(' ');

    return (
        <div className={sectionClassNames} data-section-id={id}>
            {/* Section Header */}
            <button
                id={headerId}
                className="help-section__header"
                onClick={onToggle}
                onKeyDown={handleKeyDown}
                aria-expanded={isExpanded}
                aria-controls={contentId}
                type="button"
            >
                <span className="help-section__title">
                    {Icon && (
                        <span className="help-section__icon">
                            <Icon size={18} />
                        </span>
                    )}
                    <span>{title}</span>
                </span>
                <span className="help-section__chevron">
                    <ChevronDown size={18} />
                </span>
            </button>

            {/* Section Content */}
            {isExpanded && (
                <div
                    id={contentId}
                    ref={contentRef}
                    className="help-section__content"
                    role="region"
                    aria-labelledby={headerId}
                >
                    {children}
                </div>
            )}
        </div>
    );
}

export default memo(HelpSection);
export { HelpSection };