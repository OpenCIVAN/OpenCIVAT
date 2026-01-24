# Instance Tools V2 - Design Session Memory Log

**Date:** January 24, 2026  
**Session Focus:** Complete redesign of Instance Tools panel to match Navigator V5, Layout Tab V4-6, Files Tab V7 patterns  
**Prototype Output:** `InstanceToolsV2.jsx`

---

## Executive Summary

Redesigned the Instance Tools panel with adaptive ViewGroup integration, dot-based section navigation, draggable layers, and full transform controls. The panel now follows the established pattern of stationary sections + tabbed content, with Layers & Widgets moved to the bottom as a "foundation" metaphor.

---

## Final Architecture

```
┌─────────────────────────────────────────┐
│ ● Brain Analysis  [Ax●][Sag○]━🔗━[3D○] │ ← ViewGroup Strip (adaptive)
├─────────────────────────────────────────┤
│ ◈ Axial Slice              [vtk-volume] │
│   patient_brain_mri.nii.gz      [A1]    │ ← Instance Header
├─────────────────────────────────────────┤
│ [🔧 Tools] [📍 Annotations]             │ ← Tab Bar
├─────────────────────────────────────────┤
│        ● ○ ○ ○ ○                        │ ← Dot Navigation
├─────────────────────────────────────────┤
│ ▼ 📷 Camera                             │
│ ▼ 🎛️ Transform                          │
│ ▼ 🔪 Slice                              │ ← Scrollable Sections
│ ▼ 🌗 Window/Level                       │
│ ▼ 👁 Appearance                         │
├═══════════ [resize] ════════════════════┤
│ ▼ LAYERS & WIDGETS          [3 visible] │ ← Stationary Bottom
│   ⋮⋮ [1] 👁 ● Base Volume         100%  │
│   ⋮⋮ [2] 👁 ● Tumor Seg            75%  │
│   📏 Line Measurement    [45.2 mm] 100% │
└─────────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. ViewGroup Strip (Adaptive Display)
| Views | Style | Behavior |
|-------|-------|----------|
| ≤5 | Connector style | Gradient lines between linked views with 🔗 icon |
| 6+ | Mini grid toggle | Compact chip + expandable grid showing spatial layout |

**Tipping Point:** 5 views (user confirmed)

### 2. Link Visualization
- **Option A (Gradient Connectors)** selected
- Gradient line from view A's color to view B's color
- Small 🔗 emoji centered on connector
- For mini grid: 🔗 badge on linked cells + legend below

### 3. Widget Value Interaction
- **Hover:** Shows styled popover with full details (position, measurements)
- **Click:** Copies value to clipboard with "✓ Copied" feedback
- VR adaptation: Tap to copy, long-press for details

### 4. Layer Reordering
- Drag handle (⋮⋮) on left side
- Index number shows render order (1 = top/front)
- Visual feedback: Purple highlight while dragging, teal dashed border on drop target

### 5. Panel Layout (NEW in V2)
- **Tabs at top** (Tools | Annotations)
- **Dot navigation** below tabs for section jumping
- **Scrollable tool sections** in middle
- **Layers & Widgets stationary at bottom** (foundation metaphor)

### 6. Dot Navigation
- One dot per tool section
- Active dot wider (20px vs 8px) with section color
- Click jumps to section + auto-expands if collapsed
- Auto-tracks scroll position

### 7. Transform Controls (Full Gimbal)
Three subsections:
1. **Position (Pan):** X/Y/Z sliders, -500 to +500 mm
2. **Rotation:** X/Y/Z sliders, -180° to +180°
3. **Scale:** Uniform toggle (🔗/🔓), 10% to 200%

Reset Transform button at bottom.

---

## Tool Sections (Type-Aware)

| Section | Icon | Color | Shows For |
|---------|------|-------|-----------|
| Camera | 📷 | Cyan | 3D types (volume, mesh) |
| Transform | 🎛️ | Pink | Types with transforms |
| Slice | 🔪 | Blue | Slice types |
| Window/Level | 🌗 | Orange | Medical imaging types |
| Appearance | 👁 | Green | All visual types |

Sections dynamically show/hide based on `InstanceTypeHandler` capabilities.

---

## Component Structure

```
InstanceToolsPanel/
├── ViewGroupStrip (adaptive connector/grid)
├── InstanceHeader
├── TabBar (Tools | Annotations)
├── TabContent/
│   ├── ToolsTabContent/
│   │   ├── DotNavigation
│   │   └── ScrollableSections/
│   │       ├── CameraSection
│   │       ├── TransformSection (Position + Rotation + Scale)
│   │       ├── SliceSection
│   │       ├── WindowLevelSection
│   │       └── AppearanceSection
│   └── AnnotationsTabContent
├── ResizeHandle
└── LayersAndWidgets (stationary)
```

---

## Data Flow

```
ViewGroup (collaborative state)
    ↓
ViewConfiguration (selected view)
    ↓
InstanceWindow (ephemeral renderer)
    ↓
InstanceToolsPanel
    ├── Reads: layers, widgets, type capabilities
    └── Writes: visibility, opacity, transforms, slice position, W/L
```

---

## Prior Work Referenced

### Gimbal/Transform Control Design
From chat `95a7fb2d-62ce-46cc-acc0-e8a918d870c0`:
- Generic `TransformControl` component with VTK-specific adapter
- Interface methods: `supportsTransformControl()`, `getTransformableActors()`, etc.
- Files: `src/ui/react/components/controls/TransformControl/`, `src/core/instances/types/vtk/transforms/VTKTransformAdapter.js`

---

## Files Created This Session

| File | Description |
|------|-------------|
| `HeaderStyleComparison.jsx` | Four header style options exploration |
| `InstanceToolsHeaderWithViewGroup.jsx` | ViewGroup integration options |
| `ViewGroupOverflowAndLayers.jsx` | Overflow strategies + Layers with widgets |
| `InstanceToolsTestSuite.jsx` | Interactive tests for tipping points and behaviors |
| `InstanceToolsV1.jsx` | Initial complete prototype |
| **`InstanceToolsV2.jsx`** | Final prototype with dot nav, layers bottom, full transform |

---

## Implementation Notes for Claude Code

### Priority Order
1. ViewGroup strip component (reusable across panels)
2. Dot navigation component
3. Transform section with all three control groups
4. Layer reordering with drag-and-drop
5. Widget value popover + copy

### Key Patterns to Follow
- Headless component pattern (`.logic.js` + `.jsx`)
- Design tokens from `styles/tokens/`
- SASS with theme.scss import
- Co-located component styles

### Integration Points
- `ViewConfigurationManager` for view switching
- `InstanceTypeHandler.getCapabilities()` for section visibility
- Y.js for collaborative state (layer visibility, transforms)

---

## Deferred to Future Sessions

1. **Annotation tools UI** - Creating new annotations in the Annotations tab
2. **Widget creation UI** - Adding new measurement widgets from Tools tab
3. **Camera animation presets** - Smooth transitions between views
4. **Fine mode for sliders** - 0.1° precision toggle
5. **Rotation order selector** - XYZ/XZY/YXZ dropdown for gimbal

---

## Session Statistics

- **Decisions Made:** 7 major design decisions
- **Prototypes Created:** 6 JSX files
- **Test Cases Explored:** 4 interactive test suites
- **Lines of Code:** ~1,200 in final prototype

---

## Next Steps

1. Review `InstanceToolsV2.jsx` prototype
2. Create Claude Code handoff document if needed
3. Begin implementation following priority order above
4. Test with real VTK instance data
