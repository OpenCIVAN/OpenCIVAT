// src/ui/react/components/workspace/Canvas/CanvasChrome/CanvasChromeHeader.jsx
// CanvasChromeHeader - header bar for workspace/viewgroup/navigation controls.

import React, { memo, useMemo, useRef, useState } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { DropdownPortal } from '@UI/react/components/atoms/DropdownPortal';
import './CanvasChromeHeader.scss';

const normalizeItems = (items = []) => items.map((item) => {
    if (typeof item === 'string') {
        return { id: item, name: item };
    }
    return item;
});

const DropdownList = memo(function DropdownList({
    open,
    onClose,
    triggerRef,
    items,
    renderItem,
    className = '',
}) {
    if (!open) return null;

    return (
        <DropdownPortal
            open={open}
            onClose={onClose}
            triggerRef={triggerRef}
            align="start"
            position="bottom"
            className={`canvas-chrome-header__dropdown ${className}`}
        >
            <div className="canvas-chrome-header__dropdown-inner">
                {items.map(renderItem)}
            </div>
        </DropdownPortal>
    );
});

export const CanvasChromeHeader = memo(function CanvasChromeHeader({
    // Navigation
    canGoBack = false,
    onGoBack,
    onGoHome,

    // Workspace
    workspace,
    workspaces = [],
    onWorkspaceChange,

    // ViewGroup
    viewGroup,
    viewGroups = [],
    onViewGroupChange,
    isViewGroupLinked = false,

    // Edit mode
    isEditMode = false,
    onToggleEditMode,

    // Flow
    flowDirection = 'right',
    onFlowDirectionChange,

    // Display options
    showCoordinates = false,
    showViewGroupBorders = false,
    onToggleCoordinates,
    onToggleViewGroupBorders,

    // Window mode
    windowMode = 'docked',
    onWindowModeChange,
    isFullscreen = false,
    onToggleFullscreen,

    className = '',
}) {
    const [workspaceOpen, setWorkspaceOpen] = useState(false);
    const [viewGroupOpen, setViewGroupOpen] = useState(false);
    const [displayOpen, setDisplayOpen] = useState(false);
    const workspaceTriggerRef = useRef(null);
    const viewGroupTriggerRef = useRef(null);
    const displayTriggerRef = useRef(null);

    const workspaceItems = useMemo(() => normalizeItems(workspaces), [workspaces]);
    const viewGroupItems = useMemo(() => normalizeItems(viewGroups), [viewGroups]);
    const workspaceLabel = workspace?.name || (typeof workspace === 'string' ? workspace : 'Workspace');
    const workspaceId = workspace?.id || (typeof workspace === 'string' ? workspace : null);
    const viewGroupLabel = viewGroup?.name || (typeof viewGroup === 'string' ? viewGroup : 'All ViewGroups');
    const viewGroupId = viewGroup?.id || (typeof viewGroup === 'string' ? viewGroup : null);

    const activeDisplayCount = Number(showCoordinates) + Number(showViewGroupBorders);

    return (
        <header className={`canvas-chrome-header ${className}`}>
            <div className="canvas-chrome-header__left">
                <div className="canvas-chrome-header__nav-group">
                    <button
                        type="button"
                        className="canvas-chrome-header__icon-btn"
                        onClick={onGoBack}
                        disabled={!canGoBack}
                        title="Back"
                        aria-label="Back"
                    >
                        <Icon name="arrowLeft" size={14} />
                    </button>
                    <button
                        type="button"
                        className="canvas-chrome-header__icon-btn"
                        onClick={onGoHome}
                        title="Home"
                        aria-label="Home"
                    >
                        <Icon name="home" size={14} />
                    </button>
                </div>

                <div className="canvas-chrome-header__selector-group">
                    <button
                        ref={workspaceTriggerRef}
                        type="button"
                        className="canvas-chrome-header__selector canvas-chrome-header__selector--workspace"
                        onClick={() => setWorkspaceOpen((prev) => !prev)}
                        aria-expanded={workspaceOpen}
                        aria-haspopup="listbox"
                    >
                        <Icon name="grid" size={14} />
                        <span className="canvas-chrome-header__selector-name">
                            {workspaceLabel}
                        </span>
                        <Icon name="chevronDown" size={12} />
                    </button>

                    <Icon name="chevronRight" size={12} className="canvas-chrome-header__chevron" />

                    <button
                        ref={viewGroupTriggerRef}
                        type="button"
                        className="canvas-chrome-header__selector canvas-chrome-header__selector--viewgroup"
                        onClick={() => setViewGroupOpen((prev) => !prev)}
                        aria-expanded={viewGroupOpen}
                        aria-haspopup="listbox"
                    >
                        {viewGroup ? (
                            <>
                                <span
                                    className="canvas-chrome-header__dot"
                                    style={{ background: viewGroup.color || 'var(--color-accent-purple)' }}
                                />
                                <span className="canvas-chrome-header__selector-name">
                                    {viewGroupLabel}
                                </span>
                                {isViewGroupLinked && (
                                    <Icon name="link" size={12} className="canvas-chrome-header__link" />
                                )}
                            </>
                        ) : (
                            <>
                                <Icon name="grid3x3" size={12} />
                                <span className="canvas-chrome-header__selector-name">All ViewGroups</span>
                            </>
                        )}
                        <Icon name="chevronDown" size={12} />
                    </button>
                </div>
            </div>

            <div className="canvas-chrome-header__center">
                <div className="canvas-chrome-header__edit">
                    <button
                        type="button"
                        className={`canvas-chrome-header__pill-btn ${isEditMode ? 'is-active' : ''}`}
                        onClick={() => onToggleEditMode?.(!isEditMode)}
                        aria-pressed={isEditMode}
                    >
                        <Icon name="pencil" size={12} />
                        <span>Edit</span>
                    </button>
                </div>

                <div className="canvas-chrome-header__flow">
                    <div className="canvas-chrome-header__button-group">
                        <button
                            type="button"
                            className={`canvas-chrome-header__icon-btn ${flowDirection === 'right' ? 'is-active' : ''}`}
                            onClick={() => onFlowDirectionChange?.('right')}
                            title="Flow Right"
                            aria-pressed={flowDirection === 'right'}
                        >
                            <Icon name="arrowRight" size={14} />
                        </button>
                        <button
                            type="button"
                            className={`canvas-chrome-header__icon-btn ${flowDirection === 'down' ? 'is-active' : ''}`}
                            onClick={() => onFlowDirectionChange?.('down')}
                            title="Flow Down"
                            aria-pressed={flowDirection === 'down'}
                        >
                            <Icon name="arrowDown" size={14} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="canvas-chrome-header__right">
                <div className="canvas-chrome-header__display">
                    <button
                        ref={displayTriggerRef}
                        type="button"
                        className="canvas-chrome-header__icon-btn canvas-chrome-header__icon-btn--dropdown"
                        onClick={() => setDisplayOpen((prev) => !prev)}
                        aria-expanded={displayOpen}
                        aria-haspopup="menu"
                        title="Display options"
                    >
                        <Icon name="grid" size={14} />
                        {activeDisplayCount > 0 && (
                            <span className="canvas-chrome-header__badge">{activeDisplayCount}</span>
                        )}
                        <Icon name="chevronDown" size={12} />
                    </button>
                </div>

                <div className="canvas-chrome-header__window">
                    <div className="canvas-chrome-header__button-group">
                        <button
                            type="button"
                            className={`canvas-chrome-header__icon-btn ${windowMode === 'docked' ? 'is-active' : ''}`}
                            onClick={() => onWindowModeChange?.('docked')}
                            title="Docked"
                            aria-pressed={windowMode === 'docked'}
                        >
                            <Icon name="dock" size={14} />
                        </button>
                        <button
                            type="button"
                            className={`canvas-chrome-header__icon-btn ${windowMode === 'floating' ? 'is-active' : ''}`}
                            onClick={() => onWindowModeChange?.('floating')}
                            title="Floating"
                            aria-pressed={windowMode === 'floating'}
                        >
                            <Icon name="windowRestore" size={14} />
                        </button>
                        <button
                            type="button"
                            className={`canvas-chrome-header__icon-btn ${windowMode === 'full' ? 'is-active' : ''}`}
                            onClick={() => onWindowModeChange?.('full')}
                            title="Full"
                            aria-pressed={windowMode === 'full'}
                        >
                            <Icon name="maximize" size={14} />
                        </button>
                    </div>
                    <button
                        type="button"
                        className={`canvas-chrome-header__icon-btn ${isFullscreen ? 'is-active' : ''}`}
                        onClick={() => onToggleFullscreen?.(!isFullscreen)}
                        title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                        aria-pressed={isFullscreen}
                    >
                        <Icon name={isFullscreen ? 'fullscreenExit' : 'fullscreen'} size={14} />
                    </button>
                </div>
            </div>

            {/* Workspace dropdown */}
            <DropdownList
                open={workspaceOpen}
                onClose={() => setWorkspaceOpen(false)}
                triggerRef={workspaceTriggerRef}
                items={workspaceItems}
                renderItem={(item) => (
                    <button
                        key={item.id}
                        className={`canvas-chrome-header__dropdown-item ${workspaceId === item.id ? 'is-active' : ''}`}
                        onClick={() => {
                            onWorkspaceChange?.(item);
                            setWorkspaceOpen(false);
                        }}
                    >
                        <Icon name="grid" size={12} />
                        <span>{item.name}</span>
                    </button>
                )}
            />

            {/* ViewGroup dropdown */}
            <DropdownList
                open={viewGroupOpen}
                onClose={() => setViewGroupOpen(false)}
                triggerRef={viewGroupTriggerRef}
                items={viewGroupItems}
                renderItem={(item) => (
                    <button
                        key={item.id}
                        className={`canvas-chrome-header__dropdown-item ${viewGroupId === item.id ? 'is-active' : ''}`}
                        onClick={() => {
                            onViewGroupChange?.(item);
                            setViewGroupOpen(false);
                        }}
                    >
                        <span
                            className="canvas-chrome-header__dot"
                            style={{ background: item.color || 'var(--color-accent-purple)' }}
                        />
                        <span className="canvas-chrome-header__dropdown-text">{item.name}</span>
                        {item.linkedTo && (
                            <Icon name="link" size={12} className="canvas-chrome-header__link" />
                        )}
                    </button>
                )}
            />

            {/* Display options dropdown */}
            <DropdownList
                open={displayOpen}
                onClose={() => setDisplayOpen(false)}
                triggerRef={displayTriggerRef}
                items={[
                    { id: 'coordinates', label: 'Grid Coordinates', value: showCoordinates, onToggle: onToggleCoordinates },
                    { id: 'borders', label: 'ViewGroup Borders', value: showViewGroupBorders, onToggle: onToggleViewGroupBorders },
                ]}
                renderItem={(item) => (
                    <label key={item.id} className="canvas-chrome-header__dropdown-item canvas-chrome-header__dropdown-item--toggle">
                        <input
                            type="checkbox"
                            checked={item.value}
                            onChange={() => item.onToggle?.(!item.value)}
                        />
                        <span>{item.label}</span>
                    </label>
                )}
            />
        </header>
    );
});

export default CanvasChromeHeader;
