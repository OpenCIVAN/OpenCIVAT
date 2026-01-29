# Canvas Map Panel Architecture Clarification (UPDATED)

**Last Updated:** January 28, 2025
**Status:** NEW ARCHITECTURE IN EFFECT

---

## ⚠️ IMPORTANT: Architecture Change

CIA Web is transitioning from **docked panel tabs** to **floating-first panels** using the new `PanelShell` component system.

**OLD Architecture:** LeftPanel tabs that can pop out → Being phased out
**NEW Architecture:** PanelShell floating panels → Use this for new panels

---

## Quick Answer

**CanvasMapTab should use the NEW PanelShell system** - NOT the old LeftPanel tab pattern.

```jsx
// ✅ CORRECT - New architecture
import { PanelShell, CHROME_LEVELS } from '@UI/react/components/panels/PanelShell';

function CanvasMapPanel() {
  return (
    <PanelShell
      panelId="canvas-map"
      title="Canvas"
      icon="grid"
      chrome={CHROME_LEVELS.FULL}
      color="#3b82f6"
      defaultWidth={340}
      defaultHeight={500}
    >
      {({ width, height, sizeMode }) => (
        <CanvasMapContent sizeMode={sizeMode} />
      )}
    </PanelShell>
  );
}
```

```jsx
// ❌ WRONG - Old architecture (don't use for new panels)
// registerLeftPanelTab('canvas-map', CanvasMapTab);
```

---

## Two Panel Systems (During Migration)

### 1. OLD: Docked Panel Tabs (Being Phased Out)
- Located in `LeftPanel/tabs/` and `RightPanel/tabs/`
- Rendered via tab registries
- Can pop out to floating panels
- **Status:** Existing panels still use this, will migrate over time
- **Examples:** NavigatorTab, FilesTab, DatasetsTab (legacy)

### 2. NEW: PanelShell Floating Panels ✅
- Located in `panels/PanelShell/`
- Always floating, managed by `PanelShellContext`
- Three chrome levels: FULL, COMPACT, MINIMAL
- Supports resize breakpoints and sizeMode
- **Status:** Use for ALL new panels
- **Examples:** CanvasMapPanel, InstanceToolsPanel (new)

---

## PanelShell is Already Implemented

The following files exist and are ready to use:

```
src/ui/react/components/panels/PanelShell/
├── index.js                    # ✅ Public exports
├── PanelShell.jsx              # ✅ Main component
├── PanelShell.scss             # ✅ Styles
├── PanelShell.logic.js         # ✅ Headless hook
├── PanelShellContext.jsx       # ✅ State management
├── constants.js                # ✅ CHROME_LEVELS, SIZE_MODES, etc.
├── PanelShell.stories.jsx      # ✅ Storybook examples
├── components/
│   ├── PanelHeader/            # ✅ Chrome-aware header
│   ├── PanelDragHandle/        # ✅ Drag handle
│   └── PanelResizeHandle/      # ✅ Resize handle
└── hooks/
    ├── usePanelDrag.js         # ✅ Drag logic
    ├── usePanelResize.js       # ✅ Resize logic
    └── usePanelPosition.js     # ✅ Position persistence
```

---

## How to Use PanelShell

### 1. Wrap App with Provider

```jsx
// In your app root
import { PanelShellProvider } from '@UI/react/components/panels/PanelShell';

function App() {
  return (
    <PanelShellProvider>
      {/* Your app */}
      <CanvasMapPanel />
      <InstanceToolsPanel />
    </PanelShellProvider>
  );
}
```

### 2. Create Panel Component

```jsx
import { PanelShell, CHROME_LEVELS } from '@UI/react/components/panels/PanelShell';

function CanvasMapPanel() {
  return (
    <PanelShell
      panelId="canvas-map"
      title="Canvas"
      icon="grid"
      chrome={CHROME_LEVELS.FULL}
      color="#3b82f6"
      defaultWidth={340}
      defaultHeight={500}
      breakpoints={{
        minWidth: 240,
        compactWidth: 280,
        standardWidth: 320,
        expandedWidth: 400,
      }}
    >
      {({ width, height, sizeMode }) => (
        <CanvasMapContent sizeMode={sizeMode} />
      )}
    </PanelShell>
  );
}
```

### 3. Control Panel Programmatically

```jsx
import { usePanelShell } from '@UI/react/components/panels/PanelShell';

function SomeButton() {
  const { openPanel, closePanel, togglePanel } = usePanelShell();
  
  return (
    <button onClick={() => togglePanel('canvas-map')}>
      Toggle Canvas Map
    </button>
  );
}
```

---

## Chrome Levels

| Level | Use For | Features |
|-------|---------|----------|
| **FULL** | Canvas Map, Instance Tools, Data Browser | Drag handle, resize, minimize, dock, close |
| **COMPACT** | Chat, People, Settings | Icon+title header, collapse, close |
| **MINIMAL** | Quick Tools, Toolbars | No header, drag from body |

---

## File Structure for New Panels

```
src/ui/react/components/panels/
├── PanelShell/                   # ✅ The shell system (exists)
├── CanvasMapPanel/               # ✅ NEW - Create here
│   ├── CanvasMapPanel.jsx        # Uses PanelShell
│   ├── CanvasMapPanel.scss
│   └── components/
│       ├── Minimap/
│       ├── ModeToolbar/
│       └── panels/
├── InstanceToolsPanel/           # ✅ NEW - Create here
│   ├── InstanceToolsPanel.jsx
│   └── ...
└── LeftPanel/                    # ⚠️ OLD - Don't add new tabs here
    └── tabs/                     # Legacy tabs being migrated
```

---

## CanvasMapPanel Content Structure

Based on design sessions, CanvasMapPanel should have:

### Always Visible
- **Minimap** - Shows canvas with ViewGroups, viewport indicator

### Mode Tabs (below minimap)
- **Navigate** - D-pad, position, zoom, bookmarks
- **Views** - Draggable view list, filters, quick-add
- **Groups** - VG management, merge/split/clone
- **Layout** - Templates, size controls, VG builder

### Implementation Pattern

```jsx
function CanvasMapContent({ sizeMode }) {
  const [mode, setMode] = useState('navigate');
  
  return (
    <div className="canvas-map-content">
      {/* Always visible minimap */}
      <Minimap sizeMode={sizeMode} />
      
      {/* Mode tabs */}
      <ModeTabs mode={mode} onModeChange={setMode} sizeMode={sizeMode} />
      
      {/* Mode-specific content */}
      {mode === 'navigate' && <NavigatePanel sizeMode={sizeMode} />}
      {mode === 'views' && <ViewsPanel sizeMode={sizeMode} />}
      {mode === 'groups' && <GroupsPanel sizeMode={sizeMode} />}
      {mode === 'layout' && <LayoutPanel sizeMode={sizeMode} />}
    </div>
  );
}
```

---

## What NOT to Do

❌ **Don't create LeftPanel tabs** for new panels
❌ **Don't use FloatingPanel** (legacy, being replaced)
❌ **Don't bypass PanelShellContext** for state management
❌ **Don't ignore sizeMode** - content should adapt

---

## Migration Status

| Panel | Current | Target | Status |
|-------|---------|--------|--------|
| Canvas Map | CanvasMapPanel (PanelShell) | CanvasMapPanel (PanelShell) | ✅ Complete |
| Navigator | LeftPanel tab | CanvasMapPanel (PanelShell) | ✅ Merged into Canvas Map |
| Files | LeftPanel tab | PanelShell | ⏳ Planned |
| Datasets | LeftPanel tab | PanelShell | ⏳ Planned |
| Instance Tools | FloatingPanel | InstanceToolsPanel (PanelShell) | 🔄 In Progress |
| Chat | RightPanel tab | PanelShell COMPACT | ⏳ Planned |
| People | RightPanel tab | PanelShell COMPACT | ⏳ Planned |

### CanvasMapPanel Implementation

The Canvas Map panel has been fully migrated to PanelShell:

**Location:** `src/ui/react/components/panels/CanvasMapPanel/`

**Files:**
- `CanvasMapPanel.jsx` - PanelShell wrapper with toggle event listener
- `CanvasMapContent.jsx` - Content component with real data wiring
- `index.js` - Public exports

**Usage:**
- Toggle with keyboard shortcut `m`
- Dispatch `cia:toggle-canvas-map` event
- Programmatically: `usePanelShell().togglePanel('canvas-map')`

**Removed from:**
- `LeftPanelTabRegistry.js` - Registration removed
- `LeftPanelContext.jsx` - Tab entry and keyboard shortcut removed

---

## Reference Documents

For full design context, see project knowledge:

1. **PanelShell_Unified_Workspace_Design_Session_Memory_Log.md** - Complete design rationale
2. **PanelShell_Chrome_Levels_Claude_Code_Handoff.md** - Implementation details
3. **unified-panel-architecture.jsx** - Interactive prototype

---

## Summary

| Question | Answer |
|----------|--------|
| **What system to use?** | PanelShell (new) |
| **Where to put files?** | `panels/CanvasMapPanel/` |
| **What chrome level?** | FULL |
| **Use LeftPanel tabs?** | NO (legacy) |
| **Use FloatingPanel?** | NO (legacy) |
| **Handle resize?** | Yes, via sizeMode prop |

---

*Document updated: January 28, 2025*
*Architecture: PanelShell floating-first*
