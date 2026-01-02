# Claude Code Implementation Prompt - Instance Tools & Canvas System

## Context

I'm building CIA Web, an open-source collaborative immersive analytics platform. This is a React application using VTK.js for 3D visualization, Y.js for real-time collaboration, and WebXR for VR support.

**Read these files first:**
- `docs/prototypes/Instance_Tools_Canvas_System_Implementation.md` - Full implementation specification
- `docs/prototypes/README.md` - Overview of prototype artifacts
- `docs/prototypes/final-cell-explorer.jsx` - Visual reference for instance cell UI
- `docs/prototypes/adaptive-components.jsx` - Visual reference for VR-ready components

## Architecture Principles

1. **Plugin-aware:** Components must work with any InstanceTypeHandler. VTK is the reference implementation.
2. **VR-ready:** Design for both desktop (mouse) and VR (ray/hand controllers). No hover-dependent interactions.
3. **Headless pattern:** Separate logic (.logic.js) from presentation (.jsx)
4. **SASS with tokens:** Use existing `styles/tokens/` - no hard-coded colors/spacing

## Current Codebase Structure

```
src/ui/react/
├── components/
│   ├── workspace/
│   │   ├── Canvas/
│   │   │   ├── CanvasGrid/
│   │   │   └── CanvasCell/
│   │   └── InstanceViewport/
│   │       └── InstanceViewport.jsx  # Needs refactor
│   ├── panels/
│   │   ├── LeftPanel/
│   │   └── RightPanel/
│   └── common/
├── hooks/
│   ├── useViewMetadata.js
│   ├── useInstanceType.js
│   └── useCanvas*.js
└── styles/
    ├── tokens/
    └── mixins/
```

## Implementation Order

### Phase 1: Foundation (Start Here)
1. Create `src/ui/react/contexts/ModeContext.jsx` - Desktop/VR mode switching
2. Create `src/ui/react/components/adaptive/tokens.js` - Mode-specific sizing
3. Create `src/ui/react/components/adaptive/Icon.jsx` - Icon with weight system
4. Update `styles/tokens/_colors.scss` with blue-tinted palette

### Phase 2: Floating Panel Infrastructure
1. Create `src/ui/react/components/common/FloatingPanel/` directory
2. Implement FloatingPanel base component
3. Implement FloatingPanelContext for z-index management
4. Implement useFloatingPanel hook

### Phase 3: Instance Cell Components
1. Refactor `InstanceViewport/InstanceHeader.jsx` with responsive breakpoints
2. Create `InstanceViewport/HeaderMenu.jsx`
3. Refactor `InstanceViewport/InstanceToolbar.jsx` with menu direction logic
4. Create `InstanceViewport/NavigationNotch.jsx` (new component)

### Phase 4: Instance Tools Panel
1. Create `src/ui/react/components/canvas/FloatingPanels/InstanceToolsPanel.jsx`
2. Implement Navigation, Display, Widgets tabs
3. Connect to InstanceTypeHandler for handler-specific content

## Key Design Decisions

### Instance Header
- 6 responsive breakpoints (Full→Micro based on width)
- Color dot = spinner when loading
- 2px underline accent when active
- Menu provides ALL functionality at ANY size

### Instance Toolbar  
- Top-center, appears on hover
- 500ms hide delay after mouse leaves
- Pin button always visible (no layout shift)
- Menus open LEFT if button is right of center, RIGHT if left of center

### Navigation Notch
- Carved edge element (left/bottom/right positions)
- Darker background with inset shadow
- Zoom % is ABSOLUTE (relative to original dataset)
- Click=dropdown, double-click=edit mode

### Adaptive Components
- Desktop: 32px buttons, 16px icons, 2px stroke
- VR: 56px buttons, 22px icons, 1.5px stroke
- Key insight: Large targets ≠ chunky icons

## Testing Commands

```bash
# Start dev server
npm run dev

# Check for TypeScript errors (if applicable)
npm run type-check

# Run tests
npm test
```

## Resolved Design Decisions

| Decision | Choice |
|----------|--------|
| Mode persistence | User preferences DB with localStorage cache |
| Panel position persistence | Global (same everywhere) |
| Desktop VR sizing opt-in | Yes (accessibility feature) |
| Mode switch animation | Animated (250ms ease-out) |

## Questions for Clarification

Before starting, please examine the current codebase:
1. What's the current state of `src/ui/react/components/workspace/InstanceViewport/`?
2. Is there an existing FloatingPanel or Modal component to build on?
3. What styling approach is used (CSS modules, SCSS, styled-components)?
4. Are there existing design tokens in `styles/tokens/`?
5. Is there an existing `useAuth` or user preferences hook to integrate with?

Start by examining these files, then propose an implementation plan for Phase 1.
