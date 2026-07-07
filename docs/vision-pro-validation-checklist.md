# Apple Vision Pro On-Device Validation Checklist

This checklist is for a **human tester with physical Apple Vision Pro
hardware**. It was prepared without access to a device — every step is
grounded in the actual client code (`src/core/vr/VRManager.js`,
`src/core/vr/VRExplorationManager.js`, `src/core/vr/VRCursorSync.js`,
`src/core/vr/VRParticipantSync.js`) and `docs/apple-vision-pro.md`. Some
"expected result" details are best-effort predictions based on reading the
code paths, not confirmed on-device behavior — the tester should treat any
mismatch as a bug report, not assume the checklist is wrong.

**How to use this document:** work top to bottom. Each item has Steps,
Expected Result, a Pass/Fail checkbox, and a Notes field for anything that
deviates, including screenshots/video timestamps and Safari console output.
Record the visionOS version and CIA Web git commit hash at the top of your
results.

```
Tester name:        ______________________
Date:                ______________________
visionOS version:    ______________________
CIA Web commit:      ______________________
Windows GPU server:  ______________________ (hostname/IP)
Second client used:  ______________________ (desktop browser / second Vision Pro)
```

---

## 0. Environment Setup

### 0.1 Windows render server reachable
**Steps:**
1. On the Windows/NVIDIA machine, run `docker-compose -f docker-compose.yml -f docker-compose.gpu.yml up`.
2. From a desktop browser on the same network, open `http://<windows-host>:3001/api/gpu/status`.

**Expected:** JSON response with GPU status (not a connection error).
- [ ] Pass  [ ] Fail

**Notes:** _______________________________________________

### 0.2 HTTPS reachability from Vision Pro
**Steps:**
1. Choose a tunneling method per `docs/apple-vision-pro.md` (ngrok, Cloudflare Tunnel, or mkcert + LAN IP).
2. On Vision Pro, open Safari and navigate to the HTTPS URL.

**Expected:** Page loads without a certificate warning (or, if using a
self-signed cert, the tester has explicitly trusted the mkcert root CA via
Settings → General → VPN & Device Management first).
- [ ] Pass  [ ] Fail

**Notes:** _______________________________________________

### 0.3 `localhost` gotcha confirmed
**Steps:**
1. On Vision Pro Safari, try navigating to `https://localhost:8081`.

**Expected:** This resolves to the headset itself (not the dev machine) and
fails to load the app — this is expected, not a bug. Confirms the tester
understands to always use the tunnel/LAN URL for the rest of this checklist.
- [ ] Pass (confirmed expected failure)  [ ] Fail (unexpected behavior)

**Notes:** _______________________________________________

### 0.4 Backend services healthy
**Steps:**
1. Run `./scripts/check-services.sh` on the dev/server machine.

**Expected:** All services (API, Y.js WS, MinIO, Keycloak, Postgres, Redis) report healthy.
- [ ] Pass  [ ] Fail

**Notes:** _______________________________________________

### 0.5 Capability check passes on Vision Pro
**Steps:**
1. Load the app URL on Vision Pro Safari.
2. Open Safari's remote Web Inspector from a Mac (Settings → Safari →
   Advanced → Web Inspector on Vision Pro; connect via Safari's Develop
   menu on the Mac) and watch the console during load.

**Expected:** No fatal-error screen. Per `docs/apple-vision-pro.md`, the app
only hard-fails if WebGL2, WebSocket, or IndexedDB are missing — Safari on
Vision Pro supports all three, so the workspace should load normally.
- [ ] Pass  [ ] Fail

**Notes:** _______________________________________________

---

## 1. Entering an Immersive Session

### 1.1 Session link join
**Steps:**
1. On a desktop browser (or Windows Chrome), start a session and open a dataset/view.
2. Copy the collaboration session URL.
3. On Vision Pro Safari, paste and open the link.

**Expected:** App loads, workspace appears, the dataset opened on the
desktop session is visible in the dataset list on Vision Pro.
- [ ] Pass  [ ] Fail

**Notes:** _______________________________________________

### 1.2 "Enter Immersive Mode" button visibility
**Steps:**
1. With a view open on Vision Pro, look at the workspace toolbar.

**Expected:** An "Enter Immersive Mode" button is visible (this means
`navigator.xr.isSessionSupported('immersive-vr')` resolved `true` —
visionOS 1.1+). If visionOS is older or the session type is unsupported,
the button should be silently hidden with the 2D workspace still fully
functional (no fatal error) — see `docs/apple-vision-pro.md` §"WebXR
immersive mode".
- [ ] Pass — button visible  [ ] Pass — correctly hidden, 2D mode fine  [ ] Fail

**Notes:** _______________________________________________

### 1.3 Entering the immersive session
**Steps:**
1. Tap "Enter Immersive Mode".
2. Observe the transition (`VRExplorationManager.startExploration`
   requests an `immersive-vr` XR session with `required: ['local-floor']`,
   `optional: ['hand-tracking', 'bounded-floor']`).

**Expected:** A brief loading/transition period, then the dataset appears
in spatial view around the user. No crash, no stuck loading state.
- [ ] Pass  [ ] Fail

**Notes:** _______________________________________________

### 1.4 Session registration with server
**Steps:**
1. While entering VR (step 1.3), watch the API logs on the server
   (`server/src` logs, or `docker logs` for the API container) for a
   `POST /vr/sessions` call.

**Expected:** A VR session row is created server-side within ~1.5s (the
client gives up and falls back to a local-only id after
`_tryRegisterSession`'s 1500ms timeout — see `VRExplorationManager.js`). If
this times out, avatar/participant sync for a second joiner will not
resolve to the same session — flag as a warning even if VR entry itself
still "works" locally.
- [ ] Pass (registered before timeout)  [ ] Fail (timed out / fell back to local id)

**Notes:** _______________________________________________

---

## 2. Transient-Pointer Input (gaze + pinch)

Vision Pro's Safari exposes `transient-pointer` input sources (gaze target
ray + pinch gesture) instead of tracked 6DOF controllers. CIA Web has two
independent input-handling paths that both special-case this — verify both.

### 2.1 Pinch registers as select start/end
**Steps:**
1. In immersive mode, gaze at a point in the scene and perform a pinch gesture (look + pinch fingers together, then release).
2. Watch the Safari remote console for `Select:` debug logs (from
   `VRManager._handleSelectStart` / `_handleSelectEnd`).

**Expected:** A pinch produces a `selectstart` event on pinch-down and a
`selectend` event on release — mirroring a trigger press/release on a
tracked controller. No console errors.
- [ ] Pass  [ ] Fail

**Notes:** _______________________________________________

### 2.2 Handedness `'none'` fallback maps correctly
**Steps:**
1. With a tool active (see section 3), perform a pinch-select while looking at a point in the model.
2. Confirm the action registers as coming from the "right hand" tool slot (Vision Pro's transient-pointer source reports `handedness: 'none'`, which `VRExplorationManager._gatherInputState` maps to `'right'` so tools reading `controllers.right` work; `VRManager._updateInputPoses` does the equivalent for the pose/gamepad path).

**Expected:** Tool actions trigger normally — no "no active tool input"
silent failure, no double-firing on both `left` and `right` controller
slots.
- [ ] Pass  [ ] Fail

**Notes:** _______________________________________________

### 2.3 No grip space — gaze ray used as the interaction ray
**Steps:**
1. Observe the pointer/ray visualization (if any) while gazing around the scene before pinching.

**Expected:** Because transient-pointer sources have no `gripSpace`, CIA
Web uses `targetRaySpace` as the pose (see `VRManager._updateInputPoses`,
the `else if (source.targetRaySpace && !source.hand)` branch). The
interaction ray should track gaze direction smoothly, without jitter or an
offset that doesn't match where the user is actually looking.
- [ ] Pass  [ ] Fail

**Notes:** _______________________________________________

---

## 3. Tool Actions

### 3.1 Annotate
**Steps:**
1. Activate the Annotate tool (from the wrist menu or spatial tool menu —
   `vrSpatialUI` panel rendered in-scene since WebXR sessions don't render
   DOM).
2. Gaze at a point on the dataset surface and pinch-select to place an annotation.

**Expected:** An annotation marker appears at the selected point. Server
receives a create request (`VRExplorationManager._persistVRAnnotation` →
`annotationManager.createAnnotation`, fire-and-forget so it shouldn't stall
the frame loop). The annotation should also appear in a second client
(desktop or second headset) within a couple seconds — cross-check against
section 5.
- [ ] Pass  [ ] Fail

**Notes:** _______________________________________________

### 3.2 Measure
**Steps:**
1. Activate the Measure tool.
2. Pinch-select two points on the dataset.

**Expected:** A measurement line/label appears between the two points with
a distance value. `measurement-created` action persists via
`_persistVRMeasurement`.
- [ ] Pass  [ ] Fail

**Notes:** _______________________________________________

### 3.3 Undo
**Steps:**
1. After placing an annotation or measurement (3.1/3.2), trigger Undo from
   the spatial tool menu (`VRExplorationManager.undoLastToolAction`).

**Expected:** The most recently placed annotation/measurement disappears
locally, and the corresponding delete propagates to the server /
other clients (per the "Map the tool-local id to the server id so undo can
delete it" comment in `_persistVRAnnotation`).
- [ ] Pass  [ ] Fail

**Notes:** _______________________________________________

### 3.4 Tool switching does not leak state
**Steps:**
1. Switch between Annotate → Measure → Probe → Annotate.

**Expected:** Each tool deactivates cleanly (`VRToolManager.deactivateTool`)
before the next activates; no leftover preview markers or stuck gaze rays
from the previous tool.
- [ ] Pass  [ ] Fail

**Notes:** _______________________________________________

---

## 4. Isolation Mode

### 4.1 Enter isolation
**Steps:**
1. While in an immersive session with a dataset loaded, trigger isolation
   toggle (B button on a tracked controller, or the equivalent spatial-menu
   toggle on Vision Pro since there is no physical B button).

**Expected:** The dataset scales to ~2.5 m diagonal ("room scale") and
repositions so its center is at chest height, ~2 m in front of the user
(`VRExplorationManager.enterIsolation`). The user can walk around the
model. An `isolationChanged` event with `isolated: true` fires.
- [ ] Pass  [ ] Fail

**Notes:** _______________________________________________

### 4.2 Exit isolation restores original scale/origin
**Steps:**
1. Toggle isolation off.

**Expected:** The model returns to its pre-isolation scale and origin
exactly (`_isolationBackup` restore path) — no drift or accumulated offset
if toggled multiple times in a row.
- [ ] Pass  [ ] Fail

**Notes:** _______________________________________________

### 4.3 Isolation state visible to other participants
**Steps:**
1. With a second client connected to the same session (desktop observer or
   second VR user), toggle isolation on the first client.

**Expected:** Per the code comment in `VRExplorationManager.js`
("nothing leaks to other participants beyond the normal vrScale presence
field"), other participants should only see the `vrScale` presence value
change — they do NOT get forcibly scaled/moved themselves. Confirm this is
in fact the observed behavior (i.e. isolation is per-user, not a shared
scene mutation).
- [ ] Pass — confirmed per-user only  [ ] Fail — affected other participants' view unexpectedly

**Notes:** _______________________________________________

---

## 5. Multi-User

Requires a second client (desktop browser recommended for the first pass,
then repeat with a second Vision Pro if available).

### 5.1 Second client sees VR session join
**Steps:**
1. Client A (Vision Pro) starts/joins a VR exploration session.
2. Client B (desktop) opens the same project/view and watches for a
   `vr:session-created` / `vr:participant-joined` WS event (check
   `serverSync.js` handlers or the Network tab for WS frames), or the
   corresponding `cia:vr-participant-joined` window event in the console.

**Expected:** Client B's UI reflects that a VR participant has joined
(participant list, avatar list, or a toast/indicator — whatever the current
UI surfaces for this event).
- [ ] Pass  [ ] Fail

**Notes:** _______________________________________________

### 5.2 Avatar visibility
**Steps:**
1. With Client A in VR, check whether Client B (desktop) renders an avatar
   representing Client A's head/hand position, and vice versa if Client B
   also has an avatar representation.

**Expected:** Avatar position updates smoothly as Client A moves their
head/hands in the headset (`VRParticipantSync.updateLocalState`, throttled
to ~20fps per the `_throttleMs = 50` setting). No teleporting/snapping
beyond what the 50ms throttle would explain.
- [ ] Pass  [ ] Fail

**Notes:** _______________________________________________

### 5.3 Cursor sync (desktop ↔ VR)
**Steps:**
1. On Client B (desktop), move the mouse cursor over the dataset.
2. On Client A (Vision Pro), check whether the desktop cursor is visible as
   a floating marker (per `VRCursorSync.js`'s documented cross-platform
   cursor visibility: desktop cursors show as floating dots/rays in VR).
3. Reverse: perform a pinch-select on Client A and check if Client B sees a
   VR pointer ray/marker.

**Expected:** Cursor markers appear on the other client within roughly the
50ms throttle window plus network latency. Note: `VRCursorSync.js` is
marked as a structural stub in its own header comment ("STUB: Structure
only, implementation deferred per DEC-014") — if cursors do NOT sync, this
may be expected incompleteness rather than a regression; record what you
actually observe either way.
- [ ] Pass — cursors sync  [ ] Fail — no sync observed (confirm against DEC-014 stub status before filing as a bug)

**Notes:** _______________________________________________

### 5.4 VR session join from a second client
**Steps:**
1. From Client B, join the same VR session Client A is in (via the session
   list / join UI, which calls `VRExplorationManager.joinSession`).
2. If Client B also enters VR mode (`PARTICIPATION_MODE.VR_EXPLORER`),
   confirm both avatars appear correctly positioned relative to each other
   and the dataset.

**Expected:** `joinSession` resolves `{ joined: true, vrEntered: true }`,
both participants' avatars are visible to each other, and tool actions
(annotate/measure) from either user appear for both.
- [ ] Pass  [ ] Fail

**Notes:** _______________________________________________

### 5.5 Participant leave cleanup
**Steps:**
1. Client A leaves the VR session (exit immersive mode or explicit leave action).

**Expected:** Client B sees Client A's avatar removed promptly (Y.js
`vr-participants-<sessionId>` map delete → `_handleParticipantLeft`).
- [ ] Pass  [ ] Fail

**Notes:** _______________________________________________

---

## 6. Performance

### 6.1 Subjective frame rate
**Steps:**
1. Move around the immersive scene for 30-60 seconds with a moderately
   complex dataset loaded.

**Expected:** No perceptible stutter/juddering during head movement;
comfortable to use (motion sickness is a strong fail signal — stop
immediately if experienced and note dataset/complexity).
- [ ] Pass — smooth  [ ] Marginal — some stutter, noted below  [ ] Fail — unusable/uncomfortable

**Notes (describe dataset size/complexity used):** _______________________________________________

### 6.2 Console-visible performance signals
**Steps:**
1. Watch the remote Safari console during the session for any `Error in
   XR frame` logs (from `VRManager._onFrame` and
   `VRExplorationManager._onFrame`'s catch blocks) or dropped-frame
   warnings.

**Expected:** No repeated `Error in XR frame` / `Error in VR frame loop`
messages during normal interaction.
- [ ] Pass  [ ] Fail

**Notes:** _______________________________________________

### 6.3 Sync latency metrics (if PART 1 instrumentation is deployed)
**Steps:**
1. If `metricsService` (see `src/services/metrics/metricsService.js`) is
   included in this build, open the remote Safari console and run
   `window.CIA.metrics.summary()` after a session with some sync activity
   (view changes, annotations).

**Expected:** Returns a per-category summary object
(`{count, mean, p50, p95, max}`). Record the `yjs-visualization`,
`annotation-created`, etc. numbers here for the paper — see
`docs/user-study-protocol.md` for how these numbers get analyzed.
- [ ] Pass — metrics available and recorded below  [ ] N/A (not in this build)

**Recorded summary (paste JSON or key numbers):**
```
_______________________________________________
```

### 6.4 Render resolution sanity check
**Steps:**
1. Confirm the Windows render server's `RENDER_WIDTH`/`RENDER_HEIGHT` env
   vars are set to a reasonable value for Vision Pro
   (`docs/apple-vision-pro.md` suggests `1024x768` as a starting point).

**Expected:** Frames are legible and not excessively downscaled/blurry, but
also not so high-res that latency suffers. Note actual values used.
- [ ] Pass  [ ] Fail

**Notes (actual RENDER_WIDTH/RENDER_HEIGHT used):** _______________________________________________

---

## 7. Exit / Re-Enter Session

### 7.1 Clean exit from immersive mode
**Steps:**
1. Exit the immersive session (system gesture / exit button / crown press
   equivalent on Vision Pro).

**Expected:** `VRExplorationManager.leaveSession` runs its full cleanup
(frame loop stopped, sub-managers cleaned up, `exitVRExploration` called on
the handler, XR session ended). The 2D workspace reappears without error.
Server receives a `POST /vr/sessions/:id/leave` (non-fatal if it fails —
confirm no visible error to the user either way).
- [ ] Pass  [ ] Fail

**Notes:** _______________________________________________

### 7.2 Re-enter the same session
**Steps:**
1. Immediately after 7.1, tap "Enter Immersive Mode" again on the same view.

**Expected:** Re-enters cleanly; no duplicate avatars, no stale tool state
from the previous session, no growing memory/perf degradation across
repeated enter/exit cycles (repeat 3x and compare frame rate/feel on the
3rd entry vs the 1st).
- [ ] Pass  [ ] Fail

**Notes:** _______________________________________________

### 7.3 Unexpected termination (system interruption)
**Steps:**
1. While in immersive mode, trigger a system-level interruption (e.g.
   Digital Crown press to go to Home View, or an incoming notification that
   forces the app to background).

**Expected:** The `xrSession`'s `'end'` event fires
(`_onSessionEnd` handler) and cleans up state, rather than leaving the app
in a broken half-VR state when the user returns to it.
- [ ] Pass  [ ] Fail

**Notes:** _______________________________________________

---

## 8. Known Limitations to Verify

These are called out in `docs/apple-vision-pro.md` as known/expected
limitations — verify each still holds and note any change in behavior.

### 8.1 File upload from Vision Pro
**Expected:** No drag-and-drop file upload available; datasets must be
pre-loaded on the Windows server side and selected from the dataset list.
- [ ] Confirmed as documented  [ ] Behavior differs (describe below)

**Notes:** _______________________________________________

### 8.2 WebRTC voice microphone permission
**Steps:** Join a session with LiveKit voice enabled.
**Expected:** A standard browser microphone-permission dialog appears (not
an app-level error) the first time voice is used.
- [ ] Confirmed as documented  [ ] Behavior differs (describe below)

**Notes:** _______________________________________________

### 8.3 Self-signed certificate strictness
**Expected:** If not using a tunnel service or a trusted CA (mkcert),
Safari on Vision Pro is stricter about certificate trust than desktop
Safari and may refuse to load the page at all, rather than showing a
click-through warning.
- [ ] Confirmed as documented  [ ] Behavior differs (describe below)

**Notes:** _______________________________________________

### 8.4 VRCursorSync stub status
**Expected:** Per the `DEC-014` comment in `VRCursorSync.js`, cross-platform
cursor sync may still be structural/incomplete. Cross-reference with
section 5.3's result — this item exists so the discrepancy (if any) is
tracked as "known limitation," not filed as a surprise bug.
- [ ] Confirmed still incomplete  [ ] Now fully working (update this doc)

**Notes:** _______________________________________________

---

## Summary

```
Total items:            ______
Passed:                 ______
Failed:                 ______
N/A:                    ______

Blocking issues found (must fix before user study):
1. _______________________________________________
2. _______________________________________________

Non-blocking issues (file for later):
1. _______________________________________________
2. _______________________________________________
```
