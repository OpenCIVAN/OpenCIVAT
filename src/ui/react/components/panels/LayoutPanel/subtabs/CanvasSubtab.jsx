/**
 * CanvasSubtab Component
 *
 * Canvas configuration content for the Layout Panel.
 * Contains:
 * - Layout Mode (Grid/Flow toggle)
 * - New View Size (Spawn settings)
 * - Tools (Select, Pan, Merge, Edit mode)
 */

import React, { memo } from 'react';
import {
    Grid3X3,
    Rows,
    ArrowRight,
    ArrowDown,
    PlusCircle,
    MousePointer2,
    Hand,
    Combine,
    Pencil,
    Undo,
    Redo,
    Replace,
} from 'lucide-react';
import { SpawnSizePicker } from '../components/SpawnSizePicker';
import { LAYOUT_MODES, FLOW_DIRECTIONS, TOOLS, DROP_MODES } from '../LayoutPanel.logic';
import './CanvasSubtab.scss';

export const CanvasSubtab = memo(function CanvasSubtab({ logic }) {
    const {
        layoutMode,
        setLayoutMode,
        flowDirection,
        setFlowDirection,
        spawnSize,
        setSpawnSize,
        tool,
        setTool,
        editMode,
        toggleEditMode,
        dropMode,
        setDropMode,
        canUndo,
        canRedo,
        undo,
        redo,
    } = logic;

    return (
        <div className="canvas-subtab">
            {/* Layout Mode Section */}
            <div className="canvas-subtab__card" data-color="blue">
                <div className="canvas-subtab__card-header">
                    <Grid3X3 size={10} />
                    <span>Layout Mode</span>
                </div>

                {/* Grid/Flow Toggle */}
                <div className="etched-toggle">
                    <button
                        className={`etched-toggle__btn etched-toggle__btn--grid ${layoutMode === LAYOUT_MODES.GRID ? 'etched-toggle__btn--active' : ''}`}
                        onClick={() => setLayoutMode(LAYOUT_MODES.GRID)}
                    >
                        <Grid3X3 size={12} />
                        <span>Grid</span>
                    </button>
                    <button
                        className={`etched-toggle__btn etched-toggle__btn--flow ${layoutMode === LAYOUT_MODES.FLOW ? 'etched-toggle__btn--active' : ''}`}
                        onClick={() => setLayoutMode(LAYOUT_MODES.FLOW)}
                    >
                        <Rows size={12} />
                        <span>Flow</span>
                    </button>
                </div>

                {/* Flow Direction (only in Flow mode) */}
                {layoutMode === LAYOUT_MODES.FLOW && (
                    <div className="canvas-subtab__flow-direction">
                        <span className="canvas-subtab__label">Direction:</span>
                        <div className="etched-toggle">
                            <button
                                className={`etched-toggle__btn etched-toggle__btn--green etched-toggle__btn--compact ${flowDirection === FLOW_DIRECTIONS.ROW ? 'etched-toggle__btn--active' : ''}`}
                                onClick={() => setFlowDirection(FLOW_DIRECTIONS.ROW)}
                            >
                                <ArrowRight size={12} />
                                <span>Row</span>
                            </button>
                            <button
                                className={`etched-toggle__btn etched-toggle__btn--green etched-toggle__btn--compact ${flowDirection === FLOW_DIRECTIONS.COLUMN ? 'etched-toggle__btn--active' : ''}`}
                                onClick={() => setFlowDirection(FLOW_DIRECTIONS.COLUMN)}
                            >
                                <ArrowDown size={12} />
                                <span>Col</span>
                            </button>
                        </div>
                    </div>
                )}

                <div className="canvas-subtab__description">
                    {layoutMode === LAYOUT_MODES.FLOW
                        ? 'Views auto-arrange when added.'
                        : 'Manually place and resize views.'}
                </div>
            </div>

            {/* New View Size Section */}
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

            {/* Tools Section */}
            <div className="canvas-subtab__card" data-color="blue">
                <div className="canvas-subtab__card-header">
                    <MousePointer2 size={10} />
                    <span>Tools</span>
                </div>

                <div className="canvas-subtab__tools">
                    {/* Tool Buttons */}
                    <div className="canvas-subtab__tool-group">
                        <button
                            className={`layout-tool-btn layout-tool-btn--blue ${tool === TOOLS.SELECT ? 'layout-tool-btn--active' : ''}`}
                            onClick={() => setTool(TOOLS.SELECT)}
                            title="Select tool"
                        >
                            <MousePointer2 size={14} />
                        </button>
                        <button
                            className={`layout-tool-btn layout-tool-btn--teal ${tool === TOOLS.PAN ? 'layout-tool-btn--active' : ''}`}
                            onClick={() => setTool(TOOLS.PAN)}
                            title="Pan tool"
                        >
                            <Hand size={14} />
                        </button>
                        <button
                            className={`layout-tool-btn layout-tool-btn--purple ${tool === TOOLS.MERGE ? 'layout-tool-btn--active' : ''}`}
                            onClick={() => setTool(TOOLS.MERGE)}
                            title="Merge tool"
                        >
                            <Combine size={14} />
                        </button>
                    </div>

                    <div className="layout-divider" />

                    {/* Edit Mode Toggle */}
                    <button
                        className={`canvas-subtab__edit-btn ${editMode ? 'canvas-subtab__edit-btn--active' : ''}`}
                        onClick={toggleEditMode}
                    >
                        {editMode ? 'Done' : 'Edit'}
                    </button>

                    {/* Undo/Redo */}
                    <div className="canvas-subtab__tool-group">
                        <button
                            className="layout-tool-btn"
                            onClick={undo}
                            disabled={!canUndo}
                            title="Undo"
                        >
                            <Undo size={14} />
                        </button>
                        <button
                            className="layout-tool-btn"
                            onClick={redo}
                            disabled={!canRedo}
                            title="Redo"
                        >
                            <Redo size={14} />
                        </button>
                    </div>
                </div>

                {/* Drop Mode (only in Edit mode) */}
                {editMode && (
                    <div className="canvas-subtab__drop-mode">
                        <span className="canvas-subtab__label">Drop Mode:</span>
                        <div className="etched-toggle">
                            <button
                                className={`etched-toggle__btn etched-toggle__btn--green ${dropMode === DROP_MODES.ADD ? 'etched-toggle__btn--active' : ''}`}
                                onClick={() => setDropMode(DROP_MODES.ADD)}
                            >
                                <PlusCircle size={12} />
                                <span>Add</span>
                            </button>
                            <button
                                className={`etched-toggle__btn etched-toggle__btn--amber ${dropMode === DROP_MODES.REPLACE ? 'etched-toggle__btn--active' : ''}`}
                                onClick={() => setDropMode(DROP_MODES.REPLACE)}
                            >
                                <Replace size={12} />
                                <span>Replace</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

export default CanvasSubtab;