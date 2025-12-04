/**
 * FilterChips Component
 *
 * Filter chip buttons for filtering views in the Views subtab.
 * Supports multiple active filters.
 */

import React, { memo, useCallback } from 'react';
import { Share2, Link2 } from 'lucide-react';
import './FilterChips.scss';

// Default filter configuration
const DEFAULT_FILTERS = [
    { id: 'shared', label: 'Shared', icon: Share2, color: 'pink' },
    { id: 'linked', label: 'Linked', icon: Link2, color: 'teal' },
];

export const FilterChips = memo(function FilterChips({
    filters = DEFAULT_FILTERS,
    activeFilters = [],
    onToggle,
    className = '',
}) {
    const handleToggle = useCallback(
        (filterId) => {
            onToggle?.(filterId);
        },
        [onToggle]
    );

    return (
        <div className={`filter-chips ${className}`}>
            {filters.map((filter) => {
                const Icon = filter.icon;
                const isActive = activeFilters.includes(filter.id);

                return (
                    <button
                        key={filter.id}
                        className={`filter-chips__chip ${isActive ? 'filter-chips__chip--active' : ''}`}
                        data-color={filter.color}
                        onClick={() => handleToggle(filter.id)}
                    >
                        <Icon size={9} />
                        <span>{filter.label}</span>
                    </button>
                );
            })}
        </div>
    );
});

export default FilterChips;