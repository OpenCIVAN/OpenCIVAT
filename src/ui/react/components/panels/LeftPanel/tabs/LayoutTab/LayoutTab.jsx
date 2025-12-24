// src/ui/react/components/panels/LeftPanel/tabs/LayoutTab/LayoutTab.jsx
// Layout tab - simplified without Grid/Flow toggle
//
// Both Grid and Flow modes are always accessible:
// - Grid: Manual placement by clicking cells
// - Flow: Auto-arrangement when using "+ New View"
//
// User just picks flow direction (Row-first or Column-first)
// Canvas Navigator is permanently docked at bottom

import React, { memo, useState, useCallback, useEffect, useMemo } from 'react';
import { Icon } from '@UI/react/components/common/Icon';
import { canvasManager } from '@Core/data/managers/CanvasManager.js';
import { loadCanvasSize, saveCanvasSize } from '@UI/react/hooks/canvasState.js';
import {
    CanvasNavigator,
    useLayoutPanelContext,
    useLayoutPanel,
    FLOW_DIRECTIONS,
    TOOLS,
} from '@UI/react/components/panels/LayoutPanel';
import './LayoutTab.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

const SPAWN_SIZES = [
    { id: '1x1', label: '1×1', rows: 1, cols: 1 },
    { id: '2x1', label: '2×1', rows: 1, cols: 2 },
    { id: '1x2', label: '1×2', rows: 2, cols: 1 },
    { id: '2x2', label: '2×2', rows: 2, cols: 2 },
];

const QUICK_LAYOUTS = [
    { id: 'single', label: 'Single', icon: 'maximize2', rows: 1, cols: 1 },
    { id: 'side-by-side', label: 'Side by Side', icon: 'columns3', rows: 1, cols: 2 },
    { id: 'stacked', label: 'Stacked', icon: 'rows3', rows: 2, cols: 1 },
    { id: '2x2', label: '2×2 Grid', icon: 'grid3X3', rows: 2, cols: 2 },
];

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Spawn Size Picker - Select default size for new views
 */
function SpawnSizePicker({ value, onChange }) {
    return (
        <div className="layout-tab__spawn-sizes">
            {SPAWN_SIZES.map(size => (
                <button
                    key={size.id}
                    className={`layout-tab__spawn-btn ${value === size.id ? 'layout-tab__spawn-btn--active' : ''}`}
                    onClick={() => onChange?.(size.id)}
                    title={size.label}
                >
                    <div
                        className="layout-tab__spawn-preview"
                        style={{
                            gridTemplateColumns: `repeat(${size.cols}, 1fr)`,
                            gridTemplateRows: `repeat(${size.rows}, 1fr)`,
                        }}
                    >
                        <div className="layout-tab__spawn-cell" />
                    </div>
                    <span>{size.label}</span>
                </button>
            ))}
        </div>
    );
}

/**
 * Canvas Size Control - Rows and columns steppers
 */
function CanvasSizeControl({ rows, cols, onChangeRows, onChangeCols }) {
    return (
        <div className="layout-tab__canvas-size">
            <div className="layout-tab__size-control">
                <span className="layout-tab__size-label">Rows</span>
                <div className="layout-tab__size-stepper">
                    <button
                        onClick={() => onChangeRows?.(Math.max(1, rows - 1))}
                        disabled={rows <= 1}
                    >
                        <Icon name="remove" size={12} />
                    </button>
                    <span className="layout-tab__size-value">{rows}</span>
                    <button onClick={() => onChangeRows?.(rows + 1)}>
                        <Icon name="add" size={12} />
                    </button>
                </div>
            </div>
            <div className="layout-tab__size-control">
                <span className="layout-tab__size-label">Cols</span>
                <div className="layout-tab__size-stepper">
                    <button
                        onClick={() => onChangeCols?.(Math.max(1, cols - 1))}
                        disabled={cols <= 1}
                    >
                        <Icon name="remove" size={12} />
                    </button>
                    <span className="layout-tab__size-value">{cols}</span>
                    <button onClick={() => onChangeCols?.(cols + 1)}>
                        <Icon name="add" size={12} />
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Canvas Tools - Select, Pan, Merge
 */
function CanvasTools({ tool, setTool }) {
    return (
        <div className="layout-tab__tools">
            <button
                className={`layout-tab__tool-btn ${tool === TOOLS.SELECT ? 'layout-tab__tool-btn--active' : ''}`}
                onClick={() => setTool?.(TOOLS.SELECT)}
                title="Select - Click to select cells"
                data-color="blue"
            >
                <Icon name="mousePointer2" size={14} />
                <span>Select</span>
            </button>
            <button
                className={`layout-tab__tool-btn ${tool === TOOLS.PAN ? 'layout-tab__tool-btn--active' : ''}`}
                onClick={() => setTool?.(TOOLS.PAN)}
                title="Pan - Drag to pan viewport"
                data-color="teal"
            >
                <Icon name="hand" size={14} />
                <span>Pan</span>
            </button>
            <button
                className={`layout-tab__tool-btn ${tool === TOOLS.MERGE ? 'layout-tab__tool-btn--active' : ''}`}
                onClick={() => setTool?.(TOOLS.MERGE)}
                title="Merge - Select cells to merge/unmerge"
                data-color="purple"
            >
                <Icon name="merge" size={14} />
                <span>Merge</span>
            </button>
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const LayoutPanelContent = memo(function LayoutPanelContent({
    workspaceId,
    className = '',
}) {
    // =========================================================================
    // GET LAYOUT PANEL CONTEXT
    // =========================================================================

    // Get context if inside LayoutPanelProvider
    const layoutContext = useLayoutPanelContext();

    // Create standalone logic - must be called unconditionally (React hooks rules)
    const standaloneLogic = useLayoutPanel({ canvasId: workspaceId });

    // Prefer context logic if available
    const layoutLogic = layoutContext?.logic || standaloneLogic;

    // =========================================================================
    // STATE
    // =========================================================================

    const [isLoading, setIsLoading] = useState(false);
    const [flowDirection, setFlowDirection] = useState(FLOW_DIRECTIONS.ROW);
    const [spawnSize, setSpawnSize] = useState('1x1');
    const [tool, setTool] = useState(TOOLS.SELECT);

    // Canvas size from localStorage or default
    const [canvasSize, setCanvasSizeState] = useState(() => {
        try {
            const saved = loadCanvasSize?.();
            return saved || { rows: 3, cols: 3 };
        } catch {
            return { rows: 3, cols: 3 };
        }
    });

    // =========================================================================
    // SYNC WITH CANVAS MANAGER
    // =========================================================================

    useEffect(() => {
        const canvas = canvasManager?.getCanvas?.();
        if (canvas) {
            setCanvasSizeState({ rows: canvas.rows || 3, cols: canvas.cols || 3 });
            setFlowDirection(canvas.flowDirection || FLOW_DIRECTIONS.ROW);
        }
    }, []);

    // =========================================================================
    // HANDLERS
    // =========================================================================

    // =========================================================================
    // HANDLERS - Use events, let CanvasWorkspace handle API calls
    // =========================================================================

    const handleFlowDirectionChange = useCallback((direction) => {
        setFlowDirection(direction);
        // Dispatch event - CanvasWorkspace will handle the actual API call
        window.dispatchEvent(new CustomEvent('cia:flow-direction-changed', {
            detail: { direction }
        }));
    }, []);

    const handleRowsChange = useCallback((rows) => {
        const newSize = { ...canvasSize, rows };
        setCanvasSizeState(newSize);
        try { saveCanvasSize?.(newSize); } catch { /* ignore */ }
        // Dispatch event - CanvasWorkspace will handle the actual API call
        window.dispatchEvent(new CustomEvent('cia:canvas-size-changed', {
            detail: newSize
        }));
    }, [canvasSize]);

    const handleColsChange = useCallback((cols) => {
        const newSize = { ...canvasSize, cols };
        setCanvasSizeState(newSize);
        try { saveCanvasSize?.(newSize); } catch { /* ignore */ }
        // Dispatch event - CanvasWorkspace will handle the actual API call
        window.dispatchEvent(new CustomEvent('cia:canvas-size-changed', {
            detail: newSize
        }));
    }, [canvasSize]);

    const handleQuickLayout = useCallback((layout) => {
        const newSize = { rows: layout.rows, cols: layout.cols };
        setCanvasSizeState(newSize);
        try { saveCanvasSize?.(newSize); } catch { /* ignore */ }
        // Dispatch event - CanvasWorkspace will handle the actual API call
        window.dispatchEvent(new CustomEvent('cia:canvas-size-changed', {
            detail: newSize
        }));
    }, []);

    // =========================================================================
    // RENDER - LOADING
    // =========================================================================

    if (isLoading) {
        return (
            <div className={`layout-tab layout-tab--loading ${className}`}>
                <div className="panel-header panel-header--green">
                    <Icon name="layoutGrid" size={14} className="panel-header__icon" />
                    <span className="panel-header__title">Layout</span>
                </div>
                <div className="layout-tab__loading">
                    <Icon name="loader" size={24} className="spin" />
                    <span>Loading canvas...</span>
                </div>
            </div>
        );
    }

    // =========================================================================
    // RENDER - MAIN
    // =========================================================================

    return (
        <div className={`layout-tab ${className}`}>
            {/* Header */}
            <div className="panel-header panel-header--green">
                <Icon name="layoutGrid" size={14} className="panel-header__icon" />
                <span className="panel-header__title">Layout</span>
            </div>

            {/* Scrollable Content */}
            <div className="layout-tab__content">
                {/* Flow Direction Card */}
                <div className="layout-tab__card" data-color="purple">
                    <div className="layout-tab__card-header">
                        <Icon name="layoutGrid" size={10} />
                        <span>Flow Direction</span>
                    </div>
                    <p className="layout-tab__card-description">
                        When auto-placing views, fill cells in this order:
                    </p>
                    <div className="layout-tab__direction-toggle">
                        <button
                            className={`layout-tab__direction-btn ${flowDirection === FLOW_DIRECTIONS.ROW ? 'layout-tab__direction-btn--active' : ''}`}
                            onClick={() => handleFlowDirectionChange(FLOW_DIRECTIONS.ROW)}
                        >
                            <Icon name="arrowRight" size={14} />
                            <span>Row</span>
                        </button>
                        <button
                            className={`layout-tab__direction-btn ${flowDirection === FLOW_DIRECTIONS.COLUMN ? 'layout-tab__direction-btn--active' : ''}`}
                            onClick={() => handleFlowDirectionChange(FLOW_DIRECTIONS.COLUMN)}
                        >
                            <Icon name="arrowDown" size={14} />
                            <span>Col</span>
                        </button>
                    </div>
                </div>

                {/* Canvas Size Card */}
                <div className="layout-tab__card" data-color="blue">
                    <div className="layout-tab__card-header">
                        <Icon name="grid3x3" size={10} />
                        <span>Canvas Size</span>
                    </div>
                    <CanvasSizeControl
                        rows={canvasSize.rows}
                        cols={canvasSize.cols}
                        onChangeRows={handleRowsChange}
                        onChangeCols={handleColsChange}
                    />
                </div>

                {/* New View Size Card */}
                <div className="layout-tab__card" data-color="green">
                    <div className="layout-tab__card-header">
                        <Icon name="plusCircle" size={10} />
                        <span>New View Size</span>
                    </div>
                    <SpawnSizePicker value={spawnSize} onChange={setSpawnSize} />
                    <p className="layout-tab__card-description">
                        Default size when creating new views
                    </p>
                </div>

                {/* Quick Layouts Card */}
                <div className="layout-tab__card" data-color="amber">
                    <div className="layout-tab__card-header">
                        <Icon name="grid3x3" size={10} />
                        <span>Quick Layouts</span>
                    </div>
                    <div className="layout-tab__quick-layouts">
                        {QUICK_LAYOUTS.map(layout => {
                            const Icon = layout.icon;
                            return (
                                <button
                                    key={layout.id}
                                    className="layout-tab__quick-btn"
                                    onClick={() => handleQuickLayout(layout)}
                                    title={layout.label}
                                >
                                    <Icon size={14} />
                                    <span>{layout.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Canvas Tools Card */}
                <div className="layout-tab__card" data-color="teal">
                    <div className="layout-tab__card-header">
                        <Icon name="mousePointer2" size={10} />
                        <span>Canvas Tools</span>
                    </div>
                    <CanvasTools tool={tool} setTool={setTool} />
                </div>
            </div>

            {/* Permanently Docked Canvas Navigator */}
            <div className="layout-tab__navigator">
                <CanvasNavigator
                    isDocked={true}
                    logic={layoutLogic}
                />
            </div>
        </div>
    );
});

// Alias for backward compatibility
export { LayoutPanelContent as LayoutTab };
export default LayoutPanelContent;