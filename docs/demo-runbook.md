# CIA Web — Collaborative WebXR Demo Runbook

Step-by-step script for running a live multi-user demo (desktop + Apple
Vision Pro). Deep setup detail lives in the linked docs; this file is the
demo-day checklist and feature walkthrough.

> Hardware caveat: the Windows-GPU and Vision Pro steps require physical
> hardware and are verified via [vision-pro-validation-checklist.md](vision-pro-validation-checklist.md),
> not CI. Run that checklist once on your hardware before demo day.

---

## 1. Start the stack

**Windows + NVIDIA machine** (backend + GPU render server — see
[windows-gpu-setup.md](windows-gpu-setup.md) for one-time WSL2/driver setup):

```bash
docker-compose -f docker-compose.yml -f docker-compose.gpu.yml up
```

Verify GPU is live:

```bash
curl http://localhost:3001/api/gpu/status
# expect: "gpuAvailable": true and a GPU name from nvidia-smi
```

Health-check everything:

```bash
./scripts/check-services.sh
```

**Frontend dev server** (same machine or your dev laptop):

```bash
# One-time: HTTPS certs — REQUIRED for WebXR. Include the machine's LAN IP
# so headsets on the network can connect:
./scripts/generate-certs.sh <LAN-IP>       # e.g. 192.168.1.50

npm run dev        # frontend :8081 + API :3001 + Y.js WS :9001
# or npm run dev:full to add LiveKit voice
```

If the console prints the big "HTTPS CERTIFICATES NOT FOUND" banner, stop and
generate certs — WebXR will not work over HTTP.

**Demo data** (one-time):

```bash
./scripts/load-demo-files.sh     # uploads demo VTP datasets
./scripts/seed-mock-users.sh     # optional: mock users for collab testing
```

Auth: either Keycloak test users (`./scripts/setup-local-auth.sh`) or
`DEV_BYPASS_AUTH=true` in `.env` (dev only — see CLAUDE.md for header usage).

## 2. Connect clients

- **Desktop:** `https://<LAN-IP>:8081` in Chrome — accept the self-signed
  cert (or trust the mkcert CA).
- **Apple Vision Pro:** Safari → same URL. HTTPS options (ngrok / Cloudflare
  tunnel / LAN IP + mkcert CA trust) are detailed in
  [apple-vision-pro.md](apple-vision-pro.md). `localhost` does NOT work on
  the headset — always the LAN IP or tunnel URL.
- **Same session:** all participants open the same room URL
  (`/rooms/<uuid>` — copy it from the first client's address bar).

## 3. Feature walkthrough (suggested demo order)

1. **Presence:** both users appear in the People tab (right panel) and the
   room presence avatars, each with their own color.
2. **Cursors:** move the mouse over the 3D view on desktop A — desktop B sees
   a colored 3D ring cursor with a name label.
3. **Shared camera:** orbit on A — B's view follows (same shared view).
4. **Follow a user:** on B, hover a user card in the People tab → click the
   follow (video) icon. A "Following …" chip appears in the room header; B's
   camera now tracks A everywhere. B dragging their own camera auto-unfollows.
5. **Personal view:** click the camera toggle in the room header — B's camera
   detaches (their moves aren't broadcast, others' moves are ignored). Toggle
   back to re-join the group view.
6. **Annotate (desktop):** create an annotation at a data point; it appears
   for everyone, with author name in the annotations panel.
7. **Enter VR** (headset or Chrome WebXR emulator): Enter VR button. Inside:
   the spatial menu panel (labeled buttons: Annotate, Measure, Undo, Isolate,
   Grid, Exit) floats below eye-line. On Vision Pro, look + pinch selects; a
   small white reticle marks where the gaze ray hits the data.
8. **VR ray on desktop:** while the VR user points, desktop users see their
   controller ray as a colored line in the shared view (disappears ≤2 s after
   they stop/exit).
9. **VR annotate + measure:** VR user places a marker and a two-point
   measurement — both appear live on desktop (sphere marker, 3D line with
   distance label), with authorship.
10. **VR clip plane:** VR user selects Clip Plane, holds grip and aims — the
    dataset clips in real time on EVERY client, and the plane survives reload
    (persisted in the view configuration). A-button inverts, B-button resets.
11. **Avatars:** desktop users see the VR user's head/hands avatar in the
    shared view; a second VR user sees them in-headset.
12. **Save session:** camera icon in the workspace bar → snapshots every open
    view under one name. Later (or after reload): a view's "Load state" →
    picker modal → Restore.
13. **Replay:** right panel → Replay tab — scrub the room's event history
    (annotations, view changes) on a timeline.
14. **Voice (optional, `npm run dev:full`):** join voice from the room header;
    speaking indicators show in the People tab.

## 4. Latency numbers (for the paper / Q&A)

During any session, in the browser console:

```javascript
window.CIA.metrics.summary()      // p50/p95 per sync category
window.CIA.metrics.download()     // export JSON
```

See [user-study-protocol.md](user-study-protocol.md) for the full measurement
methodology (incl. the clock-skew caveat for cross-machine numbers).

## 5. Known limitations (be honest in the demo)

- Vision Pro specifics (pinch ergonomics, reticle feel, spatial-menu comfort
  distances) are tuned by reasoning, not extensive on-device iteration — run
  the [validation checklist](vision-pro-validation-checklist.md) on your unit.
- VR slice tool: the drag-plane preview is local for mesh data; only
  image-data slice state syncs to peers.
- VR probe tool is intentionally session-local (transient inspection).
- The multi-view VR grid shows other views' datasets; grabbing highlights a
  cell but does not switch the active exploration view yet.
- Matrix chat federation (optional) runs one bridge per server process —
  functional, but consolidation is future work.

## 6. Troubleshooting quick hits

| Symptom | Fix |
|---|---|
| No Enter VR button | HTTP instead of HTTPS — regenerate certs, restart `npm start` |
| Headset can't reach the app | Use LAN IP / tunnel, not localhost; trust the mkcert CA on the device |
| `gpuAvailable: false` | Docker Desktop → Settings → Resources → WSL Integration; see windows-gpu-setup.md troubleshooting |
| Second user sees stale state | Both users must be in the same `/rooms/<uuid>`; check Y.js WS (:9001) reachable |
| Annotations don't sync | API server logs; sync_events table must exist (run migrations / fresh init.sql) |
| Wrong DB password in commands | `.env` overrides docker-compose defaults — see note at top of .env.example |
