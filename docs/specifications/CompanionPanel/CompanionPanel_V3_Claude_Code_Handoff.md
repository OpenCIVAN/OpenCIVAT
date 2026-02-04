# CompanionPanel V3 — Claude Code Implementation Handoff

**Date:** February 2, 2026
**Status:** Ready for Implementation
**Priority:** Medium — Foundation component for content discovery
**Prototype Reference:** `companion-panel-v3.jsx` (project knowledge)
**Design Session:** `CompanionPanel_V3_Design_Session_Memory_Log.md`

---

## Executive Summary

Upgrade the existing CompanionPanel from 2 tabs (Datasets/Views) to 3 tabs (Datasets/Views/ViewGroups). Add contextual per-tab filter/sort dropdowns with independent state, a grid size picker with compatible/strict modes for VG filtering, and change usage indicators from blocking to informational (same item can be placed multiple times).

---

## Current State

The CompanionPanel already exists in the codebase at:
```
src/ui/react/components/panels/CanvasMapPanel/components/CompanionPanel/
├── CompanionPanel.jsx      ← Main component (basic 2-tab version)
├── CompanionPanel.scss     ← Styles
├── ViewListItem.jsx        ← View row component
├── DatasetItem.jsx         ← Dataset group component
└── index.js                ← Exports
```

**Problem:** This is nested under CanvasMapPanel, but it's reusable across Canvas Map, VG Editor, and LinkManager. It needs to be relocated and upgraded.

---

## Phase 1: Relocate to Shared Location

### Move CompanionPanel to shared components

Since the CompanionPanel is used by multiple panels, it should live in a shared location:

```
src/ui/react/components/panels/CompanionPanel/
├── CompanionPanel.jsx           ← Main reusable component
├── CompanionPanel.logic.js      ← Headless hook (useCompanionPanel)
├── CompanionPanel.scss          ← Styles
├── index.js
├── components/
│   ├── ViewItem.jsx             ← Draggable view row
│   ├── ViewItem.scss
│   ├── DatasetGroup.jsx         ← Collapsible dataset with nested views
│   ├── DatasetGroup.scss
│   ├── VGItem.jsx               ← NEW: Draggable VG template row
│   ├── VGItem.scss
│   ├── LayoutMiniPreview.jsx    ← NEW: Grid layout visualization
│   ├── LayoutMiniPreview.scss
│   ├── GridSizePicker.jsx       ← NEW: Rows×Cols spinner with mode toggle
│   ├── GridSizePicker.scss
│   ├── FilterDropdown.jsx       ← Contextual filter dropdown
│   ├── FilterDropdown.scss
│   ├── SortDropdown.jsx         ← Contextual sort dropdown
│   ├── SortDropdown.scss
│   ├── CollapsibleSection.jsx   ← NEW: Reusable section header
│   └── CollapsibleSection.scss
└── utils/
    ├── filterConfigs.js         ← TAB_FILTER_CONFIG, TAB_SORT_CONFIG
    └── constants.js             ← SCOPE_CONFIG, LAYOUT_CONFIG
```

### Update imports in consuming panels

```js
// CanvasMapPanel — update import path
import { CompanionPanel } from '@UI/react/components/panels/CompanionPanel';

// Future: VG Editor, LinkManager use same import
```

### Task checklist:
- [ ] Create new directory structure at shared location
- [ ] Move existing CompanionPanel files
- [ ] Update all import references (CanvasMapPanel, CanvasMapContent, index.js)
- [ ] Verify existing 2-tab functionality still works
- [ ] Remove old location after confirming imports

---

## Phase 2: Add ViewGroups Tab

### 2a: Create VGItem component

**File:** `components/VGItem.jsx`

```jsx
/**
 * @file VGItem.jsx
 * @description Draggable ViewGroup template row for the CompanionPanel VG tab.
 * Shows layout preview, name, datasets, grid size, scope, and placement count.
 * Always draggable — placement is informational, not blocking.
 */
```

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `vg` | `ViewGroupTemplate` | VG template data |
| `canvasCount` | `number` | How many copies on canvas (informational) |
| `onDragStart` | `(vg) => void` | Drag initiated |
| `onDragEnd` | `() => void` | Drag ended |
| `onClick` | `(vg) => void` | Clicked |

**Data shape expected (from server/Y.js):**
```ts
interface ViewGroupTemplate {
  id: string;
  name: string;
  layoutId: string;
  rows: number;           // grid row count
  cols: number;           // grid column count
  color: string;
  viewCount: number;
  scope: 'personal' | 'team' | 'project';
  createdBy: string;
  createdAt: string;      // ISO
  lastUsed: string | null;
  datasets: string[];     // source dataset names
  viewTypes: string[];    // view types contained
}
```

**Key behaviors:**
- Always `draggable` — no blocking based on canvas state
- `dataTransfer` sets `application/json` with `{ viewGroup: vg }`
- Shows `LayoutMiniPreview` (28px) with VG color
- Grid dimensions badge (e.g., `2×2`) on subtitle line
- Scope icon colored by scope type
- Canvas count: `x1`/`x2` with Copy icon, or time-ago if not placed

### 2b: Create LayoutMiniPreview component

**File:** `components/LayoutMiniPreview.jsx`

Small CSS grid visualization of VG layout structure:
- Takes `layoutId`, `color`, `viewCount`, `size` props
- Reads layout grid pattern from LAYOUT_CONFIG
- Renders cells with CSS grid, handles spans for merged cells
- Filled cells: `${color}40` background
- Empty cells: glass-subtle background
- Border: `${color}40`

For custom layouts (rows > 2 or cols > 2), render a simple rows×cols uniform grid.

### 2c: Create CollapsibleSection component

**File:** `components/CollapsibleSection.jsx`

Reusable section header with chevron, icon, title, count badge, and expand/collapse toggle. Used in VG tab for Recent/My Saved/Shared sections.

### 2d: Add third tab to CompanionPanel

**In `CompanionPanel.jsx`:**

1. Add `viewgroups` to tab definitions:
```js
const tabs = [
  { id: 'datasets', label: 'Datasets', icon: 'folder_open' },
  { id: 'views', label: 'Views', icon: 'list' },
  { id: 'viewgroups', label: 'VGs', icon: 'package' },
];
```

2. Add VG tab content with three `CollapsibleSection`s:
   - **Recent:** VGs used in last 7 days
   - **My Saved:** `scope === 'personal'`
   - **Shared:** `scope === 'team' || scope === 'project'`

3. Add new props to CompanionPanel:
```js
viewGroups = [],          // Array of VG templates
onVGDragStart,            // VG drag handler
onVGDragEnd,              // VG drag end handler
onVGClick,                // VG click handler
vgUsageLabel = 'On Canvas',
```

### Task checklist:
- [ ] Create `VGItem.jsx` + `.scss`
- [ ] Create `LayoutMiniPreview.jsx` + `.scss`
- [ ] Create `CollapsibleSection.jsx` + `.scss`
- [ ] Add `viewgroups` tab to CompanionPanel
- [ ] Add VG tab content with sections
- [ ] Wire new props through
- [ ] Update `index.js` exports

---

## Phase 3: Contextual Filter/Sort Per Tab

### 3a: Create filter config utilities

**File:** `utils/filterConfigs.js`

```js
/**
 * Filter and sort configurations per tab.
 * Each tab has its own set of filter options and sort fields.
 */
export const TAB_FILTER_CONFIG = {
  datasets: {
    label: 'FILTER BY VIEW TYPE',
    getOptions: (datasets) => { /* unique view types from datasets */ },
  },
  views: {
    label: 'FILTER BY VIEW TYPE',
    getOptions: (datasets) => { /* same view types */ },
  },
  viewgroups: {
    label: 'FILTER VIEWGROUPS',
    getOptions: () => [
      { id: '__scope_header', label: 'SCOPE', isHeader: true },
      { id: 'scope:personal', icon: 'person', label: 'Mine', color: 'cyan' },
      { id: 'scope:team', icon: 'group', label: 'Shared', color: 'amber' },
      { id: 'scope:project', icon: 'public', label: 'Project', color: 'purple' },
    ],
  },
};

export const TAB_SORT_CONFIG = {
  datasets: [
    { id: 'name', label: 'Name' },
    { id: 'type', label: 'Type' },
    { id: 'viewCount', label: 'View Count' },
  ],
  views: [
    { id: 'name', label: 'Name' },
    { id: 'type', label: 'Type' },
    { id: 'dataset', label: 'Dataset' },
  ],
  viewgroups: [
    { id: 'name', label: 'Name' },
    { id: 'lastUsed', label: 'Last Used' },
    { id: 'createdAt', label: 'Date Created' },
    { id: 'viewCount', label: 'View Count' },
  ],
};
```

### 3b: Implement independent per-tab state

In `CompanionPanel.logic.js` (headless hook):

```js
// Per-tab filter state (independent — switching tabs doesn't lose filters)
const [tabFilters, setTabFilters] = useState({
  datasets: [],
  views: [],
  viewgroups: [],
});

// Per-tab sort state
const [tabSort, setTabSort] = useState({
  datasets: { by: 'name', order: 'asc' },
  views: { by: 'name', order: 'asc' },
  viewgroups: { by: 'lastUsed', order: 'desc' },
});

// Grid size filter (VG tab only)
const [gridSizeFilter, setGridSizeFilter] = useState({
  rows: null, cols: null, strict: false
});
```

### 3c: Update FilterDropdown to be contextual

The FilterDropdown receives options per tab via props. For the VG tab, it also renders the GridSizePicker below the scope checkboxes.

Props additions:
```js
showGridSizer: boolean,     // true when activeTab === 'viewgroups'
gridRows, gridCols, gridStrict,
onGridRowsChange, onGridColsChange, onGridStrictToggle, onGridClear,
```

The "Clear All" button at the top resets both scope checkboxes AND grid size.

### Task checklist:
- [ ] Create `utils/filterConfigs.js`
- [ ] Move filter/sort state into `CompanionPanel.logic.js` hook
- [ ] Update `FilterDropdown.jsx` to accept contextual options + grid sizer slot
- [ ] Update `SortDropdown.jsx` to accept contextual options
- [ ] Wire tab-change to swap options without losing state
- [ ] Active filter badge count includes grid size as +1

---

## Phase 4: Grid Size Picker

### Create GridSizePicker component

**File:** `components/GridSizePicker.jsx`

**Structure:**
```
┌─────────────────────────┐
│  ROWS    ×    COLS      │  ← Spinner inputs (1–10)
│  [−][3][+]    [−][4][+] │
│                         │
│  [≤ Fits] [= Exact]    │  ← Mode toggle (appears when size set)
│                 Clear ← │
│                         │
│  Showing layouts that   │  ← Helper text
│  fit within 3×4         │
└─────────────────────────┘
```

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `rows` | `number \| null` | Current row filter (null = unset) |
| `cols` | `number \| null` | Current col filter (null = unset) |
| `strict` | `boolean` | true = exact match, false = fits within |
| `onRowsChange` | `(number \| null) => void` | Row value changed |
| `onColsChange` | `(number \| null) => void` | Col value changed |
| `onStrictToggle` | `(boolean) => void` | Mode toggled |
| `onClear` | `() => void` | Reset to null/null/false |

**Filtering logic (in hook):**
```js
if (strict) {
  // Exact: both dimensions must match (null = ignore that dimension)
  return (filterRows === null || vg.rows === filterRows)
      && (filterCols === null || vg.cols === filterCols);
} else {
  // Compatible: VG fits within specified size
  return (filterRows === null || vg.rows <= filterRows)
      && (filterCols === null || vg.cols <= filterCols);
}
```

### Task checklist:
- [ ] Create `GridSizePicker.jsx` + `.scss`
- [ ] Add spinner sub-component (reusable for row/col)
- [ ] Implement compatible/strict toggle with visual feedback
- [ ] Wire into FilterDropdown's VG tab section
- [ ] Add grid size filtering to VG `useMemo` filter chain

---

## Phase 5: Non-Blocking Usage Indicators

### Update ViewItem

**Change:** Remove all `isUsed` blocking logic.

Before:
```js
draggable={!disabled && !isUsed}
cursor: disabled || isUsed ? 'default' : 'grab'
opacity: isUsed ? 0.5 : 1
```

After:
```js
draggable={!disabled}        // isUsed doesn't block
cursor: disabled ? 'default' : 'grab'
opacity: 1                   // never dimmed for usage
```

**New prop:** `useCount` (number) — how many copies placed. Badge shows:
- `useCount === 0`: no badge (or `+` icon in tree view)
- `useCount === 1`: `In Use` text badge (green)
- `useCount > 1`: `x2`/`x3` badge (green)

### Update VGItem

Same pattern — always draggable. Shows copy icon + count.

### Update DatasetGroup

Pass through non-blocking behavior to nested ViewItems.

### Task checklist:
- [ ] Update `ViewItem.jsx` — remove isUsed blocking, add useCount prop
- [ ] Update `VGItem.jsx` — always draggable, show canvasCount
- [ ] Update `DatasetGroup.jsx` — pass through to ViewItem
- [ ] Update all consuming code that passes `usedViewIds` — keep passing for display, but no longer blocks interaction

---

## Phase 6: SCSS Migration

All new components should use SCSS co-located with their component files, following project conventions:

```scss
// GridSizePicker.scss
@use "theme" as *;

.grid-size-picker {
  padding: $spacing-xs $spacing-sm;
  
  &__row {
    display: flex;
    align-items: flex-end;
    gap: $spacing-xs;
    justify-content: center;
  }
  
  &__spinner { /* ... */ }
  &__separator { /* ... */ }
  &__mode-toggle { /* ... */ }
  &__helper { /* ... */ }
}
```

**Design tokens to use (from project SASS system):**
- Colors: `$color-bg-*`, `$color-text-*`, `$color-glass-*`, `$color-border-*`, `$color-accent-*`
- Spacing: `$spacing-xs` through `$spacing-xl`
- Radius: `$radius-sm`, `$radius-md`, `$radius-lg`
- Font: `$font-size-xs`, `$font-size-sm`, `$font-weight-medium`
- Transitions: `$transition-fast`

No hard-coded colors or spacing values. Import `theme.scss` for tokens.

---

## Implementation Order

```
Phase 1: Relocate CompanionPanel         [~1 hour]
    ↓
Phase 5: Non-blocking usage indicators   [~30 min]
    ↓ (least disruption — fixes existing behavior first)
Phase 2: Add ViewGroups tab              [~2 hours]
    ↓
Phase 3: Contextual filter/sort          [~1.5 hours]
    ↓
Phase 4: Grid Size Picker               [~1 hour]
    ↓
Phase 6: SCSS cleanup                    [~30 min]
```

**Total estimated:** ~6.5 hours

Phases 2–4 can be done incrementally with each phase leaving the panel functional.

---

## Testing Checkpoints

After each phase, verify:

1. **Phase 1:** Existing 2-tab panel works at new location. Canvas Map still opens companion.
2. **Phase 2:** VG tab renders with mock data. Three sections collapse/expand. Drag works.
3. **Phase 3:** Switching tabs changes filter/sort options. Per-tab state is independent. Badge count accurate.
4. **Phase 4:** Grid size picker renders. Compatible mode filters correctly. Strict mode filters correctly. Clear resets.
5. **Phase 5:** Views can be dragged even when "In Use." Count badge shows correctly. No visual dimming.
6. **Phase 6:** All components use SCSS tokens. No inline color values.

---

## Data Dependencies

The VG tab needs ViewGroup template data. This comes from:

1. **Server API:** `GET /api/sessions/:sessionId/view-groups/templates` — returns saved VG templates
2. **Y.js:** `yViewGroups` shared type for real-time collaborative VGs (current canvas state)
3. **Derived:** Canvas placement count is derived by counting VG instances on current canvas

**For initial implementation:** Use mock data matching the `ViewGroupTemplate` interface above. Wire to real data when the server endpoints exist.

---

## Files to Reference

| File | Purpose |
|------|---------|
| `companion-panel-v3.jsx` | Design prototype with all features |
| `CompanionPanel_V3_Design_Session_Memory_Log.md` | Design decisions and rationale |
| `CompanionPanel_Design_Session_Memory_Log.md` | Original V1/V2 design decisions |
| `Canvas_Map_Tab_Content_Session_Memory_Log.md` | How CompanionPanel relates to Canvas Map |
| `Unified_Filter_System_Claude_Code_Handoff.md` | Related filter system patterns |
| `src/ui/react/components/panels/CompanionPanel/` | Current implementation location |
| `src/ui/react/components/common/ViewItem/` | Existing shared ViewItem component |

---

## Prompt to Start Implementation

```
Implement CompanionPanel V3 for CIA Web. Search project knowledge for:
- CompanionPanel_V3_Claude_Code_Handoff.md (this document)
- CompanionPanel_V3_Design_Session_Memory_Log.md
- CompanionPanel_Design_Session_Memory_Log.md

Start with Phase 1 (relocate to shared location), then Phase 5 (non-blocking usage),
then Phase 2 (add ViewGroups tab). Use the prototype companion-panel-v3.jsx as the
visual reference.

Key principles:
- Headless hook pattern: logic in .logic.js, presentation in .jsx
- SCSS with design tokens from theme.scss (no hardcoded values)
- Icon component from @UI/react/components/atoms/Icon (not Lucide directly)
- Per-tab independent filter state
- Non-blocking usage indicators (items always draggable)
- VG data uses mock for now, wire to server when endpoints exist
```

---

*End of Handoff*
