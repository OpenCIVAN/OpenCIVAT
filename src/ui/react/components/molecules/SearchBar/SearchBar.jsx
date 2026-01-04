/**
 * @file SearchBar.jsx
 * @description Reusable search bar component for panel content filtering.
 * Provides consistent styling across all tabs with optional clear button.
 *
 * @example
 * <SearchBar
 *   value={searchQuery}
 *   onChange={setSearchQuery}
 *   placeholder="Search files..."
 * />
 */

import React, { memo, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import './SearchBar.scss';

/**
 * SearchBar - Consistent search input for panels and tabs
 *
 * @param {Object} props
 * @param {string} props.value - Current search value
 * @param {function} props.onChange - Callback when value changes (receives string)
 * @param {string} [props.placeholder='Search...'] - Placeholder text
 * @param {string} [props.className] - Additional CSS class
 * @param {boolean} [props.disabled] - Whether input is disabled
 * @param {boolean} [props.autoFocus] - Whether to auto-focus on mount
 * @param {number} [props.iconSize=12] - Size of search/clear icons
 * @param {'default' | 'compact' | 'inline'} [props.variant='default'] - Style variant
 */
function SearchBar({
    value,
    onChange,
    placeholder = 'Search...',
    className = '',
    disabled = false,
    autoFocus = false,
    iconSize = 12,
    variant = 'default',
}) {
    const handleChange = useCallback((e) => {
        onChange(e.target.value);
    }, [onChange]);

    const handleClear = useCallback(() => {
        onChange('');
    }, [onChange]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape' && value) {
            e.preventDefault();
            onChange('');
        }
    }, [value, onChange]);

    return (
        <div className={`search-bar search-bar--${variant} ${className}`}>
            <div className="search-bar__wrapper">
                <Icon
                    name="search"
                    size={iconSize}
                    className="search-bar__icon"
                />
                <input
                    type="text"
                    className="search-bar__input"
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    autoFocus={autoFocus}
                />
                {value && (
                    <button
                        type="button"
                        className="search-bar__clear"
                        onClick={handleClear}
                        tabIndex={-1}
                        aria-label="Clear search"
                    >
                        <Icon name="close" size={10} />
                    </button>
                )}
            </div>
        </div>
    );
}

export default memo(SearchBar);
export { SearchBar };
