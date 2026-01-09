/**
 * Toast Notification System
 * 
 * Lightweight, non-blocking notifications for link events and
 * general application feedback. Supports stacking, auto-dismiss,
 * actions, and VR-friendly sizing.
 * 
 * Features:
 * - Multiple toast types (info, success, warning, error, sync)
 * - Auto-dismiss with configurable duration
 * - Action buttons (undo, view, dismiss)
 * - Stacking with max visible limit
 * - VR-adaptive sizing via useAdaptive
 * - Link-specific toast variants
 * 
 * @author Claude (Anthropic)
 * @version 1.0.0
 */

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  memo,
  createContext,
  useContext,
} from 'react';

// =============================================================================
// DESIGN TOKENS
// =============================================================================

const tokens = {
  // Toast type colors
  types: {
    info: {
      bg: 'rgba(96, 165, 250, 0.15)',
      border: 'rgba(96, 165, 250, 0.3)',
      icon: 'ℹ️',
      iconColor: '#60a5fa',
    },
    success: {
      bg: 'rgba(74, 222, 128, 0.15)',
      border: 'rgba(74, 222, 128, 0.3)',
      icon: '✓',
      iconColor: '#4ade80',
    },
    warning: {
      bg: 'rgba(251, 191, 36, 0.15)',
      border: 'rgba(251, 191, 36, 0.3)',
      icon: '⚠',
      iconColor: '#fbbf24',
    },
    error: {
      bg: 'rgba(248, 113, 113, 0.15)',
      border: 'rgba(248, 113, 113, 0.3)',
      icon: '✕',
      iconColor: '#f87171',
    },
    sync: {
      bg: 'rgba(45, 212, 191, 0.15)',
      border: 'rgba(45, 212, 191, 0.3)',
      icon: '🔗',
      iconColor: '#2dd4bf',
    },
  },
  
  // UI colors
  bgToast: 'rgba(12, 18, 32, 0.95)',
  borderDefault: 'rgba(255, 255, 255, 0.1)',
  textPrimary: 'rgba(255, 255, 255, 0.95)',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  
  // Dimensions
  toastWidth: 320,
  toastWidthVR: 400,
  maxVisible: 4,
  stackOffset: 8,
  
  // Timing
  defaultDuration: 4000,
  syncDuration: 3000,
  errorDuration: 6000,
  
  // Animation
  transitionFast: '0.15s ease',
  transitionBase: '0.25s ease',
};

// =============================================================================
// TOAST CONTEXT
// =============================================================================

const ToastContext = createContext(null);

/**
 * ToastProvider - Global toast management
 * 
 * Usage:
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 * 
 * Then in any component:
 * const { showToast } = useToast();
 * showToast({ type: 'success', message: 'View linked!' });
 */
export function ToastProvider({ children, position = 'bottom-right', maxVisible = tokens.maxVisible }) {
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);
  
  // Add a toast
  const showToast = useCallback((options) => {
    const id = ++toastIdRef.current;
    
    const toast = {
      id,
      type: options.type || 'info',
      message: options.message,
      description: options.description,
      icon: options.icon,
      duration: options.duration ?? getDurationForType(options.type),
      action: options.action, // { label, onClick }
      dismissible: options.dismissible !== false,
      // Link-specific
      viewColor: options.viewColor,
      viewName: options.viewName,
      userName: options.userName,
      property: options.property,
      timestamp: Date.now(),
    };
    
    setToasts(prev => [...prev, toast]);
    
    // Auto-dismiss
    if (toast.duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, toast.duration);
    }
    
    return id;
  }, []);
  
  // Remove a toast
  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  
  // Clear all toasts
  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);
  
  // Convenience methods for common toast types
  const toast = {
    info: (message, options = {}) => showToast({ ...options, type: 'info', message }),
    success: (message, options = {}) => showToast({ ...options, type: 'success', message }),
    warning: (message, options = {}) => showToast({ ...options, type: 'warning', message }),
    error: (message, options = {}) => showToast({ ...options, type: 'error', message }),
    sync: (message, options = {}) => showToast({ ...options, type: 'sync', message }),
  };
  
  const contextValue = {
    toasts,
    showToast,
    dismissToast,
    clearToasts,
    toast,
  };
  
  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer 
        toasts={toasts} 
        position={position} 
        maxVisible={maxVisible}
        onDismiss={dismissToast}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

// Helper to get default duration by type
function getDurationForType(type) {
  switch (type) {
    case 'error': return tokens.errorDuration;
    case 'sync': return tokens.syncDuration;
    default: return tokens.defaultDuration;
  }
}

// =============================================================================
// TOAST CONTAINER
// =============================================================================

const ToastContainer = memo(function ToastContainer({
  toasts,
  position,
  maxVisible,
  onDismiss,
}) {
  // Position styles
  const positionStyles = {
    'top-left': { top: 16, left: 16 },
    'top-right': { top: 16, right: 16 },
    'top-center': { top: 16, left: '50%', transform: 'translateX(-50%)' },
    'bottom-left': { bottom: 16, left: 16 },
    'bottom-right': { bottom: 16, right: 16 },
    'bottom-center': { bottom: 16, left: '50%', transform: 'translateX(-50%)' },
  };
  
  const isTop = position.startsWith('top');
  
  // Only show most recent toasts up to maxVisible
  const visibleToasts = toasts.slice(-maxVisible);
  
  return (
    <div
      className="toast-container"
      style={{
        position: 'fixed',
        ...positionStyles[position],
        display: 'flex',
        flexDirection: isTop ? 'column' : 'column-reverse',
        gap: '8px',
        zIndex: 10000,
        pointerEvents: 'none',
      }}
    >
      {visibleToasts.map((toast, index) => (
        <Toast
          key={toast.id}
          toast={toast}
          onDismiss={() => onDismiss(toast.id)}
          index={index}
          total={visibleToasts.length}
        />
      ))}
    </div>
  );
});

// =============================================================================
// TOAST COMPONENT
// =============================================================================

const Toast = memo(function Toast({
  toast,
  onDismiss,
  index,
  total,
}) {
  const [isExiting, setIsExiting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const typeConfig = tokens.types[toast.type] || tokens.types.info;
  
  // Handle dismiss with animation
  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(onDismiss, 150);
  }, [onDismiss]);
  
  // Pause auto-dismiss on hover (handled by parent, but we track for styling)
  
  return (
    <div
      className={`toast toast--${toast.type} ${isExiting ? 'toast--exiting' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        width: tokens.toastWidth,
        padding: '12px 14px',
        background: tokens.bgToast,
        backdropFilter: 'blur(12px)',
        border: `1px solid ${typeConfig.border}`,
        borderLeft: `3px solid ${typeConfig.iconColor}`,
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        pointerEvents: 'auto',
        animation: isExiting 
          ? 'toastSlideOut 0.15s ease forwards' 
          : 'toastSlideIn 0.2s ease',
        transition: tokens.transitionFast,
      }}
    >
      {/* Icon */}
      <div style={{
        width: '20px',
        height: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: '12px',
        color: typeConfig.iconColor,
        background: typeConfig.bg,
        borderRadius: '4px',
      }}>
        {toast.icon || typeConfig.icon}
      </div>
      
      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Message */}
        <div style={{
          fontSize: '12px',
          fontWeight: 500,
          color: tokens.textPrimary,
          lineHeight: 1.4,
        }}>
          {toast.message}
        </div>
        
        {/* Description */}
        {toast.description && (
          <div style={{
            fontSize: '11px',
            color: tokens.textSecondary,
            marginTop: '4px',
            lineHeight: 1.3,
          }}>
            {toast.description}
          </div>
        )}
        
        {/* View color indicator (for link toasts) */}
        {toast.viewColor && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '6px',
            fontSize: '10px',
            color: tokens.textMuted,
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: toast.viewColor,
            }} />
            {toast.viewName}
            {toast.userName && (
              <span>• {toast.userName}</span>
            )}
          </div>
        )}
        
        {/* Action button */}
        {toast.action && (
          <button
            onClick={() => {
              toast.action.onClick?.();
              handleDismiss();
            }}
            style={{
              marginTop: '8px',
              padding: '4px 10px',
              fontSize: '10px',
              fontWeight: 600,
              background: `${typeConfig.iconColor}20`,
              border: `1px solid ${typeConfig.iconColor}40`,
              borderRadius: '4px',
              color: typeConfig.iconColor,
              cursor: 'pointer',
              transition: tokens.transitionFast,
            }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      
      {/* Dismiss button */}
      {toast.dismissible && (
        <button
          onClick={handleDismiss}
          style={{
            padding: '4px',
            background: 'transparent',
            border: 'none',
            color: tokens.textMuted,
            cursor: 'pointer',
            opacity: isHovered ? 1 : 0.5,
            transition: tokens.transitionFast,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
      
      {/* CSS animations */}
      <style>{`
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes toastSlideOut {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(20px);
          }
        }
      `}</style>
    </div>
  );
});

// =============================================================================
// LINK-SPECIFIC TOAST HELPERS
// =============================================================================

/**
 * Pre-built toasts for common link events
 * 
 * Usage:
 * const { showToast } = useToast();
 * showToast(linkToasts.viewLinked('Camera', 'Bones', '#4ade80'));
 */
export const linkToasts = {
  /**
   * View successfully linked
   */
  viewLinked: (property, targetViewName, targetViewColor) => ({
    type: 'sync',
    message: `${property} linked`,
    description: `Now syncing with "${targetViewName}"`,
    viewColor: targetViewColor,
    viewName: targetViewName,
  }),
  
  /**
   * View unlinked
   */
  viewUnlinked: (property, targetViewName) => ({
    type: 'info',
    message: `${property} unlinked`,
    description: `Stopped syncing with "${targetViewName}"`,
  }),
  
  /**
   * Joined a sync group
   */
  joinedGroup: (property, hubViewName, hubViewColor, memberCount) => ({
    type: 'sync',
    message: `Joined ${property} sync group`,
    description: `${memberCount} views syncing with "${hubViewName}"`,
    viewColor: hubViewColor,
    viewName: hubViewName,
  }),
  
  /**
   * Became hub of a sync group
   */
  becameHub: (property, memberCount) => ({
    type: 'success',
    message: `You're now the ${property} hub`,
    description: `${memberCount} view${memberCount === 1 ? '' : 's'} syncing to you`,
    icon: '★',
  }),
  
  /**
   * Link broken (target deleted/offline)
   */
  linkBroken: (property, targetViewName, reason) => ({
    type: 'warning',
    message: `${property} link broken`,
    description: reason || `"${targetViewName}" is no longer available`,
    action: {
      label: 'Find New Target',
      onClick: () => {}, // Implement: open link manager
    },
  }),
  
  /**
   * Received sync from another user
   */
  syncReceived: (property, userName, viewName, viewColor) => ({
    type: 'sync',
    message: `${property} updated`,
    description: `${userName} changed the ${property.toLowerCase()}`,
    viewColor: viewColor,
    viewName: viewName,
    userName: userName,
    duration: 2500, // Shorter for frequent syncs
  }),
  
  /**
   * User started following you
   */
  followerJoined: (userName, property) => ({
    type: 'info',
    message: `${userName} is following your ${property}`,
    icon: '👁',
    duration: 3000,
  }),
  
  /**
   * All properties linked
   */
  allPropertiesLinked: (targetViewName, targetViewColor) => ({
    type: 'success',
    message: 'All properties linked',
    description: `Fully synced with "${targetViewName}"`,
    viewColor: targetViewColor,
    viewName: targetViewName,
  }),
  
  /**
   * Hub transferred
   */
  hubTransferred: (property, newHubName, newHubColor) => ({
    type: 'info',
    message: `${property} hub changed`,
    description: `"${newHubName}" is now the source of truth`,
    viewColor: newHubColor,
    viewName: newHubName,
  }),
  
  /**
   * Cannot link (validation error)
   */
  cannotLink: (reason) => ({
    type: 'error',
    message: 'Cannot create link',
    description: reason,
  }),
};

// =============================================================================
// GENERAL APP TOAST HELPERS
// =============================================================================

/**
 * Pre-built toasts for general app events
 */
export const appToasts = {
  /**
   * File uploaded
   */
  fileUploaded: (fileName) => ({
    type: 'success',
    message: 'File uploaded',
    description: fileName,
  }),
  
  /**
   * Dataset loaded
   */
  datasetLoaded: (datasetName) => ({
    type: 'success',
    message: 'Dataset loaded',
    description: datasetName,
  }),
  
  /**
   * View created
   */
  viewCreated: (viewName, viewColor) => ({
    type: 'success',
    message: 'View created',
    viewColor,
    viewName,
  }),
  
  /**
   * View deleted
   */
  viewDeleted: (viewName) => ({
    type: 'info',
    message: 'View deleted',
    description: viewName,
  }),
  
  /**
   * Annotation saved
   */
  annotationSaved: () => ({
    type: 'success',
    message: 'Annotation saved',
    duration: 2000,
  }),
  
  /**
   * Compute job started
   */
  computeStarted: (jobName) => ({
    type: 'info',
    message: 'Processing started',
    description: jobName,
    icon: '⚙️',
  }),
  
  /**
   * Compute job completed
   */
  computeCompleted: (jobName) => ({
    type: 'success',
    message: 'Processing complete',
    description: jobName,
  }),
  
  /**
   * Compute job failed
   */
  computeFailed: (jobName, error) => ({
    type: 'error',
    message: 'Processing failed',
    description: error || jobName,
  }),
  
  /**
   * User joined session
   */
  userJoined: (userName) => ({
    type: 'info',
    message: `${userName} joined`,
    icon: '👋',
    duration: 3000,
  }),
  
  /**
   * User left session
   */
  userLeft: (userName) => ({
    type: 'info',
    message: `${userName} left`,
    duration: 3000,
  }),
  
  /**
   * Session saved
   */
  sessionSaved: () => ({
    type: 'success',
    message: 'Session saved',
    duration: 2000,
  }),
  
  /**
   * Network error
   */
  networkError: () => ({
    type: 'error',
    message: 'Connection lost',
    description: 'Attempting to reconnect...',
    duration: 0, // Persistent until dismissed
  }),
  
  /**
   * Reconnected
   */
  reconnected: () => ({
    type: 'success',
    message: 'Reconnected',
    duration: 2000,
  }),
  
  /**
   * Clipboard copy
   */
  copied: (what = 'Copied') => ({
    type: 'success',
    message: what,
    duration: 1500,
  }),
  
  /**
   * Undo action
   */
  undoAvailable: (action, onUndo) => ({
    type: 'info',
    message: action,
    action: {
      label: 'Undo',
      onClick: onUndo,
    },
    duration: 5000,
  }),
};

// =============================================================================
// VR-ADAPTIVE TOAST (for completeness)
// =============================================================================

/**
 * VR-adaptive toast variant
 * Uses larger sizing and touch targets in VR mode
 * 
 * Integrate with useAdaptive hook:
 * const { isVR } = useAdaptive();
 * 
 * In ToastProvider, pass isVR to adjust styling
 */
export const VR_TOAST_OVERRIDES = {
  width: 400,
  padding: '16px 18px',
  fontSize: {
    message: '14px',
    description: '12px',
  },
  iconSize: '24px',
  dismissButtonSize: '32px',
  gap: '12px',
};

// =============================================================================
// USAGE EXAMPLE
// =============================================================================

/**
 * Example component showing toast usage
 */
export function ToastUsageExample() {
  const { toast, showToast } = useToast();
  
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <button onClick={() => toast.info('This is an info message')}>
        Info
      </button>
      <button onClick={() => toast.success('Operation completed!')}>
        Success
      </button>
      <button onClick={() => toast.warning('Please review your settings')}>
        Warning
      </button>
      <button onClick={() => toast.error('Something went wrong')}>
        Error
      </button>
      <button onClick={() => showToast(linkToasts.viewLinked('Camera', 'Skull View', '#2dd4bf'))}>
        Link Toast
      </button>
      <button onClick={() => showToast(linkToasts.syncReceived('Camera', 'Dr. Smith', 'Bones', '#4ade80'))}>
        Sync Received
      </button>
      <button onClick={() => showToast(appToasts.undoAvailable('View deleted', () => console.log('Undo!')))}>
        With Undo
      </button>
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  ToastContainer,
  Toast,
  tokens as TOAST_TOKENS,
};

export default {
  ToastProvider,
  useToast,
  linkToasts,
  appToasts,
  VR_TOAST_OVERRIDES,
};
