# Apple Vision Pro Browser Guide

CIA Web supports Apple Vision Pro as a thin browser client. The rendering-heavy work runs on the Windows/NVIDIA server; Vision Pro sends camera/input commands and receives rendered frames.

---

## Architecture overview

```
Apple Vision Pro (Safari / visionOS browser)
  │  HTTPS WebSocket
  ▼
CIA Web frontend (React, served over HTTPS)
  │  WebSocket / REST
  ▼
Windows render server (Docker, NVIDIA GPU)
  │  Offscreen VTK render → PNG frames
  ▼
Frontend displays frames in main workspace
```

Vision Pro does **not** parse or render large VTK files locally. All scientific rendering is server-side.

---

## HTTPS requirement

Vision Pro's browser requires HTTPS for WebXR and for general network security. `localhost` on Vision Pro resolves to the headset itself, not your dev machine.

### Option A — ngrok (fastest for dev)
```bash
# On Windows or WSL2, after frontend is running on port 8081:
ngrok http https://localhost:8081 --host-header=localhost:8081
```
Paste the `https://xxxx.ngrok.io` URL into Vision Pro's browser.

### Option B — Cloudflare Tunnel
```bash
cloudflared tunnel --url https://localhost:8081
```

### Option C — Local network HTTPS
Generate a certificate for your machine's LAN IP (e.g. `192.168.1.50`):
```bash
# Using mkcert (install from https://mkcert.dev):
mkcert 192.168.1.50
```
Add the mkcert root CA to Vision Pro: Settings → General → VPN & Device Management → trust the CA cert.

Then configure the CIA Web frontend to serve on that IP (set `HOST=0.0.0.0` in your npm start config or update webpack devServer).

---

## What Vision Pro supports

| Feature | Status | Notes |
|---------|--------|-------|
| WebGL2 | Yes | Required for rendering |
| WebSocket | Yes | Required for collaboration and render frames |
| HTTPS | Required | — |
| WebXR (`immersive-vr`) | Yes (visionOS 1.1+) | Enters spatial computing mode |
| WebGPU | Partial | Not required; app does not depend on it |
| File drag-and-drop | No | Not needed; datasets come from server |
| Local file upload | Limited | Not needed; datasets loaded from server |
| `localhost` | Self (headset) | Use tunnel or LAN IP instead |

---

## Browser compatibility approach

CIA Web uses **capability detection**, not browser name blocking. The app checks:

1. WebGL2 available?
2. WebSocket available?
3. IndexedDB available?

If all three are present, the app loads — regardless of browser name. Safari on Vision Pro supports all three.

WebXR and immersive-vr support are checked separately and only affect whether the immersive mode button is shown. The main workspace always loads.

---

## Joining a session from Vision Pro

1. On Windows Chrome (or any browser), open `https://<your-host>:8081` and start a session.
2. Copy the session link (collaboration URL with session ID).
3. On Vision Pro, open Safari and paste the session link.
4. The app loads, capability check passes, workspace appears.
5. Datasets loaded by the Windows session appear in the dataset list.
6. Selecting a dataset triggers a server-side render; the result displays in Vision Pro's browser.

---

## WebXR immersive mode on Vision Pro

When Vision Pro's browser supports `immersive-vr`:
- The "Enter Immersive Mode" button appears in the workspace toolbar.
- Tapping it requests a WebXR session.
- The app enters spatial view using visionOS's spatial rendering.
- Camera/view updates from Vision Pro spatial input are sent to the render server.

If `immersive-vr` is not supported (older visionOS or browser restriction):
- The button is hidden.
- The 2D browser workspace still works fully.
- No fatal error is shown.

---

## Known limitations

- **File upload from Vision Pro**: vision Pro's Safari has limited file system access. Use server-side dataset loading (files pre-loaded on the Windows machine) instead of drag-and-drop upload.
- **WebRTC voice**: LiveKit voice may require microphone permission prompt on Vision Pro. This is a browser permission dialog, not an app error.
- **Self-signed certificates**: Vision Pro's Safari is strict about certificate trust. Use a trusted CA (mkcert + install root CA) or a tunnel service for the smoothest experience.
- **Performance**: Vision Pro browser rendering is limited compared to a native app. Keep render frame resolution reasonable (`RENDER_WIDTH=1024 RENDER_HEIGHT=768`).

---

## Troubleshooting

### App shows "fatal error" on Vision Pro
CIA Web's startup check only hard-fails if WebGL2, WebSocket, or IndexedDB are missing. If you see a fatal error, the message now lists exactly which capability is missing rather than naming specific browsers. Check the Safari error console on Vision Pro for details.

### WebXR button not visible
This means `navigator.xr.isSessionSupported('immersive-vr')` returned false. This is expected on visionOS before 1.1 or if the device type doesn't support immersive mode. The 2D workspace continues normally.

### Session not syncing
Confirm the WebSocket connection to the Y.js server (port 9001) is reachable through HTTPS tunneling. ngrok and Cloudflare Tunnel forward HTTP/WebSocket traffic on the same URL; no extra config needed. If using a local network IP, ensure port 9001 is also accessible or proxied.

### `localhost` not working
Expected. Vision Pro's `localhost` is the headset. Use the tunnel URL or LAN IP. See HTTPS requirement section above.
