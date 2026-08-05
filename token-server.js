// MUST be the very first statement. Everything below reads process.env at
// module-load time, and this file is started as a bare `node token-server.js`
// (package.json "token-server") with nothing else loading .env for it.
// Without this line THREE settings silently read as unset:
//   - LIVEKIT_API_KEY / LIVEKIT_API_SECRET -> fall back to LiveKit's dev
//     "devkey"/"secret", which LiveKit Cloud rejects on every token.
//   - NODE_ENV and DEV_BYPASS_AUTH -> DEV_BYPASS_AUTH below evaluates false
//     (it requires BOTH, see server/src/middleware/auth.js:152-154), so the
//     token endpoint demands a real Keycloak JWT and 401s every voice join
//     even though .env says the bypass is on.
// In particular it must precede the auth middleware require: that module
// computes DEV_BYPASS_AUTH once, at import time.
require("dotenv").config();

const express = require("express");
const { AccessToken } = require("livekit-server-sdk");
const cors = require("cors");
const { createLogger } = require("./server/src/utils/logger");
const { DEV_BYPASS_AUTH, verifyJwtToken } = require("./server/src/middleware/auth");

const log = createLogger("server");

const app = express();

app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

app.use(express.json());

async function requireAuth(req, res, next) {
  if (DEV_BYPASS_AUTH) {
    req.user = {
      id: req.body?.userId || "00000000-0000-0000-0000-000000000001",
      name: req.body?.userName || "Development User",
      email: req.body?.userEmail || "developer@localhost",
    };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  try {
    const token = authHeader.substring(7);
    req.user = await verifyJwtToken(token);
    return next();
  } catch (error) {
    log.warn("Token server auth failed:", error.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ⚠️ WARNING: These are development-only credentials!
// "devkey" and "secret" are LiveKit's default dev mode keys.
// For production, use environment variables with real credentials:
//   export LIVEKIT_API_KEY="your-real-key"
//   export LIVEKIT_API_SECRET="your-real-secret"
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "devkey";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "secret";

// Whether we are still on LiveKit's --dev defaults. Reported at startup below
// because the failure mode otherwise appears only as a rejected token on join.
const usingDevCredentials =
  !process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET;

app.post("/token", requireAuth, async (req, res) => {
  try {
    const { roomName, userName } = req.body;
    const tokenUserName = req.user?.name || req.user?.email || req.user?.id;

    // Ensure we have a valid user name (fallback to "User" with timestamp if empty)
    const effectiveName =
      tokenUserName ||
      userName ||
      `User-${Date.now().toString(36).slice(-4)}`;

    log.info("Generating token for user:", effectiveName, "in room:", roomName);
    log.debug("Using API Key:", LIVEKIT_API_KEY);

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: req.user?.id || effectiveName,
      name: effectiveName, // Also set display name
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    log.trace("Token typeof:", typeof token);
    log.trace("Token is string:", typeof token === "string");

    if (typeof token === "string") {
      log.info("Token generated successfully");
      res.json({ token });
    } else {
      log.error("Token is not a string! Type:", typeof token);
      res.status(500).json({ error: "Token generation failed" });
    }
  } catch (error) {
    log.error("Error generating token:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", apiKey: LIVEKIT_API_KEY });
});

const PORT = 3002;
app.listen(PORT, "0.0.0.0", () => {
  log.info("Token server running on port:", PORT);
  log.info(`  auth mode:    ${DEV_BYPASS_AUTH ? "DEV BYPASS (no JWT required)" : "Keycloak JWT required"}`);
  log.info(`  LIVEKIT_URL:  ${process.env.LIVEKIT_URL || "(unset -> client falls back to ws://localhost:7880)"}`);
  log.info(`  API key:      ${usingDevCredentials ? '"devkey" (LiveKit --dev default)' : LIVEKIT_API_KEY}`);

  // These two combinations account for essentially every "voice just won't
  // connect" report, and neither surfaces an obvious error at join time:
  // Cloud rejects dev credentials, and a ws:// URL is blocked as mixed
  // content from the HTTPS page a headset must use for WebXR.
  if (usingDevCredentials) {
    log.warn(
      'LiveKit credentials are the built-in dev defaults. These work ONLY with a local ' +
        '`livekit-server --dev`. LiveKit Cloud will reject every token generated with them — ' +
        "set LIVEKIT_API_KEY and LIVEKIT_API_SECRET in .env."
    );
  }
  const livekitUrl = process.env.LIVEKIT_URL;
  if (livekitUrl && livekitUrl.startsWith("ws://")) {
    log.warn(
      `LIVEKIT_URL is ws:// (${livekitUrl}). A headset must load the app over HTTPS for WebXR, ` +
        "and browsers block ws:// from an HTTPS page as mixed content. Use a wss:// URL."
    );
  }
});
