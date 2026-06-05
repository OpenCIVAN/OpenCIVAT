/**
 * @file FocusedCell.jsx
 * @description Interactive cell within the VG focused overlay.
 *
 * Renders view name, type icon, dataset name, and handles drag-drop, selection,
 * drag source/target, targeting, and assignment visual states.
 */

import React, { memo, forwardRef } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Tooltip } from '@UI/react/components/atoms/Tooltip';
import { VIEW_TYPES } from '../../utils/constants';

/**
 * @param {Object} props
 * @param {Object} props.cell - Cell position/size { x, y, width, height, index }
 * @param {Object|null} props.view - View data or null if empty
 * @param {string} props.vgColor - Parent VG color
 * @param {boolean} props.isSelected - Whether this cell is selected (amber ring)
 * @param {boolean} props.isDropTarget - Whether an external drag is hovering
 * @param {boolean} props.isDragSource - Whether this cell is the drag source
 * @param {boolean} props.isDragTarget - Whether a drag could land here
 * @param {boolean} props.isTargetingValid - Whether this is a valid targeting target
 * @param {boolean} props.isTargetingPulse - Whether to show amber pulse (swap target)
 * @param {boolean} props.isAssigning - Whether this cell is in assignment mode
 * @param {boolean} props.targeting - Whether any targeting mode is active
 * @param {Function} props.onClick - Cell click handler
 * @param {Function} props.onDragOver - External drag over handler
 * @param {Function} props.onDragLeave - External drag leave handler
 * @param {Function} props.onDrop - External drop handler
 * @param {Function} props.onClearView - Remove view handler
 * @param {Function} props.onContextMenu - Right-click handler
 * @param {Function} props.onPointerDown - Pointer down for drag initiation
 * @param {Function} props.onAssign - Assignment click (empty cell "+")
 */
export const FocusedCell = memo(forwardRef(function FocusedCell({
  cell,
  view,
  vgColor,
  isSelected,
  isDropTarget,
  isDragSource,
  isDragTarget,
  isTargetingValid,
  isTargetingPulse,
  isAssigning,
  targeting,
  onClick,
  onDragOver,
  onDragLeave,
  onDrop,
  onClearView,
  onContextMenu,
  onPointerDown,
  onAssign,
  animationDelay = 0,
}, ref) {
  const viewType = view?.type ? (VIEW_TYPES[view.type] || null) : null;
  const metaLabel = view?.datasetName || viewType?.name || view?.type || null;

  const className = [
    'minimap__focused-cell',
    view ? 'minimap__focused-cell--filled' : '',
    isDropTarget ? 'minimap__focused-cell--drop' : '',
    isSelected ? 'minimap__focused-cell--selected' : '',
    isDragSource ? 'minimap__focused-cell--drag-source' : '',
    isDragTarget ? 'minimap__focused-cell--drag-target' : '',
    isTargetingValid ? 'minimap__focused-cell--targeting-valid' : '',
    isTargetingPulse ? 'minimap__focused-cell--targeting-pulse' : '',
    isAssigning ? 'minimap__focused-cell--assigning' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={ref}
      className={className}
      style={{
        left: cell.x,
        top: cell.y,
        width: cell.width,
        height: cell.height,
        cursor: (isTargetingValid || isTargetingPulse) ? 'pointer' : undefined,
        animationDelay: animationDelay ? `${animationDelay}ms` : undefined,
      }}
      tabIndex={0}
      role="gridcell"
      aria-label={view ? `Cell: ${view.name || 'View'}` : 'Empty cell'}
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onContextMenu={onContextMenu}
      onPointerDown={onPointerDown}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(e);
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (view && onClearView) {
            e.preventDefault();
            onClearView();
          }
        }
      }}
    >
      {view ? (
        <>
          {viewType && (
            <span className="minimap__focused-cell-icon">
              <Icon name={viewType.icon} size={10} />
            </span>
          )}
          <span className="minimap__focused-cell-name">
            {view.name || 'View'}
          </span>
          {metaLabel && (
            <span className="minimap__focused-cell-meta">
              {metaLabel}
            </span>
          )}
          {!targeting && (
            <Tooltip content="Remove view" placement="top" delay={300}>
              <button
                type="button"
                className="minimap__focused-cell-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearView?.();
                }}
                aria-label="Remove view"
              >
                <Icon name="close" size={10} />
              </button>
            </Tooltip>
          )}
        </>
      ) : (
        <button
          type="button"
          className="minimap__focused-cell-empty"
          onClick={(e) => {
            e.stopPropagation();
            // Let modifier clicks behave like cell selection for merge/split flows.
            if (e.shiftKey || e.metaKey || e.ctrlKey) {
              onClick?.(e);
              return;
            }
            onAssign?.(e);
          }}
        >
          <Icon name="plus" size={12} />
          {targeting ? 'Target' : 'Empty'}
        </button>
      )}
    </div>
  );
}));

export default FocusedCell;
