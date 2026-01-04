# Component Style Guide

This guide covers usage patterns for the atomic design component system.

---

## Import Patterns

### Atoms
```jsx
// Individual imports
import { Button, IconButton, Icon } from '@UI/react/components/atoms';
import { Badge, StatusDot, Chip } from '@UI/react/components/atoms';
import { Toggle, Slider, Spinner } from '@UI/react/components/atoms';
import { Divider, Text } from '@UI/react/components/atoms';

// Combined import
import {
    Button, IconButton, Icon, Badge, StatusDot,
    Chip, Toggle, Slider, Divider, Spinner, Text
} from '@UI/react/components/atoms';
```

### Molecules
```jsx
import {
    LabeledButton, TabButton, MenuItem,
    DirectionalButton, ToggleGroup, Section,
    SearchInput, PanelHeader, InfoRow
} from '@UI/react/components/molecules';
```

### Organisms
```jsx
import {
    PropertyPanel, FilterBar, ResizableSections,
    InstanceCard, ToolPanel
} from '@UI/react/components/organisms';
```

---

## Component Usage Patterns

### Buttons

**IconButton** - For toolbar actions
```jsx
<IconButton icon="settings" tooltip="Settings" onClick={handleSettings} />
<IconButton icon="trash2" variant="danger" tooltip="Delete" onClick={handleDelete} />
<IconButton icon="plus" variant="primary" size="lg" />
```

**LabeledButton** - For actions with visible text
```jsx
<LabeledButton icon="save" label="Save" onClick={handleSave} />
<LabeledButton icon="play" label="Run" variant="primary" />
<LabeledButton icon="trash2" label="Delete" variant="danger" />
```

**TabButton** - For navigation tabs
```jsx
<TabButton icon="folder" label="Files" active={tab === 'files'} onClick={() => setTab('files')} />
<TabButton icon="database" label="Datasets" badge={3} onClick={() => setTab('datasets')} />
```

### Status Indicators

**Badge** - For counts and notifications
```jsx
<Badge count={5} />
<Badge count={100} max={99} />  {/* Shows "99+" */}
<Badge dot color="danger" pulse />  {/* Pulsing dot */}
```

**StatusDot** - For user/connection status
```jsx
<StatusDot status="online" />
<StatusDot status="busy" pulse />
<StatusDot status="offline" size="lg" />
```

**Chip** - For tags and filters
```jsx
<Chip label="VTK" color="#3b82f6" />
<Chip label="Selected" selected onClick={handleToggle} />
<Chip label="Remove me" removable onRemove={handleRemove} />
```

### Controls

**Toggle** - For boolean settings
```jsx
<Toggle checked={enabled} onChange={setEnabled} />
<Toggle checked={darkMode} onChange={setDarkMode} label="Dark Mode" />
<Toggle checked={value} label="Left label" labelPosition="left" />
```

**Slider** - For numeric ranges
```jsx
<Slider value={opacity} onChange={setOpacity} min={0} max={1} step={0.1} />
<Slider value={zoom} label="Zoom" showValue min={50} max={200} />
```

**ToggleGroup** - For mutually exclusive options
```jsx
<ToggleGroup
    options={[
        { value: 'grid', icon: 'grid' },
        { value: 'list', icon: 'list' },
    ]}
    value={viewMode}
    onChange={setViewMode}
/>
```

### Menu Items

**MenuItem** - For dropdown/context menus
```jsx
<MenuItem icon="edit" label="Edit" onClick={handleEdit} />
<MenuItem icon="copy" label="Copy" shortcut="⌘C" />
<MenuItem icon="trash2" label="Delete" danger />
<MenuItem icon="check" label="Selected Item" selected />
```

### Sections

**Section** - For collapsible content
```jsx
<Section title="Appearance" icon="palette" collapsible>
    <Toggle label="Show Grid" checked={showGrid} onChange={setShowGrid} />
    <Slider label="Opacity" value={opacity} onChange={setOpacity} />
</Section>
```

**InfoRow** - For label/value display
```jsx
<InfoRow label="File Size" value="2.4 MB" />
<InfoRow label="Type" value="VTK PolyData" icon="box" />
<InfoRow label="Points" value="145,230" mono />
```

---

## Organism Patterns

### PropertyPanel
Property inspector with multiple sections:
```jsx
<PropertyPanel
    title="Object Properties"
    icon="sliders"
    sections={[
        {
            id: 'appearance',
            title: 'Appearance',
            icon: 'palette',
            properties: [
                { id: 'visible', type: 'toggle', label: 'Visible', value: true },
                { id: 'opacity', type: 'slider', label: 'Opacity', value: 0.8, min: 0, max: 1 },
                { id: 'color', type: 'color', label: 'Color', value: '#3b82f6' },
            ],
        },
        {
            id: 'transform',
            title: 'Transform',
            icon: 'move',
            properties: [
                { id: 'scale', type: 'slider', label: 'Scale', value: 1, min: 0.1, max: 3 },
            ],
        },
    ]}
    onChange={(propertyPath, value) => updateProperty(propertyPath, value)}
    onClose={handleClose}
/>
```

### FilterBar
Search and filter toolbar:
```jsx
<FilterBar
    searchValue={search}
    onSearchChange={setSearch}
    searchPlaceholder="Search files..."
    filters={[
        { id: 'vtk', label: 'VTK', icon: 'box', color: '#3b82f6' },
        { id: 'image', label: 'Images', icon: 'image', color: '#22c55e' },
    ]}
    activeFilters={activeFilters}
    onFilterChange={setActiveFilters}
    viewModes={[
        { value: 'grid', icon: 'grid' },
        { value: 'list', icon: 'list' },
    ]}
    activeViewMode={viewMode}
    onViewModeChange={setViewMode}
    onClearAll={() => { setSearch(''); setActiveFilters([]); }}
/>
```

### ResizableSections
Resizable panel sections:
```jsx
<ResizableSections
    sections={[
        {
            id: 'files',
            title: 'Files',
            icon: 'folder',
            defaultExpanded: true,
            content: <FileList />,
        },
        {
            id: 'datasets',
            title: 'Datasets',
            icon: 'database',
            defaultExpanded: true,
            content: <DatasetList />,
        },
    ]}
/>
```

---

## VR Mode Support

All components automatically adapt to VR mode using the `useAdaptive` hook:
- Larger touch targets
- Increased font sizes
- Bigger icons
- More spacing

Components receive VR-specific classes (e.g., `button--vr`) when in VR mode.

---

## Color Conventions

| Usage | Color Variable | Hex |
|-------|----------------|-----|
| Primary | `--color-primary` | `#3b82f6` |
| Success | `--color-success` | `#22c55e` |
| Warning | `--color-warning` | `#f59e0b` |
| Danger | `--color-danger` | `#ef4444` |
| Info | `--color-info` | `#06b6d4` |

---

## Accessibility

All components follow accessibility best practices:
- ARIA roles and labels
- Keyboard navigation (Enter, Space, Escape)
- Focus indicators
- Screen reader support

Example accessible pattern:
```jsx
<IconButton
    icon="close"
    aria-label="Close dialog"
    onClick={onClose}
/>
```

---

## Testing Components

Run tests with:
```bash
npm run test        # Watch mode
npm run test:run    # Single run
npm run test:coverage  # With coverage
```

Example test pattern:
```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Toggle } from './Toggle';

describe('Toggle', () => {
    it('calls onChange when clicked', () => {
        const handleChange = vi.fn();
        render(<Toggle checked={false} onChange={handleChange} />);
        fireEvent.click(screen.getByRole('switch'));
        expect(handleChange).toHaveBeenCalledWith(true);
    });
});
```

---

## Storybook

View all components in Storybook:
```bash
npm run storybook
# Opens at http://localhost:6006
```

Components are organized by atomic level:
- `Atoms/*` - Foundational components
- `Molecules/*` - Composed components
- `Organisms/*` - Complex components
