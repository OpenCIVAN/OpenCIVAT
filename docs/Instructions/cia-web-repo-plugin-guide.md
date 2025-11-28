# Plugin Architecture: Adding New Visualization Types

CIA Web uses a plugin-based architecture for visualization types. This guide explains how to add support for new data types without modifying core code.

## Overview

The core UI is **completely agnostic** to visualization types. It doesn't know about VTK, molecules, plots, or any specific library. All type-specific behavior comes from **handlers**.

```
┌─────────────────────────────────────────────────────────────────┐
│                         CORE UI                                  │
│     (Canvas, cells, panels - knows nothing about VTK, etc.)     │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                   Asks handler: "What toolbar do you need?"
                   Asks handler: "Render yourself here"
                                │
┌───────────────────────────────┴─────────────────────────────────┐
│                       HANDLERS                                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │   VTK   │  │Molecule │  │ Plotly  │  │  Your   │            │
│  │ Handler │  │ Handler │  │ Handler │  │ Handler │            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Create Your Handler Directory

```bash
mkdir -p src/core/instances/types/yourType
```

### 2. Implement the Handler

```javascript
// src/core/instances/types/yourType/YourTypeHandler.js

export class YourTypeHandler {
  // ========== IDENTIFICATION ==========
  
  getType() {
    return 'yourType';
  }
  
  getDisplayName() {
    return 'Your Type Viewer';
  }
  
  getIcon() {
    return 'Box'; // Lucide icon name
  }
  
  getSupportedExtensions() {
    return ['.ext1', '.ext2'];
  }
  
  // ========== LIFECYCLE ==========
  
  async initialize(container, config) {
    // Set up your renderer in the container element
    this.container = container;
    // Initialize your visualization library
  }
  
  async cleanup() {
    // Free resources, destroy renderer
  }
  
  async loadData(dataset, viewConfig) {
    // Load the dataset and apply view configuration
  }
  
  // ========== TOOLBAR (Return DATA, not React!) ==========
  
  getToolbarConfig() {
    return {
      position: 'top',
      groups: [
        {
          id: 'view',
          tools: [
            {
              type: 'button',
              id: 'reset',
              icon: 'RotateCcw',
              label: 'Reset',
              onClick: () => this.resetView(),
            },
            {
              type: 'slider',
              id: 'opacity',
              label: 'Opacity',
              min: 0,
              max: 1,
              step: 0.1,
              value: this.opacity,
              onChange: (v) => this.setOpacity(v),
            },
          ],
        },
      ],
    };
  }
  
  // ========== VR SUPPORT (can be stubs) ==========
  
  supportsVR() {
    return false; // Set true if you implement VR
  }
  
  // ========== RENDER MODE ==========
  
  getSupportedRenderModes() {
    return ['client']; // Add 'server', 'hybrid' if supported
  }
  
  getRenderMode() {
    return 'client';
  }
}
```

### 3. Register Your Handler

```javascript
// src/core/instances/types/instanceTypeRegistry.js

import { YourTypeHandler } from './yourType/YourTypeHandler';

// In the registration section:
registry.register('yourType', YourTypeHandler);
```

### 4. Done!

The core UI will automatically:
- Show your handler's toolbar
- Support your file extensions in the file picker
- Render your visualization in canvas cells

## The Handler Interface

### Required Methods

| Method | Purpose |
|--------|---------|
| `getType()` | Unique identifier (e.g., 'vtk', 'molecule') |
| `getDisplayName()` | Human-readable name for UI |
| `getSupportedExtensions()` | File extensions this handler opens |
| `initialize(container, config)` | Set up renderer in DOM element |
| `cleanup()` | Free all resources |
| `loadData(dataset, viewConfig)` | Load and render data |
| `getToolbarConfig()` | Return toolbar definition |

### VR Methods (Optional)

| Method | Purpose |
|--------|---------|
| `supportsVR()` | Return true if VR is supported |
| `enterVR(xrSession)` | Enter VR mode |
| `exitVR()` | Exit VR mode |
| `updateVR(frame, pose)` | Called each VR frame |

### Render Mode Methods (Optional)

| Method | Purpose |
|--------|---------|
| `getSupportedRenderModes()` | ['client'], ['client', 'server'], etc. |
| `getRenderMode()` | Current mode |
| `setRenderMode(mode)` | Switch modes |

## Toolbar Configuration

Handlers return **data objects** describing their toolbar, NOT React components. The UI renders them generically.

### Available Tool Types

```javascript
// Button
{
  type: 'button',
  id: 'my-button',
  icon: 'Play',          // Lucide icon name
  label: 'Start',
  tooltip: 'Start processing',
  disabled: false,
  onClick: () => { /* ... */ },
}

// Toggle
{
  type: 'toggle',
  id: 'wireframe',
  icon: 'Grid3x3',
  label: 'Wireframe',
  value: false,
  onChange: (value) => { /* ... */ },
}

// Slider
{
  type: 'slider',
  id: 'opacity',
  label: 'Opacity',
  min: 0,
  max: 1,
  step: 0.1,
  value: 1,
  presets: [
    { label: '25%', value: 0.25 },
    { label: '50%', value: 0.5 },
    { label: '100%', value: 1.0 },
  ],
  onChange: (value) => { /* ... */ },
}

// Dropdown
{
  type: 'dropdown',
  id: 'colormap',
  label: 'Colors',
  options: [
    { value: 'viridis', label: 'Viridis' },
    { value: 'plasma', label: 'Plasma' },
    { value: 'grayscale', label: 'Grayscale' },
  ],
  value: 'viridis',
  onChange: (value) => { /* ... */ },
}

// Separator
{
  type: 'separator',
}
```

### Grouping Tools

```javascript
getToolbarConfig() {
  return {
    position: 'top', // 'top', 'bottom', 'left', 'right', 'floating'
    groups: [
      {
        id: 'camera',
        label: 'Camera', // Optional group label
        tools: [ /* ... */ ],
      },
      {
        id: 'display',
        label: 'Display',
        tools: [ /* ... */ ],
      },
    ],
  };
}
```

## Example: Molecule Handler

```javascript
// src/core/instances/types/molecule/MoleculeHandler.js

export class MoleculeHandler {
  getType() { return 'molecule'; }
  getDisplayName() { return 'Molecule Viewer'; }
  getIcon() { return 'Atom'; }
  getSupportedExtensions() { return ['.pdb', '.mol2', '.sdf']; }
  
  async initialize(container, config) {
    // Initialize NGL or 3Dmol.js
    this.viewer = new NGLViewer(container);
  }
  
  async loadData(dataset, viewConfig) {
    const structure = await this.viewer.loadFile(dataset.url);
    this.applyViewConfig(viewConfig);
  }
  
  getToolbarConfig() {
    return {
      position: 'top',
      groups: [
        {
          id: 'style',
          tools: [
            {
              type: 'dropdown',
              id: 'representation',
              label: 'Style',
              options: [
                { value: 'ball-stick', label: 'Ball & Stick' },
                { value: 'ribbon', label: 'Ribbon' },
                { value: 'surface', label: 'Surface' },
              ],
              value: this.style,
              onChange: (v) => this.setStyle(v),
            },
          ],
        },
        {
          id: 'color',
          tools: [
            {
              type: 'dropdown',
              id: 'colorBy',
              label: 'Color',
              options: [
                { value: 'element', label: 'By Element' },
                { value: 'chain', label: 'By Chain' },
                { value: 'residue', label: 'By Residue' },
              ],
              value: this.colorScheme,
              onChange: (v) => this.setColorScheme(v),
            },
          ],
        },
      ],
    };
  }
  
  supportsVR() { return true; }
  
  getVRConfig() {
    return {
      interactionMode: 'grab-rotate',
      scale: { min: 0.1, max: 10, default: 1 },
    };
  }
}
```

## Directory Structure

```
src/core/instances/types/
├── InstanceTypeHandler.js      # Interface definition
├── instanceTypeRegistry.js     # Handler registration
│
├── vtk/                        # Reference implementation
│   ├── VTKHandler.js
│   ├── VTKRenderer.js
│   ├── widgets/
│   │   ├── MeasureWidget.js
│   │   └── ClipPlaneWidget.js
│   └── index.js
│
├── molecule/                   # Example handler
│   ├── MoleculeHandler.js
│   └── index.js
│
└── yourType/                   # Your new handler
    ├── YourTypeHandler.js
    └── index.js
```

## Best Practices

### DO ✅

- Return plain objects from `getToolbarConfig()`, not React elements
- Clean up all resources in `cleanup()`
- Support the camera state interface for collaboration
- Include `supportsVR()` even if returning false
- Follow the VTK handler as a reference

### DON'T ❌

- Import your visualization library in core UI code
- Create React components in your handler
- Store UI state in the handler (use callbacks)
- Assume WebGL is available (check and handle errors)
- Forget to handle context lost events

## Testing Your Handler

```javascript
// src/core/instances/types/yourType/__tests__/YourTypeHandler.test.js

describe('YourTypeHandler', () => {
  let handler;
  let container;
  
  beforeEach(() => {
    handler = new YourTypeHandler();
    container = document.createElement('div');
  });
  
  afterEach(async () => {
    await handler.cleanup();
  });
  
  it('should return correct type', () => {
    expect(handler.getType()).toBe('yourType');
  });
  
  it('should initialize without errors', async () => {
    await expect(handler.initialize(container, {})).resolves.not.toThrow();
  });
  
  it('should return valid toolbar config', () => {
    const config = handler.getToolbarConfig();
    expect(config.groups).toBeDefined();
    expect(Array.isArray(config.groups)).toBe(true);
  });
  
  it('should clean up resources', async () => {
    await handler.initialize(container, {});
    await expect(handler.cleanup()).resolves.not.toThrow();
  });
});
```

## Further Reading

- [Architecture Overview](OVERVIEW.md) - System architecture
- [Architecture Decisions](DECISIONS.md) - Why handlers work this way
- [VTK Handler Source](../../src/core/instances/types/vtk/) - Reference implementation
