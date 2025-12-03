// src/ui/react/components/panels/FloatingPanel/FloatingPanelContext.jsx
// State management for popped-out/floating panels
// Allows panels to be detached from the main layout and positioned freely

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// =============================================================================
// TYPES & CONSTANTS
// =============================================================================

/**
 * Default dimensions for floating panels
 */
export const FLOATING_PANEL_DEFAULTS = {
    width: 400,
    height: 500,
    minWidth: 280,
    minHeight: 200,
    maxWidth: 800,
    maxHeight: 900,
};

/**
 * Panel positions for VR mode (3D space)
 * x, y, z in meters from user's head position
 */
export const VR_PANEL_POSITIONS = {
    left: { x: -1.5, y: 0, z: -2 },
    right: { x: 1.5, y: 0, z: -2 },
    center: { x: 0, y: 0, z: -2 },
};

// =============================================================================
// CONTEXT
// =============================================================================

const FloatingPanelContext = createContext({
    floatingPanels: {},
    popOutPanel: () => { },
    dockPanel: () => { },
    updatePanelPosition: () => { },
    updatePanelSize: () => { },
    bringToFront: () => { },
    isPoppedOut: () => false,
    getPanelState: () => null,
});

/**
 * FloatingPanelProvider - Manages state for all floating panels
 *
 * @example
 * <FloatingPanelProvider>
 *   <App />
 *   <FloatingPanelPortal />
 * </FloatingPanelProvider>
 */
export function FloatingPanelProvider({ children }) {
    // Map of panelId -> panel state
    const [floatingPanels, setFloatingPanels] = useState({});
    // Z-index counter for stacking
    const [topZIndex, setTopZIndex] = useState(1000);

    // Load saved panel positions from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem('ciaFloatingPanels');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Only restore positions, not the fact that they were open
                // User needs to explicitly pop out panels each session
            }
        } catch (e) {
            console.warn('Failed to load floating panel state:', e);
        }
    }, []);

    // Save panel positions to localStorage when they change
    useEffect(() => {
        if (Object.keys(floatingPanels).length > 0) {
            try {
                const toSave = {};
                Object.entries(floatingPanels).forEach(([id, state]) => {
                    toSave[id] = {
                        x: state.x,
                        y: state.y,
                        width: state.width,
                        height: state.height,
                    };
                });
                localStorage.setItem('ciaFloatingPanelPositions', JSON.stringify(toSave));
            } catch (e) {
                console.warn('Failed to save floating panel state:', e);
            }
        }
    }, [floatingPanels]);

    /**
     * Pop out a panel from the docked position
     *
     * @param {string} panelId - Unique identifier (e.g., 'left-files', 'right-chat')
     * @param {Object} options - Initial position/size options
     */
    const popOutPanel = useCallback((panelId, options = {}) => {
        // Try to restore previous position
        let savedPosition = {};
        try {
            const saved = localStorage.getItem('ciaFloatingPanelPositions');
            if (saved) {
                const positions = JSON.parse(saved);
                if (positions[panelId]) {
                    savedPosition = positions[panelId];
                }
            }
        } catch (e) { }

        const newZIndex = topZIndex + 1;
        setTopZIndex(newZIndex);

        setFloatingPanels(prev => ({
            ...prev,
            [panelId]: {
                id: panelId,
                x: savedPosition.x ?? options.x ?? 100,
                y: savedPosition.y ?? options.y ?? 100,
                width: savedPosition.width ?? options.width ?? FLOATING_PANEL_DEFAULTS.width,
                height: savedPosition.height ?? options.height ?? FLOATING_PANEL_DEFAULTS.height,
                zIndex: newZIndex,
                minimized: false,
                title: options.title || panelId,
                icon: options.icon || null,
                color: options.color || 'blue',
                content: options.content || null,
                // For VR mode
                vrPosition: options.vrPosition || VR_PANEL_POSITIONS.center,
            }
        }));
    }, [topZIndex]);

    /**
     * Dock a panel back to its original position
     */
    const dockPanel = useCallback((panelId) => {
        setFloatingPanels(prev => {
            const { [panelId]: removed, ...rest } = prev;
            return rest;
        });
    }, []);

    /**
     * Update panel position (for dragging)
     */
    const updatePanelPosition = useCallback((panelId, x, y) => {
        setFloatingPanels(prev => {
            if (!prev[panelId]) return prev;
            return {
                ...prev,
                [panelId]: { ...prev[panelId], x, y }
            };
        });
    }, []);

    /**
     * Update panel size (for resizing)
     */
    const updatePanelSize = useCallback((panelId, width, height) => {
        setFloatingPanels(prev => {
            if (!prev[panelId]) return prev;
            return {
                ...prev,
                [panelId]: {
                    ...prev[panelId],
                    width: Math.max(FLOATING_PANEL_DEFAULTS.minWidth, Math.min(FLOATING_PANEL_DEFAULTS.maxWidth, width)),
                    height: Math.max(FLOATING_PANEL_DEFAULTS.minHeight, Math.min(FLOATING_PANEL_DEFAULTS.maxHeight, height)),
                }
            };
        });
    }, []);

    /**
     * Bring panel to front (increase z-index)
     */
    const bringToFront = useCallback((panelId) => {
        const newZIndex = topZIndex + 1;
        setTopZIndex(newZIndex);
        setFloatingPanels(prev => {
            if (!prev[panelId]) return prev;
            return {
                ...prev,
                [panelId]: { ...prev[panelId], zIndex: newZIndex }
            };
        });
    }, [topZIndex]);

    /**
     * Check if a panel is currently popped out
     */
    const isPoppedOut = useCallback((panelId) => {
        return !!floatingPanels[panelId];
    }, [floatingPanels]);

    /**
     * Get the current state of a floating panel
     */
    const getPanelState = useCallback((panelId) => {
        return floatingPanels[panelId] || null;
    }, [floatingPanels]);

    const value = {
        floatingPanels,
        popOutPanel,
        dockPanel,
        updatePanelPosition,
        updatePanelSize,
        bringToFront,
        isPoppedOut,
        getPanelState,
    };

    return (
        <FloatingPanelContext.Provider value={value}>
            {children}
        </FloatingPanelContext.Provider>
    );
}

/**
 * Hook to access floating panel state and actions
 */
export function useFloatingPanels() {
    const context = useContext(FloatingPanelContext);
    if (!context) {
        throw new Error('useFloatingPanels must be used within a FloatingPanelProvider');
    }
    return context;
}

/**
 * Hook for a specific panel to manage its pop-out state
 *
 * @param {string} panelId - The panel's unique identifier
 * @param {Object} config - Panel configuration (title, icon, color)
 */
export function usePanelPopOut(panelId, config = {}) {
    const { popOutPanel, dockPanel, isPoppedOut, bringToFront } = useFloatingPanels();

    const poppedOut = isPoppedOut(panelId);

    const popOut = useCallback((initialPosition) => {
        popOutPanel(panelId, { ...config, ...initialPosition });
    }, [panelId, config, popOutPanel]);

    const dock = useCallback(() => {
        dockPanel(panelId);
    }, [panelId, dockPanel]);

    const focus = useCallback(() => {
        bringToFront(panelId);
    }, [panelId, bringToFront]);

    return {
        poppedOut,
        popOut,
        dock,
        focus,
        toggle: poppedOut ? dock : popOut,
    };
}