# Adaptive Component System - Implementation Prompt

## Context

I'm building CIA Web, an open-source collaborative immersive analytics platform. We need a **VR-first, desktop-friendly** component system that automatically adapts UI sizing and interaction patterns based on the current mode (Desktop or VR).

**Reference Artifact:** `adaptive-components-explorer.jsx` in project knowledge contains the complete working prototype of all components described below.

**Goal:** Implement production-ready adaptive components that can be used across the application, starting with the Floating Instance Tools panel and eventually extending to all panels (Left Panel, Right Panel, modals, etc.).

---

## Architecture Overview

### ModeContext

A React context that provides mode information to all adaptive components:

```javascript
// src/ui/react/contexts/ModeContext.jsx

const ModeContext = createContext({
  mode: 'desktop',        // 'desktop' | 'vr'
  setMode: () => {},
  sizing: modeSizing.desktop,
  iconWeights,
  isVR: false,
});
```

**Mode Detection:**
- Default to 'desktop'
- Detect VR via WebXR: `navigator.xr?.isSessionSupported('immersive-vr')`
- Allow user override in settings
- Persist preference per-user

### Mode-Specific Sizing Tokens

```javascript
// src/ui/react/components/adaptive/tokens.js

export const iconWeights = {
  thin: 1,
  light: 1.25,
  regular: 1.5,
  medium: 2,
  bold: 2.5,
};

export const modeSizing = {
  desktop: {
    buttonSm: 24,
    buttonMd: 32,
    buttonLg: 40,
    iconSm: 12,
    iconMd: 16,
    iconLg: 20,
    iconWeight: 'medium',     // 2px stroke
    fontSize: { xs: 9, sm: 10, md: 12, lg: 14 },
    spacing: { xs: 4, sm: 6, md: 8, lg: 12 },
    radius: { sm: 4, md: 6, lg: 8 },
    optionHeight: 36,
    sliderHeight: 4,
    sliderThumb: 14,
  },
  vr: {
    buttonSm: 44,
    buttonMd: 56,
    buttonLg: 72,
    iconSm: 18,
    iconMd: 22,
    iconLg: 28,
    iconWeight: 'regular',    // 1.5px stroke (refined at larger sizes)
    fontSize: { xs: 11, sm: 12, md: 14, lg: 16 },
    spacing: { xs: 8, sm: 10, md: 12, lg: 16 },
    radius: { sm: 8, md: 10, lg: 14 },
    optionHeight: 56,
    sliderHeight: 8,
    sliderThumb: 24,
  },
};
```

**Key Insight:** Large touch targets â‰  chunky icons. VR buttons are bigger (56px vs 32px) but icons use *thinner* strokes (1.5px vs 2px) for a refined, professional look.

---

## Components to Implement

### File Structure

```
src/ui/react/components/adaptive/
â”œâ”€â”€ ModeContext.jsx           # Context provider + hook
â”œâ”€â”€ tokens.js                 # Sizing tokens + icon weights
â”œâ”€â”€ Icon/
â”‚   â”œâ”€â”€ Icon.jsx              # Weight-aware icon component
â”‚   â”œâ”€â”€ Icon.scss
â”‚   â””â”€â”€ iconPaths.js          # SVG path definitions
â”œâ”€â”€ AdaptiveButton/
â”‚   â”œâ”€â”€ AdaptiveButton.jsx
â”‚   â”œâ”€â”€ AdaptiveButton.logic.js   # Optional headless hook
â”‚   â””â”€â”€ AdaptiveButton.scss
â”œâ”€â”€ AdaptiveToggle/
â”‚   â”œâ”€â”€ AdaptiveToggle.jsx
â”‚   â””â”€â”€ AdaptiveToggle.scss
â”œâ”€â”€ AdaptiveSlider/
â”‚   â”œâ”€â”€ AdaptiveSlider.jsx
â”‚   â””â”€â”€ AdaptiveSlider.scss
â”œâ”€â”€ AdaptiveSection/
â”‚   â”œâ”€â”€ AdaptiveSection.jsx   # Collapsible section
â”‚   â””â”€â”€ AdaptiveSection.scss
â”œâ”€â”€ AdaptiveOptionList/
â”‚   â”œâ”€â”€ AdaptiveOptionList.jsx
â”‚   â””â”€â”€ AdaptiveOptionList.scss
â”œâ”€â”€ AdaptiveTabs/
â”‚   â”œâ”€â”€ AdaptiveTabs.jsx
â”‚   â””â”€â”€ AdaptiveTabs.scss
â”œâ”€â”€ AdaptiveCameraGrid/
â”‚   â”œâ”€â”€ AdaptiveCameraGrid.jsx
â”‚   â””â”€â”€ AdaptiveCameraGrid.scss
â”œâ”€â”€ AdaptiveZoomControl/
â”‚   â”œâ”€â”€ AdaptiveZoomControl.jsx
â”‚   â””â”€â”€ AdaptiveZoomControl.scss
â”œâ”€â”€ AdaptivePanel/
â”‚   â”œâ”€â”€ AdaptivePanel.jsx     # Draggable floating panel
â”‚   â””â”€â”€ AdaptivePanel.scss
â”œâ”€â”€ InstanceInfoCard/
â”‚   â”œâ”€â”€ InstanceInfoCard.jsx
â”‚   â””â”€â”€ InstanceInfoCard.scss
â”œâ”€â”€ QuickToolsBar/
â”‚   â”œâ”€â”€ QuickToolsBar.jsx
â”‚   â””â”€â”€ QuickToolsBar.scss
â””â”€â”€ index.js                  # Re-exports all components
```

---

## Component Specifications

### 1. Icon (with Weight System)

```jsx
<Icon name="box" />                    // Uses mode default weight
<Icon name="box" weight="light" />     // Explicit weight
<Icon name="box" size={24} />          // Custom size
<Icon name="box" strokeWidth={1.75} /> // Direct override
```

**Weight Priority:** `strokeWidth prop > weight prop > mode default`

**Weights:**
| Weight | Stroke | Use Case |
|--------|--------|----------|
| thin | 1px | Decorative, ultra-refined |
| light | 1.25px | Large icons, airy feel |
| regular | 1.5px | **VR default** |
| medium | 2px | **Desktop default** |
| bold | 2.5px | Emphasis, accessibility |

### 2. AdaptiveButton

```jsx
<AdaptiveButton
  icon="pen"
  label="Annotate"
  active={isActive}
  onClick={handleClick}
  disabled={false}
  color={tokens.accentGreen}
  size="md"              // 'sm' | 'md' | 'lg'
  variant="default"      // 'default' | 'ghost' | 'filled'
  showLabel={true}       // Hide label for icon-only buttons
/>
```

**Sizing:**
| Size | Desktop | VR |
|------|---------|-----|
| sm | 24px | 44px |
| md | 32px | 56px |
| lg | 40px | 72px |

### 3. AdaptiveToggle

```jsx
<AdaptiveToggle
  checked={value}
  onChange={setValue}
  label="Show Grid"
  color={tokens.accentTeal}
/>
```

**Sizing:**
| Property | Desktop | VR |
|----------|---------|-----|
| Track width | 36px | 52px |
| Track height | 18px | 28px |
| Thumb size | 14px | 22px |

### 4. AdaptiveSlider

```jsx
<AdaptiveSlider
  value={opacity}
  onChange={setOpacity}
  min={0}
  max={100}
  label="Opacity"
  showValue={true}
  color={tokens.accentAmber}
/>
```

### 5. AdaptiveOptionList

```jsx
<AdaptiveOptionList
  options={[
    { id: 'surface', label: 'Surface', icon: 'box', description: 'Solid shaded' },
    { id: 'wireframe', label: 'Wireframe', icon: 'box' },
  ]}
  selected={selectedId}
  onSelect={setSelectedId}
  type="icon"            // 'standard' | 'icon' | 'colormap'
  color={tokens.accentBlue}
/>

// For colormaps:
<AdaptiveOptionList
  options={[
    { id: 'viridis', label: 'Viridis', colors: ['#440154', '#21918c', '#fde725'] },
  ]}
  type="colormap"
/>
```

### 6. AdaptiveSection (Collapsible)

```jsx
<AdaptiveSection 
  title="Representation" 
  icon="box" 
  defaultOpen={true}
  color={tokens.accentBlue}
>
  {/* Content */}
</AdaptiveSection>
```

### 7. AdaptiveTabs

```jsx
<AdaptiveTabs
  tabs={[
    { id: 'navigation', label: 'Navigation', icon: 'rotate3d' },
    { id: 'display', label: 'Display', icon: 'eye' },
    { id: 'widgets', label: 'Widgets', icon: 'layers' },
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
  color={tokens.accentBlue}
/>
```

### 8. AdaptiveCameraGrid

Spatial camera preset picker that mirrors the 3D viewing cube:

```
        [Top]
[Left] [Front] [Right] [Back]
       [Bottom]
  [Iso]  [Fit]  [Reset]
```

```jsx
<AdaptiveCameraGrid
  currentView={currentView}
  onSelectView={setCurrentView}
  color={tokens.accentTeal}
/>
```

**Key Feature:** Reserved hint area (always allocated height) that shows:
- "Current: [view]" when not hovering
- Contextual hint when hovering (e.g., "View from above")
- **No layout shift** when hovering

### 9. AdaptiveZoomControl

```jsx
<AdaptiveZoomControl
  value={zoomLevel}
  onChange={setZoomLevel}
  color={tokens.accentTeal}
/>
```

Includes:
- Zoom out/in buttons
- Slider
- Numeric display
- Preset buttons (25%, 50%, 75%, 100%, 150%, 200%, 400%)

### 10. InstanceInfoCard

Self-contained card showing active instance details:

```jsx
<InstanceInfoCard
  instanceName="Brain MRI - Axial View"
  instanceColor={tokens.accentBlue}
  datasetName="brain_scan_001.nii"
  instanceType="VTK Volume"
  isShared={true}
  viewersCount={3}
/>
```

Shows:
- Color dot with glow
- Instance name (truncated if needed)
- Shared indicator with viewer count (ðŸ‘¥ 3)
- Dataset name with icon
- Instance type badge

### 11. QuickToolsBar

Persistent toolbar that spans all tabs:

```jsx
<QuickToolsBar
  activeTools={activeTools}
  onToggleTool={toggleTool}
/>
```

Default tools: Annotate, Measure, Clip, Visibility

### 12. AdaptivePanel

Draggable floating panel container:

```jsx
<AdaptivePanel
  title="Instance Tools"
  instanceName="Brain MRI - Axial"
  instanceColor={tokens.accentBlue}
  datasetName="brain_scan.nii"
  instanceType="VTK Volume"
  isShared={true}
  viewersCount={3}
  position={panelPosition}
  onDrag={setPanelPosition}
  onClose={handleClose}
  onPin={handlePin}
  isPinned={isPinned}
>
  {/* Panel content */}
</AdaptivePanel>
```

**Features:**
- Draggable by header (grip handle)
- Pin button (keeps panel open)
- Close button
- Mode indicator banner
- InstanceInfoCard below header

---

## Floating Instance Tools Panel Layout

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ [â‰¡] Instance Tools      [ðŸ“Œ] [Ã—] â”‚  â† Header (draggable)
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ ðŸ–¥ï¸ Desktop Mode â€¢ Compact layout â”‚  â† Mode indicator
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚ â”‚ â— Brain MRI - Axial   ðŸ‘¥ 3 â”‚   â”‚  â† InstanceInfoCard
â”‚ â”‚ ðŸ—„ï¸ brain_scan.nii â”‚ VTK    â”‚   â”‚
â”‚ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â”‚                                  â”‚
â”‚ â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚ â”‚ Quick â”‚ [âœï¸][ðŸ“][âœ‚ï¸][ðŸ‘ï¸]    â”‚   â”‚  â† QuickToolsBar (persists)
â”‚ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â”‚                                  â”‚
â”‚ [Navigation] [Display] [Widgets] â”‚  â† AdaptiveTabs
â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”‚
â”‚                                  â”‚
â”‚   (Tab content - scrollable)    â”‚
â”‚                                  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Tab Contents:**

| Tab | Contents |
|-----|----------|
| **Navigation** | AdaptiveCameraGrid, AdaptiveZoomControl |
| **Display** | Representation (AdaptiveOptionList), Color Map (AdaptiveOptionList), Appearance (opacity slider, toggles) |
| **Widgets** | Active widget list with status, widget-specific settings |

---

## VR Interaction Model

| Input | Action |
|-------|--------|
| Point + Trigger | Select button/option |
| Grip | Grab and reposition panel |
| B/Y Button | Toggle panel visibility |
| Thumbstick | Scroll if content overflows |

**Key Principle:** No hover-dependent interactions. Everything is click/trigger-based.

---

## Integration Notes

### With Existing Architecture

1. **ModeContext** should wrap the app at a high level (e.g., in `App.jsx`)
2. **Floating Panel** will be rendered at the workspace level, outside individual instances
3. **Instance Tools tab** in Left Panel can use the same adaptive components but may stay at desktop sizing since it's always on the 2D screen
4. **Connect to existing hooks:** `useViewMetadata`, `useInstanceType`, etc.

### Styling

- Use SASS with existing design tokens from `styles/tokens/`
- Component SCSS co-located with components
- Import `theme.scss` for tokens
- No hard-coded colors/spacing - use tokens

### Extending to Other Panels

Once the adaptive component library is built, extend to:
1. Left Panel tabs (Views, Datasets, Instance Tools, Collaboration)
2. Right Panel (annotations, properties)
3. Modals (VR interface, settings)
4. Any future floating panels

---

## Implementation Priority

1. **Phase 1: Core Infrastructure**
   - ModeContext + tokens
   - Icon with weight system
   - AdaptiveButton
   - AdaptiveToggle
   - AdaptiveSlider

2. **Phase 2: Composite Components**
   - AdaptiveOptionList
   - AdaptiveSection
   - AdaptiveTabs
   - QuickToolsBar

3. **Phase 3: Specialized Components**
   - AdaptiveCameraGrid
   - AdaptiveZoomControl
   - InstanceInfoCard

4. **Phase 4: Panel Assembly**
   - AdaptivePanel
   - FloatingInstanceTools (composed from above)
   - Integration with workspace

---

## Testing Checklist

- [ ] All components render correctly in Desktop mode
- [ ] All components render correctly in VR mode
- [ ] Mode switching updates all components
- [ ] Icon weights render correctly at all sizes
- [ ] Touch targets meet VR minimum (44px+)
- [ ] No layout shift on hover (camera grid hint)
- [ ] Panel dragging works smoothly
- [ ] Tab switching preserves quick tools state
- [ ] Scrolling works in tab content area

---

## Reference Files

- **Design Artifact:** `adaptive-components-explorer.jsx` (in project knowledge)
- **Existing Instance Tools:** `src/ui/react/components/workspace/InstanceViewport/InstanceViewport.jsx`
- **Icon Registry:** `src/ui/react/components/workspace/ToolbarIconRegistry.js`
- **Design Tokens:** `src/ui/react/styles/tokens/`
- **Previous Design Session:** `Instance_Cell_UI_Design_Session_Memory_Log.md`

---

## Questions to Resolve During Implementation

1. **Mode persistence:** Store in localStorage, user preferences DB, or session only?
2. **Panel position persistence:** Per-instance, per-workspace, or global?
3. **Accessibility:** Should desktop users be able to opt into VR sizing for larger targets?
4. **Animation:** What transition timing for mode switches? Instant or animated?
