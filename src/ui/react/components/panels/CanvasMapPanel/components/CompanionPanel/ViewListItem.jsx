/**
 * @file ViewListItem.jsx
 * @description View list item for companion panel
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { VIEW_TYPES } from '../../utils/constants';

/**
 * ViewListItem - Individual view in companion panel
 *
 * @param {Object} props
 * @param {Object} props.view - View data
 * @param {string} [props.vgName] - Parent VG name
 * @param {string} [props.vgColor] - Parent VG color
 * @param {boolean} props.isSelected - Whether view is selected
 * @param {Function} props.onClick - Click handler
 * @param {Function} [props.onDragStart] - Drag start handler
 */
export const ViewListItem = memo(function ViewListItem({
  view,
  vgName,
  vgColor,
  isSelected,
  onClick,
  onDragStart,
}) {
  const viewType = VIEW_TYPES[view.type] || VIEW_TYPES.data;

  return (
    <div
      className={`view-list-item ${isSelected ? 'view-list-item--selected' : ''}`}
      style={{ '--view-color': vgColor || `var(--accent-${viewType.color})` }}
      onClick={() => onClick?.(view)}
      draggable={!!onDragStart}
      onDragStart={onDragStart ? (e) => onDragStart(e, view) : undefined}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(view);
        }
      }}
    >
      <Icon name={viewType.icon} size={14} className="view-list-item__icon" />

      <div className="view-list-item__info">
        <span className="view-list-item__name">{view.name}</span>
        {vgName && (
          <span className="view-list-item__vg">{vgName}</span>
        )}
      </div>

      <span className="view-list-item__type">{viewType.name}</span>
    </div>
  );
});

export default ViewListItem;
