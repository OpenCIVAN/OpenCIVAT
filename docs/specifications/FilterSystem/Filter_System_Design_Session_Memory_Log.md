# Filter System Design Session Memory Log

**Date:** January 29, 2025  
**Session Focus:** Unified Filter System Architecture & Responsive Design  
**Status:** Design Complete, Ready for Implementation  
**Artifacts:** `filter-system-prototype-v5.jsx`, `Unified_Filter_System_Claude_Code_Handoff.md`

---

## Session Summary

Designed a unified filter system to replace duplicated filtering logic across CIA Web tabs. The system consists of a headless hook (`useListFilter`) and composable UI components that adapt to three responsive breakpoints while enforcing single-line layouts.

---

## Key Decisions

### [DECISION] Three-Layer Architecture

**Problem:** Filter logic duplicated across 5+ locations with inconsistent implementations.

**Solution:**
```
LAYER 1: useListFilter hook (headless, pure logic)
    ↓
LAYER 2: Per-tab filter configurations
    ↓
LAYER 3: UI components (molecules + organisms)
```

**Rationale:** 
- DRY: Single source of truth for filter logic
- Contributor-friendly: Clear separation of logic and UI
- Plugin-compatible: New instance types define their own configs
- Testable: Hook logic unit-testable without UI

---

### [DECISION] Responsive Breakpoints

| Mode | Width | Layout |
|------|-------|--------|
| **Full** | ≥400px | Two rows: Search on top, dropdowns + clear below |
| **Compact** | 300-399px | Single row, icon-only dropdowns with tooltips |
| **Minimal** | <300px | Single row, combined Filters dropdown (Types+Tags) |

**VR Override:** Always use Full mode (labels needed, no tooltips in VR)

---

### [DECISION] Single-Line Enforcement for Quick Filters

**Problem:** Quick filter chips were wrapping to multiple lines, especially in Full mode, consuming excessive vertical space.

**Solution:** Cap visible chips and use overflow menu:

| Mode | Max Visible | Overflow |
|------|-------------|----------|
| Full | 3 chips | +1 more menu |
| Compact | 3 chips | +1 more menu |
| Minimal | 2 chips | +2 more menu |

**Critical CSS:**
```css
.quick-filters-row {
  flex-wrap: nowrap;  /* NEVER wrap */
  overflow: hidden;
}
```

**Overflow Menu Features:**
- Shows remaining filters with counts
- Badge on trigger when hidden filters are active
- Tooltip on trigger showing "N more filters"

---

### [DECISION] Minimal Mode - Combined Filters Dropdown (Option A)

**Problem:** At <300px, separate Type/Tag/Sort buttons don't fit.

**Rejected Option B:** Single dropdown with Types, Tags, AND Sort tabs
- Cons: Changing sort requires two clicks

**Chosen Option A:** Combined dropdown for Types+Tags only, Sort stays separate
```
[🔍 Search] [⚙️ Filters▾] [↕️ Sort▾] [✕]
                ↓
        ┌──────────────────┐
        │ [Types²] [Tags³] │  ← Only 2 tabs
        └──────────────────┘
```

**Rationale:**
- Sort is used frequently → deserves one-click access
- Clean mental model: Filters = what to show, Sort = how to order
- Combined dropdown stays focused on filtering concern

---

### [DECISION] TypeFilterDropdown Features

- **Categorized:** Medical Imaging, 3D Meshes, Images, Documents
- **Searchable:** Filter types within dropdown
- **Counts:** Show count per type: "NIfTI (23)"
- **Disabled state:** Grey out types with 0 count
- **Bulk actions:** Select All / Clear buttons
- **Scalable:** Designed to handle 50+ types

---

### [DECISION] Quick Filter Guidelines

- **Max 4 definitions per tab** (3 visible + 1 overflow in Full mode)
- **Binary toggles only** (on/off, no multi-select)
- **High-frequency filters:** Loaded, Starred, Shared, Linked
- **AND logic:** Multiple active quick filters combine with AND
- **Contextual to tab:** Each tab defines its own quick filters

---

### [DECISION] Filter Persistence Strategy

**Phase 1:** localStorage per-tab
- Key format: `cia-web-{tabName}-filters`
- Persists: search, types, tags, quickFilters, sortBy

**Phase 2:** Server sync as user preferences (future)

**URL Sync:** Deferred - add for specific share use cases later

---

## Component Specifications

### useListFilter Hook

```javascript
const filter = useListFilter({
  searchFields: (item) => [item.name, item.type],
  quickFilterDefs: QUICK_FILTER_DEFS,
  typeCategories: TYPE_CATEGORIES,
  sortOptions: SORT_OPTIONS,
  persistKey: 'cia-web-files-filters',
});

// Returns:
// State: searchQuery, selectedTypes, selectedTags, quickFilters, sortBy
// Computed: hasActiveFilters, activeFilterCount
// Actions: setSearchQuery, toggleType, toggleTag, toggleQuickFilter, etc.
// Filters: applyFilters(items), applyToSections({section: items})
```

### FilterToolbar Props

```typescript
interface FilterToolbarProps {
  filter: UseListFilterReturn;      // From hook
  config: FilterConfig;             // Tab-specific config
  counts?: Record<string, number>;  // Type counts
  tags?: Tag[];                     // Available tags
  layout?: 'full' | 'compact' | 'minimal' | 'auto';
  width?: number;                   // For auto layout
  searchPlaceholder?: string;
  showQuickFilters?: boolean;
  maxVisibleQuickFilters?: number;  // Default: 3
}
```

### Per-Tab Configurations

**Files Tab:**
- Quick: Loaded, Starred, Shared, Linked
- Types: 4 categories, 17+ types
- Tags: Enabled
- Sort: Name, Date, Size, Type

**Views Tab:**
- Quick: Active, Inactive, Shared, Linked
- Types: Disabled (views don't have types)
- Tags: Enabled
- Sort: Position, Name, Recent, Dataset

**Datasets Tab:**
- Quick: Loaded, Has Views
- Types: By dataset type
- Tags: Enabled
- Sort: Name, Date, Size, View Count

**Annotations Tab:**
- Quick: Mine, Visible, Locked
- Types: Point, Region, Measure, Angle, Text
- Tags: Enabled
- Sort: Name, Date, Type, Author

---

## File Structure

```
src/ui/react/
├── hooks/
│   └── useListFilter/
│       ├── index.js
│       ├── useListFilter.js
│       ├── useListFilter.test.js
│       └── filterConfigs/
│           ├── filesFilterConfig.js
│           ├── viewsFilterConfig.js
│           ├── datasetsFilterConfig.js
│           └── annotationsFilterConfig.js
│
├── components/
│   ├── molecules/
│   │   ├── QuickFilterChip/
│   │   ├── TypeFilterDropdown/
│   │   ├── SortDropdown/
│   │   ├── FilterOverflowMenu/
│   │   └── CombinedFiltersDropdown/
│   │
│   └── organisms/
│       └── FilterToolbar/
```

---

## Visual Reference

### Full Mode (400px)
```
┌────────────────────────────────────────────────────┐
│ [🔍 Search files by name, type, or tag...        ] │
│ [Types▾] [Tags▾] [Sort▾]              [X 3]       │
├────────────────────────────────────────────────────┤
│ Quick: [Loaded 8] [Starred 5] [Shared 5] [+1]     │
└────────────────────────────────────────────────────┘
```

### Compact Mode (300px)
```
┌──────────────────────────────────────┐
│ [🔍 Search...] [📁²][🏷️][↕️] [X]    │
├──────────────────────────────────────┤
│ Quick: [✓8] [★5] [👥5] [+1]         │
└──────────────────────────────────────┘
```

### Minimal Mode (240px)
```
┌────────────────────────────┐
│ [🔍 Search] [⚙️²] [↕️] [X] │
│              ↓             │
│     ┌─────────────────┐    │
│     │ [Types] [Tags]  │    │
│     └─────────────────┘    │
├────────────────────────────┤
│ Quick: [✓8] [★5] [+2]      │
└────────────────────────────┘
```

---

## Implementation Artifacts

1. **Prototype:** `filter-system-prototype-v5.jsx`
   - Fully interactive React component
   - All three responsive modes
   - Working overflow menus
   - Combined Filters dropdown with tabs

2. **Handoff Doc:** `Unified_Filter_System_Claude_Code_Handoff.md`
   - Complete implementation spec
   - Component code examples
   - Migration plan (5 phases)
   - Testing requirements
   - Acceptance criteria

---

## Migration Plan

### Phase 1: Create New Components (No Breaking Changes)
- Implement useListFilter hook
- Create all molecules and FilterToolbar organism
- Add Storybook stories

### Phase 2: Migrate Tabs (One at a Time)
- ViewsTab → DatasetsTab → FilesTab → AnnotationsTab
- Each migration: Replace internal filter state with hook

### Phase 3: Deprecate Old Components
- Mark old FilterBar as deprecated
- Remove duplicated filter logic from tab hooks

### Phase 4: Cleanup
- Remove old FilterBar component
- Update documentation

---

## Open Questions for Implementation

1. **localStorage prefix:** Use `cia-web-` for all filter keys?
2. **Tag data source:** Where does the tag list come from? API/manager?
3. **Type counts:** Pass in counts, or have hook calculate from items?
4. **Migration strategy:** One big PR or per-tab PRs?

---

## VR Considerations

- VR always uses Full layout (labels needed)
- Quick filters show all chips in VR (no overflow menu - tooltips don't work)
- All atoms use useAdaptive() for sizing:
  - Touch targets: 44px minimum
  - Font sizes: 14px vs 11px desktop
  - Icon sizes: 22px vs 14px

---

## Benefits Summary

| Benefit | How Achieved |
|---------|--------------|
| DRY | Single hook reused everywhere |
| Contributor-friendly | Clear logic/UI separation |
| Plugin-compatible | Tabs define own filterDefs |
| VR-adaptive | Atoms handle sizing, organisms handle layout |
| Testable | Hook logic unit-testable |
| Scalable | TypeFilterDropdown handles 50+ types |
| Space-efficient | Single-line layouts, overflow menus |
| Predictable | No wrapping, consistent heights |

---

## Next Steps

1. Hand off to Claude Code for implementation
2. Review prototype with team
3. Begin Phase 1 implementation
4. Iterate on feedback

---

*Session completed: January 29, 2025*
