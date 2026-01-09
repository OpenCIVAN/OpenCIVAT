# CIA Web - Design Prototypes

This folder contains interactive React prototype artifacts created during UI design sessions. These serve as visual references for implementation.

## How to View Prototypes

1. Open `react-component-viewer.html` in a browser
2. Drag and drop any `.jsx` file onto the viewer
3. The prototype will render interactively

Alternatively, copy the JSX content into a React playground like CodeSandbox or StackBlitz.

---

## Active Prototype Files

### 1. final-cell-explorer.jsx
**Purpose:** Complete instance cell UI design with all three control areas

**Contains:**
- Instance Header (6 responsive breakpoints)
- Instance Toolbar (hover/pin reveal, type-specific tools)
- Navigation Notch (carved edge element for camera/zoom)
- Header Menu (simplified structure, no type-specific options)
- Interactive cell simulation with resize

### 2. canvas-minimap-operations-v2.jsx
**Purpose:** Canvas grid operations and minimap navigation

**Contains:**
- Interactive minimap with viewport indicator
- Grid manipulation tools (add row/col, merge cells)
- D-pad navigation
- View mode toggles
- Collaborator presence indicators
- Selection rectangle tool

### 3. canvas-operations-panel-v2.jsx
**Purpose:** Canvas operations panel prototype

### 4. canvas-theme-explorer-v2.jsx
**Purpose:** Theme system exploration and testing tool

### 5. secondary-bars-v3.jsx
**Purpose:** Header/footer toolbar designs (latest version)

---

## Tools

### react-component-viewer.html
**Purpose:** Standalone viewer for testing JSX prototypes

**Usage:**
1. Open in browser
2. Drag-drop any .jsx file
3. Prototype renders with hot-reload

---

## Documentation

### Instance_Tools_Canvas_System_Implementation.md
Full implementation notes for the instance tools and canvas system.

---

## Archived Prototypes

Older versions and implemented prototypes have been moved to `../archive/prototypes/`:

- `adaptive-components.jsx` - Now implemented in atomic design system
- `view-context-complete.jsx` - Now implemented as ViewContextBlock
- `view-context-isolated.jsx` - Now implemented as ViewContextBlock
- `secondary-bars-v2.jsx` - Superseded by v3
- `CLAUDE_CODE_PROMPT.md` - Task-specific prompt
- `Instance_Viewport_Fixes_Prompt.md` - Task-specific prompt

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

- `../specifications/Canvas_Area_Design_Specification.md` - Formal specification
- `../specifications/Adaptive_Components_Implementation_Prompt.md` - Detailed component specs

---

*Last Updated: January 2025*
