# CIA Web - View Linking System Enhancement

## Context Document for Implementation

**Date:** January 8, 2026  
**Purpose:** Document enhancements to the existing View Linking system  
**Status:** Extending existing implementation

---

## Current Implementation Summary

### What Already Exists ✅

**Core Data Layer:**
- `ViewConfiguration` model with full `links` property for all 6 linkable properties
- `LinkConfiguration` class with modes (FOLLOW, BIDIRECTIONAL, BROADCAST) and status (ACTIVE, BROKEN, PAUSED, PENDING)
- `ViewConfigurationManager` with `linkProperty()`, `unlinkProperty()`, `unlinkAll()`, `pauseLink()`, `resumeLink()`
- Link observer pattern (`_linkObservers` Map) for propagating changes between linked views
- `_applyLinkedProperty()` for syncing values from source to subscriber
- Broken link handling with state snapshots for recovery

**Linkable Properties (already defined):**
```javascript
export const LINKABLE_PROPERTIES = [
  "camera",
  "cursors", 
  "filters",
  "widgets",
  "annotationDisplay",
  "colorMaps",
];
```

**UI Components:**
- `ViewItem` - Main list item component with status icons, sliding panel, context menu
- `InactiveViewItem` - Simplified version for views not on canvas
- `TrashedViewItem` - Compact version for Recently Deleted section
- `LinkPropertyRow` - Individual property toggle with target dropdown
- `LinkPropertyToggle` - Compact icon-only toggle button
- `ViewExpandedPanel` - Expanded view details with link configuration
- `ViewSettingsModal` - Full settings modal with Link Properties section
- `ViewLinkingService` - UI-side service for link management with events

**Link Modes (already defined):**
```javascript
export const LINK_MODES = {
  NONE: "none",
  FOLLOW: "follow",           // One-way: this view follows source
  BIDIRECTIONAL: "bidirectional", // Two-way sync
  BROADCAST: "broadcast",     // Source controls, followers read-only
};
```

---

## What We're Adding: Enhancement Overview

### Current Model vs Enhanced Model

**Current: Source-Target (1:1)**
```
View A ──follows──▶ View B (source)
View C ──follows──▶ View B (source)
```
Each view links to ONE source per property. Works but requires knowing "who is the source."

**Enhanced: Hub-and-Spoke Sync Groups (N:N)**
```
                    ┌──────────────┐
                    │   View B     │ ← Hub (auto-elected)
                    │   ★ Hub      │
                    └──────┬───────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
     ┌──────────┐   ┌──────────┐   ┌──────────┐
     │ View A   │   │ View C   │   │ View D   │
     │  ↔ Sync  │   │  ↔ Sync  │   │ ← Follow │
     └──────────┘   └──────────┘   └──────────┘
```
Views join GROUPS. Hub is elected automatically. Users think in terms of "link these views together" not "follow that view."

### Key UX Improvements

| Current | Enhanced |
|---------|----------|
| "Link to source view" dropdown | "Add to link group" with any member |
| Modal-based configuration | Floating panels for quick access |
| No visual topology | Mini topology diagrams in panels |
| No drag-to-link | Drag 🔗 badge to link views |
| No workspace overview | Workspace Links Hub panel |
| Link = settings modal | Link badge on viewport header |

---

## New Components to Build

### 1. ViewCard Component System

**Purpose:** Unified component for displaying views across the app (extends existing ViewItem)

**Variants:**

| Variant | Use Case | Current Equivalent |
|---------|----------|-------------------|
| `dot` | Connection diagrams | (new) |
| `chip` | Inline text references | (new) |
| `mini` | Link panel topology | (new) |
| `compact` | Left panel lists | `ViewItem` |
| `full` | Canvas viewports | `InstanceViewport` in canvas-chrome |

**New Badges:**
- `LinkBadge` - 🔗 3 (draggable for quick-link)
- `ViewerBadge` - 👁 2 (people viewing)
- `HubBadge` - ★ Hub (sync group leader)
- `ModeBadge` - ← / ↔ / → (link mode)
- `SyncPulseBadge` - Brief "Dr. Smith rotated" tooltip

**Integration:** The `compact` variant wraps existing `ViewItem` functionality. Other variants are new.

### 2. View Link Manager Panel

**Purpose:** Configure links for a specific view (replaces modal section)

**Opens From:**
- Link badge (🔗) on view header
- View context menu → "Manage Links"
- ViewItem hover actions

**Features:**
- **Overview Tab:** All 6 properties at a glance with mini topology
- **Configure Tab:**
  - Property selector chips with status dots
  - Mode selector (← Follow / ↔ Sync / → Broadcast)
  - Group members list with hub indicator
  - "Add to Group" search with smart filtering
  - Leave Group / Link Settings actions

**Difference from ViewSettingsModal:**
- Floating panel (non-blocking) vs Modal (blocking)
- Shows topology visualization
- Supports sync groups, not just source-target
- Draggable, can stay open while working

### 3. User Following Panel

**Purpose:** Follow a PERSON's viewport (distinct from view linking)

**Key Distinction:**
- **View Linking:** Views sync with each other (any user interacting affects all)
- **User Following:** YOU follow a specific person's viewport (presentation mode)

**Features:**
- Current follow status with options (mirror camera, show cursor, auto-follow)
- Workspace members list with online status
- "Following You" section
- "Start Presenting" mode

### 4. Workspace Links Hub Panel

**Purpose:** Bird's-eye view of ALL link groups in the workspace

**Features:**
- All sync groups listed by property type
- Expandable groups with full topology diagrams
- "Most Connected Views" summary
- Link topology map button (future)

### 5. Drag-to-Link Interaction

**Purpose:** Quick way to link views without opening panels

**Flow:**
1. Drag 🔗 badge from View A's header
2. Visual feedback: dashed line, glow effects
3. Drop on View B → Quick Link Popup appears
4. Select property + mode → Link created

**Modifier Keys:**
- Default drop = Camera Sync
- Shift+Drop = All properties synced
- Alt+Drop = Show property picker

---

## Data Layer Enhancements

### Sync Groups Extension

Add to `ViewConfigurationManager`:

```javascript
// New: Track sync groups (property → Map<hubViewId, Set<memberViewIds>>)
this._syncGroups = new Map();

// New methods
createSyncGroup(property, initialViewIds)
joinSyncGroup(viewId, property, groupHubId, mode)
leaveSyncGroup(viewId, property)
getSyncGroupMembers(viewId, property)
getSyncGroupHub(viewId, property)
electNewHub(property, groupId)
```

**Backwards Compatible:** Existing `linkProperty(viewId, property, targetViewId, mode)` continues to work. Internally, it joins/creates a sync group.

### Hub Election Algorithm

```javascript
electNewHub(property, currentMembers) {
  // Priority:
  // 1. View with BROADCAST mode (explicit leader)
  // 2. Oldest member (first to join)
  // 3. View with most active instances (most "real" usage)
  // 4. Random tiebreaker
}
```

---

## Events to Add

```javascript
// Sync group events (supplement existing linkChanged)
this._emit("syncGroupCreated", { property, hubViewId, memberIds });
this._emit("syncGroupJoined", { viewId, property, hubViewId });
this._emit("syncGroupLeft", { viewId, property });
this._emit("syncGroupHubChanged", { property, oldHubId, newHubId });
this._emit("syncGroupDissolved", { property, hubViewId });

// User following events (separate system)
this._emit("userFollowStarted", { followerId, followeeId });
this._emit("userFollowStopped", { followerId });
this._emit("presentationStarted", { presenterId, viewId });
this._emit("presentationEnded", { presenterId });
```

---

## File Structure for New Components

```
src/ui/react/components/
├── atoms/
│   ├── ColorDot/
│   │   ├── ColorDot.jsx
│   │   └── ColorDot.scss
│   └── Badge/
│       ├── Badge.jsx
│       ├── LinkBadge.jsx
│       ├── ViewerBadge.jsx
│       ├── HubBadge.jsx
│       ├── ModeBadge.jsx
│       └── Badge.scss
│
├── molecules/
│   ├── ViewCard/                    # NEW unified system
│   │   ├── index.js
│   │   ├── ViewCard.jsx             # Variant router
│   │   ├── ViewCardDot.jsx
│   │   ├── ViewCardChip.jsx
│   │   ├── ViewCardMini.jsx
│   │   ├── ViewCardCompact.jsx      # Wraps existing ViewItem
│   │   ├── ViewCardFull.jsx
│   │   └── ViewCard.scss
│   │
│   └── ViewItem/                    # EXISTING - keep as-is
│       └── ... (unchanged)
│
└── panels/
    └── FloatingPanel/
        ├── panels/
        │   ├── ViewLinkManagerPanel/    # NEW
        │   │   ├── ViewLinkManagerPanel.jsx
        │   │   ├── ViewLinkManagerPanel.scss
        │   │   ├── LinkOverviewTab.jsx
        │   │   ├── LinkConfigureTab.jsx
        │   │   ├── PropertySelector.jsx
        │   │   ├── ModeSelector.jsx
        │   │   ├── GroupMembersList.jsx
        │   │   └── AddToGroupSection.jsx
        │   │
        │   ├── UserFollowingPanel/      # NEW
        │   │   ├── UserFollowingPanel.jsx
        │   │   └── UserFollowingPanel.scss
        │   │
        │   └── WorkspaceLinksHub/       # NEW
        │       ├── WorkspaceLinksHub.jsx
        │       └── WorkspaceLinksHub.scss
        │
        └── FloatingPanelContext.jsx     # Register new panel types
```

---

## Integration with Existing Code

### ViewItem Enhancement

In `ViewItem.jsx`, add link badge to header:

```jsx
// In the status icons section or header
{linkCount > 0 && (
  <LinkBadge 
    count={linkCount}
    onClick={() => openPanel('viewLinkManager', { viewId: view.id })}
    draggable
    onDragStart={handleLinkDragStart}
  />
)}
```

### InstanceViewport Enhancement

In canvas viewport headers, add the same link badge:

```jsx
// After view name in header
<div className="instance-viewport__badges">
  <LinkBadge count={linkCount} onClick={openLinkManager} draggable />
  <ViewerBadge count={viewerCount} />
</div>
```

### ViewSettingsModal Integration

Keep the existing Link Properties section but add a "Open Link Manager" button for the full experience:

```jsx
<ModalSection icon="link2" title="Link Properties">
  {/* Existing toggle UI for quick access */}
  <LinkPropertyToggles ... />
  
  {/* New: Link to full manager */}
  <button onClick={() => openPanel('viewLinkManager', { viewId: view.id })}>
    Open Link Manager →
  </button>
</ModalSection>
```

---

## Migration Path

1. **Phase 1: ViewCard System** (can do now)
   - Create new `ViewCard` variants
   - Keep existing `ViewItem` as the `compact` implementation
   - Add badges as atoms

2. **Phase 2: Floating Panels** (can do now)
   - Create `ViewLinkManagerPanel` using existing `FloatingPanel` system
   - Wire up to existing `ViewLinkingService`
   - Add link badge to `ViewItem` and `InstanceViewport`

3. **Phase 3: Sync Groups** (data layer enhancement)
   - Add `_syncGroups` to `ViewConfigurationManager`
   - Update `linkProperty()` to use sync group logic
   - Add hub election

4. **Phase 4: Drag-to-Link** (interaction enhancement)
   - Add drag handlers to `LinkBadge`
   - Create `QuickLinkPopup` component
   - Handle drop targets on viewports

5. **Phase 5: User Following** (separate feature)
   - Create `UserFollowingPanel`
   - Add presence service integration
   - Implement presentation mode

---

## Testing Considerations

### Existing Tests to Verify
- `ViewItem` component tests
- `ViewLinkingService` tests
- `ViewConfigurationManager.linkProperty()` tests

### New Tests Needed
- ViewCard variant rendering
- Sync group creation/joining/leaving
- Hub election algorithm
- Drag-to-link interaction
- Panel open/close states

---

## Related Files (Existing)

**Data Layer:**
- `src/core/data/models/ViewConfiguration.js` - LinkConfiguration class
- `src/core/data/managers/ViewConfigurationManager.js` - Link methods

**UI Components:**
- `src/ui/react/components/molecules/ViewItem/` - Full ViewItem system
- `src/ui/react/components/molecules/ViewItem/components/LinkPropertyRow.jsx`
- `src/ui/react/components/modals/ViewSettingsModal/ViewSettingsModal.jsx`

**Services:**
- `src/services/ViewLinkingService.js` - UI-side link management

**Design Docs:**
- `Floating_Workspace_Atomic_Design_Session_Memory_Log.md`
- `Modals_vs_FloatingPanels_Design_Session_Memory_Log.md`

---

## Prototype Files Created

Two prototype files have been created demonstrating the full design:

1. **`link-manager-panels.jsx`** - All three floating panels with interaction
2. **`view-card-components.jsx`** - ViewCard system with all variants and badges

These are standalone React components with inline styles matching the design token system. They demonstrate the intended UX and can be used as implementation reference.

---

## Summary: What's New vs What Exists

| Feature | Status | Notes |
|---------|--------|-------|
| 6 linkable properties | ✅ Exists | camera, filters, widgets, cursors, colorMaps, annotationDisplay |
| Link modes | ✅ Exists | FOLLOW, BIDIRECTIONAL, BROADCAST |
| Source-target linking | ✅ Exists | `linkProperty(viewId, prop, targetId, mode)` |
| ViewItem component | ✅ Exists | With sliding panel, context menu |
| LinkPropertyRow/Toggle | ✅ Exists | In ViewExpandedPanel |
| ViewSettingsModal links | ✅ Exists | Full link configuration |
| **Sync Groups (hub model)** | 🆕 New | Multi-view groups with hub election |
| **ViewCard variants** | 🆕 New | dot, chip, mini, compact, full |
| **Link/Viewer badges** | 🆕 New | Visual indicators on viewports |
| **ViewLinkManagerPanel** | 🆕 New | Floating panel with topology |
| **UserFollowingPanel** | 🆕 New | Person-to-person following |
| **WorkspaceLinksHub** | 🆕 New | Workspace-wide overview |
| **Drag-to-link** | 🆕 New | Quick linking interaction |
| **Sync pulse animation** | 🆕 New | "Dr. Smith rotated" feedback |
