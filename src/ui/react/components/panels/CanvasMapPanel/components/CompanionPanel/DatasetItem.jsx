/**
 * @file DatasetItem.jsx
 * @description Dataset list item for companion panel
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

/**
 * Dataset type icons
 */
const DATASET_TYPE_ICONS = {
  dicom: 'activity',
  volume: 'box',
  mesh: 'cube',
  csv: 'fileSpreadsheet',
  json: 'fileJson',
  image: 'image',
  default: 'database',
};

/**
 * DatasetItem - Dataset in companion panel
 *
 * @param {Object} props
 * @param {Object} props.dataset - Dataset data
 * @param {boolean} props.isExpanded - Whether children are expanded
 * @param {Function} props.onToggle - Toggle expand handler
 * @param {Function} props.onClick - Click handler
 * @param {Function} [props.onDragStart] - Drag start handler
 */
export const DatasetItem = memo(function DatasetItem({
  dataset,
  isExpanded,
  onToggle,
  onClick,
  onDragStart,
}) {
  const icon = DATASET_TYPE_ICONS[dataset.type] || DATASET_TYPE_ICONS.default;
  const hasChildren = dataset.children && dataset.children.length > 0;

  return (
    <div className="dataset-item">
      <div
        className="dataset-item__header"
        onClick={() => onClick?.(dataset)}
        draggable={!!onDragStart}
        onDragStart={onDragStart ? (e) => onDragStart(e, dataset) : undefined}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.(dataset);
          }
        }}
      >
        {hasChildren && (
          <button
            className="dataset-item__toggle"
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.(dataset.id);
            }}
          >
            <Icon name={isExpanded ? 'chevronDown' : 'chevronRight'} size={12} />
          </button>
        )}

        <Icon name={icon} size={14} className="dataset-item__icon" />

        <span className="dataset-item__name">{dataset.name}</span>

        {dataset.size && (
          <span className="dataset-item__size">{dataset.size}</span>
        )}
      </div>

      {/* Children (if expanded) */}
      {hasChildren && isExpanded && (
        <div className="dataset-item__children">
          {dataset.children.map(child => (
            <DatasetItem
              key={child.id}
              dataset={child}
              isExpanded={false}
              onClick={onClick}
              onDragStart={onDragStart}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default DatasetItem;
