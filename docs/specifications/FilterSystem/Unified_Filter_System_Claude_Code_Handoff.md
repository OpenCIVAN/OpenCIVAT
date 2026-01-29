# Unified Filter System - Claude Code Implementation Handoff

**Date:** January 29, 2025  
**Status:** Ready for Implementation  
**Priority:** High - Foundation Component  
**Prototype Reference:** `filter-system-prototype-v4.jsx`

---

## Executive Summary

This document specifies a **unified filter system** to replace duplicated filtering logic across CIA Web. The system consists of a headless hook (`useListFilter`) and composable UI components that adapt to available space while enforcing single-line layouts.

### Goals
1. **DRY:** Single source of truth for filter logic
2. **Contributor-friendly:** Clear separation of logic and UI
3. **Plugin-compatible:** New instance types define their own filter configs
4. **VR-adaptive:** Atoms handle sizing, organisms handle layout
5. **Space-efficient:** Single-line layouts with overflow handling

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [File Structure](#file-structure)
3. [Core Hook: useListFilter](#core-hook-uselistfilter)
4. [UI Components](#ui-components)
5. [Filter Configurations](#filter-configurations)
6. [Responsive Behavior](#responsive-behavior)
7. [Migration Plan](#migration-plan)
8. [Implementation Order](#implementation-order)
9. [Testing Requirements](#testing-requirements)
10. [Acceptance Criteria](#acceptance-criteria)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FILTER SYSTEM ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  LAYER 1: HEADLESS HOOK                                     │    │
│  │  useListFilter.js                                           │    │
│  │  - All filter state (search, types, tags, quick, sort)      │    │
│  │  - applyFilters(items) function                             │    │
│  │  - applyToSections({section1: [], section2: []})            │    │
│  │  - Persistence support (localStorage)                       │    │
│  │  - No UI dependencies                                       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              ↓                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  LAYER 2: FILTER CONFIGURATIONS                             │    │
│  │  Per-tab configs that define available filters:             │    │
│  │  - quickFilters: [{id, label, icon, predicate}]             │    │
│  │  - typeCategories: [{id, label, icon, types: [...]}]        │    │
│  │  - sortOptions: [{value, label, icon, comparator}]          │    │
│  │  - searchFields: (item) => [string, string, ...]            │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              ↓                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  LAYER 3: UI MOLECULES                                      │    │
│  │  - QuickFilterChip (with compact/icon-only mode)            │    │
│  │  - TypeFilterDropdown (categorized, searchable)             │    │
│  │  - TagsFilterDropdown (reuse existing TagsDropdown)         │    │
│  │  - SortDropdown (radio selection)                           │    │
│  │  - FilterOverflowMenu (+N more pattern)                     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              ↓                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  LAYER 4: COMPOSED ORGANISM                                 │    │
│  │  FilterToolbar                                              │    │
│  │  - Receives hook state + config                             │    │
│  │  - Renders appropriate molecules                            │    │
│  │  - Adapts layout based on width/mode                        │    │
│  │  - Enforces single-line layouts                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/ui/react/
├── hooks/
│   └── useListFilter/
│       ├── index.js                    # Export
│       ├── useListFilter.js            # Main hook
│       ├── useListFilter.test.js       # Unit tests
│       └── filterConfigs/              # Per-tab configurations
│           ├── index.js                # Export all configs
│           ├── filesFilterConfig.js
│           ├── viewsFilterConfig.js
│           ├── datasetsFilterConfig.js
│           └── annotationsFilterConfig.js
│
├── components/
│   ├── molecules/
│   │   ├── QuickFilterChip/
│   │   │   ├── index.js
│   │   │   ├── QuickFilterChip.jsx
│   │   │   ├── QuickFilterChip.scss
│   │   │   └── QuickFilterChip.stories.jsx
│   │   │
│   │   ├── TypeFilterDropdown/
│   │   │   ├── index.js
│   │   │   ├── TypeFilterDropdown.jsx
│   │   │   ├── TypeFilterDropdown.scss
│   │   │   └── TypeFilterDropdown.stories.jsx
│   │   │
│   │   ├── SortDropdown/
│   │   │   ├── index.js
│   │   │   ├── SortDropdown.jsx
│   │   │   ├── SortDropdown.scss
│   │   │   └── SortDropdown.stories.jsx
│   │   │
│   │   ├── FilterOverflowMenu/
│   │   │   ├── index.js
│   │   │   ├── FilterOverflowMenu.jsx
│   │   │   ├── FilterOverflowMenu.scss
│   │   │   └── FilterOverflowMenu.stories.jsx
│   │   │
│   │   └── CombinedFiltersDropdown/
│   │       ├── index.js
│   │       ├── CombinedFiltersDropdown.jsx   # For minimal mode
│   │       ├── CombinedFiltersDropdown.scss
│   │       └── CombinedFiltersDropdown.stories.jsx
│   │
│   └── organisms/
│       └── FilterToolbar/
│           ├── index.js
│           ├── FilterToolbar.jsx
│           ├── FilterToolbar.scss
│           ├── FilterToolbar.stories.jsx
│           ├── QuickFiltersRow.jsx      # Sub-component
│           └── FilterDropdownRow.jsx    # Sub-component
```

---

## Core Hook: useListFilter

### File: `src/ui/react/hooks/useListFilter/useListFilter.js`

```javascript
/**
 * @file useListFilter.js
 * @description Headless hook for list filtering, sorting, and search.
 * 
 * FEATURES:
 * - Search across configurable fields
 * - Type filtering (multi-select with categories)
 * - Tag filtering (multi-select)
 * - Quick filters (predicate-based toggles)
 * - Sorting with configurable comparators
 * - Multi-section filtering (e.g., Starred + All Files)
 * - Optional localStorage persistence
 * 
 * @example
 * const filter = useListFilter({
 *   searchFields: (file) => [file.name, file.type],
 *   quickFilterDefs: FILES_QUICK_FILTERS,
 *   typeCategories: FILE_TYPE_CATEGORIES,
 *   sortOptions: FILE_SORT_OPTIONS,
 *   persistKey: 'files-tab-filters',
 * });
 * 
 * const filtered = filter.applyFilters(files);
 * // or for multiple sections:
 * const { results, counts } = filter.applyToSections({
 *   starred: starredFiles,
 *   all: allFiles,
 * });
 */

import { useState, useMemo, useCallback, useEffect } from 'react';

/**
 * @typedef {Object} QuickFilterDef
 * @property {string} id - Unique identifier
 * @property {string} label - Display label
 * @property {string} icon - Icon name from registry
 * @property {Function} predicate - (item) => boolean
 */

/**
 * @typedef {Object} TypeCategory
 * @property {string} id - Category identifier
 * @property {string} label - Display label
 * @property {string} icon - Icon name
 * @property {Array<{id: string, label: string}>} types - Types in category
 */

/**
 * @typedef {Object} SortOption
 * @property {string} value - Sort value (e.g., 'name-asc')
 * @property {string} label - Full label (e.g., 'Name (A→Z)')
 * @property {string} shortLabel - Compact label (e.g., 'Name')
 * @property {string} icon - Icon name
 * @property {Function} comparator - (a, b) => number
 */

/**
 * @typedef {Object} UseListFilterOptions
 * @property {Function} searchFields - (item) => string[] of searchable fields
 * @property {QuickFilterDef[]} quickFilterDefs - Quick filter definitions
 * @property {TypeCategory[]} typeCategories - Type category definitions
 * @property {SortOption[]} sortOptions - Sort option definitions
 * @property {string} [persistKey] - localStorage key for persistence
 * @property {Object} [initialState] - Initial filter state
 */

/**
 * @typedef {Object} UseListFilterReturn
 * @property {string} searchQuery - Current search query
 * @property {string[]} selectedTypes - Selected type IDs
 * @property {string[]} selectedTags - Selected tag IDs
 * @property {string[]} quickFilters - Active quick filter IDs
 * @property {string} sortBy - Current sort value
 * @property {boolean} hasActiveFilters - Whether any filters are active
 * @property {number} activeFilterCount - Count of active filters
 * @property {Function} setSearchQuery - Set search query
 * @property {Function} toggleType - Toggle a type filter
 * @property {Function} toggleTag - Toggle a tag filter
 * @property {Function} toggleQuickFilter - Toggle a quick filter
 * @property {Function} selectAllTypes - Select all types
 * @property {Function} clearAllTypes - Clear all type selections
 * @property {Function} setSortBy - Set sort option
 * @property {Function} clearAll - Clear all filters
 * @property {Function} applyFilters - Apply filters to item array
 * @property {Function} applyToSections - Apply filters to multiple sections
 */

export function useListFilter({
  searchFields = (item) => [item.name || ''],
  quickFilterDefs = [],
  typeCategories = [],
  sortOptions = [],
  persistKey = null,
  initialState = {},
}) {
  // =========================================================================
  // PERSISTENCE HELPERS
  // =========================================================================
  
  const loadPersistedState = useCallback(() => {
    if (!persistKey) return {};
    try {
      const stored = localStorage.getItem(persistKey);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.warn(`Failed to load filter state from ${persistKey}:`, e);
      return {};
    }
  }, [persistKey]);

  const persistState = useCallback((state) => {
    if (!persistKey) return;
    try {
      localStorage.setItem(persistKey, JSON.stringify(state));
    } catch (e) {
      console.warn(`Failed to persist filter state to ${persistKey}:`, e);
    }
  }, [persistKey]);

  // =========================================================================
  // STATE
  // =========================================================================

  const persisted = loadPersistedState();
  const defaultSort = sortOptions[0]?.value || 'name-asc';

  const [searchQuery, setSearchQuery] = useState(
    initialState.search ?? persisted.search ?? ''
  );
  const [selectedTypes, setSelectedTypes] = useState(
    initialState.types ?? persisted.types ?? []
  );
  const [selectedTags, setSelectedTags] = useState(
    initialState.tags ?? persisted.tags ?? []
  );
  const [quickFilters, setQuickFilters] = useState(
    initialState.quickFilters ?? persisted.quickFilters ?? []
  );
  const [sortBy, setSortBy] = useState(
    initialState.sortBy ?? persisted.sortBy ?? defaultSort
  );

  // =========================================================================
  // PERSIST ON CHANGE
  // =========================================================================

  useEffect(() => {
    if (!persistKey) return;
    persistState({
      search: searchQuery,
      types: selectedTypes,
      tags: selectedTags,
      quickFilters,
      sortBy,
    });
  }, [searchQuery, selectedTypes, selectedTags, quickFilters, sortBy, persistKey, persistState]);

  // =========================================================================
  // ACTIONS
  // =========================================================================

  const toggleType = useCallback((typeId) => {
    setSelectedTypes((prev) =>
      prev.includes(typeId)
        ? prev.filter((t) => t !== typeId)
        : [...prev, typeId]
    );
  }, []);

  const toggleTag = useCallback((tagId) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((t) => t !== tagId)
        : [...prev, tagId]
    );
  }, []);

  const toggleQuickFilter = useCallback((filterId) => {
    setQuickFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((f) => f !== filterId)
        : [...prev, filterId]
    );
  }, []);

  const selectAllTypes = useCallback(() => {
    const allTypeIds = typeCategories.flatMap((cat) =>
      cat.types.map((t) => t.id)
    );
    setSelectedTypes(allTypeIds);
  }, [typeCategories]);

  const clearAllTypes = useCallback(() => {
    setSelectedTypes([]);
  }, []);

  const clearAll = useCallback(() => {
    setSearchQuery('');
    setSelectedTypes([]);
    setSelectedTags([]);
    setQuickFilters([]);
    // Note: Don't reset sortBy - users typically want to keep their sort preference
  }, []);

  // =========================================================================
  // FILTER APPLICATION
  // =========================================================================

  const applyFilters = useCallback(
    (items) => {
      let result = [...items];

      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        result = result.filter((item) =>
          searchFields(item).some((field) =>
            field?.toLowerCase().includes(query)
          )
        );
      }

      // Type filter
      if (selectedTypes.length > 0) {
        result = result.filter((item) => {
          // Support both item.type and item.fileType
          const itemType = item.type || item.fileType;
          return selectedTypes.includes(itemType);
        });
      }

      // Tag filter
      if (selectedTags.length > 0) {
        result = result.filter((item) =>
          item.tags?.some((tag) => selectedTags.includes(tag))
        );
      }

      // Quick filters (AND logic - all active filters must pass)
      if (quickFilters.length > 0) {
        result = result.filter((item) =>
          quickFilters.every((filterId) => {
            const def = quickFilterDefs.find((d) => d.id === filterId);
            return def ? def.predicate(item) : true;
          })
        );
      }

      // Sort
      if (sortBy) {
        const sortDef = sortOptions.find((s) => s.value === sortBy);
        if (sortDef?.comparator) {
          result.sort(sortDef.comparator);
        }
      }

      return result;
    },
    [searchQuery, selectedTypes, selectedTags, quickFilters, sortBy, searchFields, quickFilterDefs, sortOptions]
  );

  const applyToSections = useCallback(
    (sections) => {
      const results = {};
      const counts = {
        total: 0,
        matched: 0,
        bySection: {},
      };

      Object.entries(sections).forEach(([key, sectionItems]) => {
        const filtered = applyFilters(sectionItems);
        results[key] = filtered;
        counts.bySection[key] = {
          total: sectionItems.length,
          matched: filtered.length,
        };
        counts.total += sectionItems.length;
        counts.matched += filtered.length;
      });

      return { results, counts };
    },
    [applyFilters]
  );

  // =========================================================================
  // COMPUTED
  // =========================================================================

  const hasActiveFilters =
    searchQuery.length > 0 ||
    selectedTypes.length > 0 ||
    selectedTags.length > 0 ||
    quickFilters.length > 0;

  const activeFilterCount =
    (searchQuery ? 1 : 0) +
    selectedTypes.length +
    selectedTags.length +
    quickFilters.length;

  // =========================================================================
  // RETURN
  // =========================================================================

  return {
    // State
    searchQuery,
    selectedTypes,
    selectedTags,
    quickFilters,
    sortBy,
    hasActiveFilters,
    activeFilterCount,

    // Actions
    setSearchQuery,
    toggleType,
    toggleTag,
    toggleQuickFilter,
    selectAllTypes,
    clearAllTypes,
    setSortBy,
    clearAll,

    // Filter functions
    applyFilters,
    applyToSections,
  };
}

export default useListFilter;
```

---

## UI Components

### QuickFilterChip

**File:** `src/ui/react/components/molecules/QuickFilterChip/QuickFilterChip.jsx`

```jsx
/**
 * QuickFilterChip - Toggleable filter chip with count badge
 * 
 * MODES:
 * - Full: Icon + Label + Count
 * - Compact: Icon + Count (with tooltip for label)
 * 
 * ADAPTIVE:
 * - Uses useAdaptive() for VR sizing
 * - VR always shows label (no tooltips in VR)
 */

import React, { memo } from 'react';
import { useAdaptive } from '@UI/react/context';
import { Icon } from '@UI/react/components/common/Icon';
import { Tooltip } from '@UI/react/components/atoms/Tooltip';
import './QuickFilterChip.scss';

export const QuickFilterChip = memo(function QuickFilterChip({
  id,
  label,
  icon,
  count,
  active = false,
  compact = false,
  onClick,
  className = '',
}) {
  const { isVR, tokens } = useAdaptive();
  
  // VR always shows labels (can't rely on tooltips)
  const showLabel = isVR || !compact;
  const needsTooltip = !showLabel && !isVR;

  const chip = (
    <button
      type="button"
      onClick={onClick}
      className={[
        'quick-filter-chip',
        active && 'quick-filter-chip--active',
        compact && 'quick-filter-chip--compact',
        isVR && 'quick-filter-chip--vr',
        className,
      ].filter(Boolean).join(' ')}
      aria-pressed={active}
      aria-label={`${label}: ${count} items`}
    >
      {icon && <Icon name={icon} size={compact ? 12 : 11} />}
      {showLabel && <span className="quick-filter-chip__label">{label}</span>}
      <span className="quick-filter-chip__count">{count}</span>
    </button>
  );

  if (needsTooltip) {
    return <Tooltip content={label}>{chip}</Tooltip>;
  }

  return chip;
});

export default QuickFilterChip;
```

**SCSS:** `QuickFilterChip.scss`

```scss
@use '@UI/styles/theme' as *;

.quick-filter-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: token('gap.xs');
  padding: token('spacing.xs') token('spacing.sm');
  
  background: token('colors.bg.secondary');
  border: 1px solid token('colors.border.subtle');
  border-radius: token('radius.md');
  
  color: token('colors.text.secondary');
  font-size: token('text.sm');
  font-family: inherit;
  
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  
  transition: all 0.15s ease;

  &:hover {
    background: token('colors.bg.hover');
  }

  &--active {
    background: token('colors.bg.active');
    border-color: token('colors.accent.blue');
    color: token('colors.accent.blue');

    .quick-filter-chip__count {
      background: token('colors.accent.blue');
      color: #fff;
    }
  }

  &--compact {
    padding: token('spacing.xs') token('spacing.sm');
    min-width: 32px;
  }

  &--vr {
    min-height: 44px;
    padding: token('spacing.sm') token('spacing.md');
    font-size: token('text.md');
  }

  &__label {
    // Label styling
  }

  &__count {
    padding: 0 token('spacing.xs');
    min-width: 14px;
    
    background: token('colors.bg.tertiary');
    border-radius: 8px;
    
    font-size: token('text.xs');
    font-weight: 500;
    text-align: center;
    line-height: 14px;
  }
}
```

---

### TypeFilterDropdown

**File:** `src/ui/react/components/molecules/TypeFilterDropdown/TypeFilterDropdown.jsx`

```jsx
/**
 * TypeFilterDropdown - Categorized multi-select dropdown for type filtering
 * 
 * FEATURES:
 * - Searchable within dropdown
 * - Categorized with headers
 * - Count per type
 * - Select All / Clear actions
 * - Disabled state for types with 0 count
 */

import React, { memo, useState, useMemo } from 'react';
import { useAdaptive } from '@UI/react/context';
import { Icon } from '@UI/react/components/common/Icon';
import { SearchInput } from '@UI/react/components/molecules/SearchInput';
import { Checkbox } from '@UI/react/components/atoms/Checkbox';
import { DropdownPortal } from '@UI/react/components/atoms/DropdownPortal';
import './TypeFilterDropdown.scss';

export const TypeFilterDropdown = memo(function TypeFilterDropdown({
  isOpen,
  onClose,
  triggerRef,
  categories = [],
  selectedTypes = [],
  typeCounts = {},
  onToggleType,
  onSelectAll,
  onClearAll,
}) {
  const { isVR } = useAdaptive();
  const [search, setSearch] = useState('');

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const query = search.toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        types: cat.types.filter((t) =>
          t.label.toLowerCase().includes(query)
        ),
      }))
      .filter((cat) => cat.types.length > 0);
  }, [categories, search]);

  // Reset search when closed
  React.useEffect(() => {
    if (!isOpen) setSearch('');
  }, [isOpen]);

  return (
    <DropdownPortal
      open={isOpen}
      onClose={onClose}
      triggerRef={triggerRef}
      width={280}
      className="type-filter-dropdown"
    >
      {/* Search */}
      <div className="type-filter-dropdown__search">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search types..."
          compact
          autoFocus
        />
      </div>

      {/* Quick actions */}
      <div className="type-filter-dropdown__actions">
        <button type="button" onClick={onSelectAll}>
          Select All
        </button>
        <button type="button" onClick={onClearAll}>
          Clear
        </button>
      </div>

      {/* Categories */}
      <div className="type-filter-dropdown__categories">
        {filteredCategories.map((category) => (
          <div key={category.id} className="type-filter-dropdown__category">
            <div className="type-filter-dropdown__category-header">
              <Icon name={category.icon} size={11} />
              <span>{category.label}</span>
            </div>

            <div className="type-filter-dropdown__options">
              {category.types.map((type) => {
                const count = typeCounts[type.id] || 0;
                const isSelected = selectedTypes.includes(type.id);
                const isEmpty = count === 0;

                return (
                  <label
                    key={type.id}
                    className={[
                      'type-filter-dropdown__option',
                      isEmpty && 'type-filter-dropdown__option--empty',
                      isSelected && 'type-filter-dropdown__option--selected',
                    ].filter(Boolean).join(' ')}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={isEmpty}
                      onChange={() => !isEmpty && onToggleType(type.id)}
                    />
                    <span className="type-filter-dropdown__option-label">
                      {type.label}
                    </span>
                    <span className="type-filter-dropdown__option-count">
                      ({count})
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        {filteredCategories.length === 0 && (
          <div className="type-filter-dropdown__empty">
            No types match "{search}"
          </div>
        )}
      </div>
    </DropdownPortal>
  );
});

export default TypeFilterDropdown;
```

---

### CombinedFiltersDropdown (Minimal Mode)

**File:** `src/ui/react/components/molecules/CombinedFiltersDropdown/CombinedFiltersDropdown.jsx`

```jsx
/**
 * CombinedFiltersDropdown - Tabbed Types + Tags dropdown for minimal mode
 * 
 * NOTE: Sort is NOT included here - it has its own separate button.
 * This keeps the Filters dropdown focused on "what to show" while
 * Sort handles "how to order".
 */

import React, { memo, useState, useMemo } from 'react';
import { useAdaptive } from '@UI/react/context';
import { Icon } from '@UI/react/components/common/Icon';
import { SearchInput } from '@UI/react/components/molecules/SearchInput';
import { Checkbox } from '@UI/react/components/atoms/Checkbox';
import { DropdownPortal } from '@UI/react/components/atoms/DropdownPortal';
import './CombinedFiltersDropdown.scss';

export const CombinedFiltersDropdown = memo(function CombinedFiltersDropdown({
  isOpen,
  onClose,
  triggerRef,
  
  // Types
  typeCategories = [],
  selectedTypes = [],
  typeCounts = {},
  onToggleType,
  onSelectAllTypes,
  onClearAllTypes,
  
  // Tags
  tags = [],
  tagsByCategory = {},
  selectedTags = [],
  onToggleTag,
  onClearAllTags,
}) {
  const { isVR } = useAdaptive();
  const [activeTab, setActiveTab] = useState('types');
  const [search, setSearch] = useState('');

  // Filter types by search
  const filteredTypes = useMemo(() => {
    if (!search.trim()) {
      return typeCategories.flatMap(cat => cat.types);
    }
    const query = search.toLowerCase();
    return typeCategories
      .flatMap(cat => cat.types)
      .filter(t => t.label.toLowerCase().includes(query));
  }, [typeCategories, search]);

  // Filter tags by search
  const filteredTags = useMemo(() => {
    if (!search.trim()) return tags;
    const query = search.toLowerCase();
    return tags.filter(t => t.name.toLowerCase().includes(query));
  }, [tags, search]);

  // Reset on close
  React.useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setActiveTab('types');
    }
  }, [isOpen]);

  const hasTypes = typeCategories.length > 0;
  const hasTags = tags.length > 0;

  // Tabs - only Types and Tags (Sort has its own button)
  const tabs = [
    { id: 'types', label: 'Types', icon: 'file', count: selectedTypes.length },
    { id: 'tags', label: 'Tags', icon: 'tag', count: selectedTags.length },
  ];

  return (
    <DropdownPortal
      open={isOpen}
      onClose={onClose}
      triggerRef={triggerRef}
      width={300}
      className="combined-filters-dropdown"
    >
      {/* Tabs */}
      <div className="combined-filters-dropdown__tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? 'active' : ''}
          >
            <Icon name={tab.icon} size={12} />
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span className="combined-filters-dropdown__tab-badge">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="combined-filters-dropdown__search">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={activeTab === 'types' ? 'Search types...' : 'Search tags...'}
          compact
          autoFocus
        />
      </div>

      {/* Types Tab Content */}
      {activeTab === 'types' && (
        <div className="combined-filters-dropdown__content">
          <div className="combined-filters-dropdown__actions">
            <button type="button" onClick={onSelectAllTypes}>Select All</button>
            <button type="button" onClick={onClearAllTypes}>Clear</button>
          </div>
          {/* ... type options ... */}
        </div>
      )}

      {/* Tags Tab Content */}
      {activeTab === 'tags' && (
        <div className="combined-filters-dropdown__content">
          <div className="combined-filters-dropdown__actions">
            <button type="button" onClick={onClearAllTags}>Clear All</button>
          </div>
          {/* ... tag chips ... */}
        </div>
      )}
    </DropdownPortal>
  );
});

export default CombinedFiltersDropdown;
```

---

### FilterToolbar (Organism)

**File:** `src/ui/react/components/organisms/FilterToolbar/FilterToolbar.jsx`

```jsx
/**
 * FilterToolbar - Main filter UI component
 * 
 * RESPONSIVE LAYOUTS:
 * - Full (≥400px): Two rows - Search on top, dropdowns below
 * - Compact (300-399px): Single row, icon-only dropdowns
 * - Minimal (<300px): Single row, combined filters dropdown
 * 
 * CRITICAL: Single-line enforcement - no wrapping allowed
 */

import React, { memo, useRef, useState, useMemo } from 'react';
import { useAdaptive } from '@UI/react/context';
import { Icon } from '@UI/react/components/common/Icon';
import { SearchInput } from '@UI/react/components/molecules/SearchInput';
import { Tooltip } from '@UI/react/components/atoms/Tooltip';
import { QuickFilterChip } from '@UI/react/components/molecules/QuickFilterChip';
import { TypeFilterDropdown } from '@UI/react/components/molecules/TypeFilterDropdown';
import { TagsDropdown } from '@UI/react/components/molecules/TagsDropdown';
import { SortDropdown } from '@UI/react/components/molecules/SortDropdown';
import { CombinedFiltersDropdown } from '@UI/react/components/molecules/CombinedFiltersDropdown';
import { FilterOverflowMenu } from '@UI/react/components/molecules/FilterOverflowMenu';
import { DropdownTrigger } from '@UI/react/components/atoms/DropdownTrigger';
import './FilterToolbar.scss';

/**
 * @typedef {Object} FilterToolbarProps
 * @property {Object} filter - Return value from useListFilter hook
 * @property {Object} config - Filter configuration object
 * @property {Object} [counts] - Type counts: { typeId: number }
 * @property {Object} [tags] - Available tags for TagsDropdown
 * @property {'full'|'compact'|'minimal'} [layout='auto'] - Force layout mode
 * @property {number} [width] - Container width (for auto layout)
 * @property {string} [searchPlaceholder] - Search input placeholder
 * @property {boolean} [showQuickFilters=true] - Show quick filters row
 * @property {number} [maxVisibleQuickFilters=4] - Max quick filters before overflow
 */

export const FilterToolbar = memo(function FilterToolbar({
  filter,
  config,
  counts = {},
  tags = [],
  layout = 'auto',
  width,
  searchPlaceholder = 'Search...',
  showQuickFilters = true,
  maxVisibleQuickFilters = 4,
  className = '',
}) {
  const { isVR } = useAdaptive();
  
  // Dropdown states
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [quickFiltersCollapsed, setQuickFiltersCollapsed] = useState(false);
  
  // Refs
  const typeButtonRef = useRef(null);
  const tagButtonRef = useRef(null);
  const sortButtonRef = useRef(null);

  // Determine layout mode
  const layoutMode = useMemo(() => {
    if (layout !== 'auto') return layout;
    if (isVR) return 'full'; // VR always uses full mode
    if (!width) return 'full';
    if (width >= 400) return 'full';
    if (width >= 300) return 'compact';
    return 'minimal';
  }, [layout, width, isVR]);

  const isFull = layoutMode === 'full';
  const isCompact = layoutMode === 'compact';
  const isMinimal = layoutMode === 'minimal';

  // Calculate quick filter visibility
  const quickFilterMaxVisible = useMemo(() => {
    if (isFull) return maxVisibleQuickFilters;
    if (isCompact) return Math.max(2, maxVisibleQuickFilters - 1);
    return 2; // Minimal
  }, [isFull, isCompact, maxVisibleQuickFilters]);

  // Quick filter counts
  const quickFilterCounts = useMemo(() => {
    const result = {};
    config.quickFilterDefs?.forEach((def) => {
      // Note: This requires access to unfiltered items
      // Parent component should pass this or we compute from counts
      result[def.id] = counts[def.id] || 0;
    });
    return result;
  }, [config.quickFilterDefs, counts]);

  // Current sort option
  const currentSort = config.sortOptions?.find(
    (o) => o.value === filter.sortBy
  );

  // Close other dropdowns when opening one
  const closeOtherDropdowns = (keep) => {
    if (keep !== 'type') setTypeDropdownOpen(false);
    if (keep !== 'tag') setTagDropdownOpen(false);
    if (keep !== 'sort') setSortDropdownOpen(false);
  };

  return (
    <div
      className={[
        'filter-toolbar',
        `filter-toolbar--${layoutMode}`,
        isVR && 'filter-toolbar--vr',
        className,
      ].filter(Boolean).join(' ')}
    >
      {/* ================================================================= */}
      {/* FULL MODE: Two rows                                               */}
      {/* ================================================================= */}
      {isFull && (
        <>
          {/* Row 1: Search (full width) */}
          <div className="filter-toolbar__search-row">
            <SearchInput
              value={filter.searchQuery}
              onChange={filter.setSearchQuery}
              placeholder={searchPlaceholder}
            />
          </div>

          {/* Row 2: Dropdowns (single line enforced) */}
          <div className="filter-toolbar__dropdowns-row">
            {/* Type filter */}
            {config.typeCategories?.length > 0 && (
              <DropdownTrigger
                ref={typeButtonRef}
                label="Types"
                icon="file"
                badge={filter.selectedTypes.length}
                active={filter.selectedTypes.length > 0}
                isOpen={typeDropdownOpen}
                onClick={() => {
                  closeOtherDropdowns('type');
                  setTypeDropdownOpen(!typeDropdownOpen);
                }}
              />
            )}

            {/* Tags filter */}
            {tags.length > 0 && (
              <DropdownTrigger
                ref={tagButtonRef}
                label="Tags"
                icon="tag"
                badge={filter.selectedTags.length}
                active={filter.selectedTags.length > 0}
                isOpen={tagDropdownOpen}
                onClick={() => {
                  closeOtherDropdowns('tag');
                  setTagDropdownOpen(!tagDropdownOpen);
                }}
              />
            )}

            {/* Sort */}
            {config.sortOptions?.length > 0 && (
              <DropdownTrigger
                ref={sortButtonRef}
                label={currentSort?.shortLabel || 'Sort'}
                icon="arrowUpDown"
                isOpen={sortDropdownOpen}
                onClick={() => {
                  closeOtherDropdowns('sort');
                  setSortDropdownOpen(!sortDropdownOpen);
                }}
              />
            )}

            {/* Spacer */}
            <div className="filter-toolbar__spacer" />

            {/* Clear button */}
            {filter.hasActiveFilters && (
              <Tooltip content={`Clear ${filter.activeFilterCount} filters`}>
                <button
                  type="button"
                  className="filter-toolbar__clear-btn"
                  onClick={filter.clearAll}
                  aria-label="Clear all filters"
                >
                  <Icon name="x" size={12} />
                  <span className="filter-toolbar__clear-count">
                    {filter.activeFilterCount}
                  </span>
                </button>
              </Tooltip>
            )}
          </div>
        </>
      )}

      {/* ================================================================= */}
      {/* COMPACT/MINIMAL MODE: Single row                                  */}
      {/* ================================================================= */}
      {!isFull && (
        <div className="filter-toolbar__single-row">
          <SearchInput
            value={filter.searchQuery}
            onChange={filter.setSearchQuery}
            placeholder="Search..."
            compact
          />

          {isMinimal ? (
            /* Minimal: Combined filters dropdown */
            <DropdownTrigger
              ref={typeButtonRef}
              label="Filters"
              icon="filter"
              badge={filter.selectedTypes.length + filter.selectedTags.length}
              active={filter.selectedTypes.length > 0 || filter.selectedTags.length > 0}
              isOpen={typeDropdownOpen}
              onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
              iconOnly
            />
          ) : (
            /* Compact: Icon-only dropdowns */
            <>
              {config.typeCategories?.length > 0 && (
                <DropdownTrigger
                  ref={typeButtonRef}
                  label="Types"
                  icon="file"
                  badge={filter.selectedTypes.length}
                  active={filter.selectedTypes.length > 0}
                  isOpen={typeDropdownOpen}
                  onClick={() => {
                    closeOtherDropdowns('type');
                    setTypeDropdownOpen(!typeDropdownOpen);
                  }}
                  iconOnly
                />
              )}
              {tags.length > 0 && (
                <DropdownTrigger
                  ref={tagButtonRef}
                  label="Tags"
                  icon="tag"
                  badge={filter.selectedTags.length}
                  active={filter.selectedTags.length > 0}
                  isOpen={tagDropdownOpen}
                  onClick={() => {
                    closeOtherDropdowns('tag');
                    setTagDropdownOpen(!tagDropdownOpen);
                  }}
                  iconOnly
                />
              )}
            </>
          )}

          {/* Sort (always icon-only in compact/minimal) */}
          <DropdownTrigger
            ref={sortButtonRef}
            label="Sort"
            icon="arrowUpDown"
            isOpen={sortDropdownOpen}
            onClick={() => {
              closeOtherDropdowns('sort');
              setSortDropdownOpen(!sortDropdownOpen);
            }}
            iconOnly
          />

          {/* Clear */}
          {filter.hasActiveFilters && (
            <Tooltip content={`Clear ${filter.activeFilterCount} filters`}>
              <button
                type="button"
                className="filter-toolbar__clear-btn filter-toolbar__clear-btn--icon-only"
                onClick={filter.clearAll}
                aria-label="Clear all filters"
              >
                <Icon name="x" size={12} />
              </button>
            </Tooltip>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* DROPDOWNS (rendered via portal)                                   */}
      {/* ================================================================= */}
      
      {/* Minimal mode: Combined Types + Tags dropdown */}
      {isMinimal && (
        <CombinedFiltersDropdown
          isOpen={typeDropdownOpen}
          onClose={() => setTypeDropdownOpen(false)}
          triggerRef={typeButtonRef}
          typeCategories={config.typeCategories || []}
          selectedTypes={filter.selectedTypes}
          typeCounts={counts}
          onToggleType={filter.toggleType}
          onSelectAllTypes={filter.selectAllTypes}
          onClearAllTypes={filter.clearAllTypes}
          tags={tags}
          selectedTags={filter.selectedTags}
          onToggleTag={filter.toggleTag}
        />
      )}
      
      {/* Full/Compact mode: Separate dropdowns */}
      {!isMinimal && (
        <>
          <TypeFilterDropdown
            isOpen={typeDropdownOpen}
            onClose={() => setTypeDropdownOpen(false)}
            triggerRef={typeButtonRef}
            categories={config.typeCategories || []}
            selectedTypes={filter.selectedTypes}
            typeCounts={counts}
            onToggleType={filter.toggleType}
            onSelectAll={filter.selectAllTypes}
            onClearAll={filter.clearAllTypes}
          />

          {tags.length > 0 && (
            <TagsDropdown
              isOpen={tagDropdownOpen}
              onClose={() => setTagDropdownOpen(false)}
              triggerRef={tagButtonRef}
              tags={tags}
              selectedTags={filter.selectedTags}
              onToggleTag={filter.toggleTag}
            />
          )}
        </>
      )}

      <SortDropdown
        isOpen={sortDropdownOpen}
        onClose={() => setSortDropdownOpen(false)}
        triggerRef={sortButtonRef}
        options={config.sortOptions || []}
        value={filter.sortBy}
        onChange={(value) => {
          filter.setSortBy(value);
          setSortDropdownOpen(false);
        }}
      />

      {/* ================================================================= */}
      {/* QUICK FILTERS ROW                                                 */}
      {/* ================================================================= */}
      
      {showQuickFilters && config.quickFilterDefs?.length > 0 && (
        <QuickFiltersRow
          quickFilterDefs={config.quickFilterDefs}
          activeFilters={filter.quickFilters}
          onToggle={filter.toggleQuickFilter}
          counts={quickFilterCounts}
          maxVisible={quickFilterMaxVisible}
          compact={!isFull}
          collapsed={quickFiltersCollapsed}
          onToggleCollapse={() => setQuickFiltersCollapsed(!quickFiltersCollapsed)}
        />
      )}

      {/* ================================================================= */}
      {/* FILTER SUMMARY                                                    */}
      {/* ================================================================= */}
      
      {filter.hasActiveFilters && (
        <div className="filter-toolbar__summary">
          <Icon name="filter" size={10} />
          <span>
            {/* Parent should pass filtered/total counts */}
            Filters active
          </span>
          {isMinimal && (
            <button
              type="button"
              className="filter-toolbar__summary-clear"
              onClick={filter.clearAll}
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
});

// =============================================================================
// QUICK FILTERS ROW SUB-COMPONENT
// =============================================================================

const QuickFiltersRow = memo(function QuickFiltersRow({
  quickFilterDefs,
  activeFilters,
  onToggle,
  counts,
  maxVisible = 4,
  compact = false,
  collapsed = false,
  onToggleCollapse,
}) {
  const { isVR } = useAdaptive();
  const [showOverflow, setShowOverflow] = useState(false);
  const overflowRef = useRef(null);

  // VR: Always show all filters (no overflow menu)
  const effectiveMaxVisible = isVR ? quickFilterDefs.length : maxVisible;

  const visibleFilters = quickFilterDefs.slice(0, effectiveMaxVisible);
  const overflowFilters = quickFilterDefs.slice(effectiveMaxVisible);
  const hasOverflow = overflowFilters.length > 0;

  // Count active filters in overflow
  const overflowActiveCount = overflowFilters.filter((f) =>
    activeFilters.includes(f.id)
  ).length;

  if (collapsed) {
    return (
      <button
        type="button"
        className="quick-filters-row quick-filters-row--collapsed"
        onClick={onToggleCollapse}
      >
        <Icon name="chevronDown" size={10} />
        <span>Quick filters</span>
        {activeFilters.length > 0 && (
          <span className="quick-filters-row__badge">{activeFilters.length}</span>
        )}
      </button>
    );
  }

  return (
    <div className="quick-filters-row">
      <span className="quick-filters-row__label">Quick:</span>

      {visibleFilters.map((def) => (
        <QuickFilterChip
          key={def.id}
          id={def.id}
          label={def.label}
          icon={def.icon}
          count={counts[def.id] || 0}
          active={activeFilters.includes(def.id)}
          onClick={() => onToggle(def.id)}
          compact={compact}
        />
      ))}

      {hasOverflow && (
        <FilterOverflowMenu
          ref={overflowRef}
          filters={overflowFilters}
          activeFilters={activeFilters}
          counts={counts}
          onToggle={onToggle}
          activeCount={overflowActiveCount}
        />
      )}

      {onToggleCollapse && (
        <button
          type="button"
          className="quick-filters-row__collapse-btn"
          onClick={onToggleCollapse}
          aria-label="Collapse quick filters"
        >
          <Icon name="chevronUp" size={12} />
        </button>
      )}
    </div>
  );
});

export default FilterToolbar;
```

---

## Filter Configurations

### Files Tab Config

**File:** `src/ui/react/hooks/useListFilter/filterConfigs/filesFilterConfig.js`

```javascript
/**
 * Filter configuration for Files Tab
 */

export const FILES_QUICK_FILTERS = [
  {
    id: 'loaded',
    label: 'Loaded',
    icon: 'checkCircle',
    predicate: (file) => file.loadState === 'loaded',
  },
  {
    id: 'starred',
    label: 'Starred',
    icon: 'star',
    predicate: (file) => file.isStarred,
  },
  {
    id: 'shared',
    label: 'Shared',
    icon: 'users',
    predicate: (file) => file.isShared,
  },
  {
    id: 'linked',
    label: 'Linked',
    icon: 'link2',
    predicate: (file) => file.isLinked,
  },
];

export const FILES_TYPE_CATEGORIES = [
  {
    id: 'medical',
    label: 'Medical Imaging',
    icon: 'heartPulse',
    types: [
      { id: 'nifti', label: 'NIfTI' },
      { id: 'dicom', label: 'DICOM' },
      { id: 'minc', label: 'MINC' },
      { id: 'analyze', label: 'Analyze' },
    ],
  },
  {
    id: 'mesh',
    label: '3D Meshes',
    icon: 'box',
    types: [
      { id: 'vtk', label: 'VTK' },
      { id: 'obj', label: 'OBJ' },
      { id: 'stl', label: 'STL' },
      { id: 'gltf', label: 'glTF' },
      { id: 'ply', label: 'PLY' },
    ],
  },
  {
    id: 'images',
    label: 'Images',
    icon: 'image',
    types: [
      { id: 'png', label: 'PNG' },
      { id: 'jpg', label: 'JPEG' },
      { id: 'tiff', label: 'TIFF' },
      { id: 'webp', label: 'WebP' },
    ],
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: 'fileText',
    types: [
      { id: 'pdf', label: 'PDF' },
      { id: 'csv', label: 'CSV' },
      { id: 'json', label: 'JSON' },
      { id: 'xml', label: 'XML' },
    ],
  },
];

export const FILES_SORT_OPTIONS = [
  {
    value: 'name-asc',
    label: 'Name (A→Z)',
    shortLabel: 'Name',
    icon: 'arrowDownAZ',
    comparator: (a, b) => (a.name || '').localeCompare(b.name || ''),
  },
  {
    value: 'name-desc',
    label: 'Name (Z→A)',
    shortLabel: 'Name',
    icon: 'arrowDownAZ',
    comparator: (a, b) => (b.name || '').localeCompare(a.name || ''),
  },
  {
    value: 'date-desc',
    label: 'Date (Newest)',
    shortLabel: 'Date',
    icon: 'clock',
    comparator: (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0),
  },
  {
    value: 'date-asc',
    label: 'Date (Oldest)',
    shortLabel: 'Date',
    icon: 'clock',
    comparator: (a, b) => (a.updatedAt || 0) - (b.updatedAt || 0),
  },
  {
    value: 'size-desc',
    label: 'Size (Largest)',
    shortLabel: 'Size',
    icon: 'hardDrive',
    comparator: (a, b) => (b.size || 0) - (a.size || 0),
  },
  {
    value: 'size-asc',
    label: 'Size (Smallest)',
    shortLabel: 'Size',
    icon: 'hardDrive',
    comparator: (a, b) => (a.size || 0) - (b.size || 0),
  },
];

export const FILES_FILTER_CONFIG = {
  quickFilterDefs: FILES_QUICK_FILTERS,
  typeCategories: FILES_TYPE_CATEGORIES,
  sortOptions: FILES_SORT_OPTIONS,
  searchFields: (file) => [
    file.name,
    file.type,
    file.fileType,
    ...(file.tags || []),
  ],
  persistKey: 'cia-web-files-filters',
};
```

### Views Tab Config

**File:** `src/ui/react/hooks/useListFilter/filterConfigs/viewsFilterConfig.js`

```javascript
/**
 * Filter configuration for Views Tab
 */

export const VIEWS_QUICK_FILTERS = [
  {
    id: 'active',
    label: 'Active',
    icon: 'circleCheck',
    predicate: (view) => view.status === 'active' || view.isOnCanvas,
  },
  {
    id: 'inactive',
    label: 'Inactive',
    icon: 'circleDashed',
    predicate: (view) => view.status === 'inactive' && !view.isOnCanvas,
  },
  {
    id: 'shared',
    label: 'Shared',
    icon: 'users',
    predicate: (view) => view.isShared,
  },
  {
    id: 'linked',
    label: 'Linked',
    icon: 'link2',
    predicate: (view) => view.isLinked || view.hasLinks,
  },
];

export const VIEWS_SORT_OPTIONS = [
  {
    value: 'position',
    label: 'Grid Position',
    shortLabel: 'Position',
    icon: 'grid',
    comparator: (a, b) => {
      const posA = a.position || { row: 999, col: 999 };
      const posB = b.position || { row: 999, col: 999 };
      return posA.row !== posB.row
        ? posA.row - posB.row
        : posA.col - posB.col;
    },
  },
  {
    value: 'name-asc',
    label: 'Name (A→Z)',
    shortLabel: 'Name',
    icon: 'arrowDownAZ',
    comparator: (a, b) => (a.name || '').localeCompare(b.name || ''),
  },
  {
    value: 'recent',
    label: 'Recent',
    shortLabel: 'Recent',
    icon: 'clock',
    comparator: (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0),
  },
  {
    value: 'dataset',
    label: 'Dataset',
    shortLabel: 'Dataset',
    icon: 'database',
    comparator: (a, b) =>
      (a.datasetName || '').localeCompare(b.datasetName || ''),
  },
];

export const VIEWS_FILTER_CONFIG = {
  quickFilterDefs: VIEWS_QUICK_FILTERS,
  typeCategories: [], // Views don't have type categories
  sortOptions: VIEWS_SORT_OPTIONS,
  searchFields: (view) => [view.name, view.datasetName],
  persistKey: 'cia-web-views-filters',
};
```

---

## Responsive Behavior

### Layout Breakpoints

| Mode | Width | Search | Dropdowns | Quick Filters |
|------|-------|--------|-----------|---------------|
| **Full** | ≥400px | Full width, own row | With labels (Types, Tags, Sort) | All visible |
| **Compact** | 300-399px | Shares row | Icon-only (Types, Tags, Sort) | 3 visible + overflow |
| **Minimal** | <300px | Shares row | Combined "Filters" (Types+Tags) + Sort | 2 visible + overflow |

### Minimal Mode Combined Dropdown

In minimal mode, Types and Tags are combined into a single **tabbed** "Filters" dropdown. Sort has its own separate button for quick access.

```
┌──────────────────────────────────────┐
│  [ Types ² ]  [ Tags ³ ]             │  ← Only 2 tabs
├──────────────────────────────────────┤
│ 🔍 Search types...                   │
│ [Select All]  [Clear]                │
├──────────────────────────────────────┤
│ MEDICAL IMAGING                      │
│ ☑️ NIfTI (23)                        │
│ ☑️ DICOM (156)                       │
│ ☐ VTK (5)                            │
└──────────────────────────────────────┘
```

**Key behaviors:**
- Tabs for Types and Tags (Sort is NOT included - it has its own button)
- Search filters the active tab's content
- Types section shows checkboxes (multi-select)
- Tags section shows chip toggles
- Badge on trigger shows total selected: types + tags

### Quick Filters - Single Line Enforcement

Quick filters MUST stay on one line in ALL modes. Use `+N more` overflow menu when needed.

| Mode | Max Visible | Chip Style | Overflow |
|------|-------------|------------|----------|
| **Full** | 3 | Label + Count | +1 more |
| **Compact** | 3 | Icon + Count | +1 more |
| **Minimal** | 2 | Icon + Count | +2 more |

**Critical CSS:**
```css
.quick-filters-row {
  flex-wrap: nowrap;  /* NEVER wrap */
  overflow: hidden;   /* Hide overflow */
}
```

### VR Mode Override

In VR (`isVR === true`):
- Always use **Full** layout (labels needed, no tooltips)
- Quick filters always show all (no overflow menu)
- Minimum touch targets: 44px

### Single-Line Enforcement

Both rows MUST use:
```css
flex-wrap: nowrap;
overflow: hidden;
```

---

## Migration Plan

### Phase 1: Create New Components (No Breaking Changes)

1. Implement `useListFilter` hook
2. Implement `QuickFilterChip` molecule
3. Implement `TypeFilterDropdown` molecule  
4. Implement `SortDropdown` molecule
5. Implement `FilterOverflowMenu` molecule
6. Implement `FilterToolbar` organism
7. Create filter configs for each tab
8. Add Storybook stories for all components

### Phase 2: Migrate Tabs (One at a Time)

#### 2a. Migrate ViewsTab (Simplest)

**Current:** `src/ui/react/components/panels/LeftPanel/tabs/ViewsTab/hooks/useViewsTab.js`

**Changes:**
1. Import `useListFilter` and `VIEWS_FILTER_CONFIG`
2. Replace internal filter state with hook
3. Replace filter UI with `<FilterToolbar />`
4. Keep all other logic (view operations, etc.)

```javascript
// BEFORE (in useViewsTab.js)
const [searchQuery, setSearchQuery] = useState('');
const [activeFilters, setActiveFilters] = useState([]);
const [sortBy, setSortBy] = useState('position');

const filteredViews = useMemo(() => {
  let result = [...views];
  // ... manual filtering logic
}, [views, searchQuery, activeFilters, sortBy]);

// AFTER
import { useListFilter } from '@UI/react/hooks/useListFilter';
import { VIEWS_FILTER_CONFIG } from '@UI/react/hooks/useListFilter/filterConfigs';

const filter = useListFilter({
  ...VIEWS_FILTER_CONFIG,
  // Can override specific options if needed
});

const filteredViews = useMemo(
  () => filter.applyFilters(views),
  [filter.applyFilters, views]
);

// Return filter object for UI
return {
  ...existingReturns,
  filter,
  filterConfig: VIEWS_FILTER_CONFIG,
};
```

#### 2b. Migrate DatasetsTab

Similar pattern to ViewsTab.

#### 2c. Migrate FilesTab (Most Complex)

Uses multi-section filtering:

```javascript
const filter = useListFilter(FILES_FILTER_CONFIG);

const { results, counts } = useMemo(
  () => filter.applyToSections({
    starred: starredFiles,
    loaded: loadedFiles,
    all: allFiles,
  }),
  [filter.applyToSections, starredFiles, loadedFiles, allFiles]
);

// results.starred, results.loaded, results.all are filtered arrays
// counts.bySection.starred.matched, etc. for display
```

#### 2d. Migrate AnnotationsTab

Similar pattern with annotation-specific config.

### Phase 3: Deprecate Old Components

1. Mark old `FilterBar` as deprecated
2. Remove duplicated filter logic from tab hooks
3. Update any remaining consumers

### Phase 4: Cleanup

1. Remove old FilterBar component
2. Remove unused filter utilities
3. Update documentation

---

## Implementation Order

### Week 1: Core Infrastructure

- [ ] Create `useListFilter` hook with full functionality
- [ ] Create filter config files for all tabs
- [ ] Write unit tests for hook

### Week 2: UI Molecules

- [ ] `QuickFilterChip` with stories
- [ ] `TypeFilterDropdown` with stories
- [ ] `SortDropdown` with stories
- [ ] `FilterOverflowMenu` with stories

### Week 3: Organism & Integration

- [ ] `FilterToolbar` organism with stories
- [ ] Responsive layout testing
- [ ] VR mode testing

### Week 4: Migration

- [ ] Migrate ViewsTab
- [ ] Migrate DatasetsTab
- [ ] Migrate FilesTab
- [ ] Migrate AnnotationsTab

### Week 5: Polish & Cleanup

- [ ] Deprecate old components
- [ ] Update documentation
- [ ] Performance testing
- [ ] Final QA

---

## Testing Requirements

### Unit Tests (useListFilter)

```javascript
describe('useListFilter', () => {
  it('filters by search query across configured fields', () => {});
  it('filters by selected types', () => {});
  it('filters by selected tags', () => {});
  it('applies quick filter predicates', () => {});
  it('sorts using configured comparators', () => {});
  it('combines multiple filters with AND logic', () => {});
  it('applies filters to multiple sections', () => {});
  it('persists state to localStorage when persistKey provided', () => {});
  it('loads persisted state on mount', () => {});
  it('clearAll resets all filters except sort', () => {});
});
```

### Component Tests

```javascript
describe('FilterToolbar', () => {
  it('renders full layout at ≥400px', () => {});
  it('renders compact layout at 300-399px', () => {});
  it('renders minimal layout at <300px', () => {});
  it('always renders full layout in VR mode', () => {});
  it('enforces single-line layout (no wrap)', () => {});
  it('shows overflow menu when quick filters exceed max', () => {});
  it('shows active filter count on clear button', () => {});
});
```

### Storybook Stories

Each component needs:
- Default state
- With active filters
- All responsive modes
- VR mode
- Interactive (with controls)

---

## Acceptance Criteria

### Functional Requirements

- [ ] Search filters items across configured fields
- [ ] Type dropdown shows categories with counts
- [ ] Types with 0 count are disabled
- [ ] Tags dropdown works with existing TagsDropdown
- [ ] Sort dropdown changes order
- [ ] Quick filters toggle independently
- [ ] Multiple filters combine with AND logic
- [ ] Clear button resets all filters
- [ ] Filter state persists across sessions

### Layout Requirements

- [ ] Full mode: Search on own row, dropdowns on second row
- [ ] Compact mode: All on single row, icon-only buttons
- [ ] Minimal mode: Combined filters dropdown
- [ ] **No wrapping** - single line enforced at all widths
- [ ] Quick filters overflow to +N more menu
- [ ] VR mode always uses full layout

### Performance Requirements

- [ ] Filter application is memoized
- [ ] No unnecessary re-renders
- [ ] Dropdowns lazy render content

### Accessibility Requirements

- [ ] All buttons have aria-labels
- [ ] Keyboard navigation works
- [ ] Focus management in dropdowns
- [ ] Screen reader announces filter changes

---

## Reference Materials

1. **Prototype:** `filter-system-prototype-v4.jsx` (attached to project)
2. **Existing Components:**
   - `src/ui/react/components/molecules/TagsDropdown/`
   - `src/ui/react/components/organisms/FilterBar/`
   - `src/ui/react/components/panels/LeftPanel/tabs/ViewsTab/hooks/useViewsTab.js`
3. **Design Tokens:** `src/ui/styles/tokens/`
4. **Icon Registry:** `src/ui/react/components/common/Icon/iconRegistry.js`

---

## Questions for Implementation

1. **localStorage key prefix:** Should we use a consistent prefix like `cia-web-` for all filter persistence keys?

2. **Tag data source:** Where do tags come from? Need to confirm API/manager for tag list.

3. **Type counts calculation:** Should counts be passed in, or should the hook accept the full item list to calculate internally?

4. **Migration strategy:** Migrate all tabs in one PR, or separate PRs per tab?

---

*Document created: January 29, 2025*
*Ready for Claude Code implementation*
