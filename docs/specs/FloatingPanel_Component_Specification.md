# Unified FloatingPanel Component Specification

**CIA Web - Collaborative Immersive Analytics Platform**

Version 1.0 - January 2025

---

## Document Overview

This specification defines the unified FloatingPanel component system that serves as the foundation for ALL panel-based UI in CIA Web. This single component handles both regular panels and priority panels (previously called "modals"), adapting automatically for Desktop and VR modes.

### Design Philosophy

**One component, multiple modes.** Instead of separate Modal and Panel components:
- `FloatingPanel` with `priority={false}` = Standard panel (user-positionable)
- `FloatingPanel` with `priority={true}` = Priority panel (forces decision)

This unification:
- Reduces code duplication
- Ensures consistent behavior across Desktop/VR
- Simplifies contributor mental model
- Enables seamless mode transitions

---

## Component API

### FloatingPanel Props

```typescript
interface FloatingPanelProps {
  // === IDENTITY ===
  id: string;                          // Unique panel identifier
  title: string;                       // Panel header title
  icon?: string;                       // Icon name from registry
  
  // === MODE ===
  priority?: boolean;                  // false = STANDARD, true = PRIORITY (default: false)
  severity?: 'info' | 'warning' | 'danger' | 'success';  // Visual styling (priority panels)
  
  // === VISIBILITY ===
  isOpen: boolean;                     // Controlled visibility
  onClose: () => void;                 // Close handler
  
  // === CONTENT ===
  children: React.ReactNode;           // Panel body content
  footer?: React.ReactNode;            // Optional footer (buttons, actions)
  
  // === STANDARD PANEL OPTIONS ===
  initialPosition?: { x: number; y: number };  // Starting position (Desktop)
  initialSize?: { width: number; height: number };
  minSize?: { width: number; height: number };
  maxSize?: { width: number; height: number };
  resizable?: boolean;                 // Allow resize (default: true for STANDARD)
  draggable?: boolean;                 // Allow drag (default: true for STANDARD)
  pinnable?: boolean;                  // Show pin button (default: true for STANDARD)
  
  // === PRIORITY PANEL OPTIONS ===
  closeOnEscape?: boolean;             // Escape key behavior (default: true, maps to Cancel)
  closeOnBackdrop?: boolean;           // Backdrop click behavior (default: false for PRIORITY)
  gazeFollow?: boolean;                // VR: Follow user's gaze (default: true)
  
  // === CALLBACKS ===
  onPositionChange?: (pos: Position) => void;
  onSizeChange?: (size: Size) => void;
  onPinChange?: (pinned: boolean) => void;
  
  // === TESTING ===
  testId?: string;
}
```

### Position & Size Types

```typescript
interface Position {
  // Desktop: pixels from viewport origin
  // VR: meters in world space
  x: number;
  y: number;
  z?: number;  // VR only: depth
}

interface Size {
  width: number;   // Desktop: px, VR: cm
  height: number;
}

interface VRPosition {
  position: [number, number, number];  // x, y, z in meters
  rotation: [number, number, number];  // euler angles
  pinned: boolean;                      // locked in world space
  followMode: boolean;                  // follows user head
}
```

---

## Component Structure

### File Organization

```
src/ui/react/components/panels/
├── FloatingPanel/
│   ├── FloatingPanel.jsx           # Main component
│   ├── FloatingPanel.scss          # Styles
│   ├── FloatingPanel.logic.js      # Headless hook (useFloatingPanel)
│   ├── FloatingPanelHeader.jsx     # Header subcomponent
│   ├── FloatingPanelBody.jsx       # Body subcomponent  
│   ├── FloatingPanelFooter.jsx     # Footer subcomponent
│   ├── FloatingPanelBackdrop.jsx   # Backdrop (priority only)
│   ├── useFloatingPanelPosition.js # Position management hook
│   ├── useFloatingPanelVR.js       # VR-specific behaviors
│   ├── constants.js                # Sizing tokens, defaults
│   └── index.js                    # Exports
├── PriorityPanel/
│   ├── PriorityPanel.jsx           # Convenience wrapper
│   └── index.js
└── index.js                        # Public exports
```

### Internal Architecture

```
FloatingPanel
├── FloatingPanelBackdrop (priority only)
│   └── Dims other content, blocks interaction
├── FloatingPanelContainer
│   ├── FloatingPanelHeader
│   │   ├── Icon
│   │   ├── Title
│   │   ├── HeaderActions (pin, follow, close)
│   │   └── DragHandle (standard only)
│   ├── FloatingPanelBody
│   │   └── {children}
│   └── FloatingPanelFooter (optional)
│       └── {footer}
└── ResizeHandles (standard only)
```

---

## Mode-Specific Behavior

### STANDARD Panel (priority={false})

| Feature | Desktop | VR |
|---------|---------|-----|
| Initial Position | Center of viewport or `initialPosition` | 1.2m front, 45° left/right |
| Movement | Drag header | Grip header, move controller |
| Resize | Drag corners/edges | Two-handed grip corners |
| Close | X button, Escape key | X button, B button |
| Pin | Locks position on screen | Locks position in world space |
| Follow | N/A | Panel follows head movement |
| Multiple | Can have many open | Can have many open |
| Z-Order | Click to bring forward | Spatial depth |

### PRIORITY Panel (priority={true})

| Feature | Desktop | VR |
|---------|---------|-----|
| Initial Position | Centered, fixed | 1.2m directly in front |
| Movement | ❌ Cannot move | ❌ Cannot move |
| Resize | ❌ Cannot resize | ❌ Cannot resize |
| Close | Buttons only (Escape = Cancel) | Buttons only (B = Cancel) |
| Backdrop | Dimmed, blocks clicks | Other panels dim 30% |
| Gaze Follow | N/A | Follows if user looks away |
| Multiple | Only one at a time | Only one at a time |
| Z-Order | Always on top | Always in front |
| Focus | Trapped within panel | Ray interaction only on panel |

---

## Desktop Implementation

### Position Management

```javascript
// useFloatingPanelPosition.js

const useFloatingPanelPosition = ({
  id,
  priority,
  initialPosition,
  draggable,
  persistPosition = true
}) => {
  // Position state
  const [position, setPosition] = useState(() => {
    if (priority) {
      // Priority panels always center
      return getCenteredPosition();
    }
    
    // Check for persisted position
    if (persistPosition) {
      const saved = getPersistedPosition(id);
      if (saved) return saved;
    }
    
    return initialPosition || getDefaultPosition(id);
  });
  
  // Drag handlers
  const handleDragStart = useCallback((e) => {
    if (priority) return; // No dragging priority panels
    // ... drag logic
  }, [priority]);
  
  const handleDragEnd = useCallback((newPosition) => {
    setPosition(newPosition);
    if (persistPosition) {
      persistPosition(id, newPosition);
    }
  }, [id, persistPosition]);
  
  return {
    position,
    setPosition,
    handleDragStart,
    handleDragEnd,
    isDragging
  };
};
```

### Focus Management

```javascript
// Focus trap for priority panels
const useFocusTrap = (isOpen, priority, panelRef) => {
  useEffect(() => {
    if (!isOpen || !priority) return;
    
    const panel = panelRef.current;
    const focusableElements = panel.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    // Auto-focus first element
    firstElement?.focus();
    
    const handleTab = (e) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };
    
    panel.addEventListener('keydown', handleTab);
    return () => panel.removeEventListener('keydown', handleTab);
  }, [isOpen, priority, panelRef]);
};
```

### Keyboard Handling

```javascript
// Escape key handling
const useEscapeHandler = (isOpen, priority, closeOnEscape, onClose) => {
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (priority && closeOnEscape) {
          // For priority panels, Escape = Cancel action
          onClose();
        } else if (!priority) {
          // Standard panels just close
          onClose();
        }
        // If priority && !closeOnEscape, do nothing (e.g., Recording Consent)
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, priority, closeOnEscape, onClose]);
};
```

---

## VR Implementation

### VR Position Management

```javascript
// useFloatingPanelVR.js

const useFloatingPanelVR = ({
  id,
  priority,
  gazeFollow,
  onPositionChange
}) => {
  const { isVR, xrSession, headPosition, headRotation } = useXR();
  
  // World-space position
  const [worldPosition, setWorldPosition] = useState(() => {
    if (priority) {
      return getPositionInFrontOfUser(headPosition, headRotation, 1.2);
    }
    return getDefaultVRPosition(id);
  });
  
  // Gaze tracking for priority panels
  useEffect(() => {
    if (!isVR || !priority || !gazeFollow) return;
    
    let gazeAwayTimer = null;
    
    const checkGaze = () => {
      const angleFromPanel = calculateAngleFromPanel(
        headRotation,
        worldPosition
      );
      
      if (angleFromPanel > 45) {
        // User looking away
        if (!gazeAwayTimer) {
          gazeAwayTimer = setTimeout(() => {
            // Reposition panel to front of user
            animatePanelToFront(worldPosition, headPosition, headRotation, 300);
          }, 500); // 0.5s threshold
        }
      } else {
        // User looking at panel
        if (gazeAwayTimer) {
          clearTimeout(gazeAwayTimer);
          gazeAwayTimer = null;
        }
      }
    };
    
    const interval = setInterval(checkGaze, 100);
    return () => {
      clearInterval(interval);
      if (gazeAwayTimer) clearTimeout(gazeAwayTimer);
    };
  }, [isVR, priority, gazeFollow, worldPosition, headPosition, headRotation]);
  
  return {
    worldPosition,
    setWorldPosition,
    isInFrontOfUser: calculateAngleFromPanel(headRotation, worldPosition) < 45
  };
};
```

### VR Audio Cues

```javascript
// VR spatial audio feedback
const useVRAudioCues = (priority, isOpen, worldPosition) => {
  const { playSound } = useSpatialAudio();
  
  // Panel appear sound
  useEffect(() => {
    if (isOpen && priority) {
      playSound('panel-appear', worldPosition);
    }
  }, [isOpen, priority, worldPosition, playSound]);
  
  // Reposition sound
  const playRepositionSound = useCallback(() => {
    if (priority) {
      playSound('panel-whoosh', worldPosition);
    }
  }, [priority, worldPosition, playSound]);
  
  return { playRepositionSound };
};
```

---

## Styling

### CSS Custom Properties

```scss
// FloatingPanel.scss

.floating-panel {
  // === LAYOUT ===
  --panel-padding: var(--spacing-md);
  --panel-radius: var(--radius-lg);
  --panel-header-height: 48px;
  
  // === COLORS (from theme) ===
  --panel-bg: var(--color-surface-elevated);
  --panel-border: var(--color-border-subtle);
  --panel-shadow: var(--shadow-lg);
  
  // === BACKDROP (priority only) ===
  --backdrop-color: rgba(0, 0, 0, 0.6);
  --backdrop-blur: 4px;
  
  // === SIZING ===
  --panel-min-width: 280px;
  --panel-max-width: 640px;
  --panel-min-height: 200px;
  --panel-max-height: 80vh;
  
  // === ANIMATION ===
  --panel-appear-duration: 150ms;
  --panel-appear-easing: cubic-bezier(0.4, 0, 0.2, 1);
}

// Adaptive sizing via ModeContext
.floating-panel[data-mode="vr"] {
  --panel-padding: var(--spacing-lg);
  --panel-header-height: 64px;
  // Larger touch targets in VR
}
```

### Animation

```scss
// Panel appearance animation
.floating-panel {
  &--entering {
    animation: panel-enter var(--panel-appear-duration) var(--panel-appear-easing);
  }
  
  &--exiting {
    animation: panel-exit var(--panel-appear-duration) var(--panel-appear-easing);
  }
}

@keyframes panel-enter {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes panel-exit {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.95);
  }
}

// Backdrop fade
.floating-panel-backdrop {
  &--entering {
    animation: backdrop-enter var(--panel-appear-duration) ease-out;
  }
  
  &--exiting {
    animation: backdrop-exit var(--panel-appear-duration) ease-out;
  }
}

@keyframes backdrop-enter {
  from { opacity: 0; backdrop-filter: blur(0); }
  to { opacity: 1; backdrop-filter: blur(var(--backdrop-blur)); }
}
```

---

## Convenience Wrappers

### PriorityPanel

For confirmations and forced decisions:

```jsx
// PriorityPanel.jsx
import FloatingPanel from '../FloatingPanel';

export function PriorityPanel({
  isOpen,
  onClose,
  title,
  children,
  severity = 'info',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  confirmDisabled = false,
  closeOnEscape = true,  // Maps to Cancel
  ...props
}) {
  const handleCancel = () => {
    onCancel?.();
    onClose();
  };
  
  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };
  
  return (
    <FloatingPanel
      priority={true}
      isOpen={isOpen}
      onClose={handleCancel}
      title={title}
      severity={severity}
      closeOnEscape={closeOnEscape}
      closeOnBackdrop={false}
      footer={
        <div className="priority-panel__actions">
          <Button variant="secondary" onClick={handleCancel}>
            {cancelLabel}
          </Button>
          <Button 
            variant={severity === 'danger' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </Button>
        </div>
      }
      {...props}
    >
      {children}
    </FloatingPanel>
  );
}
```

### ConfirmationDialog

Backward-compatible wrapper:

```jsx
// ConfirmationDialog.jsx
import { PriorityPanel } from '../PriorityPanel';

export function ConfirmationDialog({
  isOpen,
  onClose,
  title,
  description,
  severity = 'info',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  showInput = false,
  inputMatchValue = '',
  showCheckbox = false,
  checkboxLabel = "Don't ask again",
  ...props
}) {
  const [inputValue, setInputValue] = useState('');
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  
  const isConfirmDisabled = showInput && inputValue !== inputMatchValue;
  
  return (
    <PriorityPanel
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      severity={severity}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      onConfirm={onConfirm}
      confirmDisabled={isConfirmDisabled}
      {...props}
    >
      <p className="confirmation-dialog__description">{description}</p>
      
      {showInput && (
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={`Type "${inputMatchValue}" to confirm`}
          className="confirmation-dialog__input"
        />
      )}
      
      {showCheckbox && (
        <label className="confirmation-dialog__checkbox">
          <input
            type="checkbox"
            checked={checkboxChecked}
            onChange={(e) => setCheckboxChecked(e.target.checked)}
          />
          {checkboxLabel}
        </label>
      )}
    </PriorityPanel>
  );
}
```

---

## Form State Recovery

### Recovery Hook

```javascript
// useFormRecovery.js

const RECOVERY_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

export function useFormRecovery(panelId, formState, hasChanges) {
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [recoveredState, setRecoveredState] = useState(null);
  
  // Save state on close
  const saveRecoveryState = useCallback(() => {
    if (hasChanges) {
      sessionStorage.setItem(`form_recovery_${panelId}`, JSON.stringify({
        state: formState,
        timestamp: Date.now()
      }));
    }
  }, [panelId, formState, hasChanges]);
  
  // Check for recovery on open
  const checkRecovery = useCallback(() => {
    const saved = sessionStorage.getItem(`form_recovery_${panelId}`);
    if (!saved) return false;
    
    const { state, timestamp } = JSON.parse(saved);
    const isExpired = Date.now() - timestamp > RECOVERY_WINDOW_MS;
    
    if (isExpired) {
      sessionStorage.removeItem(`form_recovery_${panelId}`);
      return false;
    }
    
    setRecoveredState(state);
    setShowRecoveryDialog(true);
    return true;
  }, [panelId]);
  
  // Handle recovery decision
  const handleRecover = useCallback(() => {
    setShowRecoveryDialog(false);
    return recoveredState;
  }, [recoveredState]);
  
  const handleStartFresh = useCallback(() => {
    sessionStorage.removeItem(`form_recovery_${panelId}`);
    setShowRecoveryDialog(false);
    setRecoveredState(null);
  }, [panelId]);
  
  return {
    showRecoveryDialog,
    recoveredState,
    saveRecoveryState,
    checkRecovery,
    handleRecover,
    handleStartFresh
  };
}
```

### Recovery Dialog

```jsx
// FormRecoveryDialog.jsx

export function FormRecoveryDialog({
  isOpen,
  onRecover,
  onStartFresh
}) {
  return (
    <PriorityPanel
      isOpen={isOpen}
      onClose={onStartFresh}
      title="Unsaved Changes Found"
      severity="info"
      confirmLabel="Continue where I left off"
      cancelLabel="Start fresh"
      onConfirm={onRecover}
      onCancel={onStartFresh}
    >
      <p>You have unsaved changes from a moment ago.</p>
    </PriorityPanel>
  );
}
```

---

## Position Persistence

### Strategy

Position persistence follows a hierarchy:
1. **Session** - Current browser session (sessionStorage)
2. **Workspace** - Shared with workspace (Y.js for collaboration)
3. **Global** - User preference across all sessions (localStorage)

```javascript
// Panel position persistence strategy
const PERSISTENCE_LEVELS = {
  SESSION: 'session',     // sessionStorage
  WORKSPACE: 'workspace', // Y.js shared state
  GLOBAL: 'global'        // localStorage
};

const getPersistedPosition = (panelId, level = PERSISTENCE_LEVELS.SESSION) => {
  switch (level) {
    case PERSISTENCE_LEVELS.SESSION:
      return JSON.parse(sessionStorage.getItem(`panel_pos_${panelId}`));
    case PERSISTENCE_LEVELS.WORKSPACE:
      return yPanelPositions.get(panelId);
    case PERSISTENCE_LEVELS.GLOBAL:
      return JSON.parse(localStorage.getItem(`panel_pos_${panelId}`));
    default:
      return null;
  }
};
```

---

## Accessibility

### ARIA Attributes

```jsx
<div
  role={priority ? "dialog" : "region"}
  aria-modal={priority ? "true" : undefined}
  aria-labelledby={`${id}-title`}
  aria-describedby={description ? `${id}-description` : undefined}
  tabIndex={-1}
>
  <h2 id={`${id}-title`}>{title}</h2>
  {description && <p id={`${id}-description`}>{description}</p>}
</div>
```

### Screen Reader Announcements

```javascript
// Announce panel state changes
const useA11yAnnouncements = (isOpen, priority, title) => {
  useEffect(() => {
    if (isOpen) {
      announce(`${title} ${priority ? 'dialog' : 'panel'} opened`);
    }
  }, [isOpen, priority, title]);
};
```

---

## Usage Examples

### Standard Panel

```jsx
<FloatingPanel
  id="datasets-panel"
  title="Datasets"
  icon="database"
  isOpen={showDatasets}
  onClose={() => setShowDatasets(false)}
  initialPosition={{ x: 100, y: 100 }}
  pinnable
  resizable
>
  <DatasetTree />
</FloatingPanel>
```

### Priority Confirmation

```jsx
<FloatingPanel
  id="delete-view-confirm"
  title="Delete View?"
  icon="trash"
  priority
  severity="danger"
  isOpen={showDeleteConfirm}
  onClose={() => setShowDeleteConfirm(false)}
  footer={
    <>
      <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
        Cancel
      </Button>
      <Button variant="danger" onClick={handleDelete}>
        Delete View
      </Button>
    </>
  }
>
  <p>"{view.name}" will be moved to Recently Deleted.</p>
</FloatingPanel>
```

### Using Convenience Wrapper

```jsx
<ConfirmationDialog
  isOpen={showDelete}
  onClose={() => setShowDelete(false)}
  title="Delete Project?"
  description="This action cannot be undone."
  severity="danger"
  confirmLabel="Delete Forever"
  onConfirm={handleDeleteProject}
  showInput
  inputMatchValue={projectName}
/>
```

---

## Migration Guide

### From Modal to FloatingPanel

```jsx
// Before (Modal component)
<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="Delete?"
  severity="danger"
>
  <p>Are you sure?</p>
</Modal>

// After (FloatingPanel with priority)
<FloatingPanel
  priority
  isOpen={isOpen}
  onClose={onClose}
  title="Delete?"
  severity="danger"
>
  <p>Are you sure?</p>
</FloatingPanel>
```

### Gradual Migration

The existing Modal component can be refactored to use FloatingPanel internally, preserving the existing API while unifying implementation.

---

## Testing Checklist

- [ ] STANDARD panels can be dragged (Desktop)
- [ ] STANDARD panels can be resized (Desktop)
- [ ] STANDARD panels can be pinned
- [ ] PRIORITY panels cannot be moved
- [ ] PRIORITY panels trap focus
- [ ] Escape key closes STANDARD panels
- [ ] Escape key triggers Cancel on PRIORITY panels
- [ ] Backdrop click disabled for PRIORITY panels
- [ ] VR: Panels render in 3D space
- [ ] VR: Gaze-following works for PRIORITY panels
- [ ] VR: Audio cues play on panel events
- [ ] Form recovery dialog appears when appropriate
- [ ] Position persistence across sessions

---

*This document serves as the authoritative reference for FloatingPanel implementation.*
