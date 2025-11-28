# CIA Web - Implementation Quick Start Guide
## Step-by-Step Guide to Implementing the Canvas System

---

## Phase 1: Data Models (Start Here)

### Step 1.1: Create WorkspaceCanvas Model

```javascript
// src/core/data/models/WorkspaceCanvas.js

/**
 * WorkspaceCanvas - Represents an infinite pinboard of views
 * 
 * Ownership types:
 * - 'personal': User's private workspace
 * - 'breakout': Shared within a breakout room
 * - 'project': Shared with all project members
 */
export class WorkspaceCanvas {
  constructor({
    id = null,                    // Server-generated
    projectId,
    name = 'Untitled Workspace',
    dimensions = { rows: 3, cols: 3 },
    ownership = { type: 'personal', ownerId: null },
    placements = [],
    createdBy = null,
    createdAt = null,
    updatedAt = null,
  } = {}) {
    this.id = id;
    this.projectId = projectId;
    this.name = name;
    this.dimensions = dimensions;
    this.ownership = ownership;
    this.placements = placements.map(p => 
      p instanceof CanvasPlacement ? p : new CanvasPlacement(p)
    );
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  // Add a row to the canvas
  addRow() {
    this.dimensions.rows++;
  }

  // Add a column to the canvas
  addColumn() {
    this.dimensions.cols++;
  }

  // Get placement at position (considering spans)
  getPlacementAt(row, col) {
    return this.placements.find(p => 
      row >= p.row && row < p.row + (p.rowSpan || 1) &&
      col >= p.col && col < p.col + (p.colSpan || 1)
    );
  }

  // Check if position is available
  isPositionAvailable(row, col, rowSpan = 1, colSpan = 1, excludePlacementId = null) {
    for (let r = row; r < row + rowSpan; r++) {
      for (let c = col; c < col + colSpan; c++) {
        const existing = this.getPlacementAt(r, c);
        if (existing && existing.id !== excludePlacementId) {
          return false;
        }
      }
    }
    return true;
  }

  toJSON() {
    return {
      id: this.id,
      projectId: this.projectId,
      name: this.name,
      dimensions: this.dimensions,
      ownership: this.ownership,
      placements: this.placements.map(p => p.toJSON()),
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
```

### Step 1.2: Create CanvasPlacement Model

```javascript
// src/core/data/models/CanvasPlacement.js

/**
 * CanvasPlacement - A positioned item on the canvas
 * 
 * Content types:
 * - 'view': A ViewConfiguration
 * - 'notes': A NotesBlock
 * - 'image': An ImageBlock  
 * - 'empty': Placeholder
 */
export class CanvasPlacement {
  constructor({
    id = null,                    // Server-generated
    row = 0,
    col = 0,
    rowSpan = 1,                  // 1-3
    colSpan = 1,                  // 1-3
    content = { type: 'empty' },
    subsetIds = [],               // Which subsets include this
  } = {}) {
    this.id = id;
    this.row = row;
    this.col = col;
    this.rowSpan = Math.min(3, Math.max(1, rowSpan));
    this.colSpan = Math.min(3, Math.max(1, colSpan));
    this.content = content;
    this.subsetIds = subsetIds;
  }

  // Check if placement is within a viewport
  isInViewport(viewport) {
    const pEndRow = this.row + this.rowSpan;
    const pEndCol = this.col + this.colSpan;
    const vEndRow = viewport.row + viewport.rows;
    const vEndCol = viewport.col + viewport.cols;

    return this.row < vEndRow && pEndRow > viewport.row &&
           this.col < vEndCol && pEndCol > viewport.col;
  }

  // Get the view ID if this is a view placement
  getViewId() {
    return this.content.type === 'view' 
      ? this.content.viewConfigurationId 
      : null;
  }

  toJSON() {
    return {
      id: this.id,
      row: this.row,
      col: this.col,
      rowSpan: this.rowSpan,
      colSpan: this.colSpan,
      content: this.content,
      subsetIds: this.subsetIds,
    };
  }
}
```

### Step 1.3: Create Subset Model

```javascript
// src/core/data/models/Subset.js

/**
 * Subset - A saved selection of placements for focus mode
 */
export class Subset {
  constructor({
    id = null,
    projectId,
    canvasId,
    name = 'Untitled Focus Group',
    description = '',
    placementIds = [],
    attachedNotes = [],           // NotesBlock IDs
    attachedImages = [],          // ImageBlock IDs
    visibility = 'private',       // 'private' | 'shared'
    sharedWith = [],              // User IDs or 'all'
    createdBy = null,
    createdAt = null,
    updatedAt = null,
  } = {}) {
    this.id = id;
    this.projectId = projectId;
    this.canvasId = canvasId;
    this.name = name;
    this.description = description;
    this.placementIds = placementIds;
    this.attachedNotes = attachedNotes;
    this.attachedImages = attachedImages;
    this.visibility = visibility;
    this.sharedWith = sharedWith;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  toJSON() {
    return {
      id: this.id,
      projectId: this.projectId,
      canvasId: this.canvasId,
      name: this.name,
      description: this.description,
      placementIds: this.placementIds,
      attachedNotes: this.attachedNotes,
      attachedImages: this.attachedImages,
      visibility: this.visibility,
      sharedWith: this.sharedWith,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
```

---

## Phase 2: Canvas Manager

### Step 2.1: Create CanvasManager

```javascript
// src/core/data/managers/CanvasManager.js

import { WorkspaceCanvas } from '@Core/data/models/WorkspaceCanvas';
import { CanvasPlacement } from '@Core/data/models/CanvasPlacement';
import { config } from '@Core/config/clientConfig';
import { sessionManager } from '@Core/session/sessionManager';

export class CanvasManager {
  constructor() {
    this._canvases = new Map();
    this._apiBaseUrl = config.apiBaseUrl;
    this._listeners = {
      canvasLoaded: [],
      canvasUpdated: [],
      placementAdded: [],
      placementUpdated: [],
      placementRemoved: [],
      viewportChanged: [],
    };
  }

  // Get or create personal canvas for current user
  async getPersonalCanvas(projectId) {
    // Check cache first
    const cached = Array.from(this._canvases.values())
      .find(c => c.projectId === projectId && 
                 c.ownership.type === 'personal' &&
                 c.ownership.ownerId === sessionManager.getUserId());
    if (cached) return cached;

    // Fetch from server
    const response = await fetch(
      `${this._apiBaseUrl}/api/projects/${projectId}/canvases?type=personal`,
      { headers: this._getHeaders() }
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.length > 0) {
        const canvas = new WorkspaceCanvas(data[0]);
        this._canvases.set(canvas.id, canvas);
        return canvas;
      }
    }

    // Create new personal canvas
    return this.createCanvas(projectId, {
      name: 'My Workspace',
      ownership: { type: 'personal', ownerId: sessionManager.getUserId() }
    });
  }

  // Create a new canvas
  async createCanvas(projectId, options = {}) {
    const response = await fetch(
      `${this._apiBaseUrl}/api/projects/${projectId}/canvases`,
      {
        method: 'POST',
        headers: this._getHeaders(),
        body: JSON.stringify({
          name: options.name || 'Untitled Workspace',
          ownership: options.ownership || { type: 'personal', ownerId: sessionManager.getUserId() },
          dimensions: options.dimensions || { rows: 3, cols: 3 },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create canvas: ${response.statusText}`);
    }

    const data = await response.json();
    const canvas = new WorkspaceCanvas(data);
    this._canvases.set(canvas.id, canvas);
    this._emit('canvasLoaded', canvas);
    return canvas;
  }

  // Add a placement to canvas
  async addPlacement(canvasId, placement) {
    const response = await fetch(
      `${this._apiBaseUrl}/api/canvases/${canvasId}/placements`,
      {
        method: 'POST',
        headers: this._getHeaders(),
        body: JSON.stringify(placement),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to add placement: ${response.statusText}`);
    }

    const data = await response.json();
    const newPlacement = new CanvasPlacement(data);
    
    const canvas = this._canvases.get(canvasId);
    if (canvas) {
      canvas.placements.push(newPlacement);
      this._emit('placementAdded', { canvas, placement: newPlacement });
    }

    return newPlacement;
  }

  // Update placement (move, resize)
  async updatePlacement(placementId, updates) {
    const response = await fetch(
      `${this._apiBaseUrl}/api/placements/${placementId}`,
      {
        method: 'PUT',
        headers: this._getHeaders(),
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update placement: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Update in cache
    for (const canvas of this._canvases.values()) {
      const idx = canvas.placements.findIndex(p => p.id === placementId);
      if (idx !== -1) {
        canvas.placements[idx] = new CanvasPlacement(data);
        this._emit('placementUpdated', { canvas, placement: canvas.placements[idx] });
        break;
      }
    }

    return new CanvasPlacement(data);
  }

  // Get placements visible in viewport
  getVisiblePlacements(canvas, viewport) {
    return canvas.placements.filter(p => p.isInViewport(viewport));
  }

  // Event handling
  on(event, callback) {
    if (this._listeners[event]) {
      this._listeners[event].push(callback);
    }
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this._listeners[event]) {
      this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
    }
  }

  _emit(event, data) {
    if (this._listeners[event]) {
      this._listeners[event].forEach(cb => cb(data));
    }
  }

  _getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionManager.getToken()}`,
    };
  }
}

// Singleton instance
export const canvasManager = new CanvasManager();
```

---

## Phase 3: VR Stubs

### Step 3.1: Create VR Directory Structure

```bash
mkdir -p src/core/vr
touch src/core/vr/VRManager.js
touch src/core/vr/VRGridLayout.js
touch src/core/vr/VRIsolationMode.js
touch src/core/vr/VRCursorSync.js
touch src/core/vr/index.js
```

### Step 3.2: VRManager Stub

```javascript
// src/core/vr/VRManager.js

/**
 * VRManager - Manages VR session lifecycle
 * 
 * STUB: Structure only, implementation deferred
 */
export class VRManager {
  constructor() {
    this._mode = 'inactive'; // 'inactive' | 'grid' | 'isolated'
    this._xrSession = null;
    this._isolatedViewId = null;
  }

  // Check if WebXR is available
  isVRSupported() {
    return typeof navigator !== 'undefined' && 
           'xr' in navigator &&
           typeof navigator.xr.isSessionSupported === 'function';
  }

  // Check for specific VR features
  async checkVRCapabilities() {
    if (!this.isVRSupported()) {
      return { supported: false, reason: 'WebXR not available' };
    }

    const immersiveSupported = await navigator.xr.isSessionSupported('immersive-vr');
    return {
      supported: immersiveSupported,
      reason: immersiveSupported ? null : 'Immersive VR not supported',
    };
  }

  // Enter VR mode
  async enterVR() {
    console.log('VRManager.enterVR() - STUB: Not implemented');
    // TODO: Implementation
    // 1. Request XR session
    // 2. Set up render loop
    // 3. Initialize VRGridLayout
    // 4. Switch handlers to VR mode
    throw new Error('VR mode not yet implemented');
  }

  // Exit VR mode
  async exitVR() {
    console.log('VRManager.exitVR() - STUB: Not implemented');
    // TODO: Implementation
    // 1. End XR session
    // 2. Restore desktop rendering
    // 3. Clean up VR resources
    this._mode = 'inactive';
    this._xrSession = null;
  }

  // Enter isolation mode (room-scale single view)
  enterIsolationMode(viewId) {
    console.log(`VRManager.enterIsolationMode(${viewId}) - STUB: Not implemented`);
    // TODO: Implementation
    // 1. Scale up selected view
    // 2. Hide other views
    // 3. Enable room-scale tracking
    this._mode = 'isolated';
    this._isolatedViewId = viewId;
  }

  // Exit isolation mode
  exitIsolationMode() {
    console.log('VRManager.exitIsolationMode() - STUB: Not implemented');
    // TODO: Implementation
    // 1. Scale down view
    // 2. Restore grid layout
    this._mode = 'grid';
    this._isolatedViewId = null;
  }

  // Get current VR state
  getState() {
    return {
      mode: this._mode,
      isolatedViewId: this._isolatedViewId,
      hasSession: this._xrSession !== null,
    };
  }
}

// Singleton instance
export const vrManager = new VRManager();
```

### Step 3.3: VRCursorSync Stub

```javascript
// src/core/vr/VRCursorSync.js

import { ydoc } from '@Collaboration/yjs/yjsSetup';

/**
 * VRCursorSync - Synchronizes cursor positions between desktop and VR users
 * 
 * STUB: Structure only, implementation deferred
 */
export class VRCursorSync {
  constructor() {
    this._yCursors = ydoc.getMap('cursors');
    this._localUserId = null;
    this._renderCallbacks = new Map(); // viewId -> render function
  }

  initialize(userId) {
    this._localUserId = userId;
    
    // Listen for cursor updates from other users
    this._yCursors.observe((event) => {
      // TODO: Handle cursor updates
      console.log('VRCursorSync: Cursor update received - STUB');
    });
  }

  // Desktop user: broadcast 2D cursor position
  broadcastDesktopCursor(viewId, screenPos, worldPos) {
    if (!this._localUserId) return;
    
    this._yCursors.set(this._localUserId, {
      mode: 'desktop',
      viewId,
      screenPos,
      worldPos,
      timestamp: Date.now(),
    });
  }

  // VR user: broadcast controller ray
  broadcastVRPointer(viewId, rayOrigin, rayDirection) {
    if (!this._localUserId) return;
    
    this._yCursors.set(this._localUserId, {
      mode: 'vr',
      viewId,
      rayOrigin,
      rayDirection,
      timestamp: Date.now(),
    });
  }

  // VR user: broadcast hand position (hand tracking)
  broadcastHandPosition(hand, position, rotation) {
    if (!this._localUserId) return;
    
    // Use separate key for hands
    this._yCursors.set(`${this._localUserId}_${hand}`, {
      mode: 'hand',
      hand,
      position,
      rotation,
      timestamp: Date.now(),
    });
  }

  // Register callback to render remote cursors for a view
  onRemoteCursor(viewId, callback) {
    this._renderCallbacks.set(viewId, callback);
    return () => this._renderCallbacks.delete(viewId);
  }

  // Get all remote cursor positions
  getRemoteCursors() {
    const cursors = [];
    this._yCursors.forEach((value, key) => {
      if (key !== this._localUserId && !key.includes('_')) {
        cursors.push({ userId: key, ...value });
      }
    });
    return cursors;
  }
}

// Singleton instance
export const vrCursorSync = new VRCursorSync();
```

### Step 3.4: Export from index.js

```javascript
// src/core/vr/index.js

export { vrManager, VRManager } from './VRManager';
export { VRGridLayout } from './VRGridLayout';
export { VRIsolationMode } from './VRIsolationMode';
export { vrCursorSync, VRCursorSync } from './VRCursorSync';
```

---

## Phase 4: UI Components

### Step 4.1: Create CanvasGrid Component

See the interactive mockup artifact for the full React component. Key points:

```javascript
// src/ui/react/components/workspace/CanvasGrid/CanvasGrid.jsx

import { useCanvas } from '@UI/react/hooks/useCanvas';
import { CanvasCell } from './CanvasCell';

export function CanvasGrid() {
  const { canvas, viewport, visiblePlacements, moveViewport } = useCanvas();
  
  return (
    <div className="canvas-grid">
      <div 
        className="canvas-grid__cells"
        style={{
          gridTemplateColumns: `repeat(${viewport.cols}, 1fr)`,
          gridTemplateRows: `repeat(${viewport.rows}, 1fr)`,
        }}
      >
        {visiblePlacements.map(placement => (
          <CanvasCell 
            key={placement.id}
            placement={placement}
            viewport={viewport}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## Testing Your Implementation

### Quick Smoke Test

```javascript
// In browser console after implementation:

// 1. Check canvas manager
const canvas = await canvasManager.getPersonalCanvas('test-project');
console.log('Canvas:', canvas);

// 2. Add a placement
const placement = await canvasManager.addPlacement(canvas.id, {
  row: 0,
  col: 0,
  rowSpan: 2,
  colSpan: 2,
  content: { type: 'view', viewConfigurationId: 'some-view-id' }
});
console.log('Placement:', placement);

// 3. Check VR stubs
console.log('VR Supported:', vrManager.isVRSupported());
console.log('VR State:', vrManager.getState());
```

---

## Next Steps After Phase 4

1. **Phase 5**: Implement LayoutPanel (right sidebar tab)
2. **Phase 6**: Implement SubsetManager and focus mode
3. **Phase 7**: Implement NotesBlock and ImageBlock
4. **Phase 8**: Implement MiniMap component
5. **Phase 9**: Add API endpoints on server
6. **Phase 10**: Integration testing
