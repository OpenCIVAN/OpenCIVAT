# Icon System

A lightweight, self-contained icon system using [Material Symbols](https://fonts.google.com/icons) SVG paths. No external dependencies, no font loading, instant rendering.

## Features

- **217+ icons** included out of the box
- **Zero runtime dependencies** - pure SVG paths inlined in JavaScript
- **Semantic naming** - use `eye` instead of remembering `visibility`
- **Tree-shakeable** - only imports what you use
- **VR-ready icons** - includes `vrpano`, `view_in_ar`, `spatial_audio`
- **Backwards compatible** - supports both new `<Icon name="...">` and legacy `<IconClose />` patterns

---

## Usage

### Basic Usage (Recommended)

```jsx
import { Icon } from '@UI/react/components/common/Icon';

// Basic usage
<Icon name="settings" />

// With size (pixels)
<Icon name="edit" size={24} />

// With color
<Icon name="delete" color="#ef4444" />

// With className
<Icon name="check" className="text-success" />

// Accessible icon with label
<Icon name="warning" aria-label="Warning" />
```

### Legacy Pattern (Backwards Compatible)

```jsx
import { IconClose, IconSettings, getIconComponent } from '@UI/react/components/common/Icon';

// Named exports
<IconClose size="sm" />
<IconSettings size="lg" color="#60a5fa" />

// Dynamic icon lookup
const MyIcon = getIconComponent('settings');
<MyIcon size={24} />
```

### Size Presets

When using named exports (`IconClose`, etc.), you can use string presets:

| Preset | Size           |
| ------ | -------------- |
| `xs`   | 12px           |
| `sm`   | 16px (default) |
| `md`   | 20px           |
| `lg`   | 24px           |
| `xl`   | 32px           |

```jsx
<IconSettings size="lg" />  // 24px
<Icon name="settings" size={24} />  // equivalent
```

### CSS Classes

```jsx
// Spinning loader
<Icon name="loader" className="cia-icon--spin" />

// Pulsing
<Icon name="dot" className="cia-icon--pulse" />

// Status colors
<Icon name="check" className="cia-icon--success" />
<Icon name="warning" className="cia-icon--warning" />
<Icon name="error" className="cia-icon--error" />
```

---

## Adding New Icons

### Step 1: Find the Icon

1. Go to [fonts.google.com/icons](https://fonts.google.com/icons)
2. Search for the icon you need
3. Click on it and note the **exact name** (e.g., `account_balance`)

### Step 2: Get the SVG Path

**Option A: Download from npm (Recommended)**

```bash
# Install the package temporarily
npm pack @material-symbols/svg-400
tar -xzf material-symbols-svg-400-*.tgz

# Find your icon
cat package/outlined/account_balance.svg
# Look for: d="M200-280v-280h80v280h-80Zm..."

# Clean up
rm -rf package material-symbols-svg-400-*.tgz
```

**Option B: Copy from Google Fonts website**

1. Click the icon on fonts.google.com/icons
2. Click "SVG" download
3. Open the SVG file in a text editor
4. Copy the `d="..."` attribute value from the `<path>` element

### Step 3: Add to iconPaths.js

Open `iconPaths.js` and add your path **alphabetically** or in the appropriate section:

```javascript
export const ICON_PATHS = {
  // ... existing icons ...

  // Add your new icon
  account_balance:
    "M200-280v-280h80v280h-80Zm200 0v-280h80v280h-80Zm220 80H120v-60h60v-300h-60v-60l360-200 360 200v60h-60v300h60v60Zm-500-60h400v-300H180v300Zm200-160Z",

  // ... more icons ...
};
```

### Step 4: (Optional) Add Semantic Alias

If you want a friendlier name, add it to `iconRegistry.js`:

```javascript
export const ICON_REGISTRY = {
  // ... existing mappings ...

  // Add semantic alias
  bank: "account_balance",
  institution: "account_balance",

  // ... more mappings ...
};
```

Now you can use either:

```jsx
<Icon name="account_balance" />  // Material Symbol name
<Icon name="bank" />              // Semantic alias
```

### Step 5: (Optional) Add Named Export

If you need a legacy-style named export, add to `iconComponents.js`:

```javascript
// At the bottom with other exports
export const IconBank = createIconComponent("bank");
export const IconAccountBalance = createIconComponent("account_balance");
```

And export from `index.js`:

```javascript
export {
  // ... existing exports ...
  IconBank,
  IconAccountBalance,
} from "./iconComponents";
```

---

## Quick Reference: Icon Categories

### Navigation

`chevronDown`, `chevronUp`, `chevronLeft`, `chevronRight`, `arrowUp`, `arrowDown`, `arrowLeft`, `arrowRight`, `expand`, `collapse`

### Actions

`add`, `remove`, `close`, `check`, `edit`, `delete`, `save`, `copy`, `paste`, `cut`, `undo`, `redo`, `refresh`, `search`, `filter`, `sort`

### View & Display

`eye`, `eyeOff`, `zoomIn`, `zoomOut`, `fullscreen`, `fullscreenExit`, `maximize`, `minimize`, `fitScreen`

### 3D & Spatial

`box`, `cube`, `layers`, `rotate3d`, `move`, `pan`

### VR & Immersive

`vr`, `vrHeadset`, `glasses`, `spatialAudio`, `gesture`, `controller`

### Tools

`pen`, `brush`, `eraser`, `scissors`, `ruler`, `palette`, `sliders`, `settings`, `tools`, `target`, `crosshair`, `wand`

### Data & Files

`file`, `folder`, `folderOpen`, `database`, `dataset`, `upload`, `download`, `archive`

### Media

`mic`, `micOff`, `video`, `videoOff`, `camera`, `volume`, `volumeOff`, `play`, `pause`, `stop`, `record`, `image`

### Users & Collaboration

`user`, `users`, `userPlus`, `share`, `chat`, `comment`, `send`, `bell`

### Status

`info`, `warning`, `error`, `success`, `help`, `loader`, `dot`

### UI & Layout

`menu`, `moreHorizontal`, `moreVertical`, `grid`, `list`, `dashboard`, `gripHorizontal`, `gripVertical`

---

## File Structure

```
Icon/
├── index.js           # Public exports
├── Icon.jsx           # Main <Icon> component
├── Icon.scss          # Styles
├── iconRegistry.js    # Semantic name → Material Symbol mapping
├── iconPaths.js       # SVG path data (the actual icon shapes)
├── iconComponents.js  # Named exports & getIconComponent()
├── Icon.stories.jsx   # Storybook stories
└── README.md          # This file
```

---

## Technical Details

### ViewBox

All Material Symbols use: `viewBox="0 -960 960 960"`

This is a 960×960 canvas with an inverted Y-axis (negative values go up).

### Path Format

Paths use standard SVG path commands:

- `M` = Move to
- `L` = Line to
- `Q` = Quadratic curve
- `Z` = Close path
- Lowercase = relative coordinates

### Why Inline SVG Paths?

1. **No network requests** - Icons render instantly
2. **No FOUC** - No flash of unstyled content while fonts load
3. **Offline support** - Works without internet
4. **Smaller bundle** - Only include icons you use
5. **Customizable** - Easy to modify colors, sizes, animations

---

## Migration from MUI Icons

If migrating from `@mui/icons-material`:

| MUI Import          | New Import                                 |
| ------------------- | ------------------------------------------ |
| `<CloseIcon />`     | `<Icon name="close" />` or `<IconClose />` |
| `<Settings />`      | `<Icon name="settings" />`                 |
| `<Visibility />`    | `<Icon name="eye" />`                      |
| `<VisibilityOff />` | `<Icon name="eyeOff" />`                   |

The `getIconComponent()` function provides drop-in compatibility:

```jsx
// Old
import { Close } from "@mui/icons-material";

// New
import { getIconComponent } from "@UI/react/components/common/Icon";
const Close = getIconComponent("close");
```

---

## Troubleshooting

### Icon appears as "?" or help icon

The icon name doesn't exist. Check spelling and use `hasIcon()` to verify:

```jsx
import { hasIcon } from "@UI/react/components/common/Icon";
console.log(hasIcon("myIcon")); // false - icon doesn't exist
```

### Icon is wrong size or cut off

Make sure you're not overriding the viewBox. The component handles this automatically.

### Icon color won't change

Icons use `currentColor` by default. Either:

- Set color on parent element: `<span style={{color: 'red'}}><Icon name="check" /></span>`
- Use the color prop: `<Icon name="check" color="red" />`

### Adding icon but it doesn't appear

1. Check the path was added to `iconPaths.js`
2. If using semantic name, check `iconRegistry.js` has the mapping
3. Clear your build cache and rebuild

---

## License

Icon paths are from Google's Material Symbols, licensed under [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0).
