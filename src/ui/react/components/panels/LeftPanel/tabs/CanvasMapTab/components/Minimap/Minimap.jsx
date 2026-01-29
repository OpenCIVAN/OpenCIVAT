/**
 * @file Minimap.jsx
 * @description Main minimap component for Canvas Map
 *
 * Renders the grid-based canvas overview with:
 * - Background grid cells
 * - VG blocks or View cells (based on display mode)
 * - Viewport indicators
 * - Collaborator indicators
 * - Link lines (in Links mode)
 * - Home position and bookmark markers
 */

import React, { memo, useMemo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { VGBlock } from './VGBlock';
import { ViewCell } from './ViewCell';
import { ViewportIndicator } from './ViewportIndicator';
import { CollaboratorIndicator } from './CollaboratorIndicator';
import {
  DISPLAY_MODES,
  MAP_MODES,
  colToLetter,
} from '../../CanvasMapTab.logic';
import './Minimap.scss';

/**
 * Minimap - Grid-based canvas overview
 *
 * @param {Object} props - See CanvasMapTab.logic for full prop definitions
 */
export const Minimap = memo(function Minimap({
  canvas,
  viewGroups,
  viewports,
  collaborators,
  vgLinks,
  bookmarks,
  flattenedViews,

  // Display
  displayMode,
  mapMode,
  minimapCellSize,
  showGridLabels,
  showInternals,
  showViewports,
  showCollaborators,
  showBookmarks,

  // Selection
  selectedVGId,
  selectedViewportId,
  highlightedLinkId,

  // Handlers
  onVGClick,
  onVGDoubleClick,
  onLinkClick,
  getVGCenter,
  getVGDisplayName,
}) {
  const { rows, cols, homePosition } = canvas;
  const gap = 4;

  // Calculate which VGs are involved in the highlighted link
  const highlightedLinkVGs = useMemo(() => {
    if (!highlightedLinkId) return new Set();
    const link = vgLinks.find(l => l.id === highlightedLinkId);
    if (!link) return new Set();
    return new Set([link.from, link.to]);
  }, [highlightedLinkId, vgLinks]);

  return (
    <div
      className="minimap"
      style={{
        '--cell-size': `${minimapCellSize}px`,
        '--grid-gap': `${gap}px`,
      }}
    >
      {/* Link lines (Links mode, VG sub-tab) */}
      {mapMode === MAP_MODES.LINKS && displayMode === DISPLAY_MODES.VG && (
        <svg className="minimap__links">
          {vgLinks.map(link => {
            const from = getVGCenter(link.from);
            const to = getVGCenter(link.to);
            if (!from || !to) return null;

            const isHighlighted = highlightedLinkId === link.id;
            const linkColor = link.type === 'camera' ? 'var(--accent-cyan)' : 'var(--accent-purple)';

            return (
              <g
                key={link.id}
                className={`minimap__link ${isHighlighted ? 'minimap__link--highlighted' : ''}`}
                onClick={() => onLinkClick(link.id)}
              >
                <line
                  x1={from.x + (showGridLabels ? 24 : 0)}
                  y1={from.y + (showGridLabels ? 20 : 0)}
                  x2={to.x + (showGridLabels ? 24 : 0)}
                  y2={to.y + (showGridLabels ? 20 : 0)}
                  stroke={linkColor}
                  strokeWidth={isHighlighted ? 4 : 2}
                  strokeOpacity={isHighlighted ? 1 : 0.5}
                  strokeDasharray={link.mode === 'unidirectional' ? '6,4' : 'none'}
                />
                {link.mode === 'unidirectional' && (
                  <circle
                    cx={to.x + (showGridLabels ? 24 : 0)}
                    cy={to.y + (showGridLabels ? 20 : 0)}
                    r={5}
                    fill={linkColor}
                    opacity={isHighlighted ? 1 : 0.5}
                  />
                )}
              </g>
            );
          })}
        </svg>
      )}

      {/* Grid with labels */}
      <div className="minimap__container">
        {/* Column headers (A, B, C...) */}
        {showGridLabels && (
          <div className="minimap__col-headers">
            {Array.from({ length: cols }).map((_, col) => (
              <div
                key={`col-${col}`}
                className="minimap__col-header"
                style={{ width: minimapCellSize }}
              >
                {colToLetter(col)}
              </div>
            ))}
          </div>
        )}

        {/* Main grid area */}
        <div className="minimap__grid-area">
          {/* Row labels (1, 2, 3...) */}
          {showGridLabels && (
            <div className="minimap__row-headers">
              {Array.from({ length: rows }).map((_, row) => (
                <div
                  key={`row-${row}`}
                  className="minimap__row-header"
                  style={{ height: minimapCellSize }}
                >
                  {row + 1}
                </div>
              ))}
            </div>
          )}

          {/* Grid cells */}
          <div
            className="minimap__grid"
            style={{
              gridTemplateColumns: `repeat(${cols}, ${minimapCellSize}px)`,
              gridTemplateRows: `repeat(${rows}, ${minimapCellSize}px)`,
            }}
          >
            {/* Background cells */}
            {Array.from({ length: rows * cols }).map((_, i) => {
              const row = Math.floor(i / cols);
              const col = i % cols;
              const isHome = displayMode === DISPLAY_MODES.VG &&
                row === homePosition?.row &&
                col === homePosition?.col;
              const bookmark = displayMode === DISPLAY_MODES.VG
                ? bookmarks.find(b => b.position.row === row && b.position.col === col)
                : null;

              return (
                <div
                  key={`cell-${row}-${col}`}
                  className="minimap__cell"
                >
                  {isHome && mapMode === MAP_MODES.NAVIGATE && (
                    <Icon name="home" size={10} className="minimap__home-icon" />
                  )}
                  {bookmark && mapMode === MAP_MODES.NAVIGATE && showBookmarks && (
                    <Icon name="bookmark" size={10} className="minimap__bookmark-icon" />
                  )}
                </div>
              );
            })}

            {/* VG Blocks (VG mode) */}
            {displayMode === DISPLAY_MODES.VG && viewGroups.map(vg => {
              if (!vg.position) return null;
              const isSelected = selectedVGId === vg.id;
              const isGhosted = mapMode === MAP_MODES.LINKS &&
                highlightedLinkId &&
                !highlightedLinkVGs.has(vg.id);

              return (
                <VGBlock
                  key={vg.id}
                  vg={vg}
                  displayName={getVGDisplayName(vg)}
                  cellSize={minimapCellSize}
                  isSelected={isSelected}
                  isGhosted={isGhosted}
                  showInternals={mapMode === MAP_MODES.LAYOUT && showInternals}
                  onClick={() => onVGClick(vg.id)}
                  onDoubleClick={() => onVGDoubleClick(vg.id)}
                />
              );
            })}

            {/* View Cells (View mode) */}
            {displayMode === DISPLAY_MODES.VIEW && flattenedViews.map(view => (
              <ViewCell
                key={view.id}
                view={view}
                cellSize={minimapCellSize}
                isSelected={selectedVGId === view.vgId}
                onClick={() => onVGClick(view.vgId)}
              />
            ))}

            {/* Viewport indicators */}
            {showViewports && (
              mapMode === MAP_MODES.NAVIGATE ||
              mapMode === MAP_MODES.LAYOUT ||
              mapMode === MAP_MODES.COLLABORATE
            ) && viewports.map(vp => (
              <ViewportIndicator
                key={vp.id}
                viewport={vp}
                cellSize={minimapCellSize}
                isSelected={selectedViewportId === vp.id}
              />
            ))}

            {/* Collaborator indicators */}
            {showCollaborators && (
              mapMode === MAP_MODES.NAVIGATE ||
              mapMode === MAP_MODES.COLLABORATE
            ) && collaborators.filter(c => c.isOnline && c.viewport).map(collab => (
              <CollaboratorIndicator
                key={collab.id}
                collaborator={collab}
                cellSize={minimapCellSize}
                showName={mapMode === MAP_MODES.COLLABORATE}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export default Minimap;
