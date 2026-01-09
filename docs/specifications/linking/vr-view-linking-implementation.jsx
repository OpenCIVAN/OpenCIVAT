/**
 * VR View Linking Implementation
 * 
 * Adapts the View Linking system for VR using the generic
 * interaction patterns. Replaces drag-to-link with a 
 * two-step select interaction.
 * 
 * VR Linking Flow:
 * 1. Point at source view's link badge
 * 2. Press trigger to enter linking mode
 * 3. Source view glows, instruction overlay appears
 * 4. Point at target view
 * 5. Valid targets highlight, invalid targets dim
 * 6. Press trigger on valid target
 * 7. Quick Link Panel appears (property/mode selection)
 * 8. Select options and confirm
 * 
 * @author Claude (Anthropic)
 * @version 1.0.0
 */

import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  memo,
} from 'react';

// Import from generic patterns (would be actual imports in real code)
// import { useInteraction, useLinkInteraction, VRRadialMenu, VRButton } from './vr-interaction-patterns';

// =============================================================================
// DESIGN TOKENS
// =============================================================================

const tokens = {
  // Link property colors
  propertyColors: {
    camera: '#2dd4bf',
    filters: '#a78bfa',
    colorMaps: '#f472b6',
    widgets: '#fbbf24',
    cursors: '#60a5fa',
    annotationDisplay: '#fb923c',
  },
  
  // VR-specific dimensions
  vr: {
    minTouchTarget: 44,      // Minimum touch target size
    panelWidth: 400,         // Floating panel width
    buttonHeight: 48,        // Button height
    fontSize: {
      label: 14,
      body: 12,
      hint: 10,
    },
    spacing: {
      sm: 8,
      md: 16,
      lg: 24,
    },
  },
  
  // Colors
  bgPanel: 'rgba(12, 18, 32, 0.95)',
  borderDefault: 'rgba(255, 255, 255, 0.15)',
  textPrimary: 'rgba(255, 255, 255, 0.95)',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  accent: '#2dd4bf',
};

// Property configuration
const LINK_PROPERTIES = [
  { id: 'camera', icon: '📷', label: 'Camera', desc: 'Viewpoint & orientation' },
  { id: 'filters', icon: '🎚', label: 'Filters', desc: 'Data filtering' },
  { id: 'colorMaps', icon: '🎨', label: 'Colors', desc: 'Color mapping' },
  { id: 'widgets', icon: '📐', label: 'Widgets', desc: 'Measurement tools' },
  { id: 'cursors', icon: '👁', label: 'Cursors', desc: 'Cursor positions' },
  { id: 'annotationDisplay', icon: '📝', label: 'Annotations', desc: 'Visible annotations' },
];

const LINK_MODES = [
  { id: 'follow', icon: '←', label: 'Follow', desc: 'Receive updates only' },
  { id: 'sync', icon: '↔', label: 'Sync', desc: 'Two-way sync' },
  { id: 'broadcast', icon: '→', label: 'Broadcast', desc: 'Send updates only' },
];

// =============================================================================
// PART 1: VR LINK BADGE
// Replaces draggable badge with tap-to-select
// =============================================================================

/**
 * VRLinkBadge - Tap-to-select badge for VR linking
 * 
 * In VR:
 * - Tap to enter linking mode
 * - Larger touch target (44px minimum)
 * - Shows visual feedback on hover (ray intersection)
 * - Displays instruction text
 */
export const VRLinkBadge = memo(function VRLinkBadge({
  viewId,
  viewName,
  viewColor,
  linkCount = 0,
  isHub = false,
  isActive = false,      // This view is the active link source
  isLinkingMode = false, // Currently in linking mode (any view)
  onActivate,
  onDeactivate,
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  const handleClick = () => {
    if (isActive) {
      onDeactivate?.();
    } else {
      onActivate?.(viewId, { viewName, viewColor });
    }
  };
  
  return (
    <button
      onClick={handleClick}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        minWidth: tokens.vr.minTouchTarget,
        minHeight: tokens.vr.minTouchTarget,
        padding: '10px 16px',
        background: isActive 
          ? 'rgba(45, 212, 191, 0.3)' 
          : isHovered 
            ? 'rgba(45, 212, 191, 0.15)'
            : 'rgba(45, 212, 191, 0.1)',
        border: `2px solid ${isActive ? tokens.accent : 'rgba(45, 212, 191, 0.4)'}`,
        borderRadius: '8px',
        color: tokens.accent,
        cursor: 'pointer',
        transition: '0.15s ease',
        // Glow when active
        boxShadow: isActive ? `0 0 20px ${tokens.accent}40` : 'none',
      }}
    >
      {/* Hub indicator */}
      {isHub && (
        <span style={{ fontSize: '14px', color: '#fbbf24' }}>★</span>
      )}
      
      {/* Link icon */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
      
      {/* Count */}
      <span style={{ 
        fontSize: tokens.vr.fontSize.label, 
        fontWeight: 600,
      }}>
        {linkCount || 'Link'}
      </span>
      
      {/* Active indicator text */}
      {isActive && (
        <span style={{ 
          fontSize: tokens.vr.fontSize.hint,
          opacity: 0.8,
          marginLeft: '4px',
        }}>
          (tap target)
        </span>
      )}
    </button>
  );
});

// =============================================================================
// PART 2: VR LINK TARGET INDICATOR
// Shows on potential targets during linking
// =============================================================================

/**
 * VRLinkTargetOverlay - Visual indicator on valid/invalid targets
 * 
 * Wraps viewport content to show:
 * - Green glow for valid targets
 * - Dimmed appearance for invalid targets
 * - "Tap to link" prompt on hover
 */
export const VRLinkTargetOverlay = memo(function VRLinkTargetOverlay({
  viewId,
  viewName,
  viewColor,
  isLinkingMode,
  sourceViewId,
  isValidTarget,
  isHovered,
  onSelect,
  children,
}) {
  if (!isLinkingMode) {
    return children;
  }
  
  const isSource = viewId === sourceViewId;
  
  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden',
        // Visual states
        border: isSource 
          ? `3px solid ${tokens.accent}`
          : isValidTarget && isHovered
            ? `3px solid ${tokens.accent}`
            : isValidTarget
              ? `3px solid rgba(45, 212, 191, 0.4)`
              : '3px solid transparent',
        boxShadow: isSource
          ? `0 0 30px ${tokens.accent}50, inset 0 0 20px ${tokens.accent}20`
          : isValidTarget && isHovered
            ? `0 0 20px ${tokens.accent}40`
            : 'none',
        opacity: !isValidTarget && !isSource ? 0.4 : 1,
        transition: '0.2s ease',
      }}
    >
      {children}
      
      {/* Source indicator */}
      {isSource && (
        <div style={{
          position: 'absolute',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '6px 14px',
          background: tokens.accent,
          borderRadius: '20px',
          fontSize: tokens.vr.fontSize.body,
          fontWeight: 600,
          color: '#000',
          whiteSpace: 'nowrap',
        }}>
          Linking from here
        </div>
      )}
      
      {/* Valid target prompt */}
      {isValidTarget && !isSource && isHovered && (
        <div 
          onClick={() => onSelect?.(viewId)}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.6)',
            cursor: 'pointer',
          }}
        >
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `${tokens.accent}30`,
              border: `2px solid ${tokens.accent}`,
              borderRadius: '50%',
              fontSize: '24px',
            }}>
              🔗
            </div>
            <span style={{
              fontSize: tokens.vr.fontSize.label,
              fontWeight: 600,
              color: '#fff',
            }}>
              Tap to link here
            </span>
            <span style={{
              fontSize: tokens.vr.fontSize.hint,
              color: tokens.textMuted,
            }}>
              {viewName}
            </span>
          </div>
        </div>
      )}
      
      {/* Invalid target indicator */}
      {!isValidTarget && !isSource && (
        <div style={{
          position: 'absolute',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '4px 10px',
          background: 'rgba(0, 0, 0, 0.7)',
          borderRadius: '4px',
          fontSize: tokens.vr.fontSize.hint,
          color: tokens.textMuted,
        }}>
          Cannot link here
        </div>
      )}
    </div>
  );
});

// =============================================================================
// PART 3: VR QUICK LINK PANEL
// Floating panel for property/mode selection
// =============================================================================

/**
 * VRQuickLinkPanel - Property and mode selection for VR
 * 
 * Appears after selecting target view.
 * Larger buttons and touch targets for VR comfort.
 * Can be positioned in 3D space or as HUD overlay.
 */
export const VRQuickLinkPanel = memo(function VRQuickLinkPanel({
  isOpen,
  sourceView,
  targetView,
  onConfirm,
  onCancel,
  position = 'center', // 'center' | 'near-target' | { x, y, z }
}) {
  const [selectedProperty, setSelectedProperty] = useState('camera');
  const [selectedMode, setSelectedMode] = useState('sync');
  
  if (!isOpen || !sourceView || !targetView) return null;
  
  const handleConfirm = () => {
    onConfirm?.(selectedProperty, selectedMode);
  };
  
  // Position styles
  const positionStyles = position === 'center' 
    ? {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }
    : typeof position === 'object'
      ? {
          position: 'fixed',
          left: position.x,
          top: position.y,
        }
      : {};
  
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          zIndex: 9998,
        }}
      />
      
      {/* Panel */}
      <div
        style={{
          ...positionStyles,
          width: tokens.vr.panelWidth,
          background: tokens.bgPanel,
          border: `2px solid ${tokens.borderDefault}`,
          borderRadius: '16px',
          overflow: 'hidden',
          zIndex: 9999,
          animation: 'vrPanelIn 0.2s ease',
        }}
      >
        {/* Header */}
        <div style={{
          padding: tokens.vr.spacing.md,
          borderBottom: `1px solid ${tokens.borderDefault}`,
          background: 'rgba(0, 0, 0, 0.3)',
        }}>
          <div style={{
            fontSize: tokens.vr.fontSize.label,
            fontWeight: 600,
            color: tokens.textPrimary,
            marginBottom: '8px',
          }}>
            Create Link
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: tokens.vr.fontSize.body,
            color: tokens.textSecondary,
          }}>
            <span style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: sourceView.color,
            }} />
            <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {sourceView.name}
            </span>
            <span style={{ color: tokens.textMuted }}>→</span>
            <span style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: targetView.color,
            }} />
            <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {targetView.name}
            </span>
          </div>
        </div>
        
        {/* Property Selection */}
        <div style={{ padding: tokens.vr.spacing.md }}>
          <div style={{
            fontSize: tokens.vr.fontSize.hint,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: tokens.textMuted,
            marginBottom: tokens.vr.spacing.sm,
          }}>
            What to Link
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: tokens.vr.spacing.sm,
          }}>
            {LINK_PROPERTIES.map(prop => (
              <button
                key={prop.id}
                onClick={() => setSelectedProperty(prop.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  minHeight: tokens.vr.minTouchTarget,
                  background: selectedProperty === prop.id 
                    ? `${tokens.propertyColors[prop.id]}20`
                    : 'rgba(255, 255, 255, 0.05)',
                  border: `2px solid ${
                    selectedProperty === prop.id 
                      ? tokens.propertyColors[prop.id]
                      : 'transparent'
                  }`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: '0.15s ease',
                }}
              >
                <span style={{ fontSize: '20px' }}>{prop.icon}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{
                    fontSize: tokens.vr.fontSize.body,
                    fontWeight: 500,
                    color: selectedProperty === prop.id 
                      ? tokens.propertyColors[prop.id]
                      : tokens.textPrimary,
                  }}>
                    {prop.label}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Mode Selection */}
        <div style={{ 
          padding: `0 ${tokens.vr.spacing.md}px ${tokens.vr.spacing.md}px`,
        }}>
          <div style={{
            fontSize: tokens.vr.fontSize.hint,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: tokens.textMuted,
            marginBottom: tokens.vr.spacing.sm,
          }}>
            Link Mode
          </div>
          
          <div style={{
            display: 'flex',
            gap: tokens.vr.spacing.sm,
          }}>
            {LINK_MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '14px 10px',
                  minHeight: tokens.vr.minTouchTarget + 20,
                  background: selectedMode === mode.id 
                    ? `${tokens.accent}20`
                    : 'rgba(255, 255, 255, 0.05)',
                  border: `2px solid ${
                    selectedMode === mode.id 
                      ? tokens.accent
                      : 'transparent'
                  }`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: '0.15s ease',
                }}
              >
                <span style={{
                  fontSize: '24px',
                  fontWeight: 600,
                  color: selectedMode === mode.id ? tokens.accent : tokens.textMuted,
                }}>
                  {mode.icon}
                </span>
                <span style={{
                  fontSize: tokens.vr.fontSize.body,
                  fontWeight: 600,
                  color: selectedMode === mode.id ? tokens.accent : tokens.textPrimary,
                }}>
                  {mode.label}
                </span>
                <span style={{
                  fontSize: tokens.vr.fontSize.hint,
                  color: tokens.textMuted,
                  textAlign: 'center',
                }}>
                  {mode.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: tokens.vr.spacing.sm,
          padding: tokens.vr.spacing.md,
          borderTop: `1px solid ${tokens.borderDefault}`,
          background: 'rgba(0, 0, 0, 0.2)',
        }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '14px',
              minHeight: tokens.vr.buttonHeight,
              fontSize: tokens.vr.fontSize.body,
              fontWeight: 500,
              background: 'transparent',
              border: `2px solid ${tokens.borderDefault}`,
              borderRadius: '10px',
              color: tokens.textSecondary,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            style={{
              flex: 1,
              padding: '14px',
              minHeight: tokens.vr.buttonHeight,
              fontSize: tokens.vr.fontSize.body,
              fontWeight: 600,
              background: tokens.accent,
              border: 'none',
              borderRadius: '10px',
              color: '#000',
              cursor: 'pointer',
            }}
          >
            Create Link
          </button>
        </div>
        
        {/* Controller hints */}
        <div style={{
          padding: `${tokens.vr.spacing.sm}px ${tokens.vr.spacing.md}px`,
          borderTop: `1px solid ${tokens.borderDefault}`,
          fontSize: tokens.vr.fontSize.hint,
          color: tokens.textMuted,
          textAlign: 'center',
        }}>
          <span style={{ marginRight: '16px' }}>🎮 A: Confirm</span>
          <span>🎮 B: Cancel</span>
        </div>
        
        <style>{`
          @keyframes vrPanelIn {
            from {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.9);
            }
            to {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
          }
        `}</style>
      </div>
    </>
  );
});

// =============================================================================
// PART 4: VR LINKING INSTRUCTIONS OVERLAY
// Persistent instructions during linking mode
// =============================================================================

/**
 * VRLinkingInstructions - HUD overlay with linking instructions
 * 
 * Shows at bottom of view during linking mode.
 * Provides clear guidance on next steps.
 */
export const VRLinkingInstructions = memo(function VRLinkingInstructions({
  isActive,
  step, // 1: select target, 2: confirm
  sourceViewName,
  targetViewName,
  onCancel,
}) {
  if (!isActive) return null;
  
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 30,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        padding: '20px 32px',
        background: 'rgba(0, 0, 0, 0.9)',
        border: `2px solid ${tokens.accent}50`,
        borderRadius: '16px',
        zIndex: 9990,
      }}
    >
      {/* Progress indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: step >= 1 ? tokens.accent : tokens.textMuted,
        }} />
        <div style={{
          width: '24px',
          height: '2px',
          background: step >= 2 ? tokens.accent : tokens.textMuted,
        }} />
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: step >= 2 ? tokens.accent : tokens.textMuted,
        }} />
      </div>
      
      {/* Main instruction */}
      <div style={{
        fontSize: '16px',
        fontWeight: 600,
        color: tokens.textPrimary,
      }}>
        {step === 1 && (
          <>🔗 Point at a view and tap to link from "{sourceViewName}"</>
        )}
        {step === 2 && (
          <>✓ Select link options for "{targetViewName}"</>
        )}
      </div>
      
      {/* Sub instruction */}
      <div style={{
        fontSize: '12px',
        color: tokens.textMuted,
      }}>
        {step === 1 && 'Valid targets are highlighted'}
        {step === 2 && 'Choose what to sync'}
      </div>
      
      {/* Cancel button */}
      <button
        onClick={onCancel}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '20px',
          fontSize: '11px',
          color: tokens.textSecondary,
          cursor: 'pointer',
        }}
      >
        <span>🎮 B</span>
        Cancel
      </button>
    </div>
  );
});

// =============================================================================
// PART 5: VR LINK RADIAL MENU
// Quick actions for existing links
// =============================================================================

/**
 * VRLinkRadialMenu - Radial menu for link actions
 * 
 * Appears when tapping an existing link badge.
 * Provides quick access to:
 * - Unlink
 * - Change mode
 * - View group members
 * - Transfer hub
 */
export const VRLinkRadialMenu = memo(function VRLinkRadialMenu({
  isOpen,
  onClose,
  viewId,
  linkedProperties, // Array of { property, mode, targetName, isHub }
  onUnlink,
  onChangeMode,
  onViewGroup,
  onTransferHub,
  position,
}) {
  if (!isOpen) return null;
  
  // Build menu items based on linked properties
  const menuItems = [];
  
  // Add property-specific items
  linkedProperties.forEach(link => {
    menuItems.push({
      icon: LINK_PROPERTIES.find(p => p.id === link.property)?.icon || '🔗',
      label: `Unlink ${link.property}`,
      onClick: () => onUnlink?.(link.property),
    });
  });
  
  // Add general actions
  menuItems.push({
    icon: '👥',
    label: 'View Group',
    onClick: onViewGroup,
  });
  
  if (linkedProperties.some(l => l.isHub)) {
    menuItems.push({
      icon: '↗️',
      label: 'Transfer Hub',
      onClick: onTransferHub,
    });
  }
  
  menuItems.push({
    icon: '❌',
    label: 'Unlink All',
    onClick: () => onUnlink?.('all'),
  });
  
  // Use VRRadialMenu from generic patterns
  return (
    <VRRadialMenuImpl
      isOpen={isOpen}
      onClose={onClose}
      items={menuItems}
      position={position}
    />
  );
});

// Simple radial menu implementation (would import from vr-interaction-patterns)
const VRRadialMenuImpl = memo(function VRRadialMenuImpl({
  isOpen,
  onClose,
  items,
  position,
}) {
  if (!isOpen || !items?.length) return null;
  
  const radius = 120;
  const angleStep = (2 * Math.PI) / items.length;
  
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          zIndex: 9998,
        }}
      />
      
      <div
        style={{
          position: 'fixed',
          left: position?.x || '50%',
          top: position?.y || '50%',
          zIndex: 9999,
        }}
      >
        {/* Center */}
        <div style={{
          position: 'absolute',
          left: -25,
          top: -25,
          width: 50,
          height: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(12, 18, 32, 0.95)',
          border: `2px solid ${tokens.accent}`,
          borderRadius: '50%',
          fontSize: '20px',
        }}>
          🔗
        </div>
        
        {/* Items */}
        {items.map((item, index) => {
          const angle = angleStep * index - Math.PI / 2;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          return (
            <button
              key={index}
              onClick={() => {
                item.onClick?.();
                onClose();
              }}
              style={{
                position: 'absolute',
                left: x - 45,
                top: y - 45,
                width: 90,
                height: 90,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: 'rgba(12, 18, 32, 0.95)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '50%',
                color: '#fff',
                cursor: 'pointer',
                transition: '0.15s ease',
              }}
            >
              <span style={{ fontSize: '28px' }}>{item.icon}</span>
              <span style={{ 
                fontSize: '10px', 
                opacity: 0.8,
                maxWidth: '70px',
                textAlign: 'center',
                lineHeight: 1.2,
              }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
});

// =============================================================================
// PART 6: COMPLETE VR LINKING HOOK
// Orchestrates all VR linking components
// =============================================================================

/**
 * useVRLinking - Complete hook for VR view linking
 * 
 * Usage:
 * const {
 *   isLinking,
 *   linkSource,
 *   linkStep,
 *   startLinking,
 *   selectTarget,
 *   confirmLink,
 *   cancelLinking,
 *   createBadgeProps,
 *   createTargetProps,
 * } = useVRLinking({
 *   views: [...],
 *   onCreateLink: (sourceId, targetId, property, mode) => { ... },
 * });
 */
export function useVRLinking({ views, onCreateLink, canLink }) {
  const [isLinking, setIsLinking] = useState(false);
  const [linkSource, setLinkSource] = useState(null);
  const [linkTarget, setLinkTarget] = useState(null);
  const [linkStep, setLinkStep] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  
  // Start linking from a view
  const startLinking = useCallback((viewId, viewData) => {
    setIsLinking(true);
    setLinkSource({ id: viewId, ...viewData });
    setLinkStep(1);
  }, []);
  
  // Select a target view
  const selectTarget = useCallback((viewId) => {
    const targetView = views.find(v => v.id === viewId);
    if (!targetView) return;
    
    // Validate
    if (canLink && !canLink(linkSource?.id, viewId)) return;
    if (viewId === linkSource?.id) return;
    
    setLinkTarget({ id: viewId, name: targetView.name, color: targetView.color });
    setLinkStep(2);
    setShowPanel(true);
  }, [views, linkSource, canLink]);
  
  // Confirm the link with property and mode
  const confirmLink = useCallback((property, mode) => {
    if (linkSource && linkTarget) {
      onCreateLink?.(linkSource.id, linkTarget.id, property, mode);
    }
    
    // Reset state
    setIsLinking(false);
    setLinkSource(null);
    setLinkTarget(null);
    setLinkStep(0);
    setShowPanel(false);
  }, [linkSource, linkTarget, onCreateLink]);
  
  // Cancel linking
  const cancelLinking = useCallback(() => {
    setIsLinking(false);
    setLinkSource(null);
    setLinkTarget(null);
    setLinkStep(0);
    setShowPanel(false);
  }, []);
  
  // Create props for link badges
  const createBadgeProps = useCallback((viewId, viewData) => ({
    viewId,
    viewName: viewData.name,
    viewColor: viewData.color,
    isActive: linkSource?.id === viewId,
    isLinkingMode: isLinking,
    onActivate: startLinking,
    onDeactivate: cancelLinking,
  }), [isLinking, linkSource, startLinking, cancelLinking]);
  
  // Create props for target overlays
  const createTargetProps = useCallback((viewId, viewData) => ({
    viewId,
    viewName: viewData.name,
    viewColor: viewData.color,
    isLinkingMode: isLinking,
    sourceViewId: linkSource?.id,
    isValidTarget: isLinking && viewId !== linkSource?.id && (!canLink || canLink(linkSource?.id, viewId)),
    onSelect: selectTarget,
  }), [isLinking, linkSource, canLink, selectTarget]);
  
  return {
    // State
    isLinking,
    linkSource,
    linkTarget,
    linkStep,
    showPanel,
    
    // Actions
    startLinking,
    selectTarget,
    confirmLink,
    cancelLinking,
    
    // Props generators
    createBadgeProps,
    createTargetProps,
    
    // Component props
    instructionsProps: {
      isActive: isLinking,
      step: linkStep,
      sourceViewName: linkSource?.viewName,
      targetViewName: linkTarget?.name,
      onCancel: cancelLinking,
    },
    panelProps: {
      isOpen: showPanel,
      sourceView: linkSource,
      targetView: linkTarget,
      onConfirm: confirmLink,
      onCancel: cancelLinking,
    },
  };
}

// =============================================================================
// PART 7: USAGE EXAMPLE
// =============================================================================

/**
 * Complete VR linking example
 */
export function VRLinkingExample() {
  const sampleViews = [
    { id: 'v1', name: 'Skull View', color: '#2dd4bf', linkCount: 2, isHub: true },
    { id: 'v2', name: 'Bones View', color: '#4ade80', linkCount: 1, isHub: false },
    { id: 'v3', name: 'Vessels', color: '#a78bfa', linkCount: 0, isHub: false },
    { id: 'v4', name: 'Heart Model', color: '#f472b6', linkCount: 0, isHub: false },
  ];
  
  const handleCreateLink = (sourceId, targetId, property, mode) => {
    console.log('Creating link:', { sourceId, targetId, property, mode });
  };
  
  const {
    isLinking,
    createBadgeProps,
    createTargetProps,
    instructionsProps,
    panelProps,
  } = useVRLinking({
    views: sampleViews,
    onCreateLink: handleCreateLink,
    canLink: (sourceId, targetId) => sourceId !== targetId,
  });
  
  const [hoveredView, setHoveredView] = useState(null);
  
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '20px',
      padding: '40px',
      background: '#030303',
      minHeight: '100vh',
    }}>
      {sampleViews.map(view => (
        <VRLinkTargetOverlay
          key={view.id}
          {...createTargetProps(view.id, view)}
          isHovered={hoveredView === view.id}
        >
          <div
            onPointerEnter={() => setHoveredView(view.id)}
            onPointerLeave={() => setHoveredView(null)}
            style={{
              padding: '24px',
              background: 'rgba(12, 18, 32, 0.8)',
              borderRadius: '8px',
              minHeight: '200px',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '16px',
            }}>
              <div>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: 600, 
                  color: view.color,
                  marginBottom: '4px',
                }}>
                  {view.name}
                </div>
                <div style={{ fontSize: '12px', color: tokens.textMuted }}>
                  VTK Instance
                </div>
              </div>
              
              <VRLinkBadge
                {...createBadgeProps(view.id, view)}
                linkCount={view.linkCount}
                isHub={view.isHub}
              />
            </div>
            
            {/* Placeholder content */}
            <div style={{
              height: '120px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: tokens.textMuted,
              fontSize: '12px',
            }}>
              3D Viewport
            </div>
          </div>
        </VRLinkTargetOverlay>
      ))}
      
      {/* Instructions overlay */}
      <VRLinkingInstructions {...instructionsProps} />
      
      {/* Quick link panel */}
      <VRQuickLinkPanel {...panelProps} />
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  LINK_PROPERTIES,
  LINK_MODES,
  tokens as VR_LINK_TOKENS,
};

export default {
  VRLinkBadge,
  VRLinkTargetOverlay,
  VRQuickLinkPanel,
  VRLinkingInstructions,
  VRLinkRadialMenu,
  useVRLinking,
};
