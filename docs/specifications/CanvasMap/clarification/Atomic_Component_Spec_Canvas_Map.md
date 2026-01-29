# Atomic Component Specification - Canvas Map

## Overview

This document defines the reusable atomic components identified during the Canvas Map design sessions. Components follow the Atomic Design methodology and should be implemented as shared components in `src/ui/react/components/`.

---

## Design Tokens

```scss
// From theme.scss - all components must use these
$bg-primary: #0a0a0f;
$bg-secondary: #12121a;
$bg-tertiary: #1a1a24;
$bg-glass: rgba(255,255,255,0.03);
$bg-glass-hover: rgba(255,255,255,0.06);
$bg-grid-line: rgba(255,255,255,0.04);

$border-subtle: rgba(255,255,255,0.06);
$border-default: rgba(255,255,255,0.1);

$text-primary: #ffffff;
$text-secondary: rgba(255,255,255,0.7);
$text-muted: rgba(255,255,255,0.4);

$accent-purple: #a855f7;
$accent-blue: #3b82f6;
$accent-cyan: #22d3ee;
$accent-green: #22c55e;
$accent-amber: #f59e0b;
$accent-red: #ef4444;
$accent-teal: #14b8a6;

$text-xs: 10px;
$text-sm: 11px;
$spacing-xs: 4px;
$spacing-sm: 8px;
```

---

## Atoms

### ToolbarButton

Small icon button for toolbars.

**Location:** `src/ui/react/components/atoms/ToolbarButton/`

```typescript
interface ToolbarButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
  active?: boolean;
  activeColor?: string;
  disabled?: boolean;
  title?: string;
  size?: number; // icon size, default 14
}
```

```scss
.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: $text-muted;
  cursor: pointer;
  
  &:hover { background: $bg-glass-hover; }
  &--active {
    background: rgba(var(--active-color), 0.2);
    color: var(--active-color);
  }
}
```

---

### Separator

Vertical/horizontal divider.

```typescript
interface SeparatorProps {
  orientation?: 'vertical' | 'horizontal';
}
```

```scss
.separator {
  &--vertical {
    width: 1px;
    height: 16px;
    margin: 0 4px;
    background: $border-default;
  }
}
```

---

### Badge

Count or status indicator.

```typescript
interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  variant?: 'filled' | 'subtle';
}
```

```scss
.badge {
  padding: 1px 5px;
  border-radius: 8px;
  font-size: 9px;
  font-weight: 600;
  
  &--subtle {
    background: rgba(var(--color), 0.2);
    color: var(--color);
  }
}
```

---

## Molecules

### SearchBar

Input with search icon for filtering.

```typescript
interface SearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}
```

```jsx
<div className="search-bar">
  <Search size={12} />
  <input type="text" placeholder={placeholder} />
</div>
```

```scss
.search-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: $bg-glass;
  border: 1px solid $border-subtle;
  border-radius: 6px;
  margin-bottom: 8px;
  
  input {
    flex: 1;
    border: none;
    background: transparent;
    color: $text-primary;
    font-size: $text-sm;
    outline: none;
  }
}
```

---

### SectionHeader

Section title with icon, count, and optional action.

```typescript
interface SectionHeaderProps {
  title: string;
  icon?: LucideIcon;
  iconColor?: string;
  count?: number;
  action?: React.ReactNode;
}
```

```jsx
<div className="section-header">
  <Icon size={12} style={{ color: iconColor }} />
  <span className="title">{title}</span>
  {count !== undefined && <Badge variant="subtle">{count}</Badge>}
  {action}
</div>
```

```scss
.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  
  .title {
    font-size: $text-xs;
    font-weight: 600;
    color: $text-muted;
    text-transform: uppercase;
    flex: 1;
  }
}
```

---

### FilterChip

Toggleable filter pill.

```typescript
interface FilterChipProps {
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
}
```

```scss
.filter-chip {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  background: $bg-glass;
  color: $text-muted;
  font-size: $text-xs;
  cursor: pointer;
  
  &--active {
    background: $accent-teal;
    color: white;
  }
}
```

---

### ToggleButtonGroup

Segmented toggle control (e.g., VG | View).

```typescript
interface ToggleButtonGroupProps {
  options: Array<{
    id: string;
    label: string;
    icon?: LucideIcon;
    color?: string;
    badge?: number;
  }>;
  value: string;
  onChange: (value: string) => void;
}
```

```scss
.toggle-group {
  display: flex;
  background: $bg-glass;
  border-radius: 4px;
  padding: 2px;
  
  button {
    padding: 4px 6px;
    border: none;
    border-radius: 3px;
    background: transparent;
    color: $text-muted;
    font-size: 9px;
    font-weight: 600;
    cursor: pointer;
    
    &.active {
      background: var(--color);
      color: white;
    }
  }
}
```

---

### LayoutMiniPreview

Tiny pixel-art layout preview (max 18×18px).

```typescript
interface LayoutMiniPreviewProps {
  layoutId: string;
  color: string;
  viewCount: number;
  size?: number; // default 18
}
```

**Implementation:**
- Parse layout to get rows/cols
- Calculate cell positions
- Filled cells (views present) = solid color
- Empty cells = 40% opacity color
- Support merged layouts (1+2, 2+1)

```scss
.layout-preview {
  position: relative;
  flex-shrink: 0;
  
  .cell {
    position: absolute;
    border-radius: 1px;
    
    &.filled { background: var(--color); }
    &.empty { background: rgba(var(--color), 0.4); }
  }
}
```

---

### ActionButton

Button with icon and label.

```typescript
interface ActionButtonProps {
  icon?: LucideIcon;
  label: string;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'danger';
}
```

```scss
.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: none;
  border-radius: 4px;
  background: $bg-glass;
  color: $text-secondary;
  font-size: $text-xs;
  cursor: pointer;
  
  &--primary {
    background: rgba($accent-blue, 0.2);
    color: $accent-blue;
  }
}
```

---

## Organisms

### ListItem (Base)

Base wrapper for list items.

```typescript
interface ListItemProps {
  selected?: boolean;
  selectionColor?: string;
  inactive?: boolean;
  draggable?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  children: React.ReactNode;
}
```

```scss
.list-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  margin-bottom: 4px;
  background: $bg-glass;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  
  &--selected {
    background: rgba(var(--color), 0.15);
    border-color: var(--color);
  }
  
  &--inactive {
    opacity: 0.5;
    cursor: default;
  }
  
  &--draggable {
    cursor: grab;
  }
}
```

---

### VGListItem

ViewGroup list item with layout preview.

```typescript
interface VGListItemProps {
  vg: ViewGroup;
  displayName: string;
  isSelected: boolean;
  isInactive?: boolean;
  formatRangeRef: (row, col, rowSpan, colSpan) => string;
  onClick: () => void;
  onDoubleClick: () => void;
}
```

**Structure:**
```
[LayoutPreview] [Name                ] [A1:B2] [3v] [implicit?] [Restore?]
```

---

### CollaboratorItem

Team member list item.

```typescript
interface CollaboratorItemProps {
  collaborator: Collaborator;
  formatCellRef: (row, col) => string;
  isOffline?: boolean;
  onFollow?: () => void;
}
```

**Structure:**
```
[Avatar] [Name           ] [📡 Live?] [Follow]
         [at C1 / Offline]
```

---

### BookmarkItem

Bookmark list item.

```typescript
interface BookmarkItemProps {
  bookmark: Bookmark;
  formatCellRef: (row, col) => string;
  onClick: () => void;
  onDelete?: () => void;
}
```

**Structure:**
```
[🔖] [Name                      ] [B3]
```

---

### ViewportItem

User viewport list item.

```typescript
interface ViewportItemProps {
  viewport: Viewport;
  isSelected: boolean;
  isPrimary: boolean;
  formatRangeRef: (row, col, rows, cols) => string;
  onClick: () => void;
}
```

**Structure:**
```
[★?] [Name                 ] [A1:B2]
```

---

### ViewCell

Individual view on minimap (View mode).

```typescript
interface ViewCellProps {
  view: FlattenedView;
  cellSize: number;
  isSelected: boolean;
  onClick: () => void;
  formatCellRef: (row, col) => string;
}
```

**Visual:**
- Grid positioned at exactly 1×1 cell
- Color based on view type
- Icon centered
- Name below (if space)
- Hover tooltip with full details

---

### VGBlock

ViewGroup on minimap (VG mode).

```typescript
interface VGBlockProps {
  vg: ViewGroup;
  displayName: string;
  cellSize: number;
  isSelected: boolean;
  isGhosted: boolean;
  showInternals: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}
```

**Visual:**
- Grid positioned spanning rowSpan × colSpan
- Solid border (explicit) or dashed (implicit)
- Name label top
- Internal layout grid (if showInternals)
- Ghosted state for Links mode

---

## File Organization

```
src/ui/react/components/
├── atoms/
│   ├── ToolbarButton/
│   ├── Separator/
│   └── Badge/
├── molecules/
│   ├── SearchBar/
│   ├── SectionHeader/
│   ├── FilterChip/
│   ├── ToggleButtonGroup/
│   ├── ActionButton/
│   └── LayoutMiniPreview/
├── organisms/
│   ├── ListItem/
│   ├── VGListItem/
│   ├── CollaboratorItem/
│   ├── BookmarkItem/
│   ├── ViewportItem/
│   ├── ViewCell/
│   └── VGBlock/
└── index.js  # Re-exports
```

---

## Usage Pattern

```jsx
// Typical list section
<div className="panel-section">
  <SectionHeader 
    title="ViewGroups" 
    icon={Package} 
    iconColor={accentGreen}
    count={vgs.length}
    action={<ToolbarButton icon={Plus} onClick={addVG} />}
  />
  <SearchBar placeholder="Search..." onChange={setSearch} />
  <div className="filter-row">
    <FilterChip label="All" active={filter === 'all'} onClick={() => setFilter('all')} />
    <FilterChip label="Explicit" count={explicitCount} onClick={() => setFilter('explicit')} />
  </div>
  {filteredVGs.map(vg => (
    <VGListItem key={vg.id} vg={vg} {...props} />
  ))}
</div>
```

---

## Implementation Order

1. **Atoms first** - ToolbarButton, Separator, Badge
2. **Molecules** - SearchBar, SectionHeader, FilterChip, ToggleButtonGroup
3. **Special molecules** - LayoutMiniPreview, ActionButton
4. **Organisms** - ListItem base, then specific item types
5. **Minimap components** - ViewCell, VGBlock, indicators

---

## Related Documents

- `Canvas_Map_Claude_Code_Handoff.md` - Full panel implementation spec
- `Canvas_Map_Design_Session_Memory_Log.md` - Design decisions context
