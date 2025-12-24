/**
 * @file FilterCard.jsx
 * @description Enhanced filter display card component.
 *
 * Features:
 * - Filter type and rule summary
 * - Scope badge (View, Dataset, Workspace)
 * - Pin toggle and action buttons
 * - Quick apply button
 * - Context menu for edit/export/delete
 *
 * @see Left_Panel_Design_Specification.docx - Section 10 Filters
 */

import React, { useState, memo } from 'react';
import { Icon } from '@UI/react/components/common/Icon';
import { getScopeConfig } from '../constants';

/**
 * Get filter scope icon.
 *
 * @param {string} scope - Filter scope
 * @returns {Object} Icon component and color
 */
function getFilterScopeIcon(scope) {
    switch (scope) {
        case 'view':
            return { icon: 'eye', color: 'blue' };
        case 'dataset':
            return { icon: 'database', color: 'teal' };
        case 'workspace':
            return { icon: 'layout', color: 'purple' };
        default:
            return { icon: 'filter', color: 'gray' };
    }
}

/**
 * Format filter rules into a readable summary.
 *
 * @param {Object} filterConfig - Filter configuration
 * @returns {string} Human-readable summary
 */
function formatFilterSummary(filterConfig) {
    if (!filterConfig) return 'No rules defined';

    const rules = [];

    if (filterConfig.range) {
        const { min, max, field } = filterConfig.range;
        rules.push(`${field}: ${min}-${max}`);
    }

    if (filterConfig.categories && filterConfig.categories.length > 0) {
        const count = filterConfig.categories.length;
        rules.push(`${count} categor${count === 1 ? 'y' : 'ies'}`);
    }

    if (filterConfig.spatial) {
        rules.push('Spatial region');
    }

    if (filterConfig.expression) {
        rules.push('Expression filter');
    }

    return rules.length > 0 ? rules.join(' • ') : 'No active filters';
}

/**
 * FilterCard component.
 *
 * @param {Object} props
 * @param {Object} props.filter - Filter data
 * @param {Function} props.onApply - Apply filter handler
 * @param {Function} props.onTogglePin - Toggle pin handler
 * @param {Function} props.onDelete - Delete handler
 * @param {Function} props.onEdit - Edit handler
 * @param {Function} props.onDuplicate - Duplicate handler
 * @param {Function} props.onExport - Export handler
 * @param {boolean} props.compact - Use compact layout
 */
export const FilterCard = memo(function FilterCard({
    filter,
    onApply,
    onTogglePin,
    onDelete,
    onEdit,
    onDuplicate,
    onExport,
    compact = false,
}) {
    const [isHovered, setIsHovered] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    const scopeConfig = getScopeConfig(filter.scope);
    const scopeIcon = getFilterScopeIcon(filter.scope);

    const handleApply = (e) => {
        e.stopPropagation();
        onApply?.(filter);
    };

    const handleTogglePin = (e) => {
        e.stopPropagation();
        onTogglePin?.(filter.id, filter.isPinned);
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        onDelete?.(filter.id);
    };

    const handleEdit = (e) => {
        e.stopPropagation();
        setShowMenu(false);
        onEdit?.(filter);
    };

    const handleDuplicate = (e) => {
        e.stopPropagation();
        setShowMenu(false);
        onDuplicate?.(filter);
    };

    const handleExport = (e) => {
        e.stopPropagation();
        setShowMenu(false);
        onExport?.([filter.id]);
    };

    if (compact) {
        return (
            <div
                className="filter-card filter-card--compact"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={handleApply}
            >
                <Icon name="filter" size={14} className={`icon-${scopeIcon.color}`} />
                <span className="filter-card__name">{filter.name}</span>
                {filter.isPinned && (
                    <Icon name="pin" size={10} className="filter-card__pin-indicator" fill="currentColor" />
                )}
                <button
                    className="filter-card__apply-btn"
                    onClick={handleApply}
                    style={{ opacity: isHovered ? 1 : 0 }}
                >
                    <Icon name="play" size={10} />
                </button>
            </div>
        );
    }

    return (
        <div
            className={`filter-card ${filter.isPinned ? 'filter-card--pinned' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setShowMenu(false); }}
        >
            {/* Type icon */}
            <div className="filter-card__icon">
                <Icon name="filter" size={16} />
            </div>

            {/* Content */}
            <div className="filter-card__content">
                <div className="filter-card__header">
                    <span className="filter-card__name">
                        {filter.name}
                    </span>
                    <span
                        className="filter-card__scope-badge"
                        data-color={scopeConfig.color}
                        title={scopeConfig.label}
                    >
                        <Icon name={scopeIcon.icon} size={8} />
                        {scopeConfig.label}
                    </span>
                </div>

                {filter.description && (
                    <div className="filter-card__description">
                        {filter.description}
                    </div>
                )}

                <div className="filter-card__summary">
                    {formatFilterSummary(filter.filterConfig)}
                </div>

                {filter.tags && filter.tags.length > 0 && (
                    <div className="filter-card__tags">
                        {filter.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="filter-card__tag">
                                {tag}
                            </span>
                        ))}
                        {filter.tags.length > 3 && (
                            <span className="filter-card__tag filter-card__tag--more">
                                +{filter.tags.length - 3}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div
                className="filter-card__actions"
                style={{ opacity: isHovered ? 1 : 0 }}
            >
                <button
                    className={`filter-card__action-btn ${filter.isPinned ? 'active' : ''}`}
                    onClick={handleTogglePin}
                    title={filter.isPinned ? 'Unpin' : 'Pin'}
                >
                    {filter.isPinned ? (
                        <Icon name="pin" size={10} fill="currentColor" />
                    ) : (
                        <Icon name="pinOff" size={10} />
                    )}
                </button>

                {filter.isOwn && (
                    <>
                        <button
                            className="filter-card__action-btn"
                            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                            title="More actions"
                        >
                            <Icon name="moreHorizontal" size={10} />
                        </button>

                        {/* Context menu */}
                        {showMenu && (
                            <div className="filter-card__menu">
                                <button onClick={handleEdit}>
                                    <Icon name="edit" size={10} />
                                    Edit
                                </button>
                                <button onClick={handleDuplicate}>
                                    <Icon name="copy" size={10} />
                                    Duplicate
                                </button>
                                <button onClick={handleExport}>
                                    <Icon name="download" size={10} />
                                    Export
                                </button>
                                <button onClick={handleDelete} className="danger">
                                    <Icon name="delete" size={10} />
                                    Delete
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Apply button */}
            <button
                className="filter-card__apply-btn"
                onClick={handleApply}
                title="Apply filter"
            >
                <Icon name="play" size={10} /> Apply
            </button>
        </div>
    );
});

export default FilterCard;