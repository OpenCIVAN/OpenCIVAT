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

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PanelShell, CHROME_LEVELS, usePanelShell } from '@UI/react/components/panels/PanelShell';
import { Icon } from '@UI/react/components/atoms/Icon';
import { CanvasMapContent } from './CanvasMapContent';

// Panel ID constant for external access
export const CANVAS_MAP_PANEL_ID = 'canvas-map';

// Breakpoints for responsive sizing
const CANVAS_MAP_BREAKPOINTS = {
  minWidth: 280,
  compactWidth: 320,
  standardWidth: 380,
  expandedWidth: 480,
};

/**
 * CanvasMapPanel - Floating panel wrapper for Canvas Map
 *
 * @param {Object} props
 * @param {string} props.workspaceId - Workspace ID for loading data
 */
export function CanvasMapPanel({ workspaceId }) {
  const { togglePanel } = usePanelShell();
  const [companionOpen, setCompanionOpen] = useState(false);
  const companionToggleRef = useRef(null);

  const handleCompanionToggleReady = useCallback((toggleFn) => {
    companionToggleRef.current = toggleFn;
  }, []);

  const handleCompanionOpenChange = useCallback((nextOpen) => {
    setCompanionOpen(nextOpen);
  }, []);

  const handleCompanionToggle = useCallback(() => {
    companionToggleRef.current?.();
  }, []);

  // Listen for toggle event (keyboard shortcut 'm')
  useEffect(() => {
    const handleToggle = () => {
      togglePanel(CANVAS_MAP_PANEL_ID);
    };

    window.addEventListener('cia:toggle-canvas-map', handleToggle);
    return () => window.removeEventListener('cia:toggle-canvas-map', handleToggle);
  }, [togglePanel]);

  return (
    <PanelShell
      panelId={CANVAS_MAP_PANEL_ID}
      title="Canvas"
      icon="map"
      chrome={CHROME_LEVELS.FULL}
      color="#3b82f6"
      headerActions={(
        <button
          className="panel-header__button"
          onClick={handleCompanionToggle}
          title={companionOpen ? 'Hide companion panel' : 'Show companion panel'}
          type="button"
        >
          <Icon name={companionOpen ? 'panelRightClose' : 'panelRightOpen'} size={12} />
        </button>
      )}
      defaultWidth={380}
      defaultHeight={600}
      minWidth={280}
      minHeight={400}
      maxWidth={600}
      maxHeight={900}
      breakpoints={CANVAS_MAP_BREAKPOINTS}
    >
      {({ width, height, sizeMode }) => (
        <CanvasMapContent
          workspaceId={workspaceId}
          width={width}
          height={height}
          sizeMode={sizeMode}
          onCompanionToggleReady={handleCompanionToggleReady}
          onCompanionOpenChange={handleCompanionOpenChange}
        />
      )}
    </PanelShell>
  );
}

export default CanvasMapPanel;
