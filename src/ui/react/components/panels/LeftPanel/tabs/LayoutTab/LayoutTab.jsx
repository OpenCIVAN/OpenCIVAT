import React, { useCallback, useContext } from 'react';
import { LayoutPanel } from '@UI/react/components/panels/LayoutPanel';
import LayoutPanelContext from '@UI/react/components/panels/LayoutPanel/LayoutPanelContext';
import './LayoutTab.scss';

export function LayoutPanelContent({ workspaceId, canvasId: propCanvasId, onPopOut }) {
    // Get canvasId from context if not explicitly provided
    const context = useContext(LayoutPanelContext);
    const canvasId = propCanvasId || context?.canvasId;

    const handlePopOut = useCallback(() => {
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