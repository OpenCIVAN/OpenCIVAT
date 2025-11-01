// src/ui/react/theme.js
// Centralized theme for consistent styling across all components

export const theme = {
  colors: {
    // Background colors
    background: {
      primary: "#1a1a1a",
      secondary: "#242424",
      tertiary: "#2a2a2a",
      hover: "#2a2a2a",
      dark: "#0a0a0a",
    },

    // Border colors
    border: {
      default: "#333",
      hover: "#666",
      active: "#4CAF50",
      focus: "#4CAF50",
    },

    // Text colors
    text: {
      primary: "#e0e0e0",
      secondary: "#aaa",
      tertiary: "#999",
      disabled: "#666",
      hint: "#555",
    },

    // Accent colors
    accent: {
      primary: "#4CAF50",
      secondary: "#2196F3",
      warning: "#FFA726",
      error: "#f44336",
      info: "#00BCD4",
      purple: "#9C27B0",
    },

    // Tool-specific colors
    tools: {
      files: "#2196F3",
      visualize: "#9C27B0",
      analyze: "#FF9800",
      transform: "#4CAF50",
      annotate: "#F44336",
      measure: "#00BCD4",
    },

    // Status colors
    status: {
      success: "#4CAF50",
      warning: "#FFA726",
      error: "#f44336",
      info: "#2196F3",
      loading: "#9C27B0",
    },
  },

  spacing: {
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "20px",
    xxl: "24px",
  },

  borderRadius: {
    sm: "4px",
    md: "6px",
    lg: "8px",
    xl: "12px",
  },

  fontSize: {
    xs: "10px",
    sm: "11px",
    md: "13px",
    base: "14px",
    lg: "16px",
    xl: "18px",
    xxl: "24px",
  },

  shadows: {
    sm: "0 2px 4px rgba(0,0,0,0.2)",
    md: "0 4px 8px rgba(0,0,0,0.3)",
    lg: "0 8px 16px rgba(0,0,0,0.4)",
    xl: "0 12px 24px rgba(0,0,0,0.5)",
  },

  transitions: {
    fast: "0.1s",
    normal: "0.2s",
    slow: "0.3s",
  },
};

// Helper function to get nested theme values
export function getThemeValue(path) {
  return path.split(".").reduce((obj, key) => obj?.[key], theme);
}

// Commonly used style objects
export const commonStyles = {
  button: {
    base: {
      padding: theme.spacing.md,
      backgroundColor: theme.colors.background.secondary,
      border: `1px solid ${theme.colors.border.default}`,
      borderRadius: theme.borderRadius.md,
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.md,
      cursor: "pointer",
      transition: `all ${theme.transitions.normal}`,
      outline: "none",
    },

    hover: {
      backgroundColor: theme.colors.background.hover,
      borderColor: theme.colors.border.hover,
    },

    active: {
      borderColor: theme.colors.accent.primary,
      backgroundColor: theme.colors.background.tertiary,
    },
  },

  panel: {
    base: {
      backgroundColor: theme.colors.background.secondary,
      border: `1px solid ${theme.colors.border.default}`,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.lg,
    },
  },

  input: {
    base: {
      padding: `${theme.spacing.md} ${theme.spacing.lg}`,
      backgroundColor: theme.colors.background.dark,
      border: `2px solid ${theme.colors.border.default}`,
      borderRadius: theme.borderRadius.md,
      color: theme.colors.text.primary,
      fontSize: theme.fontSize.base,
      outline: "none",
      transition: `border-color ${theme.transitions.normal}`,
    },

    focus: {
      borderColor: theme.colors.border.focus,
    },
  },
};
