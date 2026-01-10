# Panel Overlay Architecture - New Files

**Date:** January 9, 2026

---

## Overview

This document lists all new files to create for the overlay panel architecture.

---

## File Structure

```
src/
├── ui/react/
│   ├── hooks/
│   │   ├── useAdaptiveHover.js          # NEW
│   │   ├── usePanelState.js             # NEW
│   │   └── useFocusMode.js              # NEW
│   │
│   ├── components/
│   │   ├── atoms/
│   │   │   └── DwellIndicator/
│   │   │       ├── DwellIndicator.jsx   # NEW
│   │   │       ├── DwellIndicator.scss  # NEW
│   │   │       └── index.js             # NEW
│   │   │
│   │   ├── molecules/
│   │   │   ├── PreviewHintBanner/
│   │   │   │   ├── PreviewHintBanner.jsx    # NEW
│   │   │   │   ├── PreviewHintBanner.scss   # NEW
│   │   │   │   └── index.js                 # NEW
│   │   │   │
│   │   │   └── OverlayPanelHeader/
│   │   │       ├── OverlayPanelHeader.jsx   # NEW
│   │   │       ├── OverlayPanelHeader.scss  # NEW
│   │   │       └── index.js                 # NEW
│   │   │
│   │   └── panels/
│   │       └── OverlayPanel/
│   │           ├── OverlayPanel.jsx     # NEW
│   │           ├── OverlayPanel.scss    # NEW
│   │           └── index.js             # NEW
```

---

## 1. useAdaptiveHover Hook

### File: `src/ui/react/hooks/useAdaptiveHover.js`

```javascript
/**
 * useAdaptiveHover - Unified hover detection for Desktop and VR
 * 
 * Desktop: Traditional mouse hover with optional delay
 * VR: Dwell-based hover with progress indicator
 * 
 * @param {RefObject} elementRef - Reference to hoverable element
 * @param {Object} options - Configuration options
 * @returns {Object} Hover state and controls
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAdaptive } from '@UI/react/context/AdaptiveContext';

export function useAdaptiveHover(elementRef, options = {}) {
  const { isVR, tokens } = useAdaptive();
  
  const {
    onHoverStart = null,
    onHoverEnd = null,
    onDwellProgress = null,
    disabled = false,
  } = options;
  
  const [isHovered, setIsHovered] = useState(false);
  const [dwellProgress, setDwellProgress] = useState(0);
  
  const dwellStartRef = useRef(null);
  const animationFrameRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  // ==========================================================================
  // DESKTOP: Mouse hover with optional delay
  // ==========================================================================
  
  useEffect(() => {
    if (isVR || disabled || !elementRef.current) return;
    
    const element = elementRef.current;
    const hoverDelay = tokens.hoverDelay || 0;
    
    const handleMouseEnter = () => {
      if (hoverDelay > 0) {
        hoverTimeoutRef.current = setTimeout(() => {
          setIsHovered(true);
          setDwellProgress(1);
          onHoverStart?.();
        }, hoverDelay);
      } else {
        setIsHovered(true);
        setDwellProgress(1);
        onHoverStart?.();
      }
    };
    
    const handleMouseLeave = () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      setIsHovered(false);
      setDwellProgress(0);
      onHoverEnd?.();
    };
    
    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [isVR, disabled, elementRef, onHoverStart, onHoverEnd, tokens.hoverDelay]);

  // ==========================================================================
  // VR: Dwell-based hover with progress
  // ==========================================================================
  
  const startDwell = useCallback(() => {
    if (!isVR || disabled || isHovered) return;
    
    const dwellTime = tokens.dwellTime || 500;
    dwellStartRef.current = performance.now();
    
    const updateProgress = () => {
      if (!dwellStartRef.current) return;
      
      const elapsed = performance.now() - dwellStartRef.current;
      const progress = Math.min(elapsed / dwellTime, 1);
      
      setDwellProgress(progress);
      onDwellProgress?.(progress);
      
      if (progress >= 1) {
        setIsHovered(true);
        onHoverStart?.();
        dwellStartRef.current = null;
      } else {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(updateProgress);
  }, [isVR, disabled, isHovered, tokens.dwellTime, onHoverStart, onDwellProgress]);
  
  const cancelDwell = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    dwellStartRef.current = null;
    setDwellProgress(0);
    
    if (isHovered) {
      setIsHovered(false);
      onHoverEnd?.();
    }
  }, [isHovered, onHoverEnd]);

  // ==========================================================================
  // VR Event Listeners (for ray intersection events)
  // ==========================================================================
  
  useEffect(() => {
    if (!isVR || disabled || !elementRef.current) return;
    
    const element = elementRef.current;
    const elementId = element.dataset.hoverId || element.id;
    
    if (!elementId) {
      console.warn('useAdaptiveHover: Element needs id or data-hover-id for VR');
      return;
    }
    
    const handleVRRayEnter = (event) => {
      if (event.detail.elementId === elementId) {
        startDwell();
      }
    };
    
    const handleVRRayExit = (event) => {
      if (event.detail.elementId === elementId) {
        cancelDwell();
      }
    };
    
    window.addEventListener('cia:vr-ray-enter', handleVRRayEnter);
    window.addEventListener('cia:vr-ray-exit', handleVRRayExit);
    
    return () => {
      window.removeEventListener('cia:vr-ray-enter', handleVRRayEnter);
      window.removeEventListener('cia:vr-ray-exit', handleVRRayExit);
      cancelDwell();
    };
  }, [isVR, disabled, elementRef, startDwell, cancelDwell]);

  // ==========================================================================
  // Cleanup
  // ==========================================================================
  
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return {
    isHovered,
    dwellProgress,
    isHovering: dwellProgress > 0 && dwellProgress < 1,
    startDwell,
    cancelDwell,
  };
}

export default useAdaptiveHover;
```

---

## 2. usePanelState Hook

### File: `src/ui/react/hooks/usePanelState.js`

```javascript
/**
 * usePanelState - Manages panel open/peek/preview state with grace period
 * 
 * @param {string} side - 'left' or 'right'
 * @param {Object} options - Configuration options
 * @returns {Object} Panel state and controls
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useAdaptive } from '@UI/react/context/AdaptiveContext';

export function usePanelState(side, options = {}) {
  const { tokens } = useAdaptive();
  const gracePeriod = options.gracePeriod ?? tokens.peekGracePeriod ?? 400;
  
  // State
  const [activeTab, setActiveTabInternal] = useState(null);
  const [peekingTab, setPeekingTab] = useState(null);
  const [mouseInside, setMouseInside] = useState(false);
  const [inGracePeriod, setInGracePeriod] = useState(false);
  
  // Refs
  const graceTimeoutRef = useRef(null);

  // ==========================================================================
  // Derived State Helpers
  // ==========================================================================
  
  const shouldShow = useCallback((tabId) => {
    if (activeTab === tabId) return true;
    if (peekingTab === tabId && !activeTab) return true;
    if (peekingTab === tabId && (mouseInside || inGracePeriod)) return true;
    return false;
  }, [activeTab, peekingTab, mouseInside, inGracePeriod]);
  
  const isPreview = useCallback((tabId) => {
    return shouldShow(tabId) && activeTab !== tabId;
  }, [shouldShow, activeTab]);

  // ==========================================================================
  // Actions
  // ==========================================================================
  
  const setActiveTab = useCallback((tabId) => {
    // Toggle if same tab, otherwise switch
    setActiveTabInternal(prev => prev === tabId ? null : tabId);
    setPeekingTab(null);
    setMouseInside(false);
    setInGracePeriod(false);
    if (graceTimeoutRef.current) {
      clearTimeout(graceTimeoutRef.current);
      graceTimeoutRef.current = null;
    }
  }, []);
  
  const startPeek = useCallback((tabId) => {
    // Only start peek if no panel is pinned open
    if (!activeTab) {
      setPeekingTab(tabId);
    }
  }, [activeTab]);
  
  const endPeek = useCallback(() => {
    // Start grace period before closing
    if (!activeTab && peekingTab && !mouseInside) {
      setInGracePeriod(true);
      graceTimeoutRef.current = setTimeout(() => {
        setInGracePeriod(false);
        setPeekingTab(null);
      }, gracePeriod);
    }
  }, [activeTab, peekingTab, mouseInside, gracePeriod]);
  
  const pinPeek = useCallback(() => {
    if (peekingTab) {
      setActiveTabInternal(peekingTab);
      setPeekingTab(null);
      setMouseInside(false);
      setInGracePeriod(false);
    }
  }, [peekingTab]);
  
  const closePanel = useCallback(() => {
    setActiveTabInternal(null);
    setPeekingTab(null);
    setMouseInside(false);
    setInGracePeriod(false);
  }, []);

  // ==========================================================================
  // Mouse Handlers
  // ==========================================================================
  
  const onPanelMouseEnter = useCallback(() => {
    if (graceTimeoutRef.current) {
      clearTimeout(graceTimeoutRef.current);
      graceTimeoutRef.current = null;
    }
    setInGracePeriod(false);
    setMouseInside(true);
  }, []);
  
  const onPanelMouseLeave = useCallback(() => {
    setMouseInside(false);
    
    // Start grace period if in preview mode
    if (!activeTab && peekingTab) {
      setInGracePeriod(true);
      graceTimeoutRef.current = setTimeout(() => {
        setInGracePeriod(false);
        setPeekingTab(null);
      }, gracePeriod);
    }
  }, [activeTab, peekingTab, gracePeriod]);

  // ==========================================================================
  // Cleanup
  // ==========================================================================
  
  useEffect(() => {
    return () => {
      if (graceTimeoutRef.current) {
        clearTimeout(graceTimeoutRef.current);
      }
    };
  }, []);

  return {
    activeTab,
    peekingTab,
    shouldShow,
    isPreview,
    setActiveTab,
    startPeek,
    endPeek,
    pinPeek,
    closePanel,
    onPanelMouseEnter,
    onPanelMouseLeave,
  };
}

export default usePanelState;
```

---

## 3. useFocusMode Hook

### File: `src/ui/react/hooks/useFocusMode.js`

```javascript
/**
 * useFocusMode - Manages focus mode state and panel restoration
 * 
 * @param {Object} leftPanelState - State from usePanelState('left')
 * @param {Object} rightPanelState - State from usePanelState('right')
 * @returns {Object} Focus mode state and controls
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export function useFocusMode(leftPanelState, rightPanelState) {
  const [focusMode, setFocusMode] = useState(false);
  const [focusedCell, setFocusedCell] = useState(null);
  
  // Store panel state before entering focus mode
  const preFocusStateRef = useRef({ left: null, right: null });

  // ==========================================================================
  // Actions
  // ==========================================================================
  
  const enterFocusMode = useCallback((cellId = null) => {
    // Save current panel state
    preFocusStateRef.current = {
      left: leftPanelState.activeTab,
      right: rightPanelState.activeTab,
    };
    
    // Collapse panels
    leftPanelState.closePanel();
    rightPanelState.closePanel();
    
    // Enter focus mode
    setFocusMode(true);
    if (cellId) {
      setFocusedCell(cellId);
    }
  }, [leftPanelState, rightPanelState]);
  
  const exitFocusMode = useCallback(() => {
    // Restore panel state
    const { left, right } = preFocusStateRef.current;
    
    if (left) {
      leftPanelState.setActiveTab(left);
    }
    if (right) {
      rightPanelState.setActiveTab(right);
    }
    
    // Exit focus mode
    setFocusMode(false);
    setFocusedCell(null);
  }, [leftPanelState, rightPanelState]);
  
  const toggleFocusMode = useCallback(() => {
    if (focusMode) {
      exitFocusMode();
    } else {
      enterFocusMode();
    }
  }, [focusMode, enterFocusMode, exitFocusMode]);
  
  const focusCell = useCallback((cellId) => {
    enterFocusMode(cellId);
  }, [enterFocusMode]);
  
  const exitCell = useCallback(() => {
    setFocusedCell(null);
    // Stay in focus mode, just unfocus the cell
  }, []);

  // ==========================================================================
  // Keyboard Shortcuts
  // ==========================================================================
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't handle if typing in input
      if (e.target.closest('input, textarea, [contenteditable="true"]')) {
        return;
      }
      
      // F key toggles focus mode
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFocusMode();
      }
      
      // Escape exits focus
      if (e.key === 'Escape') {
        if (focusedCell) {
          // First, exit focused cell
          exitCell();
        } else if (focusMode) {
          // Then, exit focus mode
          exitFocusMode();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusMode, focusedCell, toggleFocusMode, exitFocusMode, exitCell]);

  return {
    focusMode,
    focusedCell,
    enterFocusMode,
    exitFocusMode,
    toggleFocusMode,
    focusCell,
    exitCell,
  };
}

export default useFocusMode;
```

---

## 4. DwellIndicator Component

### File: `src/ui/react/components/atoms/DwellIndicator/DwellIndicator.jsx`

```javascript
/**
 * DwellIndicator - Circular progress indicator for VR dwell hover
 */

import React from 'react';
import { useAdaptive } from '@UI/react/context/AdaptiveContext';
import './DwellIndicator.scss';

export function DwellIndicator({
  progress,
  size = 40,
  color = 'var(--color-accent-blue)',
  backgroundColor = 'rgba(255, 255, 255, 0.15)',
  strokeWidth = 3,
}) {
  const { isVR } = useAdaptive();
  
  // Only render in VR mode when actively dwelling
  if (!isVR || progress === 0 || progress >= 1) {
    return null;
  }
  
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  
  return (
    <svg
      className="dwell-indicator"
      width={size}
      height={size}
      aria-hidden="true"
      role="progressbar"
      aria-valuenow={Math.round(progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Background circle */}
      <circle
        className="dwell-indicator__bg"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={backgroundColor}
        strokeWidth={strokeWidth}
      />
      
      {/* Progress circle */}
      <circle
        className="dwell-indicator__progress"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
      />
    </svg>
  );
}

export default DwellIndicator;
```

### File: `src/ui/react/components/atoms/DwellIndicator/DwellIndicator.scss`

```scss
@use "theme" as *;

.dwell-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 10;
  
  &__bg {
    opacity: 0.5;
  }
  
  &__progress {
    transform: rotate(-90deg);
    transform-origin: center;
    transition: stroke-dashoffset 16ms linear;
  }
}
```

### File: `src/ui/react/components/atoms/DwellIndicator/index.js`

```javascript
export { DwellIndicator } from './DwellIndicator';
export { default } from './DwellIndicator';
```

---

## 5. PreviewHintBanner Component

### File: `src/ui/react/components/molecules/PreviewHintBanner/PreviewHintBanner.jsx`

```javascript
/**
 * PreviewHintBanner - Banner shown when panel is in preview mode
 */

import React from 'react';
import './PreviewHintBanner.scss';

export function PreviewHintBanner({ visible = true }) {
  if (!visible) return null;
  
  return (
    <div 
      className="preview-hint-banner" 
      role="status" 
      aria-live="polite"
    >
      <span className="preview-hint-banner__label">Preview</span>
      <span className="preview-hint-banner__text">
        Click pin or tab to keep open
      </span>
    </div>
  );
}

export default PreviewHintBanner;
```

### File: `src/ui/react/components/molecules/PreviewHintBanner/PreviewHintBanner.scss`

```scss
@use "theme" as *;

.preview-hint-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: rgba($color-accent-blue, 0.1);
  border-bottom: 1px solid rgba($color-accent-blue, 0.2);
  font-size: 11px;
  flex-shrink: 0;
  
  &__label {
    font-weight: 600;
    color: $color-accent-blue;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  &__text {
    color: $color-text-muted;
  }
}
```

### File: `src/ui/react/components/molecules/PreviewHintBanner/index.js`

```javascript
export { PreviewHintBanner } from './PreviewHintBanner';
export { default } from './PreviewHintBanner';
```

---

## 6. OverlayPanelHeader Component

### File: `src/ui/react/components/molecules/OverlayPanelHeader/OverlayPanelHeader.jsx`

```javascript
/**
 * OverlayPanelHeader - Panel header with context-aware buttons
 */

import React from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { IconButton } from '@UI/react/components/atoms/IconButton';
import './OverlayPanelHeader.scss';

export function OverlayPanelHeader({
  title,
  isPreview = false,
  onClose,
  onPin,
  onPopOut,
}) {
  return (
    <div className="overlay-panel-header">
      <h3 className="overlay-panel-header__title">{title}</h3>
      
      <div className="overlay-panel-header__actions">
        {/* Pop-out button (always visible) */}
        {onPopOut && (
          <IconButton
            icon="open_in_new"
            size="sm"
            variant="ghost"
            title="Pop out to floating panel"
            onClick={onPopOut}
          />
        )}
        
        {/* Context-aware button */}
        {isPreview ? (
          <button
            className="overlay-panel-header__pin"
            onClick={onPin}
            title="Pin panel open"
          >
            <Icon name="push_pin" size={14} />
            <span>Pin</span>
          </button>
        ) : (
          <IconButton
            icon="close"
            size="sm"
            variant="ghost"
            title="Close panel"
            onClick={onClose}
          />
        )}
      </div>
    </div>
  );
}

export default OverlayPanelHeader;
```

### File: `src/ui/react/components/molecules/OverlayPanelHeader/OverlayPanelHeader.scss`

```scss
@use "theme" as *;

.overlay-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 12px;
  border-bottom: 1px solid $color-border-default;
  flex-shrink: 0;
  
  &__title {
    font-size: 13px;
    font-weight: 600;
    color: $color-text-primary;
    margin: 0;
  }
  
  &__actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  &__pin {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: rgba($color-accent-blue, 0.15);
    border: 1px solid rgba($color-accent-blue, 0.3);
    border-radius: $radius-sm;
    color: $color-accent-blue;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all $transition-fast;
    
    &:hover {
      background: rgba($color-accent-blue, 0.25);
      border-color: rgba($color-accent-blue, 0.5);
    }
  }
}
```

### File: `src/ui/react/components/molecules/OverlayPanelHeader/index.js`

```javascript
export { OverlayPanelHeader } from './OverlayPanelHeader';
export { default } from './OverlayPanelHeader';
```

---

## 7. OverlayPanel Component

### File: `src/ui/react/components/panels/OverlayPanel/OverlayPanel.jsx`

```javascript
/**
 * OverlayPanel - Panel that overlays canvas with preview/pinned states
 */

import React from 'react';
import classNames from 'classnames';
import { useAdaptive } from '@UI/react/context/AdaptiveContext';
import { OverlayPanelHeader } from '@UI/react/components/molecules/OverlayPanelHeader';
import { PreviewHintBanner } from '@UI/react/components/molecules/PreviewHintBanner';
import './OverlayPanel.scss';

export function OverlayPanel({
  side,
  isOpen,
  isPreview,
  onClose,
  onPin,
  onPopOut,
  title,
  tabId,
  onMouseEnter,
  onMouseLeave,
  children,
}) {
  const { tokens } = useAdaptive();
  
  const shouldShow = isOpen || isPreview;
  
  return (
    <div
      className={classNames('overlay-panel', `overlay-panel--${side}`, {
        'overlay-panel--visible': shouldShow,
        'overlay-panel--preview': isPreview,
        'overlay-panel--pinned': isOpen && !isPreview,
      })}
      style={{
        width: tokens.panelWidth,
        [side]: tokens.activityBarWidth,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      data-panel-id={tabId}
    >
      <OverlayPanelHeader
        title={title}
        isPreview={isPreview}
        onClose={onClose}
        onPin={onPin}
        onPopOut={onPopOut}
      />
      
      <PreviewHintBanner visible={isPreview} />
      
      <div className="overlay-panel__content">
        {children}
      </div>
    </div>
  );
}

export default OverlayPanel;
```

### File: `src/ui/react/components/panels/OverlayPanel/OverlayPanel.scss`

```scss
@use "theme" as *;

.overlay-panel {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  background: $glass-bg;
  backdrop-filter: blur(20px);
  border: 1px solid $glass-border;
  box-shadow: $shadow-lg;
  z-index: 40;
  
  // Hidden by default
  transform: translateX(-100%);
  opacity: 0;
  pointer-events: none;
  transition: 
    transform 250ms cubic-bezier(0.4, 0, 0.2, 1),
    opacity 250ms ease;
  
  // Right side slides from right
  &--right {
    transform: translateX(100%);
  }
  
  // Visible state
  &--visible {
    transform: translateX(0);
    opacity: 1;
    pointer-events: auto;
  }
  
  // Preview state (more see-through)
  &--preview {
    opacity: 0.78; // Slightly more transparent than pinned
    
    // Animated gradient border
    &::before {
      content: '';
      position: absolute;
      inset: -1px;
      border-radius: inherit;
      padding: 1px;
      background: linear-gradient(
        135deg,
        rgba($color-accent-blue, 0.4),
        rgba($color-accent-purple, 0.4),
        rgba($color-accent-blue, 0.4)
      );
      background-size: 200% 200%;
      animation: borderGlow 3s ease infinite;
      mask: 
        linear-gradient(#fff 0 0) content-box, 
        linear-gradient(#fff 0 0);
      mask-composite: exclude;
      pointer-events: none;
      z-index: -1;
    }
  }
  
  // Pinned state (full opacity)
  &--pinned {
    opacity: 1;
  }
  
  // Content area
  &__content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }
}

@keyframes borderGlow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

// Reduced motion preference
@media (prefers-reduced-motion: reduce) {
  .overlay-panel {
    transition: opacity 150ms ease;
    
    &--preview::before {
      animation: none;
    }
  }
}
```

### File: `src/ui/react/components/panels/OverlayPanel/index.js`

```javascript
export { OverlayPanel } from './OverlayPanel';
export { default } from './OverlayPanel';
```

---

## Summary of New Files

| File | Type | Priority |
|------|------|----------|
| `useAdaptiveHover.js` | Hook | P0 |
| `usePanelState.js` | Hook | P0 |
| `useFocusMode.js` | Hook | P0 |
| `DwellIndicator/` | Atom | P0 |
| `PreviewHintBanner/` | Molecule | P0 |
| `OverlayPanelHeader/` | Molecule | P0 |
| `OverlayPanel/` | Panel | P0 |

All files are P0 (required for initial implementation).
