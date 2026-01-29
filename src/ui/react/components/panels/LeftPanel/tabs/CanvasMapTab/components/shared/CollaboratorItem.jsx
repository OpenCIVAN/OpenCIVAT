/**
 * @file CollaboratorItem.jsx
 * @description Collaborator list item for team presence
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { formatCellRef } from '../../CanvasMapTab.logic';
import './CollaboratorItem.scss';

/**
 * CollaboratorItem - Team member list item
 *
 * @param {Object} props
 * @param {Object} props.collaborator - Collaborator data
 * @param {boolean} [props.showLocation=true] - Whether to show location info
 * @param {Function} [props.onFollow] - Follow button handler
 */
export const CollaboratorItem = memo(function CollaboratorItem({
  collaborator,
  showLocation = true,
  onFollow,
}) {
  const { name, avatar, color, viewport, isBroadcasting, isOnline } = collaborator;

  const locationText = viewport
    ? formatCellRef(viewport.row, viewport.col)
    : 'Not on canvas';

  return (
    <div
      className={`collaborator-item ${!isOnline ? 'collaborator-item--offline' : ''}`}
      style={{ '--collab-color': color }}
    >
      {/* Avatar */}
      <div className="collaborator-item__avatar">
        <span>{avatar}</span>
        {isOnline && (
          <span className="collaborator-item__status" />
        )}
      </div>

      {/* Info */}
      <div className="collaborator-item__info">
        <div className="collaborator-item__name">
          {name}
          {isBroadcasting && (
            <Icon
              name="radio"
              size={12}
              className="collaborator-item__broadcast-icon"
            />
          )}
        </div>
        {showLocation && (
          <div className="collaborator-item__location">
            {isOnline ? (viewport ? `at ${locationText}` : 'Online') : 'Offline'}
          </div>
        )}
      </div>

      {/* Follow button */}
      {onFollow && isOnline && viewport && (
        <button
          className="collaborator-item__follow"
          onClick={() => onFollow(collaborator.id)}
          title={`Follow ${name}`}
        >
          <Icon name="userPlus" size={12} />
          Follow
        </button>
      )}
    </div>
  );
});

export default CollaboratorItem;
