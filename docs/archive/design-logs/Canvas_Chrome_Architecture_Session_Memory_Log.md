# Canvas Architecture Design Session Memory Log

**Date:** January 5, 2026  
**Session Focus:** Canvas grid, headers, footers, view stack navigation, and chrome architecture  
**Status:** In Progress - Needs significant structural refinement

---

## Session Summary

This session focused on redesigning the canvas architecture to address usability issues, VR compatibility, and creating a clean chrome structure. Multiple prototypes were created iteratively, with the final prototype having two canvas footers but requiring further refinement.

---

## Critical Bug Fixed

**Header Disappearing Issue**: The original implementation had instance headers disappearing when cells were focused/active, making it impossible to close, rename, or access tools. 

**Solution**: Headers now ALWAYS render and scale responsively based on cell width - they never disappear.

---

## Confirmed Design Decisions

### 1. Instance Header (Cleaned Up)

**REMOVED:**
- Wrench button (Instance Tools) - redundant, accessible via activity bar, keypress T, or within instance

**KEPT:**
- Label badge (color dot + name)
- More (⋯) button for advanced options
- Focus button (target icon)
- Close (X) button

**ADDED:**
- Live collaborator indicator (pulsing green dot + count)

**Responsive Scaling** (Headers ALWAYS visible):
| Cell Width | Header Contents |
|------------|-----------------|
| ≥200px | Live indicator + Label + More + Focus + Close |
| 150-200px | Label + More + Focus + Close |
| 100-150px | Label + Focus + Close |
| <100px | Tiny label + Focus + Close |

### 2. Render Mode Thresholds - ELIMINATED

**User's Decision**: No progressive UI degradation based on cell size. Headers ALWAYS render responsively. If user makes cells too small to be usable, that's their choice.

**Exception**: Instance toolbar only works when cell ≥200px wide. Below that, users must use Focus mode or activity bar.

### 3. Canvas View Stack (Replaces Modal Isolation)

**Why**: Modals don't work in VR and break spatial context.

**Architecture**: Navigation stack like browser history:
```
Stack: [Grid View] → [Focused Cell] → [Subset View] → [Focused from Subset]
       ↑ Back (Esc) navigates backward through stack
```

**Interactions:**
- Double-click cell → Focus mode (single cell takes over canvas)
- Double-click subset card → Subset view (2×2 or 3×3 grid takes over canvas)
- From subset, double-click cell → Focus that cell
- Back/Esc → Navigate backward through stack
- Home → Return to grid view (index 0)

### 4. Subsets as First-Class Citizens

**Confirmed Features:**
- Saveable (can be named and recalled)
- Shareable (team members can join/see)
- Render on canvas as SubsetCard with preview grid
- Opening pushes subset view onto stack
- Subset sizes: 2×2 (4 views) or 3×3 (9 views)
- Can select non-adjacent views via Subset Picker

### 5. Panel Behavior

**Confirmed:**
- Panels OVERLAY the canvas (don't resize it)
- Edge triggers: Hover near edge reveals clickable tab
- When focusing a cell, panels COLLAPSE to edge triggers
- Access via edge hover or keyboard shortcut

### 6. Canvas Chrome Ownership

**Confirmed**: Secondary header/footer are PART OF THE CANVAS, not app-level bars.

### 7. Grid Presets

**Confirmed**: 1×2, 2×2, 2×3, 3×3, 3×4, 4×4, 5×5, 10×10 (max 10×10)

### 8. Zoom

**Confirmed**: 50%, 75%, 100%, 125%, 150%, 200%

### 9. Subset Mode Constraints

**Confirmed**: Disable subset mode if canvas too small (<600×500px). Show "Send to VR" option instead.

### 10. Interaction Behaviors (From Last Message)

| Question | Decision |
|----------|----------|
| Esc behavior | Go back / exit current context (at root, deselect active cell) |
| Transition animation | Zoom animation |
| Panel persistence | Collapse to edge triggers when focusing |
| Instance Tools auto-focus | Yes, auto-focus if cell too small |

---

## Current Architecture (Needs Refinement)

### Canvas Header (Navigation & Layout)
| Section | Contents |
|---------|----------|
| Left | Back, Home, Bookmark, Breadcrumb |
| Center | Flow direction (→/↓), Canvas size (steppers + preset), Viewport size, Zoom |
| Right | Fullscreen toggle |

### Canvas Info Footer (Status - Compact)
| Section | Contents |
|---------|----------|
| Left | Cell dimensions, Canvas size |
| Right | Subset warning, Collaborator count, Sync status |

### Canvas Toolbar Footer (Actions)
| Section | Contents |
|---------|----------|
| Left | Undo/Redo, View Mode toggle (Grid/Focus/Subset), Mode hint |
| Center | Active View widget (single line with dropdown) |
| Right | Subset picker (in subset mode), Links dropdown, Snapshot, Copy, Settings |

---

## Known Issues / Needs Work

### 1. **Header Too Crowded**
User feedback: "There is too much at the top and now we lost navigation :("
- Too many controls crammed into canvas header
- Navigation got lost in the clutter
- Need to reconsider what goes where

### 2. **Edit Tools Placement**
- Were moved to header, should be moved back to footer
- Consider whether they belong in toolbar footer or separate

### 3. **View Context Integration**
User referenced screenshots showing:
- ACTIVE VIEW section with view name, dataset, and visibility toggle
- Links dropdown with checkboxes (camera, filters, widgets, cursors)
- Snapshot button
- Settings gear

Current implementation has these in toolbar footer but layout needs refinement.

### 4. **Two Footer Clarity**
Currently have:
- Canvas Info Footer (status bar)
- Canvas Toolbar Footer (action bar)

Need to clarify:
- Is this the right separation?
- What exactly goes in each?
- Should there be visual hierarchy between them?

### 5. **Flow Direction Control**
- Implemented toggle (row/column) for adding new views
- Needs validation this is the right UX

### 6. **Viewport vs Canvas Distinction**
- Canvas Size = total grid dimensions (e.g., 10×10)
- Viewport Size = visible portion (e.g., 3×3)
- This distinction may be confusing to users

---

## Artifacts Created This Session

1. `/mnt/user-data/outputs/canvas-design-prototype.jsx` - Initial prototype
2. `/mnt/user-data/outputs/canvas-focus-overlay-prototype.jsx` - Focus mode overlay concept
3. `/mnt/user-data/outputs/canvas-floating-architecture-prototype.jsx` - Floating canvas concept
4. `/mnt/user-data/outputs/canvas-view-stack-prototype.jsx` - View stack navigation
5. `/mnt/user-data/outputs/canvas-stack-v2.jsx` - Fixed blank page issue
6. `/mnt/user-data/outputs/canvas-complete-v3.jsx` - Added zoom, grid presets, constraints
7. `/mnt/user-data/outputs/canvas-dual-footer-v4.jsx` - Two footer architecture (LATEST)

---

## Reference: Existing Design Specs in Project

- `Canvas_Area_Design_Specification.md` - Original canvas spec
- `Header_Footer_Bars_Design_Specification.md` - Bar architecture
- Screenshots referenced showing current View Context implementation

---

## Next Steps for New Chat

1. **Review the current prototype** (`canvas-dual-footer-v4.jsx`) and identify specific pain points
2. **Restructure the canvas chrome** - clarify header vs footer responsibilities
3. **Reference existing implementation** - Look at current View Context (Image 1 & 2 from user) for guidance
4. **Consider mobile/responsive** - How does this work on smaller screens?
5. **VR mode implications** - How do these controls translate to VR?

---

## Key Principles to Maintain

1. **Plugin-aware**: Generic components that work with any InstanceTypeHandler
2. **VR-first mindset**: No modals, use spatial navigation (view stack)
3. **User autonomy**: Let users resize however they want, even if unusable
4. **Headers always visible**: Responsive scaling, never disappear
5. **Subsets first-class**: Saveable, shareable, renderable on canvas
6. **Panels overlay**: Don't resize canvas, collapse to edge triggers when focusing

---

## Prompt to Continue

```
Continue working on the Canvas Architecture from the memory log in project knowledge. The last prototype was canvas-dual-footer-v4.jsx. Key issues:
1. Header is too crowded, lost navigation
2. Edit tools should be in footer, not header  
3. Need to reference the View Context screenshots for guidance on toolbar footer layout
4. Two-footer approach needs refinement

Please review the memory log and latest prototype, then propose a cleaner structure for the canvas chrome (header + two footers).
```
