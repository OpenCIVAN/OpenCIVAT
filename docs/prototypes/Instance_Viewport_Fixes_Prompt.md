# Instance Viewport Fixes - Claude Code Implementation Prompt

**Date:** January 2025  
**Scope:** Fix visual styling issues in InstanceViewport component  
**Priority:** High - These are visual bugs that deviate from approved design spec

---

## Context

The InstanceViewport component was recently updated but has several styling issues that don't match the approved design spec (`final-cell-explorer.jsx` prototype). This prompt addresses those specific fixes.

**Files to modify:**
- `src/ui/react/components/workspace/InstanceViewport/InstanceViewport.scss`
- `src/ui/react/components/workspace/InstanceViewport/InstanceViewport.jsx`
- `src/ui/react/components/workspace/Canvas/CanvasCell/CanvasCell.scss` (if applicable)

**Reference prototype:** `docs/prototypes/final-cell-explorer.jsx`

---

## Fix 1: Focus Outline Using Instance Color

### Problem
The focus/active state uses a low-opacity border and glow, making it hard to see which instance is focused. The spec requires a **solid instance color border** with a subtle glow.

### Current (Wrong)
```scss
&--active,
&:focus-visible {
  border-color: rgba(var(--instance-color-rgb), 0.5);  // 50% opacity - too subtle
  box-shadow:
    0 0 25px rgba(var(--instance-color-rgb), 0.2),
    0 0 10px rgba(var(--instance-color-rgb), 0.15),
    inset 0 0 60px rgba(0, 0, 0, 0.5);
}
```

### Required Fix
```scss
.instance-viewport {
  outline: none;
  border: 1px solid $color-border-default;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  
  // Inactive state - inset shadow for depth
  box-shadow: inset 0 0 60px rgba(0, 0, 0, 0.5);
  
  // Active state - SOLID instance color border + glow
  &--active {
    border-color: var(--instance-color);
    box-shadow: 
      0 0 0 1px var(--instance-color),           // Inner ring for 2px total thickness
      0 0 20px rgba(var(--instance-color-rgb), 0.25),  // Soft outer glow
      inset 0 0 60px rgba(0, 0, 0, 0.5);         // Keep depth shadow
  }
  
  // Focus-visible - 2px solid focus ring + glow (keyboard navigation)
  &:focus-visible {
    border-color: var(--instance-color);
    box-shadow: 
      0 0 0 2px var(--instance-color),           // 2px focus ring
      0 0 15px rgba(var(--instance-color-rgb), 0.3),   // Glow
      inset 0 0 60px rgba(0, 0, 0, 0.5);
  }
  
  // Focus-within (clicking inside, not keyboard) - subtle indication
  &:focus-within:not(&--active) {
    border-color: rgba(var(--instance-color-rgb), 0.6);
    box-shadow: 
      0 0 0 1px rgba(var(--instance-color-rgb), 0.4),
      0 0 12px rgba(var(--instance-color-rgb), 0.15),
      inset 0 0 60px rgba(0, 0, 0, 0.5);
  }
}
```

### Visual Result
- **Inactive:** Subtle gray border
- **Active:** Solid colored border (2px via border + box-shadow)
- **Focus:** Same as active but with slightly larger glow
- **Focus-within:** Subtle colored border when clicking inside

---

## Fix 2: Remove Badge/Pill Styling from Header Label

### Problem
The header label is wrapped in a colored badge with background and border. The spec shows a **plain layout** with just a color dot and neutral text.

### Current (Wrong)
```scss
.instance-viewport__label {
  // Badge styling - REMOVE ALL OF THIS
  background: rgba(var(--instance-color-rgb), 0.12);
  border: 1px solid rgba(var(--instance-color-rgb), 0.25);
  border-radius: $radius-sm;
  padding: 4px 10px;
  
  &:hover {
    background: rgba(var(--instance-color-rgb), 0.18);
    border-color: rgba(var(--instance-color-rgb), 0.35);
  }
}

.instance-viewport__label-text {
  color: var(--instance-color);  // WRONG - should be neutral
}
```

### Required Fix
```scss
// Label container - NO badge styling
.instance-viewport__label {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  
  // Plain - no background, no border, no padding
  background: transparent;
  border: none;
  padding: 0;
  border-radius: 0;
  
  // No hover effect
  &:hover {
    background: transparent;
    border: none;
  }
}

// Color dot - keep the glow
.instance-viewport__label-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--instance-color);
  box-shadow: 0 0 6px var(--instance-color);
  flex-shrink: 0;
}

// Name text - NEUTRAL color, not instance color
.instance-viewport__label-text {
  font-size: $font-size-sm;
  font-weight: $font-weight-regular;
  color: $color-text-secondary;  // Neutral gray
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: font-weight 0.15s ease, color 0.15s ease;
}
```

### Visual Comparison

| Before (Wrong) | After (Correct) |
|----------------|-----------------|
| `[● Brain MRI - Axial]` with blue background | `● Brain MRI - Axial` plain text |
| Text is blue (instance color) | Text is gray (neutral) |
| Has border and padding | No border or padding |

---

## Fix 3: Active State - Bold Name, Not Colored

### Problem
When active, the name should become **bold** but stay **neutral color**. Currently it uses instance color.

### Required Fix
```scss
// Active header state
.instance-viewport__header--active {
  // Name becomes bold and white (not colored)
  .instance-viewport__label-text {
    font-weight: $font-weight-semibold;  // Bold
    color: $color-text-primary;          // White, NOT instance color
  }
  
  // Keep the underline (already implemented correctly)
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--instance-color);
    box-shadow: 0 0 8px var(--instance-color);
  }
}
```

### Visual Result
- **Inactive:** `● Brain MRI - Axial` (gray, regular weight)
- **Active:** `● Brain MRI - Axial` (white, bold) + colored underline

---

## Fix 4: Micro Mode - Hide Name

### Problem
At micro breakpoint (<160px), the name should be hidden. Only the color dot, more button, and close button should be visible.

### Current Layout at Micro
`● Brain MRI... ⋮ ✕` (name truncated but visible)

### Required Layout at Micro
`● ⋮ ✕` (name hidden)

### Required Fix
```scss
.instance-viewport__header--micro {
  min-height: 24px;
  padding: 2px $spacing-xs;
  
  // Hide the name text
  .instance-viewport__label-text {
    display: none;
  }
  
  // Hide these buttons (should already be hidden, but ensure)
  .instance-viewport__header-vr,
  .instance-viewport__header-wrench,
  .instance-viewport__header-expand,
  .instance-viewport__type-icon {
    display: none;
  }
  
  // Reduce dot size slightly for micro
  .instance-viewport__label-dot {
    width: 5px;
    height: 5px;
  }
}
```

---

## Fix 5: Move Type Icon from Header to Viewport

### Problem
The type icon (e.g., box icon for VTK) is currently in the header. Per spec, it should be **removed from the header** and the **orientation cube should render inside the viewport** (handled by the VTK handler).

### Step 1: Remove from Header (InstanceViewport.jsx)

Find and remove the type icon from the HeaderBar component:

```jsx
// REMOVE this from HeaderBar render:
{instanceType && (
  <div className="instance-viewport__type-icon" title={`Type: ${instanceType}`}>
    <TypeIcon size={12} />
  </div>
)}
```

Also remove:
- `instanceType` prop from HeaderBar
- `getInstanceTypeIcon` usage in header
- `fileTypeDisplayInfo` if only used for header icon

### Step 2: Hide via CSS (fallback)

If JSX changes are complex, at minimum hide via CSS:

```scss
// Remove type icon from ALL header modes
.instance-viewport__type-icon {
  display: none !important;
}
```

### Step 3: Add Orientation Cube to Viewport (Future)

The orientation cube should be rendered by the VTK handler inside the viewport content area. This is a separate task but document the requirement:

```jsx
// Future: In VTK handler or InstanceViewport content area
<div className="instance-viewport__orientation-cube">
  {/* VTK orientation widget renders here */}
</div>
```

```scss
.instance-viewport__orientation-cube {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 60px;
  height: 60px;
  z-index: 10;
  pointer-events: auto;
  
  // Can be toggled via Instance Tools > Appearance
  &--hidden {
    display: none;
  }
}
```

---

## Complete SCSS Patch

Apply this patch to `src/ui/react/components/workspace/InstanceViewport/InstanceViewport.scss`:

```scss
// =============================================================================
// INSTANCE VIEWPORT FIXES - January 2025
// =============================================================================

// -----------------------------------------------------------------------------
// FIX 1: Focus/Active outline using solid instance color
// -----------------------------------------------------------------------------

.instance-viewport {
  outline: none;
  border: 1px solid $color-border-default;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  
  // Inactive state
  box-shadow: inset 0 0 60px rgba(0, 0, 0, 0.5);
  
  // Active state - solid border + glow
  &--active {
    border-color: var(--instance-color);
    box-shadow: 
      0 0 0 1px var(--instance-color),
      0 0 20px rgba(var(--instance-color-rgb), 0.25),
      inset 0 0 60px rgba(0, 0, 0, 0.5);
  }
  
  // Focus-visible - 2px ring + glow
  &:focus-visible {
    border-color: var(--instance-color);
    box-shadow: 
      0 0 0 2px var(--instance-color),
      0 0 15px rgba(var(--instance-color-rgb), 0.3),
      inset 0 0 60px rgba(0, 0, 0, 0.5);
  }
  
  // Focus-within - subtle indication
  &:focus-within:not(&--active) {
    border-color: rgba(var(--instance-color-rgb), 0.6);
    box-shadow: 
      0 0 0 1px rgba(var(--instance-color-rgb), 0.4),
      0 0 12px rgba(var(--instance-color-rgb), 0.15),
      inset 0 0 60px rgba(0, 0, 0, 0.5);
  }
}

// -----------------------------------------------------------------------------
// FIX 2: Remove badge styling from label
// -----------------------------------------------------------------------------

.instance-viewport__label {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  
  // NO badge styling
  background: transparent;
  border: none;
  padding: 0;
  border-radius: 0;
  
  &:hover {
    background: transparent;
    border: none;
  }
}

.instance-viewport__label-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--instance-color);
  box-shadow: 0 0 6px var(--instance-color);
  flex-shrink: 0;
}

.instance-viewport__label-text {
  font-size: $font-size-sm;
  font-weight: $font-weight-regular;
  color: $color-text-secondary;  // Neutral, NOT instance color
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: font-weight 0.15s ease, color 0.15s ease;
}

// -----------------------------------------------------------------------------
// FIX 3: Active state - bold name
// -----------------------------------------------------------------------------

.instance-viewport__header--active {
  .instance-viewport__label-text {
    font-weight: $font-weight-semibold;
    color: $color-text-primary;
  }
}

// -----------------------------------------------------------------------------
// FIX 4: Micro mode - hide name
// -----------------------------------------------------------------------------

.instance-viewport__header--micro {
  min-height: 24px;
  padding: 2px $spacing-xs;
  
  .instance-viewport__label-text {
    display: none;
  }
  
  .instance-viewport__label-dot {
    width: 5px;
    height: 5px;
  }
  
  .instance-viewport__header-vr,
  .instance-viewport__header-wrench,
  .instance-viewport__header-expand,
  .instance-viewport__type-icon {
    display: none;
  }
}

// -----------------------------------------------------------------------------
// FIX 5: Remove type icon from header
// -----------------------------------------------------------------------------

.instance-viewport__type-icon {
  display: none;
}

// Future: Orientation cube in viewport
.instance-viewport__orientation-cube {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 60px;
  height: 60px;
  z-index: 10;
  pointer-events: auto;
  
  &--hidden {
    display: none;
  }
}
```

---

## JSX Changes (InstanceViewport.jsx)

### Remove Type Icon from HeaderBar

Find the HeaderBar component and remove these:

1. Remove the `fileTypeDisplayInfo` prop if only used for icon
2. Remove `instanceType` prop 
3. Remove the type icon render block:

```jsx
// DELETE this block from HeaderBar:
{showTypeIcon && (
  <div className="instance-viewport__type-icon" title={`Type: ${typeDisplayName}`}>
    <Icon name={typeIconName} size={12} />
  </div>
)}
```

4. Remove `showTypeIcon` from the breakpoint logic:
```jsx
// DELETE this line:
const showTypeIcon = !['tiny', 'micro'].includes(headerMode);
```

### Update HeaderBar Props

```jsx
// Before
function HeaderBar({
  displayName,
  fileTypeDisplayInfo,  // REMOVE
  instanceColor,
  // ...
})

// After
function HeaderBar({
  displayName,
  instanceColor,
  // ... (no fileTypeDisplayInfo)
})
```

---

## Testing Checklist

After applying fixes, verify:

### Focus States
- [ ] Click on an instance - border is solid instance color
- [ ] Tab to instance with keyboard - 2px solid ring visible
- [ ] Click inside instance content - subtle colored border
- [ ] Border color matches instance's assigned color (blue, green, pink, etc.)

### Header Label
- [ ] Label text is gray (not instance color)
- [ ] No background or border around label area
- [ ] Active instance has bold white text
- [ ] Inactive instance has regular gray text

### Responsive Breakpoints
- [ ] Full (≥450px): All buttons visible, text gray
- [ ] Medium (≥300px): Some buttons hidden, text still visible
- [ ] Micro (<160px): Only dot, more, close visible (NO text)

### Type Icon
- [ ] No type icon visible in header at any size
- [ ] (Future) Orientation cube visible in VTK viewport corner

### Transitions
- [ ] Smooth transition on focus/blur
- [ ] Smooth transition on text weight change (active/inactive)

---

## Files Modified

| File | Changes |
|------|---------|
| `InstanceViewport.scss` | Focus states, label styles, micro mode, type icon hide |
| `InstanceViewport.jsx` | Remove type icon from HeaderBar |
| `CanvasCell.scss` | Apply same label fixes if cold cell header exists |

---

## Related Documentation

- Design spec: `docs/prototypes/final-cell-explorer.jsx`
- Memory log: `Instance_Cell_UI_Design_Session_Memory_Log.md`
- Full implementation prompt: `docs/prototypes/Instance_Tools_Canvas_System_Implementation.md`
