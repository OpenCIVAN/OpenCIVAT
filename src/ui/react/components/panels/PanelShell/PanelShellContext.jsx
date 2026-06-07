/**
 * PanelShellContext
 *
 * State management for the PanelShell component system.
 * Handles panel positions, sizes, z-index, and persistence.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { STORAGE_KEY, BASE_Z_INDEX, MAX_Z_INDEX } from './constants';
import { authService } from '@Services/authService';

// =============================================================================
// CONTEXT
// =============================================================================

const PanelShellContext = createContext(null);

const hasOverlap = (aPos, aSize, bPos, bSize) => {
  if (!aPos || !aSize || !bPos || !bSize) return false;
  return !(
    aPos.x + aSize.width <= bPos.x ||
    aPos.x >= bPos.x + bSize.width ||
    aPos.y + aSize.height <= bPos.y ||
    aPos.y >= bPos.y + bSize.height
  );
};

const computeSpawnPosition = (panelId, desired, size, panels, offset) => {
  let position = { ...desired };
  const attempts = 5;
  for (let i = 0; i < attempts; i += 1) {
    const conflict = Object.entries(panels).some(([id, panel]) => {
      if (id === panelId || !panel.isOpen) return false;
      return hasOverlap(position, size, panel.position, panel.size || size);
    });
    if (!conflict) return position;
    position = {
      x: position.x + offset,
      y: position.y + offset,
    };
  }
  return position;
};

/**
 * Hook to access PanelShell context
 * @throws {Error} If used outside of PanelShellProvider
 */
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

/**
 * @typedef {Object} PanelState
 * @property {string} id - Panel identifier
 * @property {boolean} isOpen - Whether panel is visible
 * @property {{x: number, y: number}} position - Screen position
 * @property {{width: number, height: number}} size - Panel dimensions
 * @property {number} zIndex - Stack order
 * @property {boolean} minimized - Whether panel is minimized
 */

/**
 * Provider for PanelShell state management
 */
// Read localStorage synchronously so panels (including meta) are available
// before any child useEffects fire (e.g. PanelShell calling openPanel).
function loadInitialPanels() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.panels) return parsed.panels;
    }
  } catch (e) {
    // ignore
  }
  return {};
}

function loadInitialZIndex(panels) {
  return Object.values(panels).reduce(
    (max, p) => Math.max(max, p.zIndex || BASE_Z_INDEX),
    BASE_Z_INDEX
  );
}

export function PanelShellProvider({ children }) {
  const [panels, setPanels] = useState(() => loadInitialPanels());
  const [topZIndex, setTopZIndex] = useState(() => {
    const initial = loadInitialPanels();
    return Math.min(loadInitialZIndex(initial), MAX_Z_INDEX);
  });
  const [remoteReady, setRemoteReady] = useState(false);
  const panelsRef = useRef(panels);
  const remoteSaveTimeout = useRef(null);
  const SPAWN_OFFSET = 32;
  const touchedPanelsRef = useRef(new Set());
  const markPanelTouched = useCallback((panelId) => {
    if (!panelId) return;
    touchedPanelsRef.current.add(panelId);
  }, []);
  const resetTouchedPanels = useCallback(() => {
    touchedPanelsRef.current.clear();
  }, []);

  /**
   * Get the next z-index, normalizing all panels if we'd exceed MAX_Z_INDEX.
   * Returns { nextZ, normalizedPanels } — normalizedPanels is null if no reset needed.
   */
  const getNextZIndex = useCallback((currentPanels, currentTop) => {
    const nextZ = currentTop + 1;
    if (nextZ <= MAX_Z_INDEX) return { nextZ, normalizedPanels: null };

    // Normalize: reassign z-indices preserving relative order
    const entries = Object.entries(currentPanels);
    const sorted = entries.slice().sort((a, b) => (a[1].zIndex || 0) - (b[1].zIndex || 0));
    const normalizedPanels = {};
    sorted.forEach(([id, panel], i) => {
      normalizedPanels[id] = { ...panel, zIndex: BASE_Z_INDEX + i };
    });
    return { nextZ: BASE_Z_INDEX + entries.length, normalizedPanels };
  }, []);

  // Fetch remote state and deep-merge (preserving local meta)
  useEffect(() => {
    let isActive = true;
    (async () => {
      try {
        const headers = { 'Content-Type': 'application/json' };
        const authHeader = await authService.getAuthHeader().catch(() => null);
        if (authHeader) headers.Authorization = authHeader;
        const res = await fetch('/api/canvas-map/state', { headers, credentials: 'include' });
        if (!res.ok) throw res;
        const remote = await res.json();
        if (!isActive) return;
        if (remote?.panels && touchedPanelsRef.current.size === 0) {
          // Deep-merge: preserve local meta when remote doesn't have it
          setPanels((prev) => {
            const merged = { ...prev };
            for (const [id, remotePanel] of Object.entries(remote.panels)) {
              const local = prev[id];
              merged[id] = {
                ...remotePanel,
                meta: { ...(local?.meta || {}), ...(remotePanel.meta || {}) },
              };
            }
            return merged;
          });
          const maxZ = Object.values(remote.panels).reduce(
            (max, p) => Math.max(max, p.zIndex || BASE_Z_INDEX),
            BASE_Z_INDEX
          );
          setTopZIndex((prevMax) => Math.max(prevMax, Math.min(maxZ, MAX_Z_INDEX)));
          resetTouchedPanels();
        }
      } catch (e) {
        // swallow fetch failures
      } finally {
        if (isActive) {
          setRemoteReady(true);
        }
      }
    })();
    return () => {
      isActive = false;
    };
  }, []);

  // Save state locally and (when ready) persist to the server.
  useEffect(() => {
    panelsRef.current = panels;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ panels }));
    } catch (e) {
      console.warn('Failed to save panel state:', e);
    }
  }, [panels]);

  useEffect(() => {
    if (!remoteReady) return;
    if (remoteSaveTimeout.current) {
      clearTimeout(remoteSaveTimeout.current);
    }
    remoteSaveTimeout.current = setTimeout(async () => {
      try {
        const headers = { 'Content-Type': 'application/json' };
        const authHeader = await authService.getAuthHeader().catch(() => null);
        if (authHeader) headers.Authorization = authHeader;
        await fetch('/api/canvas-map/state', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({ panels: panelsRef.current }),
        });
      } catch (e) {
        // suppress network errors
      }
    }, 500);
    return () => {
      if (remoteSaveTimeout.current) {
        clearTimeout(remoteSaveTimeout.current);
      }
    };
  }, [panels, remoteReady]);

  useEffect(() => () => {
    if (remoteSaveTimeout.current) {
      clearTimeout(remoteSaveTimeout.current);
    }
  }, []);

  /**
   * Register a panel without opening it (used by PanelShell on first mount
   * when there is no saved state — prevents panels auto-opening on first visit).
   */
  const initPanel = useCallback((panelId, config = {}) => {
    setPanels(prev => {
      if (prev[panelId]) return prev; // already registered
      markPanelTouched(panelId);
      return {
        ...prev,
        [panelId]: {
          id: panelId,
          isOpen: false,
          position: config.position || { x: 100, y: 100 },
          size: config.size || { width: 320, height: 400 },
          zIndex: BASE_Z_INDEX,
          minimized: false,
          meta: config.meta || {},
        },
      };
    });
  }, [markPanelTouched]);

  /**
   * Open a panel with optional configuration
   */
  const openPanel = useCallback((panelId, config = {}) => {
    setPanels(prev => {
      const existing = prev[panelId];
      const { nextZ, normalizedPanels } = getNextZIndex(prev, topZIndex);
      const base = normalizedPanels || prev;
      const desiredPosition = config.position || existing?.position || { x: 100, y: 100 };
      const size = config.size || existing?.size || { width: 320, height: 400 };
      const safePosition = computeSpawnPosition(panelId, desiredPosition, size, prev, SPAWN_OFFSET);
      const meta = existing?.meta || config.meta || {};

      setTopZIndex(nextZ);
      markPanelTouched(panelId);
      return {
        ...base,
        [panelId]: {
          id: panelId,
          isOpen: true,
          position: safePosition,
          size,
          zIndex: nextZ,
          minimized: false,
          meta,
          ...config,
        },
      };
    });
  }, [topZIndex, getNextZIndex]);

  /**
   * Close a panel (keeps state for reopening)
   */
  const closePanel = useCallback((panelId) => {
    setPanels(prev => ({
      ...prev,
      [panelId]: { ...prev[panelId], isOpen: false },
    }));
  }, []);

  /**
   * Toggle a panel open/closed
   */
  const togglePanel = useCallback((panelId, config = {}) => {
    markPanelTouched(panelId);
    setPanels(prev => {
      const existing = prev[panelId];
      if (existing?.isOpen) {
        return {
          ...prev,
          [panelId]: { ...existing, isOpen: false },
        };
      }
      // Opening panel
      const { nextZ, normalizedPanels } = getNextZIndex(prev, topZIndex);
      const base = normalizedPanels || prev;
      const rawPosition = existing?.position || config.position || { x: 100, y: 100 };
      const size = existing?.size || config.size || { width: 320, height: 400 };
      // Clamp position to viewport so the panel is always reachable
      const desiredPosition = {
        x: Math.max(0, Math.min(rawPosition.x, window.innerWidth - (size.width || 320) - 20)),
        y: Math.max(0, Math.min(rawPosition.y, window.innerHeight - 80)),
      };
      const safePosition = computeSpawnPosition(panelId, desiredPosition, size, prev, SPAWN_OFFSET);
      const meta = existing?.meta || config.meta || {};
      setTopZIndex(nextZ);
      return {
        ...base,
        [panelId]: {
          id: panelId,
          isOpen: true,
          position: safePosition,
          size,
          zIndex: nextZ,
          minimized: false,
          meta,
          ...config,
        },
      };
    });
  }, [topZIndex, getNextZIndex, markPanelTouched]);

  /**
   * Update panel position
   */
  const updatePosition = useCallback((panelId, position) => {
    setPanels(prev => {
      if (!prev[panelId]) return prev;
      markPanelTouched(panelId);
      return {
        ...prev,
        [panelId]: { ...prev[panelId], position },
      };
    });
  }, [markPanelTouched]);

  /**
   * Update panel size
   */
  const updateSize = useCallback((panelId, size) => {
    setPanels(prev => {
      if (!prev[panelId]) return prev;
      markPanelTouched(panelId);
      return {
        ...prev,
        [panelId]: { ...prev[panelId], size },
      };
    });
  }, [markPanelTouched]);

  /**
   * Bring panel to front (highest z-index)
   */
  const bringToFront = useCallback((panelId) => {
    setPanels(prev => {
      if (!prev[panelId]) return prev;
      const { nextZ, normalizedPanels } = getNextZIndex(prev, topZIndex);
      const base = normalizedPanels || prev;
      setTopZIndex(nextZ);
      markPanelTouched(panelId);
      return {
        ...base,
        [panelId]: { ...base[panelId], zIndex: nextZ },
      };
    });
  }, [topZIndex, getNextZIndex, markPanelTouched]);

  /**
   * Toggle panel minimized state
   */
  const toggleMinimize = useCallback((panelId) => {
    setPanels(prev => {
      if (!prev[panelId]) return prev;
      return {
        ...prev,
        [panelId]: { ...prev[panelId], minimized: !prev[panelId].minimized },
      };
    });
  }, []);

  const updatePanelMeta = useCallback((panelId, metaUpdates) => {
    setPanels(prev => {
      if (!prev[panelId]) return prev;
      markPanelTouched(panelId);
      return {
        ...prev,
        [panelId]: {
          ...prev[panelId],
          meta: { ...(prev[panelId].meta || {}), ...(metaUpdates || {}) },
        },
      };
    });
  }, [markPanelTouched]);

  /**
   * Get panel state by ID
   */
  const getPanelState = useCallback((panelId) => {
    return panels[panelId] || null;
  }, [panels]);

  /**
   * Check if panel is currently open
   */
  const isPanelOpen = useCallback((panelId) => {
    return panels[panelId]?.isOpen || false;
  }, [panels]);

  /**
   * Get all open panels
   */
  const getOpenPanels = useCallback(() => {
    return Object.values(panels).filter(p => p.isOpen);
  }, [panels]);

  const value = {
    panels,
    initPanel,
    openPanel,
    closePanel,
    togglePanel,
    updatePosition,
    updateSize,
    bringToFront,
    toggleMinimize,
    updatePanelMeta,
    getPanelState,
    isPanelOpen,
    getOpenPanels,
  };

  return (
    <PanelShellContext.Provider value={value}>
      {children}
    </PanelShellContext.Provider>
  );
}

export default PanelShellContext;
