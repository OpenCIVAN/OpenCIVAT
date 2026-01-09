# Modals vs Floating Panels - Design Session Memory Log

**Date:** January 4, 2025  
**Session Focus:** VR-first unified panel architecture, replacing modal concept  
**Status:** Design specifications complete

---

## Executive Summary

This session established a **unified floating panel model** for CIA Web that eliminates the traditional "modal" concept in favor of a VR-first architecture where all UI elements are floating panels with two priority levels.

**Key Insight:** "Modals" aren't about 2D overlay mechanics—they're about **forcing a decision**. In VR, this translates to priority panels that follow the user's gaze.

---

## Core Architectural Decisions

### 1. Unified Panel Model

**Decision:** All UI uses FloatingPanel component with `priority` prop

| Level | Name | Behavior | Examples |
|-------|------|----------|----------|
| STANDARD | Floating Panel | User-positionable, dismissible | Tools, Help, Shortcuts, Forms |
| PRIORITY | Priority Panel | Forces decision, follows gaze | Confirmations, Consent, Destructive actions |

**Rationale:**
- Same component system for Desktop and VR
- Contributors learn one panel system
- Adaptive sizing via ModeContext
- No conceptual mismatch

### 2. Priority Panels Do NOT Appear in Wrist Menu

**Decision:** Priority panels are system-initiated interrupts, not user-summoned

**Rationale:** They represent workflow interruptions that cannot be bypassed

### 3. Gaze-Following for Priority Panels

**Decision:** Configurable, default ON

| Property | Value |
|----------|-------|
| Threshold | User looks away > 45° for > 0.5s |
| Animation | Smooth lerp over 300ms |
| Audio | Subtle "whoosh" on reposition |
| Alternative | "Stay in place" with gentle glow reminder |

**Source:** Meta's official VR design guidance recommends "loose follow with smoothing" rather than head-locked UI

### 4. Escape Key Behavior

**Decision:** Escape maps to Cancel button (never "do nothing")

**Rationale:** Predictable behavior across all panels

### 5. Form Abandonment & Recovery

**Decision:** Discard silently on close; if reopened within 2 minutes, offer recovery

**Flow:**
1. User closes form panel with unsaved changes → saved to sessionStorage
2. User reopens same panel within 2 minutes
3. Mini priority panel: "Continue where I left off" or "Start fresh"
4. After 2 minutes, recovery data expires silently

**Rationale:** Avoids extra clicks for intentional abandonment while supporting accidental closure

### 6. Reclassified "Modals"

| Previous Name | New Classification | Notes |
|---------------|-------------------|-------|
| Help Modal | STANDARD Panel | Reference, open/close freely |
| Shortcuts Modal | STANDARD Panel | Reference, open/close freely |
| Profile Modal | STANDARD Panel | Settings |
| Create Room Modal | STANDARD Panel | Form, can abandon |
| Invite Member Modal | STANDARD Panel | Form, can abandon |
| Share View Modal | STANDARD Panel | Form, can abandon |
| Global Search Modal | STANDARD Panel | Utility |
| All Confirmation Dialogs | PRIORITY Panel | Force decision |
| Recording Consent | PRIORITY Panel | Legal, no escape dismiss |

---

## Documents Created

### 1. VR_Interface_Design_Specification_v2.md
Updated VR interface specification with:
- Unified Panel Model explanation
- Panel classification table
- Priority panel spawn/follow behavior
- Gaze-following configuration
- Audio cue specifications
- Key decisions summary

### 2. FloatingPanel_Component_Specification.md
Comprehensive component specification with:
- Full TypeScript props interface
- File organization structure
- Desktop implementation (position, focus, keyboard)
- VR implementation (gaze tracking, audio cues)
- Styling with CSS custom properties
- Convenience wrappers (PriorityPanel, ConfirmationDialog)
- Form recovery hook
- Position persistence strategy
- Usage examples
- Migration guide from Modal

### 3. VR_Accessibility_Settings_Panel_Specification.md
Complete accessibility settings panel design:
- **Movement Tab:** Snap turn, smooth turn, teleportation, vignette
- **Panels Tab:** Priority panel follow mode, sensitivity, animation speed
- **Visual Tab:** UI scale, text size, high contrast, color blindness
- **Audio Tab:** Audio cues, spatial audio, voice announcements
- **Input Tab:** Handedness, one-handed mode, haptics, voice commands
- Full TypeScript settings schema
- Default values

---

## Research Findings

From web search on VR UI patterns:

1. **Meta's official guidance:** "Avoid locking HUD style content to the user's head movements. Anchor information and digital content to a space, or loosely follow the user using smoothing animation."

2. **For modal dialogs:** "When displaying a modal UI, virtual content must be dimmed or hidden so that the user does not feel confused regarding the depth of objects."

3. **Industry standard:** "Loose follow with smoothing" for priority UI, never instant snap

---

## Related Documents

- `Adaptive_Components_Design_Session_Memory_Log.md` - VR/Desktop adaptive sizing
- `Modal_Design_Specification.md` - Original modal designs (being superseded)
- `Canvas_Area_Design_Specification.md` - Canvas and floating panel zones
- `Left_Panel_Design_Specification.md` - Left panel tabs
- `Right_Panel_Design_Specification.md` - Right panel tabs

---

## Next Steps

1. **Implementation:** Create FloatingPanel component following spec
2. **Migration:** Refactor existing Modal to use FloatingPanel internally
3. **VR Foundation:** Implement basic VR panel rendering before adding gaze-follow
4. **Testing:** User testing for gaze-follow comfort settings
5. **Documentation:** Update contributor guides with unified panel model

---

## Continuation Prompt

```
I'm continuing the CIA Web unified panel architecture design. This is a VR-FIRST system where all UI uses floating panels.

Please search project knowledge for:
- Modals_vs_FloatingPanels_Design_Session_Memory_Log.md (this document)
- VR_Interface_Design_Specification_v2.md
- FloatingPanel_Component_Specification.md
- VR_Accessibility_Settings_Panel_Specification.md

Previous session established:
1. Unified FloatingPanel model (STANDARD vs PRIORITY)
2. Priority panels follow gaze (configurable, default ON)
3. Escape key = Cancel (never "do nothing")
4. Form recovery within 2-minute window
5. Gaze-follow: 45° threshold, 0.5s delay, 300ms lerp animation
6. All settings in VR Accessibility panel

I'd like to continue with [implementation / testing strategy / contributor documentation / etc.].
```

---

*Memory log created: January 4, 2025*
