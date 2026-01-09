# VR Interface Design Specification

**CIA Web - Collaborative Immersive Analytics Platform**

Version 2.0 - January 2025

---

## Document Overview

This specification defines the complete VR interface design for CIA Web, enabling immersive collaborative data analysis. The design supports both standalone VR headsets (Quest 3) and PC-tethered VR (Index, Vive), prioritizing comfort, usability, and seamless collaboration between desktop and VR users.

### Design Principles

- **Comfort first:** No forced head movements, UI within comfortable viewing range
- **Desktop parity:** All desktop features accessible in VR (different interaction, same capability)
- **Spatial awareness:** Use 3D space meaningfully, not just floating 2D panels
- **Collaboration visible:** See other users' presence, cursors, and actions in space
- **Progressive disclosure:** Wrist menu for common actions, summonable panels for complex tasks
- **VR-First unified model:** All UI elements are floating panels; "modals" become priority panels

---

## Implementation Status Summary

| Phase | Components | Status | Priority |
|-------|------------|--------|----------|
| Phase 1: Basic VR | Enter/Exit, Stereo render, Head tracking | ❌ Placeholder | P2 |
| Phase 2: Interaction | Wrist menu, Ray UI, Teleport | ❌ TODO | P2 |
| Phase 3: Spatial UI | Floating panels, Priority panels, View arrangements | ❌ TODO | P3 |
| Phase 4: Collaboration | Avatars, Spatial audio | ❌ TODO | P3 |

**Note:** VR implementation is deferred to Phase 9 of the overall roadmap. Desktop functionality must work first.

---

## ✅ IMPLEMENTED

### VR Controller Placeholder

**Implemented:**
- `VTKVRController.js` - Placeholder file structure
- Basic XR session detection code

**Note from codebase:** This file needs conversion to per-instance pattern when VR is implemented.

---

## Unified Panel Model

### Core Architecture Decision

**All UI in CIA Web uses floating panels.** There are no traditional "modals" - instead, panels operate at two levels:

| Level | Name | Behavior | Use Case |
|-------|------|----------|----------|
| STANDARD | Floating Panel | User-positionable, dismissible | Tools, Help, Shortcuts, Settings, Forms |
| PRIORITY | Priority Panel | Forces decision, follows gaze | Confirmations, Consent, Destructive actions |

This unification means:
- Same component system for Desktop and VR
- Same adaptive sizing (ModeContext)
- Same interaction patterns (just different input methods)
- Contributors only learn one panel system

### Panel Classification

#### PRIORITY Panels (Force Decision)

| Panel | Reason | Special Behavior |
|-------|--------|------------------|
| Delete View | Destructive action | - |
| Close All Views | Bulk action | "Don't ask again" option |
| Delete All Views | Destructive bulk action | Shows list of affected views |
| Leave Room | State change affecting collaboration | - |
| Delete Recording | Destructive, compliance implications | Shows duration/size |
| Delete Note | Destructive | Three buttons: Cancel/Archive/Delete |
| Clear Chat | Admin action, destructive | Audit log note |
| Archive Project | Major state change | Shows impact list |
| Transfer Ownership | Critical admin action | - |
| Delete Project | Maximum danger | Type-to-confirm |
| Recording Consent | Legal/compliance | Gaze-follow, no escape dismiss |
| Merge Conflict Picker | Blocks workflow | Must resolve to continue |
| Form Recovery | Decision needed | "Continue or start fresh?" |

#### STANDARD Panels (Open/Close Freely)

| Panel | Notes |
|-------|-------|
| Help | Reference content |
| Keyboard Shortcuts | Reference content |
| Profile | User settings |
| Create Room | Form, can abandon |
| Invite Member | Form, can abandon |
| Share View | Form, can abandon |
| Global Search | Utility |
| Workspace Picker | Selection |
| Instance Tools | Tool palette |
| Datasets | Data browser |
| Annotations | Annotation list |
| Chat | Communication |
| Notes | Documentation |
| People | Presence |
| Settings | Configuration |

---

## Two VR Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **Instance VR** | Single dataset/view sent to headset while desktop continues working | "Examine this brain scan in VR while keeping analysis tools on monitor" |
| **Application VR** | Entire workspace becomes 3D environment with floating panels | "Walk around my data lab, organize viewports in 3D space" |

---

## Wrist Menu

The wrist menu is the primary control interface in VR, providing quick access to common actions without summoning full panels.

### Activation

| Property | Value |
|----------|-------|
| Trigger | Look at left wrist (palm facing you) for 0.5 seconds |
| Alternative | Double-tap left controller menu button |
| Dismiss | Look away, tap outside menu, or flip wrist away |
| Position | Hovers 5cm above left wrist, faces user, 15cm × 20cm |
| Handedness | Configurable in Settings (default: left wrist, right controller points) |

### Menu Segments

| Segment | Icon | Actions |
|---------|------|---------|
| Tools | Wrench | Pan, Rotate, Scale, Annotate, Measure, Clip Plane, Reset View |
| Voice | Mic | Mute/Unmute, Deafen, Push-to-Talk toggle, Volume slider |
| People | Users | Show/hide avatars, Teleport to user, Invite to VR, List online users |
| Panels | Layout | Summon: Datasets, Annotations, Chat, Notes, Settings panels |
| Exit | DoorOpen | Exit VR (returns to desktop), Passthrough toggle |
| Space | Move | Teleport, Recenter, Scale world, Reset position, Boundary toggle |
| Views | Grid | Arrange views (orbit/wall/table), Add view, Close view, Focus view |
| Record | Video | Start/Stop recording, Screenshot, Add bookmark |
| Center Hub | ⚙ Settings | Quick settings: Comfort mode, Hand size, UI scale, Snap turn |

### What's NOT in Wrist Menu

**Priority panels do NOT appear in the wrist menu.** They are system-initiated interrupts that:
- Spawn directly in front of the user
- Cannot be summoned manually
- Must be addressed before continuing

---

## STANDARD Panel Behavior

2D panels from desktop translate to floating 3D panels in VR. Users can position, resize, and pin panels in their workspace.

### Panel Dimensions & Behavior

| Property | Value |
|----------|-------|
| Default Size | 40cm × 50cm (width × height) in world space |
| Min/Max Size | 20cm × 25cm min, 80cm × 100cm max |
| Default Distance | 1.2m from user (comfortable reading distance) |
| Depth/Thickness | 2cm visual depth (glassmorphism, not flat) |
| Background | Semi-transparent dark `rgba(18, 18, 24, 0.85)` with blur |
| Border | 1px glowing edge (accent color), rounded corners 12px |

### Panel Manipulation

**Grab & Move:**
- Point at panel header bar, grip button to grab
- Move controller to reposition, release grip to place
- Panel maintains orientation facing user unless pinned

**Resize:**
- Grab corner handles (visible on hover) with grip
- Two-handed: grab opposite corners to resize proportionally
- Snap to preset sizes: Small, Medium, Large (thumbstick click while resizing)

**Pin/Lock:**
- Pin button in header locks panel position in world
- Pinned panels don't follow user when they move
- Lock button prevents accidental grabs (admin panels)

**Follow Mode:**
- Toggle in panel header - panel follows user's head position
- Maintains relative position and angle
- Useful for persistent reference panels

### Panel Header

Every STANDARD panel has a consistent header bar:

```
┌─────────────────────────────────────────────┐
│ [Icon] Panel Title           [Pin][Follow][×] │
├─────────────────────────────────────────────┤
│                                             │
│             Panel Content                   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## PRIORITY Panel Behavior

Priority panels demand immediate attention and block other interactions until resolved.

### Spawn Behavior

| Property | Value |
|----------|-------|
| Position | 1.2m directly in front of user, centered in field of view |
| Audio | Spatial "appear" sound on spawn |
| Visual | Other panels dim to 30% opacity |
| Z-Order | Always renders in front of all other panels |

### Gaze-Following Behavior (Configurable)

Priority panels can optionally follow the user's gaze to ensure they can't be ignored.

**Default: ON (recommended)**

| Property | Value |
|----------|-------|
| Activation Threshold | User looks away > 45° for > 0.5s |
| Reposition Animation | Smooth lerp over 300ms (never instant snap) |
| Audio Feedback | Subtle spatial "whoosh" on reposition |
| Position Target | Returns to 1.2m front-center of current view |

**Alternative: Stay in Place**

If gaze-following is disabled in accessibility settings:
- Panel stays at spawn position
- Gentle pulse/glow effect reminds user it's waiting
- No forced repositioning

### Interaction Restrictions

| Property | Behavior |
|----------|----------|
| Movement | Cannot be grabbed/moved by user |
| Resize | Cannot be resized |
| Pin/Follow | Not available (system-controlled) |
| Dismiss | Only via explicit button interaction (Confirm/Cancel) |
| Escape Key | Maps to Cancel button (never "do nothing") |
| Backdrop Click | Disabled (must use buttons) |

### Audio Cues

| Event | Sound |
|-------|-------|
| Panel Appears | Spatial "notification" tone |
| Panel Repositions | Subtle "whoosh" |
| Confirm Action | Positive confirmation chime |
| Cancel Action | Soft dismiss sound |
| Danger Confirm | Warning tone before action |

### Recovery Flow for Abandoned Forms

When a STANDARD panel with unsaved form data is closed and reopened within 2 minutes:

1. System shows a mini PRIORITY panel
2. Message: "You have unsaved changes from a moment ago."
3. Two options:
   - **"Continue where I left off"** → Restores form state
   - **"Start fresh"** → Clears recovery data

After 2 minutes, recovery data expires silently.

---

## Controller Interactions

### Universal Mappings (Both Hands)

| Input | Action | Context |
|-------|--------|---------|
| Trigger (pull) | Select / Confirm / Click | UI buttons, menu items |
| Grip (squeeze) | Grab / Hold | Move panels, grab objects |
| Thumbstick | Navigate / Scroll | Lists, menus, radial selection |
| Thumbstick Click | Confirm / Reset | Snap to preset, reset camera |
| A Button (primary) | Context Action | Tool-dependent |
| B Button (secondary) | Back / Cancel | Exit submenu, cancel action |
| Menu Button | System Menu | Wrist menu (double-tap) |

### Left Controller (Non-Dominant)

| Input | Action |
|-------|--------|
| Grip Hold | Grab world - move yourself through space |
| Thumbstick Left/Right | Snap turn (configurable: 15°, 30°, 45°, smooth) |
| Thumbstick Up/Down | World scale (zoom in/out) |
| Y Button | Toggle tool menu (quick access) |
| X Button | Undo last action |

### Right Controller (Dominant)

| Input | Action |
|-------|--------|
| Trigger | Primary selection, tool action |
| Grip | Grab and manipulate 3D objects/views |
| Thumbstick | Teleport arc (push forward), scroll panels |
| A Button | Confirm teleport, complete annotation |
| B Button | Cancel current action, go back |

### Two-Handed Gestures

| Gesture | Action |
|---------|--------|
| Both Grips + Pull Apart | Scale object/world larger |
| Both Grips + Push Together | Scale object/world smaller |
| Both Grips + Rotate | Rotate object around center point |
| Clap gesture | Reset view to default position |

---

## Avatars & Presence

### Avatar Styles

| Style | Components | Use Case |
|-------|------------|----------|
| **Minimal** | Floating orb with user color + initials | Low distraction |
| **Standard** | Head (orb), hands (controller models) | Default |
| **Full** | Head, torso outline, hands | Maximum presence |

### Spatial Audio

- **Position-based:** Voice comes from avatar's head position in 3D space
- **Distance falloff:** Full volume within 3m, fade to 30% at 10m
- **Override:** Presenter mode broadcasts at full volume regardless of position

---

## Comfort & Accessibility

### Comfort Settings

| Setting | Options | Default |
|---------|---------|---------|
| Snap Turn | Off, 15°, 30°, 45°, 90° | 45° |
| Smooth Turn | Off, Slow, Medium, Fast | Off |
| Teleport Fade | Instant, Quick Fade, Slow Fade | Quick Fade |
| Vignette | Off, Light, Medium, Strong | Light |
| UI Scale | 0.5x - 2.0x | 1.0x |

### Priority Panel Accessibility

| Setting | Options | Default |
|---------|---------|---------|
| Follow Mode | Follow gaze / Stay in place | Follow gaze |
| Follow Sensitivity | Slider (0.3s - 1.0s delay) | 0.5s |
| Reposition Speed | Slider (200ms - 500ms) | 300ms |
| Audio Cues | On / Off | On |

---

## Key Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Modal concept | Replaced with Priority Panels | VR-first, unified component system |
| Gaze-following | Configurable, default ON | Industry standard "loose follow with smoothing" |
| Follow threshold | 45° / 0.5s (adjustable) | Balance attention vs. comfort |
| Reposition animation | 300ms lerp | Never instant snap (disorienting) |
| Audio cues | Yes - appear, reposition, dismiss | Spatial audio for immersion |
| Escape key | Maps to Cancel | Never "do nothing" |
| Form abandonment | Discard silently | Recovery if reopened within 2 min |
| Wrist menu + Priority | Priority NOT in wrist menu | System-initiated, not user-summoned |

---

*--- End of VR Interface Design Specification ---*
