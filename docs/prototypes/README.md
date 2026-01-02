# CIA Web - Design Prototypes

This folder contains interactive React prototype artifacts created during UI design sessions. These serve as visual references for implementation.

## How to View Prototypes

1. Open `react-component-viewer.html` in a browser
2. Drag and drop any `.jsx` file onto the viewer
3. The prototype will render interactively

Alternatively, copy the JSX content into a React playground like CodeSandbox or StackBlitz.

---

## Prototype Files

### 1. final-cell-explorer.jsx
**Purpose:** Complete instance cell UI design with all three control areas

**Contains:**
- Instance Header (6 responsive breakpoints)
- Instance Toolbar (hover/pin reveal, type-specific tools)
- Navigation Notch (carved edge element for camera/zoom)
- Header Menu (simplified structure, no type-specific options)
- Interactive cell simulation with resize

**Key Decisions Captured:**
- Header underline accent style (2px border in instance color)
- Toolbar menu direction logic (left/right based on position)
- Navigation notch positions (left/bottom/right)
- Zoom % behavior (click=dropdown, double-click=edit)
- Responsive breakpoints for all components

### 2. adaptive-components.jsx
**Purpose:** VR-first, desktop-friendly component system

**Contains:**
- ModeContext (desktop/VR switching)
- Icon component with weight system
- AdaptiveButton, AdaptiveToggle, AdaptiveSlider
- AdaptiveSection, AdaptiveOptionList, AdaptiveTabs
- AdaptiveCameraGrid, AdaptiveZoomControl
- InstanceInfoCard, QuickToolsBar
- AdaptivePanel (draggable container)
- AdaptiveViewItem (view list item with tools)

**Key Decisions Captured:**
- Sizing tokens for desktop vs VR
- Icon weight system (thin→bold, default varies by mode)
- Touch target sizes (32px desktop → 56px VR)
- No hover-dependent interactions (VR compatibility)

### 3. canvas-minimap-operations-v2.jsx
**Purpose:** Canvas grid operations and minimap navigation

**Contains:**
- Interactive minimap with viewport indicator
- Grid manipulation tools (add row/col, merge cells)
- D-pad navigation
- View mode toggles
- Collaborator presence indicators
- Selection rectangle tool

**Key Decisions Captured:**
- Minimap interaction patterns
- Cell selection for merge operations
- Viewport navigation controls
- Presence visualization

### 4. react-component-viewer.html
**Purpose:** Standalone viewer for testing JSX prototypes

**Usage:**
1. Open in browser
2. Drag-drop any .jsx file
3. Prototype renders with hot-reload

---

## Design Tokens (from prototypes)

### Colors
```javascript
const tokens = {
  bgPrimary: '#0a0c10',      // Blue-tinted dark
  bgSecondary: '#10141c',
  bgTertiary: '#161c28',
  borderSubtle: 'rgba(96, 165, 250, 0.06)',
  borderDefault: 'rgba(96, 165, 250, 0.1)',
  textPrimary: '#f0f0f5',
  textSecondary: '#a0a0b0',
  textMuted: '#606070',
  accentBlue: '#60a5fa',
  accentGreen: '#4ade80',
  accentAmber: '#fbbf24',
  accentPurple: '#a78bfa',
  accentTeal: '#2dd4bf',
  accentPink: '#f472b6',
  accentRed: '#f87171',
};
```

### Instance Colors
```javascript
const VIEW_COLORS = [
  { hex: '#60a5fa', name: 'Blue' },
  { hex: '#4ade80', name: 'Green' },
  { hex: '#f472b6', name: 'Pink' },
  { hex: '#fbbf24', name: 'Amber' },
  { hex: '#2dd4bf', name: 'Teal' },
  { hex: '#a78bfa', name: 'Purple' },
];
```

### Responsive Breakpoints
```javascript
// Instance Cell Breakpoints
const getBreakpoint = (width) => {
  if (width >= 450) return 'full';
  if (width >= 380) return 'large';
  if (width >= 300) return 'medium';
  if (width >= 220) return 'small';
  if (width >= 160) return 'tiny';
  return 'micro';
};
```

---

## Implementation Notes

These prototypes use inline styles for rapid iteration. When implementing:

1. **Extract styles to SCSS** using existing design tokens
2. **Use BEM naming** following project conventions
3. **Separate logic** using headless component pattern (.logic.js)
4. **Connect to hooks** (useViewMetadata, useInstanceType, etc.)
5. **Make handler-generic** - VTK is reference, but support any InstanceTypeHandler

---

## Related Documentation

- `Instance_Tools_Canvas_System_Implementation.md` - Full implementation prompt
- `Canvas_Area_Design_Specification.md` - Formal specification
- `Adaptive_Components_Implementation_Prompt.md` - Detailed component specs
- `Implementation_Priorities.md` - Project roadmap

---

*Created: January 2025*
