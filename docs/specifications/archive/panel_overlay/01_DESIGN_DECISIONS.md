# Panel Overlay Architecture - Design Decisions

**Date:** January 9, 2026

---

## Confirmed Decisions Summary

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Panel behavior | **Overlay** (not push) | Maximize canvas real estate |
| 2 | Collapse triggers | **Manual (F) + Auto on Focus View** | Predictable + contextually appropriate |
| 3 | Edge trigger visual | **Activity Bar IS the edge trigger** | No separate UI needed |
| 4 | Multiple panels per side | **No** - one per side, switch on click | Prevents overlay collision |
| 5 | Both sides simultaneously | **Yes** | Left + Right can both be open |
| 6 | Panel width persistence | **localStorage** | Per-user preference |
| 7 | Peek grace period | **400ms** | Prevents accidental close |
| 8 | Peek visual indicator | **Lower opacity + Pin button + Hint** | Clear preview state |
| 9 | Focus mode panel memory | **Restore previous state** | Seamless workflow |
| 10 | VR dwell duration | **500ms default, configurable** | VR Accessibility settings |
| 11 | VR equivalent | **Wrist menu + Peripheral anchors** | Spatial panel management |
| 12 | VR hover | **Dwell-based with progress indicator** | Controller ray hover |

---

## Decision 1: Overlay vs Push

### Choice: Panels overlay the canvas

**Behavior:**
- Canvas takes `flex: 1` and fills all available space between Activity Bars
- Panels are `position: absolute` within canvas container
- Opening a panel does NOT resize the canvas

**Why:**
- Maximum canvas real estate for visualization work
- Consistent canvas size regardless of panel state
- Better for VR where spatial consistency matters
- Users can see canvas content behind semi-transparent panels

**Trade-offs:**
- Panel can obscure canvas content (mitigated by transparency)
- Need clear visual hierarchy (panel in front of canvas)

---

## Decision 2: When Panels Collapse

### Choice: Hybrid - Manual (F key) + Auto on Focus View

**Manual Trigger:**
- Press `F` to toggle Focus Mode
- All panels collapse to Activity Bar
- Press `F` again or `Esc` to restore panels

**Auto Trigger:**
- Double-click a canvas cell to focus it
- Panels automatically collapse
- Exit focus (Esc or Back button) restores panels

**Why:**
- Manual gives user explicit control
- Auto is contextually appropriate (focusing = immersive work)
- Combines best of both approaches

**Not Chosen:**
- Auto-collapse on any canvas click (too aggressive)
- Never auto-collapse (misses natural workflow)

---

## Decision 3: Edge Triggers

### Choice: Activity Bar serves as edge triggers

**Behavior:**
- Activity Bar (48px icon strip) is always visible
- When panels are closed, Activity Bar icons remain clickable
- No separate "collapsed panel tabs" at screen edge

**Why:**
- Simpler implementation (reuse existing component)
- Consistent mental model (same icons always in same place)
- No additional UI elements to design/maintain

**Hover-Peek Extends This:**
- Hovering Activity Bar tab shows panel preview
- Same interaction pattern whether panel was open before or not

---

## Decision 4: One Panel Per Side

### Choice: Only one left panel and one right panel can be open at a time

**Behavior:**
```javascript
// Click "Datasets" when "Views" is open:
// Result: "Views" closes, "Datasets" opens

// Click "Datasets" when "Datasets" is open:
// Result: "Datasets" closes (toggle)
```

**Why:**
- Prevents overlapping panels on same side
- Clear visual hierarchy
- Matches VS Code, most IDE patterns
- Power users who need multiple can use floating panels

**Power User Flow:**
1. Open Datasets panel
2. Click "Pop out" button → Datasets becomes floating
3. Open Views panel in left dock
4. Now have: Floating Datasets + Docked Views + Canvas

---

## Decision 5: Both Sides Simultaneously

### Choice: Left and right panels can both be open at the same time

**Behavior:**
- Left panel state is independent of right panel state
- Can have: Left open + Right closed, or both open, or both closed

**Why:**
- Common workflow: Datasets (left) + Tools (right)
- No reason to restrict this
- Matches user expectations

---

## Decision 6: Panel Width Persistence

### Choice: localStorage per-user

**Stored Data:**
```javascript
{
  "cia-panel-widths": {
    "left": 320,
    "right": 340
  }
}
```

**Behavior:**
- Remember panel widths when user resizes
- Restore on page load
- Per-browser (localStorage is browser-specific)

**Why:**
- Personal preference
- Survives page refresh
- No server round-trip needed

---

## Decision 7: Peek Grace Period

### Choice: 400ms delay before peek panel auto-closes

**Behavior:**
1. User hovers tab → Panel peeks open
2. User moves mouse into panel → Panel stays
3. User moves mouse out of panel → Start 400ms timer
4. If mouse returns to panel or tab within 400ms → Cancel timer, stay open
5. If timer expires → Panel closes

**Why:**
- Prevents accidental closes from sloppy mouse movement
- User can "rest" outside panel briefly without losing it
- 400ms is long enough to be forgiving, short enough to feel responsive

**VR Variation:**
- 600ms grace period (controllers are less precise than mouse)

---

## Decision 8: Peek Visual Indicator

### Choice: Lower opacity + Pin button + Hint banner

**Visual Differences:**

| Aspect | Pinned | Preview |
|--------|--------|---------|
| Opacity | 1.0 | **0.75-0.80** (more see-through) |
| Border | Normal | Animated gradient glow |
| Header buttons | Close (×) | Pop-out + **Pin (📌)** |
| Banner | None | **"PREVIEW - Click pin or tab to keep open"** |
| Animation | None | Subtle pulse on opacity |

**Why:**
- Clear visual distinction between temporary and permanent
- Pin button provides explicit action to "keep this"
- Hint banner explains the state for new users
- Lower opacity (0.75-0.80) makes preview nature obvious

**Implementation Note:**
- Start with 0.75 opacity, adjust based on user testing
- The goal is "clearly temporary" without being "hard to read"

---

## Decision 9: Focus Mode Panel Memory

### Choice: Restore panels to previous state when exiting focus mode

**Behavior:**
```javascript
// Before focus mode:
// leftActiveTab = 'datasets', rightActiveTab = 'tools'

// Enter focus mode:
// preFocusState = { left: 'datasets', right: 'tools' }
// leftActiveTab = null, rightActiveTab = null

// Exit focus mode:
// leftActiveTab = 'datasets', rightActiveTab = 'tools'
```

**Why:**
- Seamless workflow continuation
- User doesn't have to manually reopen panels
- Matches expectation of "temporary" focus mode

---

## Decision 10: VR Dwell Duration

### Choice: 500ms default, configurable in VR Accessibility settings

**Default Values:**
- Hover delay (Desktop): 300ms
- Dwell duration (VR): 500ms
- Grace period (Desktop): 400ms
- Grace period (VR): 600ms

**Configurable Range:**
- VR dwell: 200ms - 1000ms
- Stored in VR Accessibility settings

**Why:**
- 500ms is comfortable middle ground
- Some users prefer faster (experienced)
- Some users need slower (accessibility)
- Per-user preference, not hardcoded

---

## Decision 11: VR Equivalent of Edge Triggers

### Choice: Wrist Menu + Peripheral Anchors

**Wrist Menu (Panel Launcher):**
- Look at wrist → Menu appears
- Shows all available panels (like Activity Bar)
- Tap to summon panel to comfortable position
- Equivalent to Activity Bar on desktop

**Peripheral Anchors (Minimized Panels):**
- When panel is dismissed in VR, shrinks to small orb
- Orb floats at edge of comfortable view
- Gaze at orb for 300ms → Panel expands
- Grab orb → Reposition panel
- Equivalent to collapsed panel state

**Why:**
- Two-tier system matches desktop (Activity Bar + Panels)
- Wrist menu is familiar VR pattern
- Peripheral anchors keep dismissed panels accessible
- No "edge of screen" in VR, so spatial equivalent needed

---

## Decision 12: VR Hover via Dwell

### Choice: Dwell-based hover with circular progress indicator

**Mechanism:**
1. Controller ray intersects UI element
2. Dwell timer starts (500ms default)
3. Circular progress ring fills around element
4. Timer completes → "hover" state triggers
5. Ray moves away → hover ends (with grace period)

**Visual Feedback:**
- Circular progress indicator (SVG)
- Fills clockwise from 12 o'clock
- Accent color (blue) on dark background
- Only visible in VR mode

**Why:**
- No "instant hover" in VR (no cursor)
- Progress indicator provides feedback that "something is happening"
- Matches VR UI conventions
- Same behavioral outcome as desktop hover

---

## Open for Future Iteration

These decisions are confirmed but may be refined based on user testing:

1. **Preview opacity:** Start at 0.75-0.80, adjust based on readability feedback
2. **Dwell timing:** 500ms default, but collect data on user preferences
3. **Grace period:** 400ms/600ms may need tuning
4. **Peripheral anchor behavior:** Gaze vs grab interaction needs VR testing
