/**
 * @file AdaptiveTooltip.jsx
 * @description Deprecated wrapper for Tooltip.
 * Uses the unified Tooltip component which already provides adaptive positioning.
 */

import React, { memo } from 'react';
import { Tooltip } from '@UI/react/components/atoms/Tooltip';

/**
 * AdaptiveTooltip - Backwards-compatible wrapper around Tooltip.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Trigger element
 * @param {React.ReactNode} props.content - Tooltip content
 * @param {'top'|'bottom'|'left'|'right'} [props.placement='top'] - Preferred placement
 * @param {number} [props.delay=300] - Show delay in ms
 * @param {boolean} [props.disabled=false] - Disable tooltip
 * @param {boolean} [props.allowFlip=true] - Allow viewport-aware flip
 * @param {string} [props.className] - Extra class
 * @param {boolean} [props.interactive=false] - Allow interactive content
 * @param {number} [props.maxWidth] - Max width
 * @param {string} [props.mode] - 'desktop' | 'vr'
 */
export const AdaptiveTooltip = memo(function AdaptiveTooltip({
  children,
  content,
  placement = 'top',
  delay = 300,
  disabled = false,
  allowFlip = true,
  className = '',
  interactive = false,
  maxWidth,
  mode,
}) {
  return (
    <Tooltip
      content={content}
      placement={placement}
      delay={delay}
      disabled={disabled}
      allowFlip={allowFlip}
      className={className}
      interactive={interactive}
      maxWidth={maxWidth}
      mode={mode}
    >
      {children}
    </Tooltip>
  );
});

export default AdaptiveTooltip;
