# CIA Web - View Linking System & ViewCard Components

## Context Document for Implementation

**Date:** January 8, 2026  
**Purpose:** Provide implementation context for the View Linking UI system  
**Related Files:** `link-manager-panels.jsx`, `view-card-components.jsx`

---

## Project Overview

CIA Web is an open-source **Collaborative Immersive Analytics** platform - essentially "war rooms for scientific data analysis" where research teams can visualize and analyze 3D datasets together in real-time across desktop and VR environments.

The platform uses:
- **VTK.js** for 3D visualization
- **React** for UI with SASS/design tokens
- **Y.js** for CRDT-based real-time collaboration
- **WebXR** for VR capabilities

---

## What We're Building: View Linking System

### The Core Concept

**View Linking** enables spatial synchronization between views. When views are linked, changes to one view (like camera rotation) automatically propagate to linked views based on the link mode.

**Key Distinction:**
- **View Linking** = Views are linked to each other (the VIEWS sync, not users)
- **User Following** = A user follows another user's viewport (separate feature)

### Example Use Cases

1. **Same Orientation Comparison:** Link camera between "Tumor Model A" and "Tumor Model B" so rotating one rotates both - useful for comparing structures from identical angles.

2. **Shared Color Mapping:** Link color maps across multiple tissue views so adjusting contrast on one updates all.

3. **Collaborative Analysis:** Multiple researchers working on linked views - any researcher rotating any linked view affects all of them.

---

## Architecture: Hub Model for Sync Groups

Views are linked via **Sync Groups** with a **Hub** architecture:

```
Hub Model:
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

### Linkable Properties

Each property can be linked INDEPENDENTLY:

| Property | What Syncs |
|----------|------------|
| `camera` | View angle, zoom, pan position |
| `filters` | Active data filters |
| `colorMaps` | Color transfer functions |
| `widgets` | Widget states (measurement tools, etc.) |
| `cursors` | 3D cursor positions |
| `annotationDisplay` | Which annotations are visible |

A single view can be in DIFFERENT sync groups for different properties:
- Camera linked to View A (sync group 1)
- Filters linked to View B (sync group 2)
- Colors independent (no link)

### Link Modes

| Mode | Symbol | Behavior |
|------|--------|----------|
| **Follow** | ← | Receive updates only (read-only sync) |
| **Sync** | ↔ | Bidirectional - changes propagate both ways |
| **Broadcast** | → | Send updates only (presenter mode) |

### Hub Election

- When View A links to View B, B becomes the hub
- If the hub leaves the group, a new hub is elected from remaining members
- All members link to the hub; hub broadcasts to all

---

## Three UI Panels Designed

### 1. View Link Manager

**Purpose:** Configure links for a SPECIFIC view  
**Opens From:** View header link badge, view context menu

**Features:**
- **Overview Tab:** Shows all 6 properties with their link status at a glance
- **Configure Tab:** 
  - Property selector with status dots (●●● = 3 views linked)
  - Mode selector (← Follow / ↔ Sync / → Broadcast)
  - Group members list with hub indicator
  - "Add to Group" search with smart filtering (same dataset first)
  - Leave Group / Link Settings actions

### 2. User Following Panel

**Purpose:** Follow a PERSON's viewport (separate from view linking)  
**Opens From:** Collaborator avatar, presence list

**Features:**
- Current follow status with options:
  - Jump to their active view
  - Show their cursor
  - Mirror their camera angle
  - Auto-follow view changes
- Workspace members list with online status
- "Following You" section showing who follows you
- "Start Presenting" mode (inverse - you become the source)

### 3. Workspace Links Hub

**Purpose:** Bird's-eye view of ALL link groups in the workspace  
**Opens From:** Left panel tab, workspace menu

**Features:**
- All sync groups listed with mini topology diagrams
- Expandable groups showing full member list
- "Most Connected Views" summary
- "View Link Topology Map" button (future: visual graph)

---

## ViewCard Component System

A unified component for displaying view references throughout the app.

### Variants

| Variant | Use Case | Size |
|---------|----------|------|
| `dot` | Connection diagrams | 8px circle |
| `chip` | Inline text references | ~80px pill |
| `mini` | Link panel topology | ~120px card |
| `compact` | Left panel lists | Full-width row |
| `full` | Canvas viewports | Full viewport |

### Badge System

| Badge | Shows | Visual |
|-------|-------|--------|
| `LinkBadge` | Linked property count | 🔗 3 (teal) |
| `ViewerBadge` | Current viewers | 👁 2 (blue) |
| `HubBadge` | Hub status | ★ Hub (amber) |
| `ModeBadge` | Link mode | ← / ↔ / → |
| `StatusDot` | Sync status | Colored dot |

### Key Props

```jsx
<ViewCard
  variant="compact"  // 'dot' | 'chip' | 'mini' | 'compact' | 'full'
  view={{ id, name, color, datasetName, ownerName }}
  isActive={true}
  isHub={true}
  mode="sync"        // 'follow' | 'sync' | 'broadcast'
  linkCount={3}
  viewerCount={2}
  onClick={() => {}}
  onLinkClick={() => {}}
  onLinkDragStart={() => {}}  // For drag-to-link
/>
```

---

## Drag-to-Link Interaction (To Be Implemented)

### Concept

Users can drag from one view's link badge to another view to quickly create links.

### Flow

1. **Initiate:** User drags the 🔗 badge from View A's header
2. **Visual Feedback:** 
   - Dashed line follows cursor
   - Source view gets teal glow
   - Valid targets highlight on hover
   - Invalid targets dim with "not compatible" cursor
3. **Drop:** On valid target, show Quick Link Popup:
   ```
   ╭──────────────────────────────────────╮
   │  Link Skull → Bones                  │
   │                                      │
   │  Property:  📷 🎚 🎨 📐 👁 📝       │
   │                                      │
   │  Mode:   [← Follow] [↔ Sync] [→]    │
   │                                      │
   │  [Cancel]              [Create Link] │
   ╰──────────────────────────────────────╯
   ```
4. **Shortcut Modifiers:**
   - Drop = Camera Sync (most common)
   - Shift+Drop = All properties synced
   - Alt+Drop = Show property picker

---

## Integration Points

### ViewConfigurationManager

Located: `src/core/data/managers/ViewConfigurationManager.js`

Key methods to wire up:
```javascript
// Create a link
linkProperty(viewId, property, targetViewId, mode)

// Remove a link
unlinkProperty(viewId, property)

// Get sync group members
getSyncGroupMembers(viewId, property)

// Get the hub view ID
getSyncGroupHub(viewId, property)
```

### ViewConfiguration Model

Located: `src/core/data/models/ViewConfiguration.js`

Link data structure:
```javascript
view.links = {
  camera: LinkConfiguration | null,
  filters: LinkConfiguration | null,
  colorMaps: LinkConfiguration | null,
  widgets: LinkConfiguration | null,
  cursors: LinkConfiguration | null,
  annotationDisplay: LinkConfiguration | null,
}
```

### Events to Emit

```javascript
// When links change
this._emit("linkChanged", { viewId, property, targetViewId, mode, action });

// Actions: 'created', 'removed', 'mode_changed', 'hub_transferred'
```

---

## Design Tokens

Using the existing glassmorphism theme. Key colors for linking:

```javascript
const tokens = {
  accentTeal: '#2dd4bf',    // Primary link color
  accentAmber: '#fbbf24',   // Hub indicator
  accentPurple: '#a78bfa',  // User following
  accentBlue: '#60a5fa',    // Viewers
  accentCyan: '#22d3ee',    // Follow mode
  accentGreen: '#4ade80',   // Synced status
};
```

---

## Files Created

1. **`link-manager-panels.jsx`** - All three panels (View Link Manager, User Following, Workspace Links Hub) as a demo
2. **`view-card-components.jsx`** - ViewCard component system with all variants and badges

Both files are self-contained React components with inline styles matching the design token system. They're ready to be integrated into the main codebase.

---

## Next Implementation Steps

1. **Split ViewCard into proper file structure** - Atoms (badges, dots) and molecules (card variants)
2. **Add SCSS** - Convert inline styles to use existing SASS mixins and design tokens
3. **Wire up to ViewConfigurationManager** - Connect UI actions to the data layer
4. **Implement drag-to-link** - Using React DnD or native drag events
5. **Add to FloatingPanelContext** - Register panels for the floating panel system
6. **Canvas indicators** - Add link badge to viewport headers, optional connection lines
7. **Notifications** - Toast when someone links to your view

---

## Questions for Implementation

1. Should the Quick Link Popup be a floating panel or a portal/popover?
2. For drag-to-link, should we use React DnD library or native HTML5 drag?
3. Should link connection lines on canvas be SVG overlay or canvas-based?
4. How should we handle link creation permissions in shared workspaces?

---

## Related Documentation

- `Floating_Workspace_Atomic_Design_Session_Memory_Log.md`
- `Modals_vs_FloatingPanels_Design_Session_Memory_Log.md`
- `Atomic_Component_Decomposition_Spec.md`
- `Canvas_Chrome_Architecture_Session_Memory_Log.md`
