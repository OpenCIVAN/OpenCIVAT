/**
 * SlidingPanel Component
 *
 * Slides down from beneath the ViewItem row on hover.
 * Contains quick toggles and a size picker button.
 *
 * Features:
 * - Tooltip area showing action descriptions
 * - Grouped action buttons (Stars, State, Share, Duplicate/Link)
 * - Size picker button that opens a popover
 * - Lock toggle
 */

import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    Folder,
    Globe,
    Save,
    RefreshCw,
    Users,
    Copy,
    Link2,
    Lock,
    Maximize2,
    ChevronDown,
} from 'lucide-react';
import './SlidingPanel.scss';

export function SlidingPanel({
    view,
    isOpen,
    availableViews = [],
    onStarWorkspace,
    onStarPersonal,
    onSaveState,
    onLoadState,
    onShare,
    onDuplicate,
    onLock,
    onSizeChange,
    onLinkPropertyChange,
}) {
    const [tooltipText, setTooltipText] = useState(null);
    const [showSizeMenu, setShowSizeMenu] = useState(false);
    const [sizeMenuPos, setSizeMenuPos] = useState({ x: 0, y: 0 });
    const sizeButtonRef = useRef(null);

    const handleSizeClick = (e) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        // Position menu below button, constrain to viewport
        const x = Math.min(rect.left, window.innerWidth - 160);
        const y = rect.bottom + 4;
        setSizeMenuPos({ x, y });
        setShowSizeMenu(true);
    };

    const handleSizeSelect = (rows, cols) => {
        onSizeChange?.({ rows, cols });
        setShowSizeMenu(false);
    };

    // Close size menu when panel closes
    React.useEffect(() => {
        if (!isOpen) {
            setShowSizeMenu(false);
            setTooltipText(null);
        }
    }, [isOpen]);

    return (
        <div className={`sliding-panel ${isOpen ? 'sliding-panel--open' : ''}`}>
            {/* Tooltip Area */}
            <div className={`sliding-panel__tooltip ${tooltipText ? 'sliding-panel__tooltip--active' : ''}`}>
                {tooltipText || 'Hover actions for details'}
            </div>

            {/* Action Groups */}
            <div className="sliding-panel__actions">
                {/* Star Group */}
                <div className="sliding-panel__group">
                    <PanelButton
                        icon={Folder}
                        active={view.starredWorkspace}
                        activeColor="purple"
                        onClick={onStarWorkspace}
                        onHover={() => setTooltipText('Save to Workspace')}
                        onLeave={() => setTooltipText(null)}
                    />
                    <PanelButton
                        icon={Globe}
                        active={view.starredPersonal}
                        activeColor="amber"
                        onClick={onStarPersonal}
                        onHover={() => setTooltipText('Save to Personal')}
                        onLeave={() => setTooltipText(null)}
                    />
                </div>

                {/* State Group */}
                <div className="sliding-panel__group">
                    <PanelButton
                        icon={Save}
                        active={view.hasSavedState}
                        activeColor="amber"
                        onClick={onSaveState}
                        onHover={() => setTooltipText('Save Current State')}
                        onLeave={() => setTooltipText(null)}
                    />
                    <PanelButton
                        icon={RefreshCw}
                        onClick={onLoadState}
                        onHover={() => setTooltipText('Load Saved State')}
                        onLeave={() => setTooltipText(null)}
                    />
                </div>

                {/* Share Group */}
                <div className="sliding-panel__group">
                    <PanelButton
                        icon={Users}
                        active={view.isShared}
                        activeColor="pink"
                        onClick={onShare}
                        onHover={() => setTooltipText('Share View')}
                        onLeave={() => setTooltipText(null)}
                    />
                </div>

                {/* Duplicate/Link Group */}
                <div className="sliding-panel__group">
                    <PanelButton
                        icon={Copy}
                        onClick={onDuplicate}
                        onHover={() => setTooltipText('Duplicate View')}
                        onLeave={() => setTooltipText(null)}
                    />
                    <PanelButton
                        icon={Link2}
                        active={view.linkedCount > 0}
                        activeColor="teal"
                        badge={view.linkedCount > 0 ? view.linkedCount : null}
                        onHover={() => setTooltipText('Configure Links')}
                        onLeave={() => setTooltipText(null)}
                    />
                </div>

                {/* Lock */}
                <div className="sliding-panel__group">
                    <PanelButton
                        icon={Lock}
                        active={view.isLocked}
                        activeColor="amber"
                        onClick={onLock}
                        onHover={() => setTooltipText(view.isLocked ? 'Unlock View' : 'Lock View')}
                        onLeave={() => setTooltipText(null)}
                    />
                </div>

                {/* Spacer */}
                <div className="sliding-panel__spacer" />

                {/* Size Picker Button */}
                <button
                    ref={sizeButtonRef}
                    className="sliding-panel__size-btn"
                    onClick={handleSizeClick}
                    onMouseEnter={() => setTooltipText('Canvas Size')}
                    onMouseLeave={() => setTooltipText(null)}
                >
                    <Maximize2 size={12} />
                    <span>{view.rowSpan || 1}×{view.colSpan || 1}</span>
                    <ChevronDown size={10} />
                </button>
            </div>

            {/* Size Menu Popover */}
            {showSizeMenu && createPortal(
                <>
                    <div
                        className="sliding-panel__size-backdrop"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowSizeMenu(false);
                        }}
                    />
                    <div
                        className="sliding-panel__size-menu"
                        style={{
                            left: sizeMenuPos.x,
                            top: sizeMenuPos.y,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sliding-panel__size-menu-title">Canvas Size</div>
                        <div className="sliding-panel__size-grid">
                            {[1, 2, 3].map(row =>
                                [1, 2, 3].map(col => (
                                    <button
                                        key={`${row}x${col}`}
                                        className={`sliding-panel__size-option ${row === (view.rowSpan || 1) && col === (view.colSpan || 1)
                                                ? 'sliding-panel__size-option--active'
                                                : ''
                                            }`}
                                        onClick={() => handleSizeSelect(row, col)}
                                    >
                                        {row}×{col}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
}

// Panel Button Component
function PanelButton({ icon: Icon, active, activeColor, badge, onClick, onHover, onLeave }) {
    return (
        <button
            className={`sliding-panel__btn ${active ? `sliding-panel__btn--active sliding-panel__btn--${activeColor}` : ''}`}
            onClick={(e) => {
                e.stopPropagation();
                onClick?.();
            }}
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
        >
            <Icon size={14} />
            {badge && <span className="sliding-panel__btn-badge">{badge}</span>}
        </button>
    );
}

export default SlidingPanel;