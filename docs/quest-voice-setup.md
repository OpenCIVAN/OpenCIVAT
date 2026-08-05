# Voice, Avatars & Synchronous Collaboration on Oculus Quest 2

This guide covers running **multi-headset synchronous collaboration** — shared
data objects, avatars, and LiveKit voice — with Quest 2 headsets reaching the dev
machine over an **HTTPS tunnel** (ngrok / cloudflared).

## Why the defaults don't work on a headset

- **WebXR requires HTTPS** (a secure context). The Quest browser loads the app
  from the tunnel's `https://…` origin, not `localhost`.
- On a headset, `localhost` is **the headset itself**, so the old
  `ws://localhost:7880` / `http://localhost:3002` voice defaults could never
  reach the dev machine, and on an HTTPS page they were blocked as mixed content.
- **WebRTC media is direct (ICE/UDP)** and cannot ride an HTTP tunnel. The media
  SFU must be reachable with TLS + a TURN relay for NAT traversal.

## What the app now does

- The **token endpoint** defaults to the same-origin path `/livekit-token`
  (webpack proxies it to the token server on `:3002`), so it inherits the
  tunnel's TLS automatically — no separate cert or host.
- The **media SFU** URL is env-driven (`LIVEKIT_URL`) and must be an absolute
  `wss://` endpoint (see below).
- The **voice room** is derived from the collaboration session id
  (`sessionManager.getRoomId()`), so every user in a session lands in the same
  LiveKit room. Avatars, poses, cursors, annotations, and object transforms
  already sync over Y.js for anyone sharing that session id.

## Recommended setup: LiveKit Cloud + tunnel

LiveKit Cloud's free tier provides global TLS + TURN, so audio traverses NAT with
zero local media infra — you only tunnel the app.

1. Create a free project at https://cloud.livekit.io and copy its URL + API
   key/secret.
2. In `.env`:
   ```
   LIVEKIT_URL=wss://<your-project>.livekit.cloud
   LIVEKIT_API_KEY=<project key>
   LIVEKIT_API_SECRET=<project secret>
   # LIVEKIT_TOKEN_URL stays unset — uses the same-origin /livekit-token proxy
   ```
3. Start the app + API + Y.js + token server:
   ```bash
   npm run dev:full        # frontend + API + Y.js + token server
   ```
   (The token server is `token-server.js` on port 3002; it signs tokens with the
   `LIVEKIT_*` credentials above.)
4. Expose the frontend over HTTPS:
   ```bash
   ngrok http https://localhost:8081
   # or: cloudflared tunnel --url https://localhost:8081
   ```
5. Open the tunnel URL on each Quest 2 headset. Enter the **same session**
   (share the session link), enter VR, then join voice from the voice bar.

## Self-hosted alternative (no Cloud)

Only needed if you cannot use LiveKit Cloud. Self-hosting media through NAT is
significantly more work because an HTTP tunnel cannot carry TURN traffic:

- Create `livekit.yaml` at the repo root (the file `scripts/start-livekit.sh`
  expects) with `rtc.use_external_ip: true` and an embedded `turn:` block with a
  TLS cert, on a UDP/TCP port reachable from the headsets (port-forward or a
  public host).
- Run coturn (or LiveKit's built-in TURN) reachable from the headsets.
- Point `LIVEKIT_URL` at your `wss://` host and set matching
  `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET`.

## What syncs between headsets in a session

| Data | Channel | Notes |
|------|---------|-------|
| Voice | LiveKit (WebRTC) | Room = session id; audio resumes across VR enter/exit |
| Avatars (head/hands/ray) | Y.js `vr-participants-*` | Speaking state pulses the avatar head |
| Cursors / controller rays | Y.js `vrCursors` / `vrHands` | Transient, not persisted |
| Object transform (move/rotate/scale) | visualizationSyncService → Y.js + REST | Desktop sliders **and** the in-VR "Move Obj" spatial-menu mode |
| Camera / appearance / clip box | visualizationSyncService | Throttled ~20 updates/sec |

### Moving a data object in VR

Open the spatial menu and pick **"Move Obj"**, then pinch-and-drag the active
dataset — its transform is broadcast to every collaborator (the VR equivalent of
the desktop Transform sliders). The plain **"Move"** mode still moves the *world*
(locomotion) for the local user only.

## Troubleshooting

- **Token fetch fails (non-200 on `/livekit-token`)**: ensure `token-server.js`
  is running and reachable through the tunnel; check `LIVEKIT_API_*` are set.
- **Connected but no audio**: almost always a TURN/NAT issue — use LiveKit Cloud,
  or verify your self-hosted TURN is reachable from the headset's network.
- **Users can't hear each other**: confirm both joined the **same session** (same
  URL/session link) — the voice room is derived from the session id.
- **Mic permission**: the Quest browser prompts on first join; accept it.
