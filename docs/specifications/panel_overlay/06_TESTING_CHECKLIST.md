# Panel Overlay Architecture - Testing Checklist

**Date:** January 9, 2026

---

## Overview

This checklist covers all functionality that must be verified after implementing the overlay panel architecture.

---

## 1. Basic Panel Operations

### 1.1 Panel Toggle (Click)

| Test | Expected | Pass |
|------|----------|------|
| Click Datasets tab when closed | Datasets panel opens (pinned) | ☐ |
| Click Datasets tab when open | Datasets panel closes | ☐ |
| Click Views tab when Datasets open | Datasets closes, Views opens | ☐ |
| Click right panel tab | Right panel opens independently | ☐ |
| Both left and right panels open | Both visible simultaneously | ☐ |

### 1.2 Panel Overlay Behavior

| Test | Expected | Pass |
|------|----------|------|
| Open panel | Canvas does NOT resize | ☐ |
| Close panel | Canvas does NOT resize | ☐ |
| Panel overlays canvas content | Panel appears on top of canvas | ☐ |
| Panel has glassmorphism | Background blur visible | ☐ |

---

## 2. Hover-Peek Behavior (Desktop)

### 2.1 Basic Peek

| Test | Expected | Pass |
|------|----------|------|
| Hover over Activity Bar tab | After 300ms, panel peeks open | ☐ |
| Move mouse away before 300ms | No panel appears | ☐ |
| Hover, wait, move into panel | Panel stays open | ☐ |
| Move mouse out of panel | Panel closes after 400ms grace | ☐ |
| Return to panel within grace | Panel stays open | ☐ |

### 2.2 Preview State Visual

| Test | Expected | Pass |
|------|----------|------|
| Panel in peek mode | Opacity is ~75-80% (more see-through) | ☐ |
| Panel in peek mode | Animated gradient border visible | ☐ |
| Panel in peek mode | "PREVIEW" banner shown | ☐ |
| Panel in peek mode | Pin button visible (not Close) | ☐ |

### 2.3 Pin from Preview

| Test | Expected | Pass |
|------|----------|------|
| Click Pin button during peek | Panel becomes pinned | ☐ |
| After pin | Opacity becomes 100% | ☐ |
| After pin | Border glow stops | ☐ |
| After pin | Banner disappears | ☐ |
| After pin | Close button appears (not Pin) | ☐ |
| Click Activity Bar tab during peek | Panel becomes pinned | ☐ |

### 2.4 Peek with Pinned Panel

| Test | Expected | Pass |
|------|----------|------|
| Hover tab when panel already pinned | No peek (stays pinned) | ☐ |
| Hover different tab on same side | No peek (one panel per side) | ☐ |
| Hover tab on opposite side | Peek works independently | ☐ |

---

## 3. Focus Mode

### 3.1 Entering Focus Mode

| Test | Expected | Pass |
|------|----------|------|
| Press F key | Focus mode activates | ☐ |
| Panels collapse | Both panels close | ☐ |
| Status bar shows | "Focus Mode Active" message | ☐ |
| Activity Bar | Still visible | ☐ |

### 3.2 Entering via Double-Click

| Test | Expected | Pass |
|------|----------|------|
| Double-click canvas cell | Cell enters focused view | ☐ |
| Focus mode activates | Panels collapse | ☐ |
| Cell fills canvas | Single cell view | ☐ |

### 3.3 Exiting Focus Mode

| Test | Expected | Pass |
|------|----------|------|
| Press Esc | Focus mode exits | ☐ |
| Press F again | Focus mode exits | ☐ |
| Click Back button | Focus mode exits | ☐ |
| Panels restore | Previous open panels return | ☐ |

### 3.4 Panel State Restoration

| Test | Expected | Pass |
|------|----------|------|
| Open Datasets + Tools | Both panels visible | ☐ |
| Enter focus mode | Both collapse | ☐ |
| Exit focus mode | Both restore to open | ☐ |
| Only Datasets open before | Only Datasets after | ☐ |
| No panels open before | No panels after | ☐ |

### 3.5 Peek in Focus Mode

| Test | Expected | Pass |
|------|----------|------|
| In focus mode, hover tab | Peek still works | ☐ |
| Pin from peek in focus mode | Panel pins, focus mode intact | ☐ |

---

## 4. Keyboard Shortcuts

### 4.1 Panel Shortcuts

| Test | Expected | Pass |
|------|----------|------|
| Press 1 | Datasets panel toggles | ☐ |
| Press 2 | Views panel toggles | ☐ |
| Press 3 | Annotations panel toggles | ☐ |
| Press 4 | Layout panel toggles | ☐ |
| Press 5 | People panel toggles | ☐ |
| Press 6 | Tools panel toggles | ☐ |
| Press 7 | Voice panel toggles | ☐ |
| Press 8 | Chat panel toggles | ☐ |

### 4.2 Focus Shortcuts

| Test | Expected | Pass |
|------|----------|------|
| Press F | Focus mode toggles | ☐ |
| Press Esc (focused cell) | Cell unfocuses | ☐ |
| Press Esc (focus mode, no cell) | Focus mode exits | ☐ |
| Press Esc (panel open) | Panel closes | ☐ |

### 4.3 Input Field Safety

| Test | Expected | Pass |
|------|----------|------|
| Focus in text input, press F | Types "f", no focus mode | ☐ |
| Focus in text input, press 1 | Types "1", no panel toggle | ☐ |

---

## 5. VR Mode (Simulated)

### 5.1 Dwell Hover

| Test | Expected | Pass |
|------|----------|------|
| Enable VR mode toggle | VR mode activates | ☐ |
| Hover Activity Bar tab | Dwell progress ring appears | ☐ |
| Progress ring fills | Over 500ms duration | ☐ |
| Dwell completes | Panel peeks open | ☐ |
| Move away before complete | Progress cancels, no panel | ☐ |

### 5.2 VR Grace Period

| Test | Expected | Pass |
|------|----------|------|
| VR dwell complete, move away | 600ms grace period (longer than desktop) | ☐ |
| Return within grace | Panel stays | ☐ |

### 5.3 DwellIndicator

| Test | Expected | Pass |
|------|----------|------|
| Desktop mode | No dwell indicator visible | ☐ |
| VR mode, no hover | No dwell indicator | ☐ |
| VR mode, hovering | Progress ring visible | ☐ |
| VR mode, hover complete | Ring disappears | ☐ |

---

## 6. Persistence

### 6.1 Panel Width

| Test | Expected | Pass |
|------|----------|------|
| Resize left panel | Width changes | ☐ |
| Refresh page | Width persists | ☐ |
| Clear localStorage | Width resets to default | ☐ |

### 6.2 Panel State (Session Only)

| Test | Expected | Pass |
|------|----------|------|
| Open panel, refresh | Panel is closed (expected) | ☐ |
| Focus mode, refresh | Focus mode off (expected) | ☐ |

---

## 7. Responsive & Edge Cases

### 7.1 Window Resize

| Test | Expected | Pass |
|------|----------|------|
| Resize window smaller | Panel doesn't overflow | ☐ |
| Panel + narrow window | Canvas still usable | ☐ |

### 7.2 Rapid Interactions

| Test | Expected | Pass |
|------|----------|------|
| Rapidly hover/unhover | No glitches or stuck states | ☐ |
| Click while peeking | Clean transition to pinned | ☐ |
| Enter/exit focus rapidly | State stays consistent | ☐ |

### 7.3 Multiple Tabs Same Side

| Test | Expected | Pass |
|------|----------|------|
| Hover Datasets, then Views | Only one peek at a time | ☐ |
| Hover left, then right | Both can peek | ☐ |

---

## 8. Accessibility

### 8.1 Reduced Motion

| Test | Expected | Pass |
|------|----------|------|
| Enable prefers-reduced-motion | Slide animation simplified | ☐ |
| Border glow animation | Disabled | ☐ |

### 8.2 Keyboard Navigation

| Test | Expected | Pass |
|------|----------|------|
| Tab through Activity Bar | Focus ring visible | ☐ |
| Enter on focused tab | Panel opens | ☐ |
| Tab into panel | Focus moves to panel content | ☐ |

### 8.3 Screen Reader

| Test | Expected | Pass |
|------|----------|------|
| Panel opens | State announced | ☐ |
| Preview banner | Announced as status | ☐ |
| Focus mode | State announced | ☐ |

---

## 9. Performance

### 9.1 No Layout Thrashing

| Test | Expected | Pass |
|------|----------|------|
| Open/close panel | No canvas resize/reflow | ☐ |
| DevTools Performance | No forced reflows on toggle | ☐ |

### 9.2 Animation Smoothness

| Test | Expected | Pass |
|------|----------|------|
| Panel slide animation | 60fps | ☐ |
| Dwell indicator | 60fps | ☐ |
| Border glow | 60fps | ☐ |

### 9.3 Memory

| Test | Expected | Pass |
|------|----------|------|
| Repeated open/close | No memory leak | ☐ |
| Rapid peek/unpeek | No timer accumulation | ☐ |

---

## 10. Integration

### 10.1 Floating Panel Pop-Out

| Test | Expected | Pass |
|------|----------|------|
| Click pop-out button | Panel becomes floating | ☐ |
| Original overlay closes | No double panels | ☐ |
| Floating panel works | Normal floating behavior | ☐ |

### 10.2 Canvas Interaction

| Test | Expected | Pass |
|------|----------|------|
| Panel open, click canvas | Canvas receives click | ☐ |
| Panel peek, interact with canvas | Panel closes (grace period) | ☐ |

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
| Design Review | | | |

---

## Notes

Use this section to document any issues found during testing:

```
Issue #1:
- Description:
- Steps to reproduce:
- Expected:
- Actual:
- Status:

Issue #2:
...
```
