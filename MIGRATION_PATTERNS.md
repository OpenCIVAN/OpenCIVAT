# Migration Code Patterns

Quick reference for updating code from old patterns to new three-layer architecture.

---

## 📦 **Creating Datasets**

### ❌ OLD WAY

```javascript
import { datasetManager } from "@Somewhere/oldDatasetManager.js";

// Direct Y.js manipulation
yDatasets.set(datasetId, {
  name: file.name,
  userId: getUserId(),
  // ... metadata
});
```

### ✅ NEW WAY

```javascript
import { datasetManager } from "@Init/appInitializer.js";

// Use DatasetManager API
const dataset = await datasetManager.addDataset(file, getUserId());
```

---

## 🎨 **Creating Instances**

### ❌ OLD WAY

```javascript
import { workspaceManager } from "@Core/instances/workspaceManager.js";

// Direct workspace manipulation
const instance = workspaceManager.createInstance({
  datasetId: dataset.id,
  type: "vtk",
});
```

### ✅ NEW WAY

```javascript
import { viewConfigurationManager } from "@Init/appInitializer.js";
import { instanceManager } from "@Core/instances/instanceManager.js";

// Create view configuration first (Layer 2)
const viewConfig = viewConfigurationManager.createView(dataset.id, {
  name: "My Analysis",
});

// Then create instance window (Layer 3)
const instance = instanceManager.createInstance({
  viewConfigurationId: viewConfig.id,
  type: "vtk",
});
```

---

## 📝 **Creating Annotations**

### ❌ OLD WAY

```javascript
import { annotationSystem } from "@Collaboration/annotations/annotationSystem.js";

// Direct Y.js manipulation
const annotation = annotationSystem.createAnnotation(position, text, type);
```

### ✅ NEW WAY

```javascript
import { annotationManager } from "@Init/appInitializer.js";

// Annotations belong to datasets now
const annotation = annotationManager.createAnnotation(datasetId, {
  position: [x, y, z],
  text: "Important finding",
  type: "point",
  tags: ["analysis", "findings"],
});
```

---

## 🎥 **Updating Camera**

### ❌ OLD WAY

```javascript
// Camera state stored directly on instance
instance.camera = newCameraState;

// Or direct Y.js sync
yInstances.set(instanceId, {
  ...instance,
  camera: newCameraState,
});
```

### ✅ NEW WAY

```javascript
import { viewConfigurationManager } from "@Init/appInitializer.js";

// Camera state lives in view configuration
viewConfigurationManager.updateCamera(instance.viewConfigurationId, {
  position: [x, y, z],
  focalPoint: [x, y, z],
  viewUp: [0, 1, 0],
});
```

---

## 🔍 **Getting Annotations for Rendering**

### ❌ OLD WAY

```javascript
import { annotationSystem } from "@Collaboration/annotations/annotationSystem.js";

// Get all annotations (no filtering)
const annotations = annotationSystem.getAllAnnotations();

// Manual filtering
const filtered = annotations.filter((a) => {
  return a.datasetId === currentDataset && a.visible;
});
```

### ✅ NEW WAY

```javascript
import { annotationManager } from "@Init/appInitializer.js";
import { viewConfigurationManager } from "@Init/appInitializer.js";

// Get view configuration (knows which annotations to show)
const viewConfig = viewConfigurationManager.getView(viewConfigId);

// Get filtered annotations based on view's display config
const annotations = annotationManager.getAnnotationsForView(
  viewConfig.datasetId,
  viewConfig.annotationDisplay
);
```

---

## 📊 **Getting Dataset Info**

### ❌ OLD WAY

```javascript
// From Y.js directly
const datasetData = yDatasets.get(datasetId);
const bounds = datasetData.bounds;
```

### ✅ NEW WAY

```javascript
import { datasetManager } from "@Init/appInitializer.js";

// Through DatasetManager
const dataset = datasetManager.getDataset(datasetId);
const bounds = dataset.metadata.bounds;

// Or get annotations
const userAnnotations = dataset.getAnnotationsByUser(userId);
const stats = dataset.getAnnotationStats();
```

---

## 🔄 **Syncing to Other Users**

### ❌ OLD WAY

```javascript
// Manual Y.js sync everywhere
yInstances.set(instance.id, {
  id: instance.id,
  datasetId: instance.datasetId,
  camera: instance.camera,
  // ... everything
});
```

### ✅ NEW WAY

```javascript
// Sync happens automatically in managers!
// Just update the data, managers handle Y.js

// Update view → automatically synced
viewConfigurationManager.updateCamera(viewId, cameraState);

// Create annotation → automatically synced
annotationManager.createAnnotation(datasetId, config);

// No manual Y.js manipulation needed!
```

---

## 🎯 **React Hooks Pattern**

### ❌ OLD WAY

```javascript
import { yDatasets } from "@Collaboration/yjs/yjsSetup.js";

function MyComponent() {
  const [datasets, setDatasets] = useState([]);

  useEffect(() => {
    // Direct Y.js observer in component
    yDatasets.observe((event) => {
      const newDatasets = [];
      yDatasets.forEach((ds) => newDatasets.push(ds));
      setDatasets(newDatasets);
    });
  }, []);
}
```

### ✅ NEW WAY

```javascript
import { datasetManager } from "@Init/appInitializer.js";

function MyComponent() {
  const [datasets, setDatasets] = useState([]);

  useEffect(() => {
    // Subscribe to manager events
    const handleUpdate = () => {
      setDatasets(datasetManager.getAllDatasets());
    };

    datasetManager.on("datasetAdded", handleUpdate);
    datasetManager.on("datasetRemoved", handleUpdate);

    // Initial load
    handleUpdate();

    return () => {
      datasetManager.off("datasetAdded", handleUpdate);
      datasetManager.off("datasetRemoved", handleUpdate);
    };
  }, []);
}
```

---

## 🧹 **Instance Cleanup**

### ❌ OLD WAY

```javascript
// Manual cleanup of everything
function deleteInstance(instanceId) {
  // Clean up VTK
  const renderer = instance.renderer;
  renderer.delete();

  // Clean up Y.js
  yInstances.delete(instanceId);

  // Clean up state
  instanceStore.removeInstance(instanceId);
}
```

### ✅ NEW WAY

```javascript
import { instanceManager } from "@Core/instances/instanceManager.js";

// Managers handle all cleanup
instanceManager.deleteInstance(instanceId);

// This automatically:
// - Calls handler.cleanup()
// - Decrements view's active count
// - Updates Y.js
// - Cleans up DOM
```

---

## 🎛️ **Annotation Display Control**

### ❌ OLD WAY

```javascript
// Toggle annotation visibility globally
annotationSystem.toggleAnnotationVisibility(annotationId);

// Or filter in rendering code
if (annotation.userId === currentUser) {
  renderAnnotation(annotation);
}
```

### ✅ NEW WAY

```javascript
import { viewConfigurationManager } from "@Init/appInitializer.js";

// Configure annotation display per view
viewConfigurationManager.updateView(viewId, {
  annotationDisplay: {
    enabled: true,
    filter: {
      userIds: [currentUserId], // Only show my annotations
      tags: ["important"], // Only show tagged ones
      types: ["point", "measurement"], // Only these types
    },
    style: {
      size: 1.5,
      opacity: 0.8,
    },
  },
});
```

---

## 🔑 **Key Principles**

1. **Data flows down the layers:**

   - Dataset → ViewConfiguration → InstanceWindow
   - Never skip layers or flow upward

2. **Managers own their data:**

   - DatasetManager owns datasets and their annotations
   - ViewConfigurationManager owns view configs
   - InstanceManager owns instance lifecycle

3. **Y.js is internal:**

   - Only managers touch Y.js directly
   - React components use manager APIs
   - No `yDatasets.set()` in component code

4. **Events bubble up:**

   - Managers emit events when data changes
   - React hooks subscribe to manager events
   - Clean separation of concerns

5. **Cleanup is centralized:**
   - Call one manager method to delete
   - Manager handles all related cleanup
   - No manual reference tracking needed
