# CIAUI Framework Specification

## Collaborative Immersive Analytics UI Framework

**A WebGPU-native, WebXR-first React-like framework for building collaborative scientific visualization interfaces**

---

## Vision Statement

CIAUI is a purpose-built framework for creating adaptive user interfaces that work seamlessly across desktop and immersive VR environments, designed specifically for collaborative scientific data analysis with built-in support for audit trails, reproducibility, and real-time multi-user interaction.

---

## Why Build a New Framework?

### Gaps in Existing Solutions

| Framework | Limitation for Our Use Case |
|-----------|----------------------------|
| **Three.js** | WebGL-based, no native WebGPU, not designed for UI |
| **A-Frame** | High-level abstraction, WebGL, gaming-focused |
| **React Three Fiber** | Wrapper around Three.js, inherits limitations |
| **Babylon.js** | Gaming engine, heavy, WebGPU support incomplete |
| **PlayCanvas** | Commercial focus, not research-oriented |
| **Raw WebGPU** | No UI primitives, massive effort |

### What CIAUI Provides

| Capability | Description |
|------------|-------------|
| **WebGPU-native** | Built for modern GPU APIs, WebGL fallback |
| **WebXR-first** | VR/AR not bolted on, core architecture |
| **Adaptive Components** | Same component renders desktop or VR |
| **Collaboration-ready** | Y.js/CRDT patterns built in |
| **Scientific Focus** | Audit trails, reproducibility, annotations |
| **React-like DX** | Familiar component model, hooks, JSX |
| **Lightweight** | Only what's needed, tree-shakeable |

### Research Contribution

This framework addresses an open research question:

> **"How do we build user interfaces that provide equivalent functionality and discoverability across 2D desktop and 3D immersive environments while supporting real-time collaboration for scientific analysis?"**

**Publication venues:**
- IEEE VR / ISMAR (VR/AR conferences)
- CHI (Human-Computer Interaction)
- IEEE VIS (Visualization)
- UIST (User Interface Software and Technology)
- JOSS (Journal of Open Source Software)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CIAUI FRAMEWORK                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    APPLICATION LAYER                             │    │
│  │  ├── CIA Web (Reference Implementation)                         │    │
│  │  ├── Your Research App                                          │    │
│  │  └── Other Apps Built on CIAUI                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│  ┌─────────────────────────────────▼───────────────────────────────┐    │
│  │                    COMPONENT LAYER                               │    │
│  │  ├── Adaptive Atoms (Button, Toggle, Slider, Input...)         │    │
│  │  ├── Adaptive Molecules (ToolButton, DatasetItem, Panel...)    │    │
│  │  └── Adaptive Organisms (TabBar, Minimap, Toolbar...)          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│  ┌─────────────────────────────────▼───────────────────────────────┐    │
│  │                    ADAPTIVE LAYER                                │    │
│  │  ├── AdaptiveContext (mode, density, tokens)                    │    │
│  │  ├── AdaptiveRenderer (selects 2D or 3D render path)           │    │
│  │  ├── InputAbstraction (mouse/touch/controller/gaze)            │    │
│  │  └── LayoutEngine (2D flex/grid ↔ 3D spatial)                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│  ┌─────────────────────────────────▼───────────────────────────────┐    │
│  │                    INTERACTION LAYER                             │    │
│  │  ├── Pointer System (ray, gaze, touch unified)                  │    │
│  │  ├── Gesture Recognition (pinch, grab, swipe)                   │    │
│  │  ├── Haptic Feedback (controller vibration patterns)            │    │
│  │  ├── Spatial Audio (3D positioned sounds)                       │    │
│  │  └── Accessibility (screen reader, high contrast, captions)     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│  ┌─────────────────────────────────▼───────────────────────────────┐    │
│  │                    COLLABORATION LAYER                           │    │
│  │  ├── Presence (cursor positions, user locations)                │    │
│  │  ├── State Sync (CRDT-based, Y.js compatible)                  │    │
│  │  ├── Voice (spatial audio, LiveKit integration)                 │    │
│  │  └── Audit Trail (action logging, reproducibility)              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│  ┌─────────────────────────────────▼───────────────────────────────┐    │
│  │                    RENDER LAYER                                  │    │
│  │  ├── WebGPU Renderer (primary, compute shaders)                 │    │
│  │  ├── WebGL2 Fallback (compatibility)                            │    │
│  │  ├── DOM Renderer (desktop 2D, accessibility)                   │    │
│  │  └── Render Compositor (blends 2D + 3D + data viz)             │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│  ┌─────────────────────────────────▼───────────────────────────────┐    │
│  │                    PLATFORM LAYER                                │    │
│  │  ├── WebXR (VR/AR sessions)                                     │    │
│  │  ├── WebGPU (GPU compute + render)                              │    │
│  │  ├── WebGL2 (fallback render)                                   │    │
│  │  └── DOM (2D UI)                                                │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### 1. Adaptive Components

A single component definition that renders appropriately for the current mode:

```jsx
// Developer writes ONE component
const Button = adaptive({
  // Shared logic
  props: {
    label: PropTypes.string.required,
    icon: PropTypes.string,
    onClick: PropTypes.func,
    variant: PropTypes.oneOf(['primary', 'secondary', 'ghost']),
  },
  
  // Shared state/hooks
  setup(props) {
    const [pressed, setPressed] = useState(false);
    return { pressed, setPressed };
  },
  
  // Desktop render (returns React/DOM)
  desktop({ props, state, tokens }) {
    return (
      <button 
        className={cx('btn', props.variant)}
        style={{ height: tokens.buttonHeight }}
        onClick={props.onClick}
      >
        {props.icon && <Icon name={props.icon} />}
        {props.label}
      </button>
    );
  },
  
  // VR render (returns CIAUI 3D primitives)
  vr({ props, state, tokens }) {
    return (
      <VRInteractive onSelect={props.onClick}>
        <box 
          width={tokens.buttonWidth} 
          height={tokens.buttonHeight}
          depth={0.02}
          color={tokens.buttonBg}
        >
          {props.icon && <VRIcon name={props.icon} />}
          <text>{props.label}</text>
        </box>
      </VRInteractive>
    );
  },
});
```

**The framework handles:**
- Detecting current mode
- Calling appropriate render function
- Managing input abstraction
- Applying tokens

### 2. Unified Input System

All input sources abstracted to common "pointer" concept:

```typescript
interface Pointer {
  id: string;                    // Unique pointer ID
  type: 'mouse' | 'touch' | 'controller' | 'gaze' | 'hand';
  
  // 2D position (screen space, available in all modes)
  screenPosition: Vec2;
  
  // 3D position (world space, VR only)
  worldPosition?: Vec3;
  worldDirection?: Vec3;
  
  // State
  isActive: boolean;             // Hovering/pointing
  isPressing: boolean;           // Button/trigger down
  pressure?: number;             // 0-1 for pressure-sensitive
  
  // Controller-specific
  hand?: 'left' | 'right';
  haptic?: HapticActuator;
  
  // Intersection results
  intersections: Intersection[];
}

// Components receive unified events
const MyComponent = () => {
  const { onPointerEnter, onPointerLeave, onPointerDown, onPointerUp } = usePointer();
  
  return (
    <box
      onPointerEnter={onPointerEnter}  // Works with mouse, controller, gaze
      onPointerDown={onPointerDown}     // Works with click, trigger, gaze-dwell
    />
  );
};
```

### 3. Spatial Layout Engine

Automatically converts 2D layouts to 3D spatial arrangements:

```jsx
// Developer writes layout once
<Panel>
  <Flex direction="column" gap={8}>
    <Button>Option 1</Button>
    <Button>Option 2</Button>
    <Button>Option 3</Button>
  </Flex>
</Panel>

// Desktop: renders as flexbox column
// VR: renders as vertical stack in 3D space with proper depths

// Explicit spatial hints when needed
<Panel 
  vrPosition={[0, 1.5, -1]}      // Position in VR
  vrCurve={15}                    // Curve angle for comfort
  vrFollowGaze={true}             // Panel follows user gaze
>
  {children}
</Panel>
```

### 4. Token-Based Theming

Design tokens automatically scale for mode:

```typescript
const tokens = createTokens({
  // Base values (desktop)
  buttonHeight: 32,
  fontSize: 14,
  iconSize: 16,
  spacing: 8,
  borderRadius: 6,
  
  // VR multipliers/overrides
  vr: {
    buttonHeight: 56,       // Larger for VR
    fontSize: 18,
    iconSize: 24,
    spacing: 12,
    borderRadius: 10,
    
    // VR-specific
    minTouchTarget: 44,
    iconStrokeWidth: 1.5,   // Thinner strokes at larger sizes
    panelDistance: 0.8,     // Default distance from user (meters)
  },
});
```

### 5. Collaboration Primitives

Built-in support for multi-user scenarios:

```jsx
// Shared state hook (CRDT-backed)
const [annotations, setAnnotations] = useSharedState('annotations', {
  sync: 'realtime',           // or 'on-save', 'manual'
  conflict: 'merge',          // or 'last-write-wins', 'custom'
  audit: true,                // Log changes for reproducibility
});

// Presence hook
const { users, localUser, updatePresence } = usePresence();

// Awareness of other users
<Canvas>
  {users.map(user => (
    <UserCursor 
      key={user.id}
      position={user.cursorPosition}
      color={user.color}
      name={user.name}
      tool={user.activeTool}
    />
  ))}
</Canvas>

// Spatial voice
const { speak, mute, setPosition } = useSpatialVoice();
```

### 6. Audit Trail & Reproducibility

Built-in action logging for scientific use:

```jsx
// All state changes automatically logged
const [selection, setSelection] = useAuditedState('selection', {
  log: true,
  metadata: (action) => ({
    timestamp: Date.now(),
    user: currentUser.id,
    reason: action.reason,        // Optional annotation
  }),
});

// Replay capability
const { replay, seek, isReplaying } = useSessionReplay();

// Export session for publication
const exportSession = () => {
  return {
    initialState: session.initialState,
    actions: session.actionLog,
    metadata: session.metadata,
    // Can be replayed to reproduce exact analysis
  };
};
```

---

## Module Structure

```
@ciaui/core
├── adaptive/
│   ├── AdaptiveProvider.js
│   ├── AdaptiveRenderer.js
│   ├── useAdaptive.js
│   └── tokens.js
├── components/
│   ├── atoms/
│   ├── molecules/
│   └── organisms/
├── input/
│   ├── PointerSystem.js
│   ├── GestureRecognizer.js
│   └── InputAbstraction.js
├── layout/
│   ├── SpatialLayout.js
│   ├── Flex.js
│   └── Grid.js
└── utils/

@ciaui/render-webgpu
├── WebGPURenderer.js
├── ShaderLibrary.js
├── ComputePipelines.js
└── TextRenderer.js

@ciaui/render-webgl
├── WebGLRenderer.js
└── Fallback utilities

@ciaui/render-dom
├── DOMRenderer.js
└── React integration

@ciaui/xr
├── XRSession.js
├── XRInput.js
├── XRControllers.js
├── XRHands.js
└── XRAnchors.js

@ciaui/collab
├── PresenceProvider.js
├── SharedState.js
├── CRDTAdapters.js
├── AuditTrail.js
└── VoiceIntegration.js

@ciaui/a11y
├── ScreenReaderBridge.js
├── HighContrastMode.js
├── ReducedMotion.js
└── CaptionSystem.js

@ciaui/devtools
├── Inspector.js
├── PerformanceMonitor.js
├── StateDebugger.js
└── VRSimulator.js
```

---

## WebGPU Integration

### Why WebGPU?

| Feature | WebGL | WebGPU |
|---------|-------|--------|
| Compute shaders | ❌ | ✅ |
| Better multi-threading | ❌ | ✅ |
| Lower CPU overhead | ❌ | ✅ |
| Modern GPU features | Limited | Full |
| Future browser support | Maintenance | Primary |

### Compute Shader Use Cases for CIAUI

```wgsl
// Text rendering via compute
@compute @workgroup_size(64)
fn render_text(@builtin(global_invocation_id) id: vec3<u32>) {
    // SDF text rendering on GPU
    // Much faster than Canvas2D for VR text
}

// UI layout computation
@compute @workgroup_size(256)
fn compute_layout(@builtin(global_invocation_id) id: vec3<u32>) {
    // Parallel layout calculation for many UI elements
}

// Collision detection for VR interaction
@compute @workgroup_size(128)
fn ray_intersect(@builtin(global_invocation_id) id: vec3<u32>) {
    // GPU-accelerated ray-box intersection for UI
}
```

### Fallback Strategy

```typescript
class RenderManager {
  async initialize() {
    if (await this.checkWebGPUSupport()) {
      this.renderer = new WebGPURenderer();
      this.capabilities = 'full';
    } else if (this.checkWebGL2Support()) {
      this.renderer = new WebGL2Renderer();
      this.capabilities = 'limited';
      console.warn('WebGPU not available, using WebGL2 fallback');
    } else {
      this.renderer = new DOMOnlyRenderer();
      this.capabilities = 'minimal';
      console.warn('No GPU rendering available, using DOM only');
    }
  }
}
```

---

## WebXR Integration

### Session Management

```typescript
class XRManager {
  // Support multiple session types
  async requestSession(type: 'immersive-vr' | 'immersive-ar' | 'inline') {
    const session = await navigator.xr.requestSession(type, {
      requiredFeatures: ['local-floor'],
      optionalFeatures: [
        'hand-tracking',
        'bounded-floor',
        'layers',
        'depth-sensing',      // For AR occlusion
        'hit-test',           // For AR placement
      ],
    });
    
    return new XRSessionWrapper(session);
  }
}
```

### Frame Loop Integration

```typescript
class FrameScheduler {
  private animationFrame: number;
  private xrSession: XRSession | null;
  
  tick = (time: DOMHighResTimeStamp, xrFrame?: XRFrame) => {
    // Update input state
    this.inputSystem.update(xrFrame);
    
    // Update component state (React-like reconciliation)
    this.componentTree.update();
    
    // Layout pass
    this.layoutEngine.compute();
    
    // Render pass
    if (xrFrame) {
      // VR: render to each view
      for (const view of xrFrame.getViewerPose(this.refSpace).views) {
        this.renderer.renderView(view);
      }
    } else {
      // Desktop: single render
      this.renderer.render();
    }
    
    // Schedule next frame
    if (this.xrSession) {
      this.xrSession.requestAnimationFrame(this.tick);
    } else {
      requestAnimationFrame(this.tick);
    }
  };
}
```

---

## Comparison: CIAUI vs Alternatives

| Feature | CIAUI | Three.js | A-Frame | React 3D |
|---------|-------|----------|---------|----------|
| WebGPU native | ✅ | ❌ (WIP) | ❌ | ❌ |
| Adaptive Desktop/VR | ✅ | ❌ Manual | ❌ Partial | ❌ |
| React-like DX | ✅ | ❌ | ❌ Entity | ✅ (R3F) |
| Built-in collaboration | ✅ | ❌ | ❌ | ❌ |
| Audit trails | ✅ | ❌ | ❌ | ❌ |
| Scientific focus | ✅ | ❌ | ❌ | ❌ |
| Unified input | ✅ | ❌ Manual | ⚠️ Partial | ⚠️ Partial |
| Tree-shakeable | ✅ | ⚠️ | ❌ | ⚠️ |
| VR UI primitives | ✅ | ❌ | ✅ | ❌ |
| WebGL fallback | ✅ | ✅ Native | ✅ | ✅ |

---

## Development Phases

### Phase 1: Core Foundation (8-10 weeks)

**Goal:** Render adaptive components in both modes

```
Week 1-2: Architecture Setup
├── Project structure
├── Build system (Vite/esbuild)
├── TypeScript configuration
├── Testing framework
└── Basic CI/CD

Week 3-4: Render Layer
├── WebGPU renderer skeleton
├── WebGL2 fallback
├── DOM renderer
├── Render compositor
└── Basic text rendering

Week 5-6: Adaptive System
├── AdaptiveProvider
├── Token system
├── Mode detection
├── Component definition API
└── Basic atoms (Box, Text)

Week 7-8: Input System
├── Pointer abstraction
├── Mouse/touch handling
├── Controller input
├── Basic gesture recognition
└── Event system

Week 9-10: WebXR Integration
├── Session management
├── Reference space handling
├── Controller visualization
├── Frame scheduling
└── View rendering
```

**Deliverable:** "Hello World" that renders a button on desktop AND in VR

### Phase 2: Component Library (6-8 weeks)

**Goal:** Full set of adaptive UI components

```
Week 11-12: Atoms
├── Button, IconButton
├── Toggle, Checkbox
├── Slider, Input
├── Icon, Text
├── Badge, ColorDot
└── Stories for all

Week 13-14: Molecules
├── SectionHeader
├── ToolButton
├── NumberStepper
├── SearchField
├── ListItem
└── Panels

Week 15-16: Organisms
├── TabBar
├── Toolbar
├── Minimap
├── Tree view
├── Floating panel
└── Modal system

Week 17-18: Layout
├── Flex layout
├── Grid layout
├── Spatial layout (VR)
├── Responsive rules
└── Panel system
```

**Deliverable:** Component library sufficient to build CIA Web UI

### Phase 3: Collaboration Features (4-6 weeks)

**Goal:** Multi-user support built into framework

```
Week 19-20: Presence
├── Presence provider
├── Cursor sharing
├── User avatars (VR)
├── Activity indicators
└── Y.js adapter

Week 21-22: Shared State
├── CRDT integration
├── Conflict resolution
├── Sync strategies
├── Offline support
└── State inspection

Week 23-24: Audit & Voice
├── Action logging
├── Session replay
├── Voice integration
├── Spatial audio
└── Export/import
```

**Deliverable:** Multiple users can collaborate with full audit trail

### Phase 4: Polish & Documentation (4 weeks)

**Goal:** Production-ready, well-documented

```
Week 25-26: Performance
├── Profiling
├── Optimization
├── Memory management
├── Bundle size reduction
└── Lazy loading

Week 27-28: Documentation
├── API documentation
├── Tutorials
├── Examples
├── Migration guide
├── Research paper draft
```

**Deliverable:** v1.0 release, research paper submission

---

## Integration with CIA Web

CIA Web becomes the **reference implementation** of CIAUI:

```
ciaui/                          ← Framework repo
├── packages/
│   ├── core/
│   ├── render-webgpu/
│   ├── xr/
│   ├── collab/
│   └── devtools/
├── examples/
│   └── basic-app/
└── docs/

cia-web/                        ← Application repo
├── src/
│   ├── app/                    ← CIA Web application code
│   ├── plugins/                ← VTK.js integration, etc.
│   └── ...
├── package.json
│   └── dependencies:
│       ├── @ciaui/core
│       ├── @ciaui/xr
│       └── @ciaui/collab
└── ...
```

### VTK.js Integration Pattern

```jsx
// CIAUI provides the UI, VTK.js provides the science
import { AdaptiveProvider, Panel, Toolbar } from '@ciaui/core';
import { VTKBridge } from './plugins/vtk';

const App = () => (
  <AdaptiveProvider>
    {/* VTK.js renders scientific data */}
    <VTKBridge>
      <VTKVolume data={volumeData} />
    </VTKBridge>
    
    {/* CIAUI renders UI */}
    <Panel position="left">
      <DatasetTree />
    </Panel>
    
    <Toolbar position="bottom">
      <AnnotationTools />
    </Toolbar>
  </AdaptiveProvider>
);
```

---

## Research Paper Outline

### Title
"CIAUI: A WebGPU-Native Framework for Adaptive Collaborative Immersive Analytics Interfaces"

### Abstract
We present CIAUI, an open-source framework for building user interfaces that adapt seamlessly between traditional desktop and immersive VR environments. Unlike existing frameworks that treat VR as an afterthought, CIAUI is designed VR-first with WebGPU rendering, unified input abstraction, and built-in collaboration primitives including real-time presence, CRDT-based state synchronization, and comprehensive audit trails for scientific reproducibility.

### Contributions
1. **Adaptive Component Model** - Single component definition renders appropriately in 2D and 3D
2. **Unified Input Abstraction** - Mouse, touch, controllers, gaze, and hands through single API
3. **Collaboration Primitives** - Built-in presence, shared state, and audit trail
4. **WebGPU-Native Rendering** - Modern GPU pipeline with WebGL fallback
5. **Open Source Reference Implementation** - CIA Web demonstrates full capabilities

### Evaluation
- Performance benchmarks (frame time, input latency)
- User study comparing adaptive vs separate interfaces
- Developer experience survey
- Collaboration effectiveness study

---

## Repository Structure Proposal

```
github.com/your-org/ciaui
├── .github/
│   ├── workflows/
│   └── CONTRIBUTING.md
├── packages/
│   ├── core/
│   │   ├── src/
│   │   ├── tests/
│   │   └── package.json
│   ├── render-webgpu/
│   ├── render-webgl/
│   ├── render-dom/
│   ├── xr/
│   ├── collab/
│   ├── a11y/
│   └── devtools/
├── examples/
│   ├── hello-world/
│   ├── todo-app/
│   └── scientific-viz/
├── docs/
│   ├── getting-started.md
│   ├── api/
│   ├── tutorials/
│   └── research/
├── benchmarks/
├── LICENSE (MIT)
├── README.md
└── package.json (monorepo root)
```

---

## Decisions Made

### 1. Framework Name
- **TBD** - Working name for now, can rename before v1.0
- Placeholder: `@anthropic-research/adaptive-ui` or similar

### 2. Scope Boundaries
- **UI-only** - Framework handles adaptive UI components
- VTK.js, Three.js, etc. integrate as separate packages
- Future: Could build competing viz frameworks on top of this foundation

### 3. License
- **MIT** - Maximum adoption, research-friendly, dissertation-compatible

### 4. Development Strategy
- **Option A: Parallel Development**
- Framework is a SEPARATE repository
- CIA Web imports framework as dependency
- Clean separation of concerns
- Framework solves UI problems at framework level
- CIA Web focuses on application-specific logic

### 5. Relationship to CIA Web
```
framework-repo/          ← Generic, reusable
├── Adaptive components
├── WebGPU rendering
├── WebXR integration
└── Collaboration primitives

cia-web/                 ← Application-specific
├── imports @framework/*
├── VTK.js integration
├── Scientific workflows
└── Domain-specific features
```

---

## Next Steps

1. **Create framework repository** with basic structure
2. **Prototype WebGPU text rendering** (often hardest part)
3. **Build minimal adaptive component** (button in both modes)
4. **Document architecture decisions** as we go (for paper)
5. **Parallel: Continue CIA Web** with current approach, migrate later

---

*Specification created: January 2, 2025*
*Ready for review and repository creation*
