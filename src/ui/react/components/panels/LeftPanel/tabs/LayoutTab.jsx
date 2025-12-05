// src/ui/react/components/panels/LeftPanel/tabs/LayoutTab.jsx
// Layout tab content - now simplified since useLayoutPanel manages its own data
//
// BEFORE: LayoutTab managed mock state and passed it as props
// AFTER: LayoutTab just renders LayoutPanel, which handles everything internally

import React, { useCallback } from 'react';
import { LayoutPanel } from '@UI/react/components/panels/LayoutPanel';
// FloatingCanvasNavigator is rendered elsewhere (in the workspace area)

/**
 * LayoutTab - Container for the Layout Panel in the left sidebar
 *
 * This is now a thin wrapper. The LayoutPanel component uses useLayoutPanel
 * internally, which consumes useCanvas() for real server data.
 *
 * Props:
 * - canvasId: Optional - target a specific canvas (uses active canvas by default)
 * - onPopOut: Callback when user clicks pop-out button on navigator
 */
export function LayoutPanelContent({ canvasId, onPopOut }) {
    const handlePopOut = useCallback(() => {
        // TODO: Integrate with FloatingPanelContext or window.open
        console.log('Pop out navigator to floating window');
        onPopOut?.();
    }, [onPopOut]);

    return (
        <LayoutPanel
            canvasId={canvasId}
            onPopOut={handlePopOut}
        />
    );
}

export default LayoutPanelContent;