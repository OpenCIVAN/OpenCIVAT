# PanelShell Chrome Levels - Claude Code Implementation Handoff

**Date:** January 28, 2025
**Status:** Ready for Implementation
**Priority:** HIGH - Foundation for all floating panels
**Estimated Effort:** 2-3 sessions

---

## Executive Summary

Implement a `PanelShell` component system with three chrome levels (FULL, COMPACT, MINIMAL) that will serve as the foundation for ALL floating panels in CIA Web. This replaces the current `FloatingPanel` component with a more flexible, VR-ready architecture.

**Key Principle:** The shell handles positioning, dragging, resizing, and z-index. Chrome level determines header complexity. Content is passed as children.

---

## Goals

1. **Create PanelShell base component** - Handles drag, resize, z-index, positioning
2. **Implement three chrome levels** - FULL, COMPACT, MINIMAL with distinct headers
3. **Support resize breakpoints** - Panels can adapt content at different widths
4. **VR-ready architecture** - Prepare for world-anchored, hand-follow, wrist-menu modes
5. **Replace FloatingPanel** - New panels use PanelShell; migrate existing over time
6. **Maintain backward compatibility** - Existing FloatingPanel continues working during migration

---

## File Structure

```
src/ui/react/components/panels/PanelShell/
├── index.js                          # Public exports
├── PanelShell.jsx                    # Main component
├── PanelShell.scss                   # Styles
├── PanelShell.logic.js               # Headless logic hook
├── PanelShellContext.jsx             # State management (replaces FloatingPanelContext)
├── constants.js                      # Chrome levels, breakpoints, VR modes
├── components/
│   ├── PanelHeader/
│   │   ├── PanelHeader.jsx           # Header component (adapts to chrome level)
│   │   ├── PanelHeader.scss
│   │   └── index.js
│   ├── PanelResizeHandle/
│   │   ├── PanelResizeHandle.jsx
│   │   ├── PanelResizeHandle.scss
│   │   └── index.js
│   └── PanelDragHandle/
│       ├── PanelDragHandle.jsx
│       ├── PanelDragHandle.scss
│       └── index.js
└── hooks/
    ├── usePanelDrag.js               # Drag logic
    ├── usePanelResize.js             # Resize logic with breakpoints
    └── usePanelPosition.js           # Position persistence
```

---

## TypeScript Interfaces (Implement as JSDoc for now)

### Core Types

```typescript
/**
 * Chrome level determines header complexity
 */
type ChromeLevel = 'full' | 'compact' | 'minimal';

/**
 * VR positioning mode (for future implementation)
 */
type VRPositionMode = 'world-anchored' | 'hand-follow' | 'wrist-menu';

/**
 * Size mode based on current width vs breakpoints
 */
type SizeMode = 'compact' | 'standard' | 'expanded';

/**
 * Panel breakpoints configuration
 */
interface PanelBreakpoints {
  minWidth: number;      // Absolute minimum, warning below this
  compactWidth: number;  // Below this: compact mode
  standardWidth: number; // Default width
  expandedWidth: number; // Above this: expanded mode
}

/**
 * Panel registration for the shell system
 */
interface PanelRegistration {
  id: string;
  title: string;
  icon: string;                    // Icon name from Icon component
  color: string;                   // Accent color (CSS color value)
  chrome: ChromeLevel;
  defaultWidth: number;
  defaultHeight: number;
  breakpoints?: PanelBreakpoints;
  vrMode?: VRPositionMode;         // Future: default VR positioning
  resizable?: boolean;             // Default true for FULL, false for MINIMAL
  minimizable?: boolean;           // Default true for FULL/COMPACT, false for MINIMAL
  dockable?: boolean;              // Can be docked with other panels
}

/**
 * Panel state in context
 */
interface PanelState {
  id: string;
  isOpen: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  minimized: boolean;
  sizeMode: SizeMode;
}

/**
 * Props for PanelShell component
 */
interface PanelShellProps {
  // Required
  panelId: string;
  title: string;
  icon: string;
  children: React.ReactNode | ((props: { width: number; height: number; sizeMode: SizeMode }) => React.ReactNode);
  
  // Chrome configuration
  chrome?: ChromeLevel;            // Default: 'full'
  color?: string;                  // Default: tokens.accentBlue
  
  // Size configuration
  defaultWidth?: number;           // Default: 320
  defaultHeight?: number;          // Default: 400
  minWidth?: number;               // Default: 200
  minHeight?: number;              // Default: 150
  maxWidth?: number;               // Default: 800
  maxHeight?: number;              // Default: 900
  breakpoints?: PanelBreakpoints;
  
  // Behavior
  resizable?: boolean;
  minimizable?: boolean;
  closable?: boolean;              // Default: true
  
  // Callbacks
  onClose?: () => void;
  onMinimize?: () => void;
  onResize?: (width: number, height: number) => void;
  onMove?: (x: number, y: number) => void;
  onFocus?: () => void;
}
```

---

## Chrome Level Specifications

### FULL Chrome (Complex Panels)

**Use for:** Navigator, Instance Tools, Data Browser, Link Manager

```
┌─────────────────────────────────────────────────────┐
│ ⋮⋮  🧭  NAVIGATOR                    [_] [□] [×]   │  ← Full header
├─────────────────────────────────────────────────────┤
│                                                     │
│                    CONTENT                          │
│                                                     │
└─────────────────────────────────────────────────────┤
                                                    ◢ │  ← Resize handle
```

**Header elements (left to right):**
1. Drag handle (⋮⋮) - Always visible
2. Icon - Panel type icon
3. Title - Panel name (truncates with ellipsis)
4. Size indicator (optional) - Shows "320px • standard" in dev mode
5. Minimize button [_]
6. Dock button [□] (future: for dock groups)
7. Close button [×]

**Behaviors:**
- Draggable from header
- Resizable from corner handle
- Minimizable to title bar only
- Shows resize warning below minWidth

### COMPACT Chrome (Simple Panels)

**Use for:** Chat, People, Settings, Help

```
┌─────────────────────────────────────────────────────┐
│ 💬 Chat                               [▼] [×]      │  ← Compact header
├─────────────────────────────────────────────────────┤
│                                                     │
│                    CONTENT                          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Header elements:**
1. Icon - Panel type icon (acts as drag handle)
2. Title - Panel name
3. Collapse button [▼] - Collapses to icon only
4. Close button [×]

**Behaviors:**
- Draggable from entire header
- NOT resizable (fixed size)
- Collapsible to just icon + title
- No dock button

### MINIMAL Chrome (Toolbars)

**Use for:** Quick Tools, Canvas Toolbar, Selection Tools

```
┌─────────────────────────────────────────────────────┐
│  [🔍] [✋] [📏] [📐] [💬]  ···                      │  ← No header, just content
└─────────────────────────────────────────────────────┘
```

**Header elements:** NONE

**Behaviors:**
- Draggable from body (entire panel is drag handle)
- NOT resizable
- NOT minimizable
- Close via context menu or programmatic

---

## Implementation Details

### 1. PanelShellContext.jsx

Replace/extend `FloatingPanelContext.jsx` with:

```javascript
// src/ui/react/components/panels/PanelShell/PanelShellContext.jsx

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// =============================================================================
// CONSTANTS
// =============================================================================

export const CHROME_LEVELS = {
  FULL: 'full',
  COMPACT: 'compact',
  MINIMAL: 'minimal',
};

export const SIZE_MODES = {
  COMPACT: 'compact',
  STANDARD: 'standard',
  EXPANDED: 'expanded',
};

export const DEFAULT_BREAKPOINTS = {
  minWidth: 200,
  compactWidth: 280,
  standardWidth: 320,
  expandedWidth: 400,
};

const STORAGE_KEY = 'ciaPanelShellState';

// =============================================================================
// CONTEXT
// =============================================================================

const PanelShellContext = createContext(null);

export function usePanelShell() {
  const context = useContext(PanelShellContext);
  if (!context) {
    throw new Error('usePanelShell must be used within PanelShellProvider');
  }
  return context;
}

// =============================================================================
// PROVIDER
// =============================================================================

export function PanelShellProvider({ children }) {
  const [panels, setPanels] = useState({});
  const [topZIndex, setTopZIndex] = useState(1000);

  // Load saved state
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPanels(parsed.panels || {});
      }
    } catch (e) {
      console.warn('Failed to load panel state:', e);
    }
  }, []);

  // Save state on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ panels }));
    } catch (e) {
      console.warn('Failed to save panel state:', e);
    }
  }, [panels]);

  // Open a panel
  const openPanel = useCallback((panelId, config = {}) => {
    setPanels(prev => ({
      ...prev,
      [panelId]: {
        id: panelId,
        isOpen: true,
        position: config.position || prev[panelId]?.position || { x: 100, y: 100 },
        size: config.size || prev[panelId]?.size || { width: 320, height: 400 },
        zIndex: topZIndex + 1,
        minimized: false,
        ...config,
      },
    }));
    setTopZIndex(z => z + 1);
  }, [topZIndex]);

  // Close a panel
  const closePanel = useCallback((panelId) => {
    setPanels(prev => ({
      ...prev,
      [panelId]: { ...prev[panelId], isOpen: false },
    }));
  }, []);

  // Update panel position
  const updatePosition = useCallback((panelId, position) => {
    setPanels(prev => ({
      ...prev,
      [panelId]: { ...prev[panelId], position },
    }));
  }, []);

  // Update panel size
  const updateSize = useCallback((panelId, size) => {
    setPanels(prev => ({
      ...prev,
      [panelId]: { ...prev[panelId], size },
    }));
  }, []);

  // Bring panel to front
  const bringToFront = useCallback((panelId) => {
    setPanels(prev => ({
      ...prev,
      [panelId]: { ...prev[panelId], zIndex: topZIndex + 1 },
    }));
    setTopZIndex(z => z + 1);
  }, [topZIndex]);

  // Toggle minimize
  const toggleMinimize = useCallback((panelId) => {
    setPanels(prev => ({
      ...prev,
      [panelId]: { ...prev[panelId], minimized: !prev[panelId]?.minimized },
    }));
  }, []);

  // Get panel state
  const getPanelState = useCallback((panelId) => {
    return panels[panelId] || null;
  }, [panels]);

  // Check if panel is open
  const isPanelOpen = useCallback((panelId) => {
    return panels[panelId]?.isOpen || false;
  }, [panels]);

  const value = {
    panels,
    openPanel,
    closePanel,
    updatePosition,
    updateSize,
    bringToFront,
    toggleMinimize,
    getPanelState,
    isPanelOpen,
  };

  return (
    <PanelShellContext.Provider value={value}>
      {children}
    </PanelShellContext.Provider>
  );
}
```

### 2. PanelShell.jsx

```javascript
// src/ui/react/components/panels/PanelShell/PanelShell.jsx

import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePanelShell, CHROME_LEVELS, SIZE_MODES, DEFAULT_BREAKPOINTS } from './PanelShellContext';
import { PanelHeader } from './components/PanelHeader';
import { PanelResizeHandle } from './components/PanelResizeHandle';
import { usePanelDrag } from './hooks/usePanelDrag';
import { usePanelResize } from './hooks/usePanelResize';
import { useAdaptive } from '@UI/react/context/AdaptiveContext';
import './PanelShell.scss';

/**
 * PanelShell - Base component for all floating panels
 * 
 * Handles: positioning, dragging, resizing, z-index, chrome levels
 * Content is passed as children (can be render prop for size-aware content)
 */
export function PanelShell({
  panelId,
  title,
  icon,
  children,
  chrome = CHROME_LEVELS.FULL,
  color,
  defaultWidth = 320,
  defaultHeight = 400,
  minWidth = 200,
  minHeight = 150,
  maxWidth = 800,
  maxHeight = 900,
  breakpoints = DEFAULT_BREAKPOINTS,
  resizable = chrome === CHROME_LEVELS.FULL,
  minimizable = chrome !== CHROME_LEVELS.MINIMAL,
  closable = true,
  onClose,
  onMinimize,
  onResize,
  onMove,
  onFocus,
}) {
  const { tokens, isVR } = useAdaptive();
  const panelRef = useRef(null);
  
  const {
    getPanelState,
    openPanel,
    closePanel,
    updatePosition,
    updateSize,
    bringToFront,
    toggleMinimize,
  } = usePanelShell();

  // Get or initialize panel state
  const panelState = getPanelState(panelId);
  
  // Initialize panel if not exists
  useEffect(() => {
    if (!panelState) {
      openPanel(panelId, {
        size: { width: defaultWidth, height: defaultHeight },
      });
    }
  }, [panelId, panelState, openPanel, defaultWidth, defaultHeight]);

  // Current dimensions
  const width = panelState?.size?.width || defaultWidth;
  const height = panelState?.size?.height || defaultHeight;
  const position = panelState?.position || { x: 100, y: 100 };
  const zIndex = panelState?.zIndex || 1000;
  const minimized = panelState?.minimized || false;

  // Calculate size mode based on breakpoints
  const sizeMode = useMemo(() => {
    if (width < breakpoints.compactWidth) return SIZE_MODES.COMPACT;
    if (width >= breakpoints.expandedWidth) return SIZE_MODES.EXPANDED;
    return SIZE_MODES.STANDARD;
  }, [width, breakpoints]);

  // Check if below minimum
  const isBelowMinimum = width < breakpoints.minWidth;

  // Drag handling
  const { isDragging, handleDragStart } = usePanelDrag({
    panelId,
    position,
    onMove: (newPos) => {
      updatePosition(panelId, newPos);
      onMove?.(newPos.x, newPos.y);
    },
    onDragStart: () => bringToFront(panelId),
  });

  // Resize handling
  const { isResizing, handleResizeStart } = usePanelResize({
    panelId,
    size: { width, height },
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
    onResize: (newSize) => {
      updateSize(panelId, newSize);
      onResize?.(newSize.width, newSize.height);
    },
  });

  // Handle close
  const handleClose = useCallback(() => {
    onClose?.();
    closePanel(panelId);
  }, [panelId, closePanel, onClose]);

  // Handle minimize
  const handleMinimize = useCallback(() => {
    onMinimize?.();
    toggleMinimize(panelId);
  }, [panelId, toggleMinimize, onMinimize]);

  // Handle panel focus
  const handlePanelClick = useCallback(() => {
    bringToFront(panelId);
    onFocus?.();
  }, [panelId, bringToFront, onFocus]);

  // Don't render if not open
  if (!panelState?.isOpen) return null;

  // Determine if content should render (not minimized)
  const showContent = !minimized;

  // Render children (support render prop pattern)
  const renderContent = () => {
    if (typeof children === 'function') {
      return children({ width, height, sizeMode });
    }
    return children;
  };

  // Build class names
  const classNames = [
    'panel-shell',
    `panel-shell--chrome-${chrome}`,
    `panel-shell--size-${sizeMode}`,
    isDragging && 'panel-shell--dragging',
    isResizing && 'panel-shell--resizing',
    minimized && 'panel-shell--minimized',
    isBelowMinimum && 'panel-shell--below-minimum',
  ].filter(Boolean).join(' ');

  const panelContent = (
    <div
      ref={panelRef}
      className={classNames}
      style={{
        '--panel-color': color || tokens?.colors?.accentBlue || '#3b82f6',
        left: position.x,
        top: position.y,
        width: minimized ? 'auto' : width,
        height: minimized ? 'auto' : height,
        zIndex,
      }}
      onClick={handlePanelClick}
      data-panel-id={panelId}
      data-chrome={chrome}
      data-size-mode={sizeMode}
    >
      {/* Header (not for MINIMAL) */}
      {chrome !== CHROME_LEVELS.MINIMAL && (
        <PanelHeader
          title={title}
          icon={icon}
          chrome={chrome}
          color={color}
          minimized={minimized}
          minimizable={minimizable}
          closable={closable}
          sizeMode={sizeMode}
          width={width}
          onDragStart={handleDragStart}
          onMinimize={handleMinimize}
          onClose={handleClose}
        />
      )}

      {/* Content */}
      {showContent && (
        <div 
          className="panel-shell__content"
          onMouseDown={chrome === CHROME_LEVELS.MINIMAL ? handleDragStart : undefined}
        >
          {renderContent()}
        </div>
      )}

      {/* Resize handle (only for FULL chrome when not minimized) */}
      {resizable && showContent && (
        <PanelResizeHandle onResizeStart={handleResizeStart} />
      )}

      {/* Below minimum warning */}
      {isBelowMinimum && showContent && (
        <div className="panel-shell__min-warning">
          ⚠️ Below minimum width ({breakpoints.minWidth}px)
        </div>
      )}
    </div>
  );

  // Render via portal to document.body
  return createPortal(panelContent, document.body);
}

export default PanelShell;
```

### 3. PanelShell.scss

```scss
// src/ui/react/components/panels/PanelShell/PanelShell.scss

@use "theme" as *;

// =============================================================================
// PANEL SHELL BASE
// =============================================================================

.panel-shell {
  position: fixed;
  display: flex;
  flex-direction: column;
  background: $color-bg-secondary;
  border-radius: 12px;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.05);
  overflow: hidden;
  user-select: none;
  
  // Panel accent color (set via CSS variable)
  --panel-color: #{$color-accent-blue};

  // =============================================================================
  // STATES
  // =============================================================================
  
  &--dragging {
    cursor: grabbing;
    opacity: 0.95;
    box-shadow: 
      0 16px 48px rgba(0, 0, 0, 0.5),
      0 0 0 2px var(--panel-color);
  }

  &--resizing {
    cursor: se-resize;
  }

  &--minimized {
    height: auto !important;
    min-width: 200px;
  }

  &--below-minimum {
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(239, 68, 68, 0.5);
  }

  // =============================================================================
  // CHROME LEVELS
  // =============================================================================

  // FULL chrome - complex panels
  &--chrome-full {
    .panel-shell__header {
      padding: $spacing-sm $spacing-md;
      gap: $spacing-sm;
    }
  }

  // COMPACT chrome - simple panels
  &--chrome-compact {
    .panel-shell__header {
      padding: $spacing-xs $spacing-sm;
      gap: $spacing-xs;
    }
    
    // No resize handle
    .panel-shell__resize-handle {
      display: none;
    }
  }

  // MINIMAL chrome - toolbars
  &--chrome-minimal {
    background: $color-bg-tertiary;
    border-radius: 8px;
    cursor: grab;
    
    &.panel-shell--dragging {
      cursor: grabbing;
    }
    
    .panel-shell__content {
      padding: $spacing-xs;
    }
  }

  // =============================================================================
  // SIZE MODES
  // =============================================================================

  &--size-compact {
    // Compact mode styling hooks for content
  }

  &--size-standard {
    // Standard mode styling hooks
  }

  &--size-expanded {
    // Expanded mode styling hooks
  }

  // =============================================================================
  // CONTENT
  // =============================================================================

  &__content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  // =============================================================================
  // MINIMUM WARNING
  // =============================================================================

  &__min-warning {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: $spacing-xs $spacing-sm;
    background: rgba(239, 68, 68, 0.2);
    border-top: 1px solid rgba(239, 68, 68, 0.4);
    font-size: 9px;
    color: #ef4444;
    text-align: center;
  }
}
```

### 4. PanelHeader Component

```javascript
// src/ui/react/components/panels/PanelShell/components/PanelHeader/PanelHeader.jsx

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { CHROME_LEVELS } from '../../PanelShellContext';
import './PanelHeader.scss';

/**
 * PanelHeader - Adapts to chrome level
 */
export function PanelHeader({
  title,
  icon,
  chrome,
  color,
  minimized,
  minimizable,
  closable,
  sizeMode,
  width,
  onDragStart,
  onMinimize,
  onClose,
}) {
  const isFull = chrome === CHROME_LEVELS.FULL;
  const isCompact = chrome === CHROME_LEVELS.COMPACT;

  return (
    <div 
      className={`panel-header panel-header--${chrome}`}
      onMouseDown={onDragStart}
    >
      {/* Drag handle (FULL only) */}
      {isFull && (
        <span className="panel-header__drag-handle">
          <Icon name="grip-vertical" size={12} />
        </span>
      )}

      {/* Icon */}
      <span className="panel-header__icon" style={{ color }}>
        <Icon name={icon} size={14} />
      </span>

      {/* Title */}
      <span className="panel-header__title">
        {title}
      </span>

      {/* Size indicator (dev mode, FULL only) */}
      {isFull && process.env.NODE_ENV === 'development' && (
        <span className="panel-header__size-indicator">
          {width}px • {sizeMode}
        </span>
      )}

      {/* Spacer */}
      <span className="panel-header__spacer" />

      {/* Buttons */}
      <div className="panel-header__buttons">
        {/* Minimize/Collapse */}
        {minimizable && (
          <button
            className="panel-header__button"
            onClick={(e) => {
              e.stopPropagation();
              onMinimize?.();
            }}
            title={minimized ? 'Expand' : (isFull ? 'Minimize' : 'Collapse')}
          >
            <Icon 
              name={minimized ? 'chevron-down' : (isFull ? 'minus' : 'chevron-up')} 
              size={12} 
            />
          </button>
        )}

        {/* Dock button (FULL only, placeholder for future) */}
        {isFull && (
          <button
            className="panel-header__button"
            onClick={(e) => e.stopPropagation()}
            title="Dock"
          >
            <Icon name="layout" size={12} />
          </button>
        )}

        {/* Close */}
        {closable && (
          <button
            className="panel-header__button panel-header__button--close"
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
            }}
            title="Close"
          >
            <Icon name="x" size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

export default PanelHeader;
```

### 5. PanelHeader.scss

```scss
// src/ui/react/components/panels/PanelShell/components/PanelHeader/PanelHeader.scss

@use "theme" as *;

.panel-header {
  display: flex;
  align-items: center;
  background: $color-bg-tertiary;
  border-bottom: 1px solid $color-border-subtle;
  cursor: grab;
  flex-shrink: 0;

  &:active {
    cursor: grabbing;
  }

  // =============================================================================
  // CHROME VARIANTS
  // =============================================================================

  &--full {
    padding: $spacing-sm $spacing-md;
    gap: $spacing-sm;
  }

  &--compact {
    padding: $spacing-xs $spacing-sm;
    gap: $spacing-xs;
  }

  // =============================================================================
  // ELEMENTS
  // =============================================================================

  &__drag-handle {
    color: $color-text-muted;
    cursor: grab;
    
    &:active {
      cursor: grabbing;
    }
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: $color-text-secondary;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__size-indicator {
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 4px;
    background: $color-bg-tertiary;
    color: $color-text-muted;
    flex-shrink: 0;
  }

  &__spacer {
    flex: 1;
  }

  &__buttons {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
  }

  &__button {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: $color-text-muted;
    cursor: pointer;
    transition: all 0.15s;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
      color: $color-text-secondary;
    }

    &--close:hover {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }
  }
}
```

### 6. Drag and Resize Hooks

```javascript
// src/ui/react/components/panels/PanelShell/hooks/usePanelDrag.js

import { useState, useCallback, useEffect, useRef } from 'react';

export function usePanelDrag({ panelId, position, onMove, onDragStart, onDragEnd }) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const positionStart = useRef({ x: 0, y: 0 });

  const handleDragStart = useCallback((e) => {
    // Only left mouse button
    if (e.button !== 0) return;
    
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    positionStart.current = { ...position };
    onDragStart?.();
  }, [position, onDragStart]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - dragStart.current.x;
      const deltaY = e.clientY - dragStart.current.y;
      
      const newX = Math.max(0, positionStart.current.x + deltaX);
      const newY = Math.max(0, positionStart.current.y + deltaY);
      
      onMove?.({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onDragEnd?.();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onMove, onDragEnd]);

  return { isDragging, handleDragStart };
}
```

```javascript
// src/ui/react/components/panels/PanelShell/hooks/usePanelResize.js

import { useState, useCallback, useEffect, useRef } from 'react';

export function usePanelResize({ 
  panelId, 
  size, 
  minWidth, 
  minHeight, 
  maxWidth, 
  maxHeight, 
  onResize 
}) {
  const [isResizing, setIsResizing] = useState(false);
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const handleResizeStart = useCallback((e) => {
    if (e.button !== 0) return;
    
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    };
  }, [size]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - resizeStart.current.x;
      const deltaY = e.clientY - resizeStart.current.y;
      
      const newWidth = Math.min(maxWidth, Math.max(minWidth, resizeStart.current.width + deltaX));
      const newHeight = Math.min(maxHeight, Math.max(minHeight, resizeStart.current.height + deltaY));
      
      onResize?.({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minWidth, minHeight, maxWidth, maxHeight, onResize]);

  return { isResizing, handleResizeStart };
}
```

### 7. PanelResizeHandle Component

```javascript
// src/ui/react/components/panels/PanelShell/components/PanelResizeHandle/PanelResizeHandle.jsx

import React from 'react';
import './PanelResizeHandle.scss';

export function PanelResizeHandle({ onResizeStart }) {
  return (
    <div 
      className="panel-resize-handle"
      onMouseDown={onResizeStart}
    >
      <div className="panel-resize-handle__indicator" />
    </div>
  );
}

export default PanelResizeHandle;
```

```scss
// src/ui/react/components/panels/PanelShell/components/PanelResizeHandle/PanelResizeHandle.scss

@use "theme" as *;

.panel-resize-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 16px;
  height: 16px;
  cursor: se-resize;
  
  &__indicator {
    position: absolute;
    right: 4px;
    bottom: 4px;
    width: 8px;
    height: 8px;
    border-right: 2px solid $color-border-default;
    border-bottom: 2px solid $color-border-default;
    opacity: 0.5;
    transition: opacity 0.15s;
  }
  
  &:hover .panel-resize-handle__indicator {
    opacity: 1;
    border-color: var(--panel-color, $color-accent-blue);
  }
}
```

---

## Usage Examples

### FULL Chrome Panel

```jsx
import { PanelShell } from '@UI/react/components/panels/PanelShell';

function NavigatorPanel() {
  return (
    <PanelShell
      panelId="navigator"
      title="Navigator"
      icon="compass"
      chrome="full"
      color="#3b82f6"
      defaultWidth={340}
      defaultHeight={500}
      breakpoints={{
        minWidth: 240,
        compactWidth: 280,
        standardWidth: 320,
        expandedWidth: 400,
      }}
    >
      {({ width, height, sizeMode }) => (
        <NavigatorContent sizeMode={sizeMode} />
      )}
    </PanelShell>
  );
}
```

### COMPACT Chrome Panel

```jsx
<PanelShell
  panelId="chat"
  title="Chat"
  icon="message-circle"
  chrome="compact"
  color="#22c55e"
  defaultWidth={280}
  defaultHeight={400}
  resizable={false}
>
  <ChatContent />
</PanelShell>
```

### MINIMAL Chrome Panel

```jsx
<PanelShell
  panelId="quick-tools"
  title="Quick Tools"
  icon="tools"
  chrome="minimal"
  defaultWidth={200}
  defaultHeight={44}
  resizable={false}
  minimizable={false}
>
  <QuickToolbar />
</PanelShell>
```

---

## Testing Checklist

### Basic Functionality
- [ ] Panel opens at default position and size
- [ ] Panel can be dragged by header
- [ ] Panel stays within viewport bounds
- [ ] Panel can be resized (FULL chrome)
- [ ] Resize respects min/max constraints
- [ ] Panel can be minimized (FULL/COMPACT)
- [ ] Panel can be closed
- [ ] Panel state persists in localStorage
- [ ] Panel z-index updates on focus (click)

### Chrome Levels
- [ ] FULL chrome shows: drag handle, icon, title, minimize, dock, close
- [ ] COMPACT chrome shows: icon, title, collapse, close
- [ ] MINIMAL chrome shows: no header, draggable from body

### Size Modes
- [ ] sizeMode updates based on width vs breakpoints
- [ ] Render prop receives correct sizeMode
- [ ] Below-minimum warning appears

### VR Readiness
- [ ] useAdaptive hook integration works
- [ ] Touch targets are accessible (44px minimum in VR mode)

---

## Migration Path

1. **Phase 1:** Implement PanelShell alongside existing FloatingPanel
2. **Phase 2:** Create new panels using PanelShell
3. **Phase 3:** Migrate existing panels one at a time
4. **Phase 4:** Remove FloatingPanel when all panels migrated

---

## Dependencies

**Required existing components:**
- `Icon` - from `@UI/react/components/atoms/Icon`
- `useAdaptive` - from `@UI/react/context/AdaptiveContext`

**Required theme tokens:**
- `$color-bg-secondary`, `$color-bg-tertiary`
- `$color-border-subtle`, `$color-border-default`
- `$color-text-primary`, `$color-text-secondary`, `$color-text-muted`
- `$color-accent-blue` (and other accent colors)
- `$spacing-xs`, `$spacing-sm`, `$spacing-md`

---

## Questions Before Implementation

1. **Icon names:** What are the exact icon names in the existing Icon component for: grip-vertical, minus, chevron-up, chevron-down, layout, x, compass, message-circle, tools?

2. **Theme import:** What's the exact import path for theme tokens? (`@use "theme" as *` or something else?)

3. **Adaptive context:** Is `useAdaptive` the correct hook name and path?

4. **Portal target:** Should panels render to `document.body` or a specific portal container?

5. **Existing FloatingPanel:** Should PanelShellContext extend/replace FloatingPanelContext, or be completely separate?

---

## Success Criteria

1. ✅ Three chrome levels work visually and behaviorally
2. ✅ Panels persist position/size across sessions
3. ✅ Z-index management works (click to focus)
4. ✅ Resize breakpoints trigger sizeMode changes
5. ✅ No regressions in existing FloatingPanel functionality
6. ✅ VR-ready (useAdaptive integration)
7. ✅ Clean, documented code following existing patterns

---

*Handoff created: January 28, 2025*
*Ready for Claude Code implementation*
