// src/ui/react/components/panels/LayoutPanel/components/CanvasNavigator/CanvasNavigator.jsx
// Enhanced Canvas Navigator with vibrant colors and tooltips
//
// This component gets data from LayoutPanelContext and renders a beautiful
// minimap with colored cells, tooltips, and full navigation/edit functionality.

import React, { memo, useState, useMemo, useCallback, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { Icon } from '@UI/react/components/common/Icon';
import { useLayoutPanelContext, DOCK_POSITIONS } from "../../LayoutPanelContext";

// =============================================================================
// DESIGN TOKENS - Neutral frosted glass aesthetic
// =============================================================================

const tokens = {
    // Neutral backgrounds (no blue tint)
    bgPrimary: '#0d0d0d',
    bgSecondary: '#151515',
    bgTertiary: '#1c1c1c',

    // Borders
    borderSubtle: 'rgba(255,255,255,0.06)',
    borderDefault: 'rgba(255,255,255,0.1)',

    // Text
    textPrimary: '#f0f0f0',
    textSecondary: '#a0a0a0',
    textMuted: '#666666',
    textTertiary: '#505050',

    // Accents
    accentBlue: '#60a5fa',
    accentGreen: '#4ade80',
    accentAmber: '#fbbf24',
    accentPurple: '#a78bfa',
    accentTeal: '#2dd4bf',
    accentPink: '#f472b6',
    accentRed: '#f87171',

    // Glass effects
    glassLight: 'rgba(255,255,255,0.03)',
    glassMedium: 'rgba(255,255,255,0.06)',
};

// Vibrant instance colors for cells
const INSTANCE_COLORS = [
    '#60a5fa', // blue
    '#4ade80', // green  
    '#f472b6', // pink
    '#fbbf24', // amber
    '#2dd4bf', // teal
    '#a78bfa', // purple
    '#f87171', // red
    '#38bdf8', // sky
];

// =============================================================================
// CONSTANTS
// =============================================================================

const DISPLAY_MODES = {
    NAMES: 'names',
    NUMBERS: 'numbers',
    COLORS: 'colors',
};

const NAV_MODES = {
    NAVIGATE: 'navigate',
    EDIT: 'edit',
};

// Export for external use
export { DISPLAY_MODES, NAV_MODES, INSTANCE_COLORS };

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const NavBtn = memo(({ children, onClick, active, color, disabled, title, size = 'md', style = {} }) => {
    const sizes = {
        xs: { width: 16, height: 16, fontSize: 8 },
        sm: { width: 20, height: 20, fontSize: 9 },
        md: { width: 24, height: 24, fontSize: 10 },
        lg: { width: 28, height: 28, fontSize: 11 },
    };
    const s = sizes[size];
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            style={{
                width: s.width,
                height: s.height,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: active ? `${color || tokens.accentBlue}20` : 'transparent',
                border: `1px solid ${active ? color || tokens.accentBlue : tokens.borderSubtle}`,
                borderRadius: 4,
                color: active ? color || tokens.accentBlue : disabled ? tokens.textTertiary : tokens.textMuted,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.4 : 1,
                transition: 'all 0.15s ease',
                fontSize: s.fontSize,
                ...style,
            }}
        >
            {children}
        </button>
    );
});

const SectionLabel = memo(({ children, color }) => (
    <div style={{
        fontSize: 8,
        fontWeight: 600,
        color: color || tokens.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: 4,
    }}>
        {children}
    </div>
));

// Hook for press-and-hold functionality
function usePressAndHold(callback, { delay = 400, interval = 80 } = {}) {
    const timeoutRef = useRef(null);
    const intervalRef = useRef(null);
    const callbackRef = useRef(callback);

    // Keep callback ref updated
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    const start = useCallback(() => {
        // Fire immediately
        if (callbackRef.current) callbackRef.current();

        // After delay, start repeating
        timeoutRef.current = setTimeout(() => {
            intervalRef.current = setInterval(() => {
                if (callbackRef.current) callbackRef.current();
            }, interval);
        }, delay);
    }, [delay, interval]);

    const stop = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => stop();
    }, [stop]);

    return { start, stop };
}

// Press-and-hold button component
const HoldButton = memo(({ children, onActivate, disabled, title, size = 'xs', color, active, style = {} }) => {
    const safeCallback = useCallback(() => {
        if (onActivate) onActivate();
    }, [onActivate]);

    const { start, stop } = usePressAndHold(safeCallback);

    const sizes = {
        xs: { width: 18, height: 18, fontSize: 8 },
        sm: { width: 22, height: 22, fontSize: 9 },
        md: { width: 26, height: 26, fontSize: 10 },
    };
    const s = sizes[size];

    return (
        <button
            onMouseDown={disabled ? undefined : start}
            onMouseUp={stop}
            onMouseLeave={stop}
            onTouchStart={disabled ? undefined : start}
            onTouchEnd={stop}
            disabled={disabled}
            title={title}
            style={{
                width: s.width,
                height: s.height,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: active ? `${color || tokens.accentBlue}20` : 'transparent',
                border: `1px solid ${active ? color || tokens.accentBlue : tokens.borderSubtle}`,
                borderRadius: 4,
                color: active ? color || tokens.accentBlue : disabled ? tokens.textTertiary : tokens.textMuted,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.4 : 1,
                transition: 'all 0.15s ease',
                fontSize: s.fontSize,
                ...style,
            }}
        >
            {children}
        </button>
    );
});

// Compact number spinner with press-and-hold, no input field
const NumberSpinner = memo(({ value, onChange, min = 1, max = 10, label, color, compact = false }) => {
    // Ensure value is a valid number
    const safeValue = typeof value === 'number' && !isNaN(value) ? value : min;

    const decrement = useCallback(() => {
        const newVal = Math.max(min, safeValue - 1);
        onChange(newVal);
    }, [onChange, min, safeValue]);

    const increment = useCallback(() => {
        const newVal = Math.min(max, safeValue + 1);
        onChange(newVal);
    }, [onChange, max, safeValue]);

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 2 : 3 }}>
            {label && <span style={{ fontSize: 9, color: tokens.textMuted, minWidth: 14 }}>{label}</span>}
            <HoldButton
                size={compact ? 'xs' : 'sm'}
                onActivate={decrement}
                disabled={safeValue <= min}
                title={`Decrease (min: ${min})`}
            >
                <Minus size={compact ? 8 : 10} />
            </HoldButton>
            <span style={{
                minWidth: compact ? 22 : 26,
                padding: '2px 4px',
                background: `${color || tokens.accentBlue}15`,
                border: `1px solid ${color || tokens.accentBlue}30`,
                borderRadius: 4,
                color: color || tokens.textSecondary,
                fontSize: compact ? 10 : 11,
                textAlign: 'center',
                fontFamily: 'monospace',
                fontWeight: 600,
            }}>
                {safeValue}
            </span>
            <HoldButton
                size={compact ? 'xs' : 'sm'}
                onActivate={increment}
                disabled={safeValue >= max}
                title={`Increase (max: ${max})`}
            >
                <Plus size={compact ? 8 : 10} />
            </HoldButton>
        </div>
    );
});

// Dock Position Picker Dropdown
const DockPositionPicker = memo(({ currentPosition, onPositionChange, onClose }) => (
    <div style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: 4,
        padding: 8,
        background: tokens.bgSecondary,
        border: `1px solid ${tokens.borderDefault}`,
        borderRadius: 6,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 28px)',
        gap: 4,
        zIndex: 100,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    }}>
        {[
            { pos: DOCK_POSITIONS.TOP_LEFT, icon: 'cornerUpLeft' },
            { pos: null },
            { pos: DOCK_POSITIONS.TOP_RIGHT, icon: 'cornerUpRight' },
            { pos: DOCK_POSITIONS.LEFT_PANEL, icon: 'panelLeft' },
            { pos: DOCK_POSITIONS.FLOAT, icon: 'move' },
            { pos: DOCK_POSITIONS.MINIMIZED, icon: 'minimize2' },
            { pos: DOCK_POSITIONS.BOTTOM_LEFT, icon: 'cornerDownLeft' },
            { pos: null },
            { pos: DOCK_POSITIONS.BOTTOM_RIGHT, icon: 'cornerDownRight' },
        ].map(({ pos, icon: Icon }, idx) => (
            pos ? (
                <button
                    key={pos}
                    onClick={() => { onPositionChange(pos); onClose(); }}
                    title={pos}
                    style={{
                        width: 28,
                        height: 28,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: currentPosition === pos ? `${tokens.accentBlue}20` : 'transparent',
                        border: `1px solid ${currentPosition === pos ? tokens.accentBlue : tokens.borderSubtle}`,
                        borderRadius: 4,
                        color: currentPosition === pos ? tokens.accentBlue : tokens.textMuted,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                    }}
                >
                    <Icon size={12} />
                </button>
            ) : (
                <div key={`empty-${idx}`} style={{ width: 28, height: 28 }} />
            )
        ))}
    </div>
));

// Smart Tooltip Component - Renders via portal for proper z-index
const SmartTooltip = memo(({ cell, position, visible }) => {
    if (!visible || !cell) return null;

    // Get color - handle various formats (number index, string color, or hex)
    let color = tokens.accentBlue; // default
    if (typeof cell.color === 'number') {
        color = INSTANCE_COLORS[cell.color % INSTANCE_COLORS.length];
    } else if (typeof cell.color === 'string') {
        if (cell.color.startsWith('#')) {
            color = cell.color;
        } else {
            const idx = INSTANCE_COLORS.indexOf(cell.color);
            color = idx >= 0 ? cell.color : tokens.accentBlue;
        }
    }

    return ReactDOM.createPortal(
        <div style={{
            position: 'fixed',
            left: position.x + 12,
            top: position.y - 8,
            background: '#141414',
            border: `2px solid ${color}`,
            borderRadius: 6,
            padding: '8px 12px',
            zIndex: 10000,
            boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
            minWidth: 140,
            maxWidth: 280,
            pointerEvents: 'none',
        }}>
            <div style={{
                fontSize: 12,
                fontWeight: 500,
                color: '#e0e0e5',
                marginBottom: 4,
            }}>
                {cell.name || `View ${cell.id || '?'}`}
            </div>
            {cell.datasetName && (
                <div style={{ fontSize: 11, color: '#808090', marginBottom: 2 }}>
                    Dataset: {cell.datasetName}
                </div>
            )}
            <div style={{ fontSize: 11, color: '#808090' }}>
                Position: <span style={{ color }}>
                    ({cell.col}, {cell.row})
                </span>
                {((cell.colSpan || 1) > 1 || (cell.rowSpan || 1) > 1) && (
                    <span style={{ marginLeft: 8 }}>
                        Size: <span style={{ color }}>
                            {cell.colSpan || 1}×{cell.rowSpan || 1}
                        </span>
                    </span>
                )}
            </div>
        </div>,
        document.body
    );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const CanvasNavigator = memo(function CanvasNavigator({
    isDockedInPanel = false,
    className = "",
}) {
    // Get everything from context
    const context = useLayoutPanelContext();
    const logic = context?.logic || {};

    // Extract data with safe defaults - ensure nested properties exist
    const canvasSize = {
        rows: logic.canvasSize?.rows ?? 4,
        cols: logic.canvasSize?.cols ?? 5,
    };
    const viewport = {
        row: logic.viewport?.row ?? 0,
        col: logic.viewport?.col ?? 0,
    };
    const viewportSize = {
        rows: logic.viewportSize?.rows ?? 2,
        cols: logic.viewportSize?.cols ?? 3,
    };
    const cells = logic.cells || [];
    const homepoint = logic.homepoint || null;
    const loading = logic.loading || false;
    const isConnected = logic.isConnected !== false;

    // Extract functions with no-op defaults
    const moveViewport = logic.moveViewport || (() => { });
    const navigateToCell = logic.navigateToCell || (() => { });
    const setViewportSizeRows = logic.setViewportSizeRows || (() => { });
    const setViewportSizeCols = logic.setViewportSizeCols || (() => { });
    const setCanvasRows = logic.setCanvasRows || (() => { });
    const setCanvasCols = logic.setCanvasCols || (() => { });
    const setHomepoint = logic.setHomepoint || (() => { });
    const clearHomepoint = logic.clearHomepoint || (() => { });

    // Edit mode functions (merge/unmerge/delete)
    const mergeCells = logic.mergeCells || logic.handleMerge || (() => { });
    const unmergeCells = logic.unmergeCells || logic.handleUnmerge || (() => { });
    const deleteCells = logic.deleteCells || logic.handleDelete || logic.removePlacement || (() => { });

    // Dock position
    const dockPosition = context?.dockPosition || logic.dockPosition || DOCK_POSITIONS.FLOAT;
    const setDockPosition = context?.setDockPosition || logic.setDockPosition || (() => { });

    // Local UI state
    const [mode, setMode] = useState(NAV_MODES.NAVIGATE);
    const [displayMode, setDisplayMode] = useState(DISPLAY_MODES.NAMES);
    const [minimapZoom, setMinimapZoom] = useState(1);
    const [settingHomepoint, setSettingHomepoint] = useState(false);
    const [showDockPicker, setShowDockPicker] = useState(false);
    const [hoveredCell, setHoveredCell] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [selectedCells, setSelectedCells] = useState([]);

    // Cell dimensions based on zoom
    const CELL_W = 28 * minimapZoom;
    const CELL_H = 22 * minimapZoom;
    const GAP = 2;

    // Helpers
    const getCellAt = useCallback((row, col) => {
        return cells.find(c =>
            row >= c.row && row < c.row + (c.rowSpan || 1) &&
            col >= c.col && col < c.col + (c.colSpan || 1)
        );
    }, [cells]);

    const isInViewport = useCallback((row, col) => {
        return row >= viewport.row &&
            row < viewport.row + viewportSize.rows &&
            col >= viewport.col &&
            col < viewport.col + viewportSize.cols;
    }, [viewport, viewportSize]);

    const isAtHome = homepoint &&
        viewport.row === homepoint.row &&
        viewport.col === homepoint.col;

    // Viewport movement
    const handleMoveViewport = useCallback((direction) => {
        const maxRow = Math.max(0, canvasSize.rows - viewportSize.rows);
        const maxCol = Math.max(0, canvasSize.cols - viewportSize.cols);

        switch (direction) {
            case 'up':
                if (viewport.row > 0) moveViewport(-1, 0);
                break;
            case 'down':
                if (viewport.row < maxRow) moveViewport(1, 0);
                break;
            case 'left':
                if (viewport.col > 0) moveViewport(0, -1);
                break;
            case 'right':
                if (viewport.col < maxCol) moveViewport(0, 1);
                break;
            case 'home':
                if (homepoint) navigateToCell(homepoint.row, homepoint.col);
                break;
        }
    }, [canvasSize, viewportSize, viewport, moveViewport, navigateToCell, homepoint]);

    // Cell click handler
    const handleCellClick = useCallback((row, col, cell, e) => {
        if (settingHomepoint) {
            setHomepoint(row, col);
            setSettingHomepoint(false);
            return;
        }

        if (mode === NAV_MODES.EDIT) {
            const key = `${row}-${col}`;
            if (e?.shiftKey || e?.ctrlKey || e?.metaKey) {
                // Multi-select
                setSelectedCells(prev =>
                    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                );
            } else {
                // Single select
                setSelectedCells(prev =>
                    prev.includes(key) && prev.length === 1 ? [] : [key]
                );
            }
            return;
        }

        // Navigate mode - pan viewport to position
        const maxRow = Math.max(0, canvasSize.rows - viewportSize.rows);
        const maxCol = Math.max(0, canvasSize.cols - viewportSize.cols);
        navigateToCell(Math.min(maxRow, row), Math.min(maxCol, col));
    }, [settingHomepoint, mode, canvasSize, viewportSize, navigateToCell, setHomepoint]);

    // Get cell display text
    const getCellDisplay = useCallback((cell, index) => {
        if (!cell) return null;

        const name = cell.name || `View ${index + 1}`;
        switch (displayMode) {
            case DISPLAY_MODES.NUMBERS:
                return index + 1;
            case DISPLAY_MODES.NAMES:
                const maxLen = Math.floor((CELL_W * (cell.colSpan || 1)) / 7);
                return name.length <= maxLen ? name : name.substring(0, Math.max(2, maxLen - 1)) + '…';
            case DISPLAY_MODES.COLORS:
                return null;
            default:
                return null;
        }
    }, [displayMode, CELL_W]);

    // Generate minimap cells
    const minimapCells = useMemo(() => {
        const result = [];
        let viewIndex = 0;

        for (let row = 0; row < canvasSize.rows; row++) {
            for (let col = 0; col < canvasSize.cols; col++) {
                const cell = getCellAt(row, col);
                const inVP = isInViewport(row, col);
                const isHome = homepoint && row === homepoint.row && col === homepoint.col;
                const isSelected = selectedCells.includes(`${row}-${col}`);

                // Skip non-origin cells of spanning placements
                if (cell && (cell.row !== row || cell.col !== col)) continue;

                const cellIndex = cell ? viewIndex++ : -1;

                result.push({
                    row,
                    col,
                    cell,
                    inVP,
                    isHome,
                    isSelected,
                    cellIndex,
                    key: `${row}-${col}`,
                });
            }
        }

        return result;
    }, [canvasSize, getCellAt, isInViewport, homepoint, selectedCells]);

    // Check if selected cell can be unmerged (has span > 1)
    const canUnmerge = useMemo(() => {
        if (selectedCells.length !== 1) return false;
        const [row, col] = selectedCells[0].split('-').map(Number);
        const cell = getCellAt(row, col);
        return cell && ((cell.rowSpan || 1) > 1 || (cell.colSpan || 1) > 1);
    }, [selectedCells, getCellAt]);

    // Check if selected cells can be merged (multiple cells selected)
    const canMerge = selectedCells.length >= 2;

    // Get color for a cell - handles number index, string, or hex
    const getCellColor = useCallback((cell) => {
        if (!cell) return null;

        // Handle various color formats
        if (typeof cell.color === 'number') {
            return INSTANCE_COLORS[cell.color % INSTANCE_COLORS.length];
        } else if (typeof cell.color === 'string') {
            if (cell.color.startsWith('#')) {
                return cell.color;
            }
            // Check if it's a named color
            const idx = INSTANCE_COLORS.indexOf(cell.color);
            return idx >= 0 ? cell.color : INSTANCE_COLORS[0];
        }

        // Default: use cell index for color variety
        const cellIdx = cells.indexOf(cell);
        return INSTANCE_COLORS[(cellIdx >= 0 ? cellIdx : 0) % INSTANCE_COLORS.length];
    }, [cells]);

    // ==========================================================================
    // RENDER
    // ==========================================================================

    return (
        <div
            className={`canvas-navigator ${className}`}
            style={{
                background: tokens.bgTertiary,
                overflow: 'hidden',
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Header */}
            <div
                className="canvas-navigator__header"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    background: 'rgba(0,0,0,0.3)',
                    borderBottom: `1px solid ${tokens.borderSubtle}`,
                    cursor: 'grab',
                }}
            >
                <Grid3X3 size={12} style={{ color: tokens.accentAmber }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: tokens.textSecondary, flex: 1 }}>
                    Canvas Navigator
                </span>

                {/* Mode Toggle */}
                <div style={{ display: 'flex', gap: 1, marginRight: 6 }}>
                    <NavBtn
                        size="xs"
                        active={mode === NAV_MODES.NAVIGATE}
                        color={tokens.accentBlue}
                        onClick={() => { setMode(NAV_MODES.NAVIGATE); setSelectedCells([]); }}
                        title="Navigate Mode"
                    >
                        <Navigation size={9} />
                    </NavBtn>
                    <NavBtn
                        size="xs"
                        active={mode === NAV_MODES.EDIT}
                        color={tokens.accentPurple}
                        onClick={() => setMode(NAV_MODES.EDIT)}
                        title="Edit Mode (select cells)"
                    >
                        <Edit3 size={9} />
                    </NavBtn>
                </div>

                {/* Display Mode */}
                <div style={{ display: 'flex', gap: 1, padding: 2, background: tokens.bgSecondary, borderRadius: 4 }}>
                    <NavBtn
                        size="xs"
                        active={displayMode === DISPLAY_MODES.NAMES}
                        onClick={() => setDisplayMode(DISPLAY_MODES.NAMES)}
                        title="Show Names"
                    >
                        <Type size={8} />
                    </NavBtn>
                    <NavBtn
                        size="xs"
                        active={displayMode === DISPLAY_MODES.NUMBERS}
                        onClick={() => setDisplayMode(DISPLAY_MODES.NUMBERS)}
                        title="Show Numbers"
                    >
                        <Hash size={8} />
                    </NavBtn>
                    <NavBtn
                        size="xs"
                        active={displayMode === DISPLAY_MODES.COLORS}
                        onClick={() => setDisplayMode(DISPLAY_MODES.COLORS)}
                        title="Colors Only"
                    >
                        <div style={{ width: 6, height: 6, borderRadius: 1, background: tokens.accentBlue }} />
                    </NavBtn>
                </div>

                {/* Dock Position */}
                <div style={{ position: 'relative' }}>
                    <NavBtn
                        size="xs"
                        onClick={() => setShowDockPicker(!showDockPicker)}
                        title="Dock Position"
                        active={showDockPicker}
                    >
                        <Icon name="pin" size={9} />
                    </NavBtn>
                    {showDockPicker && (
                        <DockPositionPicker
                            currentPosition={dockPosition}
                            onPositionChange={setDockPosition}
                            onClose={() => setShowDockPicker(false)}
                        />
                    )}
                </div>

                {/* Close */}
                {!isDockedInPanel && (
                    <NavBtn
                        size="xs"
                        onClick={() => setDockPosition(DOCK_POSITIONS.MINIMIZED)}
                        title="Minimize"
                    >
                        <Icon name="close" size={9} />
                    </NavBtn>
                )}
            </div>

            {/* Edit Mode Toolbar */}
            {mode === NAV_MODES.EDIT && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 12px',
                    background: `${tokens.accentPurple}10`,
                    borderBottom: `1px solid ${tokens.accentPurple}30`,
                }}>
                    <span style={{ fontSize: 8, color: tokens.accentPurple, fontWeight: 600 }}>
                        EDIT
                    </span>
                    <span style={{ fontSize: 8, color: tokens.textMuted }}>
                        {selectedCells.length} sel
                    </span>
                    <div style={{ flex: 1 }} />
                    <NavBtn
                        size="xs"
                        color={tokens.accentTeal}
                        disabled={!canMerge}
                        onClick={() => {
                            if (canMerge) {
                                // Get cell IDs from selected positions
                                const cellIds = selectedCells
                                    .map(key => {
                                        const [row, col] = key.split('-').map(Number);
                                        return getCellAt(row, col)?.id;
                                    })
                                    .filter(Boolean);
                                if (cellIds.length >= 2) {
                                    mergeCells(cellIds);
                                    setSelectedCells([]);
                                }
                            }
                        }}
                        title="Merge selected cells"
                    >
                        <Combine size={9} />
                    </NavBtn>
                    <NavBtn
                        size="xs"
                        color={tokens.accentAmber}
                        disabled={!canUnmerge}
                        onClick={() => {
                            if (canUnmerge) {
                                const [row, col] = selectedCells[0].split('-').map(Number);
                                const cell = getCellAt(row, col);
                                if (cell?.id) {
                                    unmergeCells(cell.id);
                                    setSelectedCells([]);
                                }
                            }
                        }}
                        title="Unmerge cell"
                    >
                        <Split size={9} />
                    </NavBtn>
                    <NavBtn
                        size="xs"
                        color={tokens.accentRed}
                        disabled={selectedCells.length === 0}
                        onClick={() => {
                            if (selectedCells.length > 0) {
                                // Get unique cell IDs
                                const cellIds = [...new Set(
                                    selectedCells
                                        .map(key => {
                                            const [row, col] = key.split('-').map(Number);
                                            return getCellAt(row, col)?.id;
                                        })
                                        .filter(Boolean)
                                )];
                                cellIds.forEach(id => deleteCells(id));
                                setSelectedCells([]);
                            }
                        }}
                        title="Delete selected"
                    >
                        <Icon name="delete" size={9} />
                    </NavBtn>
                </div>
            )}

            {/* Main Content */}
            <div style={{ display: 'flex', padding: '8px 10px', gap: 10, flex: 1, overflow: 'hidden' }}>
                {/* Minimap */}
                <div style={{
                    position: 'relative',
                    padding: 8,
                    background: tokens.bgPrimary,
                    borderRadius: 8,
                    border: `1px solid ${settingHomepoint ? tokens.accentPink : tokens.borderSubtle}`,
                    overflow: 'auto',
                    flex: 1,
                }}>
                    {settingHomepoint && (
                        <div style={{
                            position: 'absolute',
                            top: 4,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            fontSize: 8,
                            color: tokens.accentPink,
                            background: `${tokens.accentPink}20`,
                            padding: '2px 8px',
                            borderRadius: 3,
                            zIndex: 10,
                            fontWeight: 600,
                        }}>
                            Click to set home
                        </div>
                    )}

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${canvasSize.cols}, ${CELL_W}px)`,
                        gridTemplateRows: `repeat(${canvasSize.rows}, ${CELL_H}px)`,
                        gap: GAP,
                    }}>
                        {minimapCells.map(({ row, col, cell, inVP, isHome, isSelected, cellIndex, key }) => {
                            const color = getCellColor(cell);

                            return (
                                <div
                                    key={key}
                                    onClick={(e) => handleCellClick(row, col, cell, e)}
                                    onMouseEnter={(e) => {
                                        if (cell) {
                                            setHoveredCell(cell);
                                            setTooltipPos({ x: e.clientX, y: e.clientY });
                                        }
                                    }}
                                    onMouseMove={(e) => {
                                        if (hoveredCell) {
                                            setTooltipPos({ x: e.clientX, y: e.clientY });
                                        }
                                    }}
                                    onMouseLeave={() => setHoveredCell(null)}
                                    style={{
                                        gridColumn: cell ? `span ${cell.colSpan || 1}` : 'span 1',
                                        gridRow: cell ? `span ${cell.rowSpan || 1}` : 'span 1',
                                        background: cell
                                            ? `${color}${inVP ? '50' : '25'}`
                                            : isHome
                                                ? `${tokens.accentPink}25`
                                                : tokens.bgSecondary,
                                        border: `2px solid ${isSelected ? tokens.accentPurple :
                                                cell ? color :
                                                    isHome ? tokens.accentPink :
                                                        tokens.borderSubtle
                                            }`,
                                        borderRadius: 4,
                                        opacity: inVP || !cell ? 1 : 0.6,
                                        cursor: settingHomepoint ? 'crosshair' :
                                            mode === NAV_MODES.EDIT ? 'pointer' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: Math.max(8, 9 * minimapZoom),
                                        fontWeight: 600,
                                        color: cell ? color : 'transparent',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        padding: '0 3px',
                                        transition: 'all 0.15s ease',
                                        position: 'relative',
                                        boxShadow: cell && inVP ? `0 0 8px ${color}40` : 'none',
                                    }}
                                >
                                    {isHome && !cell && (
                                        <Home size={Math.max(10, 12 * minimapZoom)} style={{ color: tokens.accentPink }} />
                                    )}
                                    {cell && getCellDisplay(cell, cellIndex)}
                                    {isHome && cell && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 2,
                                            right: 2,
                                            width: 6,
                                            height: 6,
                                            background: tokens.accentPink,
                                            borderRadius: '50%',
                                            boxShadow: `0 0 4px ${tokens.accentPink}`,
                                        }} />
                                    )}
                                    {isSelected && (
                                        <div style={{
                                            position: 'absolute',
                                            inset: 0,
                                            background: `${tokens.accentPurple}20`,
                                            pointerEvents: 'none',
                                        }} />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Viewport Rectangle (Navigate mode only) */}
                    {mode === NAV_MODES.NAVIGATE && (
                        <div style={{
                            position: 'absolute',
                            top: 8 + viewport.row * (CELL_H + GAP),
                            left: 8 + viewport.col * (CELL_W + GAP),
                            width: viewportSize.cols * (CELL_W + GAP) - GAP,
                            height: viewportSize.rows * (CELL_H + GAP) - GAP,
                            border: `2px solid ${tokens.accentAmber}`,
                            borderRadius: 6,
                            pointerEvents: 'none',
                            boxShadow: `0 0 12px ${tokens.accentAmber}50, inset 0 0 30px ${tokens.accentAmber}10`,
                            transition: 'all 0.2s ease',
                        }} />
                    )}
                </div>

                {/* Controls Panel - Compact & Responsive */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    minWidth: 90,
                    maxWidth: 110,
                    overflow: 'auto',
                }}>
                    {/* D-Pad */}
                    <div>
                        <SectionLabel color={tokens.accentAmber}>Navigate</SectionLabel>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                            <NavBtn
                                size="sm"
                                onClick={() => handleMoveViewport('up')}
                                disabled={viewport.row <= 0}
                                title="Move Up"
                            >
                                <ChevronUp size={12} />
                            </NavBtn>
                            <div style={{ display: 'flex', gap: 0 }}>
                                <NavBtn
                                    size="sm"
                                    onClick={() => handleMoveViewport('left')}
                                    disabled={viewport.col <= 0}
                                    title="Move Left"
                                >
                                    <ChevronLeft size={12} />
                                </NavBtn>
                                <NavBtn
                                    size="sm"
                                    onClick={() => handleMoveViewport('home')}
                                    active={isAtHome}
                                    color={tokens.accentAmber}
                                    disabled={!homepoint}
                                    title="Go to Homepoint"
                                >
                                    <Home size={10} />
                                </NavBtn>
                                <NavBtn
                                    size="sm"
                                    onClick={() => handleMoveViewport('right')}
                                    disabled={viewport.col + viewportSize.cols >= canvasSize.cols}
                                    title="Move Right"
                                >
                                    <Icon name="chevronRight" size={12} />
                                </NavBtn>
                            </div>
                            <NavBtn
                                size="sm"
                                onClick={() => handleMoveViewport('down')}
                                disabled={viewport.row + viewportSize.rows >= canvasSize.rows}
                                title="Move Down"
                            >
                                <Icon name="chevronDown" size={12} />
                            </NavBtn>
                            <span style={{
                                fontSize: 9,
                                fontFamily: 'monospace',
                                color: tokens.accentAmber,
                                marginTop: 2,
                            }}>
                                {viewport.col},{viewport.row}
                            </span>
                        </div>
                    </div>

                    {/* Homepoint - Compact */}
                    <div>
                        <SectionLabel color={tokens.accentPink}>Home</SectionLabel>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <NavBtn
                                size="sm"
                                onClick={() => setSettingHomepoint(!settingHomepoint)}
                                active={settingHomepoint}
                                color={tokens.accentPink}
                                title="Set homepoint"
                            >
                                <Icon name="crosshair" size={10} />
                            </NavBtn>
                            {homepoint ? (
                                <>
                                    <span style={{
                                        fontSize: 9,
                                        fontFamily: 'monospace',
                                        color: tokens.accentPink,
                                    }}>
                                        {homepoint.col},{homepoint.row}
                                    </span>
                                    <NavBtn size="xs" onClick={clearHomepoint} title="Clear" color={tokens.accentRed}>
                                        <Icon name="close" size={7} />
                                    </NavBtn>
                                </>
                            ) : (
                                <span style={{ fontSize: 8, color: tokens.textTertiary }}>—</span>
                            )}
                        </div>
                    </div>

                    {/* Zoom - Compact */}
                    <div>
                        <SectionLabel color={tokens.accentBlue}>Zoom</SectionLabel>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                            <NavBtn
                                size="sm"
                                onClick={() => setMinimapZoom(Math.max(0.5, minimapZoom - 0.25))}
                                disabled={minimapZoom <= 0.5}
                            >
                                <ZoomOut size={10} />
                            </NavBtn>
                            <span style={{
                                fontSize: 9,
                                fontFamily: 'monospace',
                                color: tokens.accentBlue,
                                minWidth: 28,
                                textAlign: 'center',
                            }}>
                                {Math.round(minimapZoom * 100)}%
                            </span>
                            <NavBtn
                                size="sm"
                                onClick={() => setMinimapZoom(Math.min(2, minimapZoom + 0.25))}
                                disabled={minimapZoom >= 2}
                            >
                                <ZoomIn size={10} />
                            </NavBtn>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer - Size Controls */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 10px',
                borderTop: `1px solid ${tokens.borderSubtle}`,
                background: 'rgba(0,0,0,0.2)',
                flexWrap: 'wrap',
            }}>
                <div>
                    <SectionLabel color={tokens.accentGreen}>Viewport</SectionLabel>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <NumberSpinner
                            label="C"
                            value={viewportSize.cols}
                            onChange={setViewportSizeCols}
                            min={1}
                            max={canvasSize.cols}
                            color={tokens.accentGreen}
                            compact
                        />
                        <NumberSpinner
                            label="R"
                            value={viewportSize.rows}
                            onChange={setViewportSizeRows}
                            min={1}
                            max={canvasSize.rows}
                            color={tokens.accentGreen}
                            compact
                        />
                    </div>
                </div>

                <div style={{ height: 28, width: 1, background: tokens.borderSubtle }} />

                <div>
                    <SectionLabel color={tokens.accentPurple}>Canvas</SectionLabel>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <NumberSpinner
                            label="C"
                            value={canvasSize.cols}
                            onChange={setCanvasCols}
                            min={1}
                            max={50}
                            color={tokens.accentPurple}
                            compact
                        />
                        <NumberSpinner
                            label="R"
                            value={canvasSize.rows}
                            onChange={setCanvasRows}
                            min={1}
                            max={50}
                            color={tokens.accentPurple}
                            compact
                        />
                    </div>
                </div>

                <div style={{ flex: 1 }} />

                <span style={{
                    fontSize: 9,
                    color: tokens.textMuted,
                    padding: '3px 8px',
                    background: tokens.glassLight,
                    borderRadius: 4,
                    fontWeight: 500,
                }}>
                    {cells.length} views
                </span>
            </div>

            {/* Tooltip */}
            <SmartTooltip cell={hoveredCell} position={tooltipPos} visible={!!hoveredCell} />
        </div>
    );
});

export default CanvasNavigator;