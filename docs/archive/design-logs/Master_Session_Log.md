# Master Session Log: VR-First Framework & CIA Web Architecture

**Date:** January 2, 2025
**Session Type:** Major Architectural Pivot
**Outcome:** Decision to build custom WebGPU/WebXR UI framework

---

## Executive Summary

This session evolved from floating panel design into a **major architectural decision**: building a custom WebGPU-native, WebXR-first UI framework as a separate open-source project, with CIA Web as its reference implementation.

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Build custom framework | ✅ Yes | No existing framework meets our needs |
| GPU API | WebGPU-native | Future-proof, WebGL fallback |
| VR approach | WebXR-first | Not bolted on, core architecture |
| Scope | UI-only | Integrate with VTK.js, not compete |
| License | MIT | Research-friendly, max adoption |
| Development | Parallel repos | Clean separation of concerns |
| Name | TBD | Can rename before v1.0 |

---

## Two-Repository Strategy

### Repository 1: UI Framework (NEW)

**Purpose:** Generic, reusable adaptive UI framework

```
github.com/[org]/[framework-name]
├── packages/
│   ├── core/               ← Adaptive components, tokens, hooks
│   ├── render-webgpu/      ← WebGPU renderer
│   ├── render-webgl/       ← WebGL2 fallback
│   ├── render-dom/         ← DOM renderer for 2D
│   ├── xr/                 ← WebXR session, input, controllers
│   ├── collab/             ← Presence, shared state, audit trail
│   ├── a11y/               ← Accessibility features
│   └── devtools/           ← Inspector, performance monitor
├── examples/
├── docs/
├── benchmarks/
├── LICENSE (MIT)
└── README.md
```

**Core Innovation:** Adaptive components that render appropriately in both desktop and VR from a single definition.

### Repository 2: CIA Web (EXISTING)

**Purpose:** Reference implementation + scientific visualization application

```
github.com/anthropic-research/cia-web
├── Uses @framework/* packages
├── VTK.js integration (scientific viz)
├── Domain-specific features
├── Research workflows
└── Collaboration for science
```

**Relationship:** CIA Web imports the framework, showcasing how to build a full application.

---

## Why Build a Custom Framework

### Gaps in Existing Solutions

| Framework | Gap |
|-----------|-----|
| Three.js | WebGL-based, not designed for UI |
| A-Frame | High abstraction, conflicts with React |
| React Three Fiber | Wrapper, inherits Three.js limitations |
| Babylon.js | Gaming focus, heavy, incomplete WebGPU |
| Raw WebGPU/WebXR | No UI primitives, massive effort |

### What Our Framework Provides

- **WebGPU-native** with WebGL fallback
- **WebXR-first** (VR not bolted on)
- **Adaptive components** (one definition, works everywhere)
- **Unified input** (mouse, touch, controller, gaze, hands)
- **Collaboration primitives** (presence, CRDT, audit trail)
- **React-like DX** (familiar to web developers)
- **Scientific focus** (reproducibility, audit trails)

### Research Contribution

Addresses open question:
> "How do we build UIs that provide equivalent functionality across 2D desktop and 3D immersive environments while supporting real-time collaboration for scientific analysis?"

**Publication venues:** IEEE VR, CHI, IEEE VIS, UIST, JOSS

---

## Core Framework Concepts

### 1. Adaptive Components

```jsx
const Button = adaptive({
  props: { label: String, onClick: Function },
  
  setup(props) {
    const [pressed, setPressed] = useState(false);
    return { pressed, setPressed };
  },
  
  // DOM render for desktop
  desktop({ props, tokens }) {
    return <button style={{ height: tokens.buttonHeight }}>{props.label}</button>;
  },
  
  // 3D render for VR
  vr({ props, tokens }) {
    return (
      <VRInteractive onSelect={props.onClick}>
        <box height={tokens.buttonHeight}><text>{props.label}</text></box>
      </VRInteractive>
    );
  },
});
```

### 2. Unified Input System

```typescript
interface Pointer {
  type: 'mouse' | 'touch' | 'controller' | 'gaze' | 'hand';
  screenPosition: Vec2;      // Always available
  worldPosition?: Vec3;      // VR only
  isPressing: boolean;
  intersections: Intersection[];
}
```

### 3. Token-Based Theming

```typescript
const tokens = createTokens({
  buttonHeight: 32,
  fontSize: 14,
  vr: {
    buttonHeight: 56,      // Larger in VR
    minTouchTarget: 44,    // VR minimum
    iconStrokeWidth: 1.5,  // Thinner at large sizes
  },
});
```

### 4. Collaboration Primitives

```jsx
const [state, setState] = useSharedState('annotations', {
  sync: 'realtime',
  audit: true,  // Log for reproducibility
});

const { users } = usePresence();
```

---

## VR Discoverability Solution

Since hover doesn't exist in VR, multi-modal approach:

| Layer | Mechanism | Implementation |
|-------|-----------|----------------|
| Always Visible | Labels on buttons | `isVR ? showLabel : iconOnly` |
| On Interaction | Ray hover → Info panel | 200ms delay, panel appears |
| On Demand | Info Mode toggle | All hints visible |
| Progressive | First 3 sessions full → collapse | User preference |
| Haptic | Controller vibration | Buzz on hover, click on press |

---

## Atomic Component Hierarchy (For Framework)

### Atoms (Consume useAdaptive, apply tokens)
- Icon, Button, IconButton, Toggle, Slider, Badge, ColorDot, Input, Tooltip, Spinner, Divider, Text

### Molecules (Composed from atoms, inherit adaptiveness)
- SectionHeader, ToolButton, NumberStepper, SearchField, ScopeToggle, DatasetItem, ViewItem, MiniMapCell, NavButtonCluster

### Organisms (Add layout adaptations)
- FloatingPanelHeader, TabBar, CanvasToolbar, NavigatorMinimap, DatasetTree, SplitPaneContainer

### Templates (Full panel content)
- FloatingPanel, NavigatorContent, DataBrowserContent, AnnotationsContent

---

## Framework Development Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 1. Foundation | 8-10 weeks | Button in desktop + VR |
| 2. Components | 6-8 weeks | Full component library |
| 3. Collaboration | 4-6 weeks | Multi-user support |
| 4. Polish | 4 weeks | v1.0, paper ready |

**Total:** ~6 months to publishable framework

---

## Critical Design Requirements (Do Not Lose)

### Navigator Panel
- **Independent top/bottom sections** (SplitPaneContainer)
- Not just collapsible - true split pane with resize handle
- Top: minimap, nav, quick tools
- Bottom: size controls, layouts, templates (scrollable)

### Icons Only
- **No emojis** in UI
- ScopeToggle uses `<Icon name="cube" />` not 🔵

### Adaptive at Atom Level
- Every atom consumes `useAdaptive()`
- All sizing from tokens (no hardcoded px)
- VR: 44px min touch targets
- VR: 1.5px icon strokes (thinner than desktop 2px)
- VR: No hover states, always show labels

### VR Token Values
```typescript
desktop: { buttonHeight: 28, iconSize: 14, strokeWidth: 2 }
vr:      { buttonHeight: 56, iconSize: 22, strokeWidth: 1.5, touchTarget: 44 }
```

---

## Documents Produced This Session

1. **Floating_Workspace_Atomic_Design_Session_Memory_Log.md**
   - Floating panel philosophy
   - Navigator design
   - UI/UX recommendations

2. **Atomic_Component_Decomposition_Spec.md**
   - Complete atom/molecule/organism breakdown
   - TypeScript interfaces
   - Adaptive behavior for each component

3. **VR_First_Architecture_Migration_Strategy.md**
   - Three.js/R3F evaluation (superseded by framework decision)
   - Migration strategy
   - VR tooltip solutions

4. **CIAUI_Framework_Specification.md**
   - Full framework architecture
   - Module structure
   - WebGPU/WebXR integration
   - Development timeline

5. **Master_Session_Log.md** (this document)
   - Ties everything together
   - Continuation prompts

---

## Next Steps

### Immediate (Framework Repo)
1. Create GitHub repository with monorepo structure
2. Set up TypeScript, build system (Vite)
3. Prototype WebGPU text rendering (hardest part)
4. Build minimal adaptive Button component
5. Test in desktop + VR

### Parallel (CIA Web)
1. Continue with current architecture
2. Document integration points
3. Plan migration to framework when ready

---

## Continuation Prompts

### For Framework Development (NEW REPO)

```
I'm starting development on a new WebGPU-native, WebXR-first UI framework for collaborative immersive analytics.

Please search project knowledge for:
- CIAUI_Framework_Specification.md
- Atomic_Component_Decomposition_Spec.md
- Master_Session_Log.md

KEY DECISIONS ALREADY MADE:
1. WebGPU-native with WebGL2 fallback
2. WebXR-first (VR is core, not bolted on)
3. UI-only scope (integrate with VTK.js, don't compete)
4. MIT license
5. Separate repo from CIA Web
6. React-like component model with adaptive() wrapper

CORE CONCEPT - ADAPTIVE COMPONENTS:
```jsx
const Button = adaptive({
  setup(props) { /* shared logic */ },
  desktop({ props, tokens }) { /* DOM render */ },
  vr({ props, tokens }) { /* 3D render */ },
});
```

FRAMEWORK STRUCTURE:
- @framework/core - Adaptive components, tokens, hooks
- @framework/render-webgpu - WebGPU renderer
- @framework/render-webgl - Fallback
- @framework/xr - WebXR integration
- @framework/collab - Presence, shared state, audit

This session I want to:
[Specify: "Set up repo structure" or "Prototype WebGPU text rendering" or "Build adaptive Button atom"]

Please confirm you understand the adaptive component model and WebGPU-first approach before proceeding.
```

### For CIA Web Development (EXISTING REPO)

```
I'm continuing CIA Web development. This will eventually use a custom UI framework we're building separately, but for now I'm working on the application layer.

Please search project knowledge for:
- Master_Session_Log.md
- Floating_Workspace_Atomic_Design_Session_Memory_Log.md
- Left_Panel_Design_Specification.md

CONTEXT:
- Building a collaborative immersive analytics platform
- VR-first design, implemented desktop-first for debugging
- Will migrate to custom framework when ready
- For now, continue with React + current architecture

KEY DESIGN DECISIONS:
1. Navigator: Independent top/bottom sections (SplitPaneContainer)
2. Icons only, no emojis
3. Adaptive atoms consuming useAdaptive()
4. "Floating First, Panels for Discovery" philosophy

This session I want to:
[Specify task]
```

---

## Research Paper Notes

### Working Title
"[Framework Name]: A WebGPU-Native Framework for Adaptive Collaborative Immersive Analytics Interfaces"

### Key Contributions
1. Adaptive component model (one definition, desktop + VR)
2. Unified input abstraction (mouse through hand tracking)
3. Built-in collaboration with audit trails
4. WebGPU-native rendering pipeline
5. Open-source reference implementation (CIA Web)

### Evaluation Plan
- Performance benchmarks (frame time, latency)
- User study: adaptive vs separate interfaces
- Developer experience survey
- Collaboration effectiveness study

---

*Master session log created: January 2, 2025*
*Ready for framework repository creation*
