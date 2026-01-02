# Instance Tools & Canvas System - Claude Code Implementation Prompt

**Version:** 1.0  
**Date:** January 2025  
**Project:** CIA Web - Collaborative Immersive Analytics Platform

---

## Overview

This document provides complete implementation specifications for the Instance Tools and Canvas System components of CIA Web. These are foundational UI components that enable visualization interaction, tool access, and canvas manipulation.

**Key Principle:** This is an open-source collaborative immersive analytics platform. All components must be:
- **Plugin-aware:** Generic components that work with any InstanceTypeHandler (VTK is reference implementation)
- **VR-ready:** Designed for both desktop and VR interaction patterns
- **Contributor-friendly:** Clean architecture that allows extensions without breaking core

---

## Architecture Context

### Three-Layer Data Model
```
Dataset (palette) → ViewConfiguration (easel) → InstanceWindow (canvas cell)
```

- **Dataset:** Raw data loaded from files (server-persisted)
- **ViewConfiguration:** How to visualize data, shareable state (server ID required)
- **InstanceWindow:** Ephemeral GPU renderer in a canvas cell (client ID only)

### Plugin System
Each visualization type implements `InstanceTypeHandler`:
```javascript
interface InstanceTypeHandler {
  getToolbarConfig(): ToolbarConfig;    // Type-specific tools
  getDefaultRepresentation(): string;
  getSupportedWidgets(): Widget[];
  renderView(container, viewConfig): void;
}
```

VTK is the reference implementation - implement it perfectly so contributors can follow the pattern.

---

## Component 1: Instance Header

### Purpose
Always-visible header providing view identification and quick actions.

### Design
- **Style:** Underline accent (2px bottom border in instance color when active)
- **Components:** Color dot + View name + Action buttons
- **Key behavior:** Header ALWAYS present at ALL sizes, menu provides ALL functionality

### Responsive Breakpoints

| Breakpoint | Min Width | Height | Visible Elements |
|------------|-----------|--------|------------------|
| Full | ≥450px | 32px | Wrench, Dot, Name, More, Expand, VR, Close |
| Large | ≥380px | 32px | Same as Full |
| Medium | ≥300px | 32px | Wrench, Dot, Name, More, Expand, Close (VR in menu) |
| Small | ≥220px | 28px | Dot, Name, More, Close (Wrench+Expand+VR in menu) |
| Tiny | ≥160px | 26px | Dot, Name, More, Close |
| Micro | <160px | 24px | Dot, Name, More (⋮), Close |

### Implementation

```jsx
// src/ui/react/components/canvas/InstanceViewport/InstanceHeader.jsx

const getHeaderMode = (width) => {
  if (width >= 450) return 'full';
  if (width >= 380) return 'large';
  if (width >= 300) return 'medium';
  if (width >= 220) return 'small';
  if (width >= 160) return 'tiny';
  return 'micro';
};

const InstanceHeader = ({ 
  viewConfig, 
  instanceColor, 
  isActive, 
  isLoading,
  onClose,
  onExpand,
  onOpenInstanceTools,
  onEnterVR,
  width 
}) => {
  const mode = getHeaderMode(width);
  const [menuOpen, setMenuOpen] = useState(false);
  const moreButtonRef = useRef(null);
  
  // Color dot becomes spinner when loading
  const ColorIndicator = isLoading 
    ? <Loader2 size={8} className="animate-spin" style={{ color: instanceColor }} />
    : <div className="instance-header__dot" style={{ background: instanceColor }} />;
  
  return (
    <div 
      className={`instance-header instance-header--${mode} ${isActive ? 'instance-header--active' : ''}`}
      style={{ '--instance-color': instanceColor }}
    >
      {/* Wrench - opens Instance Tools floating panel */}
      {['full', 'large', 'medium'].includes(mode) && (
        <IconButton 
          icon={Wrench} 
          onClick={onOpenInstanceTools}
          title="Instance Tools (T)"
        />
      )}
      
      {ColorIndicator}
      
      <span className="instance-header__name" title={viewConfig.name}>
        {viewConfig.name}
      </span>
      
      <div className="instance-header__actions">
        {/* Expand - hidden at small sizes */}
        {['full', 'large', 'medium'].includes(mode) && (
          <IconButton icon={Maximize2} onClick={onExpand} title="Expand (F)" />
        )}
        
        {/* VR - hidden at medium and below */}
        {['full', 'large'].includes(mode) && (
          <IconButton icon={Glasses} onClick={onEnterVR} title="Enter VR (V)" />
        )}
        
        {/* More menu - always visible */}
        <IconButton 
          ref={moreButtonRef}
          icon={mode === 'micro' ? MoreVertical : MoreHorizontal} 
          onClick={() => setMenuOpen(true)}
          title="More options"
        />
        
        {/* Close - always visible */}
        <IconButton icon={X} onClick={onClose} title="Close view" />
      </div>
      
      {/* Active indicator underline */}
      {isActive && <div className="instance-header__underline" />}
      
      <HeaderMenu 
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchorRef={moreButtonRef}
        headerMode={mode}
        onAction={handleMenuAction}
      />
    </div>
  );
};
```

### Header Menu Structure

**NO type-specific options in header menu** - those belong in Instance Tools only.

```jsx
const menuSections = [
  // Responsive section - only shows items hidden from header
  {
    id: 'responsive',
    condition: (mode) => mode !== 'full',
    items: [
      { id: 'instanceTools', icon: Wrench, label: 'Instance Tools', shortcut: 'T', condition: (m) => ['micro', 'tiny', 'small'].includes(m) },
      { id: 'expand', icon: Maximize2, label: 'Expand / Fullscreen', shortcut: 'F', condition: (m) => m !== 'full' },
      { id: 'vr', icon: Glasses, label: 'Enter VR Mode', shortcut: 'V', condition: (m) => !['full', 'large'].includes(m) },
    ],
  },
  // View section - always present
  {
    id: 'view',
    label: 'View',
    items: [
      { id: 'viewOptions', icon: Settings, label: 'View Options...', shortcut: 'O' },
      { id: 'syncOptions', icon: Link2, label: 'View Syncing...', shortcut: 'L' },
      { id: 'duplicate', icon: Copy, label: 'Duplicate View', shortcut: 'D' },
      { id: 'bookmark', icon: Bookmark, label: 'Save as Bookmark', shortcut: 'B' },
      { id: 'snapshot', icon: Camera, label: 'Capture Snapshot...', shortcut: 'S' },
    ],
  },
  // Danger section
  {
    id: 'danger',
    items: [
      { id: 'removeFromCanvas', icon: X, label: 'Remove from Canvas' },
      { id: 'deleteView', icon: Trash2, label: 'Delete View', danger: true, confirm: true },
    ],
  },
];
```

### SCSS

```scss
// src/ui/react/components/canvas/InstanceViewport/InstanceHeader.scss
@use '@styles/tokens' as *;
@use '@styles/mixins' as *;

.instance-header {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: 0 $spacing-sm;
  background: $bg-secondary;
  border-bottom: 1px solid $border-subtle;
  position: relative;
  
  &--full, &--large, &--medium { height: 32px; }
  &--small { height: 28px; }
  &--tiny { height: 26px; }
  &--micro { height: 24px; }
  
  &__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  
  &__name {
    flex: 1;
    min-width: 0;
    font-size: $font-size-sm;
    color: $text-secondary;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    
    .instance-header--active & {
      color: $text-primary;
      font-weight: 500;
    }
  }
  
  &__actions {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  
  &__underline {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--instance-color);
  }
}
```

---

## Component 2: Instance Toolbar

### Purpose
Type-specific tools that appear on hover, providing quick access to visualization manipulation.

### Design
- **Position:** Top-center of viewport
- **Trigger:** Immediate on mouse enter viewport
- **Hide:** 500ms after mouse leaves viewport AND toolbar
- **Pin:** Always visible button (no layout shift), persisted per viewport

### Tool Configuration

Each InstanceTypeHandler declares toolbar config via `getToolbarConfig()`:

```javascript
// VTK Reference Implementation
const vtkToolbarConfig = {
  tools: [
    { id: 'representation', type: 'dropdown', icon: Box, label: 'Representation',
      options: ['Surface', 'Wireframe', 'Points', 'Volume'] },
    { id: 'colorMap', type: 'dropdown', icon: Palette, label: 'Color Map',
      options: ['Viridis', 'Plasma', 'Rainbow', 'Grayscale'] },
    { type: 'separator' },
    { id: 'annotate', type: 'button', icon: PenTool, label: 'Annotate' },
    { id: 'measure', type: 'button', icon: Ruler, label: 'Measure' },
    { id: 'clip', type: 'button', icon: Scissors, label: 'Clip Plane' },
    { type: 'separator' },
    { id: 'undo', type: 'button', icon: Undo2, label: 'Undo', responsive: 'full' },
    { id: 'redo', type: 'button', icon: Redo2, label: 'Redo', responsive: 'full' },
  ],
  moreMenuItems: ['colorMap', 'measure', 'clip', 'undo', 'redo'],
};
```

### Responsive Modes

| Mode | Min Width | Visible Tools |
|------|-----------|---------------|
| full | ≥400px | All tools + Undo/Redo + Pin |
| compact | ≥280px | Representation, Color Map, Annotate, Measure + Pin |
| mini | ≥180px | Representation, Annotate, More (hint) |
| none | <180px | Toolbar hidden |

### Menu Direction Logic

**Critical:** Menus must not obscure toolbar buttons.

```javascript
const getMenuDirection = (buttonRect, toolbarRect, viewportRect) => {
  const buttonCenter = buttonRect.left + buttonRect.width / 2;
  const toolbarCenter = toolbarRect.left + toolbarRect.width / 2;
  
  // Horizontal: left/right based on position in toolbar
  const horizontal = buttonCenter < toolbarCenter ? 'right' : 'left';
  
  // Vertical: prefer down, use up if < 200px space below
  const spaceBelow = viewportRect.bottom - buttonRect.bottom;
  const vertical = spaceBelow >= 200 ? 'down' : 'up';
  
  return { horizontal, vertical };
};
```

### Implementation

```jsx
// src/ui/react/components/canvas/InstanceViewport/InstanceToolbar.jsx

const InstanceToolbar = ({
  toolbarConfig,
  cellWidth,
  isActive,
  isPinned,
  onTogglePin,
  onToolAction,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hideTimeout, setHideTimeout] = useState(null);
  const toolbarRef = useRef(null);
  
  const mode = getToolbarMode(cellWidth);
  
  // Don't render if mode is 'none'
  if (mode === 'none') return null;
  
  const handleMouseEnter = () => {
    if (hideTimeout) clearTimeout(hideTimeout);
    setIsVisible(true);
  };
  
  const handleMouseLeave = () => {
    if (!isPinned) {
      const timeout = setTimeout(() => setIsVisible(false), 500);
      setHideTimeout(timeout);
    }
  };
  
  const visibleTools = getVisibleTools(toolbarConfig.tools, mode);
  const moreMenuTools = getMoreMenuTools(toolbarConfig, mode);
  
  return (
    <div 
      ref={toolbarRef}
      className={`instance-toolbar instance-toolbar--${mode} ${(isVisible || isPinned || isActive) ? 'instance-toolbar--visible' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {visibleTools.map((tool, index) => (
        tool.type === 'separator' 
          ? <div key={index} className="instance-toolbar__separator" />
          : <ToolbarButton 
              key={tool.id}
              tool={tool}
              toolbarRef={toolbarRef}
              onAction={onToolAction}
            />
      ))}
      
      {moreMenuTools.length > 0 && (
        <ToolbarMoreMenu tools={moreMenuTools} onAction={onToolAction} />
      )}
      
      {/* Pin button - always visible, no layout shift */}
      <IconButton
        icon={isPinned ? PinOff : Pin}
        onClick={onTogglePin}
        active={isPinned}
        title={isPinned ? 'Unpin toolbar' : 'Pin toolbar'}
        className="instance-toolbar__pin"
      />
    </div>
  );
};
```

---

## Component 3: Navigation Notch

### Purpose
Carved-out edge element for camera/zoom controls, integrated with the window aesthetic.

### Design
- **Visual:** Darker background with inset shadow, instance color accent on exposed edges
- **Positions:** Left, Bottom, Right (user configurable via global/workspace/per-view preference)
- **No top position:** Conflicts with toolbar

### Visual Treatment

```scss
.navigation-notch {
  background: rgba(8, 8, 12, 0.95);
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(var(--instance-color-rgb), 0.25);
  
  // Rounded corners only on exposed sides
  &--bottom {
    border-radius: 8px 8px 0 0;
    border-bottom: none;
  }
  &--left {
    border-radius: 0 8px 8px 0;
    border-left: none;
  }
  &--right {
    border-radius: 8px 0 0 8px;
    border-right: none;
  }
}
```

### Controls

| Control | Full | Compact | Mini | Icon |
|---------|------|---------|------|------|
| Zoom - | ✓ | ✓ | ✓ | - |
| Zoom % | ✓ | ✓ | ✓ | - |
| Zoom + | ✓ | ✓ | ✓ | - |
| Fit | ✓ | ✓ | ✓ | ✓ |
| Reset | ✓ | ✓ | - | - |
| Pan | ✓ | ✓ | - | - |
| Rotate | ✓ | ✓ | - | - |
| Collapse | ✓ | ✓ | ✓ | ✓ |

### Zoom % Behavior

```jsx
const ZoomControl = ({ currentZoom, onZoomChange }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  const presets = [25, 50, 75, 100, 150, 200, 300, 400];
  
  const handleClick = () => setDropdownOpen(true);
  const handleDoubleClick = () => setEditMode(true);
  
  return (
    <div className="zoom-control">
      {editMode ? (
        <input
          type="number"
          value={currentZoom}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          onBlur={() => setEditMode(false)}
          onKeyDown={(e) => e.key === 'Enter' && setEditMode(false)}
          autoFocus
          min={10}
          max={1000}
        />
      ) : (
        <button onClick={handleClick} onDoubleClick={handleDoubleClick}>
          {currentZoom}%
        </button>
      )}
      
      {dropdownOpen && (
        <ZoomDropdown
          currentZoom={currentZoom}
          presets={presets}
          onSelect={(val) => { onZoomChange(val); setDropdownOpen(false); }}
          onClose={() => setDropdownOpen(false)}
        />
      )}
    </div>
  );
};
```

### Implementation

```jsx
// src/ui/react/components/canvas/InstanceViewport/NavigationNotch.jsx

const NavigationNotch = ({
  position = 'bottom', // 'left' | 'bottom' | 'right'
  zoom,
  onZoomChange,
  onFit,
  onReset,
  onSetTool, // 'pan' | 'rotate'
  activeTool,
  isExpanded,
  onToggleExpand,
  cellWidth,
  cellHeight,
  instanceColor,
}) => {
  const mode = getNotchMode(position === 'bottom' ? cellWidth : cellHeight);
  
  // Icon-only mode just shows fit + expand toggle
  if (mode === 'icon') {
    return (
      <div 
        className={`navigation-notch navigation-notch--${position} navigation-notch--icon`}
        style={{ '--instance-color': instanceColor }}
      >
        <IconButton icon={Scan} onClick={onFit} title="Fit to view" />
        <IconButton 
          icon={isExpanded ? ChevronDown : ChevronUp} 
          onClick={onToggleExpand}
          title={isExpanded ? 'Collapse' : 'Expand'}
        />
      </div>
    );
  }
  
  return (
    <div 
      className={`navigation-notch navigation-notch--${position} navigation-notch--${mode} ${isExpanded ? '' : 'navigation-notch--collapsed'}`}
      style={{ '--instance-color': instanceColor }}
    >
      {isExpanded ? (
        <>
          <div className="navigation-notch__zoom-group">
            <IconButton icon={ZoomOut} onClick={() => onZoomChange(zoom - 10)} />
            <ZoomControl currentZoom={zoom} onZoomChange={onZoomChange} />
            <IconButton icon={ZoomIn} onClick={() => onZoomChange(zoom + 10)} />
          </div>
          
          <div className="navigation-notch__separator" />
          
          <div className="navigation-notch__view-group">
            <IconButton icon={Scan} onClick={onFit} title="Fit to view" />
            {mode !== 'mini' && (
              <IconButton icon={Home} onClick={onReset} title="Reset camera" />
            )}
          </div>
          
          {mode !== 'mini' && (
            <>
              <div className="navigation-notch__separator" />
              
              <div className="navigation-notch__tool-group">
                <IconButton 
                  icon={Hand} 
                  onClick={() => onSetTool('pan')}
                  active={activeTool === 'pan'}
                  title="Pan"
                />
                <IconButton 
                  icon={RotateCw} 
                  onClick={() => onSetTool('rotate')}
                  active={activeTool === 'rotate'}
                  title="Rotate"
                />
              </div>
            </>
          )}
          
          <IconButton 
            icon={position === 'bottom' ? ChevronDown : (position === 'left' ? ChevronLeft : ChevronRight)} 
            onClick={onToggleExpand}
            title="Collapse"
          />
        </>
      ) : (
        // Collapsed state - appears on hover
        <IconButton 
          icon={position === 'bottom' ? ChevronUp : (position === 'left' ? ChevronRight : ChevronLeft)} 
          onClick={onToggleExpand}
          title="Expand navigation"
        />
      )}
    </div>
  );
};
```

---

## Component 4: Instance Tools Floating Panel

### Purpose
Provides full access to instance controls without requiring the Left Panel to be open.

### Design

| Property | Value |
|----------|-------|
| ID | instance-tools |
| Default Position | Near active viewport |
| Default Size | 300×450 px |
| Min Size | 260×300 px |
| Resizable | Yes |
| Dock Target | Left Panel → Instance Tools tab |

### Triggers
- Click wrench icon in instance header
- Keyboard shortcut: T

### Content Structure (3 Tabs)

| Tab | Contents |
|-----|----------|
| **Navigation** | Camera preset grid (3×3), Zoom control with presets |
| **Display** | Representation (dropdown), Color Map (dropdown), Appearance (opacity, visibility) |
| **Widgets** | Active widgets list, Widget-specific settings |

### Behavior
- **Follows Active:** Title and content update when active instance changes
- **Position Persistence:** Saved per-user in database
- **Single Instance:** Only one floating panel at a time
- **Minimize:** Collapses to title bar only
- **Dock Button:** Moves content to Left Panel's Instance Tools tab

### Implementation

```jsx
// src/ui/react/components/canvas/FloatingPanels/InstanceToolsPanel.jsx

const InstanceToolsPanel = ({
  activeInstance,
  position,
  onPositionChange,
  onClose,
  onDock,
  isPinned,
  onTogglePin,
}) => {
  const [activeTab, setActiveTab] = useState('navigation');
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Get handler-specific content
  const handler = getInstanceTypeHandler(activeInstance?.type);
  
  return (
    <FloatingPanel
      id="instance-tools"
      title="Instance Tools"
      subtitle={activeInstance?.name}
      accentColor={activeInstance?.color}
      position={position}
      onPositionChange={onPositionChange}
      onClose={onClose}
      onDock={onDock}
      isPinned={isPinned}
      onTogglePin={onTogglePin}
      isMinimized={isMinimized}
      onToggleMinimize={() => setIsMinimized(!isMinimized)}
      minSize={{ width: 260, height: 300 }}
      defaultSize={{ width: 300, height: 450 }}
    >
      {/* Mode indicator */}
      <ModeIndicator />
      
      {/* Instance info card */}
      <InstanceInfoCard instance={activeInstance} />
      
      {/* Quick tools bar - persists across tabs */}
      <QuickToolsBar
        tools={['annotate', 'measure', 'clip', 'visibility']}
        activeTools={activeTools}
        onToggleTool={handleToggleTool}
      />
      
      {/* Tabs */}
      <AdaptiveTabs
        tabs={[
          { id: 'navigation', label: 'Navigation' },
          { id: 'display', label: 'Display' },
          { id: 'widgets', label: 'Widgets' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      {/* Tab content */}
      <div className="instance-tools__content">
        {activeTab === 'navigation' && (
          <NavigationTabContent 
            instance={activeInstance}
            handler={handler}
          />
        )}
        {activeTab === 'display' && (
          <DisplayTabContent 
            instance={activeInstance}
            handler={handler}
          />
        )}
        {activeTab === 'widgets' && (
          <WidgetsTabContent 
            instance={activeInstance}
            handler={handler}
          />
        )}
      </div>
    </FloatingPanel>
  );
};
```

---

## Component 5: Adaptive Components System

### Purpose
VR-first, desktop-friendly component system that automatically scales based on mode.

### Key Insight
**Large touch targets ≠ chunky icons.** VR buttons are bigger (56px vs 32px) but icons use *thinner* strokes (1.5px vs 2px) for a refined look.

### ModeContext

```jsx
// src/ui/react/contexts/ModeContext.jsx

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { modeSizing, iconWeights } from '../components/adaptive/tokens';
import { useAuth } from './AuthContext'; // Your existing auth context

const ModeContext = createContext({
  mode: 'desktop',        // 'desktop' | 'vr'
  setMode: () => {},
  sizing: modeSizing.desktop,
  iconWeights,
  isVR: false,
});

export const useMode = () => useContext(ModeContext);

export const ModeProvider = ({ children }) => {
  // 1. Load from localStorage cache instantly (prevents flash)
  const [mode, setModeState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cia-display-mode') || 'desktop';
    }
    return 'desktop';
  });
  
  const { user, updateUserPreferences } = useAuth();
  
  // 2. Sync with server preferences on mount/user change
  useEffect(() => {
    if (user?.preferences?.displayMode) {
      const serverMode = user.preferences.displayMode;
      if (serverMode !== mode) {
        setModeState(serverMode);
        localStorage.setItem('cia-display-mode', serverMode);
      }
    }
  }, [user?.preferences?.displayMode]);
  
  // 3. Auto-detect VR capability (for 'auto' mode)
  const [vrSupported, setVrSupported] = useState(false);
  useEffect(() => {
    const checkVR = async () => {
      if (navigator.xr) {
        const supported = await navigator.xr.isSessionSupported('immersive-vr');
        setVrSupported(supported);
      }
    };
    checkVR();
  }, []);
  
  // 4. Save to both localStorage and server on change
  const setMode = useCallback((newMode) => {
    setModeState(newMode);
    localStorage.setItem('cia-display-mode', newMode);
    
    // Async save to server (fire and forget, or handle errors)
    updateUserPreferences?.({ displayMode: newMode }).catch(err => {
      console.warn('Failed to save display mode preference:', err);
    });
  }, [updateUserPreferences]);
  
  const value = {
    mode,
    setMode,
    sizing: modeSizing[mode] || modeSizing.desktop,
    iconWeights,
    isVR: mode === 'vr',
    vrSupported,
  };
  
  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
};
```

**Mode Detection & Persistence:**
- Default to 'desktop'
- Load from localStorage instantly (prevents UI flash on page load)
- Sync with server preferences when user authenticates
- Detect VR capability via WebXR: `navigator.xr?.isSessionSupported('immersive-vr')`
- Allow user override in Settings > Appearance
- Save to both localStorage (instant) and user DB (sync across devices)

### Sizing Tokens

```javascript
// src/ui/react/components/adaptive/tokens.js

export const iconWeights = {
  thin: 1,
  light: 1.25,
  regular: 1.5,    // VR default
  medium: 2,       // Desktop default
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

### Icon Component with Weight

```jsx
// src/ui/react/components/adaptive/Icon.jsx

const Icon = ({ 
  name, 
  size, // 'sm' | 'md' | 'lg' or number
  weight, // 'thin' | 'light' | 'regular' | 'medium' | 'bold'
  strokeWidth, // Direct override
  ...props 
}) => {
  const { sizing, iconWeights } = useMode();
  
  // Resolve size
  const resolvedSize = typeof size === 'number' 
    ? size 
    : sizing[`icon${size?.charAt(0).toUpperCase()}${size?.slice(1)}` || 'iconMd'];
  
  // Resolve stroke width: prop > weight > mode default
  const resolvedStrokeWidth = strokeWidth 
    ?? iconWeights[weight] 
    ?? iconWeights[sizing.iconWeight];
  
  const IconComponent = iconRegistry[name];
  
  return (
    <IconComponent 
      size={resolvedSize}
      strokeWidth={resolvedStrokeWidth}
      {...props}
    />
  );
};
```

### AdaptiveButton

```jsx
// src/ui/react/components/adaptive/AdaptiveButton.jsx

const AdaptiveButton = ({
  variant = 'default', // 'default' | 'ghost' | 'filled'
  size = 'md',
  icon,
  iconPosition = 'left',
  children,
  active,
  disabled,
  ...props
}) => {
  const { sizing, isVR } = useMode();
  
  const buttonSize = sizing[`button${size.charAt(0).toUpperCase()}${size.slice(1)}`];
  const iconSize = sizing[`icon${size.charAt(0).toUpperCase()}${size.slice(1)}`];
  const fontSize = sizing.fontSize[size];
  
  return (
    <button
      className={`adaptive-button adaptive-button--${variant} ${active ? 'adaptive-button--active' : ''}`}
      style={{
        minHeight: buttonSize,
        padding: children ? `0 ${sizing.spacing.md}px` : 0,
        width: children ? 'auto' : buttonSize,
        borderRadius: sizing.radius.md,
        fontSize,
      }}
      disabled={disabled}
      {...props}
    >
      {icon && iconPosition === 'left' && <Icon name={icon} size={size} />}
      {children}
      {icon && iconPosition === 'right' && <Icon name={icon} size={size} />}
    </button>
  );
};
```

---

## Component 6: Floating Panel Base

### Purpose
Shared infrastructure for all floating panels (Instance Tools, Canvas Navigator, Scratchpad).

### Common Features
- Header with title, minimize, dock (if applicable), close
- Draggable with snap-to-corner (20px threshold, 8px padding)
- Resizable (where appropriate)
- Position/size persistence per-user
- Z-index management (click to bring forward, starts at 200)

### Implementation

```jsx
// src/ui/react/components/common/FloatingPanel/FloatingPanel.jsx

const FloatingPanel = ({
  id,
  title,
  subtitle,
  accentColor,
  children,
  position,
  onPositionChange,
  size,
  onSizeChange,
  minSize = { width: 200, height: 150 },
  defaultSize = { width: 300, height: 400 },
  resizable = true,
  onClose,
  onDock,
  isPinned,
  onTogglePin,
  isMinimized,
  onToggleMinimize,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [localPosition, setLocalPosition] = useState(position);
  const [localSize, setLocalSize] = useState(size || defaultSize);
  const panelRef = useRef(null);
  const { bringToFront, zIndex } = useFloatingPanelContext();
  
  // Snap-to-corner logic
  const SNAP_THRESHOLD = 20;
  const EDGE_PADDING = 8;
  
  const handleDragEnd = (newPosition) => {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    let snappedPosition = { ...newPosition };
    
    // Snap to edges
    if (newPosition.x < SNAP_THRESHOLD) snappedPosition.x = EDGE_PADDING;
    if (newPosition.x + localSize.width > viewport.width - SNAP_THRESHOLD) {
      snappedPosition.x = viewport.width - localSize.width - EDGE_PADDING;
    }
    if (newPosition.y < SNAP_THRESHOLD) snappedPosition.y = EDGE_PADDING;
    if (newPosition.y + localSize.height > viewport.height - SNAP_THRESHOLD) {
      snappedPosition.y = viewport.height - localSize.height - EDGE_PADDING;
    }
    
    setLocalPosition(snappedPosition);
    onPositionChange?.(snappedPosition);
  };
  
  return (
    <div
      ref={panelRef}
      className={`floating-panel ${isMinimized ? 'floating-panel--minimized' : ''}`}
      style={{
        '--accent-color': accentColor,
        left: localPosition.x,
        top: localPosition.y,
        width: isMinimized ? 'auto' : localSize.width,
        height: isMinimized ? 'auto' : localSize.height,
        zIndex,
      }}
      onMouseDown={() => bringToFront(id)}
    >
      <FloatingPanelHeader
        title={title}
        subtitle={subtitle}
        accentColor={accentColor}
        onDragStart={() => setIsDragging(true)}
        onDrag={setLocalPosition}
        onDragEnd={handleDragEnd}
        onMinimize={onToggleMinimize}
        isMinimized={isMinimized}
        onDock={onDock}
        onPin={onTogglePin}
        isPinned={isPinned}
        onClose={onClose}
      />
      
      {!isMinimized && (
        <>
          <div className="floating-panel__content">
            {children}
          </div>
          
          {resizable && (
            <ResizeHandle
              onResizeStart={() => setIsResizing(true)}
              onResize={(delta) => {
                const newSize = {
                  width: Math.max(minSize.width, localSize.width + delta.x),
                  height: Math.max(minSize.height, localSize.height + delta.y),
                };
                setLocalSize(newSize);
              }}
              onResizeEnd={() => {
                setIsResizing(false);
                onSizeChange?.(localSize);
              }}
            />
          )}
        </>
      )}
    </div>
  );
};
```

---

## Theme Updates

### Blue-Tinted Dark Color Scheme

Update `src/ui/react/styles/tokens/_colors.scss`:

```scss
// Background colors - blue tinted
$bg-primary: #0a0c10;      // Was: #0a0a0f
$bg-secondary: #10141c;    // Was: #12121a  
$bg-tertiary: #161c28;     // Was: #1a1a24
$bg-canvas: #080a0e;       // New: darker for canvas

// Border colors - blue tinted
$border-subtle: rgba(96, 165, 250, 0.06);   // Was: rgba(255,255,255,0.06)
$border-default: rgba(96, 165, 250, 0.1);   // Was: rgba(255,255,255,0.1)
$border-medium: rgba(96, 165, 250, 0.15);   // Was: rgba(255,255,255,0.15)

// Glassmorphism
$glass-bg: rgba(12, 16, 24, 0.85);
$glass-border: rgba(96, 165, 250, 0.1);
$glass-blur: 12px;
```

---

## File Structure

```
src/ui/react/
├── components/
│   ├── adaptive/                    # VR-ready component library
│   │   ├── ModeContext.jsx
│   │   ├── tokens.js
│   │   ├── Icon.jsx
│   │   ├── AdaptiveButton.jsx
│   │   ├── AdaptiveToggle.jsx
│   │   ├── AdaptiveSlider.jsx
│   │   ├── AdaptiveSection.jsx
│   │   ├── AdaptiveOptionList.jsx
│   │   ├── AdaptiveTabs.jsx
│   │   ├── AdaptiveCameraGrid.jsx
│   │   ├── AdaptiveZoomControl.jsx
│   │   ├── InstanceInfoCard.jsx
│   │   ├── QuickToolsBar.jsx
│   │   └── index.js
│   ├── common/
│   │   └── FloatingPanel/
│   │       ├── FloatingPanel.jsx
│   │       ├── FloatingPanel.scss
│   │       ├── FloatingPanelHeader.jsx
│   │       ├── ResizeHandle.jsx
│   │       ├── useFloatingPanel.js
│   │       ├── FloatingPanelContext.jsx
│   │       └── index.js
│   └── canvas/
│       ├── InstanceViewport/
│       │   ├── InstanceViewport.jsx
│       │   ├── InstanceViewport.scss
│       │   ├── InstanceHeader.jsx
│       │   ├── InstanceHeader.scss
│       │   ├── InstanceToolbar.jsx
│       │   ├── InstanceToolbar.scss
│       │   ├── NavigationNotch.jsx
│       │   ├── NavigationNotch.scss
│       │   ├── HeaderMenu.jsx
│       │   ├── ToolbarButton.jsx
│       │   ├── ZoomControl.jsx
│       │   └── index.js
│       └── FloatingPanels/
│           ├── InstanceToolsPanel.jsx
│           ├── InstanceToolsPanel.scss
│           ├── CanvasNavigatorPanel.jsx
│           ├── ScratchpadPanel.jsx
│           └── index.js
├── contexts/
│   └── ModeContext.jsx
├── hooks/
│   ├── useActiveInstance.js
│   ├── useFloatingPanel.js
│   └── useToolbarConfig.js
└── styles/
    └── tokens/
        ├── _colors.scss              # Update with blue-tinted palette
        └── _spacing.scss
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
1. ModeContext + adaptive tokens
2. Icon component with weight system
3. AdaptiveButton, AdaptiveToggle, AdaptiveSlider
4. Update color tokens (blue-tinted)

### Phase 2: Floating Panel Infrastructure (Week 1-2)
1. FloatingPanel base component
2. FloatingPanelContext (z-index management)
3. useFloatingPanel hook
4. Position persistence

### Phase 3: Instance Cell Components (Week 2-3)
1. InstanceHeader (responsive breakpoints)
2. HeaderMenu
3. InstanceToolbar (with menu direction fix)
4. NavigationNotch

### Phase 4: Instance Tools Panel (Week 3-4)
1. InstanceToolsPanel
2. NavigationTabContent
3. DisplayTabContent
4. WidgetsTabContent
5. Integration with InstanceTypeHandler

### Phase 5: Integration & Testing (Week 4)
1. Wire components to existing architecture
2. Connect to useViewMetadata, useInstanceType hooks
3. Connect to actual camera/zoom state
4. Test responsive behavior
5. Test VR mode switching

---

## Testing Checklist

### Instance Header
- [ ] All 6 breakpoints render correctly
- [ ] Menu shows correct items per breakpoint
- [ ] Color dot becomes spinner when loading
- [ ] Underline appears when active
- [ ] All menu actions work

### Instance Toolbar
- [ ] Appears on hover
- [ ] Hides 500ms after mouse leaves
- [ ] Pin keeps toolbar visible
- [ ] Menus don't obscure toolbar
- [ ] Correct tools per responsive mode
- [ ] Handler-specific tools render

### Navigation Notch
- [ ] All 3 positions work (left, bottom, right)
- [ ] Responsive modes render correctly
- [ ] Zoom % click opens dropdown
- [ ] Zoom % double-click enables edit
- [ ] Collapse/expand works
- [ ] Chevron always visible when expanded

### Instance Tools Panel
- [ ] Opens from wrench icon
- [ ] Opens with T shortcut
- [ ] Updates when active instance changes
- [ ] Drag and snap work
- [ ] Resize respects min size
- [ ] Dock moves content to Left Panel
- [ ] Pin prevents auto-close

### Adaptive Components
- [ ] All components render in Desktop mode
- [ ] All components render in VR mode
- [ ] Mode switch updates all components
- [ ] Icon weights render correctly
- [ ] Touch targets meet VR minimum (44px+)

---

## Prototype Reference

The following prototype files are available in `docs/prototypes/`:

1. **final-cell-explorer.jsx** - Complete instance cell UI (header, toolbar, nav notch)
2. **adaptive-components.jsx** - Full adaptive component library
3. **canvas-minimap-operations-v2.jsx** - Canvas operations and minimap
4. **react-component-viewer.html** - HTML viewer for testing prototypes

Use these as visual references and extract patterns, but implement in the actual codebase following the architecture above.

---

## Resolved Design Decisions

| Question | Decision | Implementation Notes |
|----------|----------|---------------------|
| **Mode persistence** | User preferences DB with localStorage cache | Load from localStorage instantly, sync with server in background |
| **Panel position persistence** | Global | Same positions everywhere, stored in user preferences |
| **Desktop VR sizing opt-in** | Yes | Accessibility feature in Settings > Appearance |
| **Mode switch animation** | Animated | Smooth CSS transitions (~200-300ms) |

### Mode Persistence Implementation

```javascript
// src/ui/react/contexts/ModeContext.jsx

const ModeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    // 1. Load from localStorage cache instantly
    return localStorage.getItem('cia-display-mode') || 'desktop';
  });
  
  const { user, updateUserPreferences } = useAuth();
  
  // 2. Sync with server on mount
  useEffect(() => {
    if (user?.preferences?.displayMode) {
      const serverMode = user.preferences.displayMode;
      if (serverMode !== mode) {
        setMode(serverMode);
        localStorage.setItem('cia-display-mode', serverMode);
      }
    }
  }, [user]);
  
  // 3. Save to both on change
  const handleSetMode = useCallback((newMode) => {
    setMode(newMode);
    localStorage.setItem('cia-display-mode', newMode);
    updateUserPreferences({ displayMode: newMode });
  }, [updateUserPreferences]);
  
  // ... rest of context
};
```

### Animation Timing

```scss
// src/ui/react/styles/tokens/_transitions.scss

$transition-mode-switch: 250ms ease-out;

// Applied to adaptive components
.adaptive-button,
.adaptive-toggle,
.adaptive-slider,
.adaptive-panel {
  transition: 
    width $transition-mode-switch,
    height $transition-mode-switch,
    padding $transition-mode-switch,
    font-size $transition-mode-switch,
    border-radius $transition-mode-switch;
}

// Icons animate stroke-width
.adaptive-icon svg {
  transition: stroke-width $transition-mode-switch;
}
```

### Accessibility Settings UI

Add to Settings > Appearance:

```jsx
// In SettingsPanel or user preferences
<AdaptiveSection title="Display Mode">
  <AdaptiveOptionList
    options={[
      { id: 'desktop', label: 'Desktop', description: 'Compact UI optimized for mouse' },
      { id: 'vr', label: 'VR / Large Targets', description: 'Larger buttons and touch targets' },
      { id: 'auto', label: 'Auto-detect', description: 'Switch automatically when entering VR' },
    ]}
    value={displayMode}
    onChange={setDisplayMode}
  />
</AdaptiveSection>
```

---

*Document created: January 2025*
*Decisions finalized: January 2025*
