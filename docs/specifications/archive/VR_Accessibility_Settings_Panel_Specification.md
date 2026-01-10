# VR Accessibility Settings Panel Specification

**CIA Web - Collaborative Immersive Analytics Platform**

Version 1.0 - January 2025

---

## Document Overview

This specification defines the VR Accessibility Settings panel, which provides users with controls to customize their VR experience for comfort, accessibility, and personal preference. This panel is accessible from both Desktop (to configure before entering VR) and within VR itself.

---

## Panel Overview

### Access Points

| Context | How to Access |
|---------|---------------|
| Desktop | Settings → VR → Accessibility |
| VR Wrist Menu | Center Hub (⚙) → Accessibility |
| VR Panel | Settings Panel → Accessibility Tab |

### Panel Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ [⚙] VR Accessibility                                    [×]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Movement] [Panels] [Visual] [Audio] [Input]                   │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│                    (Tab Content Area)                           │
│                                                                 │
│                                                                 │
│                                                                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Reset to Defaults] [Apply]        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tab: Movement

Controls for locomotion and motion comfort.

### Snap Turn

Controls rotation behavior when using thumbstick left/right.

```
┌─────────────────────────────────────────────────────────────────┐
│  Snap Turn                                                      │
│                                                                 │
│  ○ Off (smooth turn only)                                       │
│  ○ 15°   - Fine control                                         │
│  ○ 30°   - Moderate                                             │
│  ● 45°   - Recommended                                          │
│  ○ 90°   - Quick turns                                          │
│                                                                 │
│  Preview: [Visual indicator showing turn amount]                │
└─────────────────────────────────────────────────────────────────┘
```

### Smooth Turn

Alternative to snap turn, or can be combined with it.

```
┌─────────────────────────────────────────────────────────────────┐
│  Smooth Turn                                                    │
│                                                                 │
│  Enable Smooth Turn                              [Toggle: OFF]  │
│                                                                 │
│  Turn Speed                                                     │
│  Slow ○───────●───────○───────○ Fast                           │
│        (30°/s)  (60°/s)  (90°/s)  (120°/s)                      │
│                                                                 │
│  ⚠️ Smooth turning may cause discomfort for some users         │
└─────────────────────────────────────────────────────────────────┘
```

### Teleportation

Controls for teleport locomotion.

```
┌─────────────────────────────────────────────────────────────────┐
│  Teleportation                                                  │
│                                                                 │
│  Teleport Style                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ○ Instant      - Immediate transition                   │   │
│  │ ● Quick Fade   - Brief fade to black (recommended)      │   │
│  │ ○ Slow Fade    - Gradual transition                     │   │
│  │ ○ Dash         - Quick movement through space           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Show Teleport Arc                               [Toggle: ON]   │
│  Arc Color                                       [Color: Blue]  │
│  Haptic Feedback on Land                         [Toggle: ON]   │
└─────────────────────────────────────────────────────────────────┘
```

### Vignette

Tunnel vision effect during movement to reduce motion sickness.

```
┌─────────────────────────────────────────────────────────────────┐
│  Comfort Vignette                                               │
│                                                                 │
│  Vignette Intensity                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ○ Off          - No vignette                            │   │
│  │ ● Light        - Subtle edge darkening (recommended)    │   │
│  │ ○ Medium       - Moderate tunnel effect                 │   │
│  │ ○ Strong       - Maximum comfort, reduced FOV           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Apply Vignette During:                                         │
│  [✓] Smooth turning                                             │
│  [✓] Teleportation                                              │
│  [✓] World movement (grip + move)                               │
│  [ ] Looking around (head movement)                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tab: Panels

Controls for how floating panels and priority panels behave.

### Priority Panel Behavior

Controls how confirmation dialogs and other priority panels behave.

```
┌─────────────────────────────────────────────────────────────────┐
│  Priority Panel Behavior                                        │
│                                                                 │
│  When you look away from a priority panel:                      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ● Follow gaze (recommended)                             │   │
│  │   Panel smoothly repositions to stay in front of you    │   │
│  │                                                         │   │
│  │ ○ Stay in place                                         │   │
│  │   Panel remains where it appeared; glows as reminder    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ℹ️ Priority panels require your decision before continuing    │
└─────────────────────────────────────────────────────────────────┘
```

### Follow Sensitivity

Fine-tune when gaze-following triggers.

```
┌─────────────────────────────────────────────────────────────────┐
│  Follow Sensitivity                                             │
│                                                                 │
│  Time before reposition                                         │
│  Longer ○───────○───────●───────○───────○ Shorter              │
│          1.0s    0.75s   0.5s    0.35s    0.3s                  │
│                                                                 │
│  Angle threshold                                                │
│  Wider ○───────●───────○───────○ Narrower                      │
│         60°     45°     30°     20°                             │
│                                                                 │
│  Current: Panel follows after looking away 45° for 0.5 seconds │
└─────────────────────────────────────────────────────────────────┘
```

### Reposition Animation

Control how quickly panels move.

```
┌─────────────────────────────────────────────────────────────────┐
│  Reposition Animation                                           │
│                                                                 │
│  Animation Speed                                                │
│  Slower ○───────○───────●───────○───────○ Faster               │
│          500ms   400ms   300ms   250ms   200ms                  │
│                                                                 │
│  ℹ️ Faster may feel snappy; slower is gentler but less responsive│
│                                                                 │
│  [▶ Preview Animation]                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Standard Panel Defaults

Default behavior for regular floating panels.

```
┌─────────────────────────────────────────────────────────────────┐
│  Standard Panel Defaults                                        │
│                                                                 │
│  Default Distance                                               │
│  Closer ○───────●───────○───────○ Further                      │
│          0.8m    1.2m    1.6m    2.0m                           │
│                                                                 │
│  Default Panel Size                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ○ Small   (30cm × 40cm)                                 │   │
│  │ ● Medium  (40cm × 50cm) - Recommended                   │   │
│  │ ○ Large   (60cm × 75cm)                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Remember Panel Positions                        [Toggle: ON]   │
│  Panel Follow Mode (auto-follow head)            [Toggle: OFF]  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tab: Visual

Controls for visual accessibility and comfort.

### UI Scale

Overall scaling for VR interface elements.

```
┌─────────────────────────────────────────────────────────────────┐
│  UI Scale                                                       │
│                                                                 │
│  Scale Factor                                                   │
│  Smaller ○───────○───────●───────○───────○ Larger              │
│           0.75x   0.85x   1.0x    1.25x   1.5x                  │
│                                                                 │
│  Affects: Panel size, button size, text size, icon size         │
│                                                                 │
│  [▶ Preview at Selected Scale]                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Text Size

Independent text scaling.

```
┌─────────────────────────────────────────────────────────────────┐
│  Text Size                                                      │
│                                                                 │
│  Text Scale (independent of UI scale)                           │
│  Smaller ○───────○───────●───────○───────○ Larger              │
│           0.8x    0.9x    1.0x    1.2x    1.4x                  │
│                                                                 │
│  Sample Text:                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ The quick brown fox jumps over the lazy dog.            │   │
│  │ Dataset: brain_scan_001.nii (256 × 256 × 180)           │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### High Contrast Mode

Enhanced visibility for users who need it.

```
┌─────────────────────────────────────────────────────────────────┐
│  High Contrast Mode                                             │
│                                                                 │
│  Enable High Contrast                            [Toggle: OFF]  │
│                                                                 │
│  When enabled:                                                  │
│  • Increased border thickness on UI elements                    │
│  • Higher contrast between text and backgrounds                 │
│  • More prominent focus indicators                              │
│  • Brighter accent colors                                       │
│                                                                 │
│  [Preview: Normal] [Preview: High Contrast]                     │
└─────────────────────────────────────────────────────────────────┘
```

### Color Adjustments

Support for color vision deficiency.

```
┌─────────────────────────────────────────────────────────────────┐
│  Color Vision                                                   │
│                                                                 │
│  Color Mode                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ● Normal                                                │   │
│  │ ○ Deuteranopia (red-green, green-weak)                  │   │
│  │ ○ Protanopia (red-green, red-weak)                      │   │
│  │ ○ Tritanopia (blue-yellow)                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Color Preview:                                                 │
│  [■ Primary] [■ Success] [■ Warning] [■ Danger] [■ Info]       │
└─────────────────────────────────────────────────────────────────┘
```

### Brightness

Environmental brightness controls.

```
┌─────────────────────────────────────────────────────────────────┐
│  Brightness                                                     │
│                                                                 │
│  VR Environment Brightness                                      │
│  Darker ○───────○───────●───────○───────○ Brighter             │
│          50%     75%    100%    125%    150%                    │
│                                                                 │
│  UI Brightness                                                  │
│  Darker ○───────○───────●───────○───────○ Brighter             │
│          70%     85%    100%    115%    130%                    │
│                                                                 │
│  ℹ️ Lower brightness may reduce eye strain in dark environments │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tab: Audio

Controls for audio feedback and spatial sound.

### Audio Cues

System sounds for VR interactions.

```
┌─────────────────────────────────────────────────────────────────┐
│  Audio Cues                                                     │
│                                                                 │
│  Enable Audio Cues                               [Toggle: ON]   │
│                                                                 │
│  Volume                                                         │
│  Quiet ○───────○───────●───────○───────○ Loud                  │
│         20%     40%     60%     80%    100%                     │
│                                                                 │
│  Individual Cue Settings:                                       │
│  [✓] Panel open/close sounds                                    │
│  [✓] Priority panel reposition whoosh                           │
│  [✓] Button click feedback                                      │
│  [✓] Error/warning sounds                                       │
│  [✓] Teleport confirmation                                      │
│  [ ] Menu navigation sounds                                     │
│                                                                 │
│  [▶ Test Sound]                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Spatial Audio

How voice and sounds are positioned in 3D space.

```
┌─────────────────────────────────────────────────────────────────┐
│  Spatial Audio                                                  │
│                                                                 │
│  Voice Spatialization                            [Toggle: ON]   │
│                                                                 │
│  When enabled, voices come from avatar positions in space.      │
│  When disabled, all voices play at equal volume (flat mix).     │
│                                                                 │
│  Distance Falloff                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Full volume within:  [  3  ] meters                     │   │
│  │ Fade to 30% at:      [ 10  ] meters                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ℹ️ Presenter mode overrides these settings (full volume always)│
└─────────────────────────────────────────────────────────────────┘
```

### Voice Feedback

Screen reader and voice announcements.

```
┌─────────────────────────────────────────────────────────────────┐
│  Voice Announcements                                            │
│                                                                 │
│  Enable Voice Announcements                      [Toggle: OFF]  │
│                                                                 │
│  Announce:                                                      │
│  [ ] Panel opened/closed                                        │
│  [ ] Button focused                                             │
│  [ ] Action completed                                           │
│  [ ] Errors and warnings                                        │
│                                                                 │
│  Voice                                                          │
│  [Default System Voice          ▾]                              │
│                                                                 │
│  Speech Rate                                                    │
│  Slower ○───────○───────●───────○───────○ Faster               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tab: Input

Controls for controller and input customization.

### Hand Configuration

Dominant hand and handedness settings.

```
┌─────────────────────────────────────────────────────────────────┐
│  Hand Configuration                                             │
│                                                                 │
│  Dominant Hand                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ● Right-handed  (pointer on right, menu on left wrist)  │   │
│  │ ○ Left-handed   (pointer on left, menu on right wrist)  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Hand Size (affects controller model)                           │
│  Smaller ○───────●───────○ Larger                              │
│           Small   Medium   Large                                │
└─────────────────────────────────────────────────────────────────┘
```

### One-Handed Mode

Accessibility feature for single controller use.

```
┌─────────────────────────────────────────────────────────────────┐
│  One-Handed Mode                                                │
│                                                                 │
│  Enable One-Handed Mode                          [Toggle: OFF]  │
│                                                                 │
│  When enabled:                                                  │
│  • All actions available with single controller                 │
│  • Two-handed gestures replaced with alternatives               │
│  • Thumbstick tap replaces second grip                          │
│                                                                 │
│  Primary Controller                                             │
│  ○ Left     ● Right                                             │
│                                                                 │
│  [View One-Handed Control Guide]                                │
└─────────────────────────────────────────────────────────────────┘
```

### Haptic Feedback

Vibration intensity for controllers.

```
┌─────────────────────────────────────────────────────────────────┐
│  Haptic Feedback                                                │
│                                                                 │
│  Enable Haptics                                  [Toggle: ON]   │
│                                                                 │
│  Intensity                                                      │
│  Light ○───────○───────●───────○───────○ Strong                │
│         20%     40%     60%     80%    100%                     │
│                                                                 │
│  Haptic Events:                                                 │
│  [✓] Button presses                                             │
│  [✓] Menu selections                                            │
│  [✓] Teleport landing                                           │
│  [✓] Object grabbing                                            │
│  [ ] Panel interactions                                         │
│                                                                 │
│  [▶ Test Haptics]                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Voice Commands

Hands-free control options.

```
┌─────────────────────────────────────────────────────────────────┐
│  Voice Commands                                                 │
│                                                                 │
│  Enable Voice Commands                           [Toggle: OFF]  │
│                                                                 │
│  Activation                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ○ Always listening (uses more battery)                  │   │
│  │ ● Wake word: "Hey Claude"                               │   │
│  │ ○ Push-to-talk (hold Y button)                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Available Commands:                                            │
│  "Menu" - Open wrist menu                                       │
│  "Reset" - Reset view                                           │
│  "Screenshot" - Capture view                                    │
│  "Mute" / "Unmute" - Toggle microphone                         │
│  "Exit VR" - Return to desktop                                  │
│                                                                 │
│  [View All Voice Commands]                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Footer Actions

### Reset to Defaults

```
┌─────────────────────────────────────────────────────────────────┐
│  [Reset to Defaults]                                            │
│                                                                 │
│  Clicking this will:                                            │
│  • Reset ALL VR accessibility settings to defaults              │
│  • Clear any saved panel positions                              │
│  • Restore recommended comfort settings                         │
│                                                                 │
│  This cannot be undone.                                         │
│                                                                 │
│  [Cancel]                              [Reset Everything]       │
└─────────────────────────────────────────────────────────────────┘
```

### Apply Button Behavior

- Settings apply in real-time for preview
- "Apply" saves settings persistently
- Closing without "Apply" reverts to last saved state
- In VR, changes are immediately visible

---

## Data Model

### Settings Schema

```typescript
interface VRAccessibilitySettings {
  // Movement
  movement: {
    snapTurn: 'off' | 15 | 30 | 45 | 90;
    smoothTurn: {
      enabled: boolean;
      speed: 30 | 60 | 90 | 120;  // degrees per second
    };
    teleport: {
      style: 'instant' | 'quick-fade' | 'slow-fade' | 'dash';
      showArc: boolean;
      arcColor: string;
      hapticOnLand: boolean;
    };
    vignette: {
      intensity: 'off' | 'light' | 'medium' | 'strong';
      triggers: {
        smoothTurn: boolean;
        teleport: boolean;
        worldMove: boolean;
        headMove: boolean;
      };
    };
  };
  
  // Panels
  panels: {
    priority: {
      followMode: 'follow' | 'stay';
      followDelay: number;      // 0.3 - 1.0 seconds
      followAngle: number;      // 20 - 60 degrees
      repositionSpeed: number;  // 200 - 500 ms
    };
    standard: {
      defaultDistance: number;  // 0.8 - 2.0 meters
      defaultSize: 'small' | 'medium' | 'large';
      rememberPositions: boolean;
      autoFollow: boolean;
    };
  };
  
  // Visual
  visual: {
    uiScale: number;           // 0.75 - 1.5
    textScale: number;         // 0.8 - 1.4
    highContrast: boolean;
    colorMode: 'normal' | 'deuteranopia' | 'protanopia' | 'tritanopia';
    environmentBrightness: number;  // 50 - 150 percent
    uiBrightness: number;           // 70 - 130 percent
  };
  
  // Audio
  audio: {
    cues: {
      enabled: boolean;
      volume: number;          // 0 - 100
      panelSounds: boolean;
      priorityWhoosh: boolean;
      buttonClicks: boolean;
      errorSounds: boolean;
      teleportSound: boolean;
      navigationSounds: boolean;
    };
    spatial: {
      voiceEnabled: boolean;
      fullVolumeDistance: number;   // meters
      fadeDistance: number;         // meters
    };
    announcements: {
      enabled: boolean;
      events: {
        panels: boolean;
        focus: boolean;
        actions: boolean;
        errors: boolean;
      };
      voice: string;
      speechRate: number;
    };
  };
  
  // Input
  input: {
    dominantHand: 'left' | 'right';
    handSize: 'small' | 'medium' | 'large';
    oneHandedMode: {
      enabled: boolean;
      primaryController: 'left' | 'right';
    };
    haptics: {
      enabled: boolean;
      intensity: number;       // 0 - 100
      events: {
        buttons: boolean;
        menus: boolean;
        teleport: boolean;
        grabbing: boolean;
        panels: boolean;
      };
    };
    voice: {
      enabled: boolean;
      activation: 'always' | 'wake-word' | 'push-to-talk';
    };
  };
}
```

### Default Values

```typescript
const DEFAULT_VR_ACCESSIBILITY: VRAccessibilitySettings = {
  movement: {
    snapTurn: 45,
    smoothTurn: { enabled: false, speed: 60 },
    teleport: {
      style: 'quick-fade',
      showArc: true,
      arcColor: '#3B82F6',
      hapticOnLand: true
    },
    vignette: {
      intensity: 'light',
      triggers: {
        smoothTurn: true,
        teleport: true,
        worldMove: true,
        headMove: false
      }
    }
  },
  panels: {
    priority: {
      followMode: 'follow',
      followDelay: 0.5,
      followAngle: 45,
      repositionSpeed: 300
    },
    standard: {
      defaultDistance: 1.2,
      defaultSize: 'medium',
      rememberPositions: true,
      autoFollow: false
    }
  },
  visual: {
    uiScale: 1.0,
    textScale: 1.0,
    highContrast: false,
    colorMode: 'normal',
    environmentBrightness: 100,
    uiBrightness: 100
  },
  audio: {
    cues: {
      enabled: true,
      volume: 60,
      panelSounds: true,
      priorityWhoosh: true,
      buttonClicks: true,
      errorSounds: true,
      teleportSound: true,
      navigationSounds: false
    },
    spatial: {
      voiceEnabled: true,
      fullVolumeDistance: 3,
      fadeDistance: 10
    },
    announcements: {
      enabled: false,
      events: { panels: false, focus: false, actions: false, errors: false },
      voice: 'system-default',
      speechRate: 1.0
    }
  },
  input: {
    dominantHand: 'right',
    handSize: 'medium',
    oneHandedMode: { enabled: false, primaryController: 'right' },
    haptics: {
      enabled: true,
      intensity: 60,
      events: {
        buttons: true,
        menus: true,
        teleport: true,
        grabbing: true,
        panels: false
      }
    },
    voice: { enabled: false, activation: 'wake-word' }
  }
};
```

---

## Implementation Notes

### Real-Time Preview

Settings should apply immediately for preview purposes:
- Slider changes update in real-time
- Visual changes (contrast, color mode) preview instantly
- Audio cues can be tested with "Test Sound" button
- Haptics can be tested with "Test Haptics" button

### Persistence

Settings are persisted:
1. **Locally** - localStorage for quick access
2. **User Profile** - Synced to server for cross-device consistency
3. **Per-Headset** - Some settings may vary by device (hand size, haptics)

### VR-Specific Considerations

- Panel should be positioned at comfortable reading distance when opened in VR
- All controls must be large enough for VR interaction (min 44px / 56px VR)
- Sliders should have clear visual indicators and haptic feedback
- Preview buttons should show real effect in current environment

---

## Accessibility of the Accessibility Panel

Meta consideration: This panel must itself be accessible:
- All settings controllable via keyboard (Desktop)
- All settings controllable via single controller (VR one-handed mode)
- Voice announcements work within this panel
- High contrast mode applies to this panel immediately

---

*This document serves as the authoritative reference for VR Accessibility Settings implementation.*
