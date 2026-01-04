# Canvas Area Design Specification

**CIA Web - Collaborative Immersive Analytics Platform**

Version 1.0 - December 2024

---

## Document Overview

This specification defines the complete design for the Canvas Area of CIA Web, the central workspace where users interact with 3D visualizations. The Canvas Area encompasses the grid system, instance viewports, toolbars, selection mechanics, and floating panels.

### Design Principles

- **Plugin-aware:** Generic components that work with any InstanceTypeHandler
- **Performance-first:** Progressive loading with smooth transitions
- **Collaborative:** Real-time multi-user interaction support
- **Flexible:** Supports arbitrary grid configurations and merged cells
- **VR-ready:** All interactions designed with VR mode consideration

---

## Implementation Status Summary

| Component | Status | Priority |
|-----------|--------|----------|
| CanvasGrid | ðŸ”„ Partial | P0 |
| CanvasCell | ðŸ”„ Partial | P0 |
| DropZone System | âŒ TODO | P0 |
| InstanceViewport | ðŸ”„ Partial | P0 |
| InstanceHeader | ðŸ”„ Partial | P0 |
| InstanceToolbar | ðŸ”„ Partial | P1 |
| ThumbnailLayer | âŒ TODO | P1 |
| SelectionManager | âŒ TODO | P1 |
| Canvas Navigator (Popout) | âŒ TODO | P2 |
| FloatingPanel System | âŒ TODO | P1 |

---

## âœ… IMPLEMENTED

### Canvas Grid (Partial)

**Implemented:**
- Basic grid layout system
- Cell container structure
- Basic drag and drop functionality
- Grid resize capability

### Canvas Cell (Partial)

**Implemented:**
- Cell container component
- Basic cell styling
- Viewport container rendering

### Instance Viewport (Partial)

**Implemented:**
- Viewport container structure
- VTK.js integration
- Basic viewport rendering

### Instance Header (Partial)

**Implemented:**
- Basic header bar structure
- View name display
- Close button

### Instance Toolbar (Partial)

**Implemented:**
- Basic toolbar structure
- Some tool buttons
- Hover show/hide behavior

---

## âŒ REMAINING TO IMPLEMENT

### Canvas Grid - Complete Implementation

The Canvas Grid is a flexible, resizable grid system that contains instance viewports. Users can configure grid dimensions, merge cells, and place views in any arrangement.

**Grid Layout Properties:**

| Property | Value |
|----------|-------|
| Cell Aspect Ratio | Fill available space (no fixed ratio) |
| Grid Gap | 4px consistent between all cells |
| Min Grid Size | 1 column Ã— 1 row |
| Max Grid Size | Unlimited (practical limit ~50Ã—50) |
| Cell Calculation | height = (viewport_height - gaps) / rows |

**Empty Cell Appearance:**

Empty cells have subtle visual indicators that become more prominent in Edit mode.

**Normal Mode:**
- Background: `rgba(255, 255, 255, 0.02)` - very subtle fill
- Border: `1px dashed rgba(255, 255, 255, 0.08)`

**Edit Mode:**
- Background: `rgba(255, 255, 255, 0.04)` - more visible
- Border: `1px dashed rgba(255, 255, 255, 0.15)`
- Hover: Blue tint `rgba(96, 165, 250, 0.08)` with accent border

**Merged Cells:**
Users can merge adjacent cells to create larger viewport areas. When merging cells that contain multiple views, a conflict resolution dialog appears.

**Merge Conflict Dialog Options:**
- Select which view to keep and expand to merged area
- Close displaced views (move to 'Not Placed')
- Autoflow displaced views to next available cells
- Option to remember choice for session

### Drop Zones (Full implementation needed)

The drop zone system enables intuitive drag-and-drop placement without requiring Edit mode for common operations.

**Mode Philosophy:**

| Mode | Available Operations |
|------|----------------------|
| Normal Mode | Move, Swap, Push, Replace, Reorder views |
| Edit Mode | Merge cells, Unmerge cells, Resize canvas, Delete rows/columns, Cell constraints, Template editing |

**Drop Zone Types:**

| Zone | Location | Action |
|------|----------|--------|
| Place | Empty cell center | Place view in empty cell |
| Swap | Occupied cell center (60%) | Swap positions of two views |
| Push Up | Top 20% of any cell | Insert above, push existing down |
| Push Down | Bottom 20% of any cell | Insert below, push existing up |
| Push Left | Left 20% of any cell | Insert left, push existing right |
| Push Right | Right 20% of any cell | Insert right, push existing left |
| Canvas Edge | Beyond canvas boundary | Expand canvas and place |

**Push Behavior:**
When pushing views, the canvas auto-expands to accommodate all views. Modifier keys provide alternative behaviors:

| Modifier | Behavior |
|----------|----------|
| Normal push | Auto-expand canvas, never close views |
| Shift + push | Wrap to next row (respects flow direction) |
| Ctrl + push | Close last view (with undo available) |

**Push Sizing:** New views use the spawn size setting from the Layout tab.

**Visual Feedback:**

| Zone Type | Visual Style |
|-----------|--------------|
| Place | Green tint `rgba(74, 222, 128, 0.15)`, green border, 'Place Here' label |
| Swap | Blue overlay `rgba(96, 165, 250, 0.2)`, blue border, swap icon |
| Push | Amber half-cell preview, dashed amber border, arrow + 'Push' label |
| Canvas Edge | '+' indicator showing new row/column preview |

### Selection States (Full implementation needed)

The selection system supports single, multiple, and range selection of cells for bulk operations.

**Selection Interactions:**

| Action | Result |
|--------|--------|
| Click | Select single cell, deselect others |
| Ctrl + Click | Toggle cell in selection (add/remove) |
| Shift + Click | Select rectangular range from last selected |
| Ctrl + Shift + Click | Add rectangular range to existing selection |
| Click empty area | Deselect all |
| Escape | Deselect all |
| Ctrl + A | Select all cells with views |

**Active vs Selected:**
- **Active Instance:** The one receiving keyboard input, shown in Instance Tools tab
- **Selected Cells:** The ones selected for bulk operations
- **Behavior:** Active follows last click (Ctrl+click changes both active and selection)

**Keyboard Navigation:**

| Mode | Arrow Keys | Shift + Arrows |
|------|------------|----------------|
| Normal Mode | Move selection between cells | Extend selection range |
| Edit Mode | Move selected view(s) | Resize selected view(s) |

**Tab:** Cycles through views in both modes

**Selection Visual States:**

| State | Visual Style |
|-------|--------------|
| Hover | Border: `rgba(255, 255, 255, 0.2)` |
| Selected | Border: accentBlue, subtle box-shadow |
| Primary (last clicked) | Border: accentBlue, 3px width |
| Range preview | Dashed border: `rgba(96, 165, 250, 0.5)` |

**Selection Context Menu:**
Right-click on selection shows context menu with header showing count of selected cells.

**Menu Options:**
- Swap (2 views only), Merge Cells, Align (Left/Right/Top/Bottom)
- Copy Layout, Save as Bookmark, Link Selected
- Close All, Delete All (with confirmation)

### Thumbnail System (Full implementation needed)

The thumbnail system provides progressive loading with smooth transitions from placeholder to thumbnail to live render.

**Loading States:**

| State | Visual | Duration |
|-------|--------|----------|
| Placeholder | Dataset type icon + 'Loading...' text | ~100-500ms |
| Thumbnail | Server-generated preview, object-fit: cover | Until WebGL ready |
| Render | Live VTK.js rendering | Interactive |

**Transition:** Crossfade (opacity) over 200ms between states

**Thumbnail Format Strategy:**

| Handler Type | Format | Rationale |
|--------------|--------|-----------|
| VTK (3D meshes) | WebP 512Ã—512 | Best compression for 3D renders |
| Chart (2D plots) | SVG | Vectors scale perfectly |
| Table | SVG | Simple grid representation |
| Image Viewer | WebP | Match source characteristics |
| Network Graph | SVG | Node/edge diagrams are vector-native |

**Cache Strategy:**
- **Cache Key:** `thumb_{viewId}_{visualHash}`
- **Visual Hash:** SHA-256 of camera, filters, representation, colorMapping, clipPlanes, visibleLayers
- **Update Trigger:** Debounced (500ms) on visual property change
- **Stale Handling:** Return stale immediately, regenerate async, notify via WebSocket
- **Live Capture:** Client captures WebGL canvas for instant update while server regenerates

### Instance Header - Complete Implementation

Each instance viewport has a header bar providing quick access to common actions and identification.

**Responsive Layout:**

| Width | Visible Elements |
|-------|------------------|
| Full width | [Wrench] View Name [More] [Expand] [VR] [Close] |
| Medium | [Wrench] View Name [More] [Expand] [Close] (VR in More menu) |
| Small | View Name [More] [Close] (Wrench, Expand in More menu) |

**Header Icons:**

| Icon | Action | Always Visible |
|------|--------|----------------|
| Wrench | Open Instance Tools floating panel | Until small width |
| More/Settings | Full tools dropdown menu | Always |
| Expand | Fullscreen/Expand viewport | Until small width |
| VR | Enter VR for this instance | Until medium width |
| Close | Close view (move to Not Placed) | Always |

**More Menu Contents:**
The More menu serves as a portal to all tools, ensuring no functionality is lost at any viewport size.

**Menu Sections:**
- **Tools:** Instance Tools Panel, Expand, Enter VR Mode
- **Navigation:** Reset Camera, Fit to View, Center on Selection
- **Representation:** Surface, Wireframe, Points (radio selection)
- **View:** Capture Thumbnail, Save as Bookmark, Duplicate View, Link Settings
- **Danger:** Close View, Delete View (red, with confirmation)

**Orientation Cube:**
The VTK orientation cube has been moved from the header into the viewport itself.
- **Location:** Inside viewport corner (not in header)
- **Toggle:** Optional via Instance Tools > Appearance
- **Default:** ON for VTK types, configurable per handler

### Instance Toolbar (Mini Toolbar) - Complete Implementation

A context-sensitive toolbar that appears on hover, providing quick access to common visualization tools.

**Position and Trigger:**

| Property | Value |
|----------|-------|
| Position | Top-center of viewport |
| Trigger | Immediate on mouse enter |
| Hide | 500ms after mouse leaves viewport AND toolbar |
| Active state | Subtle persistent outline when viewport is active |

**Pin Behavior:**
- Pin toggle available in 'more' (three dots) menu
- When pinned: Toolbar always visible, pin icon shown
- Pin state persisted per viewport in user preferences

**Tool Configuration:**
Each InstanceTypeHandler declares its toolbar configuration via getToolbarConfig() method. Default tools for VTK:

| Tool | In Toolbar | In More Menu |
|------|------------|--------------|
| Pan | Yes | Yes |
| Zoom | Yes | Yes |
| Rotate | Yes (3D only) | Yes |
| Representation dropdown | Yes | Yes |
| Color Map dropdown | No | Yes |
| Add Annotation | Yes | Yes |
| Ruler widget | No | Yes |
| Clip Plane widget | No | Yes |
| More (three dots) | Yes | N/A |

**Menu Direction Fix:**
Menus open intelligently based on position to avoid obscuring the toolbar:
- Buttons in left half: menus open to the right
- Buttons in right half: menus open to the left
- Vertical: down if space available (>200px), else up
- Menus always open BELOW toolbar, never overlapping it

### Instance Tools Floating Panel (Full implementation needed)

A floating panel providing full access to instance controls without requiring the Left Panel to be open.

**Panel Properties:**

| Property | Value |
|----------|-------|
| ID | instance-tools |
| Default Position | Near active viewport |
| Default Size | 300Ã—450 px |
| Min Size | 260Ã—300 px |
| Resizable | Yes |
| Dock Target | Left Panel â†’ Instance Tools tab |

**Triggers:**
- Click wrench icon in instance header
- Keyboard shortcut: T

**Content Structure:**
Same subtabs as Left Panel's Instance Tools tab:
- **Tools:** Navigation, Camera Presets, Representation, Opacity, Widgets
- **Layers:** Visibility and opacity control per layer
- **Annotations:** Quick annotation tools (portal to full Annotations tab)

**Behavior:**
- **Follows Active:** Title and content update when active instance changes
- **Position Persistence:** Saved per-user in database
- **Minimize:** Collapses to title bar only
- **Dock Button:** Moves content to Left Panel's Instance Tools tab
- **Single Instance:** Only one floating Instance Tools panel at a time

### Floating Panels System (Full implementation needed)

All floating panels share common behavior and appearance for consistency.

**Common Features:**
- Header with title, minimize, dock (if applicable), close buttons
- Draggable positioning with snap-to-corner behavior
- Resizable (where appropriate)
- Position/size persistence per-user in database
- Z-index management (click to bring forward)

**Canvas Navigator Popout:**

| Property | Value |
|----------|-------|
| ID | canvas-navigator |
| Default Position | Bottom-left, above Secondary Footer |
| Default Size | 400Ã—320 px |
| Min Size | 280Ã—200 px |
| Dock Target | Left Panel â†’ Layout tab |
| Trigger | Secondary Footer map button, Ctrl+M |

**Features:** Mode toggle (Layout/Views), minimap, D-pad navigation, position display, zoom controls, canvas size controls

**Scratchpad Popout:**

| Property | Value |
|----------|-------|
| ID | scratchpad |
| Default Position | Bottom-right, above Secondary Footer |
| Default Size | 320Ã—280 px |
| Min Size | 240Ã—180 px |
| Dock Target | None (standalone) |
| Trigger | Secondary Footer sticky note button, Ctrl+S |

**Share Modes:**
- **Private:** Only you can see/edit
- **Workspace:** Everyone in current workspace sees it
- **Project:** Persists across workspaces, all project members see it

**Z-Index Management:**
Floating panels start at z-index 200 (above dropdowns). Each panel click increments the top z-index and brings that panel forward.

**Snap-to-Corner Behavior:**
- **Snap Threshold:** 20px from edge triggers snap
- **Edge Padding:** 8px from viewport edge when snapped
- Snaps to: left edge, right edge, top edge, bottom edge

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

## File Structure

Recommended file organization for Canvas Area components:

```
src/ui/react/components/canvas/
â”œâ”€â”€ CanvasGrid/
â”‚   â”œâ”€â”€ CanvasGrid.jsx
â”‚   â”œâ”€â”€ CanvasGrid.logic.js
â”‚   â”œâ”€â”€ CanvasGrid.scss
â”‚   â”œâ”€â”€ CanvasCell.jsx
â”‚   â””â”€â”€ DropZone.jsx
â”œâ”€â”€ InstanceViewport/
â”‚   â”œâ”€â”€ InstanceViewport.jsx
â”‚   â”œâ”€â”€ InstanceViewport.logic.js
â”‚   â”œâ”€â”€ InstanceViewport.scss
â”‚   â”œâ”€â”€ InstanceHeader.jsx
â”‚   â”œâ”€â”€ InstanceToolbar.jsx
â”‚   â””â”€â”€ ThumbnailLayer.jsx
â”œâ”€â”€ FloatingPanels/
â”‚   â”œâ”€â”€ FloatingPanel.jsx
â”‚   â”œâ”€â”€ FloatingPanel.scss
â”‚   â”œâ”€â”€ useFloatingPanel.js
â”‚   â”œâ”€â”€ CanvasNavigatorPopout.jsx
â”‚   â”œâ”€â”€ ScratchpadPopout.jsx
â”‚   â””â”€â”€ InstanceToolsPopout.jsx
â””â”€â”€ Selection/
    â”œâ”€â”€ SelectionManager.js
    â”œâ”€â”€ useSelection.js
    â””â”€â”€ SelectionContextMenu.jsx
```

---

## Summary

The Canvas Area provides the central workspace for CIA Web, enabling flexible visualization layout, intuitive drag-and-drop interaction, and comprehensive tooling access.

### Key Architectural Decisions

| Component | Key Decision |
|-----------|--------------|
| Grid Layout | Fill available space, 4px gap, no fixed aspect ratio |
| Empty Cells | Subtle dashed border, enhanced in Edit mode |
| Drop Zones | Center = place/swap, Edges = push (no Edit mode required) |
| Push Behavior | Auto-expand canvas by default |
| Thumbnails | Visual hash cache, WebP/SVG hybrid by handler type |
| Instance Header | Responsive icons, orientation cube moved to viewport |
| Instance Toolbar | Top-center hover, handler-configurable, pinnable |
| Floating Panels | Draggable, resizable, persist position, snap-to-corner |

---

*This document serves as the authoritative reference for Canvas Area implementation.*

*All new features must align with this specification.*
