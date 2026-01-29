/**
 * @file TeamPanel.jsx
 * @description Team/Collaborate mode panel content
 *
 * Shows:
 * - Me tab: My viewports, broadcasting state, who I'm following
 * - Team tab: Online/offline collaborators, broadcasting users
 */

import React, { memo, useState, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Button } from '@UI/react/components/atoms/Button';
import { Badge } from '@UI/react/components/atoms/Badge';
import { Section } from '@UI/react/components/molecules/Section';
import { SearchInput } from '@UI/react/components/molecules/SearchInput';
import { ChipGroup } from '@UI/react/components/molecules/ChipGroup';
import { ViewportItem, CollaboratorItem } from '../shared';
import { COLLABORATE_SUB_TABS } from '../../CanvasMapTab.logic';
import './panels.scss';

/**
 * TeamPanel - Team/Collaborate mode content
 */
export const TeamPanel = memo(function TeamPanel({
  collaborateSubTab,
  viewports,
  selectedViewportId,
  collaborators,
  searchQuery,
  setSearchQuery,
  onViewportClick,
  onAddViewport,
  onFollow,
  onStartBroadcast,
  onStopBroadcast,
}) {
  // Filter state for ChipGroup
  const [activeFilter, setActiveFilter] = useState('online');

  const handleFilterToggle = useCallback((filterId) => {
    setActiveFilter(filterId);
  }, []);

  // Derived collaborator lists
  const onlineCollaborators = collaborators.filter(c => c.isOnline);
  const offlineCollaborators = collaborators.filter(c => !c.isOnline);
  const broadcastingCollaborators = onlineCollaborators.filter(c => c.isBroadcasting);
  const onlineNotBroadcasting = onlineCollaborators.filter(c => !c.isBroadcasting);

  // ME sub-tab
  if (collaborateSubTab === COLLABORATE_SUB_TABS.ME) {
    return (
      <div className="canvas-map-panel">
        {/* My Viewports */}
        <Section
          title="My Viewports"
          icon="frame"
          actions={
            <>
              <Badge count={viewports.length} size="sm" />
              <button className="canvas-map-panel__icon-btn" onClick={onAddViewport} title="New viewport">
                <Icon name="plus" size={14} />
              </button>
            </>
          }
          collapsible={false}
        >
          <div className="canvas-map-panel__list">
            {viewports.map(vp => (
              <ViewportItem
                key={vp.id}
                viewport={vp}
                isSelected={selectedViewportId === vp.id}
                onClick={onViewportClick}
              />
            ))}
          </div>
        </Section>

        {/* My Status */}
        <Section title="My Status" icon="user" collapsible={false}>
          <div className="canvas-map-panel__status">
            <div className="canvas-map-panel__status-row">
              <span className="canvas-map-panel__status-label">Broadcasting</span>
              <Button
                variant="ghost"
                size="sm"
                icon="radio"
                onClick={onStartBroadcast}
              >
                Start Broadcasting
              </Button>
            </div>
            <div className="canvas-map-panel__status-row">
              <span className="canvas-map-panel__status-label">Following</span>
              <span className="canvas-map-panel__status-value">Nobody</span>
            </div>
          </div>
        </Section>
      </div>
    );
  }

  // TEAM sub-tab
  return (
    <div className="canvas-map-panel">
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search team members..."
        size="sm"
      />
      <ChipGroup
        chips={[
          { id: 'online', label: 'Online', count: onlineCollaborators.length },
          { id: 'all', label: 'All', count: collaborators.length },
          { id: 'live', label: 'Live', count: broadcastingCollaborators.length },
        ]}
        activeChips={[activeFilter]}
        onToggle={handleFilterToggle}
        size="sm"
        allowEmpty={false}
      />

      {/* Broadcasting */}
      {broadcastingCollaborators.length > 0 && (
        <Section
          title="Broadcasting"
          icon="radio"
          actions={<Badge count={broadcastingCollaborators.length} size="sm" color="danger" />}
          collapsible={false}
        >
          <div className="canvas-map-panel__list">
            {broadcastingCollaborators.map(collab => (
              <CollaboratorItem
                key={collab.id}
                collaborator={collab}
                onFollow={onFollow}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Online */}
      {onlineNotBroadcasting.length > 0 && (
        <Section
          title="Online"
          icon="users"
          actions={<Badge count={onlineNotBroadcasting.length} size="sm" color="success" />}
          collapsible={false}
        >
          <div className="canvas-map-panel__list">
            {onlineNotBroadcasting.map(collab => (
              <CollaboratorItem
                key={collab.id}
                collaborator={collab}
                onFollow={onFollow}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Offline */}
      {offlineCollaborators.length > 0 && (
        <Section
          title="Offline"
          icon="userMinus"
          actions={<Badge count={offlineCollaborators.length} size="sm" />}
          collapsible={false}
        >
          <div className="canvas-map-panel__list">
            {offlineCollaborators.map(collab => (
              <CollaboratorItem
                key={collab.id}
                collaborator={collab}
                showLocation={false}
              />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
});

export default TeamPanel;
