# CompanionPanel V3 — ViewGroups Tab & Grid Filter Design Session Memory Log

**Date:** February 2, 2026
**Session Focus:** Adding ViewGroups tab, contextual per-tab filters, grid size picker, and non-blocking usage indicators
**Previous Sessions:** CompanionPanel Design (Jan 31), Canvas Map Tab Content Planning (Feb 2)

---

## Summary

Extended the reusable CompanionPanel from 2 tabs (Datasets/Views) to 3 tabs (Datasets/Views/ViewGroups). The VG tab provides a library of saved and shared VG templates that users can drag onto the canvas. Added contextual filter/sort that swaps options per tab, with independent per-tab filter state. Added a grid size picker with compatible/strict modes. Changed "In Use" and "On Canvas" indicators from blocking to informational — users can place the same view or VG template multiple times.

---

## Key Decisions Made

### 1. Three Tabs: Datasets | Views | ViewGroups

| Tab | Content | Mental Model |
|-----|---------|--------------|
| **Datasets** | Tree view — collapsible datasets with nested views | "Browse by source file" |
| **Views** | Flat list — all views sorted/filtered | "Find a specific view quickly" |
| **ViewGroups** | Saved/shared VG templates in sections | "Reuse a pre-built arrangement" |

Tab order rationale: Datasets first because it's the most fundamental unit (raw data), Views second as a different lens on the same content, ViewGroups third as the highest-level composed unit.

### 2. ViewGroups Tab Sections

Three collapsible sections in the VG tab:

| Section | Contents | Default |
|---------|----------|---------|
| **Recent** | VGs used in last 7 days | Expanded |
| **My Saved** | Personal VG templates (scope: personal) | Expanded |
| **Shared** | Team + project-scoped templates, shows creator | Expanded |

A VG can appear in both Recent AND My Saved/Shared (Recent is a time filter, not exclusive).

### 3. VG Item Design

Each VG template row shows:
- **Drag handle** (grip icon) — always active
- **Layout mini-preview** (28px colored grid cells showing layout structure)
- **Name** (bold, ellipsis overflow)
- **Grid dimensions badge** (e.g., `2×2`, `4×6`) — small chip on subtitle line
- **Source datasets** (comma-separated, ellipsis)
- **View count badge** (e.g., `3v`) — colored with VG's color
- **Scope icon** (User/Users/Globe) — colored by scope
- **Placed count OR time** — `x1`/`x2` with copy icon if on canvas, "2h ago"/"3d ago" if not

### 4. Non-Blocking Usage Indicators (Critical Decision)

**Previous behavior:** "In Use" / "On Canvas" dimmed items and blocked drag/click.

**New behavior:** Placing a VG on canvas creates a NEW INSTANCE (copy with its own server-generated ID). Same for views — a user might want the same volume in multiple VGs for comparison.

- Views: always draggable/clickable. Badge shows `In Use` for 1 copy, `x2`/`x3` for multiples
- VGs: always draggable/clickable. Shows copy icon + count next to time-ago
- No dimming, no cursor blocking
- `disabled` prop still works for genuinely incompatible items (e.g., wrong view type for a VG slot)

### 5. Contextual Filter/Sort Per Tab

The search bar is **shared** (always works, filters by name/text on any tab). Filter and sort dropdowns swap their options based on active tab:

| Tab | Search Targets | Filter Options | Sort Options |
|-----|---------------|----------------|--------------|
| **Datasets** | Dataset name, view names | View type (volume, slice, mesh...) | Name, Type, View Count |
| **Views** | View name, type, dataset | View type (same set) | Name, Type, Dataset |
| **ViewGroups** | VG name, datasets, creator | Scope (Mine/Shared/Project) + Grid Size picker | Name, Last Used, Date Created, View Count |

**Filter state is independent per tab.** Switching tabs preserves each tab's filters. Rationale: you might filter Views to "slices only," check ViewGroups, come back, and still have your slice filter active.

### 6. Grid Size Picker (VG Filter)

Replaces static layout preset checkboxes. Located in the filter dropdown below scope checkboxes, under a "GRID SIZE" section header.

**Components:**
- Two spinner inputs: **Rows** (1–10) × **Cols** (1–10) with +/− buttons and direct number entry
- Mode toggle (appears once a size is set):
  - **≤ Fits** (cyan, default): VGs whose grid fits WITHIN the specified size (`vg.rows <= filterRows && vg.cols <= filterCols`)
  - **= Exact** (amber): Only VGs with exactly that grid size
- **Clear** button to reset
- Helper text: "Showing layouts that fit within 3×4" or "Showing only 5×6 layouts"

**Null handling:** Either dimension can be unset — if only rows is set, cols is ignored (and vice versa).

**Data model addition:** VG data now includes `rows` and `cols` fields (integers) derived from the layout grid definition.

### 7. Filter Badge Count

The filter button badge (top-right circle) counts: `scope checkboxes active + (grid size set ? 1 : 0)`. Grid size counts as one filter regardless of how many dimensions are set.

### 8. Layout Mini-Preview Component

`LayoutMiniPreview` renders a small grid visualization showing the VG's layout structure:
- Takes `layoutId`, `color`, `viewCount`, `size` props
- Renders CSS grid matching the layout pattern (handles spans for merged cells)
- Filled cells colored with VG's color at 40% opacity
- Empty cells show subtle glass background
- Border matches VG color at 40% opacity

---

## Component Architecture

```
CompanionPanel (reusable)
├── Header (title, subtitle, close)
├── Subtabs (Datasets | Views | VGs)
├── SearchRow (shared search + contextual filter/sort buttons)
│   ├── FilterDropdown (contextual per tab)
│   │   ├── Checkbox options (scope/view types)
│   │   └── GridSizePicker (VG tab only)
│   └── SortDropdown (contextual per tab)
├── Content Area (scrollable, per tab)
│   ├── DatasetsTab → DatasetGroup[] → ViewItem[]
│   ├── ViewsTab → ViewItem[] (flat, with dataset shown)
│   └── ViewGroupsTab → CollapsibleSection[] → VGItem[]
│       ├── Recent section
│       ├── My Saved section
│       └── Shared section
└── Footer (stats + contextual drop hint)
```

### New/Updated Components

| Component | Status | Description |
|-----------|--------|-------------|
| `CompanionPanel` | Updated | Added VG tab, contextual filters, grid size state |
| `VGItem` | New | Draggable VG template row with preview + metadata |
| `LayoutMiniPreview` | New | Small grid visualization of layout structure |
| `GridSizePicker` | New | Rows×Cols spinners with compatible/strict toggle |
| `CollapsibleSection` | New | Reusable section header with expand/collapse |
| `FilterDropdown` | Updated | Now supports grid size picker slot and contextual "Clear All" |
| `ViewItem` | Updated | Non-blocking usage, supports `useCount` prop |
| `DatasetGroup` | Unchanged | Same tree view behavior |

### Props API Additions

**New CompanionPanel props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `viewGroups` | `ViewGroup[]` | `[]` | Array of saved VG templates |
| `vgUsageLabel` | `string` | `"On Canvas"` | Label for placed VGs |
| `onVGDragStart` | `(vg) => void` | - | VG drag started |
| `onVGDragEnd` | `() => void` | - | VG drag ended |
| `onVGClick` | `(vg) => void` | - | VG clicked |

**ViewGroup data shape:**

```js
{
  id: string,
  name: string,
  layoutId: string,       // layout pattern identifier
  rows: number,           // grid row count (NEW)
  cols: number,           // grid column count (NEW)
  color: string,          // VG theme color
  viewCount: number,
  scope: 'personal' | 'team' | 'project',
  createdBy: string,
  createdAt: string,      // ISO datetime
  lastUsed: string | null,// ISO datetime or null
  datasets: string[],     // source dataset names
  viewTypes: string[],    // view types contained
  isOnCanvas: boolean,    // currently placed (informational)
}
```

---

## Relationship to Other Panels

| Panel | Uses CompanionPanel for | VG Tab Relevant? |
|-------|------------------------|------------------|
| **Canvas Map** | Adding content to canvas | Yes — drag VG templates to canvas |
| **VG Editor** | Adding views to layout slots | Maybe — could drag VG as starting point |
| **LinkManager** | Selecting views to link | No — linking individual views, not VGs |

The CompanionPanel is context-aware via props. Each parent panel configures: title, subtitle, labels, hints, default tab, and available callbacks.

---

## Layout Templates vs VG Templates (Recap from Previous Session)

| Type | Location | Creates | Content |
|------|----------|---------|---------|
| **Quick Layout Templates** | Canvas Map Layout tab | Empty VG shell | Structural patterns only (1x1, 1x2, etc.) |
| **Custom VG Templates** | CompanionPanel VG tab | Pre-configured VG | Full blueprint: layout + views + widgets + filters |

Quick templates are VERBS ("create a shape"), custom VG templates are NOUNS ("this configured thing"), VG Editor is the BRIDGE between them.

---

## Files

- **Prototype**: `/mnt/user-data/outputs/companion-panel-v3.jsx`
- **Previous V2**: `/mnt/user-data/outputs/companion-panel-v2.jsx` (project knowledge)
- **Previous memory log**: `CompanionPanel_Design_Session_Memory_Log.md` (project knowledge)

---

## Decisions Log

| Decision | Rationale |
|----------|-----------|
| Tab order: Datasets → Views → VGs | Ascending granularity: raw → individual → composed |
| VG sections: Recent / My Saved / Shared | Quick access to recent, clear ownership separation |
| Non-blocking usage indicators | Users need same view in multiple VGs for comparison |
| Usage shows count (x2, x3) | Informational awareness without restricting workflow |
| Contextual filter dropdown | Same UI pattern, different content per tab |
| Independent per-tab filter state | Switching tabs shouldn't lose your filter context |
| Grid size picker replaces static presets | Scales to 10x10 canvas, presets can't cover all sizes |
| Compatible (≤) vs Strict (=) modes | "What fits here" is the common case, exact match for precision |
| Grid dimensions on VG items | Users need to see sizes at a glance for spatial planning |
| "Clear All" in filter dropdown | Single action to reset scope + grid size |
| VG data model includes rows/cols | Derived from layout grid, needed for size filtering |

---

## Next Steps

1. **Claude Code implementation** — See `CompanionPanel_V3_Claude_Code_Handoff.md`
2. **VG Editor design** — Separate session for the drill-in editing panel
3. **LinkManager design** — Separate panel with own minimap
4. **Integration testing** — CompanionPanel alongside Canvas Map prototype

---

## Continuation Prompt

```
I'm continuing the CompanionPanel V3 implementation for CIA Web. Please search project knowledge for:
- CompanionPanel_V3_Design_Session_Memory_Log.md (this document)
- CompanionPanel_Design_Session_Memory_Log.md (original design)
- Canvas_Map_Tab_Content_Session_Memory_Log.md (tab structure context)
- CompanionPanel_V3_Claude_Code_Handoff.md (implementation plan)

Context:
- CompanionPanel has 3 tabs: Datasets | Views | ViewGroups
- Contextual filter/sort per tab with independent state
- VG tab has grid size picker (compatible/strict modes)
- Usage indicators are informational, not blocking
- Same view/VG can be placed multiple times (creates new instances)

I'd like to [implement in codebase / design VG Editor / integrate with Canvas Map / etc.].
```

---

*End of Memory Log*
