# CIA Web - Error Handling & Edge Cases Guide
## Handling Failures Gracefully in a Collaborative System

---

## Core Principle: Graceful Degradation

CIA Web must continue functioning even when parts fail. Users are doing scientific research - losing work is unacceptable.

```
PRIORITY ORDER:
1. Never lose user data
2. Maintain local functionality when server unavailable
3. Sync when connection restored
4. Show clear error states (never silent failures)
5. Provide recovery actions
```

---

## Network Failure Scenarios

### Scenario 1: Server Unreachable

**When:** API server is down or user loses internet

**Behavior:**
```javascript
// In any manager that calls API:
async function fetchWithFallback(url, options) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }
    return response.json();
  } catch (error) {
    if (error instanceof TypeError) {
      // Network error - server unreachable
      console.warn('Server unreachable, using cached data');
      return this._getFromCache(url);
    }
    throw error;
  }
}
```

**UI Indication:**
```jsx
// StatusBar shows connection state
<StatusIndicator 
  status={isConnected ? 'connected' : 'offline'}
  message={isConnected ? 'Connected' : 'Working offline - changes will sync when reconnected'}
/>
```

**Recovery:**
- Queue changes locally
- Retry with exponential backoff
- Sync when connection restored

### Scenario 2: Y.js WebSocket Disconnection

**When:** Real-time presence stops working

**Behavior:**
```javascript
// In yjsSetup.js
wsProvider.on('status', ({ status }) => {
  if (status === 'disconnected') {
    // Don't panic - this is presence only
    console.warn('Y.js disconnected - cursor sync paused');
    notifyPresenceUnavailable();
  } else if (status === 'connected') {
    console.log('Y.js reconnected - cursor sync resumed');
    notifyPresenceRestored();
  }
});
```

**Impact:**
- Can't see others' cursors
- Can't see who's online
- **CAN still:** Edit, save, load (these use REST API)

### Scenario 3: Partial API Failure

**When:** Some endpoints work, others don't

**Behavior:**
```javascript
// Load what we can, mark what failed
async function loadWorkspace(projectId) {
  const results = await Promise.allSettled([
    canvasManager.getPersonalCanvas(projectId),
    viewConfigurationManager.getViewsForProject(projectId),
    datasetManager.getDatasetsForProject(projectId),
  ]);

  const [canvasResult, viewsResult, datasetsResult] = results;

  return {
    canvas: canvasResult.status === 'fulfilled' ? canvasResult.value : null,
    views: viewsResult.status === 'fulfilled' ? viewsResult.value : [],
    datasets: datasetsResult.status === 'fulfilled' ? datasetsResult.value : [],
    errors: results
      .filter(r => r.status === 'rejected')
      .map(r => r.reason),
  };
}
```

---

## Data Integrity Edge Cases

### Edge Case 1: View References Deleted Dataset

**When:** Dataset is deleted but ViewConfiguration still references it

**Detection:**
```javascript
// In ViewConfigurationManager
validateView(view) {
  const dataset = datasetManager.getDataset(view.datasetId);
  if (!dataset) {
    return {
      valid: false,
      error: 'DATASET_NOT_FOUND',
      message: `Dataset ${view.datasetId} no longer exists`,
      recoveryAction: 'DELETE_VIEW', // or 'REASSIGN_DATASET'
    };
  }
  return { valid: true };
}
```

**UI Handling:**
```jsx
{!viewValidation.valid && (
  <ErrorBanner
    type="warning"
    message="This view references a deleted dataset"
    actions={[
      { label: 'Remove View', onClick: () => deleteView(viewId) },
      { label: 'Assign New Dataset', onClick: () => openDatasetPicker(viewId) },
    ]}
  />
)}
```

### Edge Case 2: Placement References Deleted View

**When:** Canvas placement points to non-existent ViewConfiguration

**Handling:**
```javascript
// In CanvasCell
function CanvasCell({ placement }) {
  const view = useView(placement.content.viewConfigurationId);
  
  if (placement.content.type === 'view' && !view) {
    return (
      <div className="canvas-cell canvas-cell--error">
        <ErrorState
          icon={<AlertTriangle />}
          title="View Not Found"
          message="This view may have been deleted"
          actions={[
            { label: 'Remove from Canvas', onClick: () => removePlacement(placement.id) },
            { label: 'Replace with New View', onClick: () => openViewPicker(placement.id) },
          ]}
        />
      </div>
    );
  }
  
  // Normal rendering...
}
```

### Edge Case 3: Subset References Deleted Placements

**When:** Subset's placementIds include IDs that no longer exist

**Handling:**
```javascript
// In SubsetManager
getSubsetPlacements(subset, canvas) {
  const validPlacements = [];
  const missingIds = [];

  for (const placementId of subset.placementIds) {
    const placement = canvas.placements.find(p => p.id === placementId);
    if (placement) {
      validPlacements.push(placement);
    } else {
      missingIds.push(placementId);
    }
  }

  if (missingIds.length > 0) {
    console.warn(`Subset ${subset.id} references ${missingIds.length} deleted placements`);
    // Optionally auto-clean the subset
    this.cleanupSubset(subset.id, missingIds);
  }

  return validPlacements;
}
```

---

## Collaboration Edge Cases

### Edge Case 4: Conflicting Edits

**When:** Two users edit the same ViewConfiguration simultaneously

**Strategy:** Last-write-wins with notification

```javascript
// Server-side
app.put('/api/views/:viewId', async (req, res) => {
  const { viewId } = req.params;
  const { changes, expectedVersion } = req.body;

  const currentView = await db.views.findById(viewId);
  
  if (currentView.version !== expectedVersion) {
    // Conflict detected
    return res.status(409).json({
      error: 'CONFLICT',
      message: 'View was modified by another user',
      currentVersion: currentView.version,
      currentData: currentView,
      yourChanges: changes,
    });
  }

  // Apply changes
  const updated = await db.views.update(viewId, {
    ...changes,
    version: currentView.version + 1,
  });

  // Broadcast to other clients
  broadcast('viewUpdated', updated);
  
  res.json(updated);
});

// Client-side handling
async function updateView(viewId, changes) {
  try {
    await api.put(`/views/${viewId}`, {
      changes,
      expectedVersion: localView.version,
    });
  } catch (error) {
    if (error.status === 409) {
      // Show conflict resolution UI
      showConflictDialog({
        yourChanges: changes,
        theirChanges: error.data.currentData,
        onKeepMine: () => forceUpdateView(viewId, changes),
        onKeepTheirs: () => reloadView(viewId),
        onMerge: () => openMergeUI(changes, error.data.currentData),
      });
    }
  }
}
```

### Edge Case 5: User Leaves While Linked

**When:** User A is following User B's view, and B disconnects

**Handling:**
```javascript
// When presence indicates user left
presenceSystem.onUserLeft((userId) => {
  // Find any views following this user's views
  const linkedViews = viewConfigurationManager.getViewsLinkedToUser(userId);
  
  for (const view of linkedViews) {
    // Link is now broken - notify and offer options
    emitEvent('linkBroken', {
      viewId: view.id,
      reason: 'USER_DISCONNECTED',
      previousTargetUserId: userId,
    });
    
    // Preserve current state (don't reset camera, etc.)
    // User can re-link when other user returns
  }
});
```

### Edge Case 6: User in VR Loses Tracking

**When:** VR headset loses tracking (user walked out of bounds, etc.)

**Handling:**
```javascript
// In VRManager
xrSession.addEventListener('end', (event) => {
  if (event.reason === 'tracking-lost') {
    // Don't exit VR entirely, just pause
    this.showTrackingLostOverlay();
    this.pauseRendering();
  }
});

// When tracking restored
xrSession.addEventListener('trackingrestored', () => {
  this.hideTrackingLostOverlay();
  this.resumeRendering();
});
```

---

## GPU/Rendering Edge Cases

### Edge Case 7: WebGL Context Lost

**When:** GPU crashes, system goes to sleep, or too many contexts

**Handling:**
```javascript
// In VTKHandler (and all handlers that use WebGL)
initialize(container, config) {
  this.canvas = document.createElement('canvas');
  container.appendChild(this.canvas);

  this.canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault(); // Allows restoration
    console.warn('WebGL context lost');
    this.handleContextLost();
  });

  this.canvas.addEventListener('webglcontextrestored', () => {
    console.log('WebGL context restored');
    this.handleContextRestored();
  });
}

handleContextLost() {
  // Pause rendering loop
  this.isContextLost = true;
  this.showContextLostOverlay();
  
  // Notify instance manager (might want to prioritize other instances)
  this.emit('contextLost', { handlerId: this.id });
}

handleContextRestored() {
  this.isContextLost = false;
  this.hideContextLostOverlay();
  
  // Recreate WebGL resources
  this.recreateRenderer();
  
  // Reload current data
  if (this.currentDataset) {
    this.loadData(this.currentDataset, this.currentViewConfig);
  }
}
```

### Edge Case 8: Out of GPU Memory

**When:** Loading too many large datasets

**Prevention:**
```javascript
// In InstanceManager
async mountInstance(viewConfigId) {
  const estimatedMemory = await this.estimateMemoryUsage(viewConfigId);
  const availableMemory = await this.getAvailableGPUMemory();

  if (estimatedMemory > availableMemory) {
    // Try to free memory first
    const freed = await this.unmountLeastRecentlyUsed();
    
    if (estimatedMemory > availableMemory + freed) {
      throw new InsufficientMemoryError({
        required: estimatedMemory,
        available: availableMemory + freed,
        suggestion: 'Close some views or reduce dataset resolution',
      });
    }
  }

  // Proceed with mounting
  return this._doMountInstance(viewConfigId);
}
```

### Edge Case 9: Handler Fails to Load

**When:** VTK.js or other library fails to initialize

**Handling:**
```javascript
// In CanvasCell
function CanvasCell({ placement }) {
  const [handlerError, setHandlerError] = useState(null);

  const initializeHandler = async () => {
    try {
      const handler = instanceTypeRegistry.get(viewConfig.type);
      await handler.initialize(containerRef.current, config);
    } catch (error) {
      console.error('Handler initialization failed:', error);
      setHandlerError({
        message: error.message,
        canRetry: error.retryable !== false,
      });
    }
  };

  if (handlerError) {
    return (
      <div className="canvas-cell canvas-cell--error">
        <ErrorState
          icon={<XCircle />}
          title="Failed to Load Viewer"
          message={handlerError.message}
          actions={handlerError.canRetry ? [
            { label: 'Retry', onClick: initializeHandler },
          ] : []}
        />
      </div>
    );
  }

  // Normal rendering...
}
```

---

## Viewport/Canvas Edge Cases

### Edge Case 10: Canvas Shrinks Below Viewport

**When:** User removes rows/columns but viewport is positioned beyond new bounds

**Handling:**
```javascript
// In CanvasManager
async removeRow(canvasId, rowIndex) {
  // Check if any placements are in this row
  const canvas = this._canvases.get(canvasId);
  const placementsInRow = canvas.placements.filter(p => 
    p.row === rowIndex || (p.row < rowIndex && p.row + p.rowSpan > rowIndex)
  );

  if (placementsInRow.length > 0) {
    throw new CanvasModificationError({
      code: 'ROW_NOT_EMPTY',
      message: 'Cannot remove row with placements',
      affectedPlacements: placementsInRow.map(p => p.id),
    });
  }

  // Remove row
  await this._apiRemoveRow(canvasId, rowIndex);

  // Notify viewport to adjust if necessary
  this._emit('canvasShrunk', {
    canvasId,
    newDimensions: { rows: canvas.dimensions.rows - 1, cols: canvas.dimensions.cols },
  });
}

// In useCanvas hook
useEffect(() => {
  const handleCanvasShrunk = ({ canvasId, newDimensions }) => {
    if (canvas?.id !== canvasId) return;

    // Adjust viewport if it's now out of bounds
    setViewport(prev => ({
      ...prev,
      row: Math.min(prev.row, Math.max(0, newDimensions.rows - prev.rows)),
      col: Math.min(prev.col, Math.max(0, newDimensions.cols - prev.cols)),
    }));
  };

  return canvasManager.on('canvasShrunk', handleCanvasShrunk);
}, [canvas?.id]);
```

### Edge Case 11: Spanning Placement Exceeds Canvas

**When:** Placement at edge has rowSpan/colSpan extending beyond canvas

**Prevention:**
```javascript
// In CanvasPlacement or CanvasManager
validatePlacement(placement, canvas) {
  const errors = [];

  // Check if placement starts within canvas
  if (placement.row < 0 || placement.row >= canvas.dimensions.rows) {
    errors.push({ field: 'row', message: 'Row out of bounds' });
  }
  if (placement.col < 0 || placement.col >= canvas.dimensions.cols) {
    errors.push({ field: 'col', message: 'Column out of bounds' });
  }

  // Check if span exceeds canvas
  const endRow = placement.row + (placement.rowSpan || 1);
  const endCol = placement.col + (placement.colSpan || 1);

  if (endRow > canvas.dimensions.rows) {
    errors.push({ 
      field: 'rowSpan', 
      message: `Span exceeds canvas (ends at row ${endRow}, canvas has ${canvas.dimensions.rows} rows)`,
      suggestion: `Maximum rowSpan at this position: ${canvas.dimensions.rows - placement.row}`,
    });
  }
  if (endCol > canvas.dimensions.cols) {
    errors.push({
      field: 'colSpan',
      message: `Span exceeds canvas`,
      suggestion: `Maximum colSpan at this position: ${canvas.dimensions.cols - placement.col}`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

---

## Error UI Components

### Standard Error Banner

```jsx
// src/ui/react/components/common/ErrorBanner.jsx
export function ErrorBanner({ type = 'error', message, details, actions, onDismiss }) {
  const icons = {
    error: <XCircle className="text-red-400" />,
    warning: <AlertTriangle className="text-yellow-400" />,
    info: <Info className="text-blue-400" />,
  };

  return (
    <div className={`error-banner error-banner--${type}`}>
      <div className="error-banner__icon">{icons[type]}</div>
      <div className="error-banner__content">
        <p className="error-banner__message">{message}</p>
        {details && <p className="error-banner__details">{details}</p>}
      </div>
      {actions && (
        <div className="error-banner__actions">
          {actions.map((action, i) => (
            <button key={i} onClick={action.onClick} className="error-banner__action">
              {action.label}
            </button>
          ))}
        </div>
      )}
      {onDismiss && (
        <button onClick={onDismiss} className="error-banner__dismiss">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
```

### Empty State (for Canvas Cell)

```jsx
// src/ui/react/components/common/ErrorState.jsx
export function ErrorState({ icon, title, message, actions }) {
  return (
    <div className="error-state">
      {icon && <div className="error-state__icon">{icon}</div>}
      <h3 className="error-state__title">{title}</h3>
      {message && <p className="error-state__message">{message}</p>}
      {actions && actions.length > 0 && (
        <div className="error-state__actions">
          {actions.map((action, i) => (
            <button 
              key={i} 
              onClick={action.onClick}
              className={`error-state__action ${action.primary ? 'error-state__action--primary' : ''}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Logging & Debugging

### Console Logging Convention

```javascript
// Use prefixes for easy filtering:
console.log('📋 ViewConfigManager:', message);    // Data managers
console.log('🎨 VTKHandler:', message);           // Handlers
console.log('🔗 Y.js:', message);                 // Collaboration
console.log('🥽 VRManager:', message);            // VR
console.log('🌐 API:', message);                  // Network
console.log('⚠️ Warning:', message);              // Warnings
console.error('❌ Error:', message);              // Errors

// For debugging, expose on window.CIA
window.CIA = {
  help: () => console.log('Available commands: ...'),
  status: () => ({ /* system status */ }),
  canvas: canvasManager,
  views: viewConfigurationManager,
  vr: vrManager,
  // etc.
};
```

### Error Reporting

```javascript
// Centralized error reporting
export function reportError(error, context = {}) {
  console.error('❌ Error:', error.message, context);

  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Sentry, LogRocket, etc.
    errorTrackingService.captureException(error, {
      extra: context,
    });
  }

  // Always log to audit trail for compliance
  auditLog.error({
    message: error.message,
    stack: error.stack,
    context,
    timestamp: Date.now(),
    userId: sessionManager.getUserId(),
  });
}
```

---

## Summary Checklist

When implementing any feature, ensure:

- [ ] **Network failures** are caught and show user-friendly messages
- [ ] **Stale references** (deleted datasets, views) are handled gracefully
- [ ] **Conflicts** between users are detected and can be resolved
- [ ] **GPU failures** don't crash the app
- [ ] **Canvas operations** validate bounds
- [ ] **Errors are logged** with context for debugging
- [ ] **Recovery actions** are provided where possible
- [ ] **Offline mode** preserves local changes
