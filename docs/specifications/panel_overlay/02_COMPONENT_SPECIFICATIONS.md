# Panel Overlay Architecture - Component Specifications

**Date:** January 9, 2026

---

## Table of Contents

1. [useAdaptiveHover Hook](#1-useadaptivehover-hook)
2. [usePanelState Hook](#2-usepanelstate-hook)
3. [useFocusMode Hook](#3-usefocusmode-hook)
4. [DwellIndicator Component](#4-dwellindicator-component)
5. [ActivityBarTab Component](#5-activitybartab-component)
6. [OverlayPanel Component](#6-overlaypanel-component)
7. [PreviewHintBanner Component](#7-previewhintbanner-component)
8. [OverlayPanelHeader Component](#8-overlaypanelheader-component)

---

## 1. useAdaptiveHover Hook

Unified hover detection for Desktop (mouse) and VR (dwell-based).

### File Location
```
src/ui/react/hooks/useAdaptiveHover.js
```

### Interface

```typescript
interface UseAdaptiveHoverOptions {
  /** Callback when hover state activates */
  onHoverStart?: () => void;
  
  /** Callback when hover state deactivates */
  onHoverEnd?: () => void;
  
  /** Callback during VR dwell progress (0-1) */
  onDwellProgress?: (progress: number) => void;
  
  /** Disable hover detection */
  disabled?: boolean;
}

interface UseAdaptiveHoverReturn {
  /** Whether element is currently "hovered" */
  isHovered: boolean;
  
  /** VR dwell progress (0-1), always 0 or 1 on desktop */
  dwellProgress: number;
  
  /** Whether currently in dwell state (VR only, progress > 0 && < 1) */
  isHovering: boolean;
  
  /** Manually start dwell (for VR simulation/testing) */
  startDwell: () => void;
  
  /** Manually cancel dwell */
  cancelDwell: () => void;
}

function useAdaptiveHover(
  elementRef: RefObject<HTMLElement>,
  options?: UseAdaptiveHoverOptions
): UseAdaptiveHoverReturn;
```

### Implementation Notes

```javascript
// Key implementation details:

// 1. Get timing from AdaptiveContext tokens
const { isVR, tokens } = useAdaptive();
const hoverDelay = tokens.hoverDelay;      // 300ms desktop, 0 VR
const dwellTime = tokens.dwellTime;        // 0 desktop, 500ms VR

// 2. Desktop: Use mouseenter/mouseleave with optional delay
useEffect(() => {
  if (isVR || disabled) return;
  
  const handleMouseEnter = () => {
    if (hoverDelay > 0) {
      timeoutRef.current = setTimeout(() => {
        setIsHovered(true);
        onHoverStart?.();
      }, hoverDelay);
    } else {
      setIsHovered(true);
      onHoverStart?.();
    }
  };
  
  const handleMouseLeave = () => {
    clearTimeout(timeoutRef.current);
    setIsHovered(false);
    onHoverEnd?.();
  };
  
  // ... attach listeners
}, [isVR, disabled, hoverDelay]);

// 3. VR: Use requestAnimationFrame for smooth progress
const startDwell = useCallback(() => {
  if (!isVR || disabled || isHovered) return;
  
  dwellStartRef.current = performance.now();
  
  const updateProgress = () => {
    const elapsed = performance.now() - dwellStartRef.current;
    const progress = Math.min(elapsed / dwellTime, 1);
    
    setDwellProgress(progress);
    onDwellProgress?.(progress);
    
    if (progress >= 1) {
      setIsHovered(true);
      onHoverStart?.();
    } else {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }
  };
  
  animationFrameRef.current = requestAnimationFrame(updateProgress);
}, [isVR, disabled, isHovered, dwellTime]);

// 4. VR event integration (future)
// Listen for 'cia:vr-ray-enter' and 'cia:vr-ray-exit' events
// These will be dispatched by VTKVRController when ray intersects UI
```

### Usage Example

```jsx
function MyComponent() {
  const ref = useRef(null);
  const { isHovered, dwellProgress } = useAdaptiveHover(ref, {
    onHoverStart: () => console.log('Hover started'),
    onHoverEnd: () => console.log('Hover ended'),
  });
  
  return (
    <div ref={ref} className={isHovered ? 'hovered' : ''}>
      <DwellIndicator progress={dwellProgress} />
      Content
    </div>
  );
}
```

---

## 2. usePanelState Hook

Manages panel open/peek/preview state with grace period logic.

### File Location
```
src/ui/react/hooks/usePanelState.js
```

### Interface

```typescript
interface UsePanelStateOptions {
  /** Grace period before peek auto-closes (ms) */
  gracePeriod?: number;
}

interface UsePanelStateReturn {
  /** Currently pinned (open) tab ID, or null */
  activeTab: string | null;
  
  /** Currently peeking tab ID, or null */
  peekingTab: string | null;
  
  /** Whether panel should be visible (open OR peeking OR in grace) */
  shouldShow: (tabId: string) => boolean;
  
  /** Whether panel is in preview mode (not pinned) */
  isPreview: (tabId: string) => boolean;
  
  /** Toggle or switch active tab */
  setActiveTab: (tabId: string | null) => void;
  
  /** Start peeking a tab */
  startPeek: (tabId: string) => void;
  
  /** End peeking (with grace period) */
  endPeek: () => void;
  
  /** Pin current peek to active */
  pinPeek: () => void;
  
  /** Mouse entered panel (extends visibility) */
  onPanelMouseEnter: () => void;
  
  /** Mouse left panel (starts grace period) */
  onPanelMouseLeave: () => void;
}

function usePanelState(
  side: 'left' | 'right',
  options?: UsePanelStateOptions
): UsePanelStateReturn;
```

### Implementation Notes

```javascript
function usePanelState(side, options = {}) {
  const { tokens } = useAdaptive();
  const gracePeriod = options.gracePeriod ?? tokens.peekGracePeriod;
  
  const [activeTab, setActiveTab] = useState(null);
  const [peekingTab, setPeekingTab] = useState(null);
  const [mouseInside, setMouseInside] = useState(false);
  const [inGracePeriod, setInGracePeriod] = useState(false);
  
  const graceTimeoutRef = useRef(null);
  
  const shouldShow = useCallback((tabId) => {
    return activeTab === tabId || 
           (peekingTab === tabId && !activeTab) ||
           (mouseInside && peekingTab === tabId) ||
           (inGracePeriod && peekingTab === tabId);
  }, [activeTab, peekingTab, mouseInside, inGracePeriod]);
  
  const isPreview = useCallback((tabId) => {
    return shouldShow(tabId) && activeTab !== tabId;
  }, [shouldShow, activeTab]);
  
  const startPeek = useCallback((tabId) => {
    if (!activeTab) {
      setPeekingTab(tabId);
    }
  }, [activeTab]);
  
  const endPeek = useCallback(() => {
    if (!activeTab && peekingTab) {
      setInGracePeriod(true);
      graceTimeoutRef.current = setTimeout(() => {
        setInGracePeriod(false);
        if (!mouseInside) {
          setPeekingTab(null);
        }
      }, gracePeriod);
    }
  }, [activeTab, peekingTab, mouseInside, gracePeriod]);
  
  const pinPeek = useCallback(() => {
    if (peekingTab) {
      setActiveTab(peekingTab);
      setPeekingTab(null);
    }
  }, [peekingTab]);
  
  // ... rest of implementation
  
  return {
    activeTab,
    peekingTab,
    shouldShow,
    isPreview,
    setActiveTab: (tabId) => {
      setActiveTab(prev => prev === tabId ? null : tabId);
      setPeekingTab(null);
    },
    startPeek,
    endPeek,
    pinPeek,
    onPanelMouseEnter: () => {
      clearTimeout(graceTimeoutRef.current);
      setInGracePeriod(false);
      setMouseInside(true);
    },
    onPanelMouseLeave: () => {
      setMouseInside(false);
      if (!activeTab) {
        // Start grace period
        setInGracePeriod(true);
        graceTimeoutRef.current = setTimeout(() => {
          setInGracePeriod(false);
          setPeekingTab(null);
        }, gracePeriod);
      }
    },
  };
}
```

---

## 3. useFocusMode Hook

Manages focus mode state and panel restoration.

### File Location
```
src/ui/react/hooks/useFocusMode.js
```

### Interface

```typescript
interface UseFocusModeReturn {
  /** Whether focus mode is active */
  focusMode: boolean;
  
  /** Currently focused cell ID, or null */
  focusedCell: string | null;
  
  /** Enter focus mode (optionally focusing a specific cell) */
  enterFocusMode: (cellId?: string) => void;
  
  /** Exit focus mode (restores panel state) */
  exitFocusMode: () => void;
  
  /** Toggle focus mode */
  toggleFocusMode: () => void;
}

function useFocusMode(
  leftPanelState: UsePanelStateReturn,
  rightPanelState: UsePanelStateReturn
): UseFocusModeReturn;
```

### Implementation Notes

```javascript
function useFocusMode(leftPanelState, rightPanelState) {
  const [focusMode, setFocusMode] = useState(false);
  const [focusedCell, setFocusedCell] = useState(null);
  const preFocusStateRef = useRef({ left: null, right: null });
  
  const enterFocusMode = useCallback((cellId = null) => {
    // Save current panel state
    preFocusStateRef.current = {
      left: leftPanelState.activeTab,
      right: rightPanelState.activeTab,
    };
    
    // Collapse panels
    leftPanelState.setActiveTab(null);
    rightPanelState.setActiveTab(null);
    
    // Set focus mode
    setFocusMode(true);
    if (cellId) setFocusedCell(cellId);
  }, [leftPanelState, rightPanelState]);
  
  const exitFocusMode = useCallback(() => {
    // Restore panel state
    if (preFocusStateRef.current.left) {
      leftPanelState.setActiveTab(preFocusStateRef.current.left);
    }
    if (preFocusStateRef.current.right) {
      rightPanelState.setActiveTab(preFocusStateRef.current.right);
    }
    
    // Clear focus mode
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
  
  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'f' || e.key === 'F') {
        if (!e.target.closest('input, textarea, [contenteditable]')) {
          e.preventDefault();
          toggleFocusMode();
        }
      }
      
      if (e.key === 'Escape') {
        if (focusedCell) {
          setFocusedCell(null);
        } else if (focusMode) {
          exitFocusMode();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusMode, focusedCell, toggleFocusMode, exitFocusMode]);
  
  return {
    focusMode,
    focusedCell,
    enterFocusMode,
    exitFocusMode,
    toggleFocusMode,
  };
}
```

---

## 4. DwellIndicator Component

Circular progress indicator for VR dwell hover.

### File Location
```
src/ui/react/components/atoms/DwellIndicator/DwellIndicator.jsx
```

### Interface

```typescript
interface DwellIndicatorProps {
  /** Progress value 0-1 */
  progress: number;
  
  /** Size in pixels */
  size?: number;
  
  /** Stroke color */
  color?: string;
  
  /** Background stroke color */
  backgroundColor?: string;
  
  /** Stroke width */
  strokeWidth?: number;
}
```

### Implementation

```jsx
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
    >
      {/* Background circle */}
      <circle
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
```

### Styles

```scss
// DwellIndicator.scss

.dwell-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 10;
  
  &__progress {
    transform: rotate(-90deg);
    transform-origin: center;
    transition: stroke-dashoffset 16ms linear;
  }
}
```

---

## 5. ActivityBarTab Component

Enhanced tab with adaptive hover and dwell indicator.

### File Location
```
src/ui/react/components/layout/ActivityBar/ActivityBarTab.jsx
```

### Interface

```typescript
interface ActivityBarTabProps {
  /** Unique tab identifier */
  id: string;
  
  /** Icon component or name */
  icon: React.ReactNode | string;
  
  /** Tab label (shown on hover) */
  label: string;
  
  /** Keyboard shortcut */
  shortcut: string;
  
  /** Whether this tab's panel is pinned open */
  isActive: boolean;
  
  /** Whether this tab's panel is peeking */
  isPeeking: boolean;
  
  /** Click handler (toggle/switch panel) */
  onClick: () => void;
  
  /** Hover start handler (start peek) */
  onPeekStart: (id: string) => void;
  
  /** Hover end handler (end peek) */
  onPeekEnd: (id: string) => void;
  
  /** Which side of the screen */
  side: 'left' | 'right';
}
```

### Implementation Skeleton

```jsx
export function ActivityBarTab({
  id,
  icon,
  label,
  shortcut,
  isActive,
  isPeeking,
  onClick,
  onPeekStart,
  onPeekEnd,
  side,
}) {
  const tabRef = useRef(null);
  const { tokens } = useAdaptive();
  
  const { isHovered, dwellProgress, startDwell, cancelDwell } = useAdaptiveHover(tabRef, {
    onHoverStart: () => onPeekStart(id),
    onHoverEnd: () => onPeekEnd(id),
  });
  
  return (
    <button
      ref={tabRef}
      className={classNames('activity-bar-tab', {
        'activity-bar-tab--active': isActive,
        'activity-bar-tab--peeking': isPeeking,
      })}
      onClick={onClick}
      style={{
        width: tokens.activityBarWidth,
        height: tokens.activityBarWidth,
      }}
      aria-pressed={isActive}
      aria-label={`${label} [${shortcut}]`}
    >
      <span className="activity-bar-tab__icon">
        {typeof icon === 'string' ? <Icon name={icon} /> : icon}
      </span>
      
      <span 
        className="activity-bar-tab__indicator"
        style={{ [side]: 0 }}
      />
      
      <DwellIndicator progress={dwellProgress} />
      
      {isHovered && (
        <span 
          className="activity-bar-tab__label"
          style={{
            [side === 'left' ? 'left' : 'right']: '100%',
          }}
        >
          {label}
          <kbd>{shortcut}</kbd>
        </span>
      )}
    </button>
  );
}
```

---

## 6. OverlayPanel Component

Panel that overlays canvas with preview/pinned states.

### File Location
```
src/ui/react/components/panels/OverlayPanel/OverlayPanel.jsx
```

### Interface

```typescript
interface OverlayPanelProps {
  /** Which side of the screen */
  side: 'left' | 'right';
  
  /** Whether panel is pinned open */
  isOpen: boolean;
  
  /** Whether panel is in preview/peek mode */
  isPreview: boolean;
  
  /** Close handler */
  onClose: () => void;
  
  /** Pin handler (convert preview to pinned) */
  onPin: () => void;
  
  /** Pop-out handler (convert to floating) */
  onPopOut?: () => void;
  
  /** Panel title */
  title: string;
  
  /** Tab ID for this panel */
  tabId: string;
  
  /** Mouse enter panel handler */
  onMouseEnter: () => void;
  
  /** Mouse leave panel handler */
  onMouseLeave: () => void;
  
  /** Panel content */
  children: React.ReactNode;
}
```

### Key Styles

```scss
.overlay-panel {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-lg);
  z-index: 40;
  
  // Slide animation
  transform: translateX(-100%);
  opacity: 0;
  pointer-events: none;
  transition: 
    transform 250ms cubic-bezier(0.4, 0, 0.2, 1),
    opacity 250ms ease;
  
  &--right {
    transform: translateX(100%);
  }
  
  &--visible {
    transform: translateX(0);
    opacity: 1;
    pointer-events: auto;
  }
  
  // Preview state
  &--preview {
    opacity: 0.75; // More see-through for preview
    
    // Animated border glow
    &::before {
      content: '';
      position: absolute;
      inset: -1px;
      border-radius: inherit;
      padding: 1px;
      background: linear-gradient(
        135deg,
        rgba(96, 165, 250, 0.4),
        rgba(167, 139, 250, 0.4),
        rgba(96, 165, 250, 0.4)
      );
      background-size: 200% 200%;
      animation: borderGlow 3s ease infinite;
      mask: 
        linear-gradient(#fff 0 0) content-box, 
        linear-gradient(#fff 0 0);
      mask-composite: exclude;
      pointer-events: none;
    }
  }
}

@keyframes borderGlow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

---

## 7. PreviewHintBanner Component

Banner shown when panel is in preview mode.

### File Location
```
src/ui/react/components/molecules/PreviewHintBanner/PreviewHintBanner.jsx
```

### Interface

```typescript
interface PreviewHintBannerProps {
  /** Whether to show the banner */
  visible: boolean;
}
```

### Implementation

```jsx
export function PreviewHintBanner({ visible }) {
  if (!visible) return null;
  
  return (
    <div className="preview-hint-banner" role="status" aria-live="polite">
      <span className="preview-hint-banner__label">Preview</span>
      <span className="preview-hint-banner__text">
        Click pin or tab to keep open
      </span>
    </div>
  );
}
```

### Styles

```scss
.preview-hint-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: rgba(96, 165, 250, 0.1);
  border-bottom: 1px solid rgba(96, 165, 250, 0.2);
  font-size: 11px;
  
  &__label {
    font-weight: 600;
    color: var(--color-accent-blue);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  &__text {
    color: var(--color-text-muted);
  }
}
```

---

## 8. OverlayPanelHeader Component

Panel header with context-aware buttons.

### File Location
```
src/ui/react/components/molecules/OverlayPanelHeader/OverlayPanelHeader.jsx
```

### Interface

```typescript
interface OverlayPanelHeaderProps {
  /** Panel title */
  title: string;
  
  /** Whether in preview mode */
  isPreview: boolean;
  
  /** Close handler (pinned mode) */
  onClose: () => void;
  
  /** Pin handler (preview mode) */
  onPin: () => void;
  
  /** Pop-out handler */
  onPopOut?: () => void;
}
```

### Implementation

```jsx
export function OverlayPanelHeader({
  title,
  isPreview,
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
            <Icon name="push_pin" />
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
```
