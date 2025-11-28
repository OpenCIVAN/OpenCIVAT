# CIA Web - Existing Code Integration Map
## How New Features Connect to Current Codebase

---

## Current State Summary

Based on the `Beth-branch--state-fix` codebase, here's what exists and how the new canvas/VR/plugin features integrate:

---

## ✅ What Already Exists (Keep As-Is)

### Data Models
```
src/core/data/models/
├── Dataset.js              ✅ Keep - Layer 1 of data model
├── ViewConfiguration.js    ✅ Keep - Layer 2, already has links/presets
├── Annotation.js           ✅ Keep - Belongs to Dataset
└── (NEW) WorkspaceCanvas.js
└── (NEW) CanvasPlacement.js
└── (NEW) Subset.js
└── (NEW) NotesBlock.js
└── (NEW) ImageBlock.js
```

### Managers
```
src/core/data/managers/
├── DatasetManager.js           ✅ Keep
├── ViewConfigurationManager.js ✅ Keep - Server authority implemented
├── InstanceManager.js          ✅ Keep - Manages Layer 3
└── (NEW) CanvasManager.js
└── (NEW) SubsetManager.js
└── (NEW) ContentBlockManager.js
```

### Instance Type System
```
src/core/instances/types/
├── InstanceTypeHandler.js      ✅ Keep - Already well-designed interface
├── instanceTypeRegistry.js     ✅ Keep
└── vtk/
    ├── VTKHandler.js           ✅ Keep - Reference implementation
    ├── widgets/                ✅ Keep - Widget pattern works
    └── (MODIFY) Add RenderMode support
```

### Collaboration
```
src/collaboration/
├── yjs/
│   └── yjsSetup.js             ✅ Keep - Y.js maps for presence
├── presence/
│   └── presenceSystem.js       ✅ Keep
└── (NEW) cursor/
    └── CrossPlatformCursorSync.js  # Desktop ↔ VR cursors
```

### UI Components
```
src/ui/react/components/
├── layout/
│   ├── ThreeEdgeLayout/        ✅ Keep
│   ├── TopBar/                 ✅ Keep
│   ├── StatusBar/              ✅ Keep
│   └── (NEW) ModeToggle/
│   └── (NEW) WorkspaceTabs/
├── panels/
│   ├── FilesPanel/             ✅ Keep
│   └── (NEW) LayoutPanel/
├── workspace/
│   ├── WorkspaceGrid/          ⚠️ REPLACE with CanvasGrid
│   ├── InstanceViewport.jsx    ⚠️ REPLACE with CanvasCell
│   └── (NEW) MiniMap/
│   └── (NEW) ViewportNavigator/
└── collaboration/
    └── RightCollaborationPanel ✅ Keep - Add Layout tab
```

---

## 🔄 What Needs Modification

### 1. VTKHandler - Add Render Mode

```typescript
// src/core/instances/types/vtk/VTKHandler.js

// ADD to existing interface implementation:

export class VTKHandler implements InstanceTypeHandler {
  // ... existing code ...
  
  // NEW: Render mode support
  private renderMode: RenderMode = 'client';
  private serverConnection: ServerRenderConnection | null = null;
  
  getSupportedRenderModes(): RenderMode[] {
    return ['client', 'server', 'hybrid'];
  }
  
  getRenderMode(): RenderMode {
    return this.renderMode;
  }
  
  async setRenderMode(mode: RenderMode): Promise<void> {
    // Implementation from server-rendering doc
  }
  
  // NEW: Toolbar returns data, not components
  getToolbarConfig(): ToolbarConfig {
    return {
      position: 'top',
      groups: [
        // ... tool definitions (already partially implemented)
      ]
    };
  }
  
  // EXISTING: VR methods (enhance with isolation mode)
  supportsVR(): boolean { return true; }
  
  // NEW: Isolation mode for VR
  enterIsolationMode(): void {
    // Scale up, enable room-scale walking
  }
  
  exitIsolationMode(): void {
    // Return to grid
  }
}
```

### 2. InstanceTypeHandler Interface - Enhance

```typescript
// src/core/instances/types/InstanceTypeHandler.js

// ADD these methods to interface:

export interface InstanceTypeHandler {
  // ... existing methods ...
  
  // NEW: Render mode
  getSupportedRenderModes(): RenderMode[];
  getRenderMode(): RenderMode;
  setRenderMode(mode: RenderMode): Promise<void>;
  
  // NEW: Server rendering callbacks
  handleServerFrame?(frame: VideoFrame, metadata: FrameMetadata): void;
  sendInteraction?(interaction: InteractionMessage): void;
  getServerRenderConfig?(): ServerRenderConfig;
  
  // NEW: Pluggable toolbar (already partially there)
  getToolbarConfig(): ToolbarConfig;
  getHeaderActions(): HeaderAction[];
  getContextMenuItems(): ContextMenuItem[];
  
  // NEW: VR isolation mode
  supportsIsolationMode?(): boolean;
  enterIsolationMode?(): void;
  exitIsolationMode?(): void;
}
```

### 3. WorkspaceGrid → CanvasGrid

```
REPLACE:
src/ui/react/components/workspace/WorkspaceGrid/

WITH:
src/ui/react/components/workspace/CanvasGrid/
├── CanvasGrid.jsx          # Main component
├── CanvasGrid.logic.js     # Viewport navigation, rendering optimization
├── CanvasGrid.scss
├── CanvasCell.jsx          # Individual cell (view, notes, image, empty)
├── CanvasCell.scss
└── index.js

KEY CHANGES:
- Support for spanning cells (rowSpan, colSpan)
- Only render views in viewport
- Support notes/image block types
- Selection mode for subset creation
```

### 4. RightCollaborationPanel - Add Layout Tab

```typescript
// src/ui/react/components/collaboration/RightCollaborationPanel/index.jsx

// ADD Layout tab alongside People, Voice, Chat, Activity:

const tabs = [
  { id: 'layout', icon: Map, label: 'Layout' },    // NEW
  { id: 'people', icon: Users, label: 'People' },
  { id: 'voice', icon: Mic, label: 'Voice' },
  { id: 'chat', icon: MessageSquare, label: 'Chat' },
  { id: 'activity', icon: Activity, label: 'Activity' },
];

// Layout tab content:
{activeTab === 'layout' && (
  <LayoutPanel 
    canvas={currentCanvas}
    viewport={userViewport}
    onViewportChange={handleViewportChange}
    subsets={subsets}
    onCreateSubset={handleCreateSubset}
    onActivateSubset={handleActivateSubset}
  />
)}
```

---

## 🆕 New Files to Create

### Core Data Models
```
src/core/data/models/
├── WorkspaceCanvas.js      # Canvas with placements
├── CanvasPlacement.js      # Position + content reference
├── Subset.js               # Focus group
├── NotesBlock.js           # Research notes
└── ImageBlock.js           # Reference images
```

### Core Managers
```
src/core/data/managers/
├── CanvasManager.js        # CRUD for canvases, placements
├── SubsetManager.js        # CRUD for subsets, focus mode
└── ContentBlockManager.js  # Notes + images management
```

### VR System (Stubs)
```
src/core/vr/
├── VRManager.js            # Mode management, session
├── VRGridLayout.js         # Curved grid around user
├── VRIsolationMode.js      # Room-scale single view
├── VRCursorSync.js         # Desktop ↔ VR cursor visibility
└── index.js
```

### Server Rendering (Stubs)
```
src/core/rendering/
├── RenderModeManager.js    # Client/server/hybrid switching
├── ServerRenderConnection.js # WebRTC to render server
├── InteractionProtocol.js  # Interaction message types
└── index.js
```

### UI Components
```
src/ui/react/components/
├── layout/
│   ├── ModeToggle/         # Desktop/VR toggle
│   └── WorkspaceTabs/      # Project/Breakout/Personal tabs
├── workspace/
│   ├── CanvasGrid/         # Replace WorkspaceGrid
│   ├── CanvasCell/         # Individual cell
│   ├── MiniMap/            # Canvas overview
│   ├── ViewportNavigator/  # Navigation controls
│   └── SelectionOverlay/   # Selection mode UI
├── panels/
│   └── LayoutPanel/        # Right panel layout tab
│       ├── MapSubTab/
│       └── SubsetsSubTab/
└── content/
    ├── NotesBlockRenderer/ # Notes on canvas
    └── ImageBlockRenderer/ # Images on canvas
```

---

## 🔗 Integration Points

### 1. CIAWebApp.jsx - Add Canvas Context

```jsx
// src/ui/react/CIAWebApp.jsx

import { CanvasProvider } from './contexts/CanvasContext';
import { VRProvider } from './contexts/VRContext';

export function CIAWebApp({ username }) {
  return (
    <VRProvider>
      <CanvasProvider projectId={currentProjectId}>
        <ThreeEdgeLayout
          topBar={<TopBar username={username} />}
          leftPanel={<FilesPanel />}
          centerPanel={<CanvasGrid />}  {/* Changed from WorkspaceGrid */}
          rightPanel={<RightCollaborationPanel />}
          bottomBar={<StatusBar />}
        />
      </CanvasProvider>
    </VRProvider>
  );
}
```

### 2. ViewConfigurationManager - Canvas Awareness

```javascript
// src/core/data/managers/ViewConfigurationManager.js

// Views now need to know which canvas/placement they're on:

class ViewConfigurationManager {
  // ... existing code ...
  
  // NEW: Get views for a specific canvas
  async getViewsForCanvas(canvasId: string): Promise<ViewConfiguration[]> {
    const placements = await canvasManager.getPlacements(canvasId);
    const viewIds = placements
      .filter(p => p.content.type === 'view')
      .map(p => p.content.viewConfigurationId);
    return this.getViews(viewIds);
  }
  
  // NEW: Check if view is in viewport (for rendering optimization)
  isViewInViewport(viewId: string, viewport: UserViewport): boolean {
    const placement = canvasManager.getPlacementForView(viewId);
    if (!placement) return false;
    
    const pEnd = { 
      row: placement.row + (placement.rowSpan || 1),
      col: placement.col + (placement.colSpan || 1)
    };
    const vEnd = {
      row: viewport.row + viewport.rows,
      col: viewport.col + viewport.cols
    };
    
    return placement.row < vEnd.row && pEnd.row > viewport.row &&
           placement.col < vEnd.col && pEnd.col > viewport.col;
  }
}
```

### 3. InstanceManager - Viewport-Based Lifecycle

```javascript
// src/core/data/managers/InstanceManager.js

class InstanceManager {
  // ... existing code ...
  
  // NEW: Only mount instances in viewport
  async updateViewport(viewport: UserViewport) {
    const canvas = await canvasManager.getCanvas(viewport.canvasId);
    const placements = canvas.placements;
    
    for (const placement of placements) {
      if (placement.content.type !== 'view') continue;
      
      const isVisible = this.isPlacementInViewport(placement, viewport);
      const instance = this.getInstanceForView(placement.content.viewConfigurationId);
      
      if (isVisible && !instance) {
        // Mount instance (create renderer)
        await this.mountInstance(placement.content.viewConfigurationId);
      } else if (!isVisible && instance) {
        // Unmount instance (free GPU resources)
        await this.unmountInstance(instance.id);
      }
    }
  }
  
  isPlacementInViewport(placement, viewport) {
    // ... bounds checking logic
  }
}
```

---

## 📋 Migration Checklist

### Phase 1: Data Models & API
- [ ] Create WorkspaceCanvas model
- [ ] Create CanvasPlacement model
- [ ] Create Subset model
- [ ] Create NotesBlock/ImageBlock models
- [ ] Create CanvasManager
- [ ] Create SubsetManager
- [ ] Add API endpoints

### Phase 2: UI Components
- [ ] Create ModeToggle component
- [ ] Create WorkspaceTabs component
- [ ] Replace WorkspaceGrid with CanvasGrid
- [ ] Create CanvasCell with spanning support
- [ ] Create MiniMap component
- [ ] Create LayoutPanel for right sidebar
- [ ] Create NotesBlockRenderer
- [ ] Create ImageBlockRenderer

### Phase 3: Plugin Architecture Enhancements
- [ ] Add RenderMode to InstanceTypeHandler interface
- [ ] Update VTKHandler with new interface methods
- [ ] Create ToolbarConfig types
- [ ] Create generic InstanceToolbar renderer
- [ ] Update CanvasCell to use handler's toolbar config

### Phase 4: VR Stubs
- [ ] Create src/core/vr/ directory
- [ ] Implement VRManager stub
- [ ] Implement VRGridLayout stub
- [ ] Implement VRIsolationMode stub
- [ ] Implement VRCursorSync stub
- [ ] Add VRProvider context

### Phase 5: Server Rendering Stubs
- [ ] Create src/core/rendering/ directory
- [ ] Implement RenderModeManager stub
- [ ] Implement ServerRenderConnection stub
- [ ] Define InteractionProtocol types
- [ ] Add render mode selection to VTKHandler

---

## 🎯 Key Principles for Implementation

1. **Don't break existing functionality** - New features are additive
2. **Handlers are the extension point** - Keep core UI handler-agnostic
3. **Server is truth** - All persistent state goes through API
4. **VR stubs now, implementation later** - Structure for VR even if not working
5. **Viewport optimization** - Only render what's visible
6. **Audit everything** - Every state change is logged

This integration map ensures the new canvas/VR features build on the solid foundation you've already created!
