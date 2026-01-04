# Atomic Design Migration Plan

## Overview

This document outlines the strategy for migrating the CIA Web UI to an atomic design system. The goal is to reduce duplication, improve consistency, and make the codebase more maintainable.

**Key Principle:** Old system keeps working until new is verified. Break things in isolation, not production.

---

## Current State Analysis

### Component Structure
```
src/ui/react/components/
├── atoms/          # NEW - To be created
├── molecules/      # NEW - To be created
├── common/         # 40+ components (mix of atoms/molecules/organisms)
├── layout/         # Layout components
├── panels/         # Panel components
├── workspace/      # Workspace components
├── bars/           # Bar components
├── auth/           # Auth components
└── content/        # Content components
```

### Identified Duplication

#### Button Patterns (93 distinct patterns)
| Pattern | Occurrences | Files |
|---------|-------------|-------|
| `canvas-navigator__btn` | 22+ | CanvasNavigator.jsx |
| `instance-toolbar__btn` | 26+ | InstanceViewport.jsx |
| `cop-button` | 11+ | CanvasOperationsPanel.jsx |
| `panel-footer__btn` | 11+ | Multiple panel files |
| `etched-toggle__btn` | 11+ | CanvasSubtab.jsx |
| `viewport-navigator__btn` | 11+ | ViewportNavigator.jsx |
| `dpad-controller__btn` | 5+ | DPadController.jsx |

#### Icon + Text Patterns
| Pattern | Usage | Current Location |
|---------|-------|-----------------|
| Icon + Label | 15+ components | InfoRow, various |
| Icon + Badge | Tab bars, activity | ActivityBar, tabs |
| Icon + Status | State indicators | FileStateIndicator |
| Icon Button | 50+ locations | Inline implementations |

---

## Phase 1: Atoms (Foundational Elements)

### Folder Structure
```
src/ui/react/components/atoms/
├── index.js                    # Barrel export
├── BaseButton/
│   ├── BaseButton.jsx
│   ├── BaseButton.scss
│   └── index.js
├── IconButton/
│   ├── IconButton.jsx
│   ├── IconButton.scss
│   └── index.js
├── IconLabel/
│   ├── IconLabel.jsx
│   ├── IconLabel.scss
│   └── index.js
├── Badge/
│   ├── Badge.jsx
│   ├── Badge.scss
│   └── index.js
├── StatusDot/
│   ├── StatusDot.jsx
│   ├── StatusDot.scss
│   └── index.js
├── Chip/
│   ├── Chip.jsx
│   ├── Chip.scss
│   └── index.js
└── Divider/
    ├── Divider.jsx
    ├── Divider.scss
    └── index.js
```

### Atom Specifications

#### 1. BaseButton
The foundation for ALL buttons in the system.

```jsx
// Props
interface BaseButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'etched';
  size: 'xs' | 'sm' | 'md' | 'lg';
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
  color?: string;           // Accent color override
  fullWidth?: boolean;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  title?: string;
  'aria-label'?: string;
}
```

**Replaces:** 93 button patterns across codebase

#### 2. IconButton
Icon-only button, extends BaseButton.

```jsx
interface IconButtonProps extends Omit<BaseButtonProps, 'children'> {
  icon: string;             // Icon name from registry
  iconSize?: number;        // Override icon size
  tooltip?: string;         // Shows on hover
}
```

**Replaces:** All icon-only button implementations

#### 3. IconLabel
Icon with text label - the most common pairing.

```jsx
interface IconLabelProps {
  icon: string;
  label: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  color?: string;           // Icon color
  subtle?: boolean;         // Muted text
  reverse?: boolean;        // Label before icon
  gap?: number;
}
```

**Replaces:** InfoRow icon patterns, tab labels, menu items

#### 4. Badge
Small status/count indicator.

```jsx
interface BadgeProps {
  count?: number;
  dot?: boolean;            // Just show a dot, no number
  color?: 'default' | 'primary' | 'danger' | 'success' | 'warning';
  max?: number;             // Max before showing "99+"
  pulse?: boolean;          // Animate
}
```

**Replaces:** Tab badges, notification counts

#### 5. StatusDot
Status indicator dot with optional pulse.

```jsx
interface StatusDotProps {
  status: 'online' | 'offline' | 'busy' | 'away' | 'loading';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}
```

**Replaces:** PresenceIndicator dots, status indicators

#### 6. Chip
Small interactive pill/tag.

```jsx
interface ChipProps {
  label: string;
  icon?: string;
  color?: string;
  selected?: boolean;
  removable?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}
```

**Replaces:** Tag chips, filter chips

#### 7. Divider
Visual separator.

```jsx
interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  label?: string;           // Optional centered label
  spacing?: 'none' | 'sm' | 'md' | 'lg';
}
```

**Replaces:** `<hr>`, separator divs, menu dividers

---

## Phase 2: Molecules (Composed from Atoms)

### Folder Structure
```
src/ui/react/components/molecules/
├── index.js
├── LabeledButton/          # IconButton + label text
├── TabButton/              # IconButton + label + badge
├── MenuItem/               # IconLabel + shortcut + action
├── StatusIndicator/        # StatusDot + label
├── InfoRow/                # IconLabel + value
├── ToggleGroup/            # Group of toggle buttons
├── SearchInput/            # Input + icon + clear button
└── PanelHeader/            # Title + actions (existing FloatingPanelHeader)
```

### Molecule Specifications

#### 1. LabeledButton
Button with visible label.

```jsx
interface LabeledButtonProps {
  icon: string;
  label: string;
  active?: boolean;
  accent?: string;
  onClick?: () => void;
}
// Composes: BaseButton + IconLabel
```

**Replaces:** SecondaryFooter buttons, ScratchPad controls

#### 2. TabButton
Tab/navigation button with badge support.

```jsx
interface TabButtonProps {
  icon: string;
  label: string;
  active?: boolean;
  badge?: number;
  badgeColor?: string;
  onClick?: () => void;
}
// Composes: BaseButton + IconLabel + Badge
```

**Replaces:** ActivityBar tabs, panel tabs, COP tabs

#### 3. MenuItem
Dropdown/context menu item.

```jsx
interface MenuItemProps {
  icon?: string;
  label: string;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}
// Composes: IconLabel + text
```

**Replaces:** DropdownMenu items, context menu items

#### 4. DirectionalButton
Navigation button for D-pads and navigators.

```jsx
interface DirectionalButtonProps {
  direction: 'up' | 'down' | 'left' | 'right' | 'center';
  onClick?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  active?: boolean;
}
// Composes: IconButton with directional logic
```

**Replaces:** DPadController buttons, ViewportNavigator buttons, CanvasNavigator buttons

#### 5. ToggleGroup
Mutually exclusive toggle buttons.

```jsx
interface ToggleGroupProps {
  options: Array<{
    value: string;
    icon?: string;
    label?: string;
  }>;
  value: string;
  onChange: (value: string) => void;
  variant?: 'default' | 'etched' | 'segmented';
}
// Composes: BaseButton[]
```

**Replaces:** Segmented controls, mode toggles

---

## Phase 3: Migration Strategy

### Step 1: Create `/atoms` folder with new components
```bash
src/ui/react/components/atoms/
```

### Step 2: Build atoms one-by-one
Priority order:
1. **BaseButton** - Foundation for everything
2. **IconButton** - Most common pattern
3. **IconLabel** - Second most common
4. **Badge** - Needed for tabs
5. **StatusDot** - Status indicators
6. **Chip** - Tags and filters
7. **Divider** - Separators

### Step 3: Build molecules from atoms
Priority order:
1. **TabButton** - Unify all tab implementations
2. **MenuItem** - Unify all menu items
3. **DirectionalButton** - Unify D-pad/navigator buttons
4. **ToggleGroup** - Unify all toggle groups

### Step 4: Replace imports file-by-file
Start with lowest-risk files:
1. Story files (`.stories.jsx`)
2. New components being built
3. Low-traffic utility components
4. High-traffic components (last)

### Step 5: Verify and delete old patterns
- Run full test suite
- Visual regression testing
- Delete old inline implementations

---

## Import Pattern

```jsx
// Old (scattered imports)
import { Button } from '@UI/react/components/common/Button';
import { Icon } from '@UI/react/components/common/Icon';

// New (centralized atoms/molecules)
import { BaseButton, IconButton, IconLabel, Badge } from '@UI/react/components/atoms';
import { TabButton, MenuItem, ToggleGroup } from '@UI/react/components/molecules';
```

---

## Files to Update (By Priority)

### High Duplication (Fix First)
1. `InstanceViewport.jsx` - 26+ button elements
2. `CanvasNavigator.jsx` - 22+ button patterns
3. `CanvasOperationsPanel.jsx` - 10+ cop-button variants
4. `ActivityBar.jsx` - Tab button patterns
5. `SecondaryFooter.jsx` - Labeled icon buttons

### Medium Duplication
6. `ViewportNavigator.jsx` - Navigator buttons
7. `DPadController.jsx` - D-pad buttons
8. `CanvasSubtab.jsx` - Etched toggles
9. Panel footer buttons across all panels

### Low Duplication (Fix Last)
10. Individual panel tabs
11. Context menus
12. One-off button implementations

---

## Success Metrics

- [ ] Reduce button class patterns from 93 to <10
- [ ] All buttons use BaseButton as foundation
- [ ] All icon+label combos use IconLabel
- [ ] Tab bars use TabButton molecule
- [ ] Navigation controls use DirectionalButton
- [ ] Toggle groups use ToggleGroup molecule
- [ ] No inline button styles in component files
- [ ] Storybook has all atoms/molecules documented

---

## Notes

- Keep `common/Icon` as-is - it's already well-structured
- Keep `common/Button` during transition - gradually replace
- New atoms should support VR mode via `useAdaptive` hook
- All atoms should follow accessibility guidelines
- Use CSS custom properties for theming, not inline styles

---

## Migration Progress

### Phase 1: Atoms - COMPLETE
Created atoms with VR support and Storybook stories:
- [x] IconLabel
- [x] Badge
- [x] StatusDot
- [x] ColorDot
- [x] Toggle
- [x] Divider
- [x] Spinner
- [x] Text
- [x] Chip

Re-exported from common/ (already well-designed):
- [x] Button, IconButton, ButtonGroup
- [x] Icon

### Phase 2: Molecules - COMPLETE
Created molecules with VR support and Storybook stories:
- [x] LabeledButton
- [x] TabButton (with color variants)
- [x] MenuItem
- [x] DirectionalButton
- [x] ToggleGroup
- [x] StatusIndicator
- [x] InfoRow
- [x] SearchInput
- [x] PanelHeader

### Phase 3: Migration - COMPLETE

**Status:** Core migration complete. All high-traffic components, panel footers, activity bars, navigation controls, and modal footers have been migrated to use atoms/molecules. Low-priority components can be migrated as encountered during future development.

**Completed migrations:**
- [x] `SecondaryFooter.jsx` - Now uses `LabeledButton` from molecules
- [x] `LeftActivityBar.jsx` - Now uses `TabButton` with `variant="etched"` and `iconOnly`
- [x] `RightActivityBar.jsx` - Now uses `TabButton` with `variant="etched"` and `iconOnly`
- [x] `DPadController.jsx` - Now uses `DirectionalButton` molecule
- [x] `ViewportNavigator.jsx` - Now uses `DirectionalButton` for navigation arrows
- [x] `CanvasNavigator.jsx` - Internal DPad now uses `DirectionalButton` molecule

**Panel footer migrations:**
- [x] `NotesTab.jsx` - Uses `LabeledButton` + `IconButton`
- [x] `DatasetsTab.jsx` - Uses `LabeledButton` + `IconButton`
- [x] `ViewsTab.jsx` - Uses `LabeledButton`
- [x] `PeopleTab.jsx` - Uses `LabeledButton` + `IconButton`
- [x] `AnnotationsTab.jsx` - Uses `LabeledButton`
- [x] `BookmarksFiltersTab.jsx` - Uses `LabeledButton`
- [x] `RecordingsTab.jsx` - Uses `LabeledButton`
- [x] `RoomCard.jsx` - Uses `LabeledButton` + `IconButton`
- [x] `AnnotationsSubtab.jsx` - Uses `LabeledButton`
- [x] `BookmarkEditor.jsx` - Uses `LabeledButton`
- [x] `FilterEditor.jsx` - Uses `LabeledButton`

**TabButton enhancements for activity bars:**
- Added `variant="etched"` - Recessed button style with glow effect when active
- Added `iconOnly` prop - Square button with hidden label
- Added color variants with glow/border CSS variables

**DirectionalButton fixes:**
- Fixed icon names to use camelCase (`chevronUp` instead of `chevron-up`)
- Changed center icon to `home` for consistency with existing D-pads

**High-traffic component migrations:**
- [x] `InstanceViewport.jsx` - GearOnlyDropdown and MoreMenu items now use `MenuItem` molecule
- [x] `CanvasOperationsPanel.jsx` - Control buttons use `IconButton`, imports TabButton molecule
- [x] `TransactionTab.jsx` - Uses `LabeledButton` for toolbar and action buttons
- [x] `AuditLogTab.jsx` - Uses `ToggleGroup` for view/sort toggles
- [x] `SavePointsTab.jsx` - Uses `LabeledButton` for create button

**Modal footer migrations:**
- [x] `RecordingConsentModal.jsx` - Uses `LabeledButton` for Leave/Continue
- [x] `DeleteNoteDialog.jsx` - Uses `LabeledButton` for Cancel/Archive/Delete
- [x] `TransferOwnershipDialog.jsx` - Uses `LabeledButton` for Cancel/Transfer
- [x] `DatasetSettingsModal.jsx` - Uses `LabeledButton` for Create/Unload/Close
- [x] `FileDetailsModal.jsx` - Uses `LabeledButton` for Open/Download/Delete

**Additional component migrations:**
- [x] `NoteEditor.jsx` - Uses `LabeledButton` for Add item/Cancel/Save
- [x] `RecordingCard.jsx` - Uses `IconButton` for playback, `LabeledButton` for actions
- [x] `FiltersSubtab.jsx` - Uses `LabeledButton` for Import/Export/Retry
- [x] `BookmarksSubtab.jsx` - Uses `LabeledButton` for Retry

**Low-priority remaining (migrate as encountered):**
- `ViewSettingsModal.jsx` - Complex multi-section modal with many buttons
- `CanvasSubtab.jsx` - Etched toggle buttons (specialized styling)
- `GridLayoutPreview.jsx` - Layout control buttons
- `VoiceControls.jsx` - Voice/mute controls
- `MessageInput.jsx` - Chat input controls

**Import pattern established:**
```jsx
// Atoms (foundational elements)
import { Icon, IconButton, Badge, StatusDot, Chip } from '@UI/react/components/atoms';

// Molecules (composed from atoms)
import { LabeledButton, TabButton, MenuItem } from '@UI/react/components/molecules';
```
