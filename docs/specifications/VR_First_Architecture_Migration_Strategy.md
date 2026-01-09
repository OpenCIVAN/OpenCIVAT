# CIA Web - VR-First Architecture & Migration Strategy

**Date:** January 2, 2025
**Status:** Architectural Decision Document
**Decision Required:** Framework choice, migration approach, VR interaction patterns

---

## Current State Analysis

### What Exists

```
RENDERING
├── VTK.js           → Primary 3D scientific visualization
├── VRManager        → Raw WebXR session management
├── VTKInstanceHandler → VR stereo rendering for instances
└── WebGL context    → Shared, XR-compatible

UI (2D)
├── React components → Desktop UI
├── AdaptiveContext  → Mode switching foundation
└── Design tokens    → Sizing system started
```

### Architecture Insight

**VTK.js is the RIGHT choice for scientific visualization** - it's purpose-built for:
- Volume rendering
- Isosurfaces
- Point clouds
- DICOM/NIfTI data

**The question is: What renders the UI in VR?**

---

## Framework Decision: Three.js for VR UI

### Options Evaluated

| Framework | Pros | Cons | Verdict |
|-----------|------|------|---------|
| **A-Frame** | Declarative, easy | Abstraction conflicts with React, less control | ❌ |
| **Raw WebXR** | No dependencies, full control | Massive effort, reinvent everything | ❌ |
| **Three.js + R3F** | React paradigm, full control, huge ecosystem | Learning curve, bundle size | ✅ |
| **VTK.js only** | Already integrated | Not designed for UI rendering | Partial ✅ |

### Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CIA Web                                  │
├─────────────────────────────────────────────────────────────────┤
│  REACT APPLICATION                                               │
│  ├── AdaptiveContext (mode: 'desktop' | 'vr')                   │
│  ├── Desktop UI (current React components)                       │
│  └── VR UI (react-three-fiber components)                       │
├─────────────────────────────────────────────────────────────────┤
│  RENDERING LAYER                                                 │
│  ├── VTK.js Canvas ──────────────► Scientific Data Viz          │
│  │   └── XR-compatible WebGL context                            │
│  │                                                               │
│  └── Three.js/R3F Canvas ────────► VR UI (panels, menus)        │
│      └── Shares XR session with VTK                             │
├─────────────────────────────────────────────────────────────────┤
│  WEBXR SESSION (single, shared)                                  │
│  ├── VRManager (existing) - session lifecycle                   │
│  ├── Input handling (controllers, hands)                        │
│  └── Reference space management                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Why This Works

1. **VTK.js continues to render scientific data** - don't mess with what works
2. **Three.js/R3F renders UI elements** - purpose-built for 3D UI
3. **Single WebXR session** - VRManager coordinates both renderers
4. **React paradigm preserved** - R3F uses React components for 3D
5. **Adaptive components work in both** - same tokens, different renderers

---

## VR Tooltip/Hover Solution: Multi-Modal Interaction

Since hover doesn't exist in VR, we need **equivalent discovery mechanisms**:

### 1. Persistent Labels (Default)
```
┌─────────────────┐
│  🔧             │   ← Desktop: icon only, hover for tooltip
│                 │
└─────────────────┘

┌─────────────────┐
│  🔧  Settings   │   ← VR: always show label
│                 │
└─────────────────┘
```
**Already decided:** Atoms show labels when `isVR = true`

### 2. Controller Ray Intersection → Info Panel
```
User points at element
       ↓
Ray intersects bounding box
       ↓
Info panel appears near element (or follows controller)
       ↓
Panel shows: Name, Description, Shortcuts, "Tap trigger to use"
```

### 3. Gaze Dwell (Hands-Free Option)
```
User looks at element
       ↓
Dwell timer starts (progress ring around element)
       ↓
After 800ms: Info panel appears
       ↓
Look away: Panel fades
```

### 4. Info Mode Toggle
```
User activates "Info Mode" via wrist menu
       ↓
ALL interactive elements show info badges
       ↓
Tap any badge → detailed help
       ↓
Toggle off to return to normal
```

### 5. Voice Query (Future)
```
User points at element
       ↓
Says "What's this?" or "Help"
       ↓
Audio + visual explanation plays
```

### Implementation: VRTooltipSystem

```typescript
interface VRTooltipSystem {
  // Trigger modes
  mode: 'ray-hover' | 'gaze-dwell' | 'info-mode' | 'manual';
  
  // Ray hover settings
  rayHover: {
    enabled: boolean;
    delay: number;          // ms before showing (default 200)
    offset: Vector3;        // Panel offset from element
    followController: boolean;
  };
  
  // Gaze dwell settings
  gazeDwell: {
    enabled: boolean;
    duration: number;       // ms to dwell (default 800)
    showProgress: boolean;  // Show progress ring
  };
  
  // Info mode
  infoMode: {
    active: boolean;
    showBadges: boolean;
  };
}

// Component integration
interface VRInteractiveProps {
  // Added to all interactive atoms in VR
  vrTooltip?: {
    title: string;
    description?: string;
    shortcut?: string;
    position?: 'above' | 'below' | 'left' | 'right' | 'follow';
  };
}
```

### VR Info Panel Component

```jsx
// Three.js/R3F component for info panels
const VRInfoPanel = ({ 
  title, 
  description, 
  position, 
  visible,
  onDismiss 
}) => {
  const { tokens } = useAdaptive();
  
  return (
    <Billboard follow={true} lockX={false} lockY={false}>
      <mesh visible={visible}>
        <planeGeometry args={[0.3, 0.2]} />
        <meshBasicMaterial 
          color="#1a1a24" 
          transparent 
          opacity={0.95} 
        />
      </mesh>
      <Text
        position={[0, 0.05, 0.01]}
        fontSize={0.02}
        color={tokens.colors.textPrimary}
        anchorX="center"
      >
        {title}
      </Text>
      <Text
        position={[0, -0.02, 0.01]}
        fontSize={0.015}
        color={tokens.colors.textSecondary}
        anchorX="center"
        maxWidth={0.28}
      >
        {description}
      </Text>
    </Billboard>
  );
};
```

---

## Migration Strategy: Incremental with Parallel Systems

### Phase 1: Audit & Map (1 week)

```bash
# Run audit script to inventory components
node scripts/audit-components.js

# Output:
# ┌─────────────────────────────────────┐
# │ Component Inventory                 │
# ├─────────────────────────────────────┤
# │ Total: 47 components                │
# │ ├── Atoms (candidates): 12          │
# │ ├── Molecules (candidates): 18      │
# │ ├── Organisms (candidates): 11      │
# │ └── Templates: 6                    │
# │                                     │
# │ Using useAdaptive(): 3              │
# │ Hardcoded sizes: 44                 │ ← Need migration
# │ Using design tokens: 8              │
# └─────────────────────────────────────┘
```

**Deliverables:**
- Component inventory spreadsheet
- Mapping to atomic hierarchy
- Dependency graph
- Risk assessment

### Phase 2: Atomic Foundation (2 weeks)

**Build NEW atoms in parallel, don't touch old yet:**

```
src/ui/react/components/
├── atoms/              ← NEW (VR-first adaptive)
│   ├── Icon/
│   ├── Button/
│   ├── Toggle/
│   └── ...
├── common/             ← OLD (keep running)
│   ├── Icon/
│   ├── Button/
│   └── ...
└── index.js            ← Export both, migrate gradually
```

**Pattern:**
```jsx
// src/ui/react/components/index.js

// Phase 2: Export both, old aliased
export { Button } from './atoms/Button';        // New adaptive
export { Button as LegacyButton } from './common/Button';  // Old

// Phase 3: Remove legacy exports
// export { Button } from './atoms/Button';
```

### Phase 3: Molecule Composition (1 week)

Build molecules from new atoms:
```jsx
// src/ui/react/components/molecules/ToolButton/ToolButton.jsx
import { Button, Icon } from '../../atoms';  // Uses NEW atoms

export const ToolButton = ({ icon, label, ...props }) => (
  <Button {...props}>
    <Icon name={icon} />
    {label}
  </Button>
);
```

### Phase 4: Incremental Replacement (2-3 weeks)

Replace old components ONE BY ONE:

```jsx
// Before
import { Button } from '@UI/react/components/common/Button';

// After
import { Button } from '@UI/react/components/atoms/Button';
```

**Replacement Order:**
1. Standalone components (easy, low risk)
2. Frequently used components (high impact)
3. Complex compositions (higher risk)
4. Templates (final)

**Verification:**
- Unit tests pass
- Storybook stories match
- Visual regression tests
- Manual VR testing

### Phase 5: Cleanup (1 week)

After all migrations verified:
```bash
# Remove old components
rm -rf src/ui/react/components/common/Button
rm -rf src/ui/react/components/common/Icon
# ... etc

# Update imports (automated)
node scripts/update-imports.js

# Run full test suite
npm run test
```

---

## Three.js/R3F Integration Plan

### Installation

```bash
npm install three @react-three/fiber @react-three/drei @react-three/xr
```

### Architecture

```
src/
├── ui/
│   ├── react/              ← 2D UI (desktop + VR overlay)
│   │   └── components/
│   │       ├── atoms/
│   │       ├── molecules/
│   │       └── organisms/
│   │
│   └── vr/                 ← 3D VR UI (Three.js/R3F)
│       ├── components/
│       │   ├── VRPanel/
│       │   ├── VRButton/
│       │   ├── VRMenu/
│       │   ├── VRInfoPanel/
│       │   └── VRWristUI/
│       ├── systems/
│       │   ├── VRTooltipSystem.js
│       │   ├── VRInputSystem.js
│       │   └── VRLayoutSystem.js
│       └── VRUICanvas.jsx
│
├── core/
│   └── vr/
│       ├── VRManager.js       ← Existing, enhanced
│       ├── VRControllers.js   ← Existing
│       └── VRBridge.js        ← NEW: Coordinates VTK + Three.js
```

### VR Bridge Concept

```jsx
// src/core/vr/VRBridge.js
// Coordinates VTK.js and Three.js rendering in shared XR session

class VRBridge {
  constructor(vrManager) {
    this.vrManager = vrManager;
    this.vtkRenderer = null;
    this.threeRenderer = null;
    this.xrSession = null;
  }
  
  async initialize(vtkCanvas, threeCanvas) {
    // Get shared XR session from VRManager
    this.xrSession = this.vrManager.getSession();
    
    // VTK.js renders to its canvas (scientific data)
    this.vtkRenderer = await this.setupVTKRenderer(vtkCanvas);
    
    // Three.js renders to overlay canvas (UI)
    this.threeRenderer = await this.setupThreeRenderer(threeCanvas);
    
    // Both share the same XR session and reference space
    this.synchronizeRenderers();
  }
  
  onXRFrame(time, frame) {
    // 1. VTK renders scientific content
    this.vtkRenderer.render(frame);
    
    // 2. Three.js renders UI overlay
    this.threeRenderer.render(frame);
  }
}
```

### React Integration

```jsx
// src/App.jsx (simplified)
import { Canvas } from '@react-three/fiber';
import { XR, Controllers, Hands } from '@react-three/xr';
import { VTKCanvas } from './ui/vtk/VTKCanvas';
import { VRUICanvas } from './ui/vr/VRUICanvas';

const App = () => {
  const { isVR } = useAdaptive();
  
  return (
    <div className="app">
      {/* 2D React UI (desktop or VR overlay) */}
      <DesktopUI visible={!isVR} />
      
      {/* VTK.js Canvas (always renders scientific data) */}
      <VTKCanvas />
      
      {/* Three.js/R3F Canvas (VR UI when in VR mode) */}
      {isVR && (
        <Canvas>
          <XR>
            <Controllers />
            <Hands />
            <VRUICanvas />
          </XR>
        </Canvas>
      )}
    </div>
  );
};
```

---

## VR UI Components (Three.js/R3F)

### VRPanel

```jsx
// Floating panel in VR space
const VRPanel = ({ 
  title, 
  children, 
  position = [0, 1.5, -1],
  width = 0.4,
  height = 0.5,
  pinned = false,
  onGrab,
  onRelease,
}) => {
  const meshRef = useRef();
  const { tokens } = useAdaptive();
  
  // Make grabbable for repositioning
  useXREvent('selectstart', (e) => {
    if (intersectsPanel(e, meshRef)) {
      onGrab?.(e);
    }
  });
  
  return (
    <group position={position}>
      {/* Panel background */}
      <RoundedBox args={[width, height, 0.02]} radius={0.02}>
        <meshStandardMaterial 
          color={tokens.colors.bgPrimary} 
          transparent 
          opacity={0.95}
        />
      </RoundedBox>
      
      {/* Panel header */}
      <VRPanelHeader title={title} pinned={pinned} />
      
      {/* Panel content */}
      <group position={[0, -0.05, 0.015]}>
        {children}
      </group>
    </group>
  );
};
```

### VRButton

```jsx
// Button in VR space
const VRButton = ({
  label,
  icon,
  onClick,
  position = [0, 0, 0],
  width = 0.1,
  height = 0.04,
  color,
}) => {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const { tokens } = useAdaptive();
  
  const bgColor = pressed 
    ? tokens.colors.bgActive 
    : hovered 
      ? tokens.colors.bgHover 
      : tokens.colors.bgSecondary;
  
  return (
    <Interactive
      onHover={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onSelectStart={() => setPressed(true)}
      onSelectEnd={() => { setPressed(false); onClick?.(); }}
    >
      <group position={position}>
        <RoundedBox args={[width, height, 0.01]} radius={0.005}>
          <meshStandardMaterial color={bgColor} />
        </RoundedBox>
        
        {icon && (
          <VRIcon name={icon} position={[-width/2 + 0.015, 0, 0.006]} />
        )}
        
        <Text
          position={[icon ? 0.01 : 0, 0, 0.006]}
          fontSize={0.015}
          color={color || tokens.colors.textPrimary}
          anchorX={icon ? 'left' : 'center'}
        >
          {label}
        </Text>
      </group>
    </Interactive>
  );
};
```

### VRWristMenu

```jsx
// Menu attached to user's wrist
const VRWristMenu = ({ children }) => {
  const { player } = useXR();
  const leftController = useController('left');
  
  if (!leftController) return null;
  
  return (
    <group>
      {/* Attach to left wrist */}
      <primitive object={leftController.grip}>
        <group position={[0, 0.05, 0]} rotation={[-Math.PI / 4, 0, 0]}>
          <VRPanel title="Menu" width={0.15} height={0.2}>
            {children}
          </VRPanel>
        </group>
      </primitive>
    </group>
  );
};
```

---

## VR Discoverability Strategy

### Layered Approach

```
LAYER 1: Always Visible
├── Button labels (atoms handle this via isVR)
├── Panel titles
├── Active tool indicators
└── Critical status (recording, connection)

LAYER 2: On Interaction
├── Ray hover → Info panel (200ms delay)
├── Controller proximity → Highlight
├── Focus → Expanded info
└── Haptic feedback on interactive elements

LAYER 3: On Demand
├── Info Mode toggle → All hints visible
├── Help gesture → Contextual help
├── Voice command → Audio explanation
└── Tutorial mode → Guided walkthrough

LAYER 4: Progressive Onboarding
├── First VR session → Full hints visible
├── After 3 sessions → Hints collapse to ?
├── Power user → Minimal hints
└── Reset option → Restore all hints
```

### Haptic Feedback Patterns

```typescript
const HAPTIC_PATTERNS = {
  hover: { intensity: 0.1, duration: 50 },      // Light buzz on hover
  press: { intensity: 0.5, duration: 100 },     // Click feedback
  success: { intensity: 0.3, duration: 200 },   // Action completed
  error: { intensity: 0.8, duration: 300 },     // Something wrong
  warning: { pattern: [0.2, 50, 0.4, 50] },    // Pulsing warning
};

// Usage
const triggerHaptic = (controller, pattern) => {
  if (controller?.gamepad?.hapticActuators?.[0]) {
    controller.gamepad.hapticActuators[0].pulse(
      pattern.intensity,
      pattern.duration
    );
  }
};
```

---

## Implementation Timeline

### Phase 1: Foundation (Week 1-2)
- [ ] Audit existing components
- [ ] Create component mapping
- [ ] Install Three.js/R3F
- [ ] Create VRBridge skeleton

### Phase 2: Atomic Migration (Week 3-4)
- [ ] Build adaptive atoms with Storybook
- [ ] Test in both modes
- [ ] Begin incremental replacement

### Phase 3: VR UI Components (Week 5-6)
- [ ] VRPanel, VRButton, VRText
- [ ] VRWristMenu
- [ ] VRInfoPanel
- [ ] VRTooltipSystem

### Phase 4: Integration (Week 7-8)
- [ ] VRBridge connecting VTK + Three.js
- [ ] Input system refinement
- [ ] Haptic feedback
- [ ] Initial user testing

### Phase 5: Polish (Week 9-10)
- [ ] Performance optimization
- [ ] Accessibility (audio cues, high contrast)
- [ ] Documentation
- [ ] Contributor guide

---

## Decision Points for Beth

### 1. Three.js/R3F vs VTK-only UI
**Recommendation:** Use Three.js/R3F for VR UI
- VTK.js for science, Three.js for UI
- Better tooling, more examples, easier maintenance

### 2. Migration Approach
**Recommendation:** Parallel systems, incremental replacement
- Keep old working while building new
- Replace one component at a time
- Delete old only after verification

### 3. Tooltip Mechanism
**Recommendation:** Ray-hover + Info Mode
- Ray hover: 200ms delay, shows panel
- Info Mode toggle: Shows all hints
- Progressive reduction over sessions

### 4. When to Start Three.js Integration
**Recommendation:** After atoms are stable
- Build atoms first (desktop works)
- Add VR atoms (Three.js versions)
- VRBridge coordinates both

---

## Questions to Answer

1. **What's the minimum VR experience for v1?**
   - Just viewing data in VR?
   - Basic panel interaction?
   - Full UI parity with desktop?

2. **Target hardware priority?**
   - Quest standalone (WebXR limited)?
   - PC-tethered (full power)?
   - Both equally?

3. **Migration timeline pressure?**
   - Can we break things for a sprint?
   - Or must old system always work?

4. **Contributor onboarding priority?**
   - How soon do others need to contribute?
   - Affects how much we document vs ship

---

*Document created: January 2, 2025*
*Ready for review and decisions*
