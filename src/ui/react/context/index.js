/**
 * Context exports
 * Location: src/ui/react/context/index.js
 */

export { DevUserProvider, useDevUser } from './DevUserContext.jsx';
export {
    AdaptiveProvider,
    useAdaptive,
    useAdaptiveTokens,
    useIsVR,
    getAdaptiveCSSVars,
    ADAPTIVE_TOKENS,
} from './AdaptiveContext.jsx';

// Drag-to-link context for view linking
export { DragLinkProvider, useDragLink } from './DragLinkContext.jsx';

// Link indicators context for canvas visualization
export {
    LinkIndicatorsProvider,
    useLinkIndicators,
    useLinkIndicatorShortcuts,
    LINK_COLORS,
    STATUS_COLORS,
    ROLE_COLORS,
    PROPERTY_ICONS,
} from './LinkIndicatorsContext.jsx';

// VR interaction context for cross-platform input handling
export {
    VRInteractionProvider,
    useVRInteraction,
    useLinkInteraction,
    useReorderInteraction,
    useMoveInteraction,
    useResizeInteraction,
    useVRControllerInput,
    INTERACTION_INTENTS,
    INPUT_MODES,
    VR_CONTROLLER_MAPPING,
} from './VRInteractionContext.jsx';

// VR accessibility settings context
export {
    VRAccessibilityProvider,
    useVRAccessibility,
    useVRAccessibilitySection,
    DEFAULT_VR_ACCESSIBILITY,
} from './VRAccessibilityContext.jsx';
