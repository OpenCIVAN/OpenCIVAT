// src/ui/react/components/panels/LayoutPanel/components/CanvasNavigator/CanvasNavigator.jsx
// Complete Canvas Navigator Component
//
// FEATURES:
// - Two Context Modes: EDIT (layout) and VIEWS (navigation)
// - Edit Mode: Cell selection, merge, unmerge, delete, resize canvas
// - Views Mode: Navigate viewport, view info, click to jump
// - Collaborator Avatars: Show who's viewing each cell
// - External Drop: Accept ViewItem drops from left panel
// - Undo/Redo: Full history with apply/cancel
// - Responsive: Adapts to docked vs floating modes
//
// ARCHITECTURE:
// - Uses useCanvasNavigator hook for all logic
// - SCSS for styling with design tokens
// - Imports DOCK_POSITIONS from LayoutPanelContext

import React, { memo, useMemo, useCallback, useState, useRef } from "react";
import ReactDOM from "react-dom";
import {
    Grid3X3,
    Move,
    GripVertical,
    Pin,
    PinOff,
    X,
    Maximize2,
    Minimize2,
    ChevronUp,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Home,
    Crosshair,
    ZoomIn,
    ZoomOut,
    Pencil,
    Eye,
    Navigation,
    Type,
    Hash,
    Palette,
    Combine,
    Split,
    Trash2,
    Plus,
    Minus,
    Undo2,
    Redo2,
    Check,
    RotateCcw,
    Users,
    MousePointer2,
    Settings2,
    CornerUpLeft,
    CornerUpRight,
    CornerDownLeft,
    CornerDownRight,
    PanelLeft,
} from "lucide-react";
import {
    useCanvasNavigator,
    CONTEXT_MODES,
    DISPLAY_MODES,
    NAV_MODES,
    INSTANCE_COLORS,
} from "./CanvasNavigator.logic";
import { DOCK_POSITIONS } from "../../LayoutPanelContext";
import "./CanvasNavigator.scss";

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * NavBtn - Compact navigation button
 */
const NavBtn = memo(function NavBtn({
    children,
    onClick,
    active,
    disabled,
    title,
    size = "md",
    color,
    className = "",
    ...props
}) {
    return (
        <button
            className={`canvas-navigator__btn canvas-navigator__btn--${size} ${active ? "canvas-navigator__btn--active" : ""
                } ${className}`}
            onClick={onClick}
            disabled={disabled}
            title={title}
            data-color={color}
            {...props}
        >
            {children}
        </button>
    );
});

/**
 * NumberSpinner - Compact number input with +/- buttons
 */
const NumberSpinner = memo(function NumberSpinner({
    label,
    value,
    onChange,
    min = 1,
    max = 50,
    color,
    compact = false,
}) {
    const handleIncrement = useCallback(() => {
        if (value < max) onChange(value + 1);
    }, [value, max, onChange]);

    const handleDecrement = useCallback(() => {
        if (value > min) onChange(value - 1);
    }, [value, min, onChange]);

    return (
        <div
            className={`canvas-navigator__spinner ${compact ? "canvas-navigator__spinner--compact" : ""
                }`}
            data-color={color}
        >
            {label && <span className="canvas-navigator__spinner-label">{label}</span>}
            <NavBtn size="xs" onClick={handleDecrement} disabled={value <= min}>
                <Minus size={8} />
            </NavBtn>
            <input
                type="number"
                className="canvas-navigator__spinner-input"
                value={value}
                onChange={(e) =>
                    onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))
                }
            />
            <NavBtn size="xs" onClick={handleIncrement} disabled={value >= max}>
                <Plus size={8} />
            </NavBtn>
        </div>
    );
});

/**
 * SectionLabel - Section header
 */
const SectionLabel = memo(function SectionLabel({ children, color }) {
    return (
        <div className="canvas-navigator__section-label" data-color={color}>
            {children}
        </div>
    );
});

/**
 * CollaboratorAvatar - Small avatar for collaborator presence
 */
const CollaboratorAvatar = memo(function CollaboratorAvatar({
    collaborator,
    size = "sm",
    onFollow,
    style = {},
}) {
    const initials = collaborator.name
        ? collaborator.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .substring(0, 2)
        : "?";

    return (
        <button
            className={`canvas-navigator__avatar canvas-navigator__avatar--${size}`}
            onClick={() => onFollow?.(collaborator)}
            title={`Follow ${collaborator.name || "Unknown"}`}
            style={{
                "--avatar-color": collaborator.color || "#60a5fa",
                ...style,
            }}
        >
            {initials}
        </button>
    );
});

/**
 * DockPositionPicker - Picker for dock position
 */
const DockPositionPicker = memo(function DockPositionPicker({
    currentPosition,
    onPositionChange,
    onClose,
}) {
    const positions = [
        { id: DOCK_POSITIONS.LEFT_PANEL, icon: PanelLeft, label: "Left Panel" },
        { id: DOCK_POSITIONS.TOP_LEFT, icon: CornerUpLeft, label: "Top Left" },
        { id: DOCK_POSITIONS.TOP_RIGHT, icon: CornerUpRight, label: "Top Right" },
        { id: DOCK_POSITIONS.BOTTOM_LEFT, icon: CornerDownLeft, label: "Bottom Left" },
        { id: DOCK_POSITIONS.BOTTOM_RIGHT, icon: CornerDownRight, label: "Bottom Right" },
        { id: DOCK_POSITIONS.FLOAT, icon: Move, label: "Float" },
        { id: DOCK_POSITIONS.MINIMIZED, icon: Minimize2, label: "Minimize" },
    ];

    return (
        <div className="canvas-navigator__dock-picker">
            {positions.map((pos) => (
                <button
                    key={pos.id}
                    className={`canvas-navigator__dock-option ${currentPosition === pos.id ? "canvas-navigator__dock-option--active" : ""
                        }`}
                    onClick={() => {
                        onPositionChange(pos.id);
                        onClose();
                    }}
                    title={pos.label}
                >
                    <pos.icon size={12} />
                </button>
            ))}
        </div>
    );
});

/**
 * Tooltip - Hovering tooltip for cell info
 */
const Tooltip = memo(function Tooltip({ cell, position }) {
    if (!cell) return null;

    return ReactDOM.createPortal(
        <div
            className="canvas-navigator__tooltip"
            style={{
                left: position.x + 10,
                top: position.y - 30,
            }}
        >
            <div className="canvas-navigator__tooltip-name">{cell.name || "Unnamed"}</div>
            {cell.datasetName && (
                <div className="canvas-navigator__tooltip-dataset">{cell.datasetName}</div>
            )}
            <div className="canvas-navigator__tooltip-position">
                {cell.row + 1},{cell.col + 1}
                {((cell.rowSpan || 1) > 1 || (cell.colSpan || 1) > 1) && (
                    <span className="canvas-navigator__tooltip-span">
                        {" "}
                        ({cell.rowSpan || 1}×{cell.colSpan || 1})
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

/**
 * CanvasNavigator - Complete canvas navigation and editing component
 */
export const CanvasNavigator = memo(function CanvasNavigator({
    // Data props - with defaults to prevent crashes
    canvasSize = { rows: 3, cols: 3 },
    viewport = { row: 0, col: 0 },
    viewportSize = { rows: 2, cols: 2 },
    cells = [],
    homepoint = null,
    collaborators = [],
    dockPosition = DOCK_POSITIONS.LEFT_PANEL,
    loading = false,
    isConnected = true,

    // Navigation callbacks
    moveViewport,
    navigateToCell,
    setViewportSizeRows,
    setViewportSizeCols,
    setCanvasRows,
    setCanvasCols,
    setHomepoint,
    clearHomepoint,

    // Placement callbacks
    movePlacement,
    swapPlacements,
    resizePlacement,
    removePlacement,
    mergeCells,
    unmergeCells,

    // External callbacks
    onExternalDrop,
    onDockPositionChange,
    onFollow,
    onClose,

    // Layout
    isDockedInPanel = false,
    className = "",
}) {
    // ===========================================================================
    // REFS
    // ===========================================================================

    const containerRef = useRef(null);
    const minimapRef = useRef(null);

    // ===========================================================================
    // LOCAL STATE
    // ===========================================================================

    const [showDockPicker, setShowDockPicker] = useState(false);

    // ===========================================================================
    // HOOK
    // ===========================================================================

    const nav = useCanvasNavigator({
        canvasSize,
        viewport,
        viewportSize,
        cells,
        homepoint,
        collaborators,
        dockPosition,
        loading,
        isConnected,
        moveViewport,
        navigateToCell,
        setViewportSizeRows,
        setViewportSizeCols,
        setCanvasRows,
        setCanvasCols,
        setHomepoint,
        clearHomepoint,
        movePlacement,
        swapPlacements,
        resizePlacement,
        removePlacement,
        mergeCells,
        unmergeCells,
        onExternalDrop,
    });

    // ===========================================================================
    // CELL DIMENSIONS
    // ===========================================================================

    const cellDimensions = useMemo(() => {
        const baseWidth = 26;
        const baseHeight = 20;
        return {
            width: baseWidth * nav.minimapZoom,
            height: baseHeight * nav.minimapZoom,
            gap: 2,
        };
    }, [nav.minimapZoom]);

    // ===========================================================================
    // RENDER MODE
    // ===========================================================================

    const isCompact = isDockedInPanel || dockPosition === DOCK_POSITIONS.LEFT_PANEL;
    const isFloating = dockPosition === DOCK_POSITIONS.FLOAT;
    const isMinimized = dockPosition === DOCK_POSITIONS.MINIMIZED;

    // Don't render if minimized
    if (isMinimized) return null;

    // ===========================================================================
    // RENDER - HEADER
    // ===========================================================================

    const renderHeader = () => (
        <div className="canvas-navigator__header">
            <div className="canvas-navigator__header-left">
                <Grid3X3 size={12} className="canvas-navigator__header-icon" />
                <span className="canvas-navigator__header-title">Canvas Navigator</span>
            </div>

            <div className="canvas-navigator__header-right">
                {/* Context Mode Toggle */}
                <div className="canvas-navigator__mode-toggle">
                    <NavBtn
                        size="xs"
                        active={nav.contextMode === CONTEXT_MODES.VIEWS}
                        onClick={() => nav.setContextMode(CONTEXT_MODES.VIEWS)}
                        title="Views Mode"
                        color="blue"
                    >
                        <Eye size={10} />
                    </NavBtn>
                    <NavBtn
                        size="xs"
                        active={nav.contextMode === CONTEXT_MODES.EDIT}
                        onClick={() => nav.setContextMode(CONTEXT_MODES.EDIT)}
                        title="Edit Mode"
                        color="purple"
                    >
                        <Pencil size={10} />
                    </NavBtn>
                </div>

                {/* Dock position picker */}
                <div className="canvas-navigator__dock-wrapper">
                    <NavBtn
                        size="xs"
                        onClick={() => setShowDockPicker(!showDockPicker)}
                        title="Dock Position"
                        active={showDockPicker}
                    >
                        <Pin size={10} />
                    </NavBtn>
                    {showDockPicker && (
                        <DockPositionPicker
                            currentPosition={dockPosition}
                            onPositionChange={onDockPositionChange}
                            onClose={() => setShowDockPicker(false)}
                        />
                    )}
                </div>

                {/* Close button (floating only) */}
                {!isDockedInPanel && (
                    <NavBtn size="xs" onClick={onClose} title="Close">
                        <X size={12} />
                    </NavBtn>
                )}
            </div>
        </div>
    );

    // ===========================================================================
    // RENDER - EDIT MODE TOOLBAR
    // ===========================================================================

    const renderEditToolbar = () => {
        if (nav.contextMode !== CONTEXT_MODES.EDIT) return null;

        return (
            <div className="canvas-navigator__edit-toolbar">
                <MousePointer2 size={12} className="canvas-navigator__edit-icon" />
                <span className="canvas-navigator__edit-hint">
                    {nav.selectedCells.length === 0
                        ? "Click to select, Shift+click for multi"
                        : `${nav.selectedCells.length} cell${nav.selectedCells.length > 1 ? "s" : ""} selected`}
                </span>

                <div className="canvas-navigator__edit-actions">
                    <NavBtn
                        size="sm"
                        onClick={nav.handleMerge}
                        disabled={!nav.canMerge}
                        color="teal"
                        title="Merge Selected"
                    >
                        <Combine size={10} />
                    </NavBtn>
                    <NavBtn
                        size="sm"
                        onClick={nav.handleUnmerge}
                        disabled={!nav.canUnmerge}
                        color="amber"
                        title="Unmerge"
                    >
                        <Split size={10} />
                    </NavBtn>
                    <NavBtn
                        size="sm"
                        onClick={nav.handleDelete}
                        disabled={nav.selectedCells.length === 0}
                        color="red"
                        title="Delete Selected"
                    >
                        <Trash2 size={10} />
                    </NavBtn>
                </div>

                {/* Undo/Redo */}
                <div className="canvas-navigator__history-actions">
                    <NavBtn
                        size="sm"
                        onClick={nav.undo}
                        disabled={!nav.canUndo}
                        title="Undo"
                    >
                        <Undo2 size={10} />
                    </NavBtn>
                    <NavBtn
                        size="sm"
                        onClick={nav.redo}
                        disabled={!nav.canRedo}
                        title="Redo"
                    >
                        <Redo2 size={10} />
                    </NavBtn>
                </div>

                {/* Apply/Cancel */}
                {nav.isDirty && (
                    <div className="canvas-navigator__apply-actions">
                        <NavBtn size="sm" onClick={nav.cancel} color="red" title="Cancel">
                            <RotateCcw size={10} />
                        </NavBtn>
                        <NavBtn size="sm" onClick={nav.apply} color="green" title="Apply">
                            <Check size={10} />
                        </NavBtn>
                    </div>
                )}
            </div>
        );
    };

    // ===========================================================================
    // RENDER - DISPLAY CONTROLS
    // ===========================================================================

    const renderDisplayControls = () => (
        <div className="canvas-navigator__display-controls">
            {/* Display mode */}
            <div className="canvas-navigator__display-toggle">
                <NavBtn
                    size="xs"
                    active={nav.displayMode === DISPLAY_MODES.NAMES}
                    onClick={() => nav.setDisplayMode(DISPLAY_MODES.NAMES)}
                    title="Names"
                >
                    <Type size={9} />
                </NavBtn>
                <NavBtn
                    size="xs"
                    active={nav.displayMode === DISPLAY_MODES.NUMBERS}
                    onClick={() => nav.setDisplayMode(DISPLAY_MODES.NUMBERS)}
                    title="Numbers"
                >
                    <Hash size={9} />
                </NavBtn>
                <NavBtn
                    size="xs"
                    active={nav.displayMode === DISPLAY_MODES.COLORS}
                    onClick={() => nav.setDisplayMode(DISPLAY_MODES.COLORS)}
                    title="Colors Only"
                >
                    <Palette size={9} />
                </NavBtn>
            </div>

            {/* Zoom */}
            <div className="canvas-navigator__zoom-controls">
                <NavBtn
                    size="xs"
                    onClick={() => nav.setMinimapZoom(Math.max(0.5, nav.minimapZoom - 0.25))}
                    disabled={nav.minimapZoom <= 0.5}
                    title="Zoom Out"
                >
                    <ZoomOut size={9} />
                </NavBtn>
                <span className="canvas-navigator__zoom-label">
                    {Math.round(nav.minimapZoom * 100)}%
                </span>
                <NavBtn
                    size="xs"
                    onClick={() => nav.setMinimapZoom(Math.min(2, nav.minimapZoom + 0.25))}
                    disabled={nav.minimapZoom >= 2}
                    title="Zoom In"
                >
                    <ZoomIn size={9} />
                </NavBtn>
            </div>
        </div>
    );

    // ===========================================================================
    // RENDER - MINIMAP
    // ===========================================================================

    const renderMinimap = () => (
        <div
            ref={minimapRef}
            className={`canvas-navigator__minimap ${nav.settingHomepoint ? "canvas-navigator__minimap--setting-home" : ""
                } ${nav.contextMode === CONTEXT_MODES.EDIT ? "canvas-navigator__minimap--edit-mode" : ""}`}
            onDragEnter={nav.handleExternalDragEnter}
            onDragOver={(e) => {
                // Find cell from target
                const cellEl = e.target.closest("[data-row][data-col]");
                if (cellEl) {
                    const row = parseInt(cellEl.dataset.row, 10);
                    const col = parseInt(cellEl.dataset.col, 10);
                    nav.handleExternalDragOver(e, row, col);
                }
            }}
            onDragLeave={(e) => nav.handleExternalDragLeave(e, minimapRef)}
            onDrop={(e) => {
                const cellEl = e.target.closest("[data-row][data-col]");
                if (cellEl) {
                    const row = parseInt(cellEl.dataset.row, 10);
                    const col = parseInt(cellEl.dataset.col, 10);
                    nav.handleExternalDrop(e, row, col);
                }
            }}
        >
            {/* Setting homepoint indicator */}
            {nav.settingHomepoint && (
                <div className="canvas-navigator__homepoint-indicator">
                    Click a cell to set homepoint
                </div>
            )}

            {/* Grid */}
            <div
                className="canvas-navigator__grid"
                style={{
                    gridTemplateColumns: `repeat(${nav.canvasSize.cols}, ${cellDimensions.width}px)`,
                    gridTemplateRows: `repeat(${nav.canvasSize.rows}, ${cellDimensions.height}px)`,
                    gap: cellDimensions.gap,
                }}
            >
                {nav.minimapCells.map(
                    ({
                        row,
                        col,
                        cell,
                        inVP,
                        isHome,
                        isSelected,
                        isDragOver,
                        isExtDragOver,
                        cellIndex,
                        key,
                        collaborators: cellCollabs,
                    }) => {
                        const cellColor = cell ? nav.getCellColor(cell) : null;
                        const displayText = cell ? nav.getCellDisplay(cell, cellIndex, cellDimensions.width) : null;

                        return (
                            <div
                                key={key}
                                data-row={row}
                                data-col={col}
                                className={`canvas-navigator__cell ${cell ? "canvas-navigator__cell--filled" : "canvas-navigator__cell--empty"
                                    } ${inVP ? "canvas-navigator__cell--in-viewport" : ""} ${isHome ? "canvas-navigator__cell--home" : ""
                                    } ${isSelected ? "canvas-navigator__cell--selected" : ""} ${isDragOver ? "canvas-navigator__cell--drag-over" : ""
                                    } ${isExtDragOver ? "canvas-navigator__cell--ext-drag-over" : ""}`}
                                style={{
                                    gridRow: cell ? `${cell.row + 1} / span ${cell.rowSpan || 1}` : "auto",
                                    gridColumn: cell ? `${cell.col + 1} / span ${cell.colSpan || 1}` : "auto",
                                    "--cell-color": cellColor,
                                }}
                                onClick={(e) => nav.handleCellClick(row, col, cell, e)}
                                onMouseEnter={(e) => {
                                    if (cell) {
                                        nav.setHoveredCell(cell);
                                        nav.setTooltipPos({ x: e.clientX, y: e.clientY });
                                    }
                                }}
                                onMouseLeave={() => nav.setHoveredCell(null)}
                                onMouseMove={(e) => {
                                    if (nav.hoveredCell) {
                                        nav.setTooltipPos({ x: e.clientX, y: e.clientY });
                                    }
                                }}
                                draggable={nav.contextMode === CONTEXT_MODES.EDIT && !!cell}
                                onDragStart={(e) => nav.handleDragStart(cell, e)}
                                onDragEnd={nav.handleDragEnd}
                                onDragOver={(e) => nav.handleDragOver(row, col, e)}
                                onDrop={(e) => nav.handleDrop(row, col, e)}
                            >
                                {/* Display text */}
                                {displayText && (
                                    <span className="canvas-navigator__cell-text">{displayText}</span>
                                )}

                                {/* Homepoint marker */}
                                {isHome && (
                                    <div className="canvas-navigator__cell-home">
                                        <Home size={8} />
                                    </div>
                                )}

                                {/* Collaborator avatars */}
                                {cellCollabs.length > 0 && (
                                    <div className="canvas-navigator__cell-collabs">
                                        {cellCollabs.slice(0, 3).map((collab, idx) => (
                                            <CollaboratorAvatar
                                                key={collab.id}
                                                collaborator={collab}
                                                size="xs"
                                                onFollow={onFollow}
                                                style={{ zIndex: 3 - idx }}
                                            />
                                        ))}
                                        {cellCollabs.length > 3 && (
                                            <span className="canvas-navigator__cell-collabs-more">
                                                +{cellCollabs.length - 3}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    }
                )}
            </div>

            {/* Viewport indicator overlay */}
            <div
                className="canvas-navigator__viewport-indicator"
                style={{
                    left: nav.viewport.col * (cellDimensions.width + cellDimensions.gap),
                    top: nav.viewport.row * (cellDimensions.height + cellDimensions.gap),
                    width:
                        nav.viewportSize.cols * cellDimensions.width +
                        (nav.viewportSize.cols - 1) * cellDimensions.gap,
                    height:
                        nav.viewportSize.rows * cellDimensions.height +
                        (nav.viewportSize.rows - 1) * cellDimensions.gap,
                }}
            />
        </div>
    );

    // ===========================================================================
    // RENDER - NAVIGATION CONTROLS
    // ===========================================================================

    const renderNavControls = () => (
        <div className="canvas-navigator__nav-controls">
            {/* D-Pad */}
            <div className="canvas-navigator__dpad">
                <div className="canvas-navigator__dpad-row">
                    <NavBtn
                        size="sm"
                        onClick={() => nav.moveViewport("up")}
                        disabled={nav.viewport.row <= 0}
                        title="Move Up"
                    >
                        <ChevronUp size={12} />
                    </NavBtn>
                </div>
                <div className="canvas-navigator__dpad-row">
                    <NavBtn
                        size="sm"
                        onClick={() => nav.moveViewport("left")}
                        disabled={nav.viewport.col <= 0}
                        title="Move Left"
                    >
                        <ChevronLeft size={12} />
                    </NavBtn>
                    <NavBtn
                        size="sm"
                        onClick={nav.navigateHome}
                        active={nav.isAtHome}
                        disabled={!nav.homepoint}
                        title="Go Home"
                        color="pink"
                    >
                        <Home size={12} />
                    </NavBtn>
                    <NavBtn
                        size="sm"
                        onClick={() => nav.moveViewport("right")}
                        disabled={nav.viewport.col + nav.viewportSize.cols >= nav.canvasSize.cols}
                        title="Move Right"
                    >
                        <ChevronRight size={12} />
                    </NavBtn>
                </div>
                <div className="canvas-navigator__dpad-row">
                    <NavBtn
                        size="sm"
                        onClick={() => nav.moveViewport("down")}
                        disabled={nav.viewport.row + nav.viewportSize.rows >= nav.canvasSize.rows}
                        title="Move Down"
                    >
                        <ChevronDown size={12} />
                    </NavBtn>
                </div>
            </div>

            {/* Position display */}
            <div className="canvas-navigator__position">
                <span className="canvas-navigator__position-label">Position</span>
                <span className="canvas-navigator__position-value">
                    {nav.viewport.row + 1},{nav.viewport.col + 1}
                </span>
            </div>

            {/* Homepoint controls */}
            <div className="canvas-navigator__homepoint-controls">
                <NavBtn
                    size="sm"
                    onClick={() => nav.setSettingHomepoint(!nav.settingHomepoint)}
                    active={nav.settingHomepoint}
                    title="Set Homepoint"
                    color="pink"
                >
                    <Crosshair size={12} />
                </NavBtn>
                {nav.homepoint && (
                    <NavBtn
                        size="sm"
                        onClick={nav.clearHomepoint}
                        title="Clear Homepoint"
                        color="red"
                    >
                        <X size={10} />
                    </NavBtn>
                )}
            </div>
        </div>
    );

    // ===========================================================================
    // RENDER - SIZE CONTROLS
    // ===========================================================================

    const renderSizeControls = () => (
        <div className="canvas-navigator__size-controls">
            {/* Viewport size */}
            <div className="canvas-navigator__size-section">
                <SectionLabel color="blue">Viewport</SectionLabel>
                <div className="canvas-navigator__size-row">
                    <NumberSpinner
                        label="R"
                        value={nav.viewportSize.rows}
                        onChange={nav.setViewportSizeRows}
                        min={1}
                        max={nav.canvasSize.rows}
                        color="blue"
                        compact
                    />
                    <NumberSpinner
                        label="C"
                        value={nav.viewportSize.cols}
                        onChange={nav.setViewportSizeCols}
                        min={1}
                        max={nav.canvasSize.cols}
                        color="blue"
                        compact
                    />
                </div>
            </div>

            {/* Canvas size (edit mode only) */}
            {nav.contextMode === CONTEXT_MODES.EDIT && (
                <div className="canvas-navigator__size-section">
                    <SectionLabel color="purple">Canvas</SectionLabel>
                    <div className="canvas-navigator__size-row">
                        <NumberSpinner
                            label="R"
                            value={nav.canvasSize.rows}
                            onChange={nav.setCanvasRows}
                            min={1}
                            max={50}
                            color="purple"
                            compact
                        />
                        <NumberSpinner
                            label="C"
                            value={nav.canvasSize.cols}
                            onChange={nav.setCanvasCols}
                            min={1}
                            max={50}
                            color="purple"
                            compact
                        />
                    </div>
                    <div className="canvas-navigator__size-row">
                        <NavBtn size="sm" onClick={nav.addRow} title="Add Row">
                            <Plus size={10} /> Row
                        </NavBtn>
                        <NavBtn size="sm" onClick={nav.addColumn} title="Add Column">
                            <Plus size={10} /> Col
                        </NavBtn>
                    </div>
                </div>
            )}
        </div>
    );

    // ===========================================================================
    // RENDER - MAIN
    // ===========================================================================

    return (
        <div
            ref={containerRef}
            className={`canvas-navigator ${isCompact ? "canvas-navigator--compact" : "canvas-navigator--full"
                } ${isFloating ? "canvas-navigator--floating" : ""} ${className}`}
            data-context={nav.contextMode}
        >
            {renderHeader()}
            {renderEditToolbar()}
            {renderDisplayControls()}
            {renderMinimap()}
            {renderNavControls()}
            {renderSizeControls()}

            {/* Tooltip */}
            <Tooltip cell={nav.hoveredCell} position={nav.tooltipPos} />
        </div>
    );
});

export default CanvasNavigator;