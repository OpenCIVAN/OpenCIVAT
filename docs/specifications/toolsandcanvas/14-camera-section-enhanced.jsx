import React, { useState, useRef, useEffect, useCallback } from 'react';

// =============================================================================
// DESIGN: Camera Section (Enhanced with Animation)
// =============================================================================
// Builds on existing:
// - vtkInstanceTools.js: setCameraView(), getCameraState(), setCameraState()
// - cameraUtils.js: captureCameraState(), applyCameraState(), interpolateCameraState()
// - VTKInstanceHandler: _initialCameraState for reset
// - useBookmarks: Full bookmark system
//
// NEW features:
// 1. Animated flyTo() with easing + duration
// 2. "Set as Reset Point" button
// 3. Animation settings (toggle, duration, easing)
// 4. Animation presets (orbit, tumble)
// =============================================================================

const tokens = {
  colors: {
    bg: { 
      primary: '#0a0a0f', 
      secondary: '#12121a', 
      tertiary: '#1a1a24', 
      glass: 'rgba(255,255,255,0.03)',
    },
    border: { subtle: 'rgba(255,255,255,0.06)', default: 'rgba(255,255,255,0.1)' },
    text: { primary: '#ffffff', secondary: 'rgba(255,255,255,0.7)', muted: 'rgba(255,255,255,0.4)' },
    accent: { 
      purple: '#a855f7', blue: '#3b82f6', cyan: '#22d3ee', green: '#22c55e', 
      amber: '#f59e0b', pink: '#ec4899', red: '#ef4444', teal: '#14b8a6',
      orange: '#f97316',
    },
  },
};

// =============================================================================
// EASING FUNCTIONS
// =============================================================================

const EASING_FUNCTIONS = {
  linear: t => t,
  easeInOut: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  easeOut: t => 1 - Math.pow(1 - t, 3),
  easeIn: t => t * t * t,
  bounce: t => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

const EASING_OPTIONS = [
  { id: 'easeInOut', label: 'Ease In/Out', icon: '∿' },
  { id: 'easeOut', label: 'Ease Out', icon: '⌒' },
  { id: 'easeIn', label: 'Ease In', icon: '⌓' },
  { id: 'linear', label: 'Linear', icon: '/' },
  { id: 'bounce', label: 'Bounce', icon: '⌢' },
];

// =============================================================================
// STANDARD VIEW PRESETS
// =============================================================================

const STANDARD_VIEWS = [
  { id: 'isometric', label: 'Iso', icon: '◇', shortcut: '1' },
  { id: 'top', label: 'Top', icon: '⬆', shortcut: '2' },
  null,
  { id: 'left', label: 'Left', icon: '⬅', shortcut: '3' },
  { id: 'reset', label: 'Reset', icon: '⟲', shortcut: 'Home', special: true },
  { id: 'right', label: 'Right', icon: '➡', shortcut: '4' },
  { id: 'front', label: 'Front', icon: '◉', shortcut: '5' },
  { id: 'bottom', label: 'Bot', icon: '⬇', shortcut: '6' },
  { id: 'back', label: 'Back', icon: '○', shortcut: '7' },
];

// =============================================================================
// ANIMATION PRESETS
// =============================================================================

const ANIMATION_PRESETS = [
  { 
    id: 'orbit-h', 
    icon: '↻', 
    label: 'Orbit', 
    description: '360° horizontal rotation',
    defaultDuration: 8000,
  },
  { 
    id: 'tumble', 
    icon: '🎲', 
    label: 'Tumble', 
    description: 'Random gentle rotation',
    defaultDuration: 10000,
  },
  { 
    id: 'rock', 
    icon: '↔', 
    label: 'Rock', 
    description: '±30° back and forth',
    defaultDuration: 4000,
  },
];

// =============================================================================
// MOCK BOOKMARKS (would come from useBookmarks hook)
// =============================================================================

const MOCK_BOOKMARKS = [
  { id: 'bm-1', name: 'Tumor View', color: tokens.colors.accent.pink, isPinned: true },
  { id: 'bm-2', name: 'Overview', color: tokens.colors.accent.cyan, isPinned: false },
  { id: 'bm-3', name: 'Detail', color: tokens.colors.accent.green, isPinned: false },
];

// =============================================================================
// TOOLTIP
// =============================================================================

function Tooltip({ children, content, shortcut }) {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div 
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: 6,
          padding: '6px 10px',
          background: tokens.colors.bg.secondary,
          border: `1px solid ${tokens.colors.border.default}`,
          borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          whiteSpace: 'nowrap',
          zIndex: 1000,
          pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 10, color: tokens.colors.text.primary }}>{content}</div>
          {shortcut && (
            <div style={{ fontSize: 9, color: tokens.colors.text.muted, fontFamily: 'monospace', marginTop: 2 }}>
              {shortcut}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// TOGGLE SWITCH
// =============================================================================

function ToggleSwitch({ checked, onChange, size = 'sm' }) {
  const sizes = {
    sm: { width: 32, height: 18, knob: 14 },
    md: { width: 40, height: 22, knob: 18 },
  };
  const s = sizes[size];
  
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: s.width,
        height: s.height,
        borderRadius: s.height / 2,
        border: 'none',
        background: checked ? tokens.colors.accent.teal : tokens.colors.bg.tertiary,
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
      }}
    >
      <div style={{
        position: 'absolute',
        top: (s.height - s.knob) / 2,
        left: checked ? s.width - s.knob - 2 : 2,
        width: s.knob,
        height: s.knob,
        borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  );
}

// =============================================================================
// STANDARD VIEWS GRID
// =============================================================================

function StandardViewsGrid({ onSelectView, isAnimating }) {
  const [hoveredView, setHoveredView] = useState(null);
  
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: 4, 
        maxWidth: 160, 
        margin: '0 auto',
      }}>
        {STANDARD_VIEWS.map((view, i) => view ? (
          <Tooltip key={view.id} content={view.label} shortcut={view.shortcut}>
            <button
              onClick={() => !isAnimating && onSelectView(view.id)}
              onMouseEnter={() => setHoveredView(view.id)}
              onMouseLeave={() => setHoveredView(null)}
              disabled={isAnimating}
              style={{
                padding: '6px 4px',
                borderRadius: 4,
                background: view.special 
                  ? tokens.colors.accent.cyan + '20' 
                  : hoveredView === view.id
                    ? tokens.colors.bg.tertiary
                    : tokens.colors.bg.glass,
                border: `1px solid ${view.special ? tokens.colors.accent.cyan + '40' : tokens.colors.border.subtle}`,
                color: view.special ? tokens.colors.accent.cyan : tokens.colors.text.secondary,
                fontSize: 9,
                cursor: isAnimating ? 'not-allowed' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                transition: 'all 0.15s',
                opacity: isAnimating ? 0.5 : 1,
              }}
            >
              <span style={{ fontSize: 12 }}>{view.icon}</span>
              <span>{view.label}</span>
            </button>
          </Tooltip>
        ) : <div key={i} />)}
      </div>
    </div>
  );
}

// =============================================================================
// ANIMATION SETTINGS
// =============================================================================

function AnimationSettings({ 
  animateTransitions, 
  setAnimateTransitions, 
  duration, 
  setDuration,
  easing,
  setEasing,
  isExpanded,
  setIsExpanded,
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      {/* Toggle Row */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: isExpanded ? 8 : 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ToggleSwitch checked={animateTransitions} onChange={setAnimateTransitions} />
          <span style={{ fontSize: 10, color: tokens.colors.text.secondary }}>
            Animate
          </span>
        </div>
        
        {animateTransitions && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              padding: '2px 6px',
              borderRadius: 3,
              border: 'none',
              background: isExpanded ? tokens.colors.accent.purple + '20' : 'transparent',
              color: tokens.colors.text.muted,
              fontSize: 9,
              cursor: 'pointer',
            }}
          >
            {isExpanded ? '▲ Less' : '▼ More'}
          </button>
        )}
      </div>
      
      {/* Expanded Settings */}
      {animateTransitions && isExpanded && (
        <div style={{
          padding: 10,
          background: tokens.colors.bg.tertiary,
          borderRadius: 6,
        }}>
          {/* Duration */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 9, color: tokens.colors.text.muted }}>Duration</span>
              <span style={{ fontSize: 9, color: tokens.colors.text.secondary, fontFamily: 'monospace' }}>
                {duration}ms
              </span>
            </div>
            <input
              type="range"
              min={100}
              max={2000}
              step={100}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              style={{
                width: '100%',
                height: 4,
                appearance: 'none',
                background: `linear-gradient(to right, ${tokens.colors.accent.purple} ${(duration - 100) / 1900 * 100}%, ${tokens.colors.bg.secondary} ${(duration - 100) / 1900 * 100}%)`,
                borderRadius: 2,
                cursor: 'pointer',
              }}
            />
          </div>
          
          {/* Easing */}
          <div>
            <div style={{ fontSize: 9, color: tokens.colors.text.muted, marginBottom: 4 }}>Easing</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {EASING_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setEasing(opt.id)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 4,
                    border: `1px solid ${easing === opt.id ? tokens.colors.accent.purple + '60' : 'transparent'}`,
                    background: easing === opt.id ? tokens.colors.accent.purple + '20' : tokens.colors.bg.glass,
                    color: easing === opt.id ? tokens.colors.accent.purple : tokens.colors.text.muted,
                    fontSize: 9,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 12 }}>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SET RESET POINT BUTTON
// =============================================================================

function SetResetPointButton({ onSetResetPoint, hasCustomResetPoint }) {
  const [showConfirm, setShowConfirm] = useState(false);
  
  return (
    <div style={{ marginBottom: 12 }}>
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 6,
            border: `1px dashed ${hasCustomResetPoint ? tokens.colors.accent.green + '60' : tokens.colors.border.default}`,
            background: hasCustomResetPoint ? tokens.colors.accent.green + '10' : 'transparent',
            color: hasCustomResetPoint ? tokens.colors.accent.green : tokens.colors.text.muted,
            fontSize: 10,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <span>📍</span>
          <span>{hasCustomResetPoint ? 'Reset Point Set (click to change)' : 'Set Current as Reset Point'}</span>
        </button>
      ) : (
        <div style={{
          padding: 10,
          background: tokens.colors.bg.tertiary,
          borderRadius: 6,
          border: `1px solid ${tokens.colors.accent.amber}40`,
        }}>
          <div style={{ fontSize: 10, color: tokens.colors.text.secondary, marginBottom: 8 }}>
            Set current camera position as the new reset point?
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { onSetResetPoint(); setShowConfirm(false); }}
              style={{
                flex: 1,
                padding: '6px 12px',
                borderRadius: 4,
                border: 'none',
                background: tokens.colors.accent.green,
                color: '#000',
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ✓ Set Reset Point
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              style={{
                padding: '6px 12px',
                borderRadius: 4,
                border: `1px solid ${tokens.colors.border.default}`,
                background: 'transparent',
                color: tokens.colors.text.muted,
                fontSize: 10,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ANIMATION PRESETS
// =============================================================================

function AnimationPresets({ activeAnimation, onStartAnimation, onStopAnimation }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ 
        fontSize: 9, 
        fontWeight: 600, 
        color: tokens.colors.text.muted, 
        marginBottom: 6,
        letterSpacing: '0.5px',
      }}>
        ANIMATION PRESETS
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {ANIMATION_PRESETS.map(preset => {
          const isActive = activeAnimation === preset.id;
          return (
            <Tooltip key={preset.id} content={preset.description}>
              <button
                onClick={() => isActive ? onStopAnimation() : onStartAnimation(preset.id)}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  borderRadius: 4,
                  border: `1px solid ${isActive ? tokens.colors.accent.amber + '60' : tokens.colors.border.subtle}`,
                  background: isActive ? tokens.colors.accent.amber + '20' : tokens.colors.bg.glass,
                  color: isActive ? tokens.colors.accent.amber : tokens.colors.text.muted,
                  fontSize: 9,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <span style={{ fontSize: 14 }}>{isActive ? '⏹' : preset.icon}</span>
                <span>{isActive ? 'Stop' : preset.label}</span>
              </button>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// BOOKMARKS SECTION
// =============================================================================

function BookmarksSection({ bookmarks, onNavigate, onCreateBookmark }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const pinnedBookmarks = bookmarks.filter(b => b.isPinned);
  const otherBookmarks = bookmarks.filter(b => !b.isPinned);
  
  return (
    <div>
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
      }}>
        <div style={{ 
          fontSize: 9, 
          fontWeight: 600, 
          color: tokens.colors.text.muted, 
          letterSpacing: '0.5px',
        }}>
          BOOKMARKS
        </div>
        <button
          onClick={onCreateBookmark}
          style={{
            padding: '2px 8px',
            borderRadius: 3,
            border: `1px solid ${tokens.colors.accent.purple}40`,
            background: tokens.colors.accent.purple + '15',
            color: tokens.colors.accent.purple,
            fontSize: 9,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span>+</span>
          <span>Save View</span>
        </button>
      </div>
      
      {/* Pinned Bookmarks */}
      {pinnedBookmarks.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
          {pinnedBookmarks.map(bm => (
            <button
              key={bm.id}
              onClick={() => onNavigate(bm.id)}
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                border: `1px solid ${bm.color}40`,
                background: bm.color + '15',
                color: bm.color,
                fontSize: 9,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>📌</span>
              <span>{bm.name}</span>
            </button>
          ))}
        </div>
      )}
      
      {/* Other Bookmarks (expandable) */}
      {otherBookmarks.length > 0 && (
        <>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: 4,
              border: `1px solid ${tokens.colors.border.subtle}`,
              background: 'transparent',
              color: tokens.colors.text.muted,
              fontSize: 9,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{otherBookmarks.length} more bookmark{otherBookmarks.length > 1 ? 's' : ''}</span>
            <span>{isExpanded ? '▲' : '▼'}</span>
          </button>
          
          {isExpanded && (
            <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {otherBookmarks.map(bm => (
                <button
                  key={bm.id}
                  onClick={() => onNavigate(bm.id)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 4,
                    border: 'none',
                    background: tokens.colors.bg.glass,
                    color: tokens.colors.text.secondary,
                    fontSize: 9,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    textAlign: 'left',
                  }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: bm.color }} />
                  <span>{bm.name}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
      
      {bookmarks.length === 0 && (
        <div style={{ 
          padding: 12, 
          textAlign: 'center', 
          color: tokens.colors.text.muted, 
          fontSize: 9,
          background: tokens.colors.bg.glass,
          borderRadius: 4,
        }}>
          No bookmarks yet. Click "Save View" to create one.
        </div>
      )}
    </div>
  );
}

// =============================================================================
// FULL CAMERA SECTION
// =============================================================================

function CameraSection() {
  // Animation settings
  const [animateTransitions, setAnimateTransitions] = useState(true);
  const [duration, setDuration] = useState(500);
  const [easing, setEasing] = useState('easeInOut');
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  
  // State
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeAnimation, setActiveAnimation] = useState(null);
  const [hasCustomResetPoint, setHasCustomResetPoint] = useState(false);
  
  // Animation ref for cleanup
  const animationRef = useRef(null);
  
  const handleSelectView = useCallback((viewId) => {
    console.log(`Navigate to view: ${viewId}, animate: ${animateTransitions}, duration: ${duration}ms, easing: ${easing}`);
    
    if (animateTransitions && viewId !== 'reset') {
      setIsAnimating(true);
      // Simulate animation completion
      setTimeout(() => setIsAnimating(false), duration);
    }
  }, [animateTransitions, duration, easing]);
  
  const handleSetResetPoint = useCallback(() => {
    console.log('Set current camera as reset point');
    setHasCustomResetPoint(true);
  }, []);
  
  const handleStartAnimation = useCallback((presetId) => {
    console.log(`Start animation: ${presetId}`);
    setActiveAnimation(presetId);
  }, []);
  
  const handleStopAnimation = useCallback(() => {
    console.log('Stop animation');
    setActiveAnimation(null);
  }, []);
  
  const handleNavigateBookmark = useCallback((bookmarkId) => {
    console.log(`Navigate to bookmark: ${bookmarkId}`);
  }, []);
  
  const handleCreateBookmark = useCallback(() => {
    console.log('Create bookmark from current view');
  }, []);
  
  return (
    <div style={{ padding: '8px 12px' }}>
      {/* Standard Views Grid */}
      <div style={{ 
        fontSize: 9, 
        fontWeight: 600, 
        color: tokens.colors.text.muted, 
        marginBottom: 6,
        letterSpacing: '0.5px',
      }}>
        STANDARD VIEWS
      </div>
      <StandardViewsGrid 
        onSelectView={handleSelectView} 
        isAnimating={isAnimating}
      />
      
      {/* Animation Settings */}
      <AnimationSettings
        animateTransitions={animateTransitions}
        setAnimateTransitions={setAnimateTransitions}
        duration={duration}
        setDuration={setDuration}
        easing={easing}
        setEasing={setEasing}
        isExpanded={settingsExpanded}
        setIsExpanded={setSettingsExpanded}
      />
      
      {/* Set Reset Point */}
      <SetResetPointButton 
        onSetResetPoint={handleSetResetPoint}
        hasCustomResetPoint={hasCustomResetPoint}
      />
      
      {/* Animation Presets */}
      <AnimationPresets
        activeAnimation={activeAnimation}
        onStartAnimation={handleStartAnimation}
        onStopAnimation={handleStopAnimation}
      />
      
      {/* Bookmarks */}
      <BookmarksSection
        bookmarks={MOCK_BOOKMARKS}
        onNavigate={handleNavigateBookmark}
        onCreateBookmark={handleCreateBookmark}
      />
    </div>
  );
}

// =============================================================================
// IMPLEMENTATION SPEC: flyTo() function
// =============================================================================

/*
// This would go in vtkInstanceTools.js or cameraUtils.js

export function flyTo(instanceId, targetState, options = {}) {
  const {
    duration = 500,
    easing = 'easeInOut',
    onComplete = null,
    onProgress = null,
  } = options;
  
  const tools = instanceTools.get(instanceId);
  if (!tools) return null;
  
  const { camera, renderer, renderWindow } = tools.sceneObjects;
  
  // Capture current state
  const fromState = captureCameraState(renderer);
  
  // Animation state
  let startTime = null;
  let animationId = null;
  
  const easingFn = EASING_FUNCTIONS[easing] || EASING_FUNCTIONS.easeInOut;
  
  const animate = (timestamp) => {
    if (!startTime) startTime = timestamp;
    
    const elapsed = timestamp - startTime;
    const rawT = Math.min(elapsed / duration, 1);
    const t = easingFn(rawT);
    
    // Interpolate camera state
    const currentState = interpolateCameraState(fromState, targetState, t);
    
    // Apply to camera
    camera.setPosition(...currentState.position);
    camera.setFocalPoint(...currentState.focalPoint);
    camera.setViewUp(...currentState.viewUp);
    if (currentState.viewAngle) camera.setViewAngle(currentState.viewAngle);
    if (currentState.parallelScale) camera.setParallelScale(currentState.parallelScale);
    
    renderer.resetCameraClippingRange();
    renderWindow.render();
    
    // Progress callback
    onProgress?.(rawT);
    
    // Continue or complete
    if (rawT < 1) {
      animationId = requestAnimationFrame(animate);
    } else {
      onComplete?.();
    }
  };
  
  animationId = requestAnimationFrame(animate);
  
  // Return cancel function
  return () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  };
}

// Usage:
// const cancel = flyTo(instanceId, targetState, { duration: 500, easing: 'easeOut' });
// cancel(); // To stop mid-animation
*/

// =============================================================================
// IMPLEMENTATION SPEC: setResetPoint()
// =============================================================================

/*
// This would go in VTKInstanceHandler.js

setResetPoint(instanceData) {
  if (!instanceData?.sceneObjects?.camera) {
    log.warn("Cannot set reset point: VTK not initialized");
    return false;
  }
  
  // Capture current camera state as the new initial state
  const camera = instanceData.sceneObjects.camera;
  instanceData._initialCameraState = {
    position: camera.getPosition(),
    focalPoint: camera.getFocalPoint(),
    viewUp: camera.getViewUp(),
    parallelScale: camera.getParallelScale(),
    clippingRange: camera.getClippingRange(),
    viewAngle: camera.getViewAngle(),
  };
  
  // Also save to ViewConfiguration for persistence
  if (instanceData.viewConfigId) {
    const viewConfig = getViewConfigurationManager()?.getView(instanceData.viewConfigId);
    if (viewConfig) {
      viewConfig.camera = { ...instanceData._initialCameraState };
      viewConfig.cameraIsResetPoint = true;
    }
  }
  
  log.debug(`Reset point set for ${instanceData.instanceId}`);
  return true;
}
*/

// =============================================================================
// DEMO
// =============================================================================

export default function CameraSectionArtifact() {
  return (
    <div style={{
      minHeight: '100vh',
      background: tokens.colors.bg.primary,
      padding: 24,
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{
            padding: '4px 8px', borderRadius: 4,
            background: tokens.colors.accent.cyan + '30', color: tokens.colors.accent.cyan,
            fontSize: 10, fontWeight: 600,
          }}>DESIGN 6</span>
        </div>
        <h1 style={{ color: tokens.colors.text.primary, fontSize: 20, marginBottom: 8 }}>
          Camera Section (Enhanced)
        </h1>
        <p style={{ color: tokens.colors.text.muted, fontSize: 12, maxWidth: 600 }}>
          Standard views with animated transitions, custom reset point, animation presets, and bookmarks.
        </p>
      </div>
      
      {/* Camera Section Preview */}
      <div style={{ 
        width: 260, 
        background: tokens.colors.bg.secondary, 
        borderRadius: 8,
        border: `1px solid ${tokens.colors.border.default}`,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '8px 12px',
          background: tokens.colors.accent.cyan + '10',
          borderLeft: `3px solid ${tokens.colors.accent.cyan}`,
          borderBottom: `1px solid ${tokens.colors.border.subtle}`,
        }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: tokens.colors.accent.cyan }}>
            📷 Camera
          </span>
        </div>
        <CameraSection />
      </div>
      
      {/* Features */}
      <div style={{ marginTop: 24, padding: 16, background: tokens.colors.bg.secondary, borderRadius: 8, maxWidth: 500 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: tokens.colors.accent.green, marginBottom: 12 }}>NEW FEATURES</div>
        <table style={{ width: '100%', fontSize: 10, color: tokens.colors.text.secondary, borderCollapse: 'collapse' }}>
          <tbody>
            <tr style={{ borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
              <td style={{ padding: '8px', fontWeight: 500 }}>Animated Transitions</td>
              <td style={{ padding: '8px' }}>Toggle on/off, duration slider (100-2000ms), easing selection</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
              <td style={{ padding: '8px', fontWeight: 500 }}>Set Reset Point</td>
              <td style={{ padding: '8px' }}>Capture current view as new "Home" position</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${tokens.colors.border.subtle}` }}>
              <td style={{ padding: '8px', fontWeight: 500 }}>Animation Presets</td>
              <td style={{ padding: '8px' }}>Orbit (360°), Tumble (random), Rock (±30°)</td>
            </tr>
            <tr>
              <td style={{ padding: '8px', fontWeight: 500 }}>Bookmarks</td>
              <td style={{ padding: '8px' }}>Save View button, pinned quick access, expandable list</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Implementation Notes */}
      <div style={{ marginTop: 16, padding: 16, background: tokens.colors.bg.secondary, borderRadius: 8, maxWidth: 500 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: tokens.colors.accent.amber, marginBottom: 8 }}>IMPLEMENTATION</div>
        <ul style={{ fontSize: 10, color: tokens.colors.text.secondary, margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
          <li><code>flyTo(instanceId, targetState, options)</code> - Animated camera transition using existing <code>interpolateCameraState()</code></li>
          <li><code>setResetPoint(instanceData)</code> - Capture current camera as <code>_initialCameraState</code></li>
          <li>Animation presets use <code>requestAnimationFrame</code> loop with custom easing</li>
          <li>Bookmarks integrate with existing <code>useBookmarks</code> hook</li>
        </ul>
      </div>
    </div>
  );
}
