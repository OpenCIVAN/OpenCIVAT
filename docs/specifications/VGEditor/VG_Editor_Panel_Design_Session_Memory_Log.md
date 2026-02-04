# VG Editor Panel — Design Session Memory Log

**Date:** February 3, 2026  
**Session Focus:** VG Editor Panel architecture, multi-editor support, and unified context-aware companion panel  
**Prototype File:** `vg-editor-panel.jsx` (2189 lines)

---

## Session Overview

This session designed and prototyped the **VG Editor Panel** — a dedicated interface for editing ViewGroup composition (which views go in which cells). Key achievements include multi-editor support, VG composition via VGs tab, and a unified context-aware companion panel that adapts between VG Editor and Canvas Map modes.

---

## Key Architectural Decisions

### 1. Multi-Editor Support (Implemented Upfront)

**Decision:** Support multiple simultaneous VG Editors rather than single-editor with retrofit later.

**Rationale:**
- VR workflows benefit from side-by-side comparison
- Prevents technical debt from single-editor assumptions
- Each editor gets unique `panelId: "vg-editor-{viewGroup.id}"`

**Implementation:**
- `VGEditorContext` manages open editors via Map<panelId, editorInfo>
- `activeEditorId` tracks which editor receives companion drops
- Editors register/unregister on mount/unmount
- Click-to-activate with green "Active" badge

### 2. Separate Companion Panel

**Decision:** Companion panel is its own PanelShell, not embedded in VG Editor.

**Rationale:**
- VR: Independent 3D positioning (editor front-center, companion 30° right)
- Desktop: Can persist while switching between editors
- Single companion serves multiple editors via context subscription

### 3. VGs Tab for Composition

**Decision:** Add VGs tab to companion panel enabling cross-VG view composition.

**Use Case:**
```
User wants to compose views from existing VGs:
├── 🟣 Brain Analysis → grab Volume view
├── 🟠 Heart Study → grab Mesh view  
└── 🔵 New VG ← compose into new arrangement
```

**Behaviors:**
- Drag individual view: Copies to active editor
- Drag VG header: Imports ALL views from that VG
- VG being edited shows "Editing" badge, not draggable
- Includes `sourceVgId` in drag data for provenance

### 4. Unified Context-Aware Companion Panel

**Decision:** Single companion panel that adapts tabs based on active editing context.

**Mode Detection:**
```javascript
const mode = editorCount > 0 ? 'vg-editor' : 
             canvasMapActive ? 'canvas-map' : 
             'idle';
```

**Tab Configuration by Mode:**

| Mode | Tabs | Purpose |
|------|------|---------|
| VG Editor | [Datasets] [Views] [VGs] | Add views to VG cells |
| Canvas Map | [VGs] [Templates] | Place VGs on canvas grid |
| Idle | [Datasets] [Views] | Browse only |

**Rationale:**
- Single mental model: "companion helps me add things"
- VR efficiency: One panel to position
- Consistent drag-drop behavior across contexts

---

## Component Architecture

### VGEditorContext

```javascript
const VGEditorContext = {
  openEditors: Map<panelId, {
    panelId: string,
    vgId: string,
    vgName: string,
    vgColor: string,
    isNew: boolean
  }>,
  activeEditorId: string | null,
  activeEditor: EditorInfo | null,
  editorCount: number,
  registerEditor(panelId, vgData),
  unregisterEditor(panelId),
  updateEditor(panelId, updates),
  setActive(panelId)
}
```

### CanvasMapContext

```javascript
const CanvasMapContext = {
  isActive: boolean,
  placedVGIds: string[],  // VGs already on canvas
  activateCanvasMap(),
  deactivateCanvasMap(),
  placeVG(vgId),
  removeVG(vgId)
}
```

### UnifiedCompanionPanel Props

```javascript
<UnifiedCompanionPanel
  datasets={MOCK_DATASETS}      // For Datasets tab
  canvasVGs={MOCK_CANVAS_VGS}   // For VGs tab
  templates={MOCK_VG_TEMPLATES} // For Templates tab
/>
```

---

## Drag Data Structures

### View Drag (from Datasets/Views tabs)
```javascript
{
  view: { id, name, type },
  datasetId: string,
  datasetName: string
}
```

### View Drag from VGs Tab (includes provenance)
```javascript
{
  view: { id, name, type },
  datasetId: string,
  datasetName: string,
  sourceVgId: string,      // Where view came from
  sourceVgName: string
}
```

### VG Import (drag VG header in VG Editor mode)
```javascript
{
  type: 'vg-import',
  vgId: string,
  vgName: string,
  views: ViewConfig[]      // All views to import
}
```

### VG Place (Canvas Map mode)
```javascript
{
  type: 'vg-place',
  vgId: string,
  vgName: string,
  vgColor: string
}
```

### Template Create (Canvas Map mode)
```javascript
{
  type: 'template-create',
  templateId: string,
  templateName: string,
  layoutId: string,
  color: string
}
```

---

## VGs Tab Behavior Details

### In VG Editor Mode
- Shows all canvas VGs with expand/collapse
- Expanding shows views within each VG
- VG being edited: "Editing" badge, dimmed, not draggable
- Drag individual view → copy to active editor
- Drag VG header → import all views
- Hint text: "Drag VG header to import all"

### In Canvas Map Mode  
- Shows all VGs in flat list (no expand)
- VGs on canvas: "On Canvas" badge, not draggable
- VGs not on canvas: draggable to place
- No nested view display (not relevant at canvas level)

---

## Templates Tab (Canvas Map Only)

Template structure:
```javascript
{
  id: 'tpl-1',
  name: 'Standard Review',
  description: '2x2 grid for routine analysis',
  layoutId: '2x2',
  color: '#6366f1',
  viewSlots: 4,
  scope: 'team'  // personal | team | project
}
```

Visual presentation:
- Color indicator with LayoutGrid icon
- Name + description
- Badges: slot count, scope indicator
- Drag handle on right

---

## Mode Indicator Header

Shows current editing context at top of companion:

**VG Editor Mode:**
```
[●] ✏️ Brain Analysis    [3 open]
```
- Color dot matches active editor
- Shows editor name
- Badge shows total open editors if >1

**Canvas Map Mode:**
```
[●] ⊞ Canvas Map
```
- Teal accent color
- Grid icon

**Idle Mode:**
```
📦 Select an editor to add content
```
- Muted styling
- Instructional text

---

## Bug Fixes Applied

1. **Template literal in JSX text** — Changed `{viewGroup.id}` in info panel to plain text `[vgId]`
2. **useEffect dependencies** — Added missing `isContextAvailable` and `editorContext`
3. **Flat property access** — Fixed `activeEditor?.vgData.color` to `activeEditor?.vgColor`

---

## Mock Data Summary

### MOCK_DATASETS (3 datasets, 12 views)
- brain_scan.nii: Volume, Axial/Sagittal/Coronal Slice, Histogram, ROI Statistics
- heart_mesh.vtk: Surface Mesh, Wireframe, Point Cloud
- patient_metrics.csv: Data Table, Vitals Chart, Summary Stats

### MOCK_CANVAS_VGS (4 VGs)
- Brain Analysis (3 views, purple)
- Data Explorer (2 views, amber)
- Heart Study (4 views, blue)
- Patient Overview (2 views, green)

### MOCK_VG_TEMPLATES (4 templates)
- Standard Review (2×2, 4 slots, team)
- Neuro Workup (1+2, 3 slots, personal)
- Comparison View (side-by-side, 2 slots, project)
- Deep Dive (single, 1 slot, personal)

---

## Integration Notes

### Provider Hierarchy
```jsx
<VGEditorProvider>
  <CanvasMapProvider>
    <PanelManager>
      {/* VG Editors register here */}
      {/* Canvas Map activates here */}
      {/* Unified Companion subscribes to both */}
    </PanelManager>
  </CanvasMapProvider>
</VGEditorProvider>
```

### PanelShell Integration
```jsx
// VG Editor
<PanelShell
  panelId={`vg-editor-${viewGroup.id}`}
  title={`Edit: ${viewGroup.name}`}
  icon="layoutGrid"
  color={viewGroup.color}
  onFocus={() => editorContext.setActive(panelId)}
>
  <VGEditorPanelContent ... />
</PanelShell>

// Unified Companion
<PanelShell
  panelId="companion"
  title={mode === 'canvas-map' ? 'Add VGs' : 'Add Views'}
  icon="package"
  chrome={CHROME_LEVELS.COMPACT}
>
  <UnifiedCompanionPanel ... />
</PanelShell>
```

---

## Open Questions for Future Sessions

1. **Copy vs Share semantics** — When dragging view from VGs tab, is it always copy? Should there be Share option?
2. **VG-to-VG linking** — If user drags view as "share", how is that link managed?
3. **Template editing** — Can users modify/save templates from VG Editor?
4. **Canvas Map integration** — Need to implement actual canvas map mode activation

---

## Files Generated

| File | Lines | Purpose |
|------|-------|---------|
| `vg-editor-panel.jsx` | 2189 | Complete prototype with multi-editor + unified companion |
| `VG_Editor_Panel_Design_Session_Memory_Log.md` | This file | Session documentation |
| `VG_Editor_Panel_Claude_Code_Handoff.md` | Next | Implementation guide |

---

## Next Steps

1. Create handoff document with implementation specifications
2. Integrate with actual PanelShell component
3. Wire drop handlers in VGEditorPanelContent to process drag data types
4. Implement canvas map panel to test canvas-map mode
5. Add keyboard shortcuts (Cmd+1/2/3 for editor switching)
