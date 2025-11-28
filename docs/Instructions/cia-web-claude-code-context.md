# CIA Web - Claude Code Context & Quick Reference
## Essential Context for AI-Assisted Development

---

## 🎯 Project Identity

**What is CIA Web?**
An open-source **Collaborative Immersive Analytics** platform - think "war rooms for scientific data analysis" where research teams can:
- View 3D scientific data (medical scans, molecules, simulations) together in real-time
- Work across desktop AND VR seamlessly
- Maintain audit trails for scientific reproducibility
- Extend with plugins for new visualization types

**Who is it for?**
Researchers by researchers. Scientific teams working with:
- Medical imaging (NIFTI, DICOM)
- Molecular data (PDB, MOL2)
- Simulation outputs (VTK, STL)
- Any 3D spatial data requiring collaborative analysis

**Core Philosophy:**
- **VR-First**: Designed for immersion, implemented desktop-first for debugging
- **Server Authority**: All persistent state comes from server (compliance/audit)
- **Plugin Architecture**: New viz types without touching core code
- **Open Source**: Clean code that contributors can understand and extend

---

## 🏗️ Architecture Mental Model

### The Three Sacred Layers

```
LAYER 1: Dataset
├── What: Raw scientific data + annotations
├── Lifecycle: Uploaded once, immutable
├── ID: Server-generated (auditable)
├── Analogy: A file on disk
└── Key point: Annotations belong HERE, not to views

LAYER 2: ViewConfiguration  
├── What: HOW to look at a dataset (camera, filters, colormap)
├── Lifecycle: Created from dataset, can be duplicated, shared, linked
├── ID: Server-generated (auditable, collaborative)
├── Analogy: A "saved view" or "bookmark" into the data
└── Key point: This is the COLLABORATIVE unit - what syncs between users

LAYER 3: InstanceWindow
├── What: GPU renderer displaying a ViewConfiguration
├── Lifecycle: Ephemeral - created when visible, destroyed when not
├── ID: Client-generated (not persisted)
├── Analogy: A window on screen showing the view
└── Key point: Can be destroyed without losing view state
```

### Why This Matters
- **Duplicating a view** creates a new ViewConfiguration (new server ID, independent state)
- **Closing a window** destroys InstanceWindow but ViewConfiguration survives
- **Linking views** connects ViewConfigurations, not windows
- **VR mode** can destroy desktop InstanceWindow and create VR one - same ViewConfiguration

---

## 📁 Codebase Navigation

### Directory Structure (What's Where)
```
src/
├── core/                    # Business logic, NO React
│   ├── data/
│   │   ├── models/          # Data classes (Dataset, ViewConfiguration, etc.)
│   │   └── managers/        # State management (DatasetManager, etc.)
│   ├── instances/
│   │   └── types/           # Plugin handlers (VTK, Molecule, etc.)
│   │       └── vtk/         # Reference implementation
│   ├── session/             # Session management
│   ├── config/              # Client configuration
│   ├── vr/                  # VR system (stubs for now)
│   └── rendering/           # Server rendering (stubs for now)
│
├── collaboration/           # Real-time sync
│   ├── yjs/                 # Y.js setup (presence ONLY, not state)
│   ├── presence/            # Who's online, cursor positions
│   └── voice/               # LiveKit integration
│
├── ui/
│   └── react/
│       ├── components/      # React components
│       │   ├── layout/      # App layout (TopBar, StatusBar, etc.)
│       │   ├── panels/      # Side panels (FilesPanel, LayoutPanel)
│       │   ├── workspace/   # Canvas grid, cells, mini-map
│       │   └── collaboration/ # People, voice, chat panels
│       ├── contexts/        # React contexts
│       ├── hooks/           # Custom hooks
│       └── styles/          # SCSS with design tokens
│
└── init/                    # App initialization
```

### Webpack Aliases (Use These!)
```javascript
// Instead of: import { Dataset } from '../../../core/data/models/Dataset'
// Use:
import { Dataset } from '@Core/data/models/Dataset';
import { VTKHandler } from '@Core/instances/types/vtk/VTKHandler';
import { FilesPanel } from '@UI/react/components/panels/FilesPanel';
import { presenceSystem } from '@Collaboration/presence/presenceSystem';
```

**Available aliases:**
- `@Core` → `src/core`
- `@UI` → `src/ui`
- `@Collaboration` → `src/collaboration`
- `@Init` → `src/init`

---

## 🔌 Plugin System Quick Reference

### Adding a New Instance Type (Handler)

1. **Create directory**: `src/core/instances/types/yourType/`

2. **Implement interface**:
```javascript
// YourTypeHandler.js
export class YourTypeHandler {
  // REQUIRED
  getType() { return 'yourType'; }
  getDisplayName() { return 'Your Type Viewer'; }
  getSupportedExtensions() { return ['.ext1', '.ext2']; }
  
  async initialize(container, config) { /* Set up renderer */ }
  async cleanup() { /* Free resources */ }
  async loadData(dataset, viewConfig) { /* Render data */ }
  
  // TOOLBAR - Return DATA, not React components!
  getToolbarConfig() {
    return {
      position: 'top',
      groups: [{
        id: 'tools',
        tools: [
          { type: 'button', id: 'reset', icon: 'RotateCcw', label: 'Reset', onClick: () => this.reset() },
          { type: 'slider', id: 'opacity', label: 'Opacity', min: 0, max: 1, value: 1, onChange: (v) => this.setOpacity(v) }
        ]
      }]
    };
  }
  
  // VR - Return capabilities, implement if supported
  supportsVR() { return false; } // or true if you support it
  
  // RENDER MODE - Client, server, or hybrid
  getSupportedRenderModes() { return ['client']; } // or ['client', 'server', 'hybrid']
}
```

3. **Register**:
```javascript
// src/core/instances/types/instanceTypeRegistry.js
import { YourTypeHandler } from './yourType/YourTypeHandler';
registry.register('yourType', YourTypeHandler);
```

4. **Done!** - Core UI automatically works with your handler

---

## 🎨 Styling Conventions

### SCSS Architecture
```
src/ui/react/styles/
├── tokens/
│   ├── _colors.scss        # Color variables
│   ├── _spacing.scss       # Spacing scale (4px base)
│   ├── _typography.scss    # Font sizes, weights
│   └── _effects.scss       # Shadows, blur
├── mixins/
│   └── _glassmorphism.scss # Glass effect mixin
└── theme.scss              # Imports everything
```

### Using Tokens
```scss
// In component SCSS:
@import '@UI/react/styles/theme';

.my-component {
  background: $color-bg-secondary;
  padding: $spacing-md;
  border-radius: $radius-md;
  @include glassmorphism;
}
```

### BEM Naming
```scss
.component-name {
  &__element { }
  &--modifier { }
}

// Example:
.canvas-cell {
  &__header { }
  &__content { }
  &--selected { }
  &--spanning { }
}
```

---

## 🔄 State Management Patterns

### Server State (Source of Truth)
```javascript
// Always fetch from server, cache locally
const viewConfig = await viewConfigurationManager.getView(viewId);

// Always persist to server
await viewConfigurationManager.updateView(viewId, changes);
```

### Y.js (Presence ONLY)
```javascript
// ✅ Correct - Presence data
yCursors.set(userId, { position, viewId, color });
yAvatars.set(userId, { position, rotation }); // VR avatars

// ❌ Wrong - Don't store persistent state in Y.js
// yViews.set(viewId, viewConfig); // NO! Use server API
```

### React State (UI Only)
```javascript
// Local UI state only
const [isExpanded, setIsExpanded] = useState(false);
const [selectedTool, setSelectedTool] = useState(null);

// For shared state, use contexts
const { viewport, setViewport } = useCanvas();
```

---

## 🚨 Common Pitfalls to Avoid

### 1. Don't Import VTK in Core UI
```javascript
// ❌ Wrong - UI knows about VTK
import vtkRenderer from 'vtk.js/...';

// ✅ Right - UI only knows about handlers
const handler = instanceTypeRegistry.get(viewConfig.type);
handler.initialize(container, config);
```

### 2. Don't Store State in Y.js
```javascript
// ❌ Wrong - Y.js for persistent state
yViews.set(viewId, viewConfig);

// ✅ Right - Server for persistent state, Y.js for presence
await api.put(`/views/${viewId}`, viewConfig);
yCursors.set(userId, cursorPosition);
```

### 3. Don't Hard-Code Toolbar Items
```javascript
// ❌ Wrong - Hard-coded toolbar
<button onClick={resetCamera}>Reset</button>
<button onClick={toggleWireframe}>Wireframe</button>

// ✅ Right - Render from handler config
{handler.getToolbarConfig().groups.map(group => 
  group.tools.map(tool => <ToolRenderer tool={tool} />)
)}
```

### 4. Don't Assume Client-Side Rendering
```javascript
// ❌ Wrong - Assumes client rendering
this.vtkRenderer.render();

// ✅ Right - Check render mode
if (this.renderMode === 'client') {
  this.vtkRenderer.render();
} else {
  this.sendInteraction({ type: 'render' });
}
```

### 5. Don't Forget VR Stubs
```javascript
// ❌ Wrong - No VR consideration
class NewHandler {
  // ... desktop-only implementation
}

// ✅ Right - Include VR stubs even if not implemented
class NewHandler {
  supportsVR() { return false; } // Explicit: we don't support VR yet
  supportsIsolationMode() { return false; }
  // ... rest of implementation
}
```

---

## 🧪 Testing Checklist

When implementing a feature, verify:

- [ ] **Server persistence**: Does it save to server?
- [ ] **Multi-tab sync**: Open two tabs, does state sync?
- [ ] **Plugin agnostic**: Would it work with a non-VTK handler?
- [ ] **VR ready**: Are there stubs for VR mode?
- [ ] **Audit trail**: Are changes logged?
- [ ] **Error handling**: What happens if server is down?
- [ ] **Cleanup**: Are GPU resources freed when not visible?

---

## 📝 PR Checklist

Before submitting code:

- [ ] Uses webpack aliases (`@Core`, `@UI`, etc.)
- [ ] Follows BEM naming for CSS
- [ ] Uses design tokens (not hard-coded colors/spacing)
- [ ] Handlers return data configs, not React components
- [ ] Persistent state goes through server API
- [ ] Y.js only used for presence
- [ ] VR stubs included (even if just `supportsVR() { return false; }`)
- [ ] No direct imports of visualization libraries in UI components

---

## 🆘 When Stuck

### "Where does this code go?"
- **Business logic** → `src/core/`
- **React component** → `src/ui/react/components/`
- **Real-time sync** → `src/collaboration/`
- **New viz type** → `src/core/instances/types/yourType/`

### "How do I add a new feature?"
1. Does it need server persistence? → Add API endpoint + manager method
2. Does it need real-time sync? → Use existing Y.js maps for presence
3. Does it need UI? → Create component, use handler configs if viz-specific
4. Does it need VR? → Add stubs now, implement later

### "This seems too complex"
- Check if VTK handler already does something similar
- VTK handler is the reference implementation - copy patterns from there
- Ask: "Would a contributor adding a Molecule handler need to understand this?"
  - If yes, it's probably in the wrong place

---

## 🎯 Current Sprint Focus

**Primary Goals:**
1. Canvas system (infinite pinboard with viewport)
2. Spanning views (merge cells like Excel)
3. Subsets/Focus mode
4. VR stubs (structure, not implementation)

**Deferred:**
- Actual VR implementation
- Server-side rendering implementation
- Additional handlers (Molecule, Plotly, etc.)

**Key Files to Touch:**
- `src/core/data/models/` - New canvas models
- `src/core/data/managers/` - New canvas/subset managers
- `src/ui/react/components/workspace/` - Replace WorkspaceGrid
- `src/ui/react/components/panels/` - Add LayoutPanel
- `src/core/vr/` - Create stub files
