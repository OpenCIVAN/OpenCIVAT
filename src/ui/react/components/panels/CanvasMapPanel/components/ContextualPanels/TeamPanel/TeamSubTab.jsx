/**
 * @file TeamSubTab.jsx
 * @description "Team" sub-tab for TeamPanel - shows collaborators
 */

import React, { memo, useState, useCallback, useMemo } from 'react';
import { Badge } from '@UI/react/components/atoms/Badge';
import { Section } from '@UI/react/components/molecules/Section';
import { SearchInput } from '@UI/react/components/molecules/SearchInput';
import { ChipGroup } from '@UI/react/components/molecules/ChipGroup';
import { CollaboratorItem } from '../../shared';

/**
 * TeamSubTab - Team collaborators list
 */
export const TeamSubTab = memo(function TeamSubTab({
  collaborators = [],
  searchQuery,
  setSearchQuery,
  onFollow,
  onLocate,
  sizeMode = 'standard',
}) {
  // Filter state
  const [activeFilter, setActiveFilter] = useState('online');

  const handleFilterToggle = useCallback((filterId) => {
    setActiveFilter(filterId);
  }, []);

  // Derived collaborator lists
  const onlineCollaborators = useMemo(() =>
    collaborators.filter(c => c.isOnline),
    [collaborators]
  );

  const offlineCollaborators = useMemo(() =>
    collaborators.filter(c => !c.isOnline),
    [collaborators]
  );

  const broadcastingCollaborators = useMemo(() =>
    onlineCollaborators.filter(c => c.isBroadcasting),
    [onlineCollaborators]
  );

  const onlineNotBroadcasting = useMemo(() =>
    onlineCollaborators.filter(c => !c.isBroadcasting),
    [onlineCollaborators]
  );

  // Filter by search query
  const filteredCollaborators = useMemo(() => {
    let list = collaborators;

    // Apply status filter
    if (activeFilter === 'online') {
      list = onlineCollaborators;
    } else if (activeFilter === 'live') {
      list = broadcastingCollaborators;
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(query));
    }

    return list;
  }, [collaborators, onlineCollaborators, broadcastingCollaborators, activeFilter, searchQuery]);

  return (
    <div className="team-subtab">
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
      {activeFilter !== 'online' && broadcastingCollaborators.length > 0 && (
        <Section
          title="Broadcasting"
          icon="radio"
          actions={<Badge count={broadcastingCollaborators.length} size="sm" color="danger" />}
          collapsible={false}
        >
          <div className="contextual-panel__list">
            {broadcastingCollaborators
              .filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(collab => (
                <CollaboratorItem
                  key={collab.id}
                  collaborator={collab}
                  onFollow={onFollow}
                  onLocate={onLocate}
                />
              ))}
          </div>
        </Section>
      )}

      {/* Online (not broadcasting) */}
      {(activeFilter === 'online' || activeFilter === 'all') && onlineNotBroadcasting.length > 0 && (
        <Section
          title="Online"
          icon="users"
          actions={<Badge count={onlineNotBroadcasting.length} size="sm" color="success" />}
          collapsible={false}
        >
          <div className="contextual-panel__list">
            {(activeFilter === 'online' ? filteredCollaborators.filter(c => !c.isBroadcasting) : onlineNotBroadcasting)
              .filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(collab => (
                <CollaboratorItem
                  key={collab.id}
                  collaborator={collab}
                  onFollow={onFollow}
                  onLocate={onLocate}
                />
              ))}
          </div>
        </Section>
      )}

      {/* Live section for filtered view */}
      {activeFilter === 'online' && broadcastingCollaborators.length > 0 && (
        <Section
          title="Broadcasting"
          icon="radio"
          actions={<Badge count={broadcastingCollaborators.length} size="sm" color="danger" />}
          collapsible={false}
        >
          <div className="contextual-panel__list">
            {broadcastingCollaborators
              .filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(collab => (
                <CollaboratorItem
                  key={collab.id}
                  collaborator={collab}
                  onFollow={onFollow}
                  onLocate={onLocate}
                />
              ))}
          </div>
        </Section>
      )}

      {/* Offline */}
      {activeFilter === 'all' && offlineCollaborators.length > 0 && (
        <Section
          title="Offline"
          icon="userMinus"
          actions={<Badge count={offlineCollaborators.length} size="sm" />}
          collapsible={false}
        >
          <div className="contextual-panel__list">
            {offlineCollaborators
              .filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(collab => (
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

export default TeamSubTab;
