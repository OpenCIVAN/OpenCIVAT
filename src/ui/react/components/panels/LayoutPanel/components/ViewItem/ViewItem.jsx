/**
 * ViewItem Component
 *
 * Represents a single view in the Views subtab list.
 * Expands inline to show action buttons and link properties.
 *
 * Collapsed State:
 * - Drag handle
 * - Active indicator dot
 * - View name
 * - Status icons (shared, linked)
 * - Position display (col,row)
 * - Expand chevron
 *
 * Expanded State (pushes siblings):
 * - Tooltip row
 * - Action buttons (save, share, spawn, close)
 * - Size picker
 * - Link properties toggles
 */

import React, { memo } from 'react';
import {
    GripVertical,
    ChevronDown,
    Share2,
    Link2,
    Folder,
    Globe,
    Save,
    Download,
    Plus,
    X,
    ToggleLeft,
    ToggleRight,
    GitBranch,
    Camera,
    Sliders,
    Layout,
    Crosshair,
    Palette,
    Eye,
} from 'lucide-react';
import { useViewItem, LINK_PROPERTIES } from './ViewItem.logic';
import './ViewItem.scss';

// Instance colors for view color coding
const INSTANCE_COLORS = [
    '#60a5fa', // blue
    '#4ade80', // green
    '#f472b6', // pink
    '#fbbf24', // amber
    '#2dd4bf', // teal
    '#a78bfa', // purple
];

// Size options for the size picker
const SIZE_OPTIONS = ['1×1', '2×1', '1×2', '2×2', '3×1', '3×2'];

// Icon map for link properties
const LINK_ICONS = {
    camera: Camera,
    filters: Sliders,
    widgets: Layout,
    cursors: Crosshair,
    colors: Palette,
    annot: Eye,
};

export const ViewItem = memo(function ViewItem({
    view,
    isActive = false,
    isExpanded = false,
    onToggleExpand,
    onAction,
    onSizeChange,
    className = '',
}) {
    const {
        tooltipText,
        linkProps,
        allLinked,
        showTooltip,
        hideTooltip,
        toggleLinkProp,
        toggleAllLinkProps,
        handleToggleExpand,
        handleAction,
    } = useViewItem({
        view,
        isExpanded,
        onToggleExpand,
        onAction,
    });

    const colorIndex = view.color ?? 0;
    const color = INSTANCE_COLORS[colorIndex % INSTANCE_COLORS.length];

    return (
        <div
            className={`layout-view-item ${isExpanded ? 'layout-view-item--expanded' : ''} ${className}`}
            style={{ '--view-color': color }}
        >
            {/* Main Row - Always Visible */}
            <div
                className={`layout-view-item__main ${isActive ? 'layout-view-item__main--active' : ''}`}
                onClick={handleToggleExpand}
            >
                {/* Drag Handle */}
                <div className="layout-view-item__drag-handle">
                    <GripVertical size={10} />
                </div>

                {/* Active Indicator */}
                <div
                    className={`layout-view-item__dot ${isActive ? 'layout-view-item__dot--active' : ''}`}
                />

                {/* Name */}
                <span className="layout-view-item__name">{view.name}</span>

                {/* Status Icons */}
                <div className="layout-view-item__status">
                    {view.isShared && (
                        <Share2 size={10} className="layout-view-item__status-icon layout-view-item__status-icon--shared" />
                    )}
                    {view.isLinked && (
                        <Link2 size={10} className="layout-view-item__status-icon layout-view-item__status-icon--linked" />
                    )}
                </div>

                {/* Position */}
                <span className="layout-view-item__position">
                    {view.col},{view.row}
                </span>

                {/* Expand Chevron */}
                <ChevronDown
                    size={12}
                    className={`layout-view-item__chevron ${isExpanded ? 'layout-view-item__chevron--open' : ''}`}
                />
            </div>

            {/* Expanded Panel */}
            {isExpanded && (
                <div className="layout-view-item__panel">
                    {/* Tooltip Row */}
                    <div className="layout-view-item__tooltip">
                        {tooltipText || 'Hover actions for details'}
                    </div>

                    {/* Action Buttons */}
                    <div className="layout-view-item__actions">
                        {/* Save Group */}
                        <div className="layout-view-item__btn-group">
                            <button
                                className={`layout-view-item__action-btn ${view.starredWorkspace ? 'layout-view-item__action-btn--active' : ''}`}
                                onMouseEnter={() => showTooltip('Save to Workspace')}
                                onMouseLeave={hideTooltip}
                                onClick={(e) => { e.stopPropagation(); handleAction('starWorkspace'); }}
                                data-color="purple"
                            >
                                <Folder size={12} />
                            </button>
                            <button
                                className={`layout-view-item__action-btn ${view.starredPersonal ? 'layout-view-item__action-btn--active' : ''}`}
                                onMouseEnter={() => showTooltip('Save to Personal')}
                                onMouseLeave={hideTooltip}
                                onClick={(e) => { e.stopPropagation(); handleAction('starPersonal'); }}
                                data-color="amber"
                            >
                                <Globe size={12} />
                            </button>
                        </div>

                        {/* State Group */}
                        <div className="layout-view-item__btn-group">
                            <button
                                className="layout-view-item__action-btn"
                                onMouseEnter={() => showTooltip('Save state')}
                                onMouseLeave={hideTooltip}
                                onClick={(e) => { e.stopPropagation(); handleAction('saveState'); }}
                            >
                                <Save size={12} />
                            </button>
                            <button
                                className="layout-view-item__action-btn"
                                onMouseEnter={() => showTooltip('Load state')}
                                onMouseLeave={hideTooltip}
                                onClick={(e) => { e.stopPropagation(); handleAction('loadState'); }}
                            >
                                <Download size={12} />
                            </button>
                        </div>

                        {/* Share */}
                        <button
                            className={`layout-view-item__action-btn ${view.isShared ? 'layout-view-item__action-btn--active' : ''}`}
                            onMouseEnter={() => showTooltip('Share view')}
                            onMouseLeave={hideTooltip}
                            onClick={(e) => { e.stopPropagation(); handleAction('share'); }}
                            data-color="pink"
                        >
                            <Share2 size={12} />
                        </button>

                        {/* Spawn Group */}
                        <div className="layout-view-item__btn-group">
                            <button
                                className="layout-view-item__action-btn"
                                onMouseEnter={() => showTooltip('Spawn linked view')}
                                onMouseLeave={hideTooltip}
                                onClick={(e) => { e.stopPropagation(); handleAction('spawn'); }}
                            >
                                <Plus size={12} />
                            </button>
                            <button
                                className="layout-view-item__action-btn layout-view-item__action-btn--teal"
                                onMouseEnter={() => showTooltip('Configure links')}
                                onMouseLeave={hideTooltip}
                                onClick={(e) => { e.stopPropagation(); handleAction('configureLinks'); }}
                            >
                                <Link2 size={12} />
                            </button>
                        </div>

                        <div className="layout-view-item__spacer" />

                        {/* Close */}
                        <button
                            className="layout-view-item__action-btn layout-view-item__action-btn--danger"
                            onMouseEnter={() => showTooltip('Close view')}
                            onMouseLeave={hideTooltip}
                            onClick={(e) => { e.stopPropagation(); handleAction('close'); }}
                        >
                            <X size={12} />
                        </button>
                    </div>

                    {/* Size Picker */}
                    <div className="layout-view-item__size-row">
                        <span className="layout-view-item__size-label">Size:</span>
                        <div className="layout-view-item__size-options">
                            {SIZE_OPTIONS.map((size) => {
                                const [cols, rows] = size.split('×').map(Number);
                                const isSelected = view.colSpan === cols && view.rowSpan === rows;

                                return (
                                    <button
                                        key={size}
                                        className={`layout-view-item__size-btn ${isSelected ? 'layout-view-item__size-btn--active' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSizeChange?.(view.id, { colSpan: cols, rowSpan: rows });
                                        }}
                                    >
                                        {size}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Linked Parent (if applicable) */}
                    {view.linkedParent && (
                        <div className="layout-view-item__linked-parent">
                            <GitBranch size={10} />
                            <span>Linked to:</span>
                            <span className="layout-view-item__linked-name">{view.linkedParent}</span>
                        </div>
                    )}

                    {/* Link Properties */}
                    <div className={`layout-view-item__link-row ${view.linkTarget ? '' : 'layout-view-item__link-row--disabled'}`}>
                        <span className="layout-view-item__link-label">Link:</span>

                        {/* Toggle All */}
                        <button
                            className={`layout-view-item__link-toggle ${allLinked ? 'layout-view-item__link-toggle--active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); toggleAllLinkProps(); }}
                        >
                            {allLinked ? <ToggleRight size={10} /> : <ToggleLeft size={10} />}
                        </button>

                        <div className="layout-view-item__link-divider" />

                        {/* Individual toggles */}
                        {LINK_PROPERTIES.map((prop) => {
                            const Icon = LINK_ICONS[prop.id];
                            const isActive = linkProps[prop.id];

                            return (
                                <button
                                    key={prop.id}
                                    className={`layout-view-item__link-btn ${isActive ? 'layout-view-item__link-btn--active' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); toggleLinkProp(prop.id); }}
                                    title={prop.label}
                                >
                                    <Icon size={10} />
                                    {isActive && <span className="layout-view-item__link-dot" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
});

export default ViewItem;