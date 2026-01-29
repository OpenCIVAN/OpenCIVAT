/**
 * @file ViewportItem.jsx
 * @description Viewport list item for user viewports
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { formatRangeRef } from '../../CanvasMapTab.logic';
import './ViewportItem.scss';

/**
 * ViewportItem - User viewport list item
 *
 * @param {Object} props
 * @param {Object} props.viewport - Viewport data
 * @param {boolean} props.isSelected - Whether this viewport is selected
 * @param {Function} props.onClick - Click handler
 */
export const ViewportItem = memo(function ViewportItem({
  viewport,
  isSelected,
  onClick,
}) {
  const { name, position, size, isPrimary, syncMode } = viewport;

  return (
    <div
      className={`viewport-item ${isSelected ? 'viewport-item--selected' : ''}`}
      onClick={() => onClick?.(viewport.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(viewport.id);
        }
      }}
    >
      {/* Primary indicator */}
      {isPrimary && (
        <Icon name="star" size={12} className="viewport-item__primary" />
      )}

      {/* Name */}
      <span className="viewport-item__name">{name}</span>

      {/* Sync mode indicator */}
      {syncMode && (
        <span className={`viewport-item__sync viewport-item__sync--${syncMode}`}>
          {syncMode === 'broadcast' && <Icon name="radio" size={10} />}
          {syncMode === 'follow' && <Icon name="eye" size={10} />}
          {syncMode === 'bidirectional' && <Icon name="refreshCw" size={10} />}
        </span>
      )}

      {/* Position */}
      <span className="viewport-item__position">
        {formatRangeRef(position.row, position.col, size.rows, size.cols)}
      </span>
    </div>
  );
});

export default ViewportItem;
