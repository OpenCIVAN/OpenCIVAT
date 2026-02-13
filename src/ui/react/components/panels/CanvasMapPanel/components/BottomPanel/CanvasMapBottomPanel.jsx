/**
 * @file CanvasMapBottomPanel.jsx
 * @description Bottom panel layout for CanvasMap V2 (search, tabs, d-pad)
 */

import React, { memo, useMemo, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Tooltip } from '@UI/react/components/atoms/Tooltip';
import { FilterToolbar } from '@UI/react/components/organisms/FilterToolbar';
import { SquareDPad } from '@UI/react/components/molecules/DPadNav';
import { tokens } from '@UI/react/styles/tokens';

const COLOR_VARS = {
  bgSecondary: 'var(--color-bg-secondary)',
  borderSubtle: 'var(--color-border-subtle)',
  glassSubtle: 'var(--color-glass-subtle)',
  textMuted: 'var(--color-text-muted)',
  textTertiary: 'var(--color-text-tertiary)',
  accentCyan: 'var(--color-accent-cyan)',
  accentGreen: 'var(--color-accent-green)',
  accentCyanSoft: 'rgba(var(--color-accent-cyan-rgb), 0.12)',
};

export const CanvasMapBottomPanel = memo(function CanvasMapBottomPanel({
  sizeMode,
  searchQuery,
  setSearchQuery,
  filter,
  filterConfig,
  tagOptions = [],
  quickFilterDefs = [],
  quickFilterCounts = {},
  onMove,
  onGoHome,
  onSetHome,
  onAddBookmark,
  onOpenSettings,
  currentPositionLabel,
  isAtHome,
  minHeight,
  children,
  // Stats for footer
  totalVGCount = 0,
  activeVGCount = 0,
  filteredVGCount = 0,
  canvasRows = 0,
  canvasCols = 0,
  totalViewCount = 0,
}) {
  const dpadSizeMode = sizeMode === 'compact' ? 'minimal' : 'compact';
  const showQuickLabel = sizeMode !== 'compact';

  const quickFilters = useMemo(() => quickFilterDefs, [quickFilterDefs]);
  const toolbarConfig = useMemo(
    () => ({
      quickFilterDefs: quickFilters,
      sortOptions: filterConfig?.sortOptions || [],
      typeCategories: filterConfig?.typeCategories || [],
    }),
    [filterConfig, quickFilters]
  );

  const clearQuickFilters = useCallback(() => {
    const active = filter?.quickFilters || [];
    active.forEach((id) => filter?.toggleQuickFilter?.(id));
  }, [filter]);

  const isAllActive = !(filter?.quickFilters?.length);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 0',
        minHeight: 48,
        background: COLOR_VARS.bgSecondary,
        borderTop: `1px solid ${COLOR_VARS.borderSubtle}`,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: tokens.spacing.sm,
          borderBottom: `1px solid ${COLOR_VARS.borderSubtle}`,
          background: COLOR_VARS.bgSecondary,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: tokens.spacing.sm }}>
          <div style={{ flexShrink: 0 }}>
            <SquareDPad
              sizeMode={dpadSizeMode}
              onMove={onMove}
              onGoHome={onGoHome}
              centerLabel={currentPositionLabel}
              isAtHome={isAtHome}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <FilterToolbar
              filter={{
                ...filter,
                searchQuery,
                setSearchQuery: (next) => {
                  setSearchQuery?.(next);
                  filter?.setSearchQuery?.(next);
                },
              }}
              config={toolbarConfig}
              tags={tagOptions}
              quickFilterCounts={quickFilterCounts}
              variant="embedded"
              stacked={false}
              showQuickFilters={false}
              showTypeFilter
              showTagFilter={false}
              showSortFilter={(toolbarConfig.sortOptions || []).length > 0}
              searchPlaceholder="Search views, datasets..."
            />
            {quickFilterDefs.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing.xs,
                  marginTop: tokens.spacing.xs,
                  flexWrap: 'nowrap',
                  overflowX: 'auto',
                  paddingBottom: 2,
                }}
              >
                {showQuickLabel && (
                  <span
                    style={{
                      fontSize: tokens.fontSize.xs,
                      color: COLOR_VARS.textMuted,
                      marginRight: tokens.spacing.xs,
                      flexShrink: 0,
                    }}
                  >
                    Quick:
                  </span>
                )}
                <button
                  type="button"
                  onClick={clearQuickFilters}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: tokens.spacing.xs,
                    padding: '2px 8px',
                    borderRadius: tokens.radius.md,
                    border: `1px solid ${isAllActive ? COLOR_VARS.accentCyan : COLOR_VARS.borderSubtle}`,
                    background: isAllActive ? COLOR_VARS.accentCyanSoft : COLOR_VARS.glassSubtle,
                    color: isAllActive ? COLOR_VARS.accentCyan : COLOR_VARS.textMuted,
                    fontSize: tokens.fontSize.xs,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  All
                  <span style={{ opacity: 0.75 }}>{totalVGCount}</span>
                </button>
                {quickFilterDefs.map((def) => {
                  const isActive = filter?.quickFilters?.includes(def.id);
                  const count = quickFilterCounts?.[def.id];
                  return (
                    <button
                      key={def.id}
                      type="button"
                      onClick={() => filter?.toggleQuickFilter?.(def.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: tokens.spacing.xs,
                        padding: '2px 8px',
                        borderRadius: tokens.radius.md,
                        border: `1px solid ${isActive ? COLOR_VARS.accentCyan : COLOR_VARS.borderSubtle}`,
                        background: isActive ? COLOR_VARS.accentCyanSoft : COLOR_VARS.glassSubtle,
                        color: isActive ? COLOR_VARS.accentCyan : COLOR_VARS.textMuted,
                        fontSize: tokens.fontSize.xs,
                        cursor: 'pointer',
                        flexShrink: 0,
                        opacity: count === 0 ? 0.4 : 1,
                      }}
                    >
                      {def.label}
                      {typeof count === 'number' && (
                        <span style={{ opacity: 0.75 }}>{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>{children}</div>

      {/* Status footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing.md,
          padding: `${tokens.spacing.sm} ${tokens.spacing.sm}`,
          paddingBottom: tokens.spacing.md,
          borderTop: `1px solid ${COLOR_VARS.borderSubtle}`,
          background: COLOR_VARS.glassSubtle,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.xs }}>
          {[
            { icon: 'home', label: 'Go Home', onClick: onGoHome },
            { icon: 'crosshair', label: 'Set Home', onClick: onSetHome },
            { icon: 'bookmark', label: 'Bookmarks', onClick: onAddBookmark },
            { icon: 'settings', label: 'Settings', onClick: onOpenSettings, disabled: !onOpenSettings },
          ].map((action) => (
            <Tooltip key={action.label} content={action.label} placement="top" delay={300}>
              <button
                type="button"
                onClick={action.onClick}
                disabled={action.disabled}
                aria-label={action.label}
                style={{
                  height: 24,
                  width: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: tokens.radius.sm,
                  border: `1px solid ${COLOR_VARS.borderSubtle}`,
                  background: 'transparent',
                  color: COLOR_VARS.textMuted,
                  cursor: action.disabled ? 'not-allowed' : 'pointer',
                  opacity: action.disabled ? 0.4 : 1,
                }}
              >
                <Icon name={action.icon} size={12} />
              </button>
            </Tooltip>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {canvasRows > 0 && canvasCols > 0 && (
          <span
            style={{
              fontSize: '9px',
              color: COLOR_VARS.textTertiary,
              fontFamily: tokens.fontFamily?.mono || 'monospace',
            }}
          >
            {canvasRows}&times;{canvasCols}
          </span>
        )}
        <span
          style={{
            fontSize: '9px',
            color: COLOR_VARS.textMuted,
          }}
        >
          {filteredVGCount !== totalVGCount
            ? `${filteredVGCount} of ${totalVGCount} VGs`
            : `${totalVGCount} VG${totalVGCount !== 1 ? 's' : ''}`}
        </span>
        {totalViewCount > 0 && (
          <span
            style={{
              fontSize: '9px',
              color: COLOR_VARS.textMuted,
            }}
          >
            {totalViewCount} view{totalViewCount !== 1 ? 's' : ''}
          </span>
        )}
        <span
          style={{
            fontSize: '9px',
            color: COLOR_VARS.accentGreen,
          }}
        >
          {activeVGCount} active
        </span>
      </div>
    </div>
  );
});

export default CanvasMapBottomPanel;
