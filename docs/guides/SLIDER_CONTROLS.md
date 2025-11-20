# Slider Controls Implementation Guide

**For Contributors:** This guide shows how to add continuous slider controls to instance toolbars while respecting the capabilities system.

## Quick Start

To add a slider control to a menu:

```javascript
// In your InstanceTypeHandler's getTools() method:

getTools(instanceData) {
  if (!instanceData) return [];
  const instanceId = instanceData.instanceId;
  const tools = [];
  const caps = this._getInstanceCapabilities(instanceData);

  // Get current value with safe default
  const currentValue = caps.hasData
    ? instanceTools.getValue(instanceId)
    : defaultValue;

  tools.push({
    id: "menu-id",
    type: "menu",
    label: "Menu Label",
    options: [
      {
        type: 'slider',
        id: 'slider-id',
        icon: 'icon-name',
        label: 'Slider Label',
        value: currentValue,
        min: 0,
        max: 100,
        step: 1,
        formatValue: (val) => `${val}`,
        presets: [0, 25, 50, 75, 100],
        description: caps.hasData ? 'Normal text' : 'Load data first',
        disabled: !caps.hasData,
        onChange: (value) => {
          if (!caps.hasData) return;
          instanceTools.setValue(instanceId, value);
          this._emitToolsUpdate(instanceId);
        }
      }
    ]
  });

  return tools;
}
```

## The Capabilities Pattern

**Every slider must respect the capabilities system.** This prevents errors and provides clear feedback when features aren't available.

### The 6-Step Pattern

```javascript
getTools(instanceData) {
  // STEP 1: Validate and extract
  if (!instanceData) return [];
  const instanceId = instanceData.instanceId;
  const tools = [];

  // STEP 2: Get capabilities
  const caps = this._getInstanceCapabilities(instanceData);

  // STEP 3: Get value with safe default
  const currentValue = caps.hasData
    ? instanceTools.getValue(instanceId)
    : defaultValue;

  // STEP 4: Check availability (if multiple conditions)
  const isAvailable = caps.hasData && otherCondition;

  // STEP 5: Configure slider
  {
    type: 'slider',
    value: currentValue,
    disabled: !isAvailable,
    description: !caps.hasData
      ? 'Load data first'
      : !otherCondition
        ? 'Switch to X mode'
        : 'Normal description',
    onChange: (value) => {
      // STEP 6: Safety check
      if (!isAvailable) return;
      instanceTools.setValue(instanceId, value);
      this._emitToolsUpdate(instanceId);
    }
  }

  return tools;
}
```

## Common Capabilities

| Capability            | When True          | When False                                           |
| --------------------- | ------------------ | ---------------------------------------------------- |
| `caps.hasData`        | Data is loaded     | No data yet - disable slider, show "Load data first" |
| `caps.canUseClipping` | Geometry available | No geometry - disable clipping controls              |
| `caps.canUseColormap` | Has scalar data    | No scalars - disable colormap controls               |
| `caps.hasGeometry`    | Has mesh/points    | No geometry - disable measurement tools              |

## Example: Opacity Slider

```javascript
// Get current value with safe default
const currentOpacity = caps.hasData
  ? instanceTools.getOpacity(instanceId)
  : 1.0; // 100% opacity when no data

{
  type: 'slider',
  id: 'opacity-slider',
  icon: 'circle',
  label: 'Opacity',
  value: currentOpacity,
  min: 0,
  max: 1,
  step: 0.01,
  formatValue: (val) => `${Math.round(val * 100)}%`,
  presets: [0, 0.25, 0.5, 0.75, 1.0],
  description: caps.hasData
    ? 'Adjust material transparency'
    : 'Load data to adjust opacity',
  disabled: !caps.hasData,
  onChange: (value) => {
    if (!caps.hasData) return; // Safety check
    instanceTools.setOpacity(instanceId, value);
    this._emitToolsUpdate(instanceId);
  }
}
```

## Example: Mode-Dependent Slider

Point size only works in "points" representation mode:

```javascript
// Get current mode
const currentRep = caps.hasData
  ? instanceTools.getRepresentation(instanceId)
  : "surface";

// Get current value
const currentPointSize = caps.hasData
  ? instanceTools.getPointSize(instanceId)
  : 5;

// Check both conditions
const isPointsMode = currentRep === 'points';
const isAvailable = caps.hasData && isPointsMode;

{
  type: 'slider',
  id: 'point-size-slider',
  icon: 'circle',
  label: 'Point Size',
  value: currentPointSize,
  min: 1,
  max: 20,
  step: 0.5,
  formatValue: (val) => `${val.toFixed(1)}px`,
  presets: [1, 5, 10, 15, 20],
  description: !caps.hasData
    ? 'Load data first'
    : !isPointsMode
      ? 'Switch to Points mode to adjust'
      : 'Size of rendered points',
  disabled: !isAvailable,
  onChange: (value) => {
    if (!isAvailable) return;
    instanceTools.setPointSize(instanceId, value);
    this._emitToolsUpdate(instanceId);
  }
}
```

## Example: Conditionally Included Slider

Clipping position only appears when clipping is active:

```javascript
const clipState = instanceTools.getClipState(instanceId);
const isClipping = clipState?.active || false;
const clipPosition = clipState?.position || 50;

options: [
  // Toggle button (always visible)
  {
    id: "clip-toggle",
    label: isClipping ? "Disable" : "Enable",
    disabled: !caps.canUseClipping,
    onClick: () => toggleClipping(),
  },

  { type: "separator" },

  // Position slider (only when active)
  ...(isClipping && caps.canUseClipping
    ? [
        {
          type: "slider",
          id: "clip-position-slider",
          label: "Clip Position",
          value: clipPosition,
          min: 0,
          max: 100,
          step: 1,
          formatValue: (val) => `${val}%`,
          presets: [0, 25, 50, 75, 100],
          description: "Position along clipping axis",
          onChange: (val) => {
            instanceTools.setClipPosition(instanceId, val);
            this._emitToolsUpdate(instanceId);
          },
        },
      ]
    : []),
];
```

## Slider Configuration Options

| Property      | Type     | Required | Description                        |
| ------------- | -------- | -------- | ---------------------------------- |
| `type`        | string   | Yes      | Must be `'slider'`                 |
| `id`          | string   | Yes      | Unique identifier                  |
| `icon`        | string   | Yes      | Icon name (e.g., 'circle', 'move') |
| `label`       | string   | Yes      | Display name                       |
| `value`       | number   | Yes      | Current value                      |
| `min`         | number   | Yes      | Minimum value                      |
| `max`         | number   | Yes      | Maximum value                      |
| `step`        | number   | Yes      | Increment size                     |
| `onChange`    | function | Yes      | Callback: `(value) => {}`          |
| `formatValue` | function | No       | Format display: `(val) => string`  |
| `presets`     | number[] | No       | Tick marks at these values         |
| `description` | string   | No       | Help text below slider             |
| `disabled`    | boolean  | No       | Disable slider (default: false)    |

## Adding Backend Support Methods

If your slider needs new backend methods:

```javascript
// In vtkInstanceTools.js (or equivalent)

/**
 * Get current value
 */
getValue(instanceId) {
  const tools = this.instanceTools.get(instanceId);
  if (!tools) return defaultValue;
  return tools.customProperty || defaultValue;
}

/**
 * Set value
 */
setValue(instanceId, value) {
  const tools = this.instanceTools.get(instanceId);
  if (!tools) return;

  // Store value
  tools.customProperty = value;

  // Apply to renderer
  const { actor } = tools.sceneObjects;
  actor.getProperty().setSomeValue(value);

  // Render
  tools.sceneObjects.renderWindow.render();

  console.log(`✅ Value set to ${value} for instance: ${instanceId}`);
}
```

## Visual States

### Enabled

- Full color, interactive
- Thumb is draggable
- Description shows normal help text

### Disabled (No Data)

- 40% opacity (greyed out)
- Not interactive
- Description: "Load data first"

### Disabled (Wrong Mode)

- 40% opacity (greyed out)
- Not interactive
- Description: "Switch to X mode"

### Not Included

- Slider doesn't render at all
- Used for conditional features

## Combining Slider + Preset Buttons

Users appreciate having both continuous control (slider) and quick presets (buttons):

```javascript
options: [
  // Continuous slider
  {
    type: "slider",
    label: "Opacity",
    value: currentOpacity,
    // ... slider config
  },

  { type: "separator" },

  // Section header
  {
    type: "header",
    label: "Quick Presets",
  },

  // Preset buttons
  {
    id: "opacity-100",
    label: "Opaque",
    active: Math.abs(currentOpacity - 1.0) < 0.01,
    onClick: () => setOpacity(instanceId, 1.0),
  },
  {
    id: "opacity-50",
    label: "Half",
    active: Math.abs(currentOpacity - 0.5) < 0.01,
    onClick: () => setOpacity(instanceId, 0.5),
  },
];
```

## Testing Checklist

Before committing slider changes:

- [ ] Slider shows default value when no data loaded
- [ ] Slider is visually disabled (40% opacity) when capability missing
- [ ] Description explains why disabled or how to enable
- [ ] onChange includes safety check (`if (!caps.hasX) return;`)
- [ ] Dragging slider is smooth (onChange only on mouse up)
- [ ] Values update correctly in backend
- [ ] Renderer updates after value change
- [ ] Toolbar refreshes when capabilities change
- [ ] Multiple sliders don't interfere with each other
- [ ] Keyboard navigation works (tab, arrows)

## Common Mistakes

### ❌ Mistake 1: Calling getter without capability check

```javascript
const value = instanceTools.getValue(instanceId); // Crashes if no data
```

**Fix:**

```javascript
const value = caps.hasData ? instanceTools.getValue(instanceId) : defaultValue;
```

### ❌ Mistake 2: No safety check in onChange

```javascript
onChange: (val) => setValue(instanceId, val); // Still fires when disabled
```

**Fix:**

```javascript
onChange: (val) => {
  if (!caps.hasData) return;
  setValue(instanceId, val);
};
```

### ❌ Mistake 3: Generic disabled message

```javascript
description: "Not available";
```

**Fix:**

```javascript
description: !caps.hasData
  ? "Load data to adjust opacity"
  : "Adjust material transparency";
```

## Architecture Notes

**Separation of Concerns:**

- **Core layer** (VTKInstanceHandler): Returns plain objects with disabled flags
- **UI layer** (InstanceViewport): Interprets objects and renders React components
- **Component layer** (SliderMenuOption): Handles visual appearance and interaction

**Why this matters:**

- Core has zero React dependencies
- Testable in isolation
- Contributors can add sliders without knowing React
- Clean architectural boundaries

## Related Files

- `src/core/instances/types/vtk/VTKInstanceHandler.js` - Tool configuration
- `src/core/instances/types/vtk/vtkInstanceTools.js` - Backend methods
- `src/ui/react/components/workspace/InstanceViewport.jsx` - Rendering
- `src/ui/react/components/workspace/SliderMenuOption.jsx` - Slider component
- `src/ui/react/components/workspace/InstanceViewport.css` - Styling

## Questions?

If you're stuck:

1. Check if your handler uses `_getInstanceCapabilities` (with underscore)
2. Verify you're using `instanceData.instanceId` not `instanceData.id`
3. Make sure onChange includes safety checks
4. Test with and without data loaded

For more examples, see the VTK implementation in `VTKInstanceHandler.js`.
