/**
 * PanelHeader Component
 *
 * Adapts to chrome level to display appropriate header elements.
 * - FULL: Drag handle, icon, title, size indicator (dev), minimize, dock, close
 * - COMPACT: Icon, title, collapse, close
 * - MINIMAL: No header (handled by parent)
 */

import React from 'react';
import Icon from '@UI/react/components/atoms/Icon/Icon';
import { Tooltip } from '@UI/react/components/atoms/Tooltip';
import { CHROME_LEVELS } from '../../constants';
import './PanelHeader.scss';

/**
 * @typedef {Object} PanelHeaderProps
 * @property {string} title - Panel title
 * @property {string} icon - Icon name from Icon component
 * @property {'full' | 'compact' | 'minimal'} chrome - Chrome level
 * @property {string} [color] - Accent color
 * @property {boolean} minimized - Whether panel is minimized
 * @property {boolean} minimizable - Whether panel can be minimized
 * @property {boolean} closable - Whether panel can be closed
 * @property {'compact' | 'standard' | 'expanded'} sizeMode - Current size mode
 * @property {number} width - Current width for size indicator
 * @property {(e: MouseEvent) => void} onDragStart - Drag start handler
 * @property {() => void} [onMinimize] - Minimize handler
 * @property {() => void} [onClose] - Close handler
 * @property {React.ReactNode} [headerActions] - Optional header actions
 * @property {React.ReactNode} [headerContent] - Optional custom header content (replaces title)
 */

export function PanelHeader({
  title,
  icon,
  chrome,
  color,
  minimized,
  minimizable,
  closable,
  onDragStart,
  onMinimize,
  onClose,
  headerActions,
  headerContent,
}) {
  const isFull = chrome === CHROME_LEVELS.FULL;
  const minimizeLabel = minimized ? 'Expand' : (isFull ? 'Minimize' : 'Collapse');

  return (
    <div
      className={`panel-header panel-header--${chrome}`}
      onMouseDown={onDragStart}
      onTouchStart={onDragStart}
    >
      {/* Drag handle (FULL only) */}
      {isFull && (
        <span className="panel-header__drag-handle">
          <Icon name="gripVertical" size={12} />
        </span>
      )}

      {/* Icon */}
      <span className="panel-header__icon" style={color ? { color } : undefined}>
        <Icon name={icon} size={14} />
      </span>

      {/* Title / Custom Content */}
      {headerContent ? (
        <div className="panel-header__content">
          {headerContent}
        </div>
      ) : (
        <span className="panel-header__title">
          {title}
        </span>
      )}

      {/* Spacer (only needed when no headerContent, since __content has flex:1) */}
      {!headerContent && <span className="panel-header__spacer" />}

      {/* Buttons */}
      <div className="panel-header__buttons">
        {headerActions && (
          <div
            className="panel-header__actions"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {headerActions}
          </div>
        )}
        {/* Minimize/Collapse */}
        {minimizable && (
          <Tooltip content={minimizeLabel} placement="bottom" delay={400}>
            <button
              className="panel-header__button"
              onClick={(e) => {
                e.stopPropagation();
                onMinimize?.();
              }}
              type="button"
              aria-label={minimizeLabel}
            >
              <Icon
                name={minimized ? 'chevronDown' : (isFull ? 'minus' : 'chevronUp')}
                size={12}
              />
            </button>
          </Tooltip>
        )}

        {/* Dock button (FULL only, placeholder for future) */}
        {isFull && (
          <Tooltip content="Dock" placement="bottom" delay={400}>
            <button
              className="panel-header__button"
              onClick={(e) => e.stopPropagation()}
              type="button"
              aria-label="Dock"
            >
              <Icon name="layout" size={12} />
            </button>
          </Tooltip>
        )}

        {/* Close */}
        {closable && (
          <Tooltip content="Close" placement="bottom" delay={400}>
            <button
              className="panel-header__button panel-header__button--close"
              onClick={(e) => {
                e.stopPropagation();
                onClose?.();
              }}
              type="button"
              aria-label="Close"
            >
              <Icon name="x" size={12} />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

export default PanelHeader;
