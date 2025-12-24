/**
 * Adaptive Component System - Sizing Tokens
 *
 * VR-first, desktop-friendly sizing system.
 * Key insight: Large touch targets ≠ chunky icons.
 * VR buttons are bigger but icons use thinner strokes for elegance.
 */

export const sizing = {
  desktop: {
    // Touch targets
    buttonHeight: 32,
    buttonHeightLg: 40,
    touchTarget: 24,

    // Spacing
    gap: 8,
    gapLg: 12,
    padding: 12,
    paddingLg: 16,

    // Typography
    fontSize: 13,
    fontSizeLg: 14,

    // Icons
    iconSize: 16,
    iconSizeLg: 20,
  },

  vr: {
    // Touch targets - larger for VR controllers
    buttonHeight: 56,
    buttonHeightLg: 72,
    touchTarget: 44,

    // Spacing - more generous
    gap: 16,
    gapLg: 24,
    padding: 20,
    paddingLg: 28,

    // Typography - readable at distance
    fontSize: 18,
    fontSizeLg: 22,

    // Icons - larger but thinner
    iconSize: 28,
    iconSizeLg: 36,
  },
};

/**
 * Icon stroke weights
 * VR uses thinner strokes despite larger size for elegance
 */
export const iconWeight = {
  desktop: {
    thin: 1.5,
    light: 1.75,
    regular: 2,
    medium: 2.25,
    bold: 2.5,
  },
  vr: {
    thin: 1,
    light: 1.25,
    regular: 1.5,
    medium: 1.75,
    bold: 2,
  },
};

/**
 * Get sizing tokens for current mode
 */
export const getTokens = (mode = "desktop") => ({
  ...sizing[mode],
  iconWeight: iconWeight[mode],
});

export default { sizing, iconWeight, getTokens };
