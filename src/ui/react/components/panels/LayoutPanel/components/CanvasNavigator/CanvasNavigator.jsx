// src/ui/react/components/panels/LayoutPanel/components/CanvasNavigator/CanvasNavigator.jsx
// Redesigned Canvas Navigator - Presentation Component
//
// Features:
// - D-pad with home center button
// - Two-column navigation layout (swappable via dpadPosition prop)
// - Collapsible size controls footer
// - Set Home mode with explicit button (no long-press)
// - Mode-aware sizing (desktop/VR via ModeContext)
//
// Architecture:
// - All logic comes from useCanvasNavigator hook
// - This file is pure presentation

import React, { memo, useState } from "react";
import ReactDOM from "react-dom";
import { Icon } from '@UI/react/components/common/Icon';
import { useAdaptive } from '@UI/react/context';
import { useLayoutPanelContext, DOCK_POSITIONS } from "../../LayoutPanelContext";
import {
    useCanvasNavigator,
    DISPLAY_MODES,
    CONTEXT_MODES,
    INSTANCE_COLORS,
} from "./CanvasNavigator.logic";
import "./CanvasNavigator.scss";

// =============================================================================
// HELPER COMPONENTS (Presentation Only)
// =============================================================================

const NavBtn = memo(({
    children,
    onClick,
    active,
    color,
    disabled,
    title,
    className = '',
    size = 'md',
}) => {
    const { isVR } = useAdaptive();

    return (
        <button
            className={`canvas-navigator__btn canvas-navigator__btn--${size} ${active ? 'canvas-navigator__btn--active' : ''} ${className}`}
            onClick={onClick}
            disabled={disabled}
            title={title}
            data-color={color}
            data-vr={isVR}
        >
            {children}
        </button>
    );
});

// Number spinner with increment/decrement buttons
const NumberSpinner = memo(({
    value,
    onChange,
    min = 1,
    max = 10,
    label,
    color,
    vertical = false,
}) => {
    const { isVR } = useAdaptive();
    const safeValue = typeof value === 'number' && !isNaN(value) ? value : min;

    const handleDecrement = () => {
        const newVal = Math.max(min, safeValue - 1);
        console.log(`[NumberSpinner] ${label} decrement: ${safeValue} → ${newVal}, onChange=${!!onChange}`);
        if (onChange) {
            onChange(newVal);
        } else {
            console.warn(`[NumberSpinner] ${label} onChange is undefined!`);
        }
    };

    const handleIncrement = () => {
        const newVal = Math.min(max, safeValue + 1);
        console.log(`[NumberSpinner] ${label} increment: ${safeValue} → ${newVal}, onChange=${!!onChange}`);
        if (onChange) {
            onChange(newVal);
        } else {
            console.warn(`[NumberSpinner] ${label} onChange is undefined!`);
        }
    };

    if (vertical) {
        return (
            <div className="canvas-navigator__spinner canvas-navigator__spinner--vertical" data-color={color}>
                {label && <span className="canvas-navigator__spinner-label">{label}</span>}
                <div className="canvas-navigator__spinner-controls">
                    <NavBtn size="xs" onClick={handleDecrement} disabled={safeValue <= min} color={color}>
                        <Icon name="chevronLeft" size={isVR ? 12 : 8} />
                    </NavBtn>
                    <span className="canvas-navigator__spinner-value" data-color={color}>
                        {safeValue}
                    </span>
                    <NavBtn size="xs" onClick={handleIncrement} disabled={safeValue >= max} color={color}>
                        <Icon name="chevronRight" size={isVR ? 12 : 8} />
                    </NavBtn>
                </div>
            </div>
        );
    }

    return (
        <div className="canvas-navigator__spinner" data-color={color}>
            {label && <span className="canvas-navigator__spinner-label">{label}</span>}
            <NavBtn size="xs" onClick={handleDecrement} disabled={safeValue <= min} color={color}>
                <Icon name="minus" size={isVR ? 12 : 8} />
            </NavBtn>
            <span className="canvas-navigator__spinner-value" data-color={color}>
                {safeValue}
            </span>
            <NavBtn size="xs" onClick={handleIncrement} disabled={safeValue >= max} color={color}>
                <Icon name="plus" size={isVR ? 12 : 8} />
            </NavBtn>
        </div>
    );
});

// D-Pad component with home center
const DPad = memo(({ onMove, onHome, disabled, isAtHome }) => {
    const { isVR } = useAdaptive();
    const iconSize = isVR ? 14 : 10;

    return (
        <div className="canvas-navigator__dpad">
            <NavBtn
                size="sm"
                onClick={() => onMove('up')}
                disabled={disabled?.up}
                title="Move Up"
            >
                <Icon name="chevronUp" size={iconSize} />
            </NavBtn>
            <div className="canvas-navigator__dpad-row">
                <NavBtn
                    size="sm"
                    onClick={() => onMove('left')}
                    disabled={disabled?.left}
                    title="Move Left"
                >
                    <Icon name="chevronLeft" size={iconSize} />
                </NavBtn>
                <button
                    className={`canvas-navigator__dpad-home ${isAtHome ? 'canvas-navigator__dpad-home--at-home' : ''}`}
                    onClick={onHome}
                    title="Go to home position"
                    data-vr={isVR}
                >
                    <Icon name="home" size={isVR ? 14 : 10} />
                </button>
                <NavBtn
                    size="sm"
                    onClick={() => onMove('right')}
                    disabled={disabled?.right}
                    title="Move Right"
                >
                    <Icon name="chevronRight" size={iconSize} />
                </NavBtn>
            </div>
            <NavBtn
                size="sm"
                onClick={() => onMove('down')}
                disabled={disabled?.down}
                title="Move Down"
            >
                <Icon name="chevronDown" size={iconSize} />
            </NavBtn>
        </div>
    );
});

// LocalStorage key for size controls expanded state
const SIZE_CONTROLS_EXPANDED_KEY = 'cia-navigator-size-controls-expanded';

// Collapsible Size Controls Footer
const SizeControlsFooter = memo(({
    viewportSize,
    setViewportSizeCols,
    setViewportSizeRows,
    canvasSize,
    setCanvasCols,
    setCanvasRows,
    addRow,
    removeRow,
    addColumn,
    removeColumn,
}) => {
    // Persist expanded state to localStorage
    const [isExpanded, setIsExpanded] = useState(() => {
        try {
            const stored = localStorage.getItem(SIZE_CONTROLS_EXPANDED_KEY);
            return stored === 'true';
        } catch {
            return false;
        }
    });
    const { isVR } = useAdaptive();

    // Save expanded state when it changes
    const handleToggleExpanded = React.useCallback(() => {
        const newValue = !isExpanded;
        setIsExpanded(newValue);
        try {
            localStorage.setItem(SIZE_CONTROLS_EXPANDED_KEY, String(newValue));
        } catch {
            // Ignore localStorage errors
        }
    }, [isExpanded]);

    // Create wrapper onChange handlers that detect increment/decrement
    // and call the appropriate function (which reads fresh from canvas.dimensions)
    const handleCanvasColsChange = React.useCallback((newValue) => {
        if (newValue > canvasSize.cols) {
            addColumn?.();
        } else if (newValue < canvasSize.cols) {
            removeColumn?.();
        }
    }, [canvasSize.cols, addColumn, removeColumn]);

    const handleCanvasRowsChange = React.useCallback((newValue) => {
        if (newValue > canvasSize.rows) {
            addRow?.();
        } else if (newValue < canvasSize.rows) {
            removeRow?.();
        }
    }, [canvasSize.rows, addRow, removeRow]);

    return (
        <div className="canvas-navigator__size-footer" data-expanded={isExpanded}>
            <button
                className="canvas-navigator__size-toggle"
                onClick={handleToggleExpanded}
            >
                <Icon name={isExpanded ? 'chevronDown' : 'chevronRight'} size={isVR ? 12 : 10} />
                <span>Size Controls</span>
                {!isExpanded && (
                    <span className="canvas-navigator__size-summary">
                        ({viewportSize.cols}×{viewportSize.rows} / {canvasSize.cols}×{canvasSize.rows})
                    </span>
                )}
            </button>

            {isExpanded && (
                <div className="canvas-navigator__size-controls">
                    <div className="canvas-navigator__size-col canvas-navigator__size-col--viewport">
                        <span className="canvas-navigator__size-label">Viewport</span>
                        <NumberSpinner
                            label="Cols"
                            value={viewportSize.cols}
                            onChange={setViewportSizeCols}
                            min={1}
                            max={Math.min(10, canvasSize.cols)}
                            color="green"
                            vertical
                        />
                        <NumberSpinner
                            label="Rows"
                            value={viewportSize.rows}
                            onChange={setViewportSizeRows}
                            min={1}
                            max={Math.min(10, canvasSize.rows)}
                            color="green"
                            vertical
                        />
                    </div>

                    <div className="canvas-navigator__size-col canvas-navigator__size-col--canvas">
                        <span className="canvas-navigator__size-label">Canvas</span>
                        <NumberSpinner
                            label="Cols"
                            value={canvasSize.cols}
                            onChange={handleCanvasColsChange}
                            min={1}
                            max={999}
                            color="purple"
                            vertical
                        />
                        <NumberSpinner
                            label="Rows"
                            value={canvasSize.rows}
                            onChange={handleCanvasRowsChange}
                            min={1}
                            max={999}
                            color="purple"
                            vertical
                        />
                    </div>
                </div>
            )}
        </div>
    );
});

// Smart Tooltip Component
const SmartTooltip = memo(({ cell, position, visible, getCellColor }) => {
    if (!visible || !cell) return null;

    const color = getCellColor(cell);

    return ReactDOM.createPortal(
        <div
            className="canvas-navigator__tooltip"
            style={{
                left: position.x + 12,
                top: position.y - 8,
                borderColor: color,
            }}
        >
            <div className="canvas-navigator__tooltip-name">
                {cell.name || `View ${cell.id || '?'}`}
            </div>
            {cell.datasetName && (
                <div className="canvas-navigator__tooltip-dataset">
                    Dataset: {cell.datasetName}
                </div>
            )}
            <div className="canvas-navigator__tooltip-position" style={{ color }}>
                ({cell.col}, {cell.row})
                {((cell.colSpan || 1) > 1 || (cell.rowSpan || 1) > 1) && (
                    <span className="canvas-navigator__tooltip-span">
                        {' '}• {cell.colSpan || 1}×{cell.rowSpan || 1}
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
    dpadPosition = 'left',
    className = "",
}) {
    const { mode, isVR } = useAdaptive();

    // Get context data
    const context = useLayoutPanelContext();
    const contextLogic = context?.logic || {};

    // Debug: Log context data
    React.useEffect(() => {
        console.log('[CanvasNavigator] Context available:', {
            hasContext: !!context,
            hasLogic: !!context?.logic,
            setCanvasRows: typeof contextLogic.setCanvasRows,
            setCanvasCols: typeof contextLogic.setCanvasCols,
            setViewportSizeRows: typeof contextLogic.setViewportSizeRows,
            setViewportSizeCols: typeof contextLogic.setViewportSizeCols,
        });
    }, [context, contextLogic]);

    // Initialize the logic hook with context data
    const logic = useCanvasNavigator({
        canvas: contextLogic.canvas, // Pass the full canvas object for direct manager calls
        canvasSize: contextLogic.canvasSize,
        viewport: contextLogic.viewport,
        viewportSize: contextLogic.viewportSize,
        cells: contextLogic.cells,
        homepoint: contextLogic.homepoint,
        collaborators: contextLogic.collaborators,
        dockPosition: context?.dockPosition,
        loading: contextLogic.loading,
        isConnected: contextLogic.isConnected,
        moveViewport: contextLogic.moveViewport,
        navigateToCell: contextLogic.navigateToCell,
        setViewportSizeRows: contextLogic.setViewportSizeRows,
        setViewportSizeCols: contextLogic.setViewportSizeCols,
        setCanvasRows: contextLogic.setCanvasRows,
        setCanvasCols: contextLogic.setCanvasCols,
        setHomepoint: contextLogic.setHomepoint,
        clearHomepoint: contextLogic.clearHomepoint,
    });

    // Destructure what we need from the logic hook
    const {
        canvasSize,
        viewport,
        viewportSize,
        homepoint,
        minimapZoom,
        contextMode,
        displayMode,
        settingHomepoint,
        isAtHome,
        hoveredCell,
        tooltipPos,
        minimapCells,

        // Mode setters
        setContextMode,
        setDisplayMode,
        setSettingHomepoint,
        setMinimapZoom,
        setHoveredCell,
        setTooltipPos,

        // Navigation
        moveViewport,
        navigateHome,

        // Homepoint
        setHomepoint,

        // Viewport/Canvas size
        setViewportSizeRows,
        setViewportSizeCols,
        setCanvasRows,
        setCanvasCols,
        addRow,
        removeRow,
        addColumn,
        removeColumn,

        // Cell helpers
        getCellColor,
        getCellDisplay,

        // Cell click
        handleCellClick,
    } = logic;

    // Debug: Log functions from logic hook
    React.useEffect(() => {
        console.log('[CanvasNavigator] Logic hook functions:', {
            setViewportSizeRows: typeof setViewportSizeRows,
            setViewportSizeCols: typeof setViewportSizeCols,
            setCanvasRows: typeof setCanvasRows,
            setCanvasCols: typeof setCanvasCols,
            canvasSize,
            viewportSize,
        });
    }, [setViewportSizeRows, setViewportSizeCols, setCanvasRows, setCanvasCols, canvasSize, viewportSize]);

    // Dock position from context
    const dockPosition_ = context?.dockPosition || DOCK_POSITIONS.FLOAT;
    const setDockPosition = context?.setDockPosition || (() => { });

    // Cell dimensions based on zoom and mode
    const CELL_W = (isVR ? 44 : 28) * minimapZoom;
    const CELL_H = (isVR ? 36 : 22) * minimapZoom;
    const GAP = 2;

    // Computed navigation disabled state
    const maxRow = Math.max(0, canvasSize.rows - viewportSize.rows);
    const maxCol = Math.max(0, canvasSize.cols - viewportSize.cols);
    const navDisabled = {
        up: viewport.row <= 0,
        down: viewport.row >= maxRow,
        left: viewport.col <= 0,
        right: viewport.col >= maxCol,
    };

    // Handlers for dock position
    const handlePopOut = () => setDockPosition(DOCK_POSITIONS.FLOAT);
    const handleMinimize = () => setDockPosition(DOCK_POSITIONS.MINIMIZED);

    const iconSize = isVR ? 14 : 12;

    return (
        <div
            className={`canvas-navigator canvas-navigator--${mode} ${className}`}
            data-docked={isDockedInPanel}
        >
            {/* Header */}
            <div className="canvas-navigator__header">
                <div className="canvas-navigator__tab-title">
                    <Icon name="map" size={iconSize} />
                    <span>Navigator</span>
                </div>
                <div className="canvas-navigator__header-actions">
                    {!isDockedInPanel && (
                        <>
                            <NavBtn size="xs" onClick={handleMinimize} title="Minimize">
                                <Icon name="minus" size={isVR ? 10 : 8} />
                            </NavBtn>
                            <NavBtn size="xs" onClick={handlePopOut} title="Pop out">
                                <Icon name="externalLink" size={isVR ? 10 : 8} />
                            </NavBtn>
                        </>
                    )}
                    <NavBtn size="xs" onClick={handleMinimize} title="Close">
                        <Icon name="close" size={isVR ? 10 : 8} />
                    </NavBtn>
                </div>
            </div>

            {/* Mode Toggles */}
            <div className="canvas-navigator__mode-toggles">
                <div className="canvas-navigator__segmented-control">
                    <button
                        className={`canvas-navigator__segment ${contextMode === CONTEXT_MODES.EDIT ? 'canvas-navigator__segment--active' : ''}`}
                        onClick={() => setContextMode(CONTEXT_MODES.EDIT)}
                        data-color="blue"
                    >
                        Layout
                    </button>
                    <button
                        className={`canvas-navigator__segment ${contextMode === CONTEXT_MODES.VIEWS ? 'canvas-navigator__segment--active' : ''}`}
                        onClick={() => setContextMode(CONTEXT_MODES.VIEWS)}
                        data-color="purple"
                    >
                        Views
                    </button>
                </div>
                <div className="canvas-navigator__segmented-control">
                    <button
                        className={`canvas-navigator__segment ${displayMode === DISPLAY_MODES.NAMES ? 'canvas-navigator__segment--active' : ''}`}
                        onClick={() => setDisplayMode(DISPLAY_MODES.NAMES)}
                        title="Show Names"
                    >
                        A
                    </button>
                    <button
                        className={`canvas-navigator__segment ${displayMode === DISPLAY_MODES.NUMBERS ? 'canvas-navigator__segment--active' : ''}`}
                        onClick={() => setDisplayMode(DISPLAY_MODES.NUMBERS)}
                        title="Show Numbers"
                    >
                        #
                    </button>
                    <button
                        className={`canvas-navigator__segment ${displayMode === DISPLAY_MODES.COLORS ? 'canvas-navigator__segment--active' : ''}`}
                        onClick={() => setDisplayMode(DISPLAY_MODES.COLORS)}
                        title="Colors Only"
                    >
                        ●
                    </button>
                </div>
            </div>

            {/* Minimap */}
            <div
                className={`canvas-navigator__minimap ${settingHomepoint ? 'canvas-navigator__minimap--setting-home' : ''}`}
            >
                {settingHomepoint && (
                    <div className="canvas-navigator__setting-home-hint">
                        Click cell to set home
                    </div>
                )}

                <div
                    className="canvas-navigator__grid"
                    style={{
                        gridTemplateColumns: `repeat(${canvasSize.cols}, ${CELL_W}px)`,
                        gridTemplateRows: `repeat(${canvasSize.rows}, ${CELL_H}px)`,
                        gap: GAP,
                    }}
                >
                    {minimapCells.map(({ row, col, cell, inVP, isHome, cellIndex, key }) => {
                        const color = getCellColor(cell);
                        const cellWidth = CELL_W * (cell?.colSpan || 1);

                        return (
                            <div
                                key={key}
                                className={`canvas-navigator__cell ${cell ? 'canvas-navigator__cell--occupied' : ''} ${inVP ? 'canvas-navigator__cell--in-viewport' : ''} ${isHome ? 'canvas-navigator__cell--home' : ''}`}
                                style={{
                                    gridColumn: cell ? `span ${cell.colSpan || 1}` : 'span 1',
                                    gridRow: cell ? `span ${cell.rowSpan || 1}` : 'span 1',
                                    '--cell-color': color,
                                }}
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
                            >
                                {isHome && !cell && (
                                    <Icon name="home" size={Math.max(10, 12 * minimapZoom)} className="canvas-navigator__cell-home-icon" />
                                )}
                                {cell && (
                                    <span className="canvas-navigator__cell-text">
                                        {getCellDisplay(cell, cellIndex, cellWidth)}
                                    </span>
                                )}
                                {isHome && cell && (
                                    <div className="canvas-navigator__cell-home-dot" />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Viewport Rectangle */}
                <div
                    className="canvas-navigator__viewport-indicator"
                    style={{
                        top: 8 + viewport.row * (CELL_H + GAP),
                        left: 8 + viewport.col * (CELL_W + GAP),
                        width: viewportSize.cols * (CELL_W + GAP) - GAP,
                        height: viewportSize.rows * (CELL_H + GAP) - GAP,
                    }}
                />
            </div>

            {/* Navigation Block */}
            <div className="canvas-navigator__nav-block">
                <div
                    className="canvas-navigator__nav-columns"
                    style={{ flexDirection: dpadPosition === 'right' ? 'row-reverse' : 'row' }}
                >
                    {/* D-Pad Column */}
                    <div className="canvas-navigator__nav-col canvas-navigator__nav-col--dpad">
                        <DPad
                            onMove={moveViewport}
                            onHome={navigateHome}
                            isAtHome={isAtHome}
                            disabled={navDisabled}
                        />
                    </div>

                    {/* Info Column */}
                    <div className="canvas-navigator__nav-col canvas-navigator__nav-col--info">
                        {/* Position */}
                        <div className="canvas-navigator__info-row">
                            <Icon name="navigation" size={isVR ? 14 : 12} className="canvas-navigator__info-icon canvas-navigator__info-icon--teal" />
                            <span className="canvas-navigator__position-value">
                                ({viewport.col}, {viewport.row})
                            </span>
                        </div>

                        {/* Home */}
                        <div className="canvas-navigator__info-row">
                            <Icon name="home" size={isVR ? 14 : 12} className="canvas-navigator__info-icon canvas-navigator__info-icon--amber" />
                            <span className={`canvas-navigator__home-value ${isAtHome ? 'canvas-navigator__home-value--at-home' : ''}`}>
                                ({homepoint?.col ?? 0}, {homepoint?.row ?? 0})
                            </span>
                        </div>

                        {/* Set Home Button */}
                        <button
                            className={`canvas-navigator__set-home-btn ${settingHomepoint ? 'canvas-navigator__set-home-btn--active' : ''}`}
                            onClick={() => setSettingHomepoint(!settingHomepoint)}
                        >
                            <Icon name={settingHomepoint ? 'x' : 'mapPin'} size={isVR ? 12 : 10} />
                            {settingHomepoint ? 'Cancel' : 'Set Home'}
                        </button>
                    </div>
                </div>

                {/* Zoom Row */}
                <div className="canvas-navigator__zoom-row">
                    <span className="canvas-navigator__zoom-label">Minimap</span>
                    <NavBtn
                        size="xs"
                        onClick={() => setMinimapZoom(Math.max(0.5, minimapZoom - 0.25))}
                        disabled={minimapZoom <= 0.5}
                    >
                        <Icon name="zoomOut" size={isVR ? 12 : 10} />
                    </NavBtn>
                    <span className="canvas-navigator__zoom-value">
                        {Math.round(minimapZoom * 100)}%
                    </span>
                    <NavBtn
                        size="xs"
                        onClick={() => setMinimapZoom(Math.min(2, minimapZoom + 0.25))}
                        disabled={minimapZoom >= 2}
                    >
                        <Icon name="zoomIn" size={isVR ? 12 : 10} />
                    </NavBtn>
                </div>
            </div>

            {/* Size Controls Footer */}
            <SizeControlsFooter
                viewportSize={viewportSize}
                setViewportSizeCols={setViewportSizeCols}
                setViewportSizeRows={setViewportSizeRows}
                canvasSize={canvasSize}
                setCanvasCols={setCanvasCols}
                setCanvasRows={setCanvasRows}
                addRow={addRow}
                removeRow={removeRow}
                addColumn={addColumn}
                removeColumn={removeColumn}
            />

            {/* Tooltip */}
            <SmartTooltip
                cell={hoveredCell}
                position={tooltipPos}
                visible={!!hoveredCell}
                getCellColor={getCellColor}
            />
        </div>
    );
});

export default CanvasNavigator;