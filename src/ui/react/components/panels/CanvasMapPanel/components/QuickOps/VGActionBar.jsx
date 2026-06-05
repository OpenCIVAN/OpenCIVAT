/**
 * @file VGActionBar.jsx
 * @description Unified VG action bar combining breadcrumb navigation with quick ops
 * (template picker, dimension controls, merge/split/edit buttons).
 * Replaces both the inline breadcrumb and the floating VGQuickOpsToolbar.
 */

import React, { memo, useRef, useCallback, useState, useEffect } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { LayoutThumbnail } from '@UI/react/components/atoms/LayoutThumbnail';
import { DropdownPortal, useDropdown } from '@UI/react/components/atoms/DropdownPortal';
import { Tooltip } from '@UI/react/components/atoms/Tooltip';
import { TemplatePicker } from './TemplatePicker';
import { DimensionControls } from './DimensionControls';
import { LAYOUTS } from '../../utils/constants';
import { getVGDisplayName } from '../../utils/gridUtils';
import './VGActionBar.scss';

/**
 * VGActionBar — unified breadcrumb + quick ops bar for focused VG mode
 *
 * Left:   [< Canvas] / [dot] [VG Name]
 * Right:  [template ▾] | [-rows+] [-cols+] | [merge] [split] [edit]
 */
export const VGActionBar = memo(function VGActionBar({
  // Breadcrumb props
  focusedVG,
  onBackToCanvas,
  onRename,
  isCompact,
  // Quick ops props
  focusedLayout,
  focusedSlots,
  canvas,
  viewGroups,
  quickOps,
  onApplyTemplate,
  onResizeInternal,
  onResizeFootprint,
  onMergeCells,
  onSplitCell,
  onOpenEditor,
}) {
  const templateDropdown = useDropdown();

  // Inline rename state
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const inputRef = useRef(null);

  // Reset draft when focusedVG changes
  useEffect(() => {
    if (!focusedVG) {
      setNameDraft('');
      setIsRenaming(false);
      return;
    }
    setNameDraft(focusedVG.name || getVGDisplayName(focusedVG));
    setIsRenaming(false);
  }, [focusedVG?.id, focusedVG?.name]);

  // Auto-focus input when renaming starts
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const commitRename = useCallback(() => {
    if (!focusedVG) return;
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameDraft(focusedVG.name || getVGDisplayName(focusedVG));
      return;
    }
    if (trimmed !== (focusedVG.name || '')) {
      onRename?.(trimmed);
    }
  }, [focusedVG, nameDraft, onRename]);

  // Template / layout info
  const layout = focusedLayout || LAYOUTS.single;
  const layoutId = focusedVG?.layoutId || 'single';
  const pos = focusedVG?.position;

  // Merge button gating
  const isMergeCapableLayout = (focusedLayout?.rows === 2 && focusedLayout?.cols === 2);
  const canMerge = isMergeCapableLayout && quickOps.isRectangularSelection && quickOps.selectedCells.size === 2;
  const mergeTooltip = canMerge
    ? 'Merge selected cells'
    : (isMergeCapableLayout ? 'Select exactly two adjacent cells to merge' : 'Merge is only available for 2x2 layouts');

  // Split button gating
  const canSplit = !!focusedLayout?.merged && quickOps.selectedCells.size === 1;
  const splitTooltip = canSplit
    ? 'Split merged cell'
    : 'Select any cell in a merged layout to split';

  const handleMerge = useCallback(() => {
    if (!canMerge) return;
    onMergeCells?.(Array.from(quickOps.selectedCells));
  }, [canMerge, quickOps.selectedCells, onMergeCells]);

  const handleSplit = useCallback(() => {
    if (!canSplit) return;
    const cellIndex = Array.from(quickOps.selectedCells)[0];
    onSplitCell?.(cellIndex);
  }, [canSplit, quickOps.selectedCells, onSplitCell]);

  const handleApply = useCallback((id) => {
    onApplyTemplate?.(id);
    templateDropdown.close();
  }, [onApplyTemplate, templateDropdown]);

  if (!focusedVG) return null;

  const displayName = focusedVG.name || getVGDisplayName(focusedVG);

  return (
    <div
      className="vg-action-bar"
      style={{ '--vg-color': focusedVG.color }}
    >
      {/* ── Left: Breadcrumb ── */}
      <div className="vg-action-bar__left">
        <button
          className="vg-action-bar__back-btn"
          onClick={onBackToCanvas}
        >
          <Icon name="chevronLeft" size={14} />
          {!isCompact && 'Canvas'}
        </button>

        <Icon name="chevronRight" size={14} className="vg-action-bar__sep" />

        <div className="vg-action-bar__vg-identity">
          <div
            className="vg-action-bar__dot"
            style={{ background: focusedVG.color }}
          />
          {isRenaming ? (
            <input
              ref={inputRef}
              type="text"
              className="vg-action-bar__name-input"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={() => {
                setIsRenaming(false);
                commitRename();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setIsRenaming(false);
                  commitRename();
                }
                if (e.key === 'Escape') {
                  setIsRenaming(false);
                  setNameDraft(focusedVG.name || getVGDisplayName(focusedVG));
                }
              }}
            />
          ) : (
            <Tooltip content="Click to rename ViewGroup" placement="top" delay={400}>
              <button
                type="button"
                className="vg-action-bar__name"
                aria-label="Rename ViewGroup"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRenaming(true);
                }}
              >
                <span style={{ color: focusedVG.color }}>{displayName}</span>
                <Icon name="pencil" size={10} className="vg-action-bar__rename-icon" />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* ── Spacer ── */}
      <div className="vg-action-bar__spacer" />

      {/* ── Right: Quick Ops ── */}
      <div className="vg-action-bar__right">
        {/* Template picker */}
        <div className="vg-action-bar__group">
          <Tooltip content="Change layout template" placement="top" delay={400}>
            <button
              type="button"
              className="vg-action-bar__template-btn"
              ref={templateDropdown.triggerRef}
              onClick={templateDropdown.toggle}
              aria-expanded={templateDropdown.open}
              aria-haspopup
              aria-label="Change layout template"
            >
              <LayoutThumbnail layout={layout} size="sm" highlighted />
              <Icon name="chevronDown" size={12} />
            </button>
          </Tooltip>
          <DropdownPortal
            open={templateDropdown.open}
            onClose={templateDropdown.close}
            triggerRef={templateDropdown.triggerRef}
            position="bottom"
            align="end"
            offset={6}
          >
            <TemplatePicker
              currentLayout={layoutId}
              currentRows={pos?.rowSpan || layout.rows}
              currentCols={pos?.colSpan || layout.cols}
              onApply={handleApply}
              onClose={templateDropdown.close}
            />
          </DropdownPortal>
        </div>

        {/* Dimension controls */}
        <div className="vg-action-bar__group vg-action-bar__group--dims">
          <DimensionControls
            focusedVG={focusedVG}
            focusedLayout={focusedLayout}
            canvas={canvas}
            viewGroups={viewGroups}
            onResizeInternal={onResizeInternal}
            onResizeFootprint={onResizeFootprint}
          />
        </div>

        {/* Merge / Split / Edit */}
        <div className="vg-action-bar__group vg-action-bar__group--actions">
          <Tooltip content={mergeTooltip} placement="top" delay={400}>
            <button
              type="button"
              className={`vg-action-bar__action-btn vg-action-bar__action-btn--merge ${canMerge ? '' : 'vg-action-bar__action-btn--disabled'}`}
              disabled={!canMerge}
              onClick={handleMerge}
              aria-label={mergeTooltip}
            >
              <Icon name="combine" size={14} />
            </button>
          </Tooltip>
          <Tooltip content={splitTooltip} placement="top" delay={400}>
            <button
              type="button"
              className={`vg-action-bar__action-btn vg-action-bar__action-btn--split ${canSplit ? '' : 'vg-action-bar__action-btn--disabled'}`}
              disabled={!canSplit}
              onClick={handleSplit}
              aria-label={splitTooltip}
            >
              <Icon name="layers" size={14} />
            </button>
          </Tooltip>
          <Tooltip content="Open VG Editor" placement="top" delay={400}>
            <button
              type="button"
              className="vg-action-bar__action-btn vg-action-bar__action-btn--edit"
              onClick={onOpenEditor}
              aria-label="Open VG Editor"
            >
              <Icon name="pencil" size={14} />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
});

export default VGActionBar;
