/**
 * @file ExpansionGutter.jsx
 * @description Invisible zones at grid edges that reveal on hover to allow
 * canvas expansion (add row/column).
 */

import React, { memo, useRef, useCallback } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';
import { Tooltip } from '@UI/react/components/atoms/Tooltip';
import './ExpansionGutter.scss';

/**
 * ExpansionGutter — hover zones on grid edges for canvas expansion
 */
export const ExpansionGutter = memo(function ExpansionGutter({
  gridWidth,
  gridHeight,
  cellSize,
  onExpand,
  isEditMode,
  canRemoveRows = true,
  canRemoveCols = true,
  canRemoveTop,
  canRemoveBottom,
  canRemoveLeft,
  canRemoveRight,
  isVR = false,
}) {
  const baseGutter = Math.round(cellSize * (isVR ? 0.7 : 0.4));
  const gutterSize = Math.max(isVR ? 48 : 16, baseGutter);
  const buttonSize = Math.max(isVR ? 44 : 0, Math.round(gutterSize * 0.9));
  const pressStateRef = useRef({});
  const longPressMs = 550;

  const getPressState = useCallback((direction) => {
    if (!pressStateRef.current[direction]) {
      pressStateRef.current[direction] = { timer: null, didLongPress: false };
    }
    return pressStateRef.current[direction];
  }, []);

  const clearPress = useCallback((state) => {
    if (state?.timer) {
      window.clearTimeout(state.timer);
      state.timer = null;
    }
  }, []);

  const handlePointerDown = useCallback((direction) => (event) => {
    if (!isVR) return;
    event.preventDefault();
    const state = getPressState(direction);
    state.didLongPress = false;
    clearPress(state);
    state.timer = window.setTimeout(() => {
      state.didLongPress = true;
      onExpand?.(direction, 'remove');
    }, longPressMs);
  }, [clearPress, getPressState, isVR, onExpand, longPressMs]);

  const handlePointerUp = useCallback((direction) => () => {
    if (!isVR) return;
    const state = getPressState(direction);
    const didLongPress = state.didLongPress;
    clearPress(state);
    if (!didLongPress) {
      onExpand?.(direction, 'add');
    }
  }, [clearPress, getPressState, isVR, onExpand]);

  const handlePointerCancel = useCallback((direction) => () => {
    if (!isVR) return;
    const state = getPressState(direction);
    clearPress(state);
  }, [clearPress, getPressState, isVR]);

  const handleKeyDown = useCallback((direction) => (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (event.shiftKey) {
      onExpand?.(direction, 'remove');
    } else {
      onExpand?.(direction, 'add');
    }
  }, [onExpand]);

  return (
    <div
      className="expansion-gutter"
      style={{
        '--gutter-size': `${gutterSize}px`,
        '--button-size': `${buttonSize}px`,
      }}
    >
      {isVR ? (
        <>
          <div
            className="expansion-gutter__zone expansion-gutter__zone--top"
            style={{ width: gridWidth, height: gutterSize }}
          >
            <Tooltip content="Add row (hold to remove)" placement="bottom" delay={300}>
              <button
                type="button"
                className="expansion-gutter__button expansion-gutter__button--combo"
                onPointerDown={handlePointerDown('top')}
                onPointerUp={handlePointerUp('top')}
                onPointerLeave={handlePointerCancel('top')}
                onPointerCancel={handlePointerCancel('top')}
                onKeyDown={handleKeyDown('top')}
                aria-label="Add row (hold to remove)"
                data-remove-disabled={canRemoveTop === false ? 'true' : undefined}
              >
                <Icon name="plus" size={16} />
                {canRemoveTop !== false && (
                  <span className="expansion-gutter__combo-badge" aria-hidden="true">
                    <Icon name="minus" size={10} />
                  </span>
                )}
              </button>
            </Tooltip>
          </div>

          <div
            className="expansion-gutter__zone expansion-gutter__zone--bottom"
            style={{ width: gridWidth, height: gutterSize, top: gridHeight }}
          >
            <Tooltip content="Add row (hold to remove)" placement="top" delay={300}>
              <button
                type="button"
                className="expansion-gutter__button expansion-gutter__button--combo"
                onPointerDown={handlePointerDown('bottom')}
                onPointerUp={handlePointerUp('bottom')}
                onPointerLeave={handlePointerCancel('bottom')}
                onPointerCancel={handlePointerCancel('bottom')}
                onKeyDown={handleKeyDown('bottom')}
                aria-label="Add row (hold to remove)"
                data-remove-disabled={canRemoveBottom === false ? 'true' : undefined}
              >
                <Icon name="plus" size={16} />
                {canRemoveBottom !== false && (
                  <span className="expansion-gutter__combo-badge" aria-hidden="true">
                    <Icon name="minus" size={10} />
                  </span>
                )}
              </button>
            </Tooltip>
          </div>

          <div
            className="expansion-gutter__zone expansion-gutter__zone--left"
            style={{ width: gutterSize, height: gridHeight }}
          >
            <Tooltip content="Add column (hold to remove)" placement="right" delay={300}>
              <button
                type="button"
                className="expansion-gutter__button expansion-gutter__button--combo"
                onPointerDown={handlePointerDown('left')}
                onPointerUp={handlePointerUp('left')}
                onPointerLeave={handlePointerCancel('left')}
                onPointerCancel={handlePointerCancel('left')}
                onKeyDown={handleKeyDown('left')}
                aria-label="Add column (hold to remove)"
                data-remove-disabled={canRemoveLeft === false ? 'true' : undefined}
              >
                <Icon name="plus" size={16} />
                {canRemoveLeft !== false && (
                  <span className="expansion-gutter__combo-badge" aria-hidden="true">
                    <Icon name="minus" size={10} />
                  </span>
                )}
              </button>
            </Tooltip>
          </div>

          <div
            className="expansion-gutter__zone expansion-gutter__zone--right"
            style={{ width: gutterSize, height: gridHeight, left: gridWidth }}
          >
            <Tooltip content="Add column (hold to remove)" placement="left" delay={300}>
              <button
                type="button"
                className="expansion-gutter__button expansion-gutter__button--combo"
                onPointerDown={handlePointerDown('right')}
                onPointerUp={handlePointerUp('right')}
                onPointerLeave={handlePointerCancel('right')}
                onPointerCancel={handlePointerCancel('right')}
                onKeyDown={handleKeyDown('right')}
                aria-label="Add column (hold to remove)"
                data-remove-disabled={canRemoveRight === false ? 'true' : undefined}
              >
                <Icon name="plus" size={16} />
                {canRemoveRight !== false && (
                  <span className="expansion-gutter__combo-badge" aria-hidden="true">
                    <Icon name="minus" size={10} />
                  </span>
                )}
              </button>
            </Tooltip>
          </div>
        </>
      ) : (
      <>
      {/* Top gutter */}
      <div
        className="expansion-gutter__zone expansion-gutter__zone--top"
        style={{ width: gridWidth, height: gutterSize }}
      >
        <Tooltip content="Add row" placement="bottom" delay={300}>
          <button
            type="button"
            className="expansion-gutter__button expansion-gutter__button--add"
            onClick={() => onExpand?.('top')}
            aria-label="Add row"
          >
            <Icon name="plus" size={12} />
          </button>
        </Tooltip>
        <Tooltip content="Remove row" placement="bottom" delay={300}>
          <button
            type="button"
            className="expansion-gutter__button expansion-gutter__button--remove"
            disabled={!(canRemoveTop ?? canRemoveRows)}
            onClick={() => onExpand?.('top', 'remove')}
            aria-label="Remove row"
          >
            <Icon name="minus" size={12} />
          </button>
        </Tooltip>
      </div>

      {/* Bottom gutter */}
      <div
        className="expansion-gutter__zone expansion-gutter__zone--bottom"
        style={{ width: gridWidth, height: gutterSize, top: gridHeight }}
      >
        <Tooltip content="Add row" placement="top" delay={300}>
          <button
            type="button"
            className="expansion-gutter__button expansion-gutter__button--add"
            onClick={() => onExpand?.('bottom')}
            aria-label="Add row"
          >
            <Icon name="plus" size={12} />
          </button>
        </Tooltip>
        <Tooltip content="Remove row" placement="top" delay={300}>
          <button
            type="button"
            className="expansion-gutter__button expansion-gutter__button--remove"
            disabled={!(canRemoveBottom ?? canRemoveRows)}
            onClick={() => onExpand?.('bottom', 'remove')}
            aria-label="Remove row"
          >
            <Icon name="minus" size={12} />
          </button>
        </Tooltip>
      </div>

      {/* Left gutter */}
      <div
        className="expansion-gutter__zone expansion-gutter__zone--left"
        style={{ width: gutterSize, height: gridHeight }}
      >
        <Tooltip content="Add column" placement="right" delay={300}>
          <button
            type="button"
            className="expansion-gutter__button expansion-gutter__button--add"
            onClick={() => onExpand?.('left')}
            aria-label="Add column"
          >
            <Icon name="plus" size={12} />
          </button>
        </Tooltip>
        <Tooltip content="Remove column" placement="right" delay={300}>
          <button
            type="button"
            className="expansion-gutter__button expansion-gutter__button--remove"
            disabled={!(canRemoveLeft ?? canRemoveCols)}
            onClick={() => onExpand?.('left', 'remove')}
            aria-label="Remove column"
          >
            <Icon name="minus" size={12} />
          </button>
        </Tooltip>
      </div>

      {/* Right gutter */}
      <div
        className="expansion-gutter__zone expansion-gutter__zone--right"
        style={{ width: gutterSize, height: gridHeight, left: gridWidth }}
      >
        <Tooltip content="Add column" placement="left" delay={300}>
          <button
            type="button"
            className="expansion-gutter__button expansion-gutter__button--add"
            onClick={() => onExpand?.('right')}
            aria-label="Add column"
          >
            <Icon name="plus" size={12} />
          </button>
        </Tooltip>
        <Tooltip content="Remove column" placement="left" delay={300}>
          <button
            type="button"
            className="expansion-gutter__button expansion-gutter__button--remove"
            disabled={!(canRemoveRight ?? canRemoveCols)}
            onClick={() => onExpand?.('right', 'remove')}
            aria-label="Remove column"
          >
            <Icon name="minus" size={12} />
          </button>
        </Tooltip>
      </div>
      </>
      )}
    </div>
  );
});

export default ExpansionGutter;
