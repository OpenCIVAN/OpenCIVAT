/**
 * @file CollaboratorIndicator.jsx
 * @description Collaborator viewport overlay on minimap
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import './CollaboratorIndicator.scss';

/**
 * CollaboratorIndicator - Collaborator viewport on minimap
 *
 * @param {Object} props
 * @param {Object} props.collaborator - Collaborator data
 * @param {number} props.cellSize - Size of each cell in pixels
 * @param {boolean} props.showName - Whether to show collaborator name
 */
export const CollaboratorIndicator = memo(function CollaboratorIndicator({
  collaborator,
  cellSize,
  showName,
}) {
  const { name, avatar, color, viewport, isBroadcasting } = collaborator;
  if (!viewport) return null;

  const gap = 4;

  return (
    <div
      className={`collaborator-indicator ${isBroadcasting ? 'collaborator-indicator--broadcasting' : ''}`}
      style={{
        gridRow: `${viewport.row + 1} / span ${viewport.rows}`,
        gridColumn: `${viewport.col + 1} / span ${viewport.cols}`,
        '--collab-color': color,
      }}
      title={`${name}${isBroadcasting ? ' (Broadcasting)' : ''}`}
    >
      {/* Avatar badge */}
      <div className="collaborator-indicator__avatar">
        <span>{avatar}</span>
        {isBroadcasting && (
          <Icon name="radio" size={8} className="collaborator-indicator__broadcast" />
        )}
      </div>

      {/* Name label */}
      {showName && (
        <span className="collaborator-indicator__name">{name.split(' ')[0]}</span>
      )}
    </div>
  );
});

export default CollaboratorIndicator;
