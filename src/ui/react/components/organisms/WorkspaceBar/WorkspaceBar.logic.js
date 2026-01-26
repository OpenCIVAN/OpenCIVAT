/**
 * @file WorkspaceBar.logic.js
 * @description Business logic hooks for WorkspaceBar component.
 */

import { useState, useMemo, useCallback } from 'react';

/**
 * Hook to manage workspace bar state.
 */
export function useWorkspaceBar(workspaces, activeWorkspaceId) {
    const activeWorkspace = useMemo(() =>
        (workspaces || []).find(ws => ws.id === activeWorkspaceId) || null,
        [workspaces, activeWorkspaceId]
    );

    return { activeWorkspace };
}

/**
 * Hook to manage manager dropdowns (Popout and Breakout managers).
 */
export function useManagerDropdowns() {
    const [showPopoutDropdown, setShowPopoutDropdown] = useState(false);
    const [showBreakoutDropdown, setShowBreakoutDropdown] = useState(false);

    const togglePopout = useCallback(() => {
        setShowPopoutDropdown(prev => !prev);
        setShowBreakoutDropdown(false);
    }, []);

    const toggleBreakout = useCallback(() => {
        setShowBreakoutDropdown(prev => !prev);
        setShowPopoutDropdown(false);
    }, []);

    const closeAll = useCallback(() => {
        setShowPopoutDropdown(false);
        setShowBreakoutDropdown(false);
    }, []);

    return {
        showPopoutDropdown,
        showBreakoutDropdown,
        togglePopout,
        toggleBreakout,
        closeAll,
    };
}
