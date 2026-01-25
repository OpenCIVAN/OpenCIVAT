# ViewGroup Selector & Footer 2 Links - Claude Code Handoff

**Date:** January 25, 2026  
**Session:** ViewGroup Selector Design Session  
**Prototype:** `viewgroup-selector-v3.jsx`  
**Status:** Ready for implementation

---

## Overview

This handoff covers the ViewGroup Selector component in Footer 2, including the enhanced Links system with responsive behavior. The design integrates with the existing `ViewLinkingService` and `LinkManagerPanels` components.

---

## Architecture Summary

### Component Hierarchy

```
Footer2/
├── FocusSubsetSection/
│   ├── FocusButton
│   └── SubsetDropdown
├── UniversalActionsSection/
│   ├── SnapshotButton
│   └── ResetViewButton
├── TypeSpecificSection/
│   └── (varies by active view type)
├── ViewGroupSelector/
│   ├── ViewGroupSelectorTrigger
│   └── ViewGroupSelectorDropdown/
│       ├── SearchInput
│       ├── ViewGroupList/
│       │   └── ViewGroupRow (with Settings/GoTo actions)
│       └── CreateViewGroupPopover/
│           ├── QuickCreateTemplates
│           ├── FromSavedSection
│           └── AdvancedLink
├── LinksSection/
│   ├── ExpandedLinks (Full mode)
│   │   └── LinkPropertyIndicator[] (one per property)
│   └── CollapsedLinksIndicator (Compact/Minimal mode)
│       └── ColoredDots or Count
└── VRButton
```

### Integration Points

| Component | Integrates With | Notes |
|-----------|-----------------|-------|
| ViewGroupSelector | `ViewConfigurationManager` | Get/set active ViewGroup |
| ViewGroupSelector | Y.js `yViews` | Real-time ViewGroup sync |
| LinksSection | `ViewLinkingService` | Existing link service |
| LinksSection | `LINK_PROPERTIES` from `linkConstants.js` | Property definitions |
| LinksPopover | `ViewLinkManager` | Opens existing panel |
| CreatePopover | LayoutTab | "Advanced" opens Layout Tab |
| GoTo action | CanvasManager | Pan/zoom to ViewGroup |

---

## Responsive Breakpoints

### Footer 2 Breakpoints

```typescript
const FOOTER_BREAKPOINTS = {
  MIN_WIDTH: 450,      // Enforced minimum, horizontal scroll below
  MINIMAL: 600,        // 450-599px
  COMPACT: 900,        // 600-899px  
  FULL: 900,           // 900px+
};
```

### Behavior by Mode

| Mode | Width | Links | ViewGroup | Labels | Type-specific | Universal |
|------|-------|-------|-----------|--------|---------------|-----------|
| Full | ≥900px | All expanded | Full name (160px max) | Visible | Visible | Visible |
| Compact | 600-899px | Collapsed + dots | Truncated (120px max) | Hidden | Hidden | Visible |
| Minimal | 450-599px | Icon + count | Color dot only (44px) | Hidden | Hidden | Hidden |
| Min-width | <450px | Enforce 450px, scroll | — | — | — | — |

### Workspace Minimum Sizes

```typescript
const sizing = {
  minWorkspaceWidth: 450,    // Overall workspace container
  minWorkspaceHeight: 300,   // Overall workspace container
  minCanvasWidth: 280,       // Individual canvas tile
  minCanvasHeight: 200,      // Individual canvas tile
  minPopoutWidth: 200,       // Floating popout window
  minPopoutHeight: 150,      // Floating popout window
};
```

---

## Link Properties

### Universal Properties (all view types)

```typescript
const LINK_PROPERTIES = [
  { id: 'camera', icon: 'camera', label: 'Camera', color: '#14b8a6', order: 1 },
  { id: 'filters', icon: 'filter', label: 'Filters', color: '#a855f7', order: 2 },
  { id: 'colorMaps', icon: 'palette', label: 'Colors', color: '#ec4899', order: 3 },
  { id: 'widgets', icon: 'layout', label: 'Widgets', color: '#f59e0b', order: 4 },
  { id: 'cursors', icon: 'crosshair', label: 'Cursors', color: '#22d3ee', order: 5 },
  { id: 'annotations', icon: 'edit', label: 'Annotations', color: '#fb923c', order: 6 },
];
```

### Type-Specific Properties

```typescript
const TYPE_SPECIFIC_LINK_PROPERTIES = [
  { id: 'windowLevel', icon: 'sliders', label: 'Window/Level', color: '#3b82f6', 
    applicableTypes: ['vtk-slice', 'vtk-volume'], order: 7 },
  { id: 'slicePosition', icon: 'layers', label: 'Slice', color: '#22c55e', 
    applicableTypes: ['vtk-slice'], order: 8 },
  { id: 'timePosition', icon: 'clock', label: 'Time', color: '#f59e0b', 
    applicableTypes: ['vtk-4d', 'timeseries'], order: 9 },
];
```

### Collapsed Links - Dot Order

The colored dots in compact mode follow the `order` field for consistency:
1. Camera (teal)
2. Filters (purple)
3. Colors (pink)
4. Widgets (amber)
5. Cursors (cyan)
6. Annotations (orange)

---

## ViewGroup Selector Dropdown

### Structure

```
┌─────────────────────────────────────────────────────┐
│ [🔍 Search groups...]                               │
├─────────────────────────────────────────────────────┤
│ ■ MRI Slices (4 views) 🔗              [⚙️][👁️]   │ ← Active
│ ■ Analysis (3 views) 🔗                [⚙️][👁️]   │
│ ■ Tumor Comparison (4 views)           [⚙️][👁️]   │
├─────────────────────────────────────────────────────┤
│ [+ Create New ViewGroup]                            │
└─────────────────────────────────────────────────────┘
```

### ViewGroupRow Data

```typescript
interface ViewGroupRowProps {
  viewGroup: {
    id: string;
    name: string;
    color: string;
    layoutId: string;
    views: string[];
    linkedTo: string | null;  // ViewGroup-to-ViewGroup link
    linkStats: Record<string, LinkStat>;
  };
  isActive: boolean;
  onSelect: () => void;
  onGoTo: () => void;
  onOpenSettings: () => void;
}

interface LinkStat {
  count: number;
  mode?: 'follow' | 'sync' | 'broadcast';
  linkedViews?: string[];
}
```

### Row Actions

| Action | Trigger | Behavior |
|--------|---------|----------|
| Select | Click row | Sets active ViewGroup, shows link reminder if has links |
| Settings | Click ⚙️ | Opens ViewGroupSettingsPopover |
| Go To | Click 👁️ | Pans canvas to center on ViewGroup, flashes border |

---

## Create ViewGroup Popover

### Structure

```
┌─────────────────────────────────────────────────────┐
│ ← Back             Create ViewGroup                 │
├─────────────────────────────────────────────────────┤
│ QUICK CREATE                                        │
│ [Single] [1+2] [2×2] [3-up] [2+1]                  │
├─────────────────────────────────────────────────────┤
│ FROM SAVED                                          │
│ ■ MRI Standard Layout (2×2)                         │
│ ■ Comparison View (1+2)                             │
│ ─── or empty state ───                              │
│ "No saved templates yet"                            │
├─────────────────────────────────────────────────────┤
│ [⚙️ Advanced: Open Layout Tab →]                   │
└─────────────────────────────────────────────────────┘
```

### Key Behaviors

- **FROM SAVED section always visible** (shows empty state if no templates)
- **Quick Create** → Creates ViewGroup at next available canvas position, auto-selects
- **From Saved** → Creates instance from saved template
- **Advanced** → Opens Layout Tab for full canvas grid control

---

## ViewGroup Settings Popover

### Structure

```
┌─────────────────────────────────────────────────────┐
│ ViewGroup Settings                             [X]  │
├─────────────────────────────────────────────────────┤
│ Name: [MRI Slices________]                          │
│ Color: ● ● ● ● ● ● ●                               │
│ Layout: [2×2          ▼]                            │
│                                                     │
│ ┌─ 🔗 Linked to ─────────────────────────────────┐ │
│ │ ■ Analysis ViewGroup           [Unlink]        │ │
│ └────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ [💾 Save as Template] [📋] [🗑️]                    │
│ [✨ Edit in Layout Tab →]                          │
├─────────────────────────────────────────────────────┤
│ [        Save Changes        ]                      │
└─────────────────────────────────────────────────────┘
```

### Actions

| Action | Behavior |
|--------|----------|
| Save as Template | Saves ViewGroup config (layout, views, colors) as reusable template |
| Duplicate | Opens DuplicationDialog |
| Delete | Confirms and removes ViewGroup |
| Edit in Layout Tab | Opens Layout Tab with this ViewGroup selected |
| Unlink | Breaks ViewGroup-to-ViewGroup link |

---

## Duplication Dialog

### Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ Duplicate "MRI Slices"                                     [X]  │
├─────────────────────────────────────────────────────────────────┤
│ This ViewGroup has links to:                                    │
│ [📷 Camera (2)] [🎚️ Filters (1)] [👆 Cursors (3)]              │
│                                                                 │
│ How should we handle links?                                     │
│                                                                 │
│ ○ Keep individual links                                         │
│   Copy inherits same link targets (retained if ViewGroup        │
│   link is later broken)                                         │
│                                                                 │
│ ● Link to original ⭐ RECOMMENDED                               │
│   New group syncs with original ViewGroup                       │
│                                                                 │
│ ○ No links                                                      │
│   Start fresh, configure manually                               │
│                                                                 │
│ ⚠️ Individual links will be retained but temporarily disabled   │
│    while ViewGroup linking is active.                           │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel] [Duplicate]               │
└─────────────────────────────────────────────────────────────────┘
```

### Link Handling Options

| Option | Default | Behavior |
|--------|---------|----------|
| Keep individual links | No | Duplicate inherits same link targets as original |
| **Link to original** | **Yes** | Creates ViewGroup-to-ViewGroup sync; individual links disabled but retained |
| No links | No | Clean slate, no links configured |

### Critical Implementation Note

When "Link to original" is selected:
1. Individual links are **retained in data model** but **disabled**
2. ViewGroup-to-ViewGroup link takes precedence
3. If ViewGroup link is later broken, individual links can be re-enabled
4. This prevents data loss while avoiding conflicting sync sources

---

## Link Reminder Toast

### Trigger

Shows **once** when user activates a ViewGroup that has active links.

### Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔗 This ViewGroup has active links                              │
│    6 properties syncing with other views                        │
│                         [Disable Links] [Got it]                │
└─────────────────────────────────────────────────────────────────┘
```

### Behavior

- **Purpose:** Reminder, not blocking confirmation
- **Shows:** On first activation of a linked ViewGroup per session
- **"Got it":** Dismisses, allows sync to proceed
- **"Disable Links":** Disables all incoming sync for this ViewGroup

### Philosophy

This is an "always-on" sync system for synchronous collaboration. We don't ask on every change - just a one-time reminder so users know their view may shift due to linked changes.

---

## Collapsed Links Indicator

### Compact Mode (600-899px)

```tsx
<CollapsedLinksIndicator mode="compact">
  [🔗 ●●○○●○]
</CollapsedLinksIndicator>
```

- Colored dots in fixed order (see Link Properties section)
- Filled dot = linked, empty dot = not linked
- Click opens LinksPopover

### Minimal Mode (450-599px)

```tsx
<CollapsedLinksIndicator mode="minimal">
  [🔗 6]
</CollapsedLinksIndicator>
```

- Just link icon + count of active links
- Click opens LinksPopover

---

## Links Popover

### Structure

```
┌─────────────────────────────────────┐
│ 🔗 Active Links              [6]   │
├─────────────────────────────────────┤
│ [📷 2] Camera                       │
│        ↔ Sync with Analysis, +1     │
│ [🎚️ 1] Filters                     │
│        ← Follow Analysis            │
│ [🎨 —] Colors                       │
│        Not linked                   │
│ [📦 —] Widgets                      │
│        Not linked                   │
│ [👆 3] Cursors                      │
│        ↔ Sync with 3 views          │
│ [📝 —] Annotations                  │
│        Not linked                   │
├─────────────────────────────────────┤
│ [Open Link Manager →]               │
└─────────────────────────────────────┘
```

### Row Click Behavior

Clicking a row opens `LinkPropertyPopover` for that specific property.

---

## Link Property Popover

### Linked State

```
┌─────────────────────────────────────────────────────┐
│ [📷] Camera Link                               [X]  │
│      View angle & zoom                              │
├─────────────────────────────────────────────────────┤
│ ┌─ ↔ Sync Mode ────────────────────────────────┐   │
│ │ Two-way sync                                  │   │
│ └───────────────────────────────────────────────┘   │
│                                                     │
│ LINKED TO (2)                                       │
│ ┌───────────────────────────────────────────────┐  │
│ │ ■ Analysis                                     │  │
│ │ ■ Overview                                     │  │
│ └───────────────────────────────────────────────┘  │
│                                                     │
│ [Unlink All]                                        │
├─────────────────────────────────────────────────────┤
│ [⚙️ Advanced: Open Link Manager →]                 │
└─────────────────────────────────────────────────────┘
```

### Unlinked State

```
┌─────────────────────────────────────────────────────┐
│ [📷] Camera Link                               [X]  │
│      View angle & zoom                              │
├─────────────────────────────────────────────────────┤
│              (empty state icon)                     │
│         No camera links                             │
│     Link to sync with other views                   │
│                                                     │
│            [+ Add Link]                             │
├─────────────────────────────────────────────────────┤
│ [⚙️ Advanced: Open Link Manager →]                 │
└─────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/ui/react/components/
├── organisms/
│   └── Footer2/
│       ├── Footer2.jsx
│       ├── Footer2.logic.js
│       ├── Footer2.scss
│       ├── index.js
│       └── components/
│           ├── FocusSubsetSection/
│           ├── UniversalActionsSection/
│           ├── TypeSpecificSection/
│           ├── ViewGroupSelector/
│           │   ├── ViewGroupSelector.jsx
│           │   ├── ViewGroupSelectorTrigger.jsx
│           │   ├── ViewGroupSelectorDropdown.jsx
│           │   ├── ViewGroupRow.jsx
│           │   ├── CreateViewGroupPopover.jsx
│           │   └── ViewGroupSettingsPopover.jsx
│           ├── LinksSection/
│           │   ├── LinksSection.jsx
│           │   ├── ExpandedLinks.jsx
│           │   ├── CollapsedLinksIndicator.jsx
│           │   ├── LinksPopover.jsx
│           │   └── LinkPropertyPopover.jsx
│           └── VRButton/
└── modals/
    └── DuplicationDialog/
        ├── DuplicationDialog.jsx
        └── DuplicationDialog.scss
```

---

## State Management

### Footer2 Local State

```typescript
interface Footer2State {
  selectorOpen: boolean;
  settingsViewGroupId: string | null;
  linkPopoverProperty: LinkProperty | null;
  showLinksPopover: boolean;
}
```

### ViewGroup State (from ViewConfigurationManager)

```typescript
interface ViewGroup {
  id: string;
  name: string;
  color: string;
  layoutId: string;
  views: string[];
  linkedTo: string | null;
  linkConfig: {
    masterEnabled: boolean;
    internalLinks: string[];  // property IDs
    externalLinks: ExternalLink[];
  };
}
```

### Link Stats (computed from ViewLinkingService)

```typescript
interface LinkStats {
  [propertyId: string]: {
    count: number;
    mode?: 'follow' | 'sync' | 'broadcast';
    linkedViews?: string[];
  };
}
```

---

## Events

### Outgoing Events

| Event | Payload | Trigger |
|-------|---------|---------|
| `viewgroup:select` | `{ viewGroupId }` | User selects ViewGroup |
| `viewgroup:goto` | `{ viewGroupId }` | User clicks Go To |
| `viewgroup:create` | `{ layoutId, fromTemplate? }` | User creates new |
| `viewgroup:duplicate` | `{ viewGroupId, linkOption }` | User duplicates |
| `viewgroup:delete` | `{ viewGroupId }` | User deletes |
| `viewgroup:update` | `{ viewGroup }` | User saves settings |
| `navigate:left-panel` | `{ tab: 'layout' }` | Open Layout Tab |
| `navigate:link-manager` | `{ viewId?, propertyId? }` | Open Link Manager |

### Incoming Events

| Event | Behavior |
|-------|----------|
| `viewgroup:changed` | Update active ViewGroup display |
| `links:updated` | Refresh link stats |
| `workspace:resized` | Check breakpoints, update mode |

---

## Testing Checklist

### Responsive Behavior
- [ ] Full mode (≥900px): All links expanded, full ViewGroup name
- [ ] Compact mode (600-899px): Collapsed links with dots, truncated name
- [ ] Minimal mode (450-599px): Link count only, color dot only
- [ ] Min-width enforcement: No shrink below 450px

### ViewGroup Selector
- [ ] Search filters ViewGroup list
- [ ] Active ViewGroup highlighted with color
- [ ] Settings opens popover
- [ ] Go To pans canvas and flashes border
- [ ] Create New opens popover
- [ ] Quick Create templates work
- [ ] From Saved section always visible
- [ ] Advanced opens Layout Tab

### Links
- [ ] Expanded mode shows all property indicators
- [ ] Click indicator opens property popover
- [ ] Collapsed mode shows correct dot colors
- [ ] Click collapsed opens LinksPopover
- [ ] LinksPopover row click opens property detail
- [ ] Unlink action works
- [ ] Add Link action works
- [ ] Open Link Manager navigates correctly

### Duplication
- [ ] Shows link info if ViewGroup has links
- [ ] Default option is "Link to original"
- [ ] Warning note appears for "Link to original"
- [ ] Each option creates correct link configuration
- [ ] Individual links retained when ViewGroup-linked

### Link Reminder
- [ ] Shows when activating linked ViewGroup
- [ ] "Got it" dismisses
- [ ] "Disable Links" disables incoming sync
- [ ] Only shows once per session per ViewGroup

---

## Performance Considerations

1. **Link stats computation** - Memoize with `useMemo`, only recompute when links change
2. **Dropdown rendering** - Use portal to avoid layout thrashing
3. **Search filtering** - Debounce search input (150ms)
4. **Collapsed dots** - Pure component, only re-render when linkStats changes

---

## Accessibility

- All buttons have `title` attributes for tooltips
- Keyboard navigation: Tab through interactive elements
- Focus management: Return focus to trigger when popover closes
- Color contrast: All text meets WCAG AA standards
- Screen reader: Link counts announced ("3 camera links active")

---

## Related Documentation

- `Room_Header_Canvas_Tabs_Session_Memory_Log_Part2.md` - Previous session context
- `canvas-comprehensive-v3.jsx` - Full canvas prototype
- `LayoutTabV4-6.jsx` - Layout Tab with ViewGroup management
- `src/ui/react/components/organisms/LinkManagerPanels/` - Existing link components
- `src/core/services/ViewLinkingService.js` - Link service implementation
