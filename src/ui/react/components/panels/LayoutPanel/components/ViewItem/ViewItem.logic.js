/**
 * ViewItem Logic Hook
 *
 * Manages state for individual view items in the Views subtab.
 * Handles expansion, link properties, and action button states.
 */

import { useState, useCallback, useMemo } from "react";

// Link property definitions
export const LINK_PROPERTIES = [
  { id: "camera", label: "Cam", icon: "Camera" },
  { id: "filters", label: "Filt", icon: "Sliders" },
  { id: "widgets", label: "Widg", icon: "Layout" },
  { id: "cursors", label: "Curs", icon: "Crosshair" },
  { id: "colors", label: "Col", icon: "Palette" },
  { id: "annot", label: "Ann", icon: "Eye" },
];

/**
 * Hook for ViewItem component
 */
export function useViewItem({
  view,
  isExpanded,
  onToggleExpand,
  onAction,
  initialLinkProps = {},
}) {
  // Tooltip text for action buttons
  const [tooltipText, setTooltipText] = useState(null);

  // Link property toggles
  const [linkProps, setLinkProps] = useState(() => ({
    camera: true,
    filters: true,
    cursors: true,
    ...initialLinkProps,
  }));

  // Check if all link properties are enabled
  const allLinked = useMemo(
    () => LINK_PROPERTIES.every((p) => linkProps[p.id]),
    [linkProps]
  );

  // Toggle individual link property
  const toggleLinkProp = useCallback((propId) => {
    setLinkProps((prev) => ({
      ...prev,
      [propId]: !prev[propId],
    }));
  }, []);

  // Toggle all link properties
  const toggleAllLinkProps = useCallback(() => {
    const newState = !allLinked;
    setLinkProps(
      Object.fromEntries(LINK_PROPERTIES.map((p) => [p.id, newState]))
    );
  }, [allLinked]);

  // Set tooltip on hover
  const showTooltip = useCallback((text) => {
    setTooltipText(text);
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltipText(null);
  }, []);

  // Handle expand toggle
  const handleToggleExpand = useCallback(() => {
    onToggleExpand?.(view.id);
  }, [view.id, onToggleExpand]);

  // Handle actions
  const handleAction = useCallback(
    (action) => {
      onAction?.(view.id, action);
    },
    [view.id, onAction]
  );

  return {
    // State
    tooltipText,
    linkProps,
    allLinked,
    isExpanded,

    // Tooltip
    showTooltip,
    hideTooltip,

    // Link properties
    toggleLinkProp,
    toggleAllLinkProps,

    // Actions
    handleToggleExpand,
    handleAction,
  };
}

export default useViewItem;
