/**
 * CanvasSubtab Component - Canvas configuration for Layout Panel
 */
import React, { memo, useCallback } from 'react';
import { Icon } from '@UI/react/components/common/Icon';
import { SpawnSizePicker } from '../components/SpawnSizePicker';
import { LAYOUT_MODES, FLOW_DIRECTIONS, TOOLS, DROP_MODES } from '../LayoutPanel.logic';
import './CanvasSubtab.scss';

// Quick layout presets
const QUICK_LAYOUTS = [
    { id: '1x1', label: '1×1', grid: [[1]] },
    { id: '2x1', label: '2×1', grid: [[1, 1]] },
    { id: '1x2', label: '1×2', grid: [[1], [1]] },
    { id: '2x2', label: '2×2', grid: [[1, 1], [1, 1]] },
    { id: '1+2', label: '1+2', grid: [[2, 1], [2, 1]] }, // 2-col span on left
    { id: '2+1', label: '2+1', grid: [[1, 2], [1, 2]] }, // 2-col span on right
];

// Quick Layout Button
const QuickLayoutBtn = memo(function QuickLayoutBtn({ layout, onClick }) {
    const rows = layout.grid.length;
    const cols = Math.max(...layout.grid.map(r => r.reduce((s, v) => s + v, 0)));

    return (
        <button className="quick-layout-btn" onClick={() => onClick(layout)} title={layout.label}>
            <div className="quick-layout-btn__icon" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
                {layout.grid.flat().map((span, i) => (
                    <div key={i} className="quick-layout-btn__cell" style={{ gridColumn: `span ${span}` }} />
                ))}
            </div>
            <span>{layout.label}</span>
        </button>
    );
});

export const CanvasSubtab = memo(function CanvasSubtab({ logic }) {
    const {
        layoutMode, setLayoutMode, flowDirection, setFlowDirection,
        spawnSize, setSpawnSize, tool, setTool, editMode, toggleEditMode,
        dropMode, setDropMode, canUndo, canRedo, undo, redo, applyQuickLayout,
    } = logic;

    const handleQuickLayout = useCallback((layout) => {
        applyQuickLayout?.(layout);
    }, [applyQuickLayout]);

    return (
        <div className="canvas-subtab">
            {/* Layout Mode */}
            <div className="canvas-subtab__card" data-color="blue">
                <div className="canvas-subtab__card-header">
                    <Grid3X3 size={10} />
                    <span>Layout Mode</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div className="etched-toggle">
                        <button
                            className={`etched-toggle__btn etched-toggle__btn--grid ${layoutMode === LAYOUT_MODES.GRID ? 'etched-toggle__btn--active' : ''}`}
                            onClick={() => setLayoutMode?.(LAYOUT_MODES.GRID)}
                        >
                            <Grid3X3 size={12} />
                            <span>Grid</span>
                        </button>
                        <button
                            className={`etched-toggle__btn etched-toggle__btn--flow ${layoutMode === LAYOUT_MODES.FLOW ? 'etched-toggle__btn--active' : ''}`}
                            onClick={() => setLayoutMode?.(LAYOUT_MODES.FLOW)}
                        >
                            <Rows size={12} />
                            <span>Flow</span>
                        </button>
                    </div>
                </div>

                {layoutMode === LAYOUT_MODES.FLOW && (
                    <div className="canvas-subtab__flow-direction">
                        <span className="canvas-subtab__label">Direction:</span>
                        <div className="etched-toggle">
                            <button
                                className={`etched-toggle__btn etched-toggle__btn--green etched-toggle__btn--compact ${flowDirection === FLOW_DIRECTIONS.ROW ? 'etched-toggle__btn--active' : ''}`}
                                onClick={() => setFlowDirection?.(FLOW_DIRECTIONS.ROW)}
                            >
                                <Icon name="arrowRight" size={12} /> Row
                            </button>
                            <button
                                className={`etched-toggle__btn etched-toggle__btn--green etched-toggle__btn--compact ${flowDirection === FLOW_DIRECTIONS.COLUMN ? 'etched-toggle__btn--active' : ''}`}
                                onClick={() => setFlowDirection?.(FLOW_DIRECTIONS.COLUMN)}
                            >
                                <ArrowDown size={12} /> Col
                            </button>
                        </div>
                    </div>
                )}

                <div className="canvas-subtab__description">
                    {layoutMode === LAYOUT_MODES.FLOW ? 'Views auto-arrange when added.' : 'Manually place and resize views.'}
                </div>
            </div>

            {/* New View Size */}
            <div className="canvas-subtab__card" data-color="green">
                <div className="canvas-subtab__card-header">
                    <PlusCircle size={10} />
                    <span>New View Size</span>
                </div>
                <SpawnSizePicker value={spawnSize} onChange={setSpawnSize} />
                <div className="canvas-subtab__description">
                    Click empty cell or drag dataset to spawn at this size
                </div>
            </div>

            {/* Quick Layouts */}
            <div className="canvas-subtab__card" data-color="amber">
                <div className="canvas-subtab__card-header">
                    <Icon name="layoutGrid" size={10} />
                    <span>Quick Layouts</span>
                </div>
                <div className="canvas-subtab__quick-layouts">
                    {QUICK_LAYOUTS.map(layout => (
                        <QuickLayoutBtn key={layout.id} layout={layout} onClick={handleQuickLayout} />
                    ))}
                </div>
            </div>

            {/* Tools */}
            <div className="canvas-subtab__card" data-color="blue">
                <div className="canvas-subtab__card-header">
                    <MousePointer2 size={10} />
                    <span>Tools</span>
                </div>

                <div className="canvas-subtab__tools">
                    <div className="canvas-subtab__tool-group">
                        <button
                            className={`layout-tool-btn layout-tool-btn--blue ${tool === TOOLS.SELECT ? 'layout-tool-btn--active' : ''}`}
                            onClick={() => setTool?.(TOOLS.SELECT)}
                            title="Select"
                        >
                            <MousePointer2 size={14} />
                        </button>
                        <button
                            className={`layout-tool-btn layout-tool-btn--teal ${tool === TOOLS.PAN ? 'layout-tool-btn--active' : ''}`}
                            onClick={() => setTool?.(TOOLS.PAN)}
                            title="Pan"
                        >
                            <Hand size={14} />
                        </button>
                        <button
                            className={`layout-tool-btn layout-tool-btn--purple ${tool === TOOLS.MERGE ? 'layout-tool-btn--active' : ''}`}
                            onClick={() => setTool?.(TOOLS.MERGE)}
                            title="Merge"
                        >
                            <Combine size={14} />
                        </button>

                        <div className="layout-divider" />

                        <button
                            className={`canvas-subtab__edit-btn ${editMode ? 'canvas-subtab__edit-btn--active' : ''}`}
                            onClick={toggleEditMode}
                        >
                            <Pencil size={12} />
                            {editMode ? 'Done' : 'Edit'}
                        </button>

                        <div className="layout-divider" />

                        <button className="layout-tool-btn" onClick={undo} disabled={!canUndo} title="Undo">
                            <Undo size={14} />
                        </button>
                        <button className="layout-tool-btn" onClick={redo} disabled={!canRedo} title="Redo">
                            <Redo size={14} />
                        </button>
                    </div>

                    {editMode && (
                        <div className="canvas-subtab__drop-mode">
                            <span className="canvas-subtab__label">Drop:</span>
                            <div className="etched-toggle">
                                <button
                                    className={`etched-toggle__btn etched-toggle__btn--green etched-toggle__btn--compact ${dropMode === DROP_MODES.ADD ? 'etched-toggle__btn--active' : ''}`}
                                    onClick={() => setDropMode?.(DROP_MODES.ADD)}
                                >
                                    <PlusCircle size={10} /> Add
                                </button>
                                <button
                                    className={`etched-toggle__btn etched-toggle__btn--amber etched-toggle__btn--compact ${dropMode === DROP_MODES.REPLACE ? 'etched-toggle__btn--active' : ''}`}
                                    onClick={() => setDropMode?.(DROP_MODES.REPLACE)}
                                >
                                    <Replace size={10} /> Replace
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default CanvasSubtab;