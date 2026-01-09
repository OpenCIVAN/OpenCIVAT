# VR Interface Design Specification

**CIA Web - Collaborative Immersive Analytics Platform**

Version 1.0 - December 2024

---

## Document Overview

This specification defines the complete VR interface design for CIA Web, enabling immersive collaborative data analysis. The design supports both standalone VR headsets (Quest 3) and PC-tethered VR (Index, Vive), prioritizing comfort, usability, and seamless collaboration between desktop and VR users.

### Design Principles

- **Comfort first:** No forced head movements, UI within comfortable viewing range
- **Desktop parity:** All desktop features accessible in VR (different interaction, same capability)
- **Spatial awareness:** Use 3D space meaningfully, not just floating 2D panels
- **Collaboration visible:** See other users' presence, cursors, and actions in space
- **Progressive disclosure:** Wrist menu for common actions, summonable panels for complex tasks

---

## Implementation Status Summary

| Phase | Components | Status | Priority |
|-------|------------|--------|----------|
| Phase 1: Basic VR | Enter/Exit, Stereo render, Head tracking | ❌ Placeholder | P2 |
| Phase 2: Interaction | Wrist menu, Ray UI, Teleport | ❌ TODO | P2 |
| Phase 3: Spatial UI | Floating panels, View arrangements | ❌ TODO | P3 |
| Phase 4: Collaboration | Avatars, Spatial audio | ❌ TODO | P3 |

**Note:** VR implementation is deferred to Phase 9 of the overall roadmap. Desktop functionality must work first.

---

## ✅ IMPLEMENTED

### VR Controller Placeholder

**Implemented:**
- `VTKVRController.js` - Placeholder file structure
- Basic XR session detection code

**Note from codebase:** This file needs conversion to per-instance pattern when VR is implemented. Currently uses singleton pattern (should be per-instance) and is missing integration with VTKInstanceHandler.

---

## ❌ REMAINING TO IMPLEMENT

### Two VR Modes

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

### Menu Layout

*Radial menu with center hub and 8 segments:*

```
[Tools] [Voice] [People] [Views] [⚙] [Panels] [Space] [Exit] [Record]
```

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

### Interaction

- **Selection:** Point with right controller ray, trigger to select
- **Hover feedback:** Segment highlights, icon enlarges, haptic pulse
- **Submenus:** Selecting segment with submenu expands it radially outward
- **Back navigation:** B button or select center hub returns to main menu
- **Accessibility:** Can also navigate with thumbstick (8 directions + center press)

### Status Indicators

The wrist menu shows persistent status even when collapsed:
- **Mic status:** Green glow = unmuted, Red glow = muted, Pulsing = speaking
- **Recording:** Red dot on wrist band when recording active
- **People count:** Small badge showing online users in workspace
- **Notifications:** Pulse/glow for unread messages, mentions

---

## Spatial UI Panels

2D panels from desktop translate to floating 3D panels in VR. Users can position, resize, and pin panels in their workspace.

### Panel Types

| Panel | Default Position | Content |
|-------|------------------|---------|
| Datasets | Left, 45° off-center | Dataset tree, view list, drag to spawn |
| Annotations | Right, 45° off-center | Annotation list, create tools, filters |
| Chat | Lower left peripheral | Message thread, voice transcription, reactions |
| Notes | Right peripheral | Rich text notes, collaborative editing |
| People | Above, slight tilt down | Online users, presence indicators, quick actions |
| Settings | Center, close to user | VR comfort settings, audio, display options |
| Instance Tools | Attached to active view | Tool palette for current visualization |

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

Every panel has a consistent header bar:

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

## Controller Interactions

Consistent controller mappings across all VR interactions. Design supports Quest Touch, Index Knuckles, and Vive wands.

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
| Grip Hold | Grab world - move yourself through space (alternative to teleport) |
| Trigger | Secondary selection (multi-select, range select) |
| Thumbstick Left/Right | Snap turn (configurable: 15°, 30°, 45°, smooth) |
| Thumbstick Up/Down | World scale (zoom in/out) |
| Y Button | Toggle tool menu (quick access) |
| X Button | Undo last action |

### Right Controller (Dominant)

| Input | Action |
|-------|--------|
| Trigger | Primary selection, tool action (draw annotation, place point) |
| Grip | Grab and manipulate 3D objects/views |
| Thumbstick | Teleport arc (push forward), scroll panels (when pointing at panel) |
| A Button | Confirm teleport, complete annotation |
| B Button | Cancel current action, go back |

### Two-Handed Gestures

| Gesture | Action |
|---------|--------|
| Both Grips + Pull Apart | Scale object/world larger |
| Both Grips + Push Together | Scale object/world smaller |
| Both Grips + Rotate | Rotate object around center point |
| Both Triggers (hold) | Draw annotation with both hands (line between controllers) |
| Clap gesture | Reset view to default position (with haptic confirm) |

### Voice Commands (Optional)

Voice commands supplement controller input when hands are occupied:
- "Menu" - Open wrist menu
- "Reset" - Reset view to default
- "Screenshot" - Capture current view
- "Mute" / "Unmute" - Toggle microphone
- "Exit VR" - Return to desktop mode

*Note: Voice commands require push-to-talk off and voice command toggle enabled in Settings.*

---

## Avatars & Presence

Collaborative VR requires visible representation of other users to enable spatial awareness and non-verbal communication.

### Avatar Styles

| Style | Components | Use Case |
|-------|------------|----------|
| **Minimal** | Floating orb with user color + initials | Low distraction, performance-focused |
| **Standard** | Head (orb), hands (controller models) | Default - shows what user is doing |
| **Full** | Head, torso outline, hands | Maximum presence, formal presentations |

### Avatar Components

**Head Representation:**
- **Shape:** Spherical orb (15cm diameter) or stylized helmet
- **Color:** User's assigned color from presence system
- **Face:** Initials on front, or simple eyes that blink
- **Speaking indicator:** Glowing ring around head when speaking
- **Name tag:** Floating above head, always faces viewer

**Hand Representation:**
- **Default:** Stylized controller model matching headset type
- **With hand tracking:** Abstract hand silhouette (not realistic)
- **Color:** Matching user color, slightly desaturated
- **Pointer ray:** Visible when user is pointing at something

### Presence Indicators

| State | Visual |
|-------|--------|
| Speaking | Pulsing glow around head, audio-reactive intensity |
| Pointing | Laser pointer visible to all users, with endpoint dot |
| Annotating | Pen/brush visible in hand, trails show briefly |
| Grabbing | Tether line from hand to grabbed object |
| Teleporting | Ghost silhouette at destination before teleport |
| Away/Idle | Avatar becomes translucent after 30 seconds of no movement |

### Spatial Audio

- **Position-based:** Voice comes from avatar's head position in 3D space
- **Distance falloff:** Configurable (default: full volume within 3m, fade to 30% at 10m)
- **Direction:** Audio pans based on speaker's position relative to listener
- **Override:** Presenter mode broadcasts at full volume regardless of position
- **Settings:** Can disable spatial audio for flat voice experience

---

## View Arrangements in VR

In Application VR mode, multiple views/instances can be arranged in 3D space using preset layouts or custom positioning.

### Preset Layouts

| Layout | Description | Best For |
|--------|-------------|----------|
| **Orbit** | Views circle around user at arm's reach | Quick comparison, few views (3-6) |
| **Wall** | Flat grid in front of user like monitors | Desktop-like experience, many views |
| **Table** | Views laid flat on virtual table below | Collaborative review, map-like data |
| **Dome** | Views on inside surface of sphere | Immersive, many views, presentation |
| **Focus** | One large view centered, others small periphery | Deep analysis with reference views |
| **Freeform** | User places views anywhere in space | Custom workflows, persistent setups |

### View Manipulation

- **Spawn:** Drag from Datasets panel into space, or double-click to spawn at default position
- **Move:** Grip view border to grab, move controller, release to place
- **Resize:** Grab corners with grip, pull/push to resize
- **Focus:** Double-tap trigger on view to bring to center and enlarge
- **Close:** X button in corner, or throw view away quickly (with haptic confirm)
- **Duplicate:** Pull view with both hands (like tearing paper)

### Instance Tools in VR

When interacting with a 3D visualization:
- **Orbit:** Grip + move controller around object
- **Pan:** Grip + thumbstick direction
- **Zoom:** Two-handed pinch/pull gesture
- **Clip plane:** Flat hand gesture to create slice, move hand to adjust
- **Annotate:** Trigger to place point, hold + move to draw line
- **Measure:** Point at start, trigger, point at end, trigger (shows distance)

---

## Comfort & Accessibility

VR comfort settings are critical for extended use and preventing motion sickness.

### Comfort Settings

| Setting | Options | Default |
|---------|---------|---------|
| Snap Turn | Off, 15°, 30°, 45°, 90° | 45° |
| Smooth Turn | Off, Slow, Medium, Fast | Off |
| Teleport Fade | Instant, Quick Fade, Slow Fade | Quick Fade |
| Vignette | Off, Light, Medium, Strong | Light |
| Seated Mode | On/Off | Auto-detect |
| Floor Height | Slider (0.5m - 2m) | 1.6m |
| UI Scale | 0.5x - 2.0x | 1.0x |
| Hand Size | Small, Medium, Large | Medium |

### Accessibility Features

- **One-handed mode:** All actions possible with single controller
- **Voice control:** Common actions via voice commands (see 4.5)
- **High contrast mode:** Increases UI element visibility
- **Text size:** Scalable panel text (independent of UI scale)
- **Color blind modes:** Deuteranopia, Protanopia, Tritanopia adjustments
- **Haptic feedback:** Configurable intensity or off
- **Audio cues:** Sound feedback for actions (selection, errors, notifications)

---

## Implementation Phases

### Phase 1: Basic VR (Foundation)
1. Enter/Exit VR from desktop
2. Stereo rendering with head tracking
3. Controller visualization and basic input
4. Single view rendering in Instance VR mode

### Phase 2: Interaction
1. Wrist menu implementation
2. Ray-based UI interaction
3. Teleportation and snap turn
4. Object manipulation (grab, rotate, scale)
5. Annotation creation in VR

### Phase 3: Spatial UI
1. Floating panel system
2. Panel manipulation (move, resize, pin)
3. View arrangement presets
4. Application VR mode

### Phase 4: Collaboration
1. Avatar representation
2. Presence synchronization
3. Spatial audio integration
4. Shared annotations visible in VR

---

## Technical Requirements

### Supported Hardware

**Standalone:**
- Meta Quest 2, Quest 3, Quest Pro
- Pico 4 (future consideration)

**PC-Tethered:**
- Valve Index
- HTC Vive, Vive Pro
- Windows Mixed Reality headsets

### WebXR Requirements

- Browser: Chrome, Edge (WebXR support required)
- HTTPS required for WebXR API access
- Feature policy must allow XR sessions

### Performance Targets

| Metric | Target |
|--------|--------|
| Frame Rate | 72fps minimum, 90fps preferred |
| Latency | < 20ms motion-to-photon |
| Render Resolution | 1.0x native per-eye |
| Draw Calls | < 200 per frame |

---

*--- End of VR Interface Design Specification ---*
