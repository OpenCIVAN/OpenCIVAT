/**
 * @file LayoutMiniPreview.jsx
 * @description Re-exports LayoutMiniPreview from molecules with CanvasMap-specific defaults
 *
 * This file maintains backwards compatibility for existing imports while
 * the actual component lives in molecules/LayoutMiniPreview.
 */

import React, { memo } from 'react';
import {
  LayoutMiniPreview as BaseLayoutMiniPreview,
} from '@UI/react/components/molecules/LayoutMiniPreview';
import { LAYOUTS } from '../../CanvasMapTab.logic';

/**
 * LayoutMiniPreview - Wrapper with CanvasMap defaults
 *
 * @param {Object} props
 * @param {string} props.layoutId - Layout identifier ('single', '2x2', '1+2', etc.)
 * @param {string} props.color - VG color for filled cells
 * @param {number} props.viewCount - Number of views to show as filled
 * @param {number} [props.size=16] - Total size in pixels
 */
export const LayoutMiniPreview = memo(function LayoutMiniPreview({
  layoutId,
  color,
  viewCount,
  size = 16,
}) {
  return (
    <BaseLayoutMiniPreview
      layoutId={layoutId}
      color={color}
      filledCount={viewCount}
      size={size}
      layouts={LAYOUTS}
    />
  );
});

export default LayoutMiniPreview;
