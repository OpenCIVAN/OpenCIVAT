/**
 * @file MapToolbar.jsx
 * @description Slim toolbar for Canvas Map Panel V2
 *
 * Always shows: Zoom controls + Fit
 * Contextual toggles: Viewports, Internals, Bookmarks, Cursors
 * Remote collaboration: Lock badge + draft toggle
 */

import React, { memo } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { useAdaptive } from '@UI/react/context/AdaptiveContext';
import { Tooltip } from '@UI/react/components/atoms/Tooltip';
import './MapToolbar.scss';

/**
 * Small toolbar button with adaptive tooltip
 */
const ToolbarBtn = memo(function ToolbarBtn({
  icon,
  onClick,
  active,
  activeColor,
  disabled,
  title,
  size = 14,
  placement = 'top',
  tooltipOffset = 6,
  allowFlip = false,
}) {
  const { isVR } = useAdaptive();

  const button = (
    <button
      className={`map-toolbar__btn ${active ? 'map-toolbar__btn--active' : ''}`}
      style={active && activeColor ? { '--active-color': activeColor } : undefined}
      onClick={onClick}
      disabled={disabled}
      type="button"
      data-vr={isVR}
    >
      <Icon name={icon} size={isVR ? size + 4 : size} />
    </button>
  );

  if (!title) return button;

  return (
    <Tooltip content={title} placement={placement} offset={tooltipOffset} delay={400} allowFlip={allowFlip}>
      {button}
    </Tooltip>
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
  minimapZoom,
  showViewports,
  showInternals,
  showCursors,

  // Handlers
  onZoomIn,
  onZoomOut,
  onResetView,
  toggleShowViewports,
  toggleShowInternals,
  toggleShowCursors,

  // Remote collaboration
  remoteLock,
  isEditMode = false,
  hasRemoteDraft,
  showRemoteDraft,
  toggleShowRemoteDraft,
  onEditLayout,

  sizeMode = 'standard',
}) {
  const editTooltip = isEditMode ? 'Editing layout' : 'Edit layout';

  return (
    <div className="map-toolbar" data-size-mode={sizeMode}>
      {/* Zoom controls - always visible */}
      <ToolbarBtn icon="zoomOut" onClick={onZoomOut} title="Zoom out" />
      <span className="map-toolbar__zoom-value">{minimapZoom}%</span>
      <ToolbarBtn icon="zoomIn" onClick={onZoomIn} title="Zoom in" />
      {onResetView && (
        <ToolbarBtn icon="aspectRatio" onClick={onResetView} title="Fit to canvas" />
      )}

      <Separator />

      {/* Layer toggles — always available */}
      <ToolbarBtn
        icon="iframe"
        active={showViewports}
        onClick={toggleShowViewports}
        title="Viewports"
        activeColor="var(--accent-cyan)"
      />
      <ToolbarBtn
        icon="grid3x3"
        active={showInternals}
        onClick={toggleShowInternals}
        title="Internals"
        activeColor="var(--accent-green)"
      />
      <ToolbarBtn
        icon="users"
        active={showCursors}
        onClick={toggleShowCursors}
        title="Show cursors"
        activeColor="var(--accent-purple)"
      />

      {/* Remote lock badge */}
      {remoteLock && !isEditMode && (
        <Tooltip content={`${remoteLock.lockedByName || 'Someone'} is editing`} placement="top" delay={400} allowFlip={false}>
          <span className="map-toolbar__lock-badge" aria-label={`${remoteLock.lockedByName || 'Someone'} is editing`}>
            <Icon name="lock" size={12} />
            <span>{remoteLock.lockedByName || 'Locked'}</span>
          </span>
        </Tooltip>
      )}

      {/* Draft layer toggle (visible when someone else is editing) */}
      {hasRemoteDraft && !isEditMode && (
        <ToolbarBtn
          icon="layers"
          active={showRemoteDraft}
          onClick={toggleShowRemoteDraft}
          title={showRemoteDraft ? "Hide pending changes" : "Show pending changes"}
          activeColor="var(--accent-amber)"
        />
      )}

      <div className="map-toolbar__spacer" />

      <Tooltip content={editTooltip} placement="top" offset={6} delay={400} allowFlip={false}>
        <button
          type="button"
          className={`map-toolbar__edit-btn ${isEditMode ? 'map-toolbar__edit-btn--active' : ''}`}
          onClick={onEditLayout}
          disabled={!onEditLayout}
          aria-label={editTooltip}
        >
          <Icon name="pencil" size={12} />
          <span>{isEditMode ? 'Editing' : 'Edit'}</span>
        </button>
      </Tooltip>
    </div>
  );
});

export default MapToolbar;
