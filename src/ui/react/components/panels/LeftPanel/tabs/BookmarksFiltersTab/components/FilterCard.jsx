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
import {
    Filter,
    Pin,
    PinOff,
    Trash2,
    Play,
    Edit3,
    Copy,
    Download,
    MoreHorizontal,
    Eye,
    Database,
    Layout,
} from 'lucide-react';
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
            return { icon: Eye, color: 'blue' };
        case 'dataset':
            return { icon: Database, color: 'teal' };
        case 'workspace':
            return { icon: Layout, color: 'purple' };
        default:
            return { icon: Filter, color: 'gray' };
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
    const ScopeIcon = scopeIcon.icon;

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
                <Filter size={14} className={`icon-${scopeIcon.color}`} />
                <span className="filter-card__name">{filter.name}</span>
                {filter.isPinned && (
                    <Pin size={10} className="filter-card__pin-indicator" fill="currentColor" />
                )}
                <button
                    className="filter-card__apply-btn"
                    onClick={handleApply}
                    style={{ opacity: isHovered ? 1 : 0 }}
                >
                    <Play size={10} />
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
                <Filter size={16} />
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
                        <ScopeIcon size={8} />
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
                        <Pin size={10} fill="currentColor" />
                    ) : (
                        <PinOff size={10} />
                    )}
                </button>

                {filter.isOwn && (
                    <>
                        <button
                            className="filter-card__action-btn"
                            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                            title="More actions"
                        >
                            <MoreHorizontal size={10} />
                        </button>

                        {/* Context menu */}
                        {showMenu && (
                            <div className="filter-card__menu">
                                <button onClick={handleEdit}>
                                    <Edit3 size={10} />
                                    Edit
                                </button>
                                <button onClick={handleDuplicate}>
                                    <Copy size={10} />
                                    Duplicate
                                </button>
                                <button onClick={handleExport}>
                                    <Download size={10} />
                                    Export
                                </button>
                                <button onClick={handleDelete} className="danger">
                                    <Trash2 size={10} />
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
                <Play size={10} /> Apply
            </button>
        </div>
    );
});

export default FilterCard;