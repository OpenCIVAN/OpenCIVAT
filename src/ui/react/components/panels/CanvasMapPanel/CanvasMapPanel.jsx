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

import React, { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import { PanelShell, CHROME_LEVELS, usePanelShell } from '@UI/react/components/panels/PanelShell';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Tooltip } from '@UI/react/components/atoms/Tooltip';
import { DropdownPortal } from '@UI/react/components/atoms/DropdownPortal';
import { SearchInput } from '@UI/react/components/molecules/SearchInput';
import { COMPANION_PANEL_ID } from '@UI/react/components/panels/CompanionPanel';
import { useCanvasMap } from '@UI/react/context/CanvasMapContext';
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
  const { togglePanel, getPanelState, updateSize, updatePanelMeta } = usePanelShell();
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

  // Workspace selector dropdown state
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspaceQuery, setWorkspaceQuery] = useState('');
  const [workspaceFilter, setWorkspaceFilter] = useState('all');
  const [workspaceSort, setWorkspaceSort] = useState('name-asc');
  const [workspaceTag, setWorkspaceTag] = useState(null);
  const workspaceTriggerRef = useRef(null);

  const workspaceItems = useMemo(() => {
    return (workspaces || []).map(ws => typeof ws === 'string' ? { id: ws, name: ws } : ws);
  }, [workspaces]);

  const workspaceTags = useMemo(() => {
    const tags = new Set();
    workspaceItems.forEach(ws => {
      if (Array.isArray(ws.tags)) ws.tags.forEach(t => tags.add(t));
    });
    return Array.from(tags);
  }, [workspaceItems]);

  const filteredWorkspaces = useMemo(() => {
    const query = workspaceQuery.trim().toLowerCase();
    const hasQuery = Boolean(query);

    let items = workspaceItems.filter(ws => {
      if (hasQuery && !(ws.name || '').toLowerCase().includes(query)) return false;
      if (workspaceFilter !== 'all' && ws.type !== workspaceFilter) return false;
      if (workspaceTag && (!Array.isArray(ws.tags) || !ws.tags.includes(workspaceTag))) return false;
      return true;
    });

    const sorters = {
      'name-asc': (a, b) => (a.name || '').localeCompare(b.name || ''),
      'name-desc': (a, b) => (b.name || '').localeCompare(a.name || ''),
      'recent': (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0),
    };
    return items.slice().sort(sorters[workspaceSort] || sorters['name-asc']);
  }, [workspaceItems, workspaceQuery, workspaceFilter, workspaceSort, workspaceTag]);

  const handleWorkspaceClose = useCallback(() => {
    setWorkspaceOpen(false);
    setWorkspaceQuery('');
    setWorkspaceTag(null);
  }, []);

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
    window.dispatchEvent(new CustomEvent('cia:canvas-map-visibility', {
      detail: { isOpen: !!panelState?.isOpen }
    }));
  }, [panelState?.isOpen]);

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
        <>
          <div
            className="canvas-map-header"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="canvas-map-header__title">{headerTitle}</span>
            <span className="canvas-map-header__separator">·</span>
            {currentWorkspace ? (
              <button
                ref={workspaceTriggerRef}
                type="button"
                className="canvas-map-header__ws-selector"
                onClick={() => setWorkspaceOpen(prev => !prev)}
                aria-expanded={workspaceOpen}
                aria-haspopup="listbox"
              >
                <Icon name="grid" size={12} />
                <span className="canvas-map-header__ws-name">
                  {currentWorkspace.name || 'Workspace'}
                </span>
                <Icon name="chevronDown" size={10} />
              </button>
            ) : (
              <span className="canvas-map-header__workspace-empty">No workspace</span>
            )}
          </div>

          <DropdownPortal
            open={workspaceOpen}
            onClose={handleWorkspaceClose}
            triggerRef={workspaceTriggerRef}
            align="start"
            position="bottom"
            className="canvas-map-header__dropdown"
          >
            <div className="canvas-map-header__dropdown-inner">
              <SearchInput
                className="canvas-map-header__dropdown-search"
                value={workspaceQuery}
                onChange={setWorkspaceQuery}
                placeholder="Search workspaces..."
                size="sm"
                autoFocus
              />
              <div className="canvas-map-header__dropdown-controls">
                <div className="canvas-map-header__filter-row">
                  {['all', 'project', 'breakout', 'personal'].map(filter => (
                    <button
                      key={filter}
                      type="button"
                      className={`canvas-map-header__filter-chip ${workspaceFilter === filter ? 'is-active' : ''}`}
                      onClick={() => setWorkspaceFilter(filter)}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
                {workspaceTags.length > 0 && (
                  <div className="canvas-map-header__tag-row">
                    {workspaceTags.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        className={`canvas-map-header__tag-chip ${workspaceTag === tag ? 'is-active' : ''}`}
                        onClick={() => setWorkspaceTag(workspaceTag === tag ? null : tag)}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
                <label className="canvas-map-header__sort">
                  <span>Sort</span>
                  <select value={workspaceSort} onChange={e => setWorkspaceSort(e.target.value)}>
                    <option value="name-asc">Name A–Z</option>
                    <option value="name-desc">Name Z–A</option>
                    <option value="recent">Recently updated</option>
                  </select>
                </label>
              </div>
              <div className="canvas-map-header__dropdown-divider" />
              {filteredWorkspaces.map(ws => {
                const isActive = currentWorkspace?.id === ws.id;
                return (
                  <button
                    key={ws.id}
                    type="button"
                    className={`canvas-map-header__dropdown-item ${isActive ? 'is-active' : ''}`}
                    onClick={() => {
                      onOpenWorkspace?.(ws.id);
                      handleWorkspaceClose();
                    }}
                  >
                    <Icon name="grid" size={12} />
                    <span className="canvas-map-header__dropdown-text">{ws.name}</span>
                    {isActive && <Icon name="check" size={12} className="canvas-map-header__dropdown-check" />}
                  </button>
                );
              })}
              {filteredWorkspaces.length === 0 && (
                <div className="canvas-map-header__dropdown-empty">No workspaces found</div>
              )}
              {onCreateWorkspace && (
                <div className="canvas-map-header__dropdown-footer">
                  <button
                    type="button"
                    className="canvas-map-header__dropdown-item canvas-map-header__dropdown-item--create"
                    onClick={() => {
                      onCreateWorkspace?.();
                      handleWorkspaceClose();
                    }}
                  >
                    <Icon name="plus" size={12} />
                    <span className="canvas-map-header__dropdown-text">Create Workspace</span>
                  </button>
                </div>
              )}
            </div>
          </DropdownPortal>
        </>
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
          panelState={panelState}
          onUpdatePanelMeta={(meta) => updatePanelMeta?.(CANVAS_MAP_PANEL_ID, meta)}
        />
        );
      }}
    </PanelShell>
  );
}

export default CanvasMapPanel;
