/**
 * @file LinksPanel.jsx
 * @description Links mode panel content
 *
 * Shows:
 * - VG Links list (when VG sub-tab active)
 * - View Links list (when View sub-tab active)
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Badge } from '@UI/react/components/atoms/Badge';
import { Section } from '@UI/react/components/molecules/Section';
import { EmptyState } from '@UI/react/components/molecules/EmptyState';
import { LINKS_SUB_TABS, getVGDisplayName } from '../../CanvasMapTab.logic';
import './panels.scss';

/**
 * VG Link item component
 */
const LinkItem = memo(function LinkItem({
  link,
  fromName,
  toName,
  fromColor,
  toColor,
  isHighlighted,
  onClick,
}) {
  const typeIcons = {
    camera: 'video',
    filters: 'filter',
    widgets: 'layoutGrid',
    all: 'link2',
  };

  return (
    <div
      className={`canvas-map-panel__link-item ${isHighlighted ? 'canvas-map-panel__link-item--highlighted' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className="canvas-map-panel__link-type">
        <Icon name={typeIcons[link.type] || 'link2'} size={12} />
        {link.type}
      </div>
      <div className="canvas-map-panel__link-connection">
        <span style={{ color: fromColor }}>{fromName}</span>
        <Icon
          name={link.mode === 'bidirectional' ? 'arrowLeftRight' : 'arrowRight'}
          size={12}
          className="canvas-map-panel__link-arrow"
        />
        <span style={{ color: toColor }}>{toName}</span>
      </div>
    </div>
  );
});

/**
 * View Link item component
 */
const ViewLinkItem = memo(function ViewLinkItem({ link, allViews }) {
  const views = link.views.map(vid => allViews.find(v => v.id === vid)).filter(Boolean);

  const typeIcons = {
    camera: 'video',
    windowLevel: 'sliders',
    slice: 'layers',
    colormap: 'palette',
  };

  return (
    <div className="canvas-map-panel__view-link-item">
      <div className="canvas-map-panel__link-type">
        <Icon name={typeIcons[link.type] || 'link2'} size={12} />
        {link.type}
      </div>
      <div className="canvas-map-panel__view-link-views">
        {views.map((view, i) => (
          <span key={view.id} style={{ color: view.vgColor }}>
            {view.name}
            {i < views.length - 1 && ', '}
          </span>
        ))}
      </div>
    </div>
  );
});

/**
 * LinksPanel - Links mode content
 */
export const LinksPanel = memo(function LinksPanel({
  linksSubTab,
  vgLinks,
  viewLinks,
  viewGroups,
  allViews,
  highlightedLinkId,
  onLinkClick,
}) {
  if (linksSubTab === LINKS_SUB_TABS.VG) {
    return (
      <div className="canvas-map-panel">
        <Section
          title="ViewGroup Links"
          icon="gitBranch"
          actions={<Badge count={vgLinks.length} size="sm" />}
          collapsible={false}
        >
          <p className="canvas-map-panel__hint">
            Click a link line on the map to highlight
          </p>
          <div className="canvas-map-panel__list">
            {vgLinks.map(link => {
              const fromVG = viewGroups.find(v => v.id === link.from);
              const toVG = viewGroups.find(v => v.id === link.to);
              return (
                <LinkItem
                  key={link.id}
                  link={link}
                  fromName={fromVG ? getVGDisplayName(fromVG) : '?'}
                  toName={toVG ? getVGDisplayName(toVG) : '?'}
                  fromColor={fromVG?.color}
                  toColor={toVG?.color}
                  isHighlighted={highlightedLinkId === link.id}
                  onClick={() => onLinkClick(link.id)}
                />
              );
            })}
            {vgLinks.length === 0 && (
              <EmptyState
                icon="link2"
                title="No ViewGroup links defined"
                size="sm"
              />
            )}
          </div>
        </Section>
      </div>
    );
  }

  // View links sub-tab
  return (
    <div className="canvas-map-panel">
      <Section
        title="View Links"
        icon="layers"
        actions={<Badge count={viewLinks.length} size="sm" />}
        collapsible={false}
      >
        <p className="canvas-map-panel__hint">
          Links between individual views across VGs
        </p>
        <div className="canvas-map-panel__list">
          {viewLinks.map(link => (
            <ViewLinkItem
              key={link.id}
              link={link}
              allViews={allViews}
            />
          ))}
          {viewLinks.length === 0 && (
            <EmptyState
              icon="layers"
              title="No View links defined"
              size="sm"
            />
          )}
        </div>
      </Section>
    </div>
  );
});

export default LinksPanel;
