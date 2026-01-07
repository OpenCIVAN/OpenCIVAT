// src/ui/react/components/workspace/Canvas/CanvasInfoFooter/CanvasInfoFooter.jsx
// Canvas info footer showing canvas size, viewport, cell size, collaborators, and sync status
//
// Based on canvas-chrome-v12.jsx spec
// Height: 24px

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms';
import './CanvasInfoFooter.scss';

/**
 * CanvasInfoFooter - Info bar at bottom of canvas
 *
 * Shows:
 * - Canvas size (cols x rows) with map button to open navigator
 * - Viewport size
 * - Cell size in pixels
 * - Collaborator count
 * - Sync status indicator
 */
export function CanvasInfoFooter({
    // Canvas info
    canvasSize = { cols: 10, rows: 10 },
    viewportSize = { cols: 3, rows: 3 },
    cellSize = { width: 300, height: 250 },

    // Collaborators
    collaboratorCount = 0,

    // Sync status
    syncStatus = 'synced', // 'synced' | 'syncing' | 'disconnected'

    // Callbacks
    onOpenNavigator,

    className = '',
}) {
    return (
        <div className={`canvas-info-footer ${className}`}>
            {/* Left section - Canvas info */}
            <div className="canvas-info-footer__section canvas-info-footer__section--left">
                <button
                    type="button"
                    className="canvas-info-footer__nav-btn"
                    onClick={onOpenNavigator}
                    title="Open Canvas Navigator"
                >
                    <Icon name="map" size={10} />
                    Canvas: {canvasSize.cols}×{canvasSize.rows}
                </button>
                <span className="canvas-info-footer__item">
                    Viewport: {viewportSize.cols}×{viewportSize.rows}
                </span>
                <span className="canvas-info-footer__item">
                    Cell: {Math.round(cellSize.width)}×{Math.round(cellSize.height)}px
                </span>
            </div>

            {/* Right section - Status */}
            <div className="canvas-info-footer__section canvas-info-footer__section--right">
                {/* Collaborator count */}
                {collaboratorCount > 0 && (
                    <span className="canvas-info-footer__item canvas-info-footer__item--collab">
                        <Icon name="users" size={10} />
                        {collaboratorCount}
                    </span>
                )}

                {/* Sync status */}
                <span className={`canvas-info-footer__sync canvas-info-footer__sync--${syncStatus}`}>
                    <span className="canvas-info-footer__sync-dot" />
                    {syncStatus === 'synced' ? 'Synced' : syncStatus === 'syncing' ? 'Syncing...' : 'Disconnected'}
                </span>
            </div>
        </div>
    );
}

export default memo(CanvasInfoFooter);
