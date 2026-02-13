/**
 * @file CanvasMapPanel.jsx
 * @description Canvas Map Panel - Floating panel for unified navigation and editing control
 *
 * Uses PanelShell architecture (floating-first) rather than docked LeftPanel tabs.
 *
 * Primary Functions:
 * - Navigate the infinite canvas
 * - Manage ViewGroups (create, edit, merge, split, link)
 * - Visualize and follow collaborators
 * - Understand linking relationships between VGs and Views
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import { PanelShell, CHROME_LEVELS, usePanelShell } from '@UI/react/components/panels/PanelShell';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Tooltip } from '@UI/react/components/atoms/Tooltip';
import { COMPANION_PANEL_ID } from '@UI/react/components/panels/CompanionPanel';
import { useCanvasMap } from '@UI/react/context/CanvasMapContext';
import { WorkspaceSelector } from '@UI/react/components/molecules/WorkspaceSelector/WorkspaceSelector';
import { CanvasMapContent } from './CanvasMapContent';

// Panel ID constant for external access
export const CANVAS_MAP_PANEL_ID = 'canvas-map';

// Breakpoints for responsive sizing
const CANVAS_MAP_BREAKPOINTS = {
  minWidth: 380,
  compactWidth: 380,
  standardWidth: 420,
  expandedWidth: 500,
};

/**
 * CanvasMapPanel - Floating panel wrapper for Canvas Map
 *
 * @param {Object} props
 * @param {string} props.workspaceId - Workspace ID for loading data
 * @param {string} props.projectId - Project ID for template persistence
 */
const MIN_PANEL_WIDTH = 380;
const MIN_PANEL_HEIGHT = 520;
const PANEL_CONTENT_PADDING = 8;
const PANEL_HEADER_HEIGHT = 40;

export function CanvasMapPanel({ workspaceId, projectId, workspaces, onOpenWorkspace, onCreateWorkspace }) {
  const { togglePanel, getPanelState, updateSize } = usePanelShell();
  const canvasMapContext = useCanvasMap();
  const companionState = getPanelState(COMPANION_PANEL_ID);
  const companionOpen = companionState?.isOpen || false;

  const handleCompanionToggle = useCallback(() => {
    togglePanel(COMPANION_PANEL_ID);
  }, [togglePanel]);

  const currentWorkspace = useMemo(() => {
    if (!workspaceId || !workspaces?.length) return null;
    return workspaces.find(ws => ws.id === workspaceId) || { id: workspaceId, name: workspaceId.slice(0, 8) };
  }, [workspaceId, workspaces]);

  // Listen for toggle event (keyboard shortcut 'm')
  useEffect(() => {
    const handleToggle = () => {
      togglePanel(CANVAS_MAP_PANEL_ID);
    };

    window.addEventListener('cia:toggle-canvas-map', handleToggle);
    return () => window.removeEventListener('cia:toggle-canvas-map', handleToggle);
  }, [togglePanel]);

  const panelState = getPanelState(CANVAS_MAP_PANEL_ID);
  const headerTitle = useMemo(() => {
    const width = panelState?.size?.width ?? CANVAS_MAP_BREAKPOINTS.standardWidth;
    return width <= CANVAS_MAP_BREAKPOINTS.standardWidth ? 'Map' : 'Canvas Map';
  }, [panelState?.size?.width]);

  useEffect(() => {
    if (!canvasMapContext) return;
    if (panelState?.isOpen) {
      canvasMapContext.activateCanvasMap();
    } else {
      canvasMapContext.deactivateCanvasMap();
    }
    return () => canvasMapContext.deactivateCanvasMap();
  }, [canvasMapContext, panelState?.isOpen]);

  useEffect(() => {
    if (!panelState?.size) return;
    const nextWidth = Math.max(panelState.size.width, MIN_PANEL_WIDTH);
    const nextHeight = Math.max(panelState.size.height, MIN_PANEL_HEIGHT);
    if (nextWidth !== panelState.size.width || nextHeight !== panelState.size.height) {
      updateSize(CANVAS_MAP_PANEL_ID, { width: nextWidth, height: nextHeight });
    }
  }, [panelState?.size, updateSize]);

  return (
    <PanelShell
      panelId={CANVAS_MAP_PANEL_ID}
      title="Canvas Map"
      icon="map"
      chrome={CHROME_LEVELS.FULL}
      color="#3b82f6"
      renderHeaderContent={() => (
        <div
          className="canvas-map-header"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="canvas-map-header__title">{headerTitle}</span>
          <span className="canvas-map-header__separator">·</span>
          {currentWorkspace && (
            <WorkspaceSelector
              workspace={currentWorkspace}
              workspaces={workspaces || []}
              onSelect={(ws) => onOpenWorkspace?.(ws.id)}
              hideLabel
            />
          )}
          {!currentWorkspace && (
            <span className="canvas-map-header__workspace-empty">No workspace</span>
          )}
        </div>
      )}
      headerActions={(
        <Tooltip
          content={companionOpen ? 'Hide companion panel' : 'Show companion panel'}
          placement="bottom"
          delay={400}
        >
          <button
            className="panel-header__button"
            onClick={handleCompanionToggle}
            type="button"
            aria-label={companionOpen ? 'Hide companion panel' : 'Show companion panel'}
          >
            <Icon name={companionOpen ? 'panelRightClose' : 'panelRightOpen'} size={12} />
          </button>
        </Tooltip>
      )}
      defaultWidth={380}
      defaultHeight={600}
      minWidth={380}
      minHeight={520}
      maxWidth={600}
      maxHeight={900}
      breakpoints={CANVAS_MAP_BREAKPOINTS}
    >
      {({ width, height, sizeMode }) => {
        const contentWidth = Math.max(0, width - PANEL_CONTENT_PADDING * 2);
        const contentHeight = Math.max(
          0,
          height - PANEL_HEADER_HEIGHT - PANEL_CONTENT_PADDING * 2
        );
        return (
        <CanvasMapContent
          workspaceId={workspaceId}
          projectId={projectId}
          width={contentWidth}
          height={contentHeight}
          sizeMode={sizeMode}
          workspaces={workspaces}
          onOpenWorkspace={onOpenWorkspace}
          onCreateWorkspace={onCreateWorkspace}
        />
        );
      }}
    </PanelShell>
  );
}

export default CanvasMapPanel;
