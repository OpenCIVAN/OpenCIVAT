# Atomic Design System

## Overview

The CIA Web UI uses an atomic design system to reduce duplication, improve consistency, and make the codebase more maintainable.

**Status:** ✅ Migration Complete

---

## Component Structure

```
src/ui/react/components/
├── atoms/          # 20 foundational elements (buttons, icons, badges, etc.)
├── molecules/      # 27 composed components (tab buttons, menu items, etc.)
├── organisms/      # 4 complex components (left panel, right panel, etc.)
├── layout/         # Layout components
├── panels/         # Panel components
├── workspace/      # Workspace components
├── bars/           # Bar components
├── auth/           # Auth components
└── content/        # Content components
```

---

## Import Pattern

```jsx
// Atoms (foundational elements)
import {
  Button, IconButton, Icon, Badge, StatusDot,
  Chip, Toggle, Divider, Spinner, Text
} from '@UI/react/components/atoms';

// Molecules (composed from atoms)
import {
  LabeledButton, TabButton, MenuItem, DirectionalButton,
  ToggleGroup, StatusIndicator, InfoRow, SearchInput, PanelHeader
} from '@UI/react/components/molecules';

// Organisms (complex composed components)
import {
  LeftPanel, RightPanel, ResizableSections
} from '@UI/react/components/organisms';
```

---

## Component Inventory

### Atoms (20 components)
| Component | Description |
|-----------|-------------|
| Badge | Count/status indicator |
| Button | Base button component |
| ButtonGroup | Grouped buttons |
| Chip | Interactive pill/tag |
| ColorDot | Dataset color indicator |
| Divider | Visual separator |
| DropdownPortal | Portal-based dropdown |
| FileStateIndicator | File sync status |
| Icon | Icon renderer |
| IconButton | Icon-only button |
| IconLabel | Icon + text combo |
| IconOverlay | Icon with overlay |
| PresenceIndicator | User presence dot |
| Slider | Range slider |
| Spinner | Loading indicator |
| StatusDot | Status indicator |
| Text | Typography component |
| Thumbnail | Image thumbnail |
| Toggle | Switch control |
| Tooltip | Hover tooltip |
| UserAvatar | User avatar |

### Molecules (27 components)
| Component | Description |
|-----------|-------------|
| CameraGrid | Camera view grid |
| ChipGroup | Group of filter chips |
| DirectionalButton | D-pad navigation button |
| EmptyState | Empty content placeholder |
| FloatingPanelHeader | Floating panel header |
| HeaderSection | Collapsible/dismissible sections |
| InfoRow | Label + value display |
| LabeledButton | Button with label |
| MemberRow | User list item |
| MenuItem | Menu/dropdown item |
| OptionList | Selectable option list |
| PanelHeader | Panel header with actions |
| PillBar | Pill navigation bar |
| SearchBar | Search with suggestions |
| SearchInput | Search input field |
| Section | Collapsible section |
| SegmentedToggle | Segmented button toggle |
| StatusIndicator | Status dot + label |
| SubtabBar | Secondary tab navigation |
| TabButton | Tab/navigation button |
| Tabs | Tab container |
| ThumbnailPreview | Thumbnail with preview |
| Toast | Notification toast |
| ToggleGroup | Mutually exclusive toggles |
| ViewItem | View list item |
| VoiceCommandToggle | Voice command toggle |
| VRButton | VR-optimized button |

### Organisms (4 components)
| Component | Description |
|-----------|-------------|
| LeftPanel | Main left panel container |
| ResizableSections | Resizable section container |
| RightPanel | Main right panel container |
| Toolbar | Main toolbar |

---

## Storybook

All components have Storybook stories for documentation and testing:

```bash
npm run storybook
# Opens at http://localhost:6006
```

Stories are organized by atomic level:
- `Atoms/*` - Foundational components
- `Molecules/*` - Composed components
- `Organisms/*` - Complex components

---

## Migration Summary

All three phases of the atomic design migration are complete:

### Phase 1: Atoms ✅
Created foundational components with VR/desktop adaptive support.

### Phase 2: Molecules ✅
Composed atoms into reusable UI patterns (buttons, menus, toggles).

### Phase 3: Component Migration ✅
Migrated all major components:
- Activity bars (Left/Right) → `TabButton`
- Navigation controls (D-pad, Canvas, Viewport) → `DirectionalButton`
- Panel footers → `LabeledButton`, `IconButton`
- Modal footers → `LabeledButton`
- Context menus → `MenuItem`
- Toggle groups → `ToggleGroup`

### Phase 4: Organisms ✅
Moved complex composed components to organisms folder:
- `LeftPanel` - Main left panel container
- `RightPanel` - Main right panel container
- `ResizableSections` - Resizable section container
- `Toolbar` - Main toolbar

### Phase 5: Storybook Coverage ✅
All 51 components have Storybook stories for documentation.
