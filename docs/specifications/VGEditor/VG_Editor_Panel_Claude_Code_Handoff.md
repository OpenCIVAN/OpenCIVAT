# VG Editor Panel — Claude Code Handoff Document

**Date:** February 3, 2026  
**Prototype:** `vg-editor-panel.jsx` (2189 lines)  
**Purpose:** Implementation guide for VG Editor multi-editor architecture and unified companion panel

---

## Overview

This document provides specifications for implementing:
1. **VGEditorContext** — Multi-editor state management
2. **CanvasMapContext** — Canvas map editing state
3. **UnifiedCompanionPanel** — Context-aware companion with adaptive tabs
4. **VGEditorPanelContent** — ViewGroup editor with context registration

---

## 1. VGEditorContext Implementation

### Location
`src/ui/react/contexts/VGEditorContext.js`

### Interface
```typescript
interface EditorInfo {
  panelId: string;
  vgId: string;
  vgName: string;
  vgColor: string;
  isNew: boolean;
}

interface VGEditorContextValue {
  openEditors: Map<string, EditorInfo>;
  activeEditorId: string | null;
  activeEditor: EditorInfo | null;
  editorCount: number;
  registerEditor: (panelId: string, vgData: Partial<EditorInfo>) => void;
  unregisterEditor: (panelId: string) => void;
  updateEditor: (panelId: string, updates: Partial<EditorInfo>) => void;
  setActive: (panelId: string) => void;
}
```

### Key Behaviors
```javascript
// Register: New editor becomes active automatically
registerEditor(panelId, vgData) {
  openEditors.set(panelId, { panelId, ...vgData });
  setActiveEditorId(panelId);
}

// Unregister: Switch to another editor or null
unregisterEditor(panelId) {
  openEditors.delete(panelId);
  if (activeEditorId === panelId) {
    const remaining = [...openEditors.keys()];
    setActiveEditorId(remaining[0] || null);
  }
}

// SetActive: Only if editor exists
setActive(panelId) {
  if (openEditors.has(panelId)) {
    setActiveEditorId(panelId);
  }
}
```

---

## 2. CanvasMapContext Implementation

### Location
`src/ui/react/contexts/CanvasMapContext.js`

### Interface
```typescript
interface CanvasMapContextValue {
  isActive: boolean;
  placedVGIds: string[];
  activateCanvasMap: () => void;
  deactivateCanvasMap: () => void;
  placeVG: (vgId: string) => void;
  removeVG: (vgId: string) => void;
}
```

### Integration with Canvas Map Panel
```javascript
// Canvas Map panel activates on open
useEffect(() => {
  canvasMapContext.activateCanvasMap();
  return () => canvasMapContext.deactivateCanvasMap();
}, []);
```

---

## 3. UnifiedCompanionPanel Implementation

### Location
`src/ui/react/components/panels/CompanionPanel/UnifiedCompanionPanel.jsx`

### Props
```typescript
interface UnifiedCompanionPanelProps {
  datasets: Dataset[];
  canvasVGs: ViewGroup[];
  templates: VGTemplate[];
}
```

### Mode Detection Logic
```javascript
const vgEditorContext = useContext(VGEditorContext);
const canvasMapContext = useContext(CanvasMapContext);

const { activeEditor, editorCount } = vgEditorContext || {};
const { isActive: canvasMapActive, placedVGIds } = canvasMapContext || {};

// Priority: VG Editor > Canvas Map > Idle
const mode = editorCount > 0 ? 'vg-editor' : 
             canvasMapActive ? 'canvas-map' : 
             'idle';
```

### Tab Configuration
```javascript
const TAB_CONFIGS = {
  'vg-editor': [
    { id: 'datasets', label: 'Datasets', icon: FolderOpen },
    { id: 'views', label: 'Views', icon: List },
    { id: 'vgs', label: 'VGs', icon: LayoutGrid },
  ],
  'canvas-map': [
    { id: 'vgs', label: 'VGs', icon: LayoutGrid },
    { id: 'templates', label: 'Templates', icon: Copy },
  ],
  'idle': [
    { id: 'datasets', label: 'Datasets', icon: FolderOpen },
    { id: 'views', label: 'Views', icon: List },
  ],
};
```

### Tab Reset on Mode Change
```javascript
useEffect(() => {
  const validTabs = TAB_CONFIGS[mode].map(t => t.id);
  if (!validTabs.includes(activeTab)) {
    setActiveTab(validTabs[0]);
  }
}, [mode]);
```

---

## 4. Drag Data Type Specifications

### Standard View Drag
```javascript
// From Datasets or Views tab
e.dataTransfer.setData('application/json', JSON.stringify({
  view: { id, name, type },
  datasetId: string,
  datasetName: string
}));
```

### View from VGs Tab (with provenance)
```javascript
e.dataTransfer.setData('application/json', JSON.stringify({
  view: { id, name, type },
  datasetId: string,
  datasetName: string,
  sourceVgId: string,      // Origin VG
  sourceVgName: string
}));
```

### VG Import (drag VG header in VG Editor mode)
```javascript
e.dataTransfer.setData('application/json', JSON.stringify({
  type: 'vg-import',
  vgId: string,
  vgName: string,
  views: ViewConfig[]
}));
```

### VG Place (Canvas Map mode)
```javascript
e.dataTransfer.setData('application/json', JSON.stringify({
  type: 'vg-place',
  vgId: string,
  vgName: string,
  vgColor: string
}));
```

### Template Create (Canvas Map mode)
```javascript
e.dataTransfer.setData('application/json', JSON.stringify({
  type: 'template-create',
  templateId: string,
  templateName: string,
  layoutId: string,
  color: string
}));
```

---

## 5. VGEditorPanelContent Integration

### Context Registration
```javascript
const VGEditorPanelContent = ({ initialVG, isNewVG, panelId, onClose }) => {
  const [viewGroup, setViewGroup] = useState(initialVG);
  const editorContext = useContext(VGEditorContext);
  const editorPanelId = panelId || `vg-editor-${viewGroup.id}`;

  // Register on mount
  useEffect(() => {
    if (editorContext) {
      editorContext.registerEditor(editorPanelId, {
        id: viewGroup.id,
        name: viewGroup.name,
        color: viewGroup.color,
        isNew: isNewVG
      });
      return () => editorContext.unregisterEditor(editorPanelId);
    }
  }, [editorPanelId]);

  // Update context when VG changes
  useEffect(() => {
    if (editorContext) {
      editorContext.updateEditor(editorPanelId, {
        vgName: viewGroup.name,
        vgColor: viewGroup.color
      });
    }
  }, [viewGroup.name, viewGroup.color]);
};
```

### Focus Handler for Active State
```javascript
const handlePanelFocus = useCallback(() => {
  if (editorContext) {
    editorContext.setActive(editorPanelId);
  }
}, [editorContext, editorPanelId]);

// Attach to panel container
<div onMouseDown={handlePanelFocus}>
  {/* Panel content */}
</div>
```

### Drop Handler for Drag Types
```javascript
const handleDrop = (e, cellIndex) => {
  const data = JSON.parse(e.dataTransfer.getData('application/json'));
  
  if (data.type === 'vg-import') {
    // Import all views from another VG
    const availableSlots = getEmptyCells();
    data.views.forEach((view, i) => {
      if (availableSlots[i] !== undefined) {
        addViewToCell(availableSlots[i], view);
      }
    });
  } else if (data.view) {
    // Single view drop
    addViewToCell(cellIndex, {
      ...data.view,
      datasetId: data.datasetId,
      datasetName: data.datasetName,
      // Track provenance if from VGs tab
      sourceVgId: data.sourceVgId,
      sourceVgName: data.sourceVgName
    });
  }
};
```

---

## 6. PanelShell Integration

### VG Editor Panel
```jsx
<PanelShell
  panelId={`vg-editor-${viewGroup.id}`}
  title={isNewVG ? "New ViewGroup" : `Edit: ${viewGroup.name}`}
  icon="layoutGrid"
  chrome={CHROME_LEVELS.FULL}
  color={viewGroup.color}
  defaultWidth={480}
  defaultHeight={600}
  minWidth={380}
  minHeight={450}
  onClose={handleClose}
  onFocus={handlePanelFocus}
>
  <VGEditorPanelContent
    initialVG={viewGroup}
    isNewVG={isNewVG}
    panelId={`vg-editor-${viewGroup.id}`}
    onClose={handleClose}
  />
</PanelShell>
```

### Unified Companion Panel
```jsx
<PanelShell
  panelId="companion"
  title={mode === 'canvas-map' ? 'Add VGs' : 'Add Views'}
  icon="package"
  chrome={CHROME_LEVELS.COMPACT}
  color={mode === 'canvas-map' ? tokens.colors.accent.teal : tokens.colors.accent.cyan}
  defaultWidth={280}
  defaultHeight={520}
  minWidth={240}
  minHeight={400}
>
  <UnifiedCompanionPanel
    datasets={datasets}
    canvasVGs={canvasVGs}
    templates={templates}
  />
</PanelShell>
```

---

## 7. Provider Hierarchy

```jsx
// In App.jsx or workspace root
<VGEditorProvider>
  <CanvasMapProvider>
    <PanelManager>
      {/* All panels rendered here */}
      {/* VG Editors, Canvas Map, Companion all access contexts */}
    </PanelManager>
  </CanvasMapProvider>
</VGEditorProvider>
```

---

## 8. VGs Tab Conditional Rendering

### In VG Editor Mode
- Show expand/collapse chevrons
- Show nested views when expanded
- Show "Editing" badge on current VG
- Enable drag for views and VG headers
- Show "Drag VG header to import all" hint

### In Canvas Map Mode
- No expand/collapse (flat list)
- Show "On Canvas" badge for placed VGs
- Disable drag for already-placed VGs
- No nested view display

```javascript
{mode === 'vg-editor' && (
  <button onClick={() => toggleExpand(vg.id)}>
    {isExpanded ? <ChevronDown /> : <ChevronRight />}
  </button>
)}

{isBeingEdited ? (
  <Badge color={vg.color}>Editing</Badge>
) : isOnCanvas && mode === 'canvas-map' ? (
  <Badge color="green">On Canvas</Badge>
) : (
  <span>{vg.views.length}v</span>
)}
```

---

## 9. Template Data Structure

```typescript
interface VGTemplate {
  id: string;
  name: string;
  description: string;
  layoutId: string;        // References BUILTIN_LAYOUTS
  color: string;
  viewSlots: number;       // Capacity hint
  scope: 'personal' | 'team' | 'project';
}
```

---

## 10. Testing Checklist

### Multi-Editor
- [ ] Open multiple VG editors simultaneously
- [ ] Click to switch active editor
- [ ] Companion shows correct active editor
- [ ] Close editor switches to another
- [ ] Close all editors → companion shows idle

### VGs Tab (VG Editor Mode)
- [ ] Expand/collapse VGs
- [ ] Drag individual view to cell
- [ ] Drag VG header imports all views
- [ ] "Editing" badge on current VG
- [ ] Cannot drag from VG being edited

### VGs Tab (Canvas Map Mode)
- [ ] Flat list (no expand)
- [ ] "On Canvas" badge for placed VGs
- [ ] Cannot drag already-placed VGs
- [ ] Drag unplaced VG to canvas

### Templates Tab
- [ ] Only visible in Canvas Map mode
- [ ] Drag template creates new VG
- [ ] Shows slot count and scope

### Mode Switching
- [ ] Open VG editor → companion shows Datasets/Views/VGs
- [ ] Open Canvas Map → companion shows VGs/Templates
- [ ] Close all → companion shows Datasets/Views (idle)
- [ ] VG Editor takes priority over Canvas Map

---

## 11. Files to Create/Modify

| File | Action | Notes |
|------|--------|-------|
| `src/ui/react/contexts/VGEditorContext.js` | Create | Multi-editor state |
| `src/ui/react/contexts/CanvasMapContext.js` | Create | Canvas map state |
| `src/ui/react/components/panels/CompanionPanel/UnifiedCompanionPanel.jsx` | Create | Context-aware companion |
| `src/ui/react/components/panels/VGEditor/VGEditorPanelContent.jsx` | Create | Editor content |
| `src/ui/react/components/panels/VGEditor/index.js` | Create | Exports |
| `src/core/viewgroups/templates.js` | Create | Template definitions |

---

## 12. Continuation Prompt

To continue this work in a new chat, use:

```
Continue implementing the VG Editor Panel from the Design Session Memory Log. 
Key files:
- Prototype: vg-editor-panel.jsx (in project files)
- Memory Log: VG_Editor_Panel_Design_Session_Memory_Log.md
- Handoff: VG_Editor_Panel_Claude_Code_Handoff.md

Current state: Prototype complete with multi-editor support and unified 
context-aware companion panel. Ready for integration with actual codebase.

Next steps:
1. Create VGEditorContext and CanvasMapContext
2. Implement UnifiedCompanionPanel component
3. Integrate with PanelShell and PanelManager
4. Wire drop handlers for all drag data types
```
