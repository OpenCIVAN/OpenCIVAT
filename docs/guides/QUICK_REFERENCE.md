# CIA Web: Developer Quick Reference

Quick lookup for common patterns and APIs when contributing to CIA Web.

---

## 🏗️ Architecture Cheat Sheet

### Three-Layer Model

```
Dataset (truth)
  ↓ datasetId
ViewConfiguration (saved state)
  ↓ viewConfigurationId
InstanceWindow (ephemeral display)
```

### Plugin Boundaries

```
Core ← interfaces → Plugins
UI   ← managers  → Core
```

**NEVER:**

- Import `types/vtk/` from core
- Import VTK from UI
- Skip managers in UI code

---

## 📦 Import Aliases

```javascript
import { Dataset } from "@Core/data/models/Dataset.js";
import { datasetManager } from "@Init/appInitializer.js";
import { Button } from "@UI/react/components/common/Button.jsx";
import { yDatasets } from "@Collaboration/yjs/yjsSetup.js";
import { dataset as log } from "@Utils/logger.js"; // See LOGGING.md
import { getHandlerForType } from "@Core/instances/types/instanceTypesInit.js";
```

---

## 🎯 Common Tasks

### Load a Dataset

```javascript
// Full flow
const dataset = await datasetManager.addDataset(file, userId);
const view = viewConfigurationManager.createView(dataset.id, {
  name: "View 1",
});
const instance = await instanceManager.createInstance({
  viewConfigurationId: view.id,
  type: "vtk",
  container: domElement,
});
```

### Subscribe to Manager Events

```javascript
// In React component
useEffect(() => {
  const handleAdd = ({ dataset }) => {
    setDatasets((prev) => [...prev, dataset]);
  };

  datasetManager.on("datasetAdded", handleAdd);
  return () => datasetManager.off("datasetAdded", handleAdd);
}, []);
```

### Create Annotation

```javascript
const annotation = annotationManager.createAnnotation(datasetId, {
  position: [x, y, z],
  text: "Important finding",
  type: "point",
  tags: ["analysis"],
});
```

### Update Camera

```javascript
viewConfigurationManager.updateCamera(viewId, {
  position: [x, y, z],
  focalPoint: [x, y, z],
  viewUp: [0, 1, 0],
});
```

### Add Filter

```javascript
viewConfigurationManager.addFilter(viewId, {
  type: "threshold",
  parameter: "density",
  min: 50,
  max: 100,
});
```

---

## 🔌 Plugin Development

### Minimum Implementation

```javascript
// MyHandler.js
import { InstanceTypeHandler } from "../InstanceTypeInterface.js";

export class MyHandler extends InstanceTypeHandler {
  getType() {
    return "mytype";
  }
  getDisplayName() {
    return "My Visualization";
  }

  async initialize(container, options) {
    // Create your renderer
    return {
      /* instance-specific data */
    };
  }

  async loadData(instanceData, dataset, data) {
    // Render the data
  }

  cleanup(instanceData) {
    // Clean up resources
  }
}

export const myHandler = new MyHandler();
```

### Register Plugin

```javascript
// instanceTypesInit.js
import { myHandler } from "./mytype/MyHandler.js";

export function registerInstanceTypes() {
  instanceTypeRegistry.register(vtkInstanceHandler);
  instanceTypeRegistry.register(myHandler); // Add this line
}
```

---

## 🎨 UI Patterns

### Headless Logic + Presentation

```javascript
// component.logic.js
export function useMyComponent() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const handle = (event) => setData(event.data);
    manager.on("event", handle);
    return () => manager.off("event", handle);
  }, []);

  const handleAction = () => {
    manager.doSomething();
  };

  return { data, handleAction };
}

// Component.jsx
export function MyComponent() {
  const { data, handleAction } = useMyComponent();
  return <div onClick={handleAction}>{data}</div>;
}
```

### SASS with Tokens

```scss
@import "../../styles/theme.scss";

.my-component {
  background: $color-surface;
  padding: $spacing-md;

  &__title {
    color: $color-text-primary;
    font-size: $font-size-lg;
  }

  &__button {
    @include button-primary;
  }
}
```

---

## 🧪 Per-Instance Pattern

**For widgets, tools, features:**

```javascript
class MyWidget {
  constructor() {
    this.instanceState = new Map(); // instanceId → state
  }

  initialize(instanceId, config) {
    const state = {
      /* create widget */
    };
    this.instanceState.set(instanceId, state);
  }

  enable(instanceId) {
    const state = this.instanceState.get(instanceId);
    if (state) state.widget.setEnabled(true);
  }

  cleanup(instanceId) {
    const state = this.instanceState.get(instanceId);
    if (state) {
      state.widget.delete();
      this.instanceState.delete(instanceId);
    }
  }
}
```

---

## 🔄 Y.js Patterns

### Read from Y.js

```javascript
const yMap = ydoc.getMap("mapName");
const value = yMap.get(key);
const allValues = Array.from(yMap.values());
```

### Write to Y.js

```javascript
// Set single value
yMap.set(key, value);

// Delete value
yMap.delete(key);

// Arrays
const yArray = ydoc.getArray("arrayName");
yArray.push([item1, item2]);
```

### Observe Changes

```javascript
yMap.observe((event) => {
  event.changes.keys.forEach((change, key) => {
    if (change.action === "add") {
      console.log("Added:", key, yMap.get(key));
    } else if (change.action === "update") {
      console.log("Updated:", key, yMap.get(key));
    } else if (change.action === "delete") {
      console.log("Deleted:", key);
    }
  });
});
```

---

## 🐛 Debugging

### Browser Console Commands

```javascript
CIA.help(); // List all commands
CIA.status(); // System status
CIA.listDatasets(); // Show datasets
CIA.listViews(); // Show views
CIA.listInstances(); // Show instances
CIA.getDataset("id"); // Inspect dataset
CIA.getView("id"); // Inspect view
CIA.getInstance("id"); // Inspect instance
```

### Manager Access

```javascript
import {
  datasetManager,
  viewConfigurationManager,
  instanceManager,
} from "@Init/appInitializer.js";

// Access anywhere in code
const dataset = datasetManager.getDataset(id);
const view = viewConfigurationManager.getView(id);
const instance = instanceManager.getInstance(id);
```

### Y.js Inspection

```javascript
import {
  ydoc,
  yDatasets,
  yViews,
  yAnnotations,
} from "@Collaboration/yjs/yjsSetup.js";

// See what's synced
console.log("Datasets:", Array.from(yDatasets.keys()));
console.log("Views:", Array.from(yViews.keys()));
console.log("Annotations:", Array.from(yAnnotations.keys()));
```

---

## 🎯 Handler Interface Methods

### Required Methods

```javascript
getType(); // Return type identifier
getDisplayName(); // Return display name
initialize(container, options); // Create renderer
cleanup(instanceData); // Destroy renderer
loadData(instanceData, dataset, data); // Render data
```

### Optional Methods

```javascript
getTools(instanceData); // Return toolbar buttons
getHeaderInfo(instanceData); // Return header display
supportsInstanceVR(); // Return true if VR supported
enterInstanceVR(instanceData, xr); // Enter VR mode
updateInstanceVR(instanceData, vr, f); // Update VR state
onApplicationVREnter(instanceData, vr); // App-level VR mode
captureState(instanceData); // Get state for sync
applyRemoteState(instanceData, state); // Apply remote state
```

---

## 📊 Data Model APIs

### Dataset

```javascript
const dataset = new Dataset({
  id: "dataset-123",
  filename: "data.vtp",
  uploadedBy: "alice",
  metadata: { pointCount: 1000 },
  annotations: [],
});

dataset.addAnnotation(annotation);
dataset.removeAnnotation(annotationId);
dataset.getAnnotation(annotationId);
```

### ViewConfiguration

```javascript
const view = new ViewConfiguration({
  id: "view-456",
  datasetId: "dataset-123",
  name: "My View",
  camera: { position: [0, 0, 100] },
  filters: [],
  widgets: [],
});

view.updateCamera(cameraState);
view.addFilter(filter);
view.removeFilter(filterId);
view.activate();
view.deactivate();
```

### InstanceWindow

```javascript
const instance = new InstanceWindow({
  id: "instance-789",
  viewConfigurationId: "view-456",
  type: "vtk",
  gridPosition: { row: 0, col: 0 },
});

instance.isActive();
instance.updateGridPosition({ row: 1, col: 0 });
```

---

## 🔑 Manager Methods

### DatasetManager

```javascript
addDataset(file, userId);
getDataset(id);
getAllDatasets();
deleteDataset(id);
loadPolydata(id);
updateMetadata(id, metadata);

// Events: 'datasetAdded', 'datasetUpdated', 'datasetRemoved'
```

### ViewConfigurationManager

```javascript
createView(datasetId, options);
getView(id);
getActiveViews();
updateCamera(id, camera);
addFilter(id, filter);
removeFilter(id, filterId);
activateView(id);
deactivateView(id);
duplicateView(id, userId);
deleteView(id);

// Events: 'viewCreated', 'viewUpdated', 'viewDeleted'
```

### InstanceManager

```javascript
createInstance({ viewConfigurationId, type, container });
getInstance(id);
getAllInstances();
destroyInstance(id);
updateGridPosition(id, position);

// Events: 'instanceCreated', 'instanceDestroyed'
```

### AnnotationManager

```javascript
createAnnotation(datasetId, { position, text, type, tags });
getAnnotation(id);
getAnnotationsForDataset(datasetId);
updateAnnotation(id, updates);
deleteAnnotation(id);
filterAnnotations(annotations, { tags, userIds, types });

// Events: 'annotationCreated', 'annotationUpdated', 'annotationDeleted'
```

---

## 🎨 SASS Tokens Reference

### Colors

```scss
$color-primary
$color-secondary
$color-surface
$color-background
$color-text-primary
$color-text-secondary
$color-border
$color-success
$color-warning
$color-error
```

### Spacing

```scss
$spacing-xs   // 4px
$spacing-sm   // 8px
$spacing-md   // 16px
$spacing-lg   // 24px
$spacing-xl   // 32px
$spacing-2xl  // 48px
```

### Typography

```scss
$font-size-xs   // 12px
$font-size-sm   // 14px
$font-size-md   // 16px
$font-size-lg   // 18px
$font-size-xl   // 24px
$font-size-2xl  // 32px

$font-weight-regular  // 400
$font-weight-medium   // 500
$font-weight-bold     // 700
```

### Mixins

```scss
@include button-primary @include button-secondary @include card-style @include
  panel-style @include flex-center @include text-ellipsis;
```

---

## 🚀 Testing Multi-User

```bash
# Open multiple tabs
# Tab 1: User A - Upload dataset
# Tab 2: User B - See dataset appear

# Check sync in console:
# Tab 1: yDatasets.set('test', { data: 123 })
# Tab 2: yDatasets.get('test')  // Should return { data: 123 }
```

---

## 📁 Key Files

```
src/
├── init/appInitializer.js              # App startup, manager instances
├── core/
│   ├── data/
│   │   ├── models/
│   │   │   ├── Dataset.js              # Layer 1 model
│   │   │   ├── ViewConfiguration.js    # Layer 2 model
│   │   │   └── InstanceWindow.js       # Layer 3 model
│   │   └── managers/
│   │       ├── DatasetManager.js       # Dataset CRUD
│   │       ├── ViewConfigurationManager.js  # View CRUD
│   │       └── AnnotationManager.js    # Annotation CRUD
│   └── instances/
│       ├── instanceManager.js          # Instance lifecycle
│       ├── workspaceManager.js         # Grid layout
│       └── types/
│           ├── InstanceTypeInterface.js     # Plugin contract
│           ├── InstanceTypeRegistry.js      # Plugin registry
│           ├── instanceTypesInit.js         # Registration
│           └── vtk/
│               └── VTKInstanceHandler.js    # VTK implementation
├── collaboration/
│   ├── yjs/
│   │   ├── yjsSetup.js                 # Y.js initialization
│   │   └── yjsObservers.js             # Change handlers
│   └── presence/
│       └── presenceSystem.js           # Who's online
└── ui/react/
    ├── Bootstrap.jsx                   # App entry point
    └── components/
```

---

## 💡 Remember

1. **Data flows down:** Dataset → View → Instance
2. **Use managers:** Don't touch Y.js directly from UI
3. **Per-instance storage:** Use Map for widgets/tools
4. **Plugin boundaries:** Core never imports type-specific code
5. **Events bubble up:** Managers emit, UI subscribes
6. **SASS tokens:** Never hardcode colors/spacing
7. **Cleanup matters:** Always implement cleanup methods

---

## 🔗 Resources

- [Main Contributor Guide](./CONTRIBUTOR_GUIDE.md)
- [Logging Guide](./LOGGING.md)
- [Architecture Doc](./ARCHITECTURE.md)
- [Migration Patterns](./MIGRATION_PATTERNS.md)
- [VTK.js Docs](https://kitware.github.io/vtk-js/)
- [Y.js Docs](https://docs.yjs.dev/)
- [React Hooks](https://react.dev/reference/react/hooks)
