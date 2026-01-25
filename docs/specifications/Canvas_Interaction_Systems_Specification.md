# Canvas Interaction Systems Specification

**CIA Web - Collaborative Immersive Analytics Platform**

Version 2.0 - January 2026

---

## Document Overview

This specification consolidates the **still-relevant interaction systems** from the original Canvas Area Design Specification that are NOT covered by the newer toolsandcanvas specifications.

**What's covered here:**
- Drop Zone System (drag-and-drop mechanics)
- Thumbnail System (progressive loading)
- Selection Manager (multi-select, keyboard navigation)

**What's NOT covered here (see newer specs):**
- Instance Header → See `toolsandcanvas/RoomHeader/` (Mini Canvas Header, Full Canvas Header)
- Instance Toolbar → See `toolsandcanvas/Widget_Creation_Part2` (Canvas Toolbar Footer)
- Canvas Navigator → See `toolsandcanvas/RoomHeader/` (Popout Windows)
- Floating Panels → See `FloatingPanel_Component_Specification.md`

---

## 1. Drop Zone System

The drop zone system enables intuitive drag-and-drop placement without requiring Edit mode for common operations.

### Mode Philosophy

| Mode | Available Operations |
|------|----------------------|
| Normal Mode | Move, Swap, Push, Replace, Reorder views |
| Edit Mode | Merge cells, Unmerge cells, Resize canvas, Delete rows/columns, Cell constraints, Template editing |

### Drop Zone Types

| Zone | Location | Action |
|------|----------|--------|
| Place | Empty cell center | Place view in empty cell |
| Swap | Occupied cell center (60%) | Swap positions of two views |
| Push Up | Top 20% of any cell | Insert above, push existing down |
| Push Down | Bottom 20% of any cell | Insert below, push existing up |
| Push Left | Left 20% of any cell | Insert left, push existing right |
| Push Right | Right 20% of any cell | Insert right, push existing left |
| Canvas Edge | Beyond canvas boundary | Expand canvas and place |

### Push Behavior

When pushing views, the canvas auto-expands to accommodate all views. Modifier keys provide alternative behaviors:

| Modifier | Behavior |
|----------|----------|
| Normal push | Auto-expand canvas, never close views |
| Shift + push | Wrap to next row (respects flow direction) |
| Ctrl + push | Close last view (with undo available) |

**Push Sizing:** New views use the spawn size setting from the Layout tab.

### Visual Feedback

| Zone Type | Visual Style |
|-----------|--------------|
| Place | Green tint `rgba(74, 222, 128, 0.15)`, green border, 'Place Here' label |
| Swap | Blue overlay `rgba(96, 165, 250, 0.2)`, blue border, swap icon |
| Push | Amber half-cell preview, dashed amber border, arrow + 'Push' label |
| Canvas Edge | '+' indicator showing new row/column preview |

### Implementation Notes

```typescript
interface DropZone {
  type: 'place' | 'swap' | 'push-up' | 'push-down' | 'push-left' | 'push-right' | 'edge';
  targetCell: { row: number; col: number };
  preview: {
    affectedCells: CellPosition[];
    action: string;
    canvasExpands: boolean;
  };
}

interface DropZoneConfig {
  edgeThreshold: 0.2;      // 20% of cell dimension
  centerThreshold: 0.6;    // 60% center area for swap
  edgeDetectionPx: 40;     // Pixels from canvas edge
}
```

---

## 2. Thumbnail System

The thumbnail system provides progressive loading with smooth transitions from placeholder to thumbnail to live render.

### Loading States

| State | Visual | Duration |
|-------|--------|----------|
| Placeholder | Dataset type icon + 'Loading...' text | ~100-500ms |
| Thumbnail | Server-generated preview, object-fit: cover | Until WebGL ready |
| Render | Live VTK.js rendering | Interactive |

**Transition:** Crossfade (opacity) over 200ms between states

### Thumbnail Format Strategy

| Handler Type | Format | Rationale |
|--------------|--------|-----------|
| VTK (3D meshes) | WebP 512×512 | Best compression for 3D renders |
| Chart (2D plots) | SVG | Vectors scale perfectly |
| Table | SVG | Simple grid representation |
| Image Viewer | WebP | Match source characteristics |
| Network Graph | SVG | Node/edge diagrams are vector-native |

### Cache Strategy

- **Cache Key:** `thumb_{viewId}_{visualHash}`
- **Visual Hash:** SHA-256 of camera, filters, representation, colorMapping, clipPlanes, visibleLayers
- **Update Trigger:** Debounced (500ms) on visual property change
- **Stale Handling:** Return stale immediately, regenerate async, notify via WebSocket
- **Live Capture:** Client captures WebGL canvas for instant update while server regenerates

### Implementation Notes

```typescript
interface ThumbnailState {
  status: 'placeholder' | 'thumbnail' | 'live';
  thumbnailUrl: string | null;
  visualHash: string;
  isStale: boolean;
}

interface ThumbnailConfig {
  debounceMs: 500;
  crossfadeDuration: 200;
  maxCacheSize: 100;      // Max thumbnails in memory
  regenerateOnStale: true;
}
```

---

## 3. Selection Manager

The selection system supports single, multiple, and range selection of cells for bulk operations.

### Selection Interactions

| Action | Result |
|--------|--------|
| Click | Select single cell, deselect others |
| Ctrl + Click | Toggle cell in selection (add/remove) |
| Shift + Click | Select rectangular range from last selected |
| Ctrl + Shift + Click | Add rectangular range to existing selection |
| Click empty area | Deselect all |
| Escape | Deselect all |
| Ctrl + A | Select all cells with views |

### Active vs Selected

- **Active Instance:** The one receiving keyboard input, shown in Instance Tools tab
- **Selected Cells:** The ones selected for bulk operations
- **Behavior:** Active follows last click (Ctrl+click changes both active and selection)

### Keyboard Navigation

| Mode | Arrow Keys | Shift + Arrows |
|------|------------|----------------|
| Normal Mode | Move selection between cells | Extend selection range |
| Edit Mode | Move selected view(s) | Resize selected view(s) |

**Tab:** Cycles through views in both modes

### Selection Visual States

| State | Visual Style |
|-------|--------------|
| Hover | Border: `rgba(255, 255, 255, 0.2)` |
| Selected | Border: accentBlue, subtle box-shadow |
| Primary (last clicked) | Border: accentBlue, 3px width |
| Range preview | Dashed border: `rgba(96, 165, 250, 0.5)` |

### Selection Context Menu

Right-click on selection shows context menu with header showing count of selected cells.

**Menu Options:**
- Swap (2 views only), Merge Cells, Align (Left/Right/Top/Bottom)
- Copy Layout, Save as Bookmark, Link Selected
- Close All, Delete All (with confirmation)

### Implementation Notes

```typescript
interface SelectionState {
  selectedCells: Set<string>;      // "row-col" format
  activeCell: string | null;       // Primary selection
  rangeAnchor: string | null;      // For shift-click ranges
  isRangeSelecting: boolean;
}

interface SelectionActions {
  select: (cell: string, modifiers: { ctrl: boolean; shift: boolean }) => void;
  selectAll: () => void;
  clearSelection: () => void;
  moveSelection: (direction: 'up' | 'down' | 'left' | 'right') => void;
  extendSelection: (direction: 'up' | 'down' | 'left' | 'right') => void;
}
```

---

## 4. Empty Cell Appearance

Empty cells have subtle visual indicators that become more prominent in Edit mode.

**Normal Mode:**
- Background: `rgba(255, 255, 255, 0.02)` - very subtle fill
- Border: `1px dashed rgba(255, 255, 255, 0.08)`

**Edit Mode:**
- Background: `rgba(255, 255, 255, 0.04)` - more visible
- Border: `1px dashed rgba(255, 255, 255, 0.15)`
- Hover: Blue tint `rgba(96, 165, 250, 0.08)` with accent border

---

## 5. Merged Cells

Users can merge adjacent cells to create larger viewport areas. When merging cells that contain multiple views, a conflict resolution dialog appears.

**Merge Conflict Dialog Options:**
- Select which view to keep and expand to merged area
- Close displaced views (move to 'Not Placed')
- Autoflow displaced views to next available cells
- Option to remember choice for session

---

## File Structure

```
src/ui/react/components/canvas/
├── DropZone/
│   ├── DropZone.jsx
│   ├── DropZone.scss
│   ├── useDropZones.js
│   └── dropZoneUtils.js
├── Thumbnail/
│   ├── ThumbnailLayer.jsx
│   ├── ThumbnailLayer.scss
│   ├── useThumbnail.js
│   └── thumbnailCache.js
└── Selection/
    ├── SelectionManager.js
    ├── useSelection.js
    ├── SelectionOverlay.jsx
    └── SelectionContextMenu.jsx
```

---

## Design Tokens Reference

### Background Colors

| Token | Value |
|-------|-------|
| bgPrimary | #121218 |
| bgSecondary | #1a1a22 |
| bgTertiary | #0d0d12 |
| bgCanvas | #0a0a0f |

### Border Colors

| Token | Value |
|-------|-------|
| borderSubtle | rgba(255, 255, 255, 0.04) |
| borderDefault | rgba(255, 255, 255, 0.08) |
| borderMedium | rgba(255, 255, 255, 0.12) |

### Accent Colors

| Token | Value / Usage |
|-------|---------------|
| accentBlue | #60a5fa - Selection, Grid mode |
| accentGreen | #4ade80 - Flow mode, Place zone |
| accentAmber | #fbbf24 - Edit mode, Push zones |
| accentTeal | #2dd4bf - Pan tool, Linking |
| accentPurple | #a78bfa - Merge tool, Views |
| accentPink | #f472b6 - Shared status |
| accentRed | #f87171 - Close/delete actions |

---

## Implementation Status

| Component | Status | Priority |
|-----------|--------|----------|
| DropZone System | ❌ TODO | P0 |
| ThumbnailLayer | ❌ TODO | P1 |
| SelectionManager | ❌ TODO | P1 |

---

*This document extracts the still-relevant portions from the archived Canvas_Area_Design_Specification.md*
