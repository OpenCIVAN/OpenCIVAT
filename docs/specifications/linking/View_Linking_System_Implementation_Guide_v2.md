# CIA Web - View Linking System Implementation Guide

## Context Document for Implementation (v2)

**Date:** January 8, 2026  
**Version:** 2.0 - Updated with codebase integration specifics  
**Purpose:** Comprehensive implementation guide for the View Linking UI system  

---

## Project Overview

CIA Web is an open-source **Collaborative Immersive Analytics** platform - "war rooms for scientific data analysis" where research teams visualize and analyze 3D datasets together in real-time across desktop and VR environments.

### Tech Stack
- **VTK.js** - 3D visualization
- **React** - UI with SASS/design tokens
- **Y.js** - CRDT-based real-time collaboration (presence layer)
- **WebXR** - VR capabilities
- **PostgreSQL** - Multi-tenant data storage
- **BullMQ+Redis** - Compute pipeline

---

## What We're Building: View Linking System

### Core Concept

**View Linking** enables spatial synchronization between views. When views are linked, changes to one view automatically propagate to linked views based on the link mode.

**Key Distinction:**
- **View Linking** = Views sync with each other (the VIEWS are linked)
- **User Following** = A user follows another user's viewport (separate feature)

### Hub Model Architecture

Views are linked via **Sync Groups** with a **Hub** (source of truth):

```
                    ┌──────────────────┐
                    │  View of Bones   │ ← Hub (source of truth)
                    │     (★ Hub)      │
                    └────────┬─────────┘
             ┌───────────────┼───────────────┐
             ▼               ▼               ▼
       ┌──────────┐   ┌──────────┐   ┌──────────┐
       │  Skull   │   │ Vessels  │   │  Lungs   │
       │   ↔ Sync │   │ ↔ Sync   │   │← Follow  │
       └──────────┘   └──────────┘   └──────────┘
```

---

## Existing Infrastructure to Reuse

### ✅ Data Layer (Already Implemented)

| Component | Location | What It Does |
|-----------|----------|--------------|
| **ViewConfigurationManager** | `src/core/data/managers/ViewConfigurationManager.js` | `linkProperty()`, `unlinkProperty()`, link observers, event emission |
| **ViewConfiguration** | `src/core/data/models/ViewConfiguration.js` | `LinkConfiguration` class with modes, status, broken link handling |
| **eventConstants** | `src/core/events/eventConstants.js` | `VIEW_EVENTS.LINK_CHANGED` |

**Existing Link Constants (in ViewConfiguration.js):**
```javascript
LINK_MODES = { FOLLOW, BIDIRECTIONAL, BROADCAST }
LINK_STATUS = { ACTIVE, BROKEN, PAUSED, PENDING }
LINKABLE_PROPERTIES = ['camera', 'cursors', 'filters', 'widgets', 'annotationDisplay', 'colorMaps']
```

**Existing LinkConfiguration Class:**
```javascript
class LinkConfiguration {
  targetViewId, targetServerId, targetViewName, targetOwnerName
  mode, status, statusReason, statusChangedAt
  linkedAt, lastSyncAt
  snapshotAtBreak  // For recovery when link breaks
}
```

### ✅ UI Components (Already Implemented)

| Component | Location | What It Does |
|-----------|----------|--------------|
| **InstanceCard** | `src/ui/react/components/organisms/InstanceCard/` | 4 variants: header, compact, inline, minimal |
| **ViewItem** | `src/ui/react/components/molecules/ViewItem/` | Full-featured with SlidingPanel, context menu, expand panel |
| **ViewExpandedPanel** | Same folder, `components/` | Shows link config inline in expanded state |
| **LinkPropertyRow** | Same folder, `components/` | Per-property toggle + target dropdown |
| **SlidingPanel** | Same folder, `components/` | Hover actions panel |

### ✅ Atoms (Already Implemented)

| Atom | Location | Usage |
|------|----------|-------|
| **Badge** | `src/ui/react/components/atoms/Badge/` | Generic badge |
| **StatusDot** | `src/ui/react/components/atoms/StatusDot/` | Status indicator |
| **ColorDot** | `src/ui/react/components/atoms/ColorDot/` | Color indicator |
| **Icon** | `src/ui/react/components/atoms/Icon/` | Full icon library |
| **Chip** | `src/ui/react/components/atoms/Chip/` | Interactive tag |
| **IconButton** | `src/ui/react/components/atoms/Button/` | Button variants |
| **Tooltip** | `src/ui/react/components/atoms/Tooltip/` | Tooltip system |

### ✅ Existing Link UI (In ViewExpandedPanel)

The `ViewExpandedPanel` already has basic link configuration:
- `LINK_MODES` constant (FOLLOW, BIDIRECTIONAL, BROADCAST)
- `LinkPropertyToggle` component
- `LINK_PROPERTIES` array from `LinkPropertyRow.jsx`

---

## New Components to Create

### New Badge Atoms

**Location:** `src/ui/react/components/atoms/Badge/`

| Badge | File | Purpose |
|-------|------|---------|
| **LinkBadge** | `LinkBadge.jsx` | Shows linked property count (🔗 3), draggable |
| **ViewerBadge** | `ViewerBadge.jsx` | Shows current viewers (👁 2) |
| **HubBadge** | `HubBadge.jsx` | Hub indicator (★ Hub) |
| **ModeBadge** | `ModeBadge.jsx` | Shows ← / ↔ / → mode |
| **SyncStatusIndicator** | `SyncStatusIndicator.jsx` | Sync status with pulse |

### InstanceCard Extensions

**Location:** Extend `src/ui/react/components/organisms/InstanceCard/InstanceCard.jsx`

**New Props to Add:**
```typescript
// Link-related props
linkCount?: number;          // Shows LinkBadge
viewerCount?: number;        // Shows ViewerBadge  
isHub?: boolean;             // Shows HubBadge
linkMode?: 'follow' | 'sync' | 'bidirectional' | 'broadcast';
syncStatus?: 'synced' | 'syncing' | 'error' | 'paused';
lastSyncEvent?: { userName, action, property, timestamp };

// Badge interactions
onLinkBadgeClick?: () => void;
onLinkBadgeDragStart?: (e: DragEvent) => void;

// Drop target
isLinkDropTarget?: boolean;
onLinkDrop?: (sourceViewId: string) => void;
```

**New Sub-Component:**
```javascript
// InstanceCardBadges - renders badge cluster in header
<InstanceCardBadges
  linkCount={3}
  viewerCount={2}
  isHub={true}
  linkMode="sync"
  onLinkBadgeClick={openLinkPanel}
  onLinkBadgeDragStart={handleDragStart}
/>
```

**New Variants:**
```javascript
EXTENDED_VARIANTS = {
  ...EXISTING_VARIANTS,
  TOPOLOGY: 'topology',  // Mini card for sync group diagrams
  CHIP: 'chip',          // Inline reference (dot + name)
}
```

### Floating Panels

**Location:** `src/ui/react/components/panels/FloatingPanels/`

```
FloatingPanels/
├── ViewLinkManager/
│   ├── ViewLinkManager.jsx
│   ├── ViewLinkManager.scss
│   ├── components/
│   │   ├── PropertySelector.jsx
│   │   ├── ModeSelector.jsx
│   │   ├── GroupMembersList.jsx
│   │   ├── AddToGroupSection.jsx
│   │   └── LinkOverviewTab.jsx
│   └── index.js
├── UserFollowingPanel/
│   ├── UserFollowingPanel.jsx
│   ├── UserFollowingPanel.scss
│   └── index.js
└── WorkspaceLinksHub/
    ├── WorkspaceLinksHub.jsx
    ├── WorkspaceLinksHub.scss
    └── index.js
```

### Drag-to-Link System

**Location:** `src/ui/react/context/DragLinkContext.jsx`

```javascript
// Context provider for drag-to-link operations
<DragLinkProvider onCreateLink={handleCreateLink}>
  <Canvas />
</DragLinkProvider>

// Hooks for components
useDragLink()           // Access drag state
useLinkDragSource(view) // Make LinkBadge draggable  
useLinkDropTarget(view) // Make InstanceCard a drop target
```

**Components:**
- `DragLinkOverlay` - SVG overlay with connection line during drag
- `QuickLinkPopup` - Property/mode selector on drop

---

## ViewConfigurationManager Extensions

### Current Point-to-Point Model

```javascript
// Current: View A links to View B
viewA.links.camera = new LinkConfiguration({
  targetViewId: viewB.id,
  mode: LINK_MODES.FOLLOW
});
```

### New Hub Model Additions

**New Properties:**
```javascript
class ViewConfigurationManager {
  // Existing...
  
  // NEW: Track sync groups
  // Map<property, Map<hubViewId, Set<memberViewIds>>>
  _syncGroups = new Map();
}
```

**New Methods:**
```javascript
// Sync Group Management
getSyncGroup(viewId, property)
getSyncGroupMembers(viewId, property)
getSyncGroupHub(viewId, property)
createSyncGroup(hubViewId, property)
joinSyncGroup(viewId, property, groupHubId, mode)
leaveSyncGroup(viewId, property)

// Hub Election
electNewHub(groupId, property)
transferHub(groupId, property, newHubId)

// Bulk Operations
linkAllProperties(viewId, targetViewId, mode)
unlinkAllProperties(viewId)
```

**New Events:**
```javascript
VIEW_EVENTS.SYNC_GROUP_CREATED = 'syncGroupCreated'
VIEW_EVENTS.SYNC_GROUP_MEMBER_JOINED = 'syncGroupMemberJoined'
VIEW_EVENTS.SYNC_GROUP_MEMBER_LEFT = 'syncGroupMemberLeft'
VIEW_EVENTS.SYNC_GROUP_HUB_CHANGED = 'syncGroupHubChanged'
VIEW_EVENTS.SYNC_GROUP_DISSOLVED = 'syncGroupDissolved'
```

---

## Integration Points

### 1. ViewsTab Integration

**File:** `src/ui/react/components/panels/LeftPanel/tabs/ViewsTab/ViewsTab.jsx`

**Changes:**
- Import `LinkBadge`, `ViewerBadge`, `HubBadge` atoms
- Add badges to `ActiveViewItemWrapper`
- Add `onLinkBadgeClick` handler to open View Link Manager panel
- Add drag-to-link support via `useLinkDropTarget`

### 2. InstanceCard Integration

**File:** `src/ui/react/components/organisms/InstanceCard/InstanceCard.jsx`

**Changes:**
- Import new badge components
- Add `InstanceCardBadges` sub-component
- Add new props (linkCount, viewerCount, isHub, etc.)
- Add drop target handlers
- Add new variants (topology, chip)

### 3. ViewItem Integration

**File:** `src/ui/react/components/molecules/ViewItem/ViewItem.jsx`

**Changes:**
- Add `LinkBadge` with drag handlers
- Add drop target styling
- Wire up `onLinkBadgeClick` to open panel

### 4. Canvas Integration

**File:** `src/ui/react/components/canvas/` (new files)

**New:**
- `LinkOverlay.jsx` - SVG overlay for connection lines
- `SyncPulseIndicator.jsx` - Brief toast when linked view updates

### 5. Panel Registration

**File:** `src/ui/react/components/panels/FloatingPanels/FloatingPanelContext.jsx` (or similar)

**Register:**
- `VIEW_LINK_MANAGER` panel type
- `USER_FOLLOWING` panel type
- `WORKSPACE_LINKS_HUB` panel type

---

## File Changes Summary

### New Files to Create

```
src/ui/react/components/atoms/Badge/
├── LinkBadge.jsx
├── LinkBadge.scss
├── ViewerBadge.jsx
├── HubBadge.jsx
├── ModeBadge.jsx
├── SyncStatusIndicator.jsx
└── index.js (update exports)

src/ui/react/components/organisms/InstanceCard/
├── components/
│   ├── InstanceCardBadges.jsx
│   ├── InstanceCardTopology.jsx
│   └── InstanceCardChip.jsx
└── InstanceCard.scss (additions)

src/ui/react/components/panels/FloatingPanels/
├── ViewLinkManager/
├── UserFollowingPanel/
└── WorkspaceLinksHub/

src/ui/react/context/
└── DragLinkContext.jsx

src/ui/react/components/canvas/
├── LinkOverlay.jsx
└── SyncPulseIndicator.jsx
```

### Files to Modify

```
src/core/data/managers/ViewConfigurationManager.js
  - Add sync group tracking
  - Add hub model methods
  - Add new events

src/core/events/eventConstants.js
  - Add new sync group events

src/ui/react/components/organisms/InstanceCard/InstanceCard.jsx
  - Add new props
  - Import badges
  - Add new variants

src/ui/react/components/molecules/ViewItem/ViewItem.jsx
  - Add LinkBadge
  - Add drop target support

src/ui/react/components/panels/LeftPanel/tabs/ViewsTab/ViewsTab.jsx
  - Wire up link panel opening
```

---

## Design Tokens Reference

**From existing theme (use these, don't redefine):**

```scss
// Colors for link features
$color-accent-teal: #2dd4bf;    // Primary link color
$color-accent-amber: #fbbf24;   // Hub indicator
$color-accent-purple: #a78bfa;  // Broadcast mode
$color-accent-blue: #60a5fa;    // Viewers
$color-accent-cyan: #22d3ee;    // Follow mode
$color-accent-green: #4ade80;   // Synced status
$color-accent-red: #f87171;     // Error status

// Use existing glass surfaces
@include glass-surface;
@include glass-surface-subtle;
@include accent-glow($color);
```

---

## Interaction Patterns

### Drag-to-Link Flow

1. **Initiate:** Drag 🔗 badge from View A header
2. **During Drag:**
   - Dashed line follows cursor (SVG overlay)
   - Source view: teal glow ring
   - Valid targets: pulsing highlight on hover
   - Invalid targets: dimmed, "not allowed" cursor
3. **On Drop:** Quick Link Popup appears
4. **Modifier Keys:**
   - `Drop` = Open property/mode picker
   - `Shift+Drop` = Link ALL properties with Sync mode
   - `Alt+Drop` = Link Camera only with Sync mode
   - `Ctrl/Cmd+Drop` = Open full Link Manager panel

### Quick Link Popup

```
╭──────────────────────────────────────╮
│  Skull → Bones                       │
│                                      │
│  Property:  📷 🎚 🎨 📐 👁 📝       │
│             [selected: camera]       │
│                                      │
│  Mode:   [← Follow] [↔ Sync] [→]    │
│          [selected: sync]            │
│                                      │
│  [Cancel]              [Create Link] │
│                                      │
│  Enter to confirm · Esc to cancel    │
╰──────────────────────────────────────╯
```

---

## VR Considerations

Per existing VR-first architecture (`useAdaptive` hook):

- All new atoms must consume `useAdaptive()` for adaptive sizing
- VR mode: 44px minimum touch targets
- VR mode: Always show button labels (no hover-only states)
- VR mode: Larger badges with more padding
- Drag-to-link may need VR alternative (ray-cast selection?)

---

## Testing Strategy

### Storybook Stories to Create

```
atoms/Badge/LinkBadge.stories.jsx
  - Various counts (0, 1, 5, 99)
  - Size variants (small, default, large)
  - Dragging state
  
atoms/Badge/HubBadge.stories.jsx
atoms/Badge/ModeBadge.stories.jsx
atoms/Badge/ViewerBadge.stories.jsx

organisms/InstanceCard/InstanceCard.stories.jsx
  - Add stories for new variants (topology, chip)
  - Add stories for link-related props
  - Add stories for drop target states

panels/FloatingPanels/ViewLinkManager.stories.jsx
panels/FloatingPanels/UserFollowingPanel.stories.jsx
panels/FloatingPanels/WorkspaceLinksHub.stories.jsx
```

---

## Implementation Order

### Phase 1: Foundation (Badge Atoms)
1. Create `LinkBadge` atom with drag support
2. Create `ViewerBadge`, `HubBadge`, `ModeBadge` atoms
3. Create `SyncStatusIndicator` atom
4. Add Storybook stories

### Phase 2: InstanceCard Extension
1. Create `InstanceCardBadges` sub-component
2. Add new props to InstanceCard
3. Create `InstanceCardTopology` variant
4. Create `InstanceCardChip` variant
5. Add SCSS for new variants

### Phase 3: Drag-to-Link
1. Create `DragLinkContext` provider
2. Implement `useLinkDragSource` hook
3. Implement `useLinkDropTarget` hook
4. Create `DragLinkOverlay` component
5. Create `QuickLinkPopup` component
6. Wire into existing components

### Phase 4: Floating Panels
1. Create `ViewLinkManager` panel
2. Create `UserFollowingPanel`
3. Create `WorkspaceLinksHub`
4. Register in floating panel system

### Phase 5: ViewConfigurationManager Hub Model
1. Add sync group tracking
2. Implement hub election
3. Add new methods
4. Add new events
5. Wire UI to new methods

### Phase 6: Integration & Polish
1. Wire ViewsTab to open panels
2. Add canvas link indicators
3. Add sync pulse animations
4. Test cross-component interactions
5. VR testing and adjustments

---

## Related Artifacts

Created in this design session:

| File | Description |
|------|-------------|
| `instance-card-link-extensions.jsx` | Badge atoms, InstanceCard extensions, new variants |
| `drag-to-link-interaction.jsx` | DragLinkContext, hooks, QuickLinkPopup, overlay |
| `link-manager-panels.jsx` | Three floating panels (View Link Manager, User Following, Workspace Links Hub) |
| `view-card-components.jsx` | Original ViewCard designs (reference for integration) |

---

## Questions Resolved

| Question | Decision |
|----------|----------|
| Replace ViewCard or extend InstanceCard? | **Extend InstanceCard** - cleaner, single component |
| Hub model vs point-to-point? | **Hub model** - when A links to B, B becomes hub or A joins B's group |
| Quick Link Popup: floating panel or popover? | **Popover** - appears at drop position, closes on click-outside |
| Drag library: React DnD or native? | **Native HTML5 drag** - simpler, sufficient for this use case |
| ViewExpandedPanel: replace or supplement? | **Supplement** - keep inline config, add floating panel for power users |

---

## Open Questions for Implementation

1. **Canvas link lines:** Always visible or toggle? Show property colors or unified?
2. **Hub transfer UX:** Automatic on hub leave, or prompt user to select new hub?
3. **Link requests:** Future feature for requesting to link to someone's view?
4. **VR drag alternative:** Use ray-cast + trigger, or different UI pattern entirely?

---

*Document updated: January 8, 2026*
