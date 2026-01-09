# CIA Web - Atomic Component Decomposition Specification

**Purpose:** Complete breakdown of all components needed for the Floating Workspace System
**Architecture:** Atomic Design (Atoms → Molecules → Organisms → Templates)
**Target:** Storybook-ready, VR-first adaptive components

---

## VR-FIRST ADAPTIVE ARCHITECTURE

### Core Principle: Adaptive at the Atom Level

Every atom consumes `useAdaptive()` and applies mode-appropriate sizing. When atoms are adaptive, **molecules and organisms become adaptive automatically** through composition.

```
┌─────────────────────────────────────────────────────────────┐
│  AdaptiveProvider (wraps entire app)                        │
│    ↓ provides: mode, density, tokens, isVR                  │
├─────────────────────────────────────────────────────────────┤
│  ATOM: Button                                               │
│    └─ reads tokens.buttonHeight, tokens.fontSize            │
│    └─ applies tokens.touchTarget (44px min in VR)           │
│    └─ disables :hover in VR mode                            │
├─────────────────────────────────────────────────────────────┤
│  MOLECULE: ToolButton (composed of Icon + Button)           │
│    └─ automatically adaptive because atoms are adaptive     │
│    └─ no additional adaptive code needed                    │
├─────────────────────────────────────────────────────────────┤
│  ORGANISM: QuickToolsBar (composed of ToolButtons)          │
│    └─ automatically adaptive because molecules are adaptive │
│    └─ may add layout adjustments (row vs column in VR)      │
└─────────────────────────────────────────────────────────────┘
```

### Adaptive Token System

```typescript
// From AdaptiveContext - all atoms consume these
const ADAPTIVE_TOKENS = {
  desktop: {
    comfortable: {
      // Sizing
      buttonHeight: 28,
      buttonHeightSm: 24,
      buttonHeightLg: 34,
      iconSize: 14,
      iconSizeSm: 12,
      iconSizeLg: 16,
      fontSize: 11,
      fontSizeSm: 10,
      fontSizeLg: 12,
      
      // Spacing
      gap: 8,
      gapSm: 6,
      gapLg: 12,
      padding: 8,
      
      // Touch/Click
      touchTarget: 28,        // Can be smaller on desktop
      
      // Visual
      borderRadius: 6,
      iconStrokeWidth: 2,     // Medium weight for smaller icons
      
      // Behavior
      showHoverStates: true,
      showLabelsOnButtons: false,  // Icon-only OK on desktop
    },
    compact: { /* smaller values */ },
  },
  vr: {
    comfortable: {
      // Sizing - LARGER
      buttonHeight: 56,
      buttonHeightSm: 44,
      buttonHeightLg: 72,
      iconSize: 22,
      iconSizeSm: 18,
      iconSizeLg: 26,
      fontSize: 14,
      fontSizeSm: 12,
      fontSizeLg: 16,
      
      // Spacing - MORE GENEROUS
      gap: 12,
      gapSm: 8,
      gapLg: 16,
      padding: 12,
      
      // Touch - MINIMUM 44px
      touchTarget: 44,        // Minimum for VR interaction
      
      // Visual
      borderRadius: 10,
      iconStrokeWidth: 1.5,   // THINNER strokes for larger icons
      
      // Behavior
      showHoverStates: false, // No hover in VR
      showLabelsOnButtons: true,  // Always show labels
    },
    compact: { /* slightly smaller but still VR-friendly */ },
  },
};
```

### Key VR Adaptations

| Aspect | Desktop | VR | Why |
|--------|---------|-----|-----|
| **Touch targets** | 28px min | 44px min | Controller accuracy |
| **Icon stroke** | 2px | 1.5px | Thinner looks refined at large size |
| **Button labels** | Optional | Always shown | No hover tooltips |
| **Hover states** | Yes | No | No hover in VR |
| **Spacing** | Compact OK | More generous | Easier targeting |
| **Font size** | 10-12px | 12-16px | Readability at distance |
| **Animations** | 150ms | 200ms | Smoother in VR |

### Atom Adaptive Pattern

Every atom follows this pattern:

```jsx
// Example: Button atom
import { useAdaptive } from '@UI/react/context';

const Button = ({ size = 'md', children, ...props }) => {
  const { tokens, isVR } = useAdaptive();
  
  // Get size from tokens based on size prop
  const sizeMap = { sm: 'buttonHeightSm', md: 'buttonHeight', lg: 'buttonHeightLg' };
  const height = tokens[sizeMap[size]];
  const fontSize = tokens[size === 'sm' ? 'fontSizeSm' : size === 'lg' ? 'fontSizeLg' : 'fontSize'];
  const iconSize = tokens[size === 'sm' ? 'iconSizeSm' : size === 'lg' ? 'iconSizeLg' : 'iconSize'];
  
  // VR-specific behavior
  const minHeight = Math.max(height, tokens.touchTarget);
  const showLabel = isVR ? true : !props.iconOnly;
  
  return (
    <button
      style={{
        minHeight,
        fontSize,
        padding: `0 ${tokens.padding}px`,
        borderRadius: tokens.borderRadius,
        // No :hover styles applied when isVR
      }}
      className={isVR ? 'btn--vr' : ''}
    >
      {props.icon && <Icon name={props.icon} size={iconSize} />}
      {showLabel && children}
    </button>
  );
};
```

### CSS Adaptive Variables

Atoms can also expose CSS custom properties for styling:

```scss
// Button.scss
.btn {
  min-height: var(--adaptive-button-height);
  font-size: var(--adaptive-font-size);
  padding: 0 var(--adaptive-padding);
  border-radius: var(--adaptive-border-radius);
  gap: var(--adaptive-gap);
  
  // Hover only in desktop mode
  &:not(.btn--vr):hover {
    background: var(--color-bg-hover);
  }
  
  // VR mode adjustments
  &.btn--vr {
    // Always show focus ring (no hover)
    &:focus-visible {
      outline: 2px solid var(--color-accent);
    }
  }
}
```

### Molecule/Organism Layout Adaptations

While atoms handle sizing automatically, molecules and organisms may need layout adjustments:

```jsx
// QuickToolsBar organism
const QuickToolsBar = ({ tools }) => {
  const { isVR, tokens } = useAdaptive();
  
  return (
    <div style={{
      display: 'flex',
      // VR: might switch to column layout for vertical panels
      flexDirection: isVR ? 'column' : 'row',
      gap: tokens.gap,
      padding: tokens.padding,
    }}>
      {tools.map(tool => (
        // ToolButton is already adaptive via its atoms
        <ToolButton key={tool.id} {...tool} />
      ))}
    </div>
  );
};
```

### Storybook Adaptive Testing

Every story should test both modes:

```jsx
// Button.stories.jsx
export default {
  title: 'Atoms/Button',
  component: Button,
  decorators: [
    (Story, context) => (
      <AdaptiveProvider 
        initialMode={context.globals.mode || 'desktop'}
        initialDensity={context.globals.density || 'comfortable'}
      >
        <Story />
      </AdaptiveProvider>
    ),
  ],
};

// Global toolbar for mode switching
export const globalTypes = {
  mode: {
    name: 'Mode',
    defaultValue: 'desktop',
    toolbar: {
      icon: 'mobile',
      items: ['desktop', 'vr'],
    },
  },
  density: {
    name: 'Density',
    defaultValue: 'comfortable',
    toolbar: {
      icon: 'component',
      items: ['comfortable', 'compact'],
    },
  },
};
```

---

## CRITICAL DESIGN REQUIREMENTS

### 1. Navigator Independent Sections
The Navigator panel has TWO truly independent sections that resize separately:

```
┌─────────────────────────────────────────┐
│  NAVIGATOR                       🔗 _ ✕ │
├─────────────────────────────────────────┤
│                                         │
│           TOP SECTION                   │  ← Has own min/max height
│     (minimap, nav, quick tools)         │     User drags to resize
│                                         │
├══════════════════ ↕ ════════════════════┤  ← RESIZE DIVIDER (draggable)
│                                         │
│          BOTTOM SECTION                 │  ← Has own min/max height
│    (size controls, layouts, etc)        │     SCROLLABLE content
│                                         │     Can collapse to just header
└─────────────────────────────────────────┘
```

**NOT just collapsible sections** - these are two independent panes like a split view.

### 2. Icons Only - No Emojis
All indicators must use Icon components:
- ❌ `🔵 Instance` → ✅ `<Icon name="cube" /> Instance`
- ❌ `🌐 Workspace` → ✅ `<Icon name="globe" /> Workspace`

### 3. AdaptiveContext Integration
All components consume `useAdaptive()` hook for Desktop/VR sizing.

---

## ATOMS (Foundational Building Blocks)

**Every atom:**
1. Consumes `useAdaptive()` hook
2. Applies tokens for all sizing (no hardcoded px values)
3. Respects `isVR` for behavior changes (no hover, always show labels)
4. Exposes CSS custom properties via `getAdaptiveCSSVars()`

### Icon
```typescript
interface IconProps {
  name: string;              // From iconRegistry
  size?: number | 'sm' | 'md' | 'lg';  // Number or token key
  color?: string;            // Override currentColor
  strokeWidth?: number;      // Override adaptive default (2 desktop, 1.5 VR)
  className?: string;
}

// Adaptive behavior:
// - size: uses tokens.iconSize[Sm|Lg] if string passed
// - strokeWidth: defaults to tokens.iconStrokeWidth (thinner in VR)
```
**Stories:** All icon names, sizes (sm/md/lg), both modes, stroke weight comparison

### Button
```typescript
interface ButtonProps {
  children?: React.ReactNode;
  icon?: string;             // Icon name (left position)
  iconRight?: string;        // Icon name (right position)
  variant?: 'ghost' | 'filled' | 'outline' | 'primary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  color?: string;            // Accent color
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  iconOnly?: boolean;        // IGNORED in VR - always shows label
  onClick?: () => void;
  title?: string;            // Tooltip (desktop only, VR shows inline)
}

// Adaptive behavior:
// - minHeight: Math.max(tokens.buttonHeight, tokens.touchTarget)
// - fontSize: tokens.fontSize based on size prop
// - iconOnly: forced false in VR (always show labels)
// - :hover styles: disabled in VR mode
// - title/tooltip: shown inline in VR, hover tooltip on desktop
```
**Stories:** All variants × sizes × states × BOTH MODES (desktop/VR side-by-side)

### IconButton
```typescript
interface IconButtonProps {
  icon: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'filled';
  color?: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;            // Required for accessibility
  showLabelInVR?: boolean;   // Default true - shows title as label in VR
}

// Adaptive behavior:
// - dimensions: tokens.buttonHeight (square)
// - enforces tokens.touchTarget minimum
// - VR: can show title as visible label below icon
```
**Stories:** All sizes × variants × VR label visibility

### Toggle
```typescript
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: 'sm' | 'md';
  color?: string;
  disabled?: boolean;
  label?: string;
  labelPosition?: 'left' | 'right';
}

// Adaptive behavior:
// - track/thumb sizes from tokens
// - VR: larger thumb for easier targeting
// - VR: label always visible if provided
```
**Stories:** Checked/unchecked × sizes × both modes

### Slider
```typescript
interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: 'sm' | 'md';
  color?: string;
  disabled?: boolean;
  showValue?: boolean;
  formatValue?: (v: number) => string;
}

// Adaptive behavior:
// - track height: 4px desktop, 8px VR
// - thumb size: 14px desktop, 24px VR (touch target)
// - VR: value always shown (no hover preview)
```
**Stories:** Various ranges, both modes, disabled

### Badge
```typescript
interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  size?: 'sm' | 'md';
  variant?: 'filled' | 'outline';
}

// Adaptive behavior:
// - padding/fontSize from tokens
// - minimum height for touch if interactive
```
**Stories:** All colors, sizes, variants, both modes

### ColorDot
```typescript
interface ColorDotProps {
  color: string;
  size?: number | 'sm' | 'md' | 'lg';  // Or use adaptive sizes
  glow?: boolean;
  border?: boolean;
}

// Adaptive behavior:
// - size scales with mode (8/10/12 desktop, 10/14/18 VR)
```
**Stories:** Various colors, sizes, glow states

### Input
```typescript
interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'number' | 'search';
  size?: 'sm' | 'md';
  disabled?: boolean;
  error?: boolean;
  icon?: string;
  clearable?: boolean;
}

// Adaptive behavior:
// - height: tokens.inputHeight (44px min in VR)
// - fontSize: tokens.fontSize
// - VR: larger clear button, voice input option
```
**Stories:** All types, sizes, states, both modes

### Tooltip
```typescript
interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  showInVR?: 'never' | 'always' | 'on-focus';  // Default 'never'
}

// Adaptive behavior:
// - Desktop: shows on hover after delay
// - VR: typically hidden (info shown inline instead)
// - VR with showInVR='always': renders as persistent label
```
**Stories:** All positions, VR visibility options

### Spinner
```typescript
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

// Adaptive behavior:
// - size from tokens (larger in VR for visibility)
```
**Stories:** All sizes, both modes

### Divider
```typescript
interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'sm' | 'md' | 'lg';
}

// Adaptive behavior:
// - spacing from tokens.gap variants
```
**Stories:** Both orientations, all spacings

### Text (Typography)
```typescript
interface TextProps {
  children: React.ReactNode;
  variant?: 'label' | 'body' | 'caption' | 'title' | 'mono';
  color?: 'primary' | 'secondary' | 'muted' | 'accent';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  size?: 'sm' | 'md' | 'lg';  // Overrides variant default
  uppercase?: boolean;
}

// Adaptive behavior:
// - all font sizes from tokens
// - VR: minimum 12px for readability
```
**Stories:** All variants × colors × weights × both modes

---

## MOLECULES (Composed from Atoms)

**Molecules inherit adaptiveness from their atoms.** Additional molecule-level adaptations are only needed for:
- Layout changes (row → column in VR)
- Spacing adjustments between composed atoms
- VR-specific interaction patterns

### SectionHeader
```typescript
interface SectionHeaderProps {
  title: string;
  expanded?: boolean;
  onToggle?: () => void;
  collapsible?: boolean;
  badge?: string;
  color?: string;
  actions?: React.ReactNode;
}

// Composed of: Icon (chevron), Text
// Adaptive: Layout spacing from tokens, touch target for toggle
```
**Stories:** Expanded/collapsed, with/without badge, with actions, both modes

### QuickJumpBar
```typescript
interface QuickJumpSection {
  id: string;
  label: string;
  color?: string;
}
interface QuickJumpBarProps {
  sections: QuickJumpSection[];
  activeSection: string;
  onJump: (sectionId: string) => void;
}

// Composed of: Button (multiple)
// Adaptive: Buttons are adaptive, bar adds scrollable horizontal layout
// VR: May show fewer items with scroll indicators
```
**Stories:** Various section counts, active states, both modes

### ToolButton
```typescript
interface ToolButtonProps {
  icon: string;
  label: string;
  active?: boolean;
  disabled?: boolean;
  color?: string;
  onClick?: () => void;
}

// Composed of: Icon, Text (in Button-like container)
// Adaptive: Icon + Text both adaptive, container uses tokens.gap
// VR: Always shows label (inherited from atom behavior)
```
**Stories:** Active/inactive, disabled, both modes

### OverlayToggle
```typescript
interface OverlayToggleProps {
  icon: string;
  label: string;
  active: boolean;
  onChange: (active: boolean) => void;
}

// Composed of: Icon, Text, ColorDot
// Adaptive: All atoms adaptive, layout uses tokens.gap
```
**Stories:** Active/inactive states, both modes

### NumberStepper
```typescript
interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  color?: string;
  label?: string;
}

// Composed of: IconButton (2), Text
// Adaptive: Buttons ensure touch targets, text uses adaptive fontSize
// VR: Larger buttons, may add long-press for rapid increment
```
**Stories:** Various values, with/without label, at min/max, both modes

### SearchField
```typescript
interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
  onVoiceInput?: () => void;  // VR: voice search option
}

// Composed of: Input, Icon, IconButton (clear)
// Adaptive: Input is adaptive
// VR: Shows voice input button alongside clear
```
**Stories:** Empty, with value, focused, VR with voice button

### ScopeToggle
```typescript
interface ScopeToggleProps {
  value: 'instance' | 'workspace';
  onChange: (value: 'instance' | 'workspace') => void;
}

// Composed of: Segmented Button group, Icon (cube for instance, globe for workspace)
// NO EMOJIS - uses Icon components
// Adaptive: Buttons adaptive, icons use adaptive stroke weight
```
**Stories:** Instance selected, workspace selected, both modes

### DatasetItem
```typescript
interface DatasetItemProps {
  dataset: {
    id: string;
    name: string;
    icon?: string;
    color: string;
    meta?: string;
    badge?: string;
  };
  expanded?: boolean;
  selected?: boolean;
  hasChildren?: boolean;
  level?: number;
  onToggle?: () => void;
  onSelect?: () => void;
}

// Composed of: IconButton (expand), ColorDot, Icon, Text, Badge
// Adaptive: All atoms adaptive, row height enforces touch target
// VR: Larger expand button, more padding
```
**Stories:** Expanded/collapsed, selected, various levels, both modes

### ViewItem
```typescript
interface ViewItemProps {
  view: {
    id: string;
    name: string;
    color: string;
    dataset?: string;
    shared?: boolean;
    locked?: boolean;
  };
  active?: boolean;
  selected?: boolean;
  compact?: boolean;
  onSelect?: () => void;
  onActivate?: () => void;
}

// Composed of: ColorDot, Text, Icon (link, lock)
// Adaptive: All atoms adaptive, row enforces touch target
// VR: compact mode disabled (always show full info)
```
**Stories:** All state combinations, compact mode (desktop only), both modes

### MiniMapCell
```typescript
interface MiniMapCellProps {
  cell: {
    x: number;
    y: number;
    width?: number;
    height?: number;
    view?: { name: string; color: string };
    locked?: boolean;
  };
  cellSize: number;
  selected?: boolean;
  inViewport?: boolean;
  showLabel?: boolean;
  onClick?: () => void;
  onDragStart?: () => void;
}

// Composed of: Icon (lock), Text (label)
// Adaptive: Cell size calculated based on container, icons adaptive
// VR: Larger minimum cell size for interaction
```
**Stories:** Empty, with view, selected, merged, locked, both modes

### NavButtonCluster (D-Pad)
```typescript
interface NavButtonClusterProps {
  onNavigate: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onHome: () => void;
  disabled?: { up?: boolean; down?: boolean; left?: boolean; right?: boolean };
}

// Composed of: IconButton (5 - arrows + home)
// Adaptive: All IconButtons adaptive
// VR: Larger cluster, more spacing between buttons
// VR Alternative: Could support thumbstick input
```
**Stories:** Default, with disabled directions, both modes

### PositionDisplay
```typescript
interface PositionDisplayProps {
  current: { x: number; y: number };
  home: { x: number; y: number };
  color?: string;
}

// Composed of: Icon, Text (monospace), ColorDot
// Adaptive: Text size from tokens
```
**Stories:** Various positions, both modes

### AnnotationToolButton
```typescript
interface AnnotationToolButtonProps {
  tool: 'point' | 'region' | 'measure' | 'angle' | 'text' | 'eraser';
  active?: boolean;
  onClick?: () => void;
}

// Composed of: Icon (tool-specific), Text (label)
// Adaptive: Standard button adaptiveness
// VR: Always shows tool label
```
**Stories:** Each tool type, active state, both modes

---

## ORGANISMS (Complex Functional Units)

**Organisms inherit adaptiveness from molecules/atoms.** Organism-level adaptations typically handle:
- Major layout changes (panel orientations, grid layouts)
- Container-level spacing
- VR-specific interaction patterns (drag handles, gesture areas)

### FloatingPanelHeader
```typescript
interface FloatingPanelHeaderProps {
  title: string;
  icon: string;
  color?: string;
  isLinked?: boolean;
  onLinkToggle?: () => void;
  onMinimize: () => void;
  onClose: () => void;
  onDragStart: (e: MouseEvent | TouchEvent) => void;
  isDragging?: boolean;
}

// Composed of: Icon (grip, panel icon), Text, IconButton (link, minimize, close)
// Adaptive: All composed elements adaptive
// VR: Larger drag handle area, grip icon more prominent
// VR: May show grab gesture hint
```

### TabBar
```typescript
interface Tab {
  id: string;
  label: string;
  icon: string;
}
interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  color?: string;
  orientation?: 'horizontal' | 'vertical';  // VR may prefer vertical
}

// Composed of: Button (multiple)
// Adaptive: Buttons adaptive
// VR: May switch to vertical orientation for better reach
// VR: Larger touch targets, always shows labels
```

### CanvasToolbar
```typescript
interface CanvasToolbarProps {
  activeTool: 'select' | 'move' | 'merge' | 'split';
  onToolChange: (tool: string) => void;
  selectedCellCount: number;
  onAction: (action: 'lock' | 'unlock' | 'copy' | 'delete') => void;
}

// Composed of: IconButton (tools), Divider, IconButton (actions)
// Adaptive: All IconButtons adaptive
// VR: Row layout with more spacing
// VR: May add long-press for tool options
```

### NavigatorMinimap
```typescript
interface NavigatorMinimapProps {
  canvasSize: { cols: number; rows: number };
  viewportSize: { cols: number; rows: number };
  viewportPos: { x: number; y: number };
  cells: MiniMapCell[];
  selectedCells: number[];
  overlays: { grid: boolean; views: boolean; markers: boolean; labels: boolean };
  onCellClick: (index: number) => void;
  onCellDrag: (index: number, newPos: { x: number; y: number }) => void;
  onViewportDrag: (newPos: { x: number; y: number }) => void;
}

// Composed of: MiniMapCell (multiple), viewport indicator div
// Adaptive: Cell sizes scale, minimum cell size enforced in VR
// VR: Larger cells, stronger selection indicators
// VR: Support for controller-based cell selection
```

### DatasetTree
```typescript
interface DatasetTreeProps {
  datasets: Dataset[];
  expandedIds: string[];
  selectedId?: string;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}

// Composed of: DatasetItem (multiple), ViewItem (nested)
// Adaptive: Items adaptive, row heights enforce touch targets
// VR: More padding between items
```

### ViewList
```typescript
interface ViewListProps {
  views: View[];
  activeViewId?: string;
  selectedViewId?: string;
  onSelect: (id: string) => void;
  onActivate: (id: string) => void;
  groupBy?: 'dataset' | 'type' | 'none';
}

// Composed of: SectionHeader, ViewItem (multiple)
// Adaptive: Items adaptive
// VR: Larger row heights, clearer selection states
```

### QuickToolsBar
```typescript
interface QuickToolsBarProps {
  tools: Array<{
    id: string;
    icon: string;
    label: string;
    active?: boolean;
    color?: string;
  }>;
  onToolClick: (id: string) => void;
  orientation?: 'horizontal' | 'vertical';
}

// Composed of: ToolButton (multiple), Divider
// Adaptive: ToolButtons adaptive
// VR: May switch to vertical orientation
// VR: More spacing between tools
```

### SizeControlsPanel
```typescript
interface SizeControlsPanelProps {
  viewportSize: { cols: number; rows: number };
  canvasSize: { cols: number; rows: number };
  onViewportChange: (size: { cols: number; rows: number }) => void;
  onCanvasChange: (size: { cols: number; rows: number }) => void;
}

// Composed of: NumberStepper (4), Text (labels)
// Adaptive: NumberSteppers adaptive
// VR: May use 2-column layout with larger steppers
```

### QuickLayoutsGrid
```typescript
interface QuickLayoutsGridProps {
  layouts: Array<{ id: string; label: string; preview?: React.ReactNode }>;
  activeLayout?: string;
  onSelect: (id: string) => void;
}

// Composed of: Button (multiple)
// Adaptive: Buttons adaptive
// VR: Larger buttons, may show visual previews
```

### TemplateList
```typescript
interface TemplateListProps {
  templates: Array<{ id: string; name: string }>;
  onSelect: (id: string) => void;
  onManage: () => void;
}

// Composed of: SectionHeader, Button/ListItem (template items)
// Adaptive: List items adaptive
```

### AnnotationToolPalette
```typescript
interface AnnotationToolPaletteProps {
  scope: 'instance' | 'workspace';
  onScopeChange: (scope: 'instance' | 'workspace') => void;
  activeTool?: string;
  onToolSelect: (tool: string) => void;
}

// Composed of: ScopeToggle, AnnotationToolButton (multiple)
// Adaptive: All composed elements adaptive
// VR: Grid layout for tools, larger buttons
```

### SplitPaneContainer (CRITICAL)
```typescript
interface SplitPaneContainerProps {
  topContent: React.ReactNode;
  bottomContent: React.ReactNode;
  topMinHeight?: number;
  bottomMinHeight?: number;
  defaultSplit?: number;         // Default split percentage
  bottomCollapsible?: boolean;
  bottomCollapsed?: boolean;
  onBottomToggle?: () => void;
  bottomTitle?: string;
  bottomBadge?: string;
  orientation?: 'vertical' | 'horizontal';
}

// PURPOSE: Enables independent top/bottom resizing for Navigator
// Composed of: Resize handle/divider, SectionHeader (optional collapse bar)
// Adaptive: 
//   - Divider/handle larger in VR for easier grabbing
//   - Minimum pane sizes increase in VR
//   - VR: May support grab gesture for resize
```

---

## TEMPLATES (Full Panel Content)

### NavigatorContent
```typescript
interface NavigatorContentProps {
  // All state managed internally or via context
}
```
**Composed of:**
- SplitPaneContainer (top/bottom)
- Top: OverlayToggle group, CanvasToolbar, NavigatorMinimap, label/zoom controls, NavButtonCluster, PositionDisplay, QuickToolsBar
- Bottom: QuickJumpBar, SizeControlsPanel, QuickLayoutsGrid, TemplateList, settings toggles

### DataBrowserContent
```typescript
interface DataBrowserContentProps {
  // ...
}
```
**Composed of:** TabBar, DatasetTree, file list, upload button

### AnnotationsContent
```typescript
interface AnnotationsContentProps {
  // ...
}
```
**Composed of:** TabBar (Annotations/Cursors), AnnotationToolPalette, recent list

### InstanceToolsContent
```typescript
interface InstanceToolsContentProps {
  // ...
}
```
**Composed of:** Custom tabs bar, NavigationTab, DisplayTab, WidgetsTab, AnnotationsTab, LayersTab

### FloatingPanel
```typescript
interface FloatingPanelProps {
  id: string;
  title: string;
  icon: string;
  color?: string;
  children: React.ReactNode;
  initialPosition?: { x: number; y: number };
  initialSize?: { width: number; height: number };
  minWidth?: number;
  minHeight?: number;
  isLinked?: boolean;
  onLinkToggle?: () => void;
  onClose: () => void;
  zIndex?: number;
  onFocus?: () => void;
}
```
**Composed of:** FloatingPanelHeader, content area, resize handle

---

## STORYBOOK SETUP

### Directory Structure
```
src/stories/
├── atoms/
│   ├── Icon.stories.jsx
│   ├── Button.stories.jsx
│   ├── Toggle.stories.jsx
│   └── ...
├── molecules/
│   ├── SectionHeader.stories.jsx
│   ├── DatasetItem.stories.jsx
│   └── ...
├── organisms/
│   ├── TabBar.stories.jsx
│   ├── NavigatorMinimap.stories.jsx
│   └── ...
└── templates/
    ├── FloatingPanel.stories.jsx
    └── NavigatorContent.stories.jsx
```

### Story Template
```jsx
// Example: atoms/Button.stories.jsx
import { Button } from '@UI/react/components/atoms/Button';

export default {
  title: 'Atoms/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['ghost', 'filled', 'outline', 'primary', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    // ...
  },
};

export const Default = {
  args: {
    children: 'Button',
    variant: 'ghost',
    size: 'md',
  },
};

export const AllVariants = () => (
  <div style={{ display: 'flex', gap: 8 }}>
    <Button variant="ghost">Ghost</Button>
    <Button variant="filled">Filled</Button>
    <Button variant="outline">Outline</Button>
    <Button variant="primary">Primary</Button>
    <Button variant="danger">Danger</Button>
  </div>
);

export const WithIcon = {
  args: {
    children: 'Save',
    icon: 'save',
    variant: 'primary',
  },
};

export const ActiveState = {
  args: {
    children: 'Active',
    active: true,
    color: '#60a5fa',
  },
};
```

---

## IMPLEMENTATION ORDER

### Phase 1: Core Atoms (Foundation)
1. Icon (already exists - enhance with strokeWidth prop)
2. Button (already exists - verify variants)
3. IconButton
4. Toggle
5. ColorDot
6. Badge
7. Text
8. Divider

### Phase 2: Input Atoms
9. Input
10. Slider
11. Tooltip
12. Spinner

### Phase 3: Basic Molecules
13. SectionHeader
14. ToolButton
15. NumberStepper
16. SearchField

### Phase 4: Data Molecules
17. DatasetItem
18. ViewItem
19. MiniMapCell

### Phase 5: Navigation Molecules
20. NavButtonCluster
21. PositionDisplay
22. OverlayToggle
23. QuickJumpBar
24. ScopeToggle

### Phase 6: Core Organisms
25. FloatingPanelHeader
26. TabBar
27. SplitPaneContainer (CRITICAL for Navigator)
28. QuickToolsBar

### Phase 7: Complex Organisms
29. CanvasToolbar
30. NavigatorMinimap
31. DatasetTree
32. SizeControlsPanel
33. AnnotationToolPalette

### Phase 8: Templates
34. FloatingPanel
35. NavigatorContent
36. DataBrowserContent
37. AnnotationsContent

---

## CONTINUATION PROMPT

```
I'm continuing the CIA Web atomic component implementation. This is a VR-FIRST adaptive system where components must work seamlessly in both Desktop and VR modes.

Please search project knowledge for:
1. Floating_Workspace_Atomic_Design_Session_Memory_Log.md
2. Atomic_Component_Decomposition_Spec.md (this document)
3. Adaptive_Components_Design_Session_Memory_Log.md
4. AdaptiveContext.jsx in the codebase

KEY DESIGN REQUIREMENTS (do not lose these):

1. **VR-FIRST ADAPTIVE ARCHITECTURE**
   - Every ATOM consumes useAdaptive() hook
   - All sizing from tokens (no hardcoded px)
   - VR: 44px minimum touch targets
   - VR: Thinner icon strokes (1.5px vs 2px desktop)
   - VR: No hover states, always show labels
   - Molecules/organisms inherit adaptiveness from atoms
   - Stories must test BOTH modes

2. **Navigator has INDEPENDENT TOP/BOTTOM sections**
   - SplitPaneContainer organism with draggable divider
   - NOT just collapsible sections - true independent panes
   - Top: minimap, nav, quick tools (fixed min height)
   - Bottom: size controls, layouts, templates (scrollable)
   - Each section resizes independently

3. **Icons only, NO EMOJIS**
   - ScopeToggle: <Icon name="cube" /> not 🔵
   - All visual indicators use Icon components

4. **"Floating First, Panels for Discovery"**
   - Floating panels = primary workspace (compact)
   - Side panels = discovery + advanced (spacious)
   - Panel duplication supported

ADAPTIVE TOKEN SYSTEM:
```typescript
// Atoms use these tokens
tokens.buttonHeight      // 28px desktop, 56px VR
tokens.touchTarget       // 28px desktop, 44px VR minimum
tokens.iconSize          // 14px desktop, 22px VR
tokens.iconStrokeWidth   // 2px desktop, 1.5px VR
tokens.fontSize          // 11px desktop, 14px VR
tokens.gap               // 8px desktop, 12px VR
tokens.showHoverStates   // true desktop, false VR
tokens.showLabelsOnButtons // false desktop, true VR
```

ATOM PATTERN:
```jsx
const Button = ({ size = 'md', children, ...props }) => {
  const { tokens, isVR } = useAdaptive();
  const height = Math.max(tokens.buttonHeight, tokens.touchTarget);
  const showLabel = isVR ? true : !props.iconOnly;
  // ... applies all sizing from tokens
};
```

CURRENT STATE:
- Design complete with adaptive specs
- Atom breakdown with TypeScript interfaces + adaptive behavior
- Implementation order: 8 phases from atoms to templates
- Existing AdaptiveContext in codebase to build upon

THIS SESSION I WANT TO:
[User specifies: e.g., "Implement adaptive Icon atom with stories" or "Build SplitPaneContainer with adaptive resize handle" or "Review existing atoms and add adaptive behavior"]

Please confirm you understand:
1. Atoms consume useAdaptive() - no hardcoded sizes
2. VR has larger targets but thinner icon strokes  
3. Molecules/organisms inherit adaptiveness automatically
4. Navigator needs SplitPaneContainer for independent sections
5. No emojis - only Icon components

Then proceed with the requested task.
```

---

*Specification created: January 2, 2025*
*Ready for atomic implementation*
