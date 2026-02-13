/**
 * @file ExpansionGutter.stories.jsx
 * @description Storybook stories for the ExpansionGutter (desktop + VR)
 */

import React from 'react';
import { ExpansionGutter } from './ExpansionGutter';

const GRID_DEFAULTS = {
  rows: 6,
  cols: 8,
  cellSize: 36,
  gap: 6,
};

const StoryFrame = ({ isVR, width, height, children }) => (
  <div
    className="canvas-map-v2"
    data-vr={isVR}
    style={{
      width: 520,
      height: 420,
      padding: 24,
      background: '#020406',
      borderRadius: 20,
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <div
      style={{
        position: 'relative',
        width,
        height,
        borderRadius: 16,
        border: '1px solid rgba(148, 163, 184, 0.2)',
        background: 'rgba(15, 23, 42, 0.6)',
        boxShadow: 'inset 0 0 20px rgba(15, 23, 42, 0.6)',
      }}
    >
      {children}
    </div>
  </div>
);

const renderGrid = ({ rows, cols, cellSize, gap }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
      gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
      gap: `${gap}px`,
      padding: 6,
    }}
  >
    {Array.from({ length: rows * cols }).map((_, idx) => (
      <div
        key={`cell-${idx}`}
        style={{
          width: cellSize,
          height: cellSize,
          borderRadius: 8,
          background: 'rgba(148, 163, 184, 0.08)',
          border: '1px solid rgba(148, 163, 184, 0.15)',
        }}
      />
    ))}
  </div>
);

export default {
  title: 'Panels/CanvasMap/Components/ExpansionGutter',
  component: ExpansionGutter,
  argTypes: {
    isVR: { control: 'boolean' },
    rows: { control: { type: 'range', min: 3, max: 10, step: 1 } },
    cols: { control: { type: 'range', min: 3, max: 12, step: 1 } },
    cellSize: { control: { type: 'range', min: 24, max: 64, step: 2 } },
    gap: { control: { type: 'range', min: 2, max: 12, step: 1 } },
    canRemoveRows: { control: 'boolean' },
    canRemoveCols: { control: 'boolean' },
  },
  args: {
    ...GRID_DEFAULTS,
    isVR: false,
    canRemoveRows: true,
    canRemoveCols: true,
  },
};

export const Desktop = {
  args: {
    isVR: false,
  },
  render: (args) => {
    const gridWidth = args.cols * args.cellSize + (args.cols - 1) * args.gap;
    const gridHeight = args.rows * args.cellSize + (args.rows - 1) * args.gap;

    return (
      <StoryFrame isVR={false} width={gridWidth} height={gridHeight}>
        {renderGrid(args)}
        <ExpansionGutter
          gridWidth={gridWidth}
          gridHeight={gridHeight}
          cellSize={args.cellSize}
          onExpand={(direction, action) => {
            console.log('[ExpansionGutter]', direction, action || 'add');
          }}
          canRemoveRows={args.canRemoveRows}
          canRemoveCols={args.canRemoveCols}
          isVR={false}
        />
      </StoryFrame>
    );
  },
};

export const VRMode = {
  args: {
    isVR: true,
    cellSize: 44,
  },
  render: (args) => {
    const gridWidth = args.cols * args.cellSize + (args.cols - 1) * args.gap;
    const gridHeight = args.rows * args.cellSize + (args.rows - 1) * args.gap;

    return (
      <StoryFrame isVR width={gridWidth} height={gridHeight}>
        {renderGrid(args)}
        <ExpansionGutter
          gridWidth={gridWidth}
          gridHeight={gridHeight}
          cellSize={args.cellSize}
          onExpand={(direction, action) => {
            console.log('[ExpansionGutter VR]', direction, action || 'add');
          }}
          canRemoveRows={args.canRemoveRows}
          canRemoveCols={args.canRemoveCols}
          isVR
        />
      </StoryFrame>
    );
  },
};
