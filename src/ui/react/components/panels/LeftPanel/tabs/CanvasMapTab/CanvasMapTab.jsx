/**
 * @file CanvasMapTab.jsx
 * @description Canvas Map - Unified navigation and editing control for collaborative immersive analytics
 *
 * Primary Functions:
 * - Navigate the infinite canvas
 * - Manage ViewGroups (create, edit, merge, split, link)
 * - Visualize and follow collaborators
 * - Understand linking relationships between VGs and Views
 *
 * Design Philosophy:
 * - Mode-based UI reduces clutter by showing only relevant controls
 * - Grid-aligned visual metaphor (Excel-style A1, B2 coordinates)
 * - VG vs View display toggle for different mental models
 */

import React, { memo, useMemo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useAdaptive } from '@UI/react/context/AdaptiveContext';
import { useViewGroups } from '@UI/react/hooks/useViewGroups';
import { useWorkspacePresence } from '@UI/react/hooks/useRoomPresence';
import { useBookmarks } from '@UI/react/hooks/useBookmarks';
import { useCanvas } from '@UI/react/hooks/useCanvas';
import { Minimap } from './components/Minimap';
import { ModeToolbar } from './components/ModeToolbar';
import { NavigatePanel, LayoutPanel, LinksPanel, TeamPanel } from './components/panels';
import {
  useCanvasMapTab,
  MAP_MODES,
  MODE_CONFIG,
  getVGDisplayName,
} from './CanvasMapTab.logic';
import './CanvasMapTab.scss';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * CanvasMapTab - Main Canvas Map component
 *
 * @param {Object} props
 * @param {string} props.workspaceId - Workspace ID for loading data
 */
export const CanvasMapTab = memo(function CanvasMapTab({
  workspaceId,
}) {
  const { isVR } = useAdaptive();

  // ---------------------------------------------------------------------------
  // Load real data from hooks
  // ---------------------------------------------------------------------------

  // Canvas data
  const { canvas, viewport } = useCanvas();

  // ViewGroups
  const {
    viewGroups: rawViewGroups,
    visibleViewGroups,
    isLoading: vgLoading,
  } = useViewGroups(workspaceId);

  // Collaborators
  const {
    users: rawCollaborators,
    onlineCount,
  } = useWorkspacePresence(workspaceId);

  // Bookmarks
  const {
    bookmarks: rawBookmarks,
    isLoading: bookmarksLoading,
  } = useBookmarks({ workspaceId, scope: 'all' });

  // ---------------------------------------------------------------------------
  // Transform data to match expected structure
  // ---------------------------------------------------------------------------

  // Transform canvas data
  const canvasData = useMemo(() => ({
    rows: canvas?.dimensions?.rows || 4,
    cols: canvas?.dimensions?.cols || 4,
    homePosition: { row: 0, col: 0 }, // TODO: Get from user preferences
  }), [canvas]);

  // Transform ViewGroups to expected structure
  const viewGroups = useMemo(() => {
    return (visibleViewGroups || []).map(vg => ({
      id: vg.id,
      name: vg.name,
      color: vg.color || '#a855f7',
      isExplicit: !!vg.name,
      layoutId: vg.layout?.type || 'single',
      position: vg.row !== undefined ? {
        row: vg.row,
        col: vg.col,
        rowSpan: vg.rowSpan || 1,
        colSpan: vg.colSpan || 1,
      } : null,
      views: vg.views || [],
      link: vg.link,
    }));
  }, [visibleViewGroups]);

  // Get inactive VGs (no position)
  const inactiveVGs = useMemo(() => {
    return viewGroups.filter(vg => !vg.position);
  }, [viewGroups]);

  // Get active VGs (have position)
  const activeViewGroups = useMemo(() => {
    return viewGroups.filter(vg => vg.position);
  }, [viewGroups]);

  // Transform viewports from canvas viewport
  const viewports = useMemo(() => {
    if (!viewport) return [];
    return [{
      id: 'primary',
      name: 'Main',
      position: { row: viewport.row || 0, col: viewport.col || 0 },
      size: { rows: viewport.rows || 3, cols: viewport.cols || 3 },
      mode: 'snap',
      isPrimary: true,
    }];
  }, [viewport]);

  // Transform collaborators to expected structure
  const collaborators = useMemo(() => {
    return (rawCollaborators || []).map(user => ({
      id: user.id,
      name: user.name || user.email || 'Unknown',
      avatar: user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U',
      color: user.color || '#22c55e',
      viewport: user.position ? {
        row: user.position.row || 0,
        col: user.position.col || 0,
        rows: 2,
        cols: 2,
      } : null,
      isBroadcasting: user.isBroadcasting || false,
      isOnline: true,
    }));
  }, [rawCollaborators]);

  // Extract VG links from ViewGroups
  const vgLinks = useMemo(() => {
    const links = [];
    activeViewGroups.forEach(vg => {
      if (vg.link) {
        links.push({
          id: `vgl-${vg.id}`,
          from: vg.link.originatorGroupId,
          to: vg.link.targetGroupId,
          type: vg.link.properties?.includes('camera') ? 'camera' : 'data',
          mode: vg.link.linkMode || 'bidirectional',
        });
      }
    });
    return links;
  }, [activeViewGroups]);

  // View links (placeholder - would need to load from ViewGroupManager)
  const viewLinks = useMemo(() => [], []);

  // Transform bookmarks
  const bookmarks = useMemo(() => {
    return (rawBookmarks || []).map(bm => ({
      id: bm.id,
      name: bm.name,
      position: bm.cameraState?.position || { row: 0, col: 0 },
      isStarred: bm.isStarred,
      isPinned: bm.isPinned,
    }));
  }, [rawBookmarks]);

  // ---------------------------------------------------------------------------
  // Initialize state and handlers from logic hook
  // ---------------------------------------------------------------------------

  const state = useCanvasMapTab({
    canvas: canvasData,
    viewGroups: activeViewGroups,
    inactiveVGs,
    viewports,
    collaborators,
    vgLinks,
    viewLinks,
    bookmarks,
    callbacks: {},
  });

  // Flatten all views for View Links panel
  const allViews = useMemo(() => {
    return activeViewGroups.flatMap(vg =>
      (vg.views || []).map(v => ({
        ...v,
        vgId: vg.id,
        vgName: vg.name,
        vgColor: vg.color,
      }))
    );
  }, [activeViewGroups]);

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (vgLoading) {
    return (
      <div className="canvas-map" data-vr={isVR}>
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Loading canvas data...
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className={`canvas-map canvas-map--${state.mapMode}`}
      data-vr={isVR}
    >
      {/* Breadcrumb / Back navigation (when focused) */}
      {state.focusedVGId && state.focusedVG && (
        <div
          className="canvas-map__breadcrumb"
          style={{ '--vg-color': state.focusedVG.color }}
        >
          <button
            className="canvas-map__breadcrumb-back"
            onClick={state.handleBackFromFocus}
          >
            <Icon name="chevronLeft" size={14} />
            Canvas
          </button>
          <Icon name="chevronRight" size={14} className="canvas-map__breadcrumb-sep" />
          <div className="canvas-map__breadcrumb-current">
            <div
              className="canvas-map__breadcrumb-dot"
              style={{ background: state.focusedVG.color }}
            />
            <span style={{ color: state.focusedVG.color }}>
              {getVGDisplayName(state.focusedVG)}
            </span>
          </div>
        </div>
      )}

      {/* Mode Tabs */}
      <div className="canvas-map__mode-tabs">
        {Object.values(MODE_CONFIG).map(mode => (
          <button
            key={mode.id}
            className={`canvas-map__mode-tab ${state.mapMode === mode.id ? 'canvas-map__mode-tab--active' : ''}`}
            style={{ '--mode-color': `var(--accent-${mode.color})` }}
            onClick={() => state.handleModeChange(mode.id)}
          >
            <Icon name={mode.icon} size={15} />
            {mode.name}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <ModeToolbar
        mapMode={state.mapMode}
        displayMode={state.displayMode}
        setDisplayMode={state.setDisplayMode}
        minimapZoom={state.minimapZoom}
        showGridLabels={state.showGridLabels}
        showViewports={state.showViewports}
        showCollaborators={state.showCollaborators}
        showBookmarks={state.showBookmarks}
        showInternals={state.showInternals}
        linksSubTab={state.linksSubTab}
        setLinksSubTab={state.setLinksSubTab}
        collaborateSubTab={state.collaborateSubTab}
        setCollaborateSubTab={state.setCollaborateSubTab}
        onlineCollaboratorsCount={state.onlineCollaboratorsCount}
        onZoomIn={state.handleZoomIn}
        onZoomOut={state.handleZoomOut}
        onZoomReset={state.handleZoomReset}
        toggleShowGridLabels={state.toggleShowGridLabels}
        toggleShowViewports={state.toggleShowViewports}
        toggleShowCollaborators={state.toggleShowCollaborators}
        toggleShowBookmarks={state.toggleShowBookmarks}
        toggleShowInternals={state.toggleShowInternals}
      />

      {/* Minimap */}
      <div className="canvas-map__minimap-container">
        <Minimap
          canvas={canvasData}
          viewGroups={activeViewGroups}
          viewports={viewports}
          collaborators={collaborators}
          vgLinks={vgLinks}
          bookmarks={bookmarks}
          flattenedViews={state.flattenedViews}
          displayMode={state.displayMode}
          mapMode={state.mapMode}
          minimapCellSize={state.minimapCellSize}
          showGridLabels={state.showGridLabels}
          showInternals={state.showInternals}
          showViewports={state.showViewports}
          showCollaborators={state.showCollaborators}
          showBookmarks={state.showBookmarks}
          selectedVGId={state.selectedVGId}
          selectedViewportId={state.selectedViewportId}
          highlightedLinkId={state.highlightedLinkId}
          onVGClick={state.handleVGClick}
          onVGDoubleClick={state.handleVGDoubleClick}
          onLinkClick={state.handleLinkClick}
          getVGCenter={state.getVGCenter}
          getVGDisplayName={getVGDisplayName}
        />
      </div>

      {/* Contextual Panel */}
      <div className="canvas-map__panel">
        {state.mapMode === MAP_MODES.NAVIGATE && !state.focusedVGId && (
          <NavigatePanel
            bookmarks={bookmarks}
            filteredBookmarks={state.filteredBookmarks}
            searchQuery={state.searchQuery}
            setSearchQuery={state.setSearchQuery}
          />
        )}

        {state.mapMode === MAP_MODES.LAYOUT && (
          <LayoutPanel
            viewGroups={activeViewGroups}
            filteredVGs={state.filteredVGs}
            inactiveVGs={inactiveVGs}
            selectedVGId={state.selectedVGId}
            focusedVG={state.focusedVG}
            searchQuery={state.searchQuery}
            setSearchQuery={state.setSearchQuery}
            onVGClick={state.handleVGClick}
            onVGDoubleClick={state.handleVGDoubleClick}
          />
        )}

        {state.mapMode === MAP_MODES.LINKS && (
          <LinksPanel
            linksSubTab={state.linksSubTab}
            vgLinks={vgLinks}
            viewLinks={viewLinks}
            viewGroups={activeViewGroups}
            allViews={allViews}
            highlightedLinkId={state.highlightedLinkId}
            onLinkClick={state.handleLinkClick}
          />
        )}

        {state.mapMode === MAP_MODES.COLLABORATE && (
          <TeamPanel
            collaborateSubTab={state.collaborateSubTab}
            viewports={viewports}
            selectedViewportId={state.selectedViewportId}
            collaborators={collaborators}
            searchQuery={state.searchQuery}
            setSearchQuery={state.setSearchQuery}
            onViewportClick={state.handleViewportClick}
          />
        )}
      </div>
    </div>
  );
});

export default CanvasMapTab;
