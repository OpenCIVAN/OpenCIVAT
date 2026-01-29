/**
 * @file MapToolbar.jsx
 * @description Mode-specific toolbar for Canvas Map Panel
 *
 * Shows different controls based on current mode:
 * - Navigate: Zoom, grid labels, display mode, viewports, collaborators, bookmarks
 * - Layout: Zoom, grid labels, display mode, internals, snap, add/merge/split
 * - Links: Zoom, VG/View sub-tabs, create/break link
 * - Collaborate: Zoom, Me/Team sub-tabs, cursors toggle
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { ToggleGroup } from '@UI/react/components/molecules/ToggleGroup';
import { useAdaptive } from '@UI/react/context/AdaptiveContext';
import {
  MAP_MODES,
  DISPLAY_MODES,
  LINKS_SUB_TABS,
  COLLABORATE_SUB_TABS,
} from '../../utils/constants';
import './MapToolbar.scss';

/**
 * Small toolbar button
 */
const ToolbarBtn = memo(function ToolbarBtn({
  icon,
  onClick,
  active,
  activeColor,
  disabled,
  title,
  size = 14,
}) {
  const { isVR } = useAdaptive();

  return (
    <button
      className={`map-toolbar__btn ${active ? 'map-toolbar__btn--active' : ''}`}
      style={active && activeColor ? { '--active-color': activeColor } : undefined}
      onClick={onClick}
      disabled={disabled}
      title={title}
      type="button"
      data-vr={isVR}
    >
      <Icon name={icon} size={isVR ? size + 4 : size} />
    </button>
  );
});

/**
 * Toolbar separator
 */
const Separator = memo(function Separator() {
  return <div className="map-toolbar__separator" />;
});

/**
 * MapToolbar - Mode-specific controls
 */
export const MapToolbar = memo(function MapToolbar({
  mapMode,
  displayMode,
  setDisplayMode,
  minimapZoom,
  showGridLabels,
  showViewports,
  showCollaborators,
  showBookmarks,
  showInternals,
  showCursors,
  linksSubTab,
  setLinksSubTab,
  collaborateSubTab,
  setCollaborateSubTab,
  onlineCollaboratorsCount,

  // Handlers
  onZoomIn,
  onZoomOut,
  onZoomReset,
  toggleShowGridLabels,
  toggleShowViewports,
  toggleShowCollaborators,
  toggleShowBookmarks,
  toggleShowInternals,
  toggleShowCursors,

  // Action handlers
  onAddVG,
  onMergeVG,
  onSplitVG,
  onCreateLink,
  onBreakLink,

  sizeMode = 'standard',
}) {
  const isCompact = sizeMode === 'compact';

  return (
    <div className="map-toolbar" data-size-mode={sizeMode}>
      {/* Zoom controls - always visible */}
      <ToolbarBtn icon="zoomOut" onClick={onZoomOut} title="Zoom out" />
      <span className="map-toolbar__zoom-value">{minimapZoom}%</span>
      <ToolbarBtn icon="zoomIn" onClick={onZoomIn} title="Zoom in" />
      <ToolbarBtn icon="maximize2" onClick={onZoomReset} title="Reset zoom" />

      <Separator />

      {/* Grid labels toggle - always visible */}
      <ToolbarBtn
        icon="hash"
        active={showGridLabels}
        onClick={toggleShowGridLabels}
        title="Grid labels (A1, B2...)"
        activeColor="var(--accent-purple)"
      />

      {/* VG vs View display mode toggle */}
      {!isCompact && (
        <ToggleGroup
          options={[
            { value: DISPLAY_MODES.VG, label: 'VG', icon: 'package' },
            { value: DISPLAY_MODES.VIEW, label: 'View', icon: 'layers' },
          ]}
          value={displayMode}
          onChange={setDisplayMode}
          variant="segmented"
          size="sm"
        />
      )}

      <Separator />

      {/* Mode-specific controls */}
      {(mapMode === MAP_MODES.NAVIGATE || mapMode === MAP_MODES.LAYOUT) && (
        <ToolbarBtn
          icon="frame"
          active={showViewports}
          onClick={toggleShowViewports}
          title="Viewports"
          activeColor="var(--accent-cyan)"
        />
      )}

      {mapMode === MAP_MODES.NAVIGATE && (
        <>
          <ToolbarBtn
            icon="users"
            active={showCollaborators}
            onClick={toggleShowCollaborators}
            title="Collaborators"
            activeColor="var(--accent-green)"
          />
          <ToolbarBtn
            icon="bookmark"
            active={showBookmarks}
            onClick={toggleShowBookmarks}
            title="Bookmarks"
            activeColor="var(--accent-amber)"
          />
        </>
      )}

      {mapMode === MAP_MODES.LAYOUT && (
        <>
          <ToolbarBtn
            icon="grid3x3"
            active={showInternals}
            onClick={toggleShowInternals}
            title="Internal layouts"
            activeColor="var(--accent-green)"
          />
          {!isCompact && (
            <>
              <Separator />
              <ToolbarBtn icon="plus" onClick={onAddVG} title="Add VG" />
              <ToolbarBtn icon="combine" onClick={onMergeVG} title="Merge VGs" />
              <ToolbarBtn icon="split" onClick={onSplitVG} title="Split VG" />
            </>
          )}
        </>
      )}

      {mapMode === MAP_MODES.LINKS && (
        <>
          <ToggleGroup
            options={[
              { value: LINKS_SUB_TABS.VG, label: 'VG' },
              { value: LINKS_SUB_TABS.VIEW, label: 'View' },
            ]}
            value={linksSubTab}
            onChange={setLinksSubTab}
            variant="segmented"
            size="sm"
          />
          {!isCompact && (
            <>
              <Separator />
              <ToolbarBtn icon="link2" onClick={onCreateLink} title="Create link" />
              <ToolbarBtn icon="unlink2" onClick={onBreakLink} title="Break link" />
            </>
          )}
        </>
      )}

      {mapMode === MAP_MODES.COLLABORATE && (
        <>
          <ToggleGroup
            options={[
              { value: COLLABORATE_SUB_TABS.ME, label: 'Me' },
              { value: COLLABORATE_SUB_TABS.TEAM, label: `Team (${onlineCollaboratorsCount})` },
            ]}
            value={collaborateSubTab}
            onChange={setCollaborateSubTab}
            variant="segmented"
            size="sm"
          />
          <Separator />
          <ToolbarBtn
            icon="mousePointer"
            active={showCursors}
            onClick={toggleShowCursors}
            title="Show cursors"
            activeColor="var(--accent-amber)"
          />
          <ToolbarBtn
            icon="radio"
            title="Show broadcasts only"
            activeColor="var(--accent-red)"
          />
        </>
      )}
    </div>
  );
});

export default MapToolbar;
