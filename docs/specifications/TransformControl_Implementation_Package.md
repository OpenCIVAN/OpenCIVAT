# Transform Control Implementation Package

## Overview

This document provides complete specifications and code for implementing a **generic Transform Control** system for CIA Web. The Transform Control allows users to manipulate 3D object orientation (rotation), position, and scale via slider controls.

### Key Design Principles

1. **Generic UI Component** - `TransformControl` works with ANY handler type via interface
2. **Handler Opt-In** - Types implement interface methods to enable transform support
3. **VTK Reference Implementation** - Shows the pattern for future handler types
4. **Collaboration-Ready** - `getState()`/`setState()` methods for Y.js sync
5. **Actor Selection** - Handles scenes with multiple transformable objects

### Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    TransformControl (Generic UI)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Actor Select │  │ Rotation XYZ │  │ Position XYZ │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                            │                                    │
│              useTransformControl() hook                         │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────┐
│                    workspaceManager                             │
│         getActiveHandler() → handler.setActorTransform()       │
└────────────────────────────┼───────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
   │ VTKInstance │    │ ThreeJS     │    │ Future      │
   │ Handler     │    │ Handler     │    │ Handlers    │
   └─────────────┘    └─────────────┘    └─────────────┘
```

---

## File Structure to Create

```
src/
├── core/instances/types/
│   ├── InstanceTypeInterface.js         ← MODIFY: Add transform interface methods
│   └── vtk/
│       ├── VTKInstanceHandler.js        ← MODIFY: Implement interface, integrate adapter
│       └── transforms/
│           ├── VTKTransformAdapter.js   ← CREATE: VTK-specific transform logic
│           └── README.md                ← CREATE: Documentation
│
└── ui/react/components/controls/
    └── TransformControl/
        ├── TransformControl.jsx         ← CREATE: Visual component
        ├── TransformControl.scss        ← CREATE: Styles
        ├── useTransformControl.js       ← CREATE: React hook
        ├── index.js                     ← CREATE: Exports
        └── README.md                    ← CREATE: Documentation
```

---

## PART 1: Interface Extension

### File: `src/core/instances/types/InstanceTypeInterface.js`

**Action:** ADD these methods to the existing `InstanceTypeHandler` class. Find the class and add these methods alongside the existing interface methods.

```javascript
  // ===========================================================================
  // TRANSFORM CONTROL INTERFACE (Optional - handlers opt-in by implementing)
  // ===========================================================================

  /**
   * Check if this handler supports transform controls
   * Handlers that support 3D object manipulation should return true
   * 
   * @returns {boolean} True if transform controls are supported
   */
  supportsTransformControl() {
    return false; // Default: not supported, handlers override to enable
  }

  /**
   * Get list of transformable actors/objects in the scene
   * Each object can be independently transformed
   * 
   * @param {string} instanceId - Instance to query
   * @returns {Array<{id: string, name: string, type: string}>} List of transformable objects
   */
  getTransformableActors(instanceId) {
    return [];
  }

  /**
   * Get current transform state for an actor
   * 
   * @param {string} instanceId - Instance ID
   * @param {string} actorId - Actor/object ID
   * @returns {TransformState|null} Current transform or null if not found
   * 
   * @typedef {Object} TransformState
   * @property {Object} position - { x: number, y: number, z: number } in world units
   * @property {Object} rotation - { x: number, y: number, z: number } in degrees
   * @property {Object} scale - { x: number, y: number, z: number } as multipliers
   */
  getActorTransform(instanceId, actorId) {
    return null;
  }

  /**
   * Set transform for an actor
   * Accepts partial updates - only specified properties are changed
   * 
   * @param {string} instanceId - Instance ID
   * @param {string} actorId - Actor/object ID
   * @param {Partial<TransformState>} transform - Transform updates to apply
   */
  setActorTransform(instanceId, actorId, transform) {
    // Override in handler
  }

  /**
   * Reset actor to its original transform (when first loaded)
   * 
   * @param {string} instanceId - Instance ID
   * @param {string} actorId - Actor/object ID
   */
  resetActorTransform(instanceId, actorId) {
    // Override in handler
  }

  /**
   * Reset all actors in instance to original transforms
   * 
   * @param {string} instanceId - Instance ID
   */
  resetAllTransforms(instanceId) {
    // Override in handler
  }

  /**
   * Get current rotation order (Euler angle convention)
   * 
   * @param {string} instanceId - Instance ID
   * @returns {string} Rotation order: 'XYZ', 'XZY', 'YXZ', 'YZX', 'ZXY', 'ZYX'
   */
  getRotationOrder(instanceId) {
    return 'XYZ';
  }

  /**
   * Set rotation order (Euler angle convention)
   * 
   * @param {string} instanceId - Instance ID
   * @param {string} order - Rotation order
   */
  setRotationOrder(instanceId, order) {
    // Override in handler
  }

  /**
   * Get full transform state for collaboration sync
   * 
   * @param {string} instanceId - Instance ID
   * @returns {Object|null} Serializable state object
   */
  getTransformState(instanceId) {
    return null;
  }

  /**
   * Apply transform state from collaboration sync
   * 
   * @param {string} instanceId - Instance ID
   * @param {Object} state - State object from getTransformState()
   */
  setTransformState(instanceId, state) {
    // Override in handler
  }
```

---

## PART 2: React Hook

### File: `src/ui/react/components/controls/TransformControl/useTransformControl.js`

**Action:** CREATE this file

```javascript
// src/ui/react/components/controls/TransformControl/useTransformControl.js
// Generic hook that bridges UI components to any handler's transform system

import { useState, useEffect, useCallback, useMemo } from 'react';
import { workspaceManager } from '@Core/instances/workspaceManager.js';
import { ui as log } from '@Utils/logger.js';

/**
 * useTransformControl
 * 
 * Generic hook that provides React bindings for transform controls.
 * Works with any handler that implements the transform interface.
 * 
 * @param {string} instanceId - Active instance ID
 * @returns {TransformControlState} State and callbacks for transform UI
 * 
 * @example
 * const {
 *   isSupported,
 *   actors,
 *   selectedActorId,
 *   transform,
 *   setRotation,
 *   setPosition,
 *   resetTransform,
 * } = useTransformControl(instanceId);
 */
export function useTransformControl(instanceId) {
  // =========================================================================
  // STATE
  // =========================================================================
  
  const [selectedActorId, setSelectedActorId] = useState(null);
  const [transform, setTransformState] = useState(null);
  const [rotationOrder, setRotationOrderState] = useState('XYZ');
  const [actors, setActors] = useState([]);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // =========================================================================
  // HANDLER ACCESS
  // =========================================================================

  // Get handler for this instance
  const handler = useMemo(() => {
    if (!instanceId) return null;
    const instance = workspaceManager.getInstance(instanceId);
    return instance?.handler || null;
  }, [instanceId]);

  // =========================================================================
  // INITIALIZATION
  // =========================================================================

  // Check if transform is supported and load actors
  useEffect(() => {
    setIsLoading(true);

    if (!handler) {
      setIsSupported(false);
      setActors([]);
      setSelectedActorId(null);
      setTransformState(null);
      setIsLoading(false);
      return;
    }

    // Check handler capability
    const supported = handler.supportsTransformControl?.() || false;
    setIsSupported(supported);

    if (supported) {
      // Load transformable actors
      const actorList = handler.getTransformableActors?.(instanceId) || [];
      setActors(actorList);
      
      // Auto-select first actor if none selected or current selection invalid
      if (actorList.length > 0) {
        const currentValid = actorList.some(a => a.id === selectedActorId);
        if (!currentValid) {
          setSelectedActorId(actorList[0].id);
        }
      } else {
        setSelectedActorId(null);
      }

      // Load rotation order preference
      const order = handler.getRotationOrder?.(instanceId) || 'XYZ';
      setRotationOrderState(order);
    } else {
      setActors([]);
      setSelectedActorId(null);
    }

    setIsLoading(false);
  }, [handler, instanceId]);

  // =========================================================================
  // LOAD TRANSFORM WHEN ACTOR CHANGES
  // =========================================================================

  useEffect(() => {
    if (!handler || !selectedActorId || !isSupported) {
      setTransformState(null);
      return;
    }

    const currentTransform = handler.getActorTransform?.(instanceId, selectedActorId);
    setTransformState(currentTransform);

    log.trace(`Loaded transform for actor ${selectedActorId}:`, currentTransform);
  }, [handler, instanceId, selectedActorId, isSupported]);

  // =========================================================================
  // TRANSFORM SETTERS
  // =========================================================================

  /**
   * Update rotation for a single axis
   */
  const setRotation = useCallback((axis, value) => {
    if (!handler || !selectedActorId) return;
    
    // Clamp to -180 to +180
    const clampedValue = Math.max(-180, Math.min(180, value));
    
    const newRotation = {
      ...transform?.rotation,
      [axis]: clampedValue
    };
    
    handler.setActorTransform?.(instanceId, selectedActorId, {
      rotation: newRotation
    });

    // Update local state immediately for responsive UI
    setTransformState(prev => ({
      ...prev,
      rotation: newRotation
    }));

    log.trace(`Set rotation.${axis} = ${clampedValue}`);
  }, [handler, instanceId, selectedActorId, transform]);

  /**
   * Update position for a single axis
   */
  const setPosition = useCallback((axis, value) => {
    if (!handler || !selectedActorId) return;
    
    const newPosition = {
      ...transform?.position,
      [axis]: value
    };
    
    handler.setActorTransform?.(instanceId, selectedActorId, {
      position: newPosition
    });

    setTransformState(prev => ({
      ...prev,
      position: newPosition
    }));

    log.trace(`Set position.${axis} = ${value}`);
  }, [handler, instanceId, selectedActorId, transform]);

  /**
   * Update scale for a single axis
   */
  const setScale = useCallback((axis, value) => {
    if (!handler || !selectedActorId) return;
    
    // Clamp scale to reasonable bounds
    const clampedValue = Math.max(0.01, Math.min(100, value));
    
    const newScale = {
      ...transform?.scale,
      [axis]: clampedValue
    };
    
    handler.setActorTransform?.(instanceId, selectedActorId, {
      scale: newScale
    });

    setTransformState(prev => ({
      ...prev,
      scale: newScale
    }));

    log.trace(`Set scale.${axis} = ${clampedValue}`);
  }, [handler, instanceId, selectedActorId, transform]);

  /**
   * Batch update multiple transform properties at once
   * More efficient than individual calls when changing multiple axes
   */
  const setTransform = useCallback((updates) => {
    if (!handler || !selectedActorId) return;
    
    handler.setActorTransform?.(instanceId, selectedActorId, updates);

    setTransformState(prev => ({
      ...prev,
      ...updates,
      rotation: updates.rotation ? { ...prev?.rotation, ...updates.rotation } : prev?.rotation,
      position: updates.position ? { ...prev?.position, ...updates.position } : prev?.position,
      scale: updates.scale ? { ...prev?.scale, ...updates.scale } : prev?.scale,
    }));

    log.trace('Batch transform update:', updates);
  }, [handler, instanceId, selectedActorId]);

  /**
   * Set all rotation axes to the same value
   */
  const setAllRotation = useCallback((value) => {
    if (!handler || !selectedActorId) return;
    
    const clampedValue = Math.max(-180, Math.min(180, value));
    const newRotation = { x: clampedValue, y: clampedValue, z: clampedValue };
    
    handler.setActorTransform?.(instanceId, selectedActorId, {
      rotation: newRotation
    });

    setTransformState(prev => ({
      ...prev,
      rotation: newRotation
    }));
  }, [handler, instanceId, selectedActorId]);

  /**
   * Set uniform scale (all axes same value)
   */
  const setUniformScale = useCallback((value) => {
    if (!handler || !selectedActorId) return;
    
    const clampedValue = Math.max(0.01, Math.min(100, value));
    const newScale = { x: clampedValue, y: clampedValue, z: clampedValue };
    
    handler.setActorTransform?.(instanceId, selectedActorId, {
      scale: newScale
    });

    setTransformState(prev => ({
      ...prev,
      scale: newScale
    }));
  }, [handler, instanceId, selectedActorId]);

  // =========================================================================
  // RESET FUNCTIONS
  // =========================================================================

  /**
   * Reset selected actor to original transform
   */
  const resetTransform = useCallback(() => {
    if (!handler || !selectedActorId) return;
    
    handler.resetActorTransform?.(instanceId, selectedActorId);
    
    // Reload transform state after reset
    const fresh = handler.getActorTransform?.(instanceId, selectedActorId);
    setTransformState(fresh);

    log.debug(`Reset transform for actor ${selectedActorId}`);
  }, [handler, instanceId, selectedActorId]);

  /**
   * Reset all actors to original transforms
   */
  const resetAllTransforms = useCallback(() => {
    if (!handler) return;
    
    handler.resetAllTransforms?.(instanceId);
    
    // Reload current actor's transform
    if (selectedActorId) {
      const fresh = handler.getActorTransform?.(instanceId, selectedActorId);
      setTransformState(fresh);
    }

    log.debug('Reset all transforms');
  }, [handler, instanceId, selectedActorId]);

  // =========================================================================
  // SETTINGS
  // =========================================================================

  /**
   * Change rotation order (Euler angle convention)
   */
  const setRotationOrder = useCallback((order) => {
    if (!handler) return;
    
    handler.setRotationOrder?.(instanceId, order);
    setRotationOrderState(order);

    log.debug(`Set rotation order to ${order}`);
  }, [handler, instanceId]);

  /**
   * Select a different actor
   */
  const selectActor = useCallback((actorId) => {
    if (!actors.some(a => a.id === actorId)) {
      log.warn(`Invalid actor ID: ${actorId}`);
      return;
    }
    setSelectedActorId(actorId);
  }, [actors]);

  // =========================================================================
  // REFRESH (for external updates)
  // =========================================================================

  /**
   * Refresh transform state from handler
   * Call this after external changes (e.g., collaboration sync)
   */
  const refresh = useCallback(() => {
    if (!handler || !selectedActorId) return;
    
    const fresh = handler.getActorTransform?.(instanceId, selectedActorId);
    setTransformState(fresh);
  }, [handler, instanceId, selectedActorId]);

  // =========================================================================
  // RETURN API
  // =========================================================================

  return {
    // State
    isSupported,
    isLoading,
    actors,
    selectedActorId,
    transform,
    rotationOrder,
    
    // Actor selection
    selectActor,
    
    // Individual axis setters
    setRotation,      // (axis: 'x'|'y'|'z', value: number) => void
    setPosition,      // (axis: 'x'|'y'|'z', value: number) => void  
    setScale,         // (axis: 'x'|'y'|'z', value: number) => void
    
    // Batch/convenience setters
    setTransform,     // (updates: Partial<TransformState>) => void
    setAllRotation,   // (value: number) => void
    setUniformScale,  // (value: number) => void
    
    // Reset functions
    resetTransform,
    resetAllTransforms,
    
    // Settings
    setRotationOrder,
    
    // Refresh
    refresh,
  };
}

export default useTransformControl;
```

---

## PART 3: React Component

### File: `src/ui/react/components/controls/TransformControl/TransformControl.jsx`

**Action:** CREATE this file

```jsx
// src/ui/react/components/controls/TransformControl/TransformControl.jsx
// Generic transform control panel with rotation, position, and scale sliders

import React, { useState, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useTransformControl } from './useTransformControl.js';
import './TransformControl.scss';

/**
 * TransformControl
 * 
 * Generic transform control panel that works with any handler implementing
 * the transform interface. Provides sliders for rotation, position, and scale.
 * 
 * @param {Object} props
 * @param {string} props.instanceId - Active instance ID
 * @param {boolean} [props.showPosition=true] - Show position controls
 * @param {boolean} [props.showRotation=true] - Show rotation controls
 * @param {boolean} [props.showScale=false] - Show scale controls
 * @param {boolean} [props.showActorSelector=true] - Show actor dropdown
 * @param {boolean} [props.compact=false] - Compact mode for mini toolbar
 * @param {string} [props.className] - Additional CSS class
 */
export function TransformControl({ 
  instanceId,
  showPosition = true,
  showRotation = true,
  showScale = false,
  showActorSelector = true,
  compact = false,
  className = '',
}) {
  const {
    isSupported,
    isLoading,
    actors,
    selectedActorId,
    transform,
    rotationOrder,
    selectActor,
    setRotation,
    setPosition,
    setScale,
    setAllRotation,
    setUniformScale,
    resetTransform,
    resetAllTransforms,
    setRotationOrder,
  } = useTransformControl(instanceId);

  const [activeTab, setActiveTab] = useState('rotation');
  const [linkScale, setLinkScale] = useState(true); // Uniform scale toggle

  // Loading state
  if (isLoading) {
    return (
      <div className={`transform-control transform-control--loading ${className}`}>
        <Icon name="loader" size={16} className="spin" />
        <span>Loading...</span>
      </div>
    );
  }

  // Not supported by this handler
  if (!isSupported) {
    return (
      <div className={`transform-control transform-control--unsupported ${className}`}>
        <Icon name="alert-circle" size={16} />
        <span>Transform not available for this view type</span>
      </div>
    );
  }

  // No actors to transform
  if (actors.length === 0) {
    return (
      <div className={`transform-control transform-control--empty ${className}`}>
        <Icon name="box" size={16} />
        <span>No objects to transform</span>
      </div>
    );
  }

  // Default values if transform not loaded
  const rotation = transform?.rotation || { x: 0, y: 0, z: 0 };
  const position = transform?.position || { x: 0, y: 0, z: 0 };
  const scale = transform?.scale || { x: 1, y: 1, z: 1 };

  // Handle scale with link option
  const handleScaleChange = (axis, value) => {
    if (linkScale) {
      setUniformScale(value);
    } else {
      setScale(axis, value);
    }
  };

  return (
    <div className={`transform-control ${compact ? 'transform-control--compact' : ''} ${className}`}>
      
      {/* Header */}
      {!compact && (
        <div className="transform-control__header">
          <Icon name="move-3d" size={16} />
          <span>Transform</span>
        </div>
      )}

      {/* Actor Selector */}
      {showActorSelector && actors.length > 1 && (
        <div className="transform-control__actor-select">
          <label>
            <Icon name="box" size={12} />
            <span>Object</span>
          </label>
          <select 
            value={selectedActorId || ''} 
            onChange={(e) => selectActor(e.target.value)}
          >
            {actors.map(actor => (
              <option key={actor.id} value={actor.id}>
                {actor.name || actor.id}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tab Switcher (for compact mode) */}
      {compact && (
        <div className="transform-control__tabs">
          {showRotation && (
            <button 
              className={`transform-control__tab ${activeTab === 'rotation' ? 'transform-control__tab--active' : ''}`}
              onClick={() => setActiveTab('rotation')}
              title="Rotation"
            >
              <Icon name="rotate-3d" size={14} />
            </button>
          )}
          {showPosition && (
            <button 
              className={`transform-control__tab ${activeTab === 'position' ? 'transform-control__tab--active' : ''}`}
              onClick={() => setActiveTab('position')}
              title="Position"
            >
              <Icon name="move" size={14} />
            </button>
          )}
          {showScale && (
            <button 
              className={`transform-control__tab ${activeTab === 'scale' ? 'transform-control__tab--active' : ''}`}
              onClick={() => setActiveTab('scale')}
              title="Scale"
            >
              <Icon name="maximize" size={14} />
            </button>
          )}
        </div>
      )}

      {/* Rotation Controls */}
      {showRotation && (!compact || activeTab === 'rotation') && (
        <TransformAxisGroup
          label="Rotation"
          icon="rotate-3d"
          axes={['x', 'y', 'z']}
          values={rotation}
          onChange={setRotation}
          min={-180}
          max={180}
          step={1}
          fineStep={0.1}
          unit="°"
          presets={[-90, -45, 0, 45, 90]}
          onPresetAll={setAllRotation}
          compact={compact}
        />
      )}

      {/* Position Controls */}
      {showPosition && (!compact || activeTab === 'position') && (
        <TransformAxisGroup
          label="Position"
          icon="move"
          axes={['x', 'y', 'z']}
          values={position}
          onChange={setPosition}
          min={-10000}
          max={10000}
          step={1}
          fineStep={0.1}
          unit=""
          presets={null}
          compact={compact}
        />
      )}

      {/* Scale Controls */}
      {showScale && (!compact || activeTab === 'scale') && (
        <div className="transform-axis-group">
          {!compact && (
            <div className="transform-axis-group__header">
              <Icon name="maximize" size={14} />
              <span>Scale</span>
              <button
                className={`transform-axis-group__link ${linkScale ? 'transform-axis-group__link--active' : ''}`}
                onClick={() => setLinkScale(!linkScale)}
                title={linkScale ? 'Uniform scale (linked)' : 'Independent scale (unlinked)'}
              >
                <Icon name={linkScale ? 'link' : 'unlink'} size={12} />
              </button>
            </div>
          )}
          
          <div className="transform-axis-group__sliders">
            {['x', 'y', 'z'].map(axis => (
              <TransformAxisSlider
                key={axis}
                axis={axis}
                value={scale[axis] || 1}
                onChange={(value) => handleScaleChange(axis, value)}
                min={0.01}
                max={10}
                step={0.1}
                fineStep={0.01}
                unit="×"
                disabled={linkScale && axis !== 'x'}
                compact={compact}
              />
            ))}
          </div>

          {!compact && (
            <div className="transform-axis-group__presets">
              {[0.25, 0.5, 1, 2, 4].map(preset => (
                <button
                  key={preset}
                  className={`transform-axis-group__preset ${scale.x === preset ? 'transform-axis-group__preset--active' : ''}`}
                  onClick={() => setUniformScale(preset)}
                  title={`Scale ${preset}×`}
                >
                  {preset}×
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions Footer */}
      <div className="transform-control__actions">
        <button 
          className="transform-control__reset"
          onClick={resetTransform}
          title="Reset to original orientation"
        >
          <Icon name="rotate-ccw" size={14} />
          {!compact && <span>Reset</span>}
        </button>
        
        {actors.length > 1 && (
          <button 
            className="transform-control__reset-all"
            onClick={resetAllTransforms}
            title="Reset all objects"
          >
            <Icon name="refresh-cw" size={14} />
            {!compact && <span>Reset All</span>}
          </button>
        )}
        
        {/* Rotation order setting */}
        {!compact && showRotation && (
          <select 
            className="transform-control__order"
            value={rotationOrder}
            onChange={(e) => setRotationOrder(e.target.value)}
            title="Rotation order (Euler convention)"
          >
            <option value="XYZ">XYZ</option>
            <option value="XZY">XZY</option>
            <option value="YXZ">YXZ</option>
            <option value="YZX">YZX</option>
            <option value="ZXY">ZXY</option>
            <option value="ZYX">ZYX</option>
          </select>
        )}
      </div>
    </div>
  );
}

/**
 * TransformAxisGroup
 * Renders X, Y, Z sliders for one transform type
 */
function TransformAxisGroup({
  label,
  icon,
  axes,
  values,
  onChange,
  min,
  max,
  step,
  fineStep,
  unit,
  presets,
  onPresetAll,
  compact,
}) {
  return (
    <div className="transform-axis-group">
      {!compact && (
        <div className="transform-axis-group__header">
          <Icon name={icon} size={14} />
          <span>{label}</span>
        </div>
      )}
      
      <div className="transform-axis-group__sliders">
        {axes.map(axis => (
          <TransformAxisSlider
            key={axis}
            axis={axis}
            value={values[axis] || 0}
            onChange={(value) => onChange(axis, value)}
            min={min}
            max={max}
            step={step}
            fineStep={fineStep}
            unit={unit}
            compact={compact}
          />
        ))}
      </div>

      {presets && !compact && (
        <div className="transform-axis-group__presets">
          {presets.map(preset => (
            <button
              key={preset}
              className="transform-axis-group__preset"
              onClick={() => onPresetAll ? onPresetAll(preset) : axes.forEach(a => onChange(a, preset))}
              title={`Set all to ${preset}${unit}`}
            >
              {preset}{unit}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * TransformAxisSlider
 * Single axis slider with label, range input, and number input
 */
function TransformAxisSlider({
  axis,
  value,
  onChange,
  min,
  max,
  step,
  fineStep,
  unit,
  disabled = false,
  compact = false,
}) {
  const [isFineMode, setIsFineMode] = useState(false);
  
  const axisColors = {
    x: 'var(--color-axis-x, #ef4444)', // Red
    y: 'var(--color-axis-y, #22c55e)', // Green  
    z: 'var(--color-axis-z, #3b82f6)', // Blue
  };

  const currentStep = isFineMode ? fineStep : step;
  const displayValue = typeof value === 'number' ? value.toFixed(isFineMode ? 2 : 1) : '0.0';

  const handleSliderChange = (e) => {
    if (disabled) return;
    onChange(parseFloat(e.target.value));
  };

  const handleInputChange = (e) => {
    if (disabled) return;
    const newValue = parseFloat(e.target.value);
    if (!isNaN(newValue)) {
      onChange(Math.max(min, Math.min(max, newValue)));
    }
  };

  const handleWheel = (e) => {
    if (disabled) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -currentStep : currentStep;
    onChange(Math.max(min, Math.min(max, value + delta)));
  };

  return (
    <div 
      className={`transform-axis-slider ${disabled ? 'transform-axis-slider--disabled' : ''}`}
      onDoubleClick={() => setIsFineMode(!isFineMode)}
      title={isFineMode ? 'Fine mode (double-click to toggle)' : 'Normal mode (double-click for fine)'}
    >
      <label 
        className="transform-axis-slider__label"
        style={{ color: axisColors[axis] }}
      >
        {axis.toUpperCase()}
      </label>
      
      <input
        type="range"
        className="transform-axis-slider__range"
        min={min}
        max={max}
        step={currentStep}
        value={value}
        onChange={handleSliderChange}
        onWheel={handleWheel}
        disabled={disabled}
        style={{ 
          '--thumb-color': axisColors[axis],
          '--track-fill': axisColors[axis],
        }}
      />
      
      <input
        type="number"
        className="transform-axis-slider__input"
        min={min}
        max={max}
        step={currentStep}
        value={displayValue}
        onChange={handleInputChange}
        onWheel={handleWheel}
        disabled={disabled}
      />
      
      <span className="transform-axis-slider__unit">{unit}</span>
      
      {isFineMode && (
        <span className="transform-axis-slider__fine-indicator" title="Fine mode active">
          F
        </span>
      )}
    </div>
  );
}

export default TransformControl;
```

---

## PART 4: Styles

### File: `src/ui/react/components/controls/TransformControl/TransformControl.scss`

**Action:** CREATE this file

```scss
// src/ui/react/components/controls/TransformControl/TransformControl.scss
// Styles for TransformControl component

@import '@Styles/theme';

// =============================================================================
// CSS CUSTOM PROPERTIES (for axis colors)
// =============================================================================

.transform-control {
  --color-axis-x: #ef4444; // Red
  --color-axis-y: #22c55e; // Green
  --color-axis-z: #3b82f6; // Blue
}

// =============================================================================
// MAIN CONTAINER
// =============================================================================

.transform-control {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  padding: $spacing-sm;
  background: rgba(0, 0, 0, 0.2);
  border-radius: $radius-md;
  
  // Header
  &__header {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    padding-bottom: $spacing-xs;
    border-bottom: 1px solid $color-border-subtle;
    color: $color-text-secondary;
    font-size: 12px;
    font-weight: $font-weight-semibold;
  }

  // States
  &--loading,
  &--unsupported,
  &--empty {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-sm;
    padding: $spacing-md;
    color: $color-text-muted;
    font-size: 11px;
    
    .spin {
      animation: spin 1s linear infinite;
    }
  }

  &--unsupported,
  &--empty {
    background: rgba(0, 0, 0, 0.1);
  }

  // Compact mode
  &--compact {
    padding: $spacing-xs;
    gap: $spacing-xs;
    
    .transform-axis-group {
      padding: $spacing-xs;
    }
    
    .transform-axis-slider {
      gap: $spacing-xs;
      
      &__input {
        width: 48px;
      }
    }
  }
}

// =============================================================================
// ACTOR SELECTOR
// =============================================================================

.transform-control__actor-select {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-xs;
  background: rgba(0, 0, 0, 0.15);
  border-radius: $radius-sm;
  
  label {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    color: $color-text-muted;
    font-size: 10px;
    white-space: nowrap;
  }
  
  select {
    flex: 1;
    padding: $spacing-xs $spacing-sm;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid $color-border-subtle;
    border-radius: $radius-xs;
    color: $color-text-primary;
    font-size: 11px;
    cursor: pointer;
    
    &:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba($color-accent-teal, 0.3);
    }
    
    &:focus {
      outline: none;
      border-color: $color-accent-teal;
    }
  }
}

// =============================================================================
// TAB SWITCHER (compact mode)
// =============================================================================

.transform-control__tabs {
  display: flex;
  gap: 2px;
  padding: 2px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: $radius-sm;
}

.transform-control__tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-xs;
  background: transparent;
  border: none;
  border-radius: $radius-xs;
  color: $color-text-muted;
  cursor: pointer;
  transition: all $transition-fast;
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: $color-text-secondary;
  }
  
  &--active {
    background: rgba($color-accent-teal, 0.15);
    color: $color-accent-teal;
  }
}

// =============================================================================
// AXIS GROUP (Rotation / Position / Scale section)
// =============================================================================

.transform-axis-group {
  padding: $spacing-sm;
  background: rgba(0, 0, 0, 0.15);
  border-radius: $radius-sm;
  
  &__header {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    margin-bottom: $spacing-sm;
    color: $color-text-secondary;
    font-size: 11px;
    font-weight: $font-weight-medium;
    
    span {
      flex: 1;
    }
  }
  
  &__link {
    padding: 2px 4px;
    background: transparent;
    border: 1px solid $color-border-subtle;
    border-radius: $radius-xs;
    color: $color-text-muted;
    cursor: pointer;
    transition: all $transition-fast;
    
    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    
    &--active {
      background: rgba($color-accent-teal, 0.15);
      border-color: rgba($color-accent-teal, 0.3);
      color: $color-accent-teal;
    }
  }
  
  &__sliders {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
  }
  
  &__presets {
    display: flex;
    gap: 4px;
    margin-top: $spacing-sm;
    flex-wrap: wrap;
  }
  
  &__preset {
    padding: 3px 8px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid $color-border-subtle;
    border-radius: $radius-xs;
    color: $color-text-muted;
    font-size: 9px;
    cursor: pointer;
    transition: all $transition-fast;
    
    &:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba($color-accent-teal, 0.3);
    }
    
    &--active {
      background: rgba($color-accent-teal, 0.15);
      border-color: rgba($color-accent-teal, 0.4);
      color: $color-accent-teal;
    }
  }
}

// =============================================================================
// AXIS SLIDER (individual X/Y/Z row)
// =============================================================================

.transform-axis-slider {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  
  &--disabled {
    opacity: 0.4;
    pointer-events: none;
  }
  
  &__label {
    width: 16px;
    font-size: 11px;
    font-weight: $font-weight-bold;
    text-align: center;
  }
  
  &__range {
    flex: 1;
    height: 4px;
    appearance: none;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    cursor: pointer;
    
    &::-webkit-slider-thumb {
      appearance: none;
      width: 12px;
      height: 12px;
      background: var(--thumb-color, $color-accent-teal);
      border-radius: 50%;
      cursor: pointer;
      transition: transform $transition-fast;
      
      &:hover {
        transform: scale(1.2);
      }
    }
    
    &::-moz-range-thumb {
      width: 12px;
      height: 12px;
      background: var(--thumb-color, $color-accent-teal);
      border: none;
      border-radius: 50%;
      cursor: pointer;
    }
    
    &:focus {
      outline: none;
      
      &::-webkit-slider-thumb {
        box-shadow: 0 0 0 3px rgba(var(--thumb-color, $color-accent-teal), 0.2);
      }
    }
  }
  
  &__input {
    width: 56px;
    padding: 2px 4px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid $color-border-subtle;
    border-radius: $radius-xs;
    color: $color-text-primary;
    font-size: 10px;
    font-family: $font-mono;
    text-align: right;
    
    &:hover {
      border-color: rgba($color-accent-teal, 0.3);
    }
    
    &:focus {
      outline: none;
      border-color: $color-accent-teal;
      background: rgba(0, 0, 0, 0.4);
    }
    
    // Hide spin buttons
    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    -moz-appearance: textfield;
  }
  
  &__unit {
    width: 12px;
    font-size: 9px;
    color: $color-text-muted;
  }
  
  &__fine-indicator {
    width: 14px;
    height: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba($color-accent-amber, 0.2);
    border-radius: $radius-xs;
    color: $color-accent-amber;
    font-size: 8px;
    font-weight: $font-weight-bold;
  }
}

// =============================================================================
// ACTIONS FOOTER
// =============================================================================

.transform-control__actions {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding-top: $spacing-sm;
  border-top: 1px solid $color-border-subtle;
}

.transform-control__reset,
.transform-control__reset-all {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-xs $spacing-sm;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid $color-border-subtle;
  border-radius: $radius-sm;
  color: $color-text-secondary;
  font-size: 10px;
  cursor: pointer;
  transition: all $transition-fast;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba($color-accent-teal, 0.3);
    color: $color-text-primary;
  }
}

.transform-control__order {
  margin-left: auto;
  padding: 2px $spacing-xs;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid $color-border-subtle;
  border-radius: $radius-xs;
  color: $color-text-muted;
  font-size: 9px;
  cursor: pointer;
  
  &:hover {
    border-color: rgba($color-accent-teal, 0.3);
  }
  
  &:focus {
    outline: none;
    border-color: $color-accent-teal;
  }
}

// =============================================================================
// ANIMATIONS
// =============================================================================

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

---

## PART 5: Index Export

### File: `src/ui/react/components/controls/TransformControl/index.js`

**Action:** CREATE this file

```javascript
// src/ui/react/components/controls/TransformControl/index.js
// Public exports for TransformControl

export { TransformControl, default } from './TransformControl.jsx';
export { useTransformControl } from './useTransformControl.js';
```

---

## PART 6: VTK Transform Adapter

### File: `src/core/instances/types/vtk/transforms/VTKTransformAdapter.js`

**Action:** CREATE this file and directory

```javascript
// src/core/instances/types/vtk/transforms/VTKTransformAdapter.js
// VTK-specific implementation of the transform interface

import { instance as log } from '@Utils/logger.js';

/**
 * VTKTransformAdapter
 * 
 * VTK-specific implementation of the transform control interface.
 * Handles Euler angle operations and VTK actor transform management.
 * 
 * This adapter connects the generic TransformControl UI to VTK's
 * specific actor transform API.
 * 
 * ARCHITECTURE:
 * - Per-instance storage (no global singletons)
 * - Stores original transforms for reset functionality
 * - Provides serialization for collaboration sync
 */
export class VTKTransformAdapter {
  constructor() {
    // Per-instance storage
    // Maps instanceId → { actors: Map<actorId, ActorData>, sceneObjects, rotationOrder }
    this.instances = new Map();
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /**
   * Initialize transform tracking for an instance
   * Called by VTKInstanceHandler after scene setup
   * 
   * @param {string} instanceId - Instance ID
   * @param {Object} sceneObjects - VTK scene objects { renderer, renderWindow, ... }
   */
  initialize(instanceId, sceneObjects) {
    if (this.instances.has(instanceId)) {
      log.warn(`Transform adapter already initialized for ${instanceId}`);
      return;
    }

    log.debug(`Initializing transform adapter for ${instanceId}`);

    const actors = new Map();
    
    // Find all actors in the scene
    const renderer = sceneObjects.renderer;
    if (!renderer) {
      log.error('No renderer available for transform adapter');
      return;
    }

    const vtkActors = renderer.getActors();

    vtkActors.forEach((actor, index) => {
      const actorId = `actor-${index}`;
      
      // Store original transform for reset functionality
      const originalTransform = {
        position: [...actor.getPosition()],
        orientation: [...actor.getOrientation()], // VTK uses orientation (degrees)
        scale: [...actor.getScale()],
      };

      actors.set(actorId, {
        actor,
        name: this._getActorName(actor, index, sceneObjects),
        originalTransform,
      });

      log.trace(`Registered actor ${actorId}: ${actors.get(actorId).name}`);
    });

    this.instances.set(instanceId, {
      actors,
      sceneObjects,
      rotationOrder: 'XYZ', // Default rotation order
    });

    log.debug(`Transform adapter initialized with ${actors.size} actors`);
  }

  /**
   * Check if adapter is initialized for an instance
   */
  isInitialized(instanceId) {
    return this.instances.has(instanceId);
  }

  /**
   * Cleanup transform adapter for an instance
   * Called when instance is destroyed
   */
  cleanup(instanceId) {
    if (!this.instances.has(instanceId)) {
      return;
    }

    this.instances.delete(instanceId);
    log.debug(`Transform adapter cleaned up for ${instanceId}`);
  }

  /**
   * Cleanup all instances (app shutdown)
   */
  destroy() {
    this.instances.clear();
    log.debug('Transform adapter destroyed');
  }

  // ===========================================================================
  // ACTOR QUERIES
  // ===========================================================================

  /**
   * Get list of transformable actors for an instance
   * 
   * @param {string} instanceId - Instance ID
   * @returns {Array<{id: string, name: string, type: string}>}
   */
  getTransformableActors(instanceId) {
    const data = this.instances.get(instanceId);
    if (!data) return [];

    return Array.from(data.actors.entries()).map(([id, actorData]) => ({
      id,
      name: actorData.name,
      type: 'vtk-actor',
    }));
  }

  /**
   * Get actor count for an instance
   */
  getActorCount(instanceId) {
    const data = this.instances.get(instanceId);
    return data ? data.actors.size : 0;
  }

  // ===========================================================================
  // TRANSFORM GETTERS
  // ===========================================================================

  /**
   * Get current transform for an actor
   * Converts VTK's array format to our object format
   * 
   * @param {string} instanceId - Instance ID
   * @param {string} actorId - Actor ID
   * @returns {TransformState|null}
   */
  getActorTransform(instanceId, actorId) {
    const data = this.instances.get(instanceId);
    if (!data) {
      log.warn(`No transform data for instance ${instanceId}`);
      return null;
    }

    const actorData = data.actors.get(actorId);
    if (!actorData) {
      log.warn(`No actor ${actorId} in instance ${instanceId}`);
      return null;
    }

    const { actor } = actorData;

    // VTK uses [x, y, z] arrays
    const position = actor.getPosition();
    const orientation = actor.getOrientation(); // Degrees
    const scale = actor.getScale();

    return {
      position: { x: position[0], y: position[1], z: position[2] },
      rotation: { x: orientation[0], y: orientation[1], z: orientation[2] },
      scale: { x: scale[0], y: scale[1], z: scale[2] },
    };
  }

  /**
   * Get original (initial) transform for an actor
   */
  getOriginalTransform(instanceId, actorId) {
    const data = this.instances.get(instanceId);
    if (!data) return null;

    const actorData = data.actors.get(actorId);
    if (!actorData) return null;

    const { originalTransform } = actorData;

    return {
      position: { 
        x: originalTransform.position[0], 
        y: originalTransform.position[1], 
        z: originalTransform.position[2] 
      },
      rotation: { 
        x: originalTransform.orientation[0], 
        y: originalTransform.orientation[1], 
        z: originalTransform.orientation[2] 
      },
      scale: { 
        x: originalTransform.scale[0], 
        y: originalTransform.scale[1], 
        z: originalTransform.scale[2] 
      },
    };
  }

  // ===========================================================================
  // TRANSFORM SETTERS
  // ===========================================================================

  /**
   * Set transform for an actor
   * Accepts partial updates - only specified properties are changed
   * 
   * @param {string} instanceId - Instance ID
   * @param {string} actorId - Actor ID
   * @param {Partial<TransformState>} transform - Transform updates
   */
  setActorTransform(instanceId, actorId, transform) {
    const data = this.instances.get(instanceId);
    if (!data) {
      log.warn(`Cannot set transform: no data for ${instanceId}`);
      return;
    }

    const actorData = data.actors.get(actorId);
    if (!actorData) {
      log.warn(`Cannot set transform: no actor ${actorId}`);
      return;
    }

    const { actor } = actorData;
    const { sceneObjects } = data;

    // Apply rotation if provided
    if (transform.rotation) {
      const { x, y, z } = transform.rotation;
      const currentOrientation = actor.getOrientation();
      
      actor.setOrientation(
        x !== undefined ? x : currentOrientation[0],
        y !== undefined ? y : currentOrientation[1],
        z !== undefined ? z : currentOrientation[2]
      );
      
      log.trace(`Set rotation: [${actor.getOrientation().join(', ')}]`);
    }

    // Apply position if provided
    if (transform.position) {
      const { x, y, z } = transform.position;
      const currentPosition = actor.getPosition();
      
      actor.setPosition(
        x !== undefined ? x : currentPosition[0],
        y !== undefined ? y : currentPosition[1],
        z !== undefined ? z : currentPosition[2]
      );
      
      log.trace(`Set position: [${actor.getPosition().join(', ')}]`);
    }

    // Apply scale if provided
    if (transform.scale) {
      const { x, y, z } = transform.scale;
      const currentScale = actor.getScale();
      
      actor.setScale(
        x !== undefined ? x : currentScale[0],
        y !== undefined ? y : currentScale[1],
        z !== undefined ? z : currentScale[2]
      );
      
      log.trace(`Set scale: [${actor.getScale().join(', ')}]`);
    }

    // Render to show changes
    if (sceneObjects.renderWindow) {
      sceneObjects.renderWindow.render();
    }
  }

  /**
   * Reset actor to original transform (when first loaded)
   * 
   * @param {string} instanceId - Instance ID
   * @param {string} actorId - Actor ID
   */
  resetActorTransform(instanceId, actorId) {
    const data = this.instances.get(instanceId);
    if (!data) return;

    const actorData = data.actors.get(actorId);
    if (!actorData) return;

    const { actor, originalTransform } = actorData;
    const { sceneObjects } = data;

    // Restore original values
    actor.setPosition(...originalTransform.position);
    actor.setOrientation(...originalTransform.orientation);
    actor.setScale(...originalTransform.scale);

    // Render to show changes
    if (sceneObjects.renderWindow) {
      sceneObjects.renderWindow.render();
    }

    log.debug(`Reset transform for actor ${actorId}`);
  }

  /**
   * Reset all actors in instance to original transforms
   * 
   * @param {string} instanceId - Instance ID
   */
  resetAllTransforms(instanceId) {
    const data = this.instances.get(instanceId);
    if (!data) return;

    data.actors.forEach((actorData, actorId) => {
      const { actor, originalTransform } = actorData;
      
      actor.setPosition(...originalTransform.position);
      actor.setOrientation(...originalTransform.orientation);
      actor.setScale(...originalTransform.scale);
    });

    // Single render after all updates
    if (data.sceneObjects.renderWindow) {
      data.sceneObjects.renderWindow.render();
    }

    log.debug(`Reset all transforms for instance ${instanceId}`);
  }

  // ===========================================================================
  // ROTATION ORDER
  // ===========================================================================

  /**
   * Get current rotation order (Euler convention)
   */
  getRotationOrder(instanceId) {
    const data = this.instances.get(instanceId);
    return data?.rotationOrder || 'XYZ';
  }

  /**
   * Set rotation order
   * Note: VTK.js uses XYZ intrinsic rotations by default.
   * Changing this would require matrix recalculation for other conventions.
   * For now, we track it but don't change VTK's behavior.
   */
  setRotationOrder(instanceId, order) {
    const data = this.instances.get(instanceId);
    if (!data) return;

    // Validate order
    const validOrders = ['XYZ', 'XZY', 'YXZ', 'YZX', 'ZXY', 'ZYX'];
    if (!validOrders.includes(order)) {
      log.warn(`Invalid rotation order: ${order}`);
      return;
    }

    data.rotationOrder = order;
    log.debug(`Set rotation order to ${order} for ${instanceId}`);
    
    // Note: Actually implementing different rotation orders in VTK
    // would require building custom rotation matrices. VTK's 
    // setOrientation() uses XYZ order internally.
  }

  // ===========================================================================
  // COLLABORATION SYNC
  // ===========================================================================

  /**
   * Get full transform state for collaboration sync
   * Returns serializable object that can be sent via Y.js
   * 
   * @param {string} instanceId - Instance ID
   * @returns {Object|null} Serializable state
   */
  getState(instanceId) {
    const data = this.instances.get(instanceId);
    if (!data) return null;

    const transforms = {};
    data.actors.forEach((actorData, actorId) => {
      transforms[actorId] = this.getActorTransform(instanceId, actorId);
    });

    return {
      transforms,
      rotationOrder: data.rotationOrder,
      version: 1, // For future compatibility
    };
  }

  /**
   * Apply transform state from collaboration sync
   * 
   * @param {string} instanceId - Instance ID
   * @param {Object} state - State from getState()
   */
  setState(instanceId, state) {
    if (!state) return;

    const data = this.instances.get(instanceId);
    if (!data) {
      log.warn(`Cannot apply state: no data for ${instanceId}`);
      return;
    }

    // Apply transforms
    if (state.transforms) {
      Object.entries(state.transforms).forEach(([actorId, transform]) => {
        if (data.actors.has(actorId)) {
          this.setActorTransform(instanceId, actorId, transform);
        }
      });
    }

    // Apply rotation order
    if (state.rotationOrder) {
      this.setRotationOrder(instanceId, state.rotationOrder);
    }

    log.debug(`Applied transform state for ${instanceId}`);
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  /**
   * Generate a user-friendly name for an actor
   * Tries to extract meaningful info from the actor's data
   * 
   * @private
   */
  _getActorName(actor, index, sceneObjects) {
    // Try to get name from mapper's input data
    try {
      const mapper = actor.getMapper?.();
      const inputData = mapper?.getInputData?.();
      
      if (inputData) {
        // Check field data for name array
        const fieldData = inputData.getFieldData?.();
        if (fieldData) {
          const nameArray = fieldData.getArrayByName?.('Name');
          if (nameArray) {
            const name = nameArray.getData()[0];
            if (name && typeof name === 'string') {
              return name;
            }
          }
        }
      }
    } catch (e) {
      // Ignore errors from accessing data
    }

    // Try to use filename if available in scene metadata
    if (sceneObjects.metadata?.filename) {
      const filename = sceneObjects.metadata.filename;
      const baseName = filename.split('/').pop().split('.')[0];
      if (index === 0) {
        return baseName;
      }
      return `${baseName} (${index + 1})`;
    }

    // Fallback to generic name
    return `Object ${index + 1}`;
  }

  /**
   * Re-scan scene for new actors
   * Call this if actors are added/removed after initialization
   */
  rescanActors(instanceId) {
    const data = this.instances.get(instanceId);
    if (!data) return;

    const { sceneObjects } = data;
    const renderer = sceneObjects.renderer;
    const currentVtkActors = renderer.getActors();

    // Find new actors not in our map
    let nextIndex = data.actors.size;
    
    currentVtkActors.forEach((actor) => {
      // Check if we already have this actor
      let found = false;
      data.actors.forEach((actorData) => {
        if (actorData.actor === actor) {
          found = true;
        }
      });

      if (!found) {
        const actorId = `actor-${nextIndex}`;
        
        data.actors.set(actorId, {
          actor,
          name: this._getActorName(actor, nextIndex, sceneObjects),
          originalTransform: {
            position: [...actor.getPosition()],
            orientation: [...actor.getOrientation()],
            scale: [...actor.getScale()],
          },
        });

        nextIndex++;
        log.debug(`Added new actor ${actorId}`);
      }
    });
  }
}

// Singleton export
export const vtkTransformAdapter = new VTKTransformAdapter();
```

---

## PART 7: VTKInstanceHandler Integration

### File: `src/core/instances/types/vtk/VTKInstanceHandler.js`

**Action:** MODIFY this file - Add the following integrations

#### 7a. Add Import at Top of File

Find the imports section and add:

```javascript
import { vtkTransformAdapter } from './transforms/VTKTransformAdapter.js';
```

#### 7b. Add to initialize() Method

Find the `initialize()` method. After the scene is set up (after actors are added to renderer), add:

```javascript
    // Initialize transform adapter for this instance
    vtkTransformAdapter.initialize(instanceId, sceneObjects);
```

#### 7c. Add to cleanup() Method

Find the `cleanup()` method and add:

```javascript
    // Cleanup transform adapter
    vtkTransformAdapter.cleanup(instanceId);
```

#### 7d. Add Interface Methods to the Class

Add these methods to the `VTKInstanceHandler` class:

```javascript
  // ===========================================================================
  // TRANSFORM CONTROL INTERFACE IMPLEMENTATION
  // ===========================================================================

  /**
   * VTK supports transform controls
   */
  supportsTransformControl() {
    return true;
  }

  /**
   * Get transformable actors from the transform adapter
   */
  getTransformableActors(instanceId) {
    return vtkTransformAdapter.getTransformableActors(instanceId);
  }

  /**
   * Get current transform for an actor
   */
  getActorTransform(instanceId, actorId) {
    return vtkTransformAdapter.getActorTransform(instanceId, actorId);
  }

  /**
   * Set transform for an actor
   */
  setActorTransform(instanceId, actorId, transform) {
    vtkTransformAdapter.setActorTransform(instanceId, actorId, transform);
    
    // Emit update for UI refresh
    this._emitToolsUpdate(instanceId);
  }

  /**
   * Reset actor to original transform
   */
  resetActorTransform(instanceId, actorId) {
    vtkTransformAdapter.resetActorTransform(instanceId, actorId);
    this._emitToolsUpdate(instanceId);
  }

  /**
   * Reset all actors to original transforms
   */
  resetAllTransforms(instanceId) {
    vtkTransformAdapter.resetAllTransforms(instanceId);
    this._emitToolsUpdate(instanceId);
  }

  /**
   * Get rotation order preference
   */
  getRotationOrder(instanceId) {
    return vtkTransformAdapter.getRotationOrder(instanceId);
  }

  /**
   * Set rotation order preference
   */
  setRotationOrder(instanceId, order) {
    vtkTransformAdapter.setRotationOrder(instanceId, order);
  }

  /**
   * Get transform state for collaboration sync
   */
  getTransformState(instanceId) {
    return vtkTransformAdapter.getState(instanceId);
  }

  /**
   * Apply transform state from collaboration sync
   */
  setTransformState(instanceId, state) {
    vtkTransformAdapter.setState(instanceId, state);
  }
```

#### 7e. Add Tool to _createTools() Method (Optional - for toolbar button)

Find the `_createTools()` method. Add a new tool entry for the transform control:

```javascript
    // Add to the widgets/tools section
    tools.push({
      id: "transform",
      type: "menu",
      icon: "move-3d",
      label: "Transform",
      description: caps.hasData
        ? "Rotate, position, and scale objects"
        : "Transform requires loaded geometry",
      disabled: !caps.hasData,
      options: [
        {
          type: "header",
          label: "Transform Controls",
        },
        {
          type: "component",
          id: "transform-control",
          component: "TransformControl",
          props: {
            instanceId,
            showRotation: true,
            showPosition: true,
            showScale: true,
            compact: true,
          },
        },
      ],
    });
```

---

## PART 8: README Documentation

### File: `src/core/instances/types/vtk/transforms/README.md`

**Action:** CREATE this file

```markdown
# VTK Transform System

This directory contains the VTK-specific implementation of the transform control interface.

## Architecture

The transform system follows a generic-to-specific pattern:

```
TransformControl (Generic UI)
        │
        ▼
useTransformControl (Generic Hook)
        │
        ▼
InstanceTypeHandler Interface
        │
        ▼
VTKTransformAdapter (VTK-specific)
        │
        ▼
VTK Actor API
```

## Files

- **VTKTransformAdapter.js** - VTK-specific transform logic
  - Manages per-instance actor tracking
  - Converts between generic format and VTK arrays
  - Stores original transforms for reset
  - Provides collaboration sync state

## Usage in VTKInstanceHandler

```javascript
import { vtkTransformAdapter } from './transforms/VTKTransformAdapter.js';

// In initialize()
vtkTransformAdapter.initialize(instanceId, sceneObjects);

// In cleanup()
vtkTransformAdapter.cleanup(instanceId);

// Interface methods delegate to adapter
supportsTransformControl() { return true; }
getTransformableActors(id) { return vtkTransformAdapter.getTransformableActors(id); }
// etc.
```

## Transform State Format

```javascript
{
  position: { x: number, y: number, z: number },  // World units
  rotation: { x: number, y: number, z: number },  // Degrees (-180 to +180)
  scale: { x: number, y: number, z: number },     // Multiplier (1.0 = original)
}
```

## Collaboration Sync

The adapter provides `getState()` and `setState()` methods for Y.js synchronization:

```javascript
// Get serializable state
const state = vtkTransformAdapter.getState(instanceId);
yMap.set('transforms', state);

// Apply state from other users
yMap.observe((event) => {
  const state = yMap.get('transforms');
  vtkTransformAdapter.setState(instanceId, state);
});
```

## Rotation Order

VTK uses XYZ intrinsic rotations internally. The `rotationOrder` setting is tracked
for UI purposes but doesn't change VTK's behavior. Implementing true rotation order
support would require custom matrix construction.

## Adding Transform Support to Other Handlers

1. Create a similar adapter in `src/core/instances/types/[type]/transforms/`
2. Implement the interface methods in your handler
3. Return `true` from `supportsTransformControl()`
4. The generic UI will automatically work with your handler
```

### File: `src/ui/react/components/controls/TransformControl/README.md`

**Action:** CREATE this file

```markdown
# TransformControl Component

Generic transform control panel for 3D object manipulation.

## Features

- **Rotation** - X, Y, Z axis sliders (-180° to +180°)
- **Position** - X, Y, Z axis sliders (world units)
- **Scale** - X, Y, Z with uniform scale link option
- **Actor Selection** - Choose which object to transform
- **Reset** - Return to original orientation
- **Rotation Order** - XYZ, XZY, YXZ, YZX, ZXY, ZYX options
- **Fine Mode** - Double-click slider for precise adjustment

## Usage

```jsx
import { TransformControl } from '@UI/react/components/controls/TransformControl';

// Full panel in left sidebar
<TransformControl 
  instanceId={activeInstanceId}
  showRotation={true}
  showPosition={true}
  showScale={true}
/>

// Compact mode in toolbar
<TransformControl 
  instanceId={activeInstanceId}
  compact={true}
/>
```

## Hook Usage

```jsx
import { useTransformControl } from '@UI/react/components/controls/TransformControl';

function MyComponent({ instanceId }) {
  const {
    isSupported,
    actors,
    selectedActorId,
    transform,
    setRotation,
    setPosition,
    resetTransform,
  } = useTransformControl(instanceId);

  if (!isSupported) return null;

  return (
    <button onClick={() => setRotation('x', 45)}>
      Rotate X 45°
    </button>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| instanceId | string | required | Active instance ID |
| showRotation | boolean | true | Show rotation sliders |
| showPosition | boolean | true | Show position sliders |
| showScale | boolean | false | Show scale sliders |
| showActorSelector | boolean | true | Show object dropdown |
| compact | boolean | false | Compact mode for toolbar |
| className | string | '' | Additional CSS class |

## Handler Requirements

The transform control works with any handler that implements:

- `supportsTransformControl()` → `true`
- `getTransformableActors(instanceId)`
- `getActorTransform(instanceId, actorId)`
- `setActorTransform(instanceId, actorId, transform)`
- `resetActorTransform(instanceId, actorId)`

See `InstanceTypeInterface.js` for full interface documentation.
```

---

## Testing Steps

After implementation, test with these steps:

1. **Load a VTK model** - Open a .vtp or other supported file
2. **Open Instance Tools** - Check that Transform appears in the left panel
3. **Test rotation** - Drag X, Y, Z sliders and verify model rotates
4. **Test position** - Move the model in 3D space
5. **Test scale** - Verify uniform and non-uniform scale
6. **Test reset** - Click reset and verify model returns to original
7. **Test actor selector** - If multiple objects, switch between them
8. **Test fine mode** - Double-click slider, verify smaller step size
9. **Test compact mode** - Verify toolbar widget works

---

## Summary

| Action | File | Description |
|--------|------|-------------|
| MODIFY | `src/core/instances/types/InstanceTypeInterface.js` | Add transform interface methods |
| CREATE | `src/ui/react/components/controls/TransformControl/useTransformControl.js` | Generic hook |
| CREATE | `src/ui/react/components/controls/TransformControl/TransformControl.jsx` | UI component |
| CREATE | `src/ui/react/components/controls/TransformControl/TransformControl.scss` | Styles |
| CREATE | `src/ui/react/components/controls/TransformControl/index.js` | Exports |
| CREATE | `src/core/instances/types/vtk/transforms/VTKTransformAdapter.js` | VTK adapter |
| MODIFY | `src/core/instances/types/vtk/VTKInstanceHandler.js` | Integrate adapter |
| CREATE | `src/core/instances/types/vtk/transforms/README.md` | Documentation |
| CREATE | `src/ui/react/components/controls/TransformControl/README.md` | Documentation |

Total: 7 new files, 2 modified files
