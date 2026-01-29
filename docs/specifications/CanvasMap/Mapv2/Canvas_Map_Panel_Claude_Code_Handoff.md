# Canvas Map Panel - Claude Code Implementation Guide

## Overview

The **Canvas Map Panel** is a floating panel that provides bird's-eye navigation, layout management, link visualization, and team collaboration features for the CIA Web canvas system. It replaces the need for users to manually scroll around large canvases and provides spatial awareness of ViewGroups, collaborators, and relationships.

**Panel Type:** Floating Panel (PanelShell)  
**Chrome Level:** `CHROME_LEVELS.FULL`  
**Location:** `src/ui/react/components/panels/CanvasMapPanel/`

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [File Structure](#2-file-structure)
3. [Component Hierarchy](#3-component-hierarchy)
4. [State Management](#4-state-management)
5. [Data Integration](#5-data-integration)
6. [Implementation Steps](#6-implementation-steps)
7. [Component Specifications](#7-component-specifications)
8. [Styling Guidelines](#8-styling-guidelines)
9. [Keyboard & Accessibility](#9-keyboard--accessibility)
10. [Testing Checklist](#10-testing-checklist)

---

## 1. Architecture Overview

### Panel Modes

The Canvas Map has four primary modes, each with contextual content:

| Mode | Icon | Color | Purpose | Contextual Panel Content |
|------|------|-------|---------|-------------------------|
| Navigate | `Compass` | `#60a5fa` | Move around canvas | Bookmarks list |
| Layout | `LayoutGrid` | `#34d399` | Build and edit canvas | VGs on canvas + Inactive VGs |
| Links | `GitBranch` | `#c084fc` | Manage connections | VG Links / View Links (sub-tabs) |
| Team | `Users` | `#fbbf24` | Presence & cursors | Me / Team (sub-tabs) |

### Key Features

1. **Side Quick Nav Toolbar** - Always-visible navigation shortcuts (Home, Set Home, Fit All, Bookmark)
2. **Companion Panel** - Collapsible Views & Datasets panel for drag-drop
3. **Minimap Panning** - Drag to pan when content exceeds viewport
4. **Cursor Consolidation** - Collaborator cursors managed in Team mode
5. **Responsive sizeMode** - Adapts UI density based on panel width

### Size Modes

```javascript
const sizeMode = useMemo(() => {
  const effectiveWidth = panelWidth - (companionOpen ? companionWidth : 0);
  if (effectiveWidth < 300) return 'compact';
  if (effectiveWidth >= 440) return 'expanded';
  return 'standard';
}, [panelWidth, companionOpen]);
```

| Mode | Width | Behavior |
|------|-------|----------|
| `compact` | <300px | Icons only in tabs, simplified list items, hidden search |
| `standard` | 300-440px | Full mode names, standard list items |
| `expanded` | >440px | All features, comfortable spacing |

---

## 2. File Structure

```
src/ui/react/components/panels/CanvasMapPanel/
├── index.js                          # Public export
├── CanvasMapPanel.jsx                # Main panel component
├── CanvasMapPanel.scss               # Panel styles
├── CanvasMapPanel.logic.js           # Headless hook (state + callbacks)
│
├── components/
│   ├── ModeTabs/
│   │   ├── ModeTabs.jsx              # Navigate/Layout/Links/Team tabs
│   │   └── ModeTabs.scss
│   │
│   ├── Toolbar/
│   │   ├── MapToolbar.jsx            # Zoom, display mode, mode-specific controls
│   │   └── MapToolbar.scss
│   │
│   ├── Minimap/
│   │   ├── Minimap.jsx               # Main minimap container with panning
│   │   ├── Minimap.scss
│   │   ├── MinimapGrid.jsx           # Grid cells background
│   │   ├── VGBlock.jsx               # ViewGroup representation
│   │   ├── ViewCell.jsx              # Individual view cell (View mode)
│   │   ├── ViewportIndicator.jsx     # User viewport rectangle
│   │   ├── CollaboratorIndicator.jsx # Collaborator viewport + avatar
│   │   ├── CursorIndicator.jsx       # Collaborator cursor position
│   │   └── LinkLines.jsx             # SVG link visualization
│   │
│   ├── QuickNavToolbar/
│   │   ├── QuickNavToolbar.jsx       # Side navigation buttons
│   │   └── QuickNavToolbar.scss
│   │
│   ├── CompanionPanel/
│   │   ├── CompanionPanel.jsx        # Views & Datasets sidebar
│   │   ├── CompanionPanel.scss
│   │   ├── ViewListItem.jsx          # Draggable view item
│   │   └── DatasetItem.jsx           # Draggable dataset item
│   │
│   ├── ContextualPanels/
│   │   ├── NavigatePanel.jsx         # Bookmarks list
│   │   ├── LayoutPanel.jsx           # VG list + Inactive VGs
│   │   ├── LinksPanel.jsx            # VG Links / View Links
│   │   └── TeamPanel/
│   │       ├── TeamPanel.jsx         # Container with sub-tabs
│   │       ├── MeSubTab.jsx          # Viewports, Broadcast, Cursor settings
│   │       └── TeamSubTab.jsx        # Collaborator list with cursor toggles
│   │
│   └── shared/
│       ├── VGListItem.jsx            # ViewGroup list item
│       ├── BookmarkItem.jsx          # Bookmark list item
│       ├── CollaboratorItem.jsx      # Collaborator list item
│       ├── ViewportItem.jsx          # Viewport list item
│       ├── LinkItem.jsx              # Link list item
│       ├── LayoutMiniPreview.jsx     # Mini layout grid preview
│       ├── SectionHeader.jsx         # Collapsible section header
│       └── FilterChips.jsx           # Filter chip row
│
├── hooks/
│   ├── useCanvasMapState.js          # Core panel state
│   ├── useMinimapPanning.js          # Panning logic
│   ├── useMinimapCellSize.js         # Responsive cell size calculation
│   └── useMinimapDragDrop.js         # Drag-drop for VG repositioning
│
└── utils/
    ├── gridUtils.js                  # colToLetter, formatCellRef, formatRangeRef
    ├── minimapCalculations.js        # Content size, fit calculations
    └── constants.js                  # Mode definitions, layout configs
```

---

## 3. Component Hierarchy

```
<CanvasMapPanel>                      # PanelShell wrapper
  <ModeTabs />                        # Mode selection (Navigate/Layout/Links/Team)
  <MapToolbar />                      # Zoom, display mode, mode-specific controls
  
  <div className="canvas-map__content">
    <QuickNavToolbar />               # Side toolbar (left or right)
    
    <Minimap>                         # Pannable minimap container
      <MinimapGrid />                 # Background grid cells
      <LinkLines />                   # SVG overlay for links (Links mode)
      {viewGroups.map(vg => 
        <VGBlock />                   # or <ViewCell /> based on displayMode
      )}
      {viewports.map(vp => 
        <ViewportIndicator />
      )}
      {collaborators.map(c => 
        <>
          <CollaboratorIndicator />
          <CursorIndicator />         # Team mode only
        </>
      )}
    </Minimap>
    
    <CompanionPanel />                # Optional: Views & Datasets
  </div>
  
  <ContextualPanel>                   # Mode-specific content
    {mode === 'navigate' && <NavigatePanel />}
    {mode === 'layout' && <LayoutPanel />}
    {mode === 'links' && <LinksPanel />}
    {mode === 'team' && <TeamPanel />}
  </ContextualPanel>
  
  <Footer />                          # Mode description + viewport position
</CanvasMapPanel>
```

---

## 4. State Management

### Local Panel State (useCanvasMapState.js)

```javascript
export const useCanvasMapState = () => {
  // Core state
  const [mapMode, setMapMode] = useState('navigate');
  const [displayMode, setDisplayMode] = useState('vg'); // 'vg' | 'view'
  const [minimapZoom, setMinimapZoom] = useState(100);
  
  // UI toggles
  const [showGridLabels, setShowGridLabels] = useState(true);
  const [showViewports, setShowViewports] = useState(true);
  const [showCollaborators, setShowCollaborators] = useState(true);
  const [showCursors, setShowCursors] = useState(true);
  const [showInternals, setShowInternals] = useState(true);
  
  // Sub-tabs
  const [linksSubTab, setLinksSubTab] = useState('vg'); // 'vg' | 'view'
  const [teamSubTab, setTeamSubTab] = useState('me');   // 'me' | 'team'
  
  // Companion panel
  const [companionOpen, setCompanionOpen] = useState(false);
  
  // User preferences (persisted)
  const [toolbarPosition, setToolbarPosition] = useState('left'); // 'left' | 'right'
  
  // Selection
  const [selectedVGId, setSelectedVGId] = useState(null);
  const [selectedViewportId, setSelectedViewportId] = useState(null);
  const [highlightedLinkId, setHighlightedLinkId] = useState(null);
  const [focusedVGId, setFocusedVGId] = useState(null); // For drill-in
  
  // Search/filter
  const [searchQuery, setSearchQuery] = useState('');
  
  // Section collapse
  const [inactiveCollapsed, setInactiveCollapsed] = useState(true);
  
  // Panning state
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  
  return {
    // ... all state and setters
    // ... derived values
    // ... handlers
  };
};
```

### Y.js Shared State (from existing hooks)

```javascript
// From useViewGroups or similar
const viewGroups = useYViewGroups();           // ViewGroup positions, layouts, views
const inactiveViewGroups = useYInactiveVGs();  // VGs removed from canvas

// From useCanvas
const canvasConfig = useCanvasConfig();        // rows, cols, homePosition

// From useViewports
const viewports = useViewports();              // User's viewport rectangles

// From useCollaborators
const collaborators = useCollaborators();      // Presence, viewports, cursors

// From useBookmarks
const bookmarks = useBookmarks();              // Saved positions

// From useLinks
const vgLinks = useVGLinks();                  // ViewGroup-level links
const viewLinks = useViewLinks();              // View-level links
```

### User Preferences (Persisted)

```javascript
// Store in userSettings (localStorage or server)
{
  canvasMap: {
    toolbarPosition: 'left' | 'right',
    defaultMode: 'navigate',
    showGridLabels: true,
    minimapZoom: 100,
  }
}
```

---

## 5. Data Integration

### ViewGroup Data Shape

```typescript
interface ViewGroup {
  id: string;
  name: string | null;           // null for implicit VGs
  color: string;
  isExplicit: boolean;
  layoutId: string;              // 'single' | 'side-by-side' | '2x2' | etc.
  position: {
    row: number;
    col: number;
    rowSpan: number;
    colSpan: number;
  } | null;                      // null if inactive
  views: View[];
}

interface View {
  id: string;
  type: 'volume' | 'slice' | 'data' | 'chart' | 'notes' | ...;
  name: string;
  datasetId?: string;
}
```

### Collaborator Data Shape

```typescript
interface Collaborator {
  id: string;
  name: string;
  avatar: string;                // Emoji or URL
  color: string;
  isOnline: boolean;
  isBroadcasting: boolean;
  viewport: {
    row: number;
    col: number;
    rows: number;
    cols: number;
  } | null;
  cursor: {
    row: number;                 // Can be fractional for sub-cell position
    col: number;
  } | null;
  showCursor: boolean;           // Local toggle (not shared)
}
```

### Link Data Shape

```typescript
interface VGLink {
  id: string;
  from: string;                  // VG ID
  to: string;                    // VG ID
  type: 'camera' | 'filters' | 'widgets' | 'cursors';
  mode: 'bidirectional' | 'unidirectional';
}

interface ViewLink {
  id: string;
  views: string[];               // Array of View IDs
  type: 'camera' | 'windowLevel' | 'crosshairs' | ...;
  mode: 'bidirectional' | 'unidirectional';
}
```

### Canvas Config

```typescript
interface CanvasConfig {
  rows: number;
  cols: number;
  homePosition: { row: number; col: number };
}
```

---

## 6. Implementation Steps

### Phase 1: Core Structure (Priority: High)

1. **Create folder structure** as defined in Section 2
2. **Implement `constants.js`** with mode definitions, layout configs
3. **Implement `gridUtils.js`** with cell reference functions
4. **Create `CanvasMapPanel.jsx`** shell with PanelShell wrapper
5. **Implement `ModeTabs.jsx`** with mode switching
6. **Create basic `Minimap.jsx`** without panning

### Phase 2: Minimap Components (Priority: High)

7. **Implement `MinimapGrid.jsx`** - background grid cells
8. **Implement `VGBlock.jsx`** - ViewGroup rectangles with labels
9. **Implement `ViewportIndicator.jsx`** - user viewport overlay
10. **Implement `CollaboratorIndicator.jsx`** - collaborator viewports
11. **Add grid labels** (A, B, C... and 1, 2, 3...)

### Phase 3: Toolbar & Quick Nav (Priority: High)

12. **Implement `MapToolbar.jsx`** - zoom, display mode, toggles
13. **Implement `QuickNavToolbar.jsx`** - side navigation buttons
14. **Add toolbar position preference** (left/right)

### Phase 4: Contextual Panels (Priority: Medium)

15. **Implement `NavigatePanel.jsx`** - bookmarks list
16. **Implement `LayoutPanel.jsx`** - VG list with inactive section
17. **Implement `LinksPanel.jsx`** - VG/View links with sub-tabs
18. **Implement `TeamPanel.jsx`** - Me/Team sub-tabs

### Phase 5: Advanced Features (Priority: Medium)

19. **Implement `useMinimapPanning.js`** - drag to pan
20. **Implement `LinkLines.jsx`** - SVG link visualization
21. **Implement `CursorIndicator.jsx`** - collaborator cursors
22. **Implement `CompanionPanel.jsx`** - Views & Datasets

### Phase 6: Interactions (Priority: Medium)

23. **VG selection** - click to select, highlight in list
24. **VG drill-in** - double-click to focus/edit
25. **Viewport click-to-navigate** - click minimap to move viewport
26. **Link highlighting** - click link to highlight connected VGs

### Phase 7: Drag-Drop (Priority: Lower)

27. **VG repositioning** - drag VG blocks on minimap
28. **View/Dataset drop** - drag from companion to minimap
29. **VG reordering** - drag in list to reorder

### Phase 8: Polish (Priority: Lower)

30. **Keyboard navigation** - arrow keys, shortcuts
31. **Responsive refinements** - sizeMode edge cases
32. **Animation/transitions** - smooth state changes
33. **Accessibility** - ARIA labels, focus management

---

## 7. Component Specifications

### 7.1 ModeTabs

```jsx
// ModeTabs.jsx
const ModeTabs = ({ mode, onModeChange, isCompact }) => {
  const modes = Object.values(MAP_MODES);
  
  return (
    <div className="map-mode-tabs">
      {modes.map(m => (
        <button
          key={m.id}
          className={cn('map-mode-tabs__tab', { active: mode === m.id })}
          onClick={() => onModeChange(m.id)}
          title={m.description}
          style={{ '--mode-color': m.color }}
        >
          <m.icon size={isCompact ? 14 : 16} />
          {!isCompact && <span>{m.name}</span>}
        </button>
      ))}
    </div>
  );
};
```

### 7.2 Minimap with Panning

```jsx
// Minimap.jsx
const Minimap = ({ 
  children, 
  contentWidth, 
  contentHeight,
  containerWidth,
  containerHeight,
}) => {
  const {
    panOffset,
    isPanning,
    canPan,
    handlers,
    edgeIndicators,
  } = useMinimapPanning({
    contentWidth,
    contentHeight,
    containerWidth,
    containerHeight,
  });
  
  return (
    <div 
      className={cn('minimap', { 'minimap--panning': isPanning })}
      {...handlers}
    >
      <div 
        className="minimap__content"
        style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}
      >
        {children}
      </div>
      
      {/* Edge fade indicators */}
      {edgeIndicators.left && <div className="minimap__edge minimap__edge--left" />}
      {edgeIndicators.right && <div className="minimap__edge minimap__edge--right" />}
      {edgeIndicators.top && <div className="minimap__edge minimap__edge--top" />}
      {edgeIndicators.bottom && <div className="minimap__edge minimap__edge--bottom" />}
      
      {/* Pan hint */}
      {canPan && (
        <div className="minimap__pan-hint">
          <Move size={10} /> Drag to pan
        </div>
      )}
    </div>
  );
};
```

### 7.3 VGBlock

```jsx
// VGBlock.jsx
const VGBlock = memo(({ 
  vg, 
  cellSize, 
  isSelected, 
  isGhosted,
  showInternals,
  onClick,
  onDoubleClick,
}) => {
  const gap = 4;
  const position = {
    left: vg.position.col * (cellSize + gap),
    top: vg.position.row * (cellSize + gap),
    width: vg.position.colSpan * cellSize + (vg.position.colSpan - 1) * gap,
    height: vg.position.rowSpan * cellSize + (vg.position.rowSpan - 1) * gap,
  };
  
  const displayName = getVGDisplayName(vg);
  const layout = LAYOUTS[vg.layoutId];
  
  return (
    <div
      className={cn('vg-block', {
        'vg-block--explicit': vg.isExplicit,
        'vg-block--implicit': !vg.isExplicit,
        'vg-block--selected': isSelected,
        'vg-block--ghosted': isGhosted,
      })}
      style={{
        ...position,
        '--vg-color': vg.color,
      }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <span className="vg-block__name">{displayName}</span>
      
      {showInternals && cellSize > 35 && (
        <div 
          className="vg-block__views"
          style={{
            gridTemplateColumns: `repeat(${layout?.cols || 1}, 1fr)`,
            gridTemplateRows: `repeat(${layout?.rows || 1}, 1fr)`,
          }}
        >
          {vg.views.map(view => (
            <div key={view.id} className="vg-block__view-cell">
              {VIEW_TYPES[view.type]?.icon}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
```

### 7.4 QuickNavToolbar

```jsx
// QuickNavToolbar.jsx
const QuickNavToolbar = ({ 
  position, // 'left' | 'right'
  onGoHome,
  onSetHome,
  onFitAll,
  onAddBookmark,
}) => {
  return (
    <div className={cn('quick-nav-toolbar', `quick-nav-toolbar--${position}`)}>
      <ToolbarButton icon={Home} title="Go Home" onClick={onGoHome} />
      <ToolbarButton icon={Crosshair} title="Set Home Here" onClick={onSetHome} />
      <ToolbarButton icon={Scan} title="Fit All" onClick={onFitAll} />
      <Separator />
      <ToolbarButton 
        icon={BookmarkPlus} 
        title="Add Bookmark" 
        onClick={onAddBookmark}
        color="amber"
      />
    </div>
  );
};
```

### 7.5 TeamPanel (Me Sub-tab)

```jsx
// MeSubTab.jsx
const MeSubTab = ({
  viewports,
  selectedViewportId,
  onSelectViewport,
  isBroadcasting,
  onToggleBroadcast,
  cursorVisible,
  onToggleCursorVisible,
  cursorColor,
  onChangeCursorColor,
  isCompact,
}) => {
  const CURSOR_COLORS = [
    tokens.colors.accent.cyan,
    tokens.colors.accent.green,
    tokens.colors.accent.pink,
    tokens.colors.accent.amber,
    tokens.colors.accent.purple,
  ];
  
  return (
    <div className="team-me-tab">
      {/* My Viewports */}
      <SectionHeader 
        title="My Viewports" 
        icon={Frame} 
        color={tokens.colors.accent.teal}
        count={viewports.length}
        action={<ToolbarButton icon={Plus} size={14} />}
      />
      {viewports.map(vp => (
        <ViewportItem 
          key={vp.id}
          viewport={vp}
          isSelected={selectedViewportId === vp.id}
          onClick={() => onSelectViewport(vp.id)}
          isCompact={isCompact}
        />
      ))}
      
      {/* Broadcast */}
      <SectionHeader title="Broadcast" icon={Radio} color={tokens.colors.accent.red} />
      <div className="broadcast-control">
        <span>{isBroadcasting ? 'Broadcasting to team' : 'Not broadcasting'}</span>
        <ToggleSwitch 
          checked={isBroadcasting} 
          onChange={onToggleBroadcast}
          color={tokens.colors.accent.red}
        />
        {isBroadcasting && (
          <div className="broadcast-control__hint">
            <Radio size={10} /> Team can follow your viewport
          </div>
        )}
      </div>
      
      {/* My Cursor */}
      <SectionHeader title="My Cursor" icon={MousePointer2} color={tokens.colors.accent.cyan} />
      <div className="cursor-control">
        <div className="cursor-control__visibility">
          <span>Visible to team</span>
          <ToggleSwitch 
            checked={cursorVisible} 
            onChange={onToggleCursorVisible}
            color={tokens.colors.accent.cyan}
          />
        </div>
        <div className="cursor-control__color">
          <span>Color:</span>
          {CURSOR_COLORS.map(color => (
            <button
              key={color}
              className={cn('cursor-color-btn', { active: cursorColor === color })}
              style={{ background: color }}
              onClick={() => onChangeCursorColor(color)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
```

---

## 8. Styling Guidelines

### SCSS Structure

```scss
// CanvasMapPanel.scss
@use '../../../styles/tokens' as *;
@use '../../../styles/mixins' as *;

.canvas-map-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  
  // Mode tabs
  &__mode-tabs {
    display: flex;
    height: 40px;
    background: $glass-light;
    border-bottom: 1px solid $border-subtle;
  }
  
  // Toolbar
  &__toolbar {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    padding: $spacing-sm;
    height: 40px;
    background: $glass-subtle;
    border-bottom: 1px solid $border-subtle;
  }
  
  // Content area (minimap + companion)
  &__content {
    display: flex;
    flex: 0 0 auto;
    // Height calculated dynamically
  }
  
  // Contextual panel
  &__contextual {
    flex: 1;
    overflow: auto;
    background: $bg-secondary;
    border-top: 1px solid $border-subtle;
  }
  
  // Footer
  &__footer {
    height: 32px;
    padding: 0 $spacing-md;
    display: flex;
    align-items: center;
    background: $glass-subtle;
    border-top: 1px solid $border-subtle;
    font-size: $text-xs;
    color: $text-muted;
  }
}
```

### Design Tokens Reference

```scss
// Colors - UI Chrome (blue-tinted)
$bg-base: #020406;
$bg-primary: #060a12;
$bg-secondary: #0c1220;
$bg-tertiary: #121a2e;

// Colors - Canvas (neutral for data accuracy)
$canvas-bg: #030303;
$canvas-cell: #080808;

// Glass effects
$glass-subtle: rgba(96, 165, 250, 0.03);
$glass-light: rgba(96, 165, 250, 0.05);
$glass-medium: rgba(96, 165, 250, 0.08);
$glass-panel: rgba(8, 14, 24, 0.88);

// Borders
$border-subtle: rgba(255, 255, 255, 0.06);
$border-default: rgba(255, 255, 255, 0.10);

// Mode colors
$mode-navigate: #60a5fa;
$mode-layout: #34d399;
$mode-links: #c084fc;
$mode-team: #fbbf24;

// Accents (Moonlight pastels)
$accent-blue: #60a5fa;
$accent-purple: #c084fc;
$accent-pink: #fb7185;
$accent-amber: #fbbf24;
$accent-green: #34d399;
$accent-teal: #7dd3fc;
$accent-cyan: #22d3ee;
$accent-red: #f87171;
```

---

## 9. Keyboard & Accessibility

### Keyboard Shortcuts

| Key | Action | Context |
|-----|--------|---------|
| `1-4` | Switch modes | Global |
| `Arrow keys` | Navigate minimap | When minimap focused |
| `Home` | Go to home position | Global |
| `+` / `-` | Zoom in/out | Global |
| `F` | Fit all | Global |
| `B` | Add bookmark | Global |
| `V` | Toggle companion panel | Global |
| `Escape` | Exit focused VG | When drilling in |

### ARIA Labels

```jsx
<div 
  role="application"
  aria-label="Canvas Map"
  aria-describedby="canvas-map-desc"
>
  <div id="canvas-map-desc" className="sr-only">
    Navigate the canvas, manage layouts, and collaborate with team members.
    Currently in {mode} mode.
  </div>
  
  <div role="tablist" aria-label="Canvas map modes">
    {modes.map(m => (
      <button
        role="tab"
        aria-selected={mode === m.id}
        aria-controls={`panel-${m.id}`}
      >
        {m.name}
      </button>
    ))}
  </div>
  
  <div 
    role="img" 
    aria-label={`Canvas minimap showing ${viewGroups.length} view groups`}
  >
    {/* Minimap content */}
  </div>
</div>
```

---

## 10. Testing Checklist

### Unit Tests

- [ ] `gridUtils.js` - colToLetter, formatCellRef, formatRangeRef
- [ ] `useMinimapPanning.js` - pan offset calculation, bounds
- [ ] `useMinimapCellSize.js` - responsive sizing
- [ ] `getVGDisplayName` - explicit/implicit naming

### Component Tests

- [ ] ModeTabs - mode switching, active state
- [ ] Minimap - renders VG blocks correctly
- [ ] VGBlock - selection, ghosting, internals display
- [ ] QuickNavToolbar - button actions
- [ ] TeamPanel - sub-tab switching, toggles

### Integration Tests

- [ ] Mode change updates contextual panel
- [ ] VG selection syncs between minimap and list
- [ ] Link highlighting ghosts unrelated VGs
- [ ] Companion panel drag-drop
- [ ] Panning respects bounds

### Visual Tests

- [ ] sizeMode transitions (compact/standard/expanded)
- [ ] Glassmorphism effects render correctly
- [ ] Grid labels align with cells
- [ ] Link lines connect VG centers
- [ ] Edge fade indicators appear when panning available

### Accessibility Tests

- [ ] Keyboard navigation works
- [ ] Screen reader announces mode changes
- [ ] Focus visible on interactive elements
- [ ] Color contrast meets WCAG AA

---

## Appendix A: Grid Utility Functions

```javascript
// gridUtils.js

/**
 * Convert column index to letter (0 -> 'A', 25 -> 'Z', 26 -> 'AA')
 */
export const colToLetter = (col) => {
  let result = '';
  let c = col;
  while (c >= 0) {
    result = String.fromCharCode((c % 26) + 65) + result;
    c = Math.floor(c / 26) - 1;
  }
  return result;
};

/**
 * Format cell reference (row 0, col 0 -> 'A1')
 */
export const formatCellRef = (row, col) => {
  return `${colToLetter(col)}${row + 1}`;
};

/**
 * Format range reference (row 0, col 0, span 2x2 -> 'A1:B2')
 */
export const formatRangeRef = (row, col, rowSpan, colSpan) => {
  const start = formatCellRef(row, col);
  if (rowSpan === 1 && colSpan === 1) return start;
  return `${start}:${formatCellRef(row + rowSpan - 1, col + colSpan - 1)}`;
};

/**
 * Get display name for ViewGroup
 */
export const getVGDisplayName = (vg) => {
  if (vg.isExplicit && vg.name) return vg.name;
  if (vg.views.length === 1) return vg.views[0].name;
  return `Group (${vg.views.length} views)`;
};
```

---

## Appendix B: Constants

```javascript
// constants.js
import { Compass, LayoutGrid, GitBranch, Users } from 'lucide-react';

export const MAP_MODES = {
  navigate: {
    id: 'navigate',
    name: 'Navigate',
    icon: Compass,
    color: '#60a5fa',
    description: 'Move around, find locations',
  },
  layout: {
    id: 'layout',
    name: 'Layout',
    icon: LayoutGrid,
    color: '#34d399',
    description: 'Build and edit canvas',
  },
  links: {
    id: 'links',
    name: 'Links',
    icon: GitBranch,
    color: '#c084fc',
    description: 'Manage connections',
  },
  team: {
    id: 'team',
    name: 'Team',
    icon: Users,
    color: '#fbbf24',
    description: 'Presence & cursors',
  },
};

export const LAYOUTS = {
  'single': { rows: 1, cols: 1, cells: 1 },
  'side-by-side': { rows: 1, cols: 2, cells: 2 },
  'stacked': { rows: 2, cols: 1, cells: 2 },
  '2x2': { rows: 2, cols: 2, cells: 4 },
  '1+2': { rows: 2, cols: 2, cells: 3, merged: 'top' },
  '2+1': { rows: 2, cols: 2, cells: 3, merged: 'right' },
};

export const VIEW_TYPES = {
  volume: { icon: '🧊', color: '#c084fc', name: 'Volume' },
  slice: { icon: '🔲', color: '#60a5fa', name: 'Slice' },
  data: { icon: '📊', color: '#34d399', name: 'Data Table' },
  chart: { icon: '📈', color: '#fbbf24', name: 'Chart' },
  notes: { icon: '📝', color: '#fb7185', name: 'Notes' },
};

export const SIZE_MODE_BREAKPOINTS = {
  compact: 300,
  expanded: 440,
};

export const COMPANION_WIDTH = {
  compact: 140,
  standard: 160,
};

export const MINIMAP_CELL_SIZE = {
  min: 20,
  max: 60,
};
```

---

## Reference Files

- **Prototype:** `/mnt/user-data/outputs/canvas-map-v2-complete.jsx`
- **Session Log:** `Canvas_Map_Panel_Architecture_Clarification.md` (in project)
- **PanelShell:** `src/ui/react/components/panels/PanelShell/`
- **Design Tokens:** `src/ui/react/styles/tokens/`

---

## Questions for Implementation

1. **Y.js Integration:** Which existing hooks provide ViewGroup/Viewport/Collaborator data?
2. **Cursor Broadcasting:** How is cursor position shared via Y.js?
3. **Drag-Drop Library:** Should we use react-dnd or native HTML5 drag-drop?
4. **User Preferences:** Where is userSettings stored (localStorage vs server)?
5. **Canvas Config:** Is there a useCanvasConfig hook or similar?

---

*Document created: January 29, 2026*
*Last updated: January 29, 2026*
*Prototype version: canvas-map-v2-complete.jsx*
