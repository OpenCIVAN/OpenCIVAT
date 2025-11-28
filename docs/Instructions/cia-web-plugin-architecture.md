# CIA Web Plugin Architecture
## Handler-Based Instance Types with Pluggable Toolbars

---

## Core Principle: The Canvas Doesn't Know What's Inside

The workspace canvas, cells, and UI framework are **completely agnostic** to what type of content is being displayed. All type-specific behavior comes from **handlers**.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CORE UI LAYER                                │
│  (Canvas, Cells, Panels, Layout)                                    │
│                                                                     │
│  Knows: positions, sizes, selection, navigation                     │
│  Doesn't know: VTK, molecules, plots, images                        │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                │ Asks handler: "What toolbar do you need?"
                                │ Asks handler: "Render yourself here"
                                │ Asks handler: "Handle this interaction"
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    INSTANCE TYPE HANDLERS                           │
│                                                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │     VTK     │ │  Molecule   │ │   Plotly    │ │   Image     │   │
│  │   Handler   │ │   Handler   │ │   Handler   │ │   Handler   │   │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘   │
│         │               │               │               │           │
│    VTK.js          NGL/3Dmol        Plotly.js       Canvas/WebGL    │
│   + widgets        + selection      + zoom           + annotations  │
│   + VR support     + VR support     + export         + filters      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## InstanceTypeHandler Interface (Existing - Enhanced)

```typescript
// src/core/instances/types/InstanceTypeHandler.ts

export interface InstanceTypeHandler {
  // ═══════════════════════════════════════════════════════════════════
  // IDENTIFICATION
  // ═══════════════════════════════════════════════════════════════════
  
  /** Unique type identifier (e.g., 'vtk', 'molecule', 'plotly') */
  getType(): string;
  
  /** Human-readable name for UI */
  getDisplayName(): string;
  
  /** Icon component or icon name for UI */
  getIcon(): string | React.ComponentType;
  
  /** File extensions this handler can open */
  getSupportedExtensions(): string[];
  
  /** MIME types this handler can process */
  getSupportedMimeTypes(): string[];
  
  // ═══════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════
  
  /** Initialize handler (load libraries, set up state) */
  initialize(container: HTMLElement, config: HandlerConfig): Promise<void>;
  
  /** Clean up resources (GPU memory, WebGL contexts) */
  cleanup(): Promise<void>;
  
  /** Load data into the handler */
  loadData(dataset: Dataset, viewConfig: ViewConfiguration): Promise<void>;
  
  /** Unload current data */
  unloadData(): Promise<void>;
  
  // ═══════════════════════════════════════════════════════════════════
  // RENDERING MODE (NEW - Critical for server-side rendering)
  // ═══════════════════════════════════════════════════════════════════
  
  /** What rendering modes does this handler support? */
  getSupportedRenderModes(): RenderMode[];
  
  /** Get current render mode */
  getRenderMode(): RenderMode;
  
  /** Switch render mode (client ↔ server) */
  setRenderMode(mode: RenderMode): Promise<void>;
  
  /** For server rendering: handle incoming video frame */
  handleServerFrame?(frame: VideoFrame): void;
  
  /** For server rendering: send interaction to server */
  sendInteraction?(interaction: InteractionEvent): void;
  
  // ═══════════════════════════════════════════════════════════════════
  // UI INTEGRATION (Pluggable Toolbars)
  // ═══════════════════════════════════════════════════════════════════
  
  /** 
   * Get toolbar configuration for this instance
   * Returns tool definitions that the UI renders generically
   */
  getToolbarConfig(): ToolbarConfig;
  
  /**
   * Get header actions (buttons in instance header)
   * Returns action definitions, not React components
   */
  getHeaderActions(): HeaderAction[];
  
  /**
   * Get context menu items for right-click
   */
  getContextMenuItems(): ContextMenuItem[];
  
  /**
   * Get property panel configuration (for right panel)
   */
  getPropertyPanelConfig(): PropertyPanelConfig | null;
  
  // ═══════════════════════════════════════════════════════════════════
  // COLLABORATION
  // ═══════════════════════════════════════════════════════════════════
  
  /** Get camera state for syncing */
  getCameraState(): CameraState;
  
  /** Apply camera state from sync */
  setCameraState(state: CameraState): void;
  
  /** Project 2D screen position to 3D world position (for cursors) */
  screenToWorld(screenPos: Vector2): Vector3 | null;
  
  /** Project 3D world position to 2D screen position */
  worldToScreen(worldPos: Vector3): Vector2 | null;
  
  /** Handle remote cursor position (show indicator) */
  showRemoteCursor(userId: string, worldPos: Vector3, color: string): void;
  
  /** Hide remote cursor */
  hideRemoteCursor(userId: string): void;
  
  // ═══════════════════════════════════════════════════════════════════
  // VR SUPPORT
  // ═══════════════════════════════════════════════════════════════════
  
  /** Does this handler support VR? */
  supportsVR(): boolean;
  
  /** Enter VR mode for this instance */
  enterVR(xrSession: XRSession): Promise<void>;
  
  /** Exit VR mode */
  exitVR(): Promise<void>;
  
  /** Update VR frame (called each VR frame) */
  updateVR(frame: XRFrame, pose: XRViewerPose): void;
  
  /** Handle VR controller input */
  handleVRInput(inputSource: XRInputSource, event: XRInputEvent): void;
  
  /** Get VR-specific settings */
  getVRConfig(): VRHandlerConfig;
  
  // ═══════════════════════════════════════════════════════════════════
  // ANNOTATIONS (Handler-specific rendering)
  // ═══════════════════════════════════════════════════════════════════
  
  /** Render annotation at world position */
  renderAnnotation(annotation: Annotation): void;
  
  /** Get annotation at screen position (for clicking) */
  getAnnotationAtPosition(screenPos: Vector2): Annotation | null;
  
  /** Supported annotation types for this handler */
  getSupportedAnnotationTypes(): AnnotationType[];
}
```

---

## Toolbar Configuration (Handler-Provided, UI-Agnostic)

Handlers return **data descriptions** of their tools, not React components. The UI renders them generically.

```typescript
// src/core/instances/types/ToolbarTypes.ts

export type RenderMode = 'client' | 'server' | 'hybrid';

export interface ToolbarConfig {
  /** Toolbar position preference */
  position: 'top' | 'bottom' | 'left' | 'right' | 'floating';
  
  /** Tool groups */
  groups: ToolGroup[];
}

export interface ToolGroup {
  id: string;
  label?: string;
  tools: Tool[];
}

export type Tool = 
  | ButtonTool
  | ToggleTool
  | SliderTool
  | DropdownTool
  | ColorPickerTool
  | CameraGridTool
  | PositionGridTool
  | SeparatorTool
  | CustomTool;

export interface ButtonTool {
  type: 'button';
  id: string;
  icon: string;           // Lucide icon name
  label: string;
  tooltip?: string;
  disabled?: boolean;
  onClick: () => void;
}

export interface ToggleTool {
  type: 'toggle';
  id: string;
  icon: string;
  iconActive?: string;    // Different icon when active
  label: string;
  tooltip?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export interface SliderTool {
  type: 'slider';
  id: string;
  icon?: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  presets?: { label: string; value: number }[];
  onChange: (value: number) => void;
}

export interface DropdownTool {
  type: 'dropdown';
  id: string;
  icon?: string;
  label: string;
  options: { value: string; label: string; icon?: string }[];
  value: string;
  onChange: (value: string) => void;
}

export interface ColorPickerTool {
  type: 'colorPicker';
  id: string;
  label: string;
  value: string;          // Hex color
  presets?: string[];     // Preset colors
  onChange: (value: string) => void;
}

export interface CameraGridTool {
  type: 'cameraGrid';
  id: string;
  views: CameraView[];
  onViewSelect: (view: CameraView) => void;
}

export interface PositionGridTool {
  type: 'positionGrid';
  id: string;
  positions: Position[];
  currentPosition: string;
  onPositionChange: (position: string) => void;
}

export interface SeparatorTool {
  type: 'separator';
}

export interface CustomTool {
  type: 'custom';
  id: string;
  /** 
   * Render function returns a React element
   * Use sparingly - prefer declarative tools
   */
  render: () => React.ReactNode;
}
```

---

## Example: VTK Handler Toolbar Config

```typescript
// src/core/instances/types/vtk/VTKHandler.ts

export class VTKHandler implements InstanceTypeHandler {
  getToolbarConfig(): ToolbarConfig {
    return {
      position: 'top',
      groups: [
        {
          id: 'camera',
          label: 'Camera',
          tools: [
            {
              type: 'cameraGrid',
              id: 'camera-views',
              views: [
                { id: 'front', label: 'Front', icon: 'square' },
                { id: 'back', label: 'Back', icon: 'square' },
                { id: 'left', label: 'Left', icon: 'square' },
                { id: 'right', label: 'Right', icon: 'square' },
                { id: 'top', label: 'Top', icon: 'square' },
                { id: 'bottom', label: 'Bottom', icon: 'square' },
              ],
              onViewSelect: (view) => this.setCameraView(view.id),
            },
            {
              type: 'button',
              id: 'reset-camera',
              icon: 'RotateCcw',
              label: 'Reset',
              tooltip: 'Reset camera to default',
              onClick: () => this.resetCamera(),
            },
          ],
        },
        {
          id: 'visualization',
          label: 'Display',
          tools: [
            {
              type: 'dropdown',
              id: 'representation',
              icon: 'Box',
              label: 'Representation',
              options: [
                { value: 'surface', label: 'Surface', icon: 'Box' },
                { value: 'wireframe', label: 'Wireframe', icon: 'Grid3x3' },
                { value: 'points', label: 'Points', icon: 'CircleDot' },
              ],
              value: this.representation,
              onChange: (v) => this.setRepresentation(v),
            },
            {
              type: 'toggle',
              id: 'edges',
              icon: 'Grid3x3',
              label: 'Edges',
              value: this.showEdges,
              onChange: (v) => this.setShowEdges(v),
            },
            { type: 'separator' },
            {
              type: 'slider',
              id: 'opacity',
              icon: 'Eye',
              label: 'Opacity',
              min: 0,
              max: 1,
              step: 0.1,
              value: this.opacity,
              presets: [
                { label: '25%', value: 0.25 },
                { label: '50%', value: 0.5 },
                { label: '100%', value: 1.0 },
              ],
              onChange: (v) => this.setOpacity(v),
            },
          ],
        },
        {
          id: 'widgets',
          label: 'Tools',
          tools: [
            {
              type: 'toggle',
              id: 'measure',
              icon: 'Ruler',
              label: 'Measure',
              value: this.measureWidgetActive,
              onChange: (v) => this.toggleMeasureWidget(v),
            },
            {
              type: 'toggle',
              id: 'clip',
              icon: 'Scissors',
              label: 'Clip Plane',
              value: this.clipPlaneActive,
              onChange: (v) => this.toggleClipPlane(v),
            },
          ],
        },
      ],
    };
  }
}
```

---

## Example: Molecule Handler (Different Tools)

```typescript
// src/core/instances/types/molecule/MoleculeHandler.ts

export class MoleculeHandler implements InstanceTypeHandler {
  getType() { return 'molecule'; }
  getDisplayName() { return 'Molecule Viewer'; }
  getIcon() { return 'Atom'; }
  getSupportedExtensions() { return ['.pdb', '.mol2', '.sdf', '.xyz']; }
  
  getToolbarConfig(): ToolbarConfig {
    return {
      position: 'top',
      groups: [
        {
          id: 'style',
          label: 'Style',
          tools: [
            {
              type: 'dropdown',
              id: 'representation',
              label: 'Style',
              options: [
                { value: 'ball-stick', label: 'Ball & Stick' },
                { value: 'spacefill', label: 'Spacefill' },
                { value: 'ribbon', label: 'Ribbon' },
                { value: 'cartoon', label: 'Cartoon' },
                { value: 'surface', label: 'Surface' },
              ],
              value: this.style,
              onChange: (v) => this.setStyle(v),
            },
          ],
        },
        {
          id: 'coloring',
          label: 'Color',
          tools: [
            {
              type: 'dropdown',
              id: 'color-scheme',
              label: 'Color By',
              options: [
                { value: 'element', label: 'Element' },
                { value: 'chain', label: 'Chain' },
                { value: 'residue', label: 'Residue' },
                { value: 'bfactor', label: 'B-Factor' },
                { value: 'hydrophobicity', label: 'Hydrophobicity' },
              ],
              value: this.colorScheme,
              onChange: (v) => this.setColorScheme(v),
            },
          ],
        },
        {
          id: 'selection',
          label: 'Selection',
          tools: [
            {
              type: 'button',
              id: 'select-all',
              icon: 'CheckSquare',
              label: 'All',
              onClick: () => this.selectAll(),
            },
            {
              type: 'button',
              id: 'select-ligand',
              icon: 'Crosshair',
              label: 'Ligand',
              onClick: () => this.selectLigand(),
            },
            {
              type: 'button',
              id: 'select-protein',
              icon: 'Dna',
              label: 'Protein',
              onClick: () => this.selectProtein(),
            },
          ],
        },
      ],
    };
  }
  
  // VR-specific: Molecule can be grabbed and rotated by hand
  getVRConfig(): VRHandlerConfig {
    return {
      interactionMode: 'grab-rotate',
      scale: { min: 0.1, max: 10, default: 1 },
      highlightOnHover: true,
      showAtomLabelsOnPoint: true,
    };
  }
}
```

---

## UI Toolbar Renderer (Generic)

The UI renders whatever the handler returns, without knowing what type it is:

```tsx
// src/ui/react/components/workspace/InstanceToolbar.tsx

import { ToolbarConfig, Tool } from '@Core/instances/types/ToolbarTypes';
import * as LucideIcons from 'lucide-react';

interface InstanceToolbarProps {
  config: ToolbarConfig;
}

export function InstanceToolbar({ config }: InstanceToolbarProps) {
  return (
    <div className={`instance-toolbar instance-toolbar--${config.position}`}>
      {config.groups.map(group => (
        <div key={group.id} className="toolbar-group">
          {group.label && (
            <span className="toolbar-group__label">{group.label}</span>
          )}
          <div className="toolbar-group__tools">
            {group.tools.map(tool => (
              <ToolRenderer key={tool.id} tool={tool} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ToolRenderer({ tool }: { tool: Tool }) {
  switch (tool.type) {
    case 'button':
      return <ButtonToolRenderer tool={tool} />;
    case 'toggle':
      return <ToggleToolRenderer tool={tool} />;
    case 'slider':
      return <SliderToolRenderer tool={tool} />;
    case 'dropdown':
      return <DropdownToolRenderer tool={tool} />;
    case 'cameraGrid':
      return <CameraGridRenderer tool={tool} />;
    case 'separator':
      return <div className="toolbar-separator" />;
    case 'custom':
      return <>{tool.render()}</>;
    default:
      return null;
  }
}

function ButtonToolRenderer({ tool }: { tool: ButtonTool }) {
  const Icon = LucideIcons[tool.icon];
  return (
    <button
      className="toolbar-button"
      onClick={tool.onClick}
      disabled={tool.disabled}
      title={tool.tooltip || tool.label}
    >
      {Icon && <Icon size={16} />}
      <span className="toolbar-button__label">{tool.label}</span>
    </button>
  );
}

// ... other renderers
```

---

## Canvas Cell Integration

The canvas cell asks the handler what to render:

```tsx
// src/ui/react/components/workspace/CanvasCell.tsx

export function CanvasCell({ placement }: { placement: CanvasPlacement }) {
  const handler = useInstanceHandler(placement);
  
  if (placement.content.type === 'empty') {
    return <EmptySlotPlaceholder placement={placement} />;
  }
  
  if (placement.content.type === 'notes') {
    return <NotesBlockRenderer blockId={placement.content.notesBlockId} />;
  }
  
  if (placement.content.type === 'image') {
    return <ImageBlockRenderer blockId={placement.content.imageBlockId} />;
  }
  
  // For views, delegate to handler
  return (
    <div className="canvas-cell">
      {/* Header - actions from handler */}
      <CanvasCellHeader 
        placement={placement}
        actions={handler.getHeaderActions()}
      />
      
      {/* Toolbar - config from handler */}
      <InstanceToolbar config={handler.getToolbarConfig()} />
      
      {/* Content - handler renders itself */}
      <div 
        className="canvas-cell__content"
        ref={(el) => el && handler.initialize(el, getConfig())}
      />
      
      {/* Presence indicators */}
      <PresenceOverlay viewId={placement.content.viewConfigurationId} />
    </div>
  );
}
```

---

## Adding a New Handler (Contributor Guide)

To add a new visualization type:

### 1. Create Handler Directory
```
src/core/instances/types/
└── yourType/
    ├── YourTypeHandler.ts    # Implements InstanceTypeHandler
    ├── YourTypeRenderer.ts   # Rendering logic
    ├── YourTypeVR.ts         # VR-specific code (can be stubs)
    └── index.ts              # Exports
```

### 2. Implement the Interface
```typescript
// src/core/instances/types/yourType/YourTypeHandler.ts

export class YourTypeHandler implements InstanceTypeHandler {
  getType() { return 'yourType'; }
  getDisplayName() { return 'Your Type Viewer'; }
  // ... implement all interface methods
}
```

### 3. Register the Handler
```typescript
// src/core/instances/types/instanceTypeRegistry.ts

import { YourTypeHandler } from './yourType';

registry.register('yourType', YourTypeHandler);
```

### 4. No UI Changes Needed!
The canvas, toolbar, and panels automatically work with your handler because they're driven by the handler's returned configurations.

---

## Summary

| Layer | Responsibility | Knows About Types? |
|-------|---------------|-------------------|
| Canvas/Cells | Layout, navigation, selection | ❌ No |
| Toolbar Renderer | Render tool configs generically | ❌ No |
| InstanceTypeHandler | Everything type-specific | ✅ Yes |
| Handler Registry | Map type names to handlers | ✅ Yes |

This separation means:
- **Core UI never imports VTK, NGL, Plotly, etc.**
- **New handlers don't require core UI changes**
- **Toolbars are automatically type-appropriate**
- **VR support is per-handler, not global**
