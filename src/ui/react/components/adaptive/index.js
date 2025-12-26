/**
 * Adaptive Component System
 *
 * VR-first, desktop-friendly components for CIA Web.
 * All components automatically adapt sizing and interaction patterns
 * based on the current mode (desktop or VR).
 *
 * Usage:
 *
 * import { ModeProvider, useMode, AdaptiveButton } from './components/adaptive';
 *
 * function App() {
 *   return (
 *     <ModeProvider defaultMode="desktop">
 *       <MyComponent />
 *     </ModeProvider>
 *   );
 * }
 */

// Context and tokens
export { ModeProvider, useMode } from "./ModeContext";
export { sizing, iconWeight, getTokens } from "./tokens";

// Components
export { default as Icon } from "./Icon/Icon";
export { iconPaths } from "./Icon/iconPaths";
export { default as AdaptiveButton } from "./AdaptiveButton/AdaptiveButton";
export { default as AdaptiveToggle } from "./AdaptiveToggle/AdaptiveToggle";
export { default as AdaptiveSlider } from "./AdaptiveSlider/AdaptiveSlider";
export { default as AdaptiveSection } from "./AdaptiveSection/AdaptiveSection";
export { default as AdaptiveOptionList } from "./AdaptiveOptionList/AdaptiveOptionList";
export { default as AdaptiveTabs } from "./AdaptiveTabs/AdaptiveTabs";
export { default as AdaptiveCameraGrid } from "./AdaptiveCameraGrid/AdaptiveCameraGrid";

// HeaderSection components
export { CollapsibleHeaderSection } from "./HeaderSection/components/CollapsibleHeaderSection/CollapsibleHeaderSection";
export { DismissibleCard } from "./HeaderSection/components/DismissableCard/DismissibleCard";
export { StatusDot, InfoRow, StatBadge } from "./HeaderSection/components";
