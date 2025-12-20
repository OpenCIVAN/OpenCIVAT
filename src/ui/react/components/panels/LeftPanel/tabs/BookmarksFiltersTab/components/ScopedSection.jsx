/**
 * @file ScopedSection.jsx
 * @description Collapsible section grouped by scope.
 *
 * @see Left_Panel_Design_Specification.docx - Section 9-10
 */

import React, { memo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getScopeConfig } from '../constants';

/**
 * ScopedSection component.
 *
 * Supports two usage patterns:
 * 1. Items + renderItem: `<ScopedSection items={[...]} renderItem={(item) => ...} />`
 * 2. Children: `<ScopedSection count={5}>{children}</ScopedSection>`
 *
 * @param {Object} props
 * @param {string} props.scope - Scope key (project, room, personal)
 * @param {Array} props.items - Array of items (optional if using children)
 * @param {number} props.count - Count override (optional, defaults to items.length)
 * @param {boolean} props.expanded - Whether section is expanded
 * @param {Function} props.onToggle - Toggle handler
 * @param {Function} props.renderItem - Render function for items (optional if using children)
 * @param {React.ReactNode} props.children - Child content (alternative to items+renderItem)
 */
export const ScopedSection = memo(function ScopedSection({
    scope,
    items,
    count,
    expanded,
    onToggle,
    renderItem,
    children,
}) {
    const config = getScopeConfig(scope);
    const Icon = config.icon;

    // Determine count: explicit count prop, items length, or 0
    const itemCount = count ?? items?.length ?? 0;

    // Don't render if no items and no children
    if (itemCount === 0 && !children) return null;

    return (
        <div className={`scoped-section ${expanded ? 'scoped-section--expanded' : ''}`}>
            <button
                className="scoped-section__header"
                onClick={onToggle}
            >
                <span className="scoped-section__chevron">
                    {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </span>
                <Icon size={12} className={`icon-${config.color}`} />
                <span className="scoped-section__label">{config.label}</span>
                <span className="scoped-section__count">{itemCount}</span>
            </button>
            {expanded && (
                <div className="scoped-section__content">
                    {children || (items && renderItem && items.map(item => renderItem(item)))}
                </div>
            )}
        </div>
    );
});

export default ScopedSection;