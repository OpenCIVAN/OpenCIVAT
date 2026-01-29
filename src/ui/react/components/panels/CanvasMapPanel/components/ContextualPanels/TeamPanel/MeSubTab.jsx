/**
 * @file MeSubTab.jsx
 * @description "Me" sub-tab for TeamPanel - shows user's viewports and status
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Button } from '@UI/react/components/atoms/Button';
import { Badge } from '@UI/react/components/atoms/Badge';
import { Section } from '@UI/react/components/molecules/Section';
import { ViewportItem } from '../../shared';

/**
 * MeSubTab - User's viewports and broadcasting status
 */
export const MeSubTab = memo(function MeSubTab({
  viewports = [],
  selectedViewportId,
  isBroadcasting,
  followingUser,
  onViewportClick,
  onAddViewport,
  onDeleteViewport,
  onSetPrimaryViewport,
  onStartBroadcast,
  onStopBroadcast,
  onStopFollowing,
  sizeMode = 'standard',
}) {
  const isCompact = sizeMode === 'compact';

  return (
    <div className="team-subtab">
      {/* My Viewports */}
      <Section
        title="My Viewports"
        icon="frame"
        actions={
          <>
            <Badge count={viewports.length} size="sm" />
            <button className="contextual-panel__icon-btn" onClick={onAddViewport} title="New viewport">
              <Icon name="plus" size={14} />
            </button>
          </>
        }
        collapsible={false}
      >
        <div className="contextual-panel__list">
          {viewports.map(vp => (
            <ViewportItem
              key={vp.id}
              viewport={vp}
              isSelected={selectedViewportId === vp.id}
              onClick={onViewportClick}
              onDelete={onDeleteViewport}
              onSetPrimary={onSetPrimaryViewport}
            />
          ))}
        </div>
      </Section>

      {/* My Status */}
      <Section title="My Status" icon="user" collapsible={false}>
        <div className="team-subtab__status">
          {/* Broadcasting */}
          <div className="team-subtab__status-row">
            <span className="team-subtab__status-label">
              <Icon name="radio" size={12} />
              Broadcasting
            </span>
            {isBroadcasting ? (
              <Button
                variant="danger"
                size="sm"
                icon="radioOff"
                onClick={onStopBroadcast}
              >
                {!isCompact && 'Stop'}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                icon="radio"
                onClick={onStartBroadcast}
              >
                {!isCompact && 'Start Broadcasting'}
              </Button>
            )}
          </div>

          {/* Following */}
          <div className="team-subtab__status-row">
            <span className="team-subtab__status-label">
              <Icon name="eye" size={12} />
              Following
            </span>
            {followingUser ? (
              <div className="team-subtab__following">
                <span
                  className="team-subtab__following-user"
                  style={{ '--user-color': followingUser.color }}
                >
                  {followingUser.name}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  icon="x"
                  onClick={onStopFollowing}
                >
                  {!isCompact && 'Stop'}
                </Button>
              </div>
            ) : (
              <span className="team-subtab__status-value">Nobody</span>
            )}
          </div>
        </div>
      </Section>

      {/* Cursor Visibility */}
      <Section title="Visibility" icon="eye" collapsible={false}>
        <p className="contextual-panel__hint">
          Your cursor is visible to team members when you're in their viewport area.
        </p>
      </Section>
    </div>
  );
});

export default MeSubTab;
