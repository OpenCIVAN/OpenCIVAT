/**
 * @file tokens.js
 * @description Design tokens for Canvas Map V2 components
 *
 * These tokens match the SCSS theme system but are available for
 * inline styles in React components. Based on the V2Spec design.
 */

/**
 * Design tokens for CanvasMap V2
 * Matches _colors.scss and _effects.scss from the theme system
 */
export const tokens = {
  colors: {
    bg: {
      base: '#020406',
      primary: '#060a12',
      secondary: '#0c1220',
      tertiary: '#121a2e',
      elevated: '#18223c',
      hover: 'rgba(96, 165, 250, 0.08)',
      active: 'rgba(96, 165, 250, 0.15)',
    },
    glass: {
      subtle: 'rgba(96, 165, 250, 0.04)',
      light: 'rgba(96, 165, 250, 0.06)',
      medium: 'rgba(96, 165, 250, 0.10)',
      strong: 'rgba(96, 165, 250, 0.15)',
      panel: 'rgba(6, 10, 18, 0.85)',
      frosted: 'rgba(12, 18, 32, 0.75)',
    },
    border: {
      subtle: 'rgba(96, 165, 250, 0.10)',
      default: 'rgba(96, 165, 250, 0.18)',
      medium: 'rgba(96, 165, 250, 0.25)',
      focus: 'rgba(59, 130, 246, 0.5)',
      glow: 'rgba(96, 165, 250, 0.25)',
    },
    text: {
      primary: 'rgba(248, 250, 252, 0.95)',
      secondary: 'rgba(203, 213, 225, 0.8)',
      tertiary: 'rgba(148, 163, 184, 0.65)',
      muted: 'rgba(148, 163, 184, 0.6)',
    },
    accent: {
      blue: '#3b82f6',
      cyan: '#22d3ee',
      purple: '#a855f7',
      amber: '#f59e0b',
      green: '#22c55e',
      red: '#ef4444',
      teal: '#14b8a6',
      pink: '#ec4899',
      indigo: '#6366f1',
    },
    canvas: {
      bg: '#030303',
      cell: '#080808',
      cellHover: '#0f0f12',
      gridLine: 'rgba(96, 165, 250, 0.12)',
      gridLineMajor: 'rgba(96, 165, 250, 0.22)',
    },
  },

  radius: {
    xs: '2px',
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    '2xl': '16px',
    full: '9999px',
  },

  fontSize: {
    xs: '9px',
    sm: '10px',
    md: '11px',
    lg: '12px',
    xl: '13px',
    '2xl': '14px',
  },

  spacing: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '20px',
  },

  blur: {
    none: 'none',
    subtle: 'blur(8px)',
    medium: 'blur(12px)',
    strong: 'blur(20px)',
    extreme: 'blur(24px)',
  },

  shadow: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.3)',
    sm: '0 2px 4px rgba(0, 0, 0, 0.4)',
    md: '0 4px 8px rgba(0, 0, 0, 0.5)',
    lg: '0 8px 16px rgba(0, 0, 0, 0.6)',
    xl: '0 12px 24px rgba(0, 0, 0, 0.7)',
    glass: '0 4px 16px rgba(0, 0, 0, 0.4), 0 0 1px rgba(255, 255, 255, 0.1)',
    glassLg: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    depth: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    /**
     * Generate a glow shadow for a given color
     * @param {string} color - Hex color (e.g., '#3b82f6')
     * @returns {string} CSS box-shadow value
     */
    glow: (color) => `0 0 20px ${color}40, 0 0 40px ${color}20`,
    /**
     * Generate a subtle glow for a given color
     * @param {string} color - Hex color
     * @returns {string} CSS box-shadow value
     */
    glowSubtle: (color) => `0 0 12px ${color}30`,
  },

  transition: {
    instant: '0.1s ease',
    fast: '0.15s ease',
    base: '0.2s ease',
    medium: '0.25s ease',
    slow: '0.3s ease',
  },

  zIndex: {
    base: 0,
    dropdown: 1000,
    floating: 1010,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
    notification: 1080,
    maximum: 9999,
  },
};

/**
 * Helper to get accent color with opacity
 * @param {string} accentName - Accent color name (e.g., 'blue', 'purple')
 * @param {number} opacity - Opacity 0-1
 * @returns {string} RGBA color string
 */
export function accentWithOpacity(accentName, opacity = 1) {
  const hex = tokens.colors.accent[accentName];
  if (!hex) return 'transparent';

  // Convert hex to RGB
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Get glassmorphism styles for a panel
 * @param {'subtle' | 'light' | 'medium' | 'strong' | 'panel' | 'frosted'} level
 * @returns {Object} Style object with background, backdrop-filter, border
 */
export function getGlassStyle(level = 'panel') {
  const base = {
    backdropFilter: tokens.blur.strong,
    WebkitBackdropFilter: tokens.blur.strong,
    border: `1px solid ${tokens.colors.border.glow}`,
    boxShadow: tokens.shadow.glass,
  };

  switch (level) {
    case 'subtle':
      return {
        ...base,
        background: tokens.colors.glass.subtle,
        backdropFilter: tokens.blur.subtle,
        WebkitBackdropFilter: tokens.blur.subtle,
      };
    case 'light':
      return {
        ...base,
        background: tokens.colors.glass.light,
        backdropFilter: tokens.blur.medium,
        WebkitBackdropFilter: tokens.blur.medium,
      };
    case 'medium':
      return {
        ...base,
        background: tokens.colors.glass.medium,
      };
    case 'strong':
      return {
        ...base,
        background: tokens.colors.glass.strong,
      };
    case 'frosted':
      return {
        ...base,
        background: tokens.colors.glass.frosted,
      };
    case 'panel':
    default:
      return {
        ...base,
        background: tokens.colors.glass.panel,
      };
  }
}

export default tokens;
