// src/ui/react/components/LeftToolbar.jsx
// Updated with styled cursor toggle button

import React, { useState } from 'react';
import { hideMyCursor } from '../../../collaboration/cursors.js';
import { theme } from '../theme.js';
import Icon from './Icon.jsx';

const TOOLS = [
  { id: 'files', icon: '📁', label: 'Files', color: theme.colors.tools.files },
  { id: 'visualize', icon: '🎨', label: 'Visualize', color: theme.colors.tools.visualize },
  { id: 'analyze', icon: '📊', label: 'Analyze', color: theme.colors.tools.analyze },
  { id: 'transform', icon: '🔧', label: 'Transform', color: theme.colors.tools.transform },
  { id: 'annotate', icon: '💬', label: 'Annotate', color: theme.colors.tools.annotate },
  { id: 'measure', icon: '📐', label: 'Measure', color: theme.colors.tools.measure },
];

export default function LeftToolbar({ onToolSelect, activeTool }) {
  return (
    <div style={{
      width: '60px',
      backgroundColor: theme.colors.background.secondary,
      borderRight: `1px solid ${theme.colors.border.default}`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: `${theme.spacing.md} 0`,
      gap: theme.spacing.xs,
      flexShrink: 0
    }}>
      {/* Tool Buttons */}
      {TOOLS.map(tool => (
        <ToolButton
          key={tool.id}
          tool={tool}
          isActive={activeTool === tool.id}
          onClick={() => onToolSelect(tool.id)}
        />
      ))}

      {/* Separator */}
      <div style={{
        width: '40px',
        height: '1px',
        backgroundColor: theme.colors.border.default,
        margin: `${theme.spacing.sm} 0`
      }} />

      {/* Cursor Toggle - matches other buttons */}
      <CursorToggle />
    </div>
  );
}

function ToolButton({ tool, isActive, onClick }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      title={tool.label}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: '45px',
        height: '45px',
        backgroundColor: isActive
          ? theme.colors.background.tertiary
          : (isHovered ? theme.colors.background.hover : 'transparent'),
        border: isActive
          ? `2px solid ${tool.color}`
          : '2px solid transparent',
        borderRadius: theme.borderRadius.lg,
        cursor: 'pointer',
        fontSize: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: `all ${theme.transitions.normal}`,
        position: 'relative',
        outline: 'none'
      }}
    >
      {tool.icon}
    </button>
  );
}

function CursorToggle() {
  const [cursorHidden, setCursorHidden] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleToggle = () => {
    const newState = !cursorHidden;
    setCursorHidden(newState);
    hideMyCursor(newState);
  };

  return (
    <button
      onClick={handleToggle}
      title={cursorHidden ? 'Show My Cursor' : 'Hide My Cursor'}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: '45px',
        height: '45px',
        backgroundColor: isHovered ? theme.colors.background.hover : 'transparent',
        border: `2px solid ${cursorHidden ? theme.colors.accent.warning : 'transparent'}`,
        borderRadius: theme.borderRadius.lg,
        cursor: 'pointer',
        fontSize: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: `all ${theme.transitions.normal}`,
        outline: 'none',
        position: 'relative'
      }}
    >
      {/* Eye icon - closed if hidden, open if shown */}
      {cursorHidden ? <Icon key={'cursorOff'} name={'cursorOff'} size={32} color="#ff6666" strokeWidth={1} /> :
        <Icon key={'cursorOn'} name={'cursorOn'} size={32} color="#4CAF50" strokeWidth={1} />}
    </button>
  );
}

// TODO: Eventually move cursor toggle to:
// - Settings panel (with other view preferences)
// - Or a "View Options" submenu in the toolbar
// Current location is temporary for easy access during development