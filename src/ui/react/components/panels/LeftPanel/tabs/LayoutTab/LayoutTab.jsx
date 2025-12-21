// src/ui/react/components/panels/LeftPanel/tabs/LayoutTab/LayoutTab.jsx
// Layout tab - simplified without subtabs
//
// Shows canvas layout controls directly:
// - Layout Mode (Grid/Flow)
// - New View Size
// - Quick Layouts
// - Canvas Size
// - Canvas Tools
//
// NOTE: This is a standalone version that doesn't require LayoutPanelContext.
// It manages its own state and syncs with canvasManager directly.

import React, { memo, useState, useCallback, useEffect } from 'react';
import {
    LayoutGrid,
    Grid3X3,
    Rows3,
    Columns3,
    PlusCircle,
    MousePointer2,
    Hand,
    Merge,
    Maximize2,
    ArrowRight,
    ArrowDown,
    WifiOff,
    Loader2,
    AlertCircle,
    Minus,
    Plus,
} from 'lucide-react';
import { canvasManager } from '@Core/data/managers/CanvasManager.js';
// Canvas size persistence - try canvasState first, fall back to viewportState
import { loadCanvasSize, saveCanvasSize } from '@UI/react/hooks/canvasState.js';
// Alternative: import { loadCanvasSize, saveCanvasSize } from '@UI/react/hooks/viewportState.js';

import './LayoutTab.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

const LAYOUT_MODES = {
    GRID: 'grid',
    FLOW: 'flow',
};

const FLOW_DIRECTIONS = {
    ROW: 'row',
    COLUMN: 'column',
};

const TOOLS = {
    SELECT: 'select',
    PAN: 'pan',
    MERGE: 'merge',
};

const SPAWN_SIZES = [
    { id: '1x1', label: '1×1', rows: 1, cols: 1 },
    { id: '2x1', label: '2×1', rows: 1, cols: 2 },
    { id: '1x2', label: '1×2', rows: 2, cols: 1 },
    { id: '2x2', label: '2×2', rows: 2, cols: 2 },
];

const QUICK_LAYOUTS = [
    { id: 'single', label: 'Single', icon: Maximize2 },
    { id: 'side-by-side', label: 'Side by Side', icon: Columns3 },
    { id: 'stacked', label: 'Stacked', icon: Rows3 },
    { id: '2x2', label: '2×2 Grid', icon: Grid3X3 },
];

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

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

function QuickLayoutButton({ layout, onClick }) {
    const Icon = layout.icon;
    return (
        <button
            className="layout-tab__quick-btn"
            onClick={() => onClick?.(layout.id)}
            title={layout.label}
        >
            <Icon size={16} />
            <span>{layout.label}</span>
        </button>
    );
}

function CanvasSizeControl({ rows, cols, onChangeRows, onChangeCols }) {
    return (
        <div className="layout-tab__canvas-size">
            <div className="layout-tab__size-control">
                <span className="layout-tab__size-label">Rows</span>
                <div className="layout-tab__size-stepper">
                    <button onClick={() => onChangeRows?.(Math.max(1, rows - 1))} disabled={rows <= 1}>
                        <Minus size={12} />
                    </button>
                    <span>{rows}</span>
                    <button onClick={() => onChangeRows?.(rows + 1)}>
                        <Plus size={12} />
                    </button>
                </div>
            </div>
            <div className="layout-tab__size-control">
                <span className="layout-tab__size-label">Cols</span>
                <div className="layout-tab__size-stepper">
                    <button onClick={() => onChangeCols?.(Math.max(1, cols - 1))} disabled={cols <= 1}>
                        <Minus size={12} />
                    </button>
                    <span>{cols}</span>
                    <button onClick={() => onChangeCols?.(cols + 1)}>
                        <Plus size={12} />
                    </button>
                </div>
            </div>
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
    // STATE - Managed locally, synced with canvasManager
    // =========================================================================

    const [isLoading, setIsLoading] = useState(false);
    const [layoutMode, setLayoutMode] = useState(LAYOUT_MODES.GRID);
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
        // Get initial state from canvasManager if available
        const canvas = canvasManager?.getCanvas?.();
        if (canvas) {
            if (canvas.rows) setCanvasSizeState(prev => ({ ...prev, rows: canvas.rows }));
            if (canvas.cols) setCanvasSizeState(prev => ({ ...prev, cols: canvas.cols }));
        }
    }, []);

    // =========================================================================
    // HANDLERS
    // =========================================================================

    const handleLayoutModeChange = useCallback((mode) => {
        setLayoutMode(mode);
        // Dispatch event for canvas to react
        window.dispatchEvent(new CustomEvent('cia:layout-mode-changed', {
            detail: { mode }
        }));
    }, []);

    const handleFlowDirectionChange = useCallback((direction) => {
        setFlowDirection(direction);
        window.dispatchEvent(new CustomEvent('cia:flow-direction-changed', {
            detail: { direction }
        }));
    }, []);

    const handleSpawnSizeChange = useCallback((size) => {
        setSpawnSize(size);
        const sizeConfig = SPAWN_SIZES.find(s => s.id === size);
        window.dispatchEvent(new CustomEvent('cia:spawn-size-changed', {
            detail: { size, rows: sizeConfig?.rows || 1, cols: sizeConfig?.cols || 1 }
        }));
    }, []);

    const handleToolChange = useCallback((newTool) => {
        setTool(newTool);
        window.dispatchEvent(new CustomEvent('cia:canvas-tool-changed', {
            detail: { tool: newTool }
        }));
    }, []);

    const handleChangeRows = useCallback((newRows) => {
        const newSize = { rows: newRows, cols: canvasSize.cols };
        setCanvasSizeState(newSize);
        try { saveCanvasSize?.(newSize); } catch { /* ignore */ }
        canvasManager?.setCanvasSize?.(newRows, canvasSize.cols);
        window.dispatchEvent(new CustomEvent('cia:canvas-size-changed', {
            detail: newSize
        }));
    }, [canvasSize.cols]);

    const handleChangeCols = useCallback((newCols) => {
        const newSize = { rows: canvasSize.rows, cols: newCols };
        setCanvasSizeState(newSize);
        try { saveCanvasSize?.(newSize); } catch { /* ignore */ }
        canvasManager?.setCanvasSize?.(canvasSize.rows, newCols);
        window.dispatchEvent(new CustomEvent('cia:canvas-size-changed', {
            detail: newSize
        }));
    }, [canvasSize.rows]);

    const handleQuickLayout = useCallback((layoutId) => {
        // Apply quick layout based on ID
        const placements = canvasManager?.getPlacements?.() || [];
        const viewCount = placements.length;

        if (viewCount === 0) return;

        let newLayout = null;

        switch (layoutId) {
            case 'single':
                // Make first view fullscreen
                newLayout = { rows: 1, cols: 1 };
                break;
            case 'side-by-side':
                newLayout = { rows: 1, cols: Math.min(viewCount, 4) };
                break;
            case 'stacked':
                newLayout = { rows: Math.min(viewCount, 4), cols: 1 };
                break;
            case '2x2':
                newLayout = { rows: 2, cols: 2 };
                break;
            default:
                return;
        }

        if (newLayout) {
            setCanvasSizeState(newLayout);
            try { saveCanvasSize?.(newLayout); } catch { /* ignore */ }
            canvasManager?.setCanvasSize?.(newLayout.rows, newLayout.cols);
            window.dispatchEvent(new CustomEvent('cia:canvas-size-changed', {
                detail: newLayout
            }));
        }
    }, []);

    // =========================================================================
    // RENDER
    // =========================================================================

    if (isLoading) {
        return (
            <div className={`layout-tab layout-tab--loading ${className}`}>
                <div className="panel-header panel-header--green">
                    <LayoutGrid size={14} className="panel-header__icon" />
                    <span className="panel-header__title">Layout</span>
                </div>
                <div className="layout-tab__loading">
                    <Loader2 size={24} className="spin" />
                    <span>Loading canvas...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`layout-tab ${className}`}>
            {/* Header */}
            <div className="panel-header panel-header--green">
                <LayoutGrid size={14} className="panel-header__icon" />
                <span className="panel-header__title">Layout</span>
            </div>

            {/* Content */}
            <div className="layout-tab__content">
                {/* Layout Mode Card */}
                <div className="layout-tab__card" data-color="purple">
                    <div className="layout-tab__card-header">
                        <LayoutGrid size={10} />
                        <span>Layout Mode</span>
                    </div>
                    <div className="layout-tab__mode-toggle">
                        <button
                            className={`layout-tab__mode-btn ${layoutMode === LAYOUT_MODES.GRID ? 'layout-tab__mode-btn--active' : ''}`}
                            onClick={() => handleLayoutModeChange(LAYOUT_MODES.GRID)}
                        >
                            <Grid3X3 size={14} />
                            <span>Grid</span>
                        </button>
                        <button
                            className={`layout-tab__mode-btn ${layoutMode === LAYOUT_MODES.FLOW ? 'layout-tab__mode-btn--active' : ''}`}
                            onClick={() => handleLayoutModeChange(LAYOUT_MODES.FLOW)}
                        >
                            <Rows3 size={14} />
                            <span>Flow</span>
                        </button>
                    </div>

                    {layoutMode === LAYOUT_MODES.FLOW && (
                        <div className="layout-tab__flow-direction">
                            <span>Direction:</span>
                            <div className="layout-tab__direction-toggle">
                                <button
                                    className={flowDirection === FLOW_DIRECTIONS.ROW ? 'active' : ''}
                                    onClick={() => handleFlowDirectionChange(FLOW_DIRECTIONS.ROW)}
                                >
                                    <ArrowRight size={12} /> Row
                                </button>
                                <button
                                    className={flowDirection === FLOW_DIRECTIONS.COLUMN ? 'active' : ''}
                                    onClick={() => handleFlowDirectionChange(FLOW_DIRECTIONS.COLUMN)}
                                >
                                    <ArrowDown size={12} /> Col
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Canvas Size Card */}
                <div className="layout-tab__card" data-color="blue">
                    <div className="layout-tab__card-header">
                        <Grid3X3 size={10} />
                        <span>Canvas Size</span>
                    </div>
                    <CanvasSizeControl
                        rows={canvasSize.rows}
                        cols={canvasSize.cols}
                        onChangeRows={handleChangeRows}
                        onChangeCols={handleChangeCols}
                    />
                </div>

                {/* New View Size Card */}
                <div className="layout-tab__card" data-color="green">
                    <div className="layout-tab__card-header">
                        <PlusCircle size={10} />
                        <span>New View Size</span>
                    </div>
                    <SpawnSizePicker value={spawnSize} onChange={handleSpawnSizeChange} />
                    <p className="layout-tab__card-hint">
                        Default size when creating new views
                    </p>
                </div>

                {/* Quick Layouts Card */}
                <div className="layout-tab__card" data-color="amber">
                    <div className="layout-tab__card-header">
                        <LayoutGrid size={10} />
                        <span>Quick Layouts</span>
                    </div>
                    <div className="layout-tab__quick-layouts">
                        {QUICK_LAYOUTS.map(layout => (
                            <QuickLayoutButton
                                key={layout.id}
                                layout={layout}
                                onClick={handleQuickLayout}
                            />
                        ))}
                    </div>
                </div>

                {/* Tools Card */}
                <div className="layout-tab__card" data-color="teal">
                    <div className="layout-tab__card-header">
                        <MousePointer2 size={10} />
                        <span>Canvas Tools</span>
                    </div>
                    <div className="layout-tab__tools">
                        <button
                            className={`layout-tab__tool-btn ${tool === TOOLS.SELECT ? 'layout-tab__tool-btn--active' : ''}`}
                            onClick={() => handleToolChange(TOOLS.SELECT)}
                            title="Select"
                        >
                            <MousePointer2 size={14} />
                            <span>Select</span>
                        </button>
                        <button
                            className={`layout-tab__tool-btn ${tool === TOOLS.PAN ? 'layout-tab__tool-btn--active' : ''}`}
                            onClick={() => handleToolChange(TOOLS.PAN)}
                            title="Pan"
                        >
                            <Hand size={14} />
                            <span>Pan</span>
                        </button>
                        <button
                            className={`layout-tab__tool-btn ${tool === TOOLS.MERGE ? 'layout-tab__tool-btn--active' : ''}`}
                            onClick={() => handleToolChange(TOOLS.MERGE)}
                            title="Merge Cells"
                        >
                            <Merge size={14} />
                            <span>Merge</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default LayoutPanelContent;