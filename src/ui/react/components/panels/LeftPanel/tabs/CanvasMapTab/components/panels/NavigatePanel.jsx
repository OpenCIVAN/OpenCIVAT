/**
 * @file NavigatePanel.jsx
 * @description Navigate mode panel content
 *
 * Shows:
 * - Quick Navigation actions (Go Home, Set Home, Fit All, Add Bookmark)
 * - Bookmarks list with search
 */

import React, { memo } from 'react';
import { Button } from '@UI/react/components/atoms/Button';
import { Badge } from '@UI/react/components/atoms/Badge';
import { Section } from '@UI/react/components/molecules/Section';
import { SearchInput } from '@UI/react/components/molecules/SearchInput';
import { EmptyState } from '@UI/react/components/molecules/EmptyState';
import { BookmarkItem } from '../shared';
import './panels.scss';

/**
 * NavigatePanel - Navigate mode content
 */
export const NavigatePanel = memo(function NavigatePanel({
  bookmarks,
  filteredBookmarks,
  searchQuery,
  setSearchQuery,
  onGoHome,
  onSetHome,
  onFitAll,
  onAddBookmark,
  onBookmarkClick,
  onBookmarkDelete,
}) {
  return (
    <div className="canvas-map-panel">
      {/* Quick Navigation */}
      <Section title="Quick Navigation" icon="navigation" collapsible={false}>
        <div className="canvas-map-panel__actions">
          <Button variant="ghost" size="sm" icon="home" onClick={onGoHome}>Go Home</Button>
          <Button variant="ghost" size="sm" icon="crosshair" onClick={onSetHome}>Set Home</Button>
          <Button variant="ghost" size="sm" icon="scan" onClick={onFitAll}>Fit All</Button>
          <Button variant="ghost" size="sm" icon="bookmarkPlus" onClick={onAddBookmark}>Add Bookmark</Button>
        </div>
      </Section>

      {/* Bookmarks */}
      <Section
        title="Bookmarks"
        icon="bookmark"
        actions={<Badge count={bookmarks.length} size="sm" />}
        collapsible={false}
      >
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search bookmarks..."
          size="sm"
        />
        <div className="canvas-map-panel__list">
          {filteredBookmarks.map(bm => (
            <BookmarkItem
              key={bm.id}
              bookmark={bm}
              onClick={onBookmarkClick}
              onDelete={onBookmarkDelete}
            />
          ))}
          {filteredBookmarks.length === 0 && (
            <EmptyState
              icon={searchQuery ? 'search' : 'bookmark'}
              title={searchQuery ? 'No bookmarks match your search' : 'No bookmarks yet'}
              size="sm"
            />
          )}
        </div>
      </Section>
    </div>
  );
});

export default NavigatePanel;
