/**
 * ToolsSidebar Component
 *
 * Edit mode tools for grid manipulation.
 *
 * @param {function} onAddRow - Add row handler
 * @param {function} onRemoveRow - Remove row handler
 * @param {function} onAddColumn - Add column handler
 * @param {function} onRemoveColumn - Remove column handler
 * @param {boolean} canMerge - Whether merge is available
 * @param {function} onMerge - Merge cells handler
 * @param {Object} gridSize - Current grid size { rows, cols }
 */

import { memo } from 'react';
import {
    Plus,
    Minus,
    Rows,
    Columns,
    Merge,
    Split,
    ArrowUpFromLine,
    ArrowDownFromLine,
    ArrowLeftFromLine,
    ArrowRightFromLine,
} from 'lucide-react';
import './ToolsSidebar.scss';

export const ToolsSidebar = memo(function ToolsSidebar({
    onAddRow,
    onRemoveRow,
    onAddColumn,
    onRemoveColumn,
    canMerge = false,
    onMerge,
    onSplit,
    canSplit = false,
    gridSize = { rows: 4, cols: 4 },
}) {
    return (
        <div className="tools-sidebar">
            {/* Grid info */}
            <div className="tools-sidebar__info">
                <span className="tools-sidebar__label">Grid</span>
                <span className="tools-sidebar__value">
                    {gridSize.rows}×{gridSize.cols}
                </span>
            </div>

            {/* Row controls */}
            <div className="tools-sidebar__group">
                <span className="tools-sidebar__group-label">Rows</span>
                <div className="tools-sidebar__controls">
                    <button
                        className="tools-sidebar__btn"
                        onClick={onAddRow}
                        title="Add row"
                    >
                        <Plus size={12} />
                    </button>
                    <button
                        className="tools-sidebar__btn"
                        onClick={onRemoveRow}
                        disabled={gridSize.rows <= 1}
                        title="Remove row"
                    >
                        <Minus size={12} />
                    </button>
                </div>
            </div>

            {/* Column controls */}
            <div className="tools-sidebar__group">
                <span className="tools-sidebar__group-label">Columns</span>
                <div className="tools-sidebar__controls">
                    <button
                        className="tools-sidebar__btn"
                        onClick={onAddColumn}
                        title="Add column"
                    >
                        <Plus size={12} />
                    </button>
                    <button
                        className="tools-sidebar__btn"
                        onClick={onRemoveColumn}
                        disabled={gridSize.cols <= 1}
                        title="Remove column"
                    >
                        <Minus size={12} />
                    </button>
                </div>
            </div>

            {/* Merge/Split */}
            <div className="tools-sidebar__group">
                <span className="tools-sidebar__group-label">Cells</span>
                <div className="tools-sidebar__controls">
                    <button
                        className="tools-sidebar__btn tools-sidebar__btn--accent"
                        onClick={onMerge}
                        disabled={!canMerge}
                        title="Merge selected cells"
                    >
                        <Merge size={12} />
                    </button>
                    <button
                        className="tools-sidebar__btn"
                        onClick={onSplit}
                        disabled={!canSplit}
                        title="Split merged cell"
                    >
                        <Split size={12} />
                    </button>
                </div>
            </div>
        </div>
    );
});

export default ToolsSidebar;