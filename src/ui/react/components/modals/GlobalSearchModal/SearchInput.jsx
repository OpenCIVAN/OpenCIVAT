/**
 * @file SearchInput.jsx
 * @description Search input component for the GlobalSearchModal.
 * Features auto-focus, clear button, and keyboard shortcut hint.
 *
 * @example
 * <SearchInput
 *   value={query}
 *   onChange={setQuery}
 *   onKeyDown={handleKeyDown}
 *   isLoading={isLoading}
 * />
 */

import React, { memo, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

/**
 * @typedef {Object} SearchInputProps
 * @property {string} value - Current input value
 * @property {(value: string) => void} onChange - Value change handler
 * @property {(event: React.KeyboardEvent) => void} [onKeyDown] - Keyboard event handler
 * @property {boolean} [isLoading=false] - Show loading indicator
 * @property {boolean} [autoFocus=true] - Auto-focus on mount
 * @property {string} [placeholder] - Input placeholder text
 * @property {string} [testId] - Data-testid for testing
 */

/**
 * Search input with icon, loading indicator, and clear button.
 *
 * @param {SearchInputProps} props - Component props
 * @returns {React.ReactElement} The rendered search input
 */
function SearchInput({
    value,
    onChange,
    onKeyDown,
    isLoading = false,
    autoFocus = true,
    placeholder = 'Search projects, datasets, views...',
    testId
}) {
    const inputRef = useRef(null);

    // Auto-focus on mount
    useEffect(() => {
        if (autoFocus && inputRef.current) {
            // Small delay to ensure modal animation is complete
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [autoFocus]);

    /**
     * Handle input change
     */
    const handleChange = (event) => {
        onChange(event.target.value);
    };

    /**
     * Handle clear button click
     */
    const handleClear = () => {
        onChange('');
        inputRef.current?.focus();
    };

    /**
     * Handle keyboard events
     */
    const handleKeyDown = (event) => {
        // Don't propagate Escape if we're going to clear the input
        if (event.key === 'Escape' && value) {
            event.stopPropagation();
            handleClear();
            return;
        }

        onKeyDown?.(event);
    };

    return (
        <div className="global-search__input-wrapper">
            {/* Search icon or loading spinner */}
            <div className="global-search__input-icon">
                {isLoading ? (
                    <Loader2 size={20} className="global-search__spinner" />
                ) : (
                    <Search size={20} />
                )}
            </div>

            {/* Input field */}
            <input
                ref={inputRef}
                type="text"
                className="global-search__input"
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                role="combobox"
                aria-expanded="true"
                aria-haspopup="listbox"
                aria-autocomplete="list"
                aria-label="Search"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-testid={testId}
            />

            {/* Clear button */}
            {value && (
                <button
                    type="button"
                    className="global-search__clear"
                    onClick={handleClear}
                    aria-label="Clear search"
                    tabIndex={-1}
                >
                    <X size={18} />
                </button>
            )}

            {/* Keyboard shortcut hint */}
            <div className="global-search__shortcut-hint">
                <kbd className="kbd">Esc</kbd>
                <span>to close</span>
            </div>
        </div>
    );
}

export default memo(SearchInput);
export { SearchInput };