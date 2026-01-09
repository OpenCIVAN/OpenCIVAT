# View Linking System - Claude Code Handoff Package

## Overview

This package contains complete design specifications for the CIA Web View Linking system, including:
- Desktop drag-to-link interactions
- VR-adapted interactions (tap-to-select patterns)
- Visual feedback systems (canvas indicators, toasts)
- Data layer (hub-model sync groups)
- Floating panel VR support

All designs integrate with the existing codebase architecture including:
- `ViewConfigurationManager` 
- `InstanceCard` component system
- `FloatingPanel` context
- `useDragSource` / `useDropTarget` hooks
- SASS design tokens

---

## File Inventory (13 Files)

### Core Linking System

| File | Purpose | Lines | Priority |
|------|---------|-------|----------|
| `ViewConfigurationManager_Hub_Model_Spec.js` | Data layer: SyncGroup classes, hub election, propagation | ~600 | P0 |
| `View_Linking_System_Implementation_Guide_v2.md` | Context document, architecture decisions | ~400 | P0 |

### UI Components - Desktop

| File | Purpose | Lines | Priority |
|------|---------|-------|----------|
| `link-manager-panels.jsx` | 3 floating panels: View Link Manager, User Following, Workspace Links Hub | ~800 | P1 |
| `instance-card-link-extensions.jsx` | Badge atoms (LinkBadge, HubBadge, ModeBadge, etc.) + InstanceCard extensions | ~700 | P1 |
| `drag-to-link-interaction.jsx` | DragLinkContext, QuickLinkPopup, desktop drag handlers | ~500 | P1 |
| `canvas-link-indicators.jsx` | ViewportLinkBorder, SyncPulseRipple, LinkConnectionLines, MiniMap overlay | ~900 | P2 |

### UI Components - Shared

| File | Purpose | Lines | Priority |
|------|---------|-------|----------|
| `toast-notification-system.jsx` | ToastProvider, toast helpers for link events and general app | ~500 | P1 |

### VR Interaction System

| File | Purpose | Lines | Priority |
|------|---------|-------|----------|
| `vr-interaction-patterns.jsx` | Generic VR patterns: InteractionProvider, useLinkInteraction, useReorderInteraction, useMoveInteraction, useResizeInteraction, VRRadialMenu | ~800 | P0 |
| `vr-view-linking-implementation.jsx` | VR linking: VRLinkBadge, VRLinkTargetOverlay, VRQuickLinkPanel, useVRLinking | ~700 | P1 |
| `vr-canvas-interactions.jsx` | VR canvas: TransferProvider, VRZonePicker, VRCanvasEdgeTarget, modifier toggles | ~800 | P1 |
| `vr-floating-panel-system.jsx` | VR panels: VRPanelProvider, VRFloatingPanel, snap positions, arrangement controls | ~900 | P2 |
| `vr-canvas-navigator.jsx` | VR minimap: VRCanvasNavigator, cell selection, move/swap action picker | ~600 | P2 |

---

## Implementation Order

### Phase 1: Foundation (Data Layer)

```
1. ViewConfigurationManager_Hub_Model_Spec.js
   └── Add SyncGroup, SyncGroupMembership classes
   └── Add sync group methods to ViewConfigurationManager
   └── Add SYNC_GROUP_EVENTS to eventConstants.js
   └── Run migration utility for existing links
```

**Files to modify:**
- `src/core/data/managers/ViewConfigurationManager.js`
- `src/core/events/eventConstants.js`
- `src/core/data/models/ViewConfiguration.js` (if needed)

### Phase 2: Badge Atoms

```
2. instance-card-link-extensions.jsx
   └── Create src/ui/react/components/atoms/Badge/LinkBadge.jsx
   └── Create src/ui/react/components/atoms/Badge/HubBadge.jsx
   └── Create src/ui/react/components/atoms/Badge/ModeBadge.jsx
   └── Create src/ui/react/components/atoms/Badge/ViewerBadge.jsx
   └── Create src/ui/react/components/atoms/Badge/SyncStatusIndicator.jsx
   └── Add Storybook stories for each
```

**New files to create:**
- `src/ui/react/components/atoms/Badge/LinkBadge.jsx`
- `src/ui/react/components/atoms/Badge/LinkBadge.stories.jsx`
- (etc. for each badge)

### Phase 3: Toast System

```
3. toast-notification-system.jsx
   └── Create src/ui/react/context/ToastContext.jsx
   └── Create src/ui/react/components/molecules/Toast/Toast.jsx
   └── Create src/ui/react/components/molecules/Toast/ToastContainer.jsx
   └── Add ToastProvider to app root
   └── Export linkToasts and appToasts helpers
```

### Phase 4: Desktop Drag-to-Link

```
4. drag-to-link-interaction.jsx
   └── Create src/ui/react/context/DragLinkContext.jsx
   └── Create src/ui/react/components/canvas/DragLinkOverlay.jsx
   └── Create src/ui/react/components/molecules/QuickLinkPopup/QuickLinkPopup.jsx
   └── Integrate with ViewItem and InstanceCard
```

### Phase 5: VR Interaction Foundation

```
5. vr-interaction-patterns.jsx
   └── Create src/ui/react/context/InteractionContext.jsx
   └── Create src/ui/react/hooks/useAdaptiveInteraction.js
   └── Create src/ui/react/components/vr/VRInteractionOverlay.jsx
   └── Create src/ui/react/components/vr/VRRadialMenu.jsx
   └── Create src/ui/react/components/vr/VRButton.jsx
```

### Phase 6: Floating Panels

```
6. link-manager-panels.jsx
   └── Create src/ui/react/components/panels/FloatingPanels/ViewLinkManager/
   └── Create src/ui/react/components/panels/FloatingPanels/UserFollowingPanel/
   └── Create src/ui/react/components/panels/FloatingPanels/WorkspaceLinksHub/
   └── Register panels in FloatingPanelContext
```

### Phase 7: Canvas Indicators

```
7. canvas-link-indicators.jsx
   └── Create src/ui/react/context/LinkIndicatorsContext.jsx
   └── Create src/ui/react/components/canvas/ViewportLinkBorder.jsx
   └── Create src/ui/react/components/canvas/SyncPulseRipple.jsx
   └── Create src/ui/react/components/canvas/LinkConnectionLinesOverlay.jsx
   └── Integrate with CanvasCell and InstanceViewport
```

### Phase 8: VR Linking Implementation

```
8. vr-view-linking-implementation.jsx
   └── Create src/ui/react/components/vr/linking/VRLinkBadge.jsx
   └── Create src/ui/react/components/vr/linking/VRLinkTargetOverlay.jsx
   └── Create src/ui/react/components/vr/linking/VRQuickLinkPanel.jsx
   └── Create src/ui/react/hooks/useVRLinking.js
```

### Phase 9: VR Canvas Interactions

```
9. vr-canvas-interactions.jsx
   └── Create src/ui/react/context/TransferContext.jsx
   └── Create src/ui/react/components/vr/canvas/VRTransferableSource.jsx
   └── Create src/ui/react/components/vr/canvas/VRCanvasCellTarget.jsx
   └── Create src/ui/react/components/vr/canvas/VRZonePicker.jsx
   └── Extend useDragSource/useDropTarget with VR support
```

### Phase 10: VR Panel System

```
10. vr-floating-panel-system.jsx
    └── Create src/ui/react/context/VRPanelContext.jsx
    └── Create src/ui/react/components/vr/panels/VRFloatingPanel.jsx
    └── Create src/ui/react/components/vr/panels/VRPanelHeader.jsx
    └── Create src/ui/react/components/vr/panels/VRPanelModeMenu.jsx
    └── Extend existing FloatingPanelContext
```

### Phase 11: VR Canvas Navigator

```
11. vr-canvas-navigator.jsx
    └── Create src/ui/react/components/vr/navigator/VRCanvasNavigator.jsx
    └── Create src/ui/react/components/vr/navigator/VRNavigatorCell.jsx
    └── Create src/ui/react/components/vr/navigator/VRNavigatorActionPicker.jsx
    └── Integrate with existing CanvasNavigator
```

---

## Key Integration Points

### 1. ViewConfigurationManager Integration

The hub model extends the existing manager:

```javascript
// Existing methods to preserve:
linkProperty(viewId, property, targetViewId, mode)
unlinkProperty(viewId, property)

// New methods to add:
createSyncGroup(hubViewId, property, options)
joinSyncGroup(viewId, property, groupId, mode)
leaveSyncGroup(viewId, property)
getSyncGroup(viewId, property)
getSyncGroupMembers(viewId, property)
linkViewToView(sourceViewId, targetViewId, property, mode) // High-level API

// New events:
SYNC_GROUP_CREATED
SYNC_GROUP_DISSOLVED
SYNC_GROUP_MEMBER_JOINED
SYNC_GROUP_MEMBER_LEFT
SYNC_GROUP_HUB_CHANGED
SYNC_GROUP_SYNC_PROPAGATED
```

### 2. InstanceCard Integration

Add new props to existing InstanceCard:

```javascript
// New props
linkCount?: number;
viewerCount?: number;
isHub?: boolean;
linkMode?: 'follow' | 'sync' | 'broadcast';
syncStatus?: 'synced' | 'syncing' | 'error';
onLinkBadgeClick?: () => void;
onLinkBadgeDragStart?: (e: DragEvent) => void;
isLinkDropTarget?: boolean;
onLinkDrop?: (sourceViewId: string) => void;
```

### 3. Adaptive Hook Pattern

All drag-related hooks should check `isVR` and return appropriate handlers:

```javascript
export function useAdaptiveDragSource(options) {
  const { isVR } = useInteraction();
  
  if (isVR) {
    // Return tap-to-select handlers
    return { 
      handlers: { onClick: () => startTransfer(options) },
      isDragging: false 
    };
  }
  
  // Return standard drag handlers
  return useDragSource(options);
}
```

### 4. Context Provider Hierarchy

```jsx
<InteractionProvider>           {/* VR/Desktop detection */}
  <ToastProvider>               {/* Notifications */}
    <TransferProvider>          {/* VR canvas transfers */}
      <DragLinkProvider>        {/* Desktop drag-to-link */}
        <LinkIndicatorsProvider>{/* Canvas visual feedback */}
          <VRPanelProvider>     {/* VR panel positioning */}
            <App />
          </VRPanelProvider>
        </LinkIndicatorsProvider>
      </DragLinkProvider>
    </TransferProvider>
  </ToastProvider>
</InteractionProvider>
```

---

## Design Token Integration

All components use existing SASS tokens. Key mappings:

```scss
// Link property colors
$link-camera: $color-accent-teal;        // #2dd4bf
$link-filters: $color-accent-purple;     // #a78bfa
$link-colorMaps: $color-accent-pink;     // #f472b6
$link-widgets: $color-accent-amber;      // #fbbf24
$link-cursors: $color-accent-blue;       // #60a5fa
$link-annotations: $color-accent-orange; // #fb923c

// Status colors
$status-synced: $color-accent-green;     // #4ade80
$status-syncing: $color-accent-cyan;     // #22d3ee
$status-paused: $color-accent-amber;     // #fbbf24
$status-error: $color-accent-red;        // #f87171

// Role colors
$role-hub: $color-accent-amber;          // #fbbf24
$role-member: $color-accent-teal;        // #2dd4bf
```

---

## VR Controller Mapping

Standard Quest controller bindings:

| Button | Primary Action | With Selection |
|--------|----------------|----------------|
| Trigger | Select/Confirm | Confirm action |
| Grip | Grab panel | Move grabbed |
| A | Accept | Complete interaction |
| B | Cancel/Back | Cancel interaction |
| Thumbstick | Navigate | Adjust value |
| Thumbstick Press | Context menu | - |

---

## Testing Checklist

### Unit Tests

- [ ] SyncGroup class methods
- [ ] Hub election algorithms
- [ ] Link propagation logic
- [ ] Toast auto-dismiss timing

### Component Tests

- [ ] Badge atoms render correctly with all props
- [ ] QuickLinkPopup property/mode selection
- [ ] VRZonePicker action selection
- [ ] Toast stacking behavior

### Integration Tests

- [ ] Desktop: Drag badge → Drop on target → Link created
- [ ] VR: Tap source → Tap target → Panel → Confirm → Link created
- [ ] Sync propagation from hub to members
- [ ] Hub leaving triggers election
- [ ] Canvas indicators update on link changes

### VR-Specific Tests

- [ ] Panels grabbable and movable
- [ ] Snap zones work correctly
- [ ] Thumbstick resize works while grabbed
- [ ] All touch targets ≥ 44px

---

## Notes for Implementation

### 1. Start with Data Layer
The hub model is foundational. Get SyncGroup working with tests before UI.

### 2. Badge Atoms with Storybook
Create each badge in isolation with comprehensive stories before integration.

### 3. VR Context Detection
The `InteractionProvider` should integrate with the existing XR session management:
```javascript
// When XR session starts
interactionContext.setVRMode(true, hasControllers);

// When XR session ends
interactionContext.setVRMode(false);
```

### 4. Preserve Existing Behavior
Desktop drag-and-drop must continue working exactly as before. VR patterns are additive.

### 5. useAdaptive Hook
Components can use `useAdaptive()` (existing hook) for responsive sizing. VR mode should trigger larger touch targets automatically.

---

## Files Location Summary

After implementation, new files should be organized as:

```
src/
├── core/
│   ├── data/
│   │   ├── managers/
│   │   │   └── ViewConfigurationManager.js  # Extended
│   │   └── models/
│   │       └── SyncGroup.js                 # New
│   └── events/
│       └── eventConstants.js                # Extended
│
├── ui/react/
│   ├── context/
│   │   ├── ToastContext.jsx                 # New
│   │   ├── DragLinkContext.jsx              # New
│   │   ├── LinkIndicatorsContext.jsx        # New
│   │   ├── InteractionContext.jsx           # New
│   │   ├── TransferContext.jsx              # New
│   │   └── VRPanelContext.jsx               # New
│   │
│   ├── hooks/
│   │   ├── useVRLinking.js                  # New
│   │   ├── useAdaptiveInteraction.js        # New
│   │   └── dragDropTypes.js                 # Extended
│   │
│   ├── components/
│   │   ├── atoms/
│   │   │   └── Badge/
│   │   │       ├── LinkBadge.jsx            # New
│   │   │       ├── HubBadge.jsx             # New
│   │   │       ├── ModeBadge.jsx            # New
│   │   │       ├── ViewerBadge.jsx          # New
│   │   │       └── SyncStatusIndicator.jsx  # New
│   │   │
│   │   ├── molecules/
│   │   │   ├── Toast/
│   │   │   │   ├── Toast.jsx                # New
│   │   │   │   └── ToastContainer.jsx       # New
│   │   │   └── QuickLinkPopup/
│   │   │       └── QuickLinkPopup.jsx       # New
│   │   │
│   │   ├── organisms/
│   │   │   └── InstanceCard/
│   │   │       ├── InstanceCard.jsx         # Extended
│   │   │       └── components/
│   │   │           └── InstanceCardBadges.jsx # New
│   │   │
│   │   ├── panels/
│   │   │   └── FloatingPanels/
│   │   │       ├── ViewLinkManager/         # New folder
│   │   │       ├── UserFollowingPanel/      # New folder
│   │   │       └── WorkspaceLinksHub/       # New folder
│   │   │
│   │   ├── canvas/
│   │   │   ├── DragLinkOverlay.jsx          # New
│   │   │   ├── ViewportLinkBorder.jsx       # New
│   │   │   ├── SyncPulseRipple.jsx          # New
│   │   │   └── LinkConnectionLinesOverlay.jsx # New
│   │   │
│   │   └── vr/
│   │       ├── VRInteractionOverlay.jsx     # New
│   │       ├── VRRadialMenu.jsx             # New
│   │       ├── VRButton.jsx                 # New
│   │       ├── linking/
│   │       │   ├── VRLinkBadge.jsx          # New
│   │       │   ├── VRLinkTargetOverlay.jsx  # New
│   │       │   └── VRQuickLinkPanel.jsx     # New
│   │       ├── canvas/
│   │       │   ├── VRTransferableSource.jsx # New
│   │       │   ├── VRCanvasCellTarget.jsx   # New
│   │       │   └── VRZonePicker.jsx         # New
│   │       ├── panels/
│   │       │   ├── VRFloatingPanel.jsx      # New
│   │       │   ├── VRPanelHeader.jsx        # New
│   │       │   └── VRPanelModeMenu.jsx      # New
│   │       └── navigator/
│   │           ├── VRCanvasNavigator.jsx    # New
│   │           └── VRNavigatorCell.jsx      # New
```

---

## Quick Start Commands

```bash
# After downloading spec files, start with:

# 1. Read the implementation guide
cat View_Linking_System_Implementation_Guide_v2.md

# 2. Start with data layer
# Open ViewConfigurationManager_Hub_Model_Spec.js
# Implement SyncGroup class first

# 3. Create badge atoms with stories
# Use instance-card-link-extensions.jsx as reference

# 4. Work through phases in order
```

---

## Questions for Implementation

If unclear during implementation, prioritize:

1. **Existing patterns** - Follow conventions in the codebase
2. **Simplest working solution** - Don't over-engineer
3. **Test early** - Unit test data layer before UI
4. **VR is additive** - Don't break desktop behavior

---

*Generated by Claude on this design session. All code is reference implementation - adapt to match existing codebase conventions.*
