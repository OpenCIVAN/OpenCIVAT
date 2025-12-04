// src/ui/react/components/panels/LeftPanel/tabs/LayoutTab.jsx
// Layout tab content for the unified left panel
//
// This component wraps the new headless LayoutPanel components
// and provides integration with the Left Panel system.

import React, { useState, useCallback } from 'react';
import { LayoutPanel, FloatingCanvasNavigator, useLayoutPanel } from '@UI/react/components/panels/LayoutPanel';

// =============================================================================
// SAMPLE DATA - Will be replaced with real data from context/stores
// =============================================================================

const INITIAL_CANVAS_SIZE = { rows: 4, cols: 5 };
const INITIAL_VIEWPORT = { row: 0, col: 0, rows: 2, cols: 3 };

const INITIAL_CELLS = [
    { id: 'c1', row: 0, col: 0, rowSpan: 1, colSpan: 2, instance: { id: 'i1', name: 'Brain MRI - Axial', dataset: 'Brain_Scan_001.nii', color: 'blue' } },
    { id: 'c2', row: 0, col: 2, rowSpan: 2, colSpan: 1, instance: { id: 'i2', name: 'Spine CT', dataset: 'CT_Overlay.dcm', color: 'purple' } },
    { id: 'c3', row: 1, col: 0, rowSpan: 1, colSpan: 1, instance: { id: 'i3', name: 'PCA Plot', dataset: 'Analysis.vtk', color: 'green' } },
    { id: 'c4', row: 1, col: 1, rowSpan: 1, colSpan: 1, instance: null },
    { id: 'c5', row: 2, col: 0, rowSpan: 1, colSpan: 3, instance: { id: 'i4', name: 'Timeline', dataset: 'Timeline.csv', color: 'amber' } },
    { id: 'c6', row: 3, col: 0, rowSpan: 1, colSpan: 2, instance: null },
    { id: 'c7', row: 3, col: 2, rowSpan: 1, colSpan: 1, instance: { id: 'i5', name: 'Comparison View', dataset: 'Reference.nii', color: 'pink' } },
    { id: 'c8', row: 0, col: 3, rowSpan: 2, colSpan: 2, instance: { id: 'i6', name: 'Full Scan', dataset: 'FullBody.dcm', color: 'teal' } },
    { id: 'c9', row: 2, col: 3, rowSpan: 2, colSpan: 2, instance: null },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function LayoutPanelContent({ workspaceId }) {
    // State management - will be replaced with context/stores
    const [cells, setCells] = useState(INITIAL_CELLS);
    const [canvasSize, setCanvasSize] = useState(INITIAL_CANVAS_SIZE);
    const [viewport, setViewport] = useState(INITIAL_VIEWPORT);

    // Handlers for state changes
    const handleCellsChange = useCallback((newCells) => {
        setCells(newCells);
    }, []);

    const handleCanvasSizeChange = useCallback((newSize) => {
        setCanvasSize(newSize);
    }, []);

    const handleViewportChange = useCallback((newViewport) => {
        setViewport(newViewport);
    }, []);

    const handlePopOut = useCallback(() => {
        // TODO: Integrate with FloatingPanelContext
        console.log('Pop out navigator');
    }, []);

    return (
        <LayoutPanel
            initialCells={cells}
            initialCanvasSize={canvasSize}
            initialViewport={viewport}
            onCellsChange={handleCellsChange}
            onCanvasSizeChange={handleCanvasSizeChange}
            onViewportChange={handleViewportChange}
            onPopOut={handlePopOut}
        />
    );
}

export default LayoutPanelContent;