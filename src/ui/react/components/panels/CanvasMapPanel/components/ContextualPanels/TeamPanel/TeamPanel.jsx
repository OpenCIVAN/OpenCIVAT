/**
 * @file TeamPanel.jsx
 * @description Team/Collaborate mode panel for Canvas Map V2
 *
 * Contains:
 * - MeSubTab: User's viewports and status
 * - TeamSubTab: Team collaborators list
 */

import React, { memo } from 'react';
import { MeSubTab } from './MeSubTab';
import { TeamSubTab } from './TeamSubTab';
import { COLLABORATE_SUB_TABS } from '../../../utils/constants';

/**
 * TeamPanel - Team/Collaborate mode content
 */
export const TeamPanel = memo(function TeamPanel({
  collaborateSubTab,
  viewports = [],
  selectedViewportId,
  collaborators = [],
  searchQuery,
  setSearchQuery,

  // My status
  isBroadcasting,
  followingUser,

  // Viewport handlers
  onViewportClick,
  onAddViewport,
  onDeleteViewport,
  onSetPrimaryViewport,

  // Broadcast handlers
  onStartBroadcast,
  onStopBroadcast,
  onStopFollowing,

  // Team handlers
  onFollow,
  onLocate,

  sizeMode = 'standard',
}) {
  if (collaborateSubTab === COLLABORATE_SUB_TABS.ME) {
    return (
      <MeSubTab
        viewports={viewports}
        selectedViewportId={selectedViewportId}
        isBroadcasting={isBroadcasting}
        followingUser={followingUser}
        onViewportClick={onViewportClick}
        onAddViewport={onAddViewport}
        onDeleteViewport={onDeleteViewport}
        onSetPrimaryViewport={onSetPrimaryViewport}
        onStartBroadcast={onStartBroadcast}
        onStopBroadcast={onStopBroadcast}
        onStopFollowing={onStopFollowing}
        sizeMode={sizeMode}
      />
    );
  }

  return (
    <TeamSubTab
      collaborators={collaborators}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      onFollow={onFollow}
      onLocate={onLocate}
      sizeMode={sizeMode}
    />
  );
});

export default TeamPanel;
