# 🌐 CIA_Web

**Collaborative Immersive Analysis on the Web**

A real-time collaborative platform for immersive scientific data visualization and analysis. CIA_Web combines **VTK.js**, **WebXR**, **TensorFlow.js**, and **LiveKit** to enable multi-user interaction, voice/text communication, and high-dimensional data exploration in both desktop and VR environments.

---

## ✨ Features

### 🎨 Visualization & Analysis

- **3D Point Cloud & Mesh Rendering** - Load and visualize VTP (VTK PolyData) files
- **Dimensionality Reduction** - PCA, t-SNE, and UMAP powered by TensorFlow.js
- **WebXR/VR Support** - Immersive data exploration with VR headsets
- **Orientation Marker** - Navigate complex 3D datasets easily

### 👥 Real-Time Collaboration

- **Collaborative Cursors** - See where other users are pointing in real-time
- **Voice Chat** - Talk with collaborators using LiveKit WebRTC
- **Text Chat** - Send messages and keep conversation history
- **Annotations** - Add 3D markers with notes to highlight important features
- **Shared Viewport** - All users see the same data (file sharing via Yjs)

### 🔧 Advanced Features

- **Memory-Optimized Algorithms** - Handles datasets from 100 to 1,000,000+ points
- **Real-Time Sync** - Powered by Yjs for seamless collaboration
- **User Management** - Color-coded cursors and names for each participant
- **Performance Monitoring** - Built-in logging and memory tracking

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v16+
- [npm](https://www.npmjs.com/)
- [LiveKit Server](https://docs.livekit.io/realtime/self-hosting/local/)
- VR headset (optional, for WebXR features)

### 📥 Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd CIA_Web
```

2. **Install dependencies**

```bash
npm install
```

3. **Generate Self-Signed SSL Certificates** (required for WebXR/HTTPS)

```bash
mkdir certs
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes
```

_Note: The `certs/` folder is in `.gitignore` and should never be committed._

4. **Install LiveKit Server**

```bash
# macOS
brew install livekit

# Linux/macOS (alternative)
curl -sSL https://get.livekit.io | bash
```

5. **Start All Services** (requires 4 terminal windows)

**Terminal 1 - Yjs Server (collaboration sync):**

```bash
node server.js
```

_Expected output:_ `🔄 Yjs relay server running on ws://localhost:8080`

**Terminal 2 - Token Server (LiveKit authentication):**

```bash
node token-server.js
```

_Expected output:_ `✅ Token server running on http://localhost:3001`

**Terminal 3 - LiveKit Server (voice chat):**

```bash
livekit-server --dev
```

_Expected output:_ `starting LiveKit server {"portHttp": 7880}`

**Terminal 4 - Web Application:**

```bash
npm start
```

_Expected output:_ Browser opens to `https://localhost:8081`

6. **Accept Security Warning**

   - Your browser will warn about the self-signed certificate
   - Click "Advanced" → "Proceed to localhost (unsafe)"
   - This is normal for local development

7. **Load Sample Data**
   - Upload a `.vtp` file from the `vtp_files/` folder
   - Or drag and drop your own VTP files

---

## 🔐 Security & Deployment

### ⚠️ DEVELOPMENT MODE WARNING

**This setup uses default development credentials and is NOT secure for production use!**

The included configuration uses:

- ✅ `devkey` / `secret` - LiveKit's public development credentials (local only)
- ✅ Self-signed SSL certificates (not trusted by browsers)
- ✅ CORS set to allow all origins (`*`)
- ✅ No authentication or authorization

**These are intentionally insecure for ease of local development.**

### 🚀 Production Deployment Checklist

Before deploying to production, you **MUST**:

1. **Use Real LiveKit Credentials**
   - Sign up at [LiveKit Cloud](https://cloud.livekit.io) (free tier available)
   - Set environment variables:

```bash
   export LIVEKIT_API_KEY="your-real-key"
   export LIVEKIT_API_SECRET="your-real-secret"
```

2. **Use Valid SSL Certificates**

   - Use [Let's Encrypt](https://letsencrypt.org/) for free SSL certificates
   - Or use certificates from your certificate authority

3. **Configure CORS Properly**

   - In `token-server.js`, change from `origin: "*"` to your specific domain

4. **Add Authentication**

   - Implement user login/registration
   - Validate user sessions before issuing tokens

5. **Use Production LiveKit Server**

   - Deploy LiveKit server or use LiveKit Cloud
   - Update `LIVEKIT_URL` in your configuration

6. **Never Commit Secrets**
   - Keep `certs/` in `.gitignore` ✅ (already configured)
   - Use environment variables for all secrets
   - Never commit `.env` files with real credentials

---

## 🎤 Voice Chat Setup Details

### How It Works

Voice chat uses a 3-server architecture:

```
Browser → Token Server → Get JWT Token
        ↓
        → LiveKit Server → Voice/Audio via WebRTC
```

### Token Server Code (`token-server.js`)

**Important:** The token generation is async in livekit-server-sdk v2.x. Make sure to use `async/await`:

```javascript
const express = require("express");
const { AccessToken } = require("livekit-server-sdk");
const cors = require("cors");

const app = express();
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

// ⚠️ WARNING: These are development-only credentials!
// "devkey" and "secret" are LiveKit's default dev mode keys.
// For production, use environment variables with real credentials.
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "devkey";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "secret";

app.post("/token", async (req, res) => {
  // ✅ async is required!
  try {
    const { roomName, userName } = req.body;

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: userName,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt(); // ✅ await is required!
    res.json({ token });
  } catch (error) {
    console.error("Error generating token:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => {
  console.log("✅ Token server running on http://localhost:3001");
});
```

**Install dependencies:**

```bash
npm install express livekit-server-sdk cors
```

### Testing Voice Chat

1. Start all 4 servers (see Quick Start)
2. Open the app in 2 browser tabs: `https://localhost:8081`
3. Click **"Join Voice Chat"** in both tabs
4. Grant microphone permissions
5. You should hear yourself with a slight echo (tab 1 ↔ tab 2)

---

## 🥽 WebXR / VR Mode

### Supported Browsers

- **Google Chrome** ✅ (Recommended)
- **Microsoft Edge** ✅
- **Firefox Nightly** ⚠️ (Requires configuration)

### Browser Configuration

**Chrome/Edge:** WebXR supported out of the box

**Firefox Nightly:** Enable these flags in `about:config`:

- `dom.vr.enabled` → `true`
- `dom.vr.webxr.enabled` → `true`

**No VR Headset?** Install the [Immersive Web Emulator Extension](https://chromewebstore.google.com/detail/immersive-web-emulator/cgffilbpcibhmcfbgggfhfolhkfbhmik)

### Entering VR

1. Load a VTP file
2. Click **"Enter VR"** button
3. Put on your VR headset
4. Use controllers to interact with data

---

## 💬 Using Collaboration Features

### Voice Chat

1. Click **"Join Voice Chat"** button
2. Grant microphone permissions
3. Talk with other users in the same room
4. Use **"Mute"** button or press `M` to toggle microphone

### Text Chat

1. Type message in text input box
2. Press `Enter` or click **"Send"**
3. See conversation history
4. Click **"Clear Chat"** to remove all messages

### Annotations

1. Click **"Start Annotating"** button
2. Cursor changes to crosshair
3. Click on your visualization
4. Enter annotation text and select type
5. See annotations from all users in the list
6. Click annotation in list to highlight it

### Collaborative Cursors

- Move your mouse to show your cursor to others
- See colored cursors from other users
- Click **"Hide My Cursor"** to disable
- User names appear next to cursors

---

## 📂 Project Structure

```
CIA_Web/
├── src/
│   ├── algorithms/          # PCA, t-SNE, UMAP implementations
│   ├── collaboration/       # Real-time sync (Yjs, cursors, voice, text, annotations)
│   ├── config/              # Configuration constants
│   ├── core/                # Scene management, file handling, annotation rendering
│   ├── ui/                  # UI controls and interactions
│   ├── utils/               # TensorFlow setup, helpers
│   ├── vr/                  # VR controllers, avatars, spatial UI
│   └── index.js             # Application entry point
├── vtp_files/               # Sample VTP datasets
├── certs/                   # SSL certificates (DO NOT COMMIT - in .gitignore)
├── server.js                # Yjs WebSocket server for collaboration
├── token-server.js          # LiveKit token generation server
├── package.json             # Dependencies and scripts
├── webpack.config.js        # Webpack configuration
└── README.md                # This file
```

---

## 🌐 Port Configuration

| Service         | Port | URL                      |
| --------------- | ---- | ------------------------ |
| Web Application | 8081 | `https://localhost:8081` |
| Yjs Server      | 8080 | `ws://localhost:8080`    |
| LiveKit Server  | 7880 | `ws://localhost:7880`    |
| Token Server    | 3001 | `http://localhost:3001`  |

---

## 🛠️ Technology Stack

- **[VTK.js](https://kitware.github.io/vtk-js/)** - 3D visualization and rendering
- **[WebXR](https://immersiveweb.dev/)** - Virtual reality support
- **[TensorFlow.js](https://www.tensorflow.org/js)** - Machine learning in the browser
- **[Yjs](https://yjs.dev/)** - Real-time collaboration framework (CRDT-based)
- **[LiveKit](https://livekit.io/)** - WebRTC voice/video communication
- **[Webpack](https://webpack.js.org/)** - Module bundling

---

## 🎮 Keyboard Shortcuts

| Key          | Action                                      |
| ------------ | ------------------------------------------- |
| `M`          | Toggle microphone mute/unmute               |
| `Enter`      | Send chat message (when text input focused) |
| `Ctrl+Enter` | Create annotation (in annotation dialog)    |

---

## 🐛 Troubleshooting

### Voice Chat Issues

**"Connection failed" or 401 Unauthorized:**

- Ensure LiveKit server is running: `livekit-server --dev`
- Ensure token server is running: `node token-server.js`
- Check token-server.js uses `async/await` (see Voice Chat Setup section)
- Clear browser cache and hard refresh (`Cmd+Shift+R`)

**No audio from other participants:**

- Check microphone permissions in browser
- Verify both users are in the same room
- Check browser console for WebRTC errors

**Firefox issues:**

- Voice chat may not work in Firefox due to localhost WebSocket restrictions
- Use Chrome or Edge for development

### Collaboration Issues

**Cursors not syncing:**

- Ensure Yjs server is running: `node server.js`
- Check browser console for WebSocket connection errors
- Verify both users are accessing the same room URL

**Annotations in wrong place:**

- Make sure VTP file is loaded before annotating
- Try clicking directly on geometry (not empty space)

### Visualization Issues

**File won't load:**

- Ensure file is valid VTP (VTK XML PolyData) format
- Check browser console for parsing errors
- Try a sample file from `vtp_files/` folder

**Performance issues with large datasets:**

- Use datasets under 1 million points for best performance
- Memory-optimized algorithms activate automatically for large files
- Check memory usage in console logs

**SSL Certificate Warning:**

- This is normal for self-signed certificates
- Click "Advanced" → "Proceed to localhost (unsafe)"
- Only an issue in development; use real certificates for production

---

## 🚧 Future Enhancements

- [ ] Camera/viewport synchronization
- [ ] Saved bookmarks and views
- [ ] Drawing tools for freehand sketching
- [ ] Measurement tools (distance, angle)
- [ ] Session recording and playback
- [ ] User roles and permissions
- [ ] File sharing and management
- [ ] Spatial audio in VR mode
- [ ] Mobile device support
- [ ] Persistent storage for annotations and chat history

---

## 📝 Development Notes

### Development Guides

- [Setup Guide](docs/SETUP.md)
- [Cleanup Procedures](docs/CLEANUP_PROCEDURES.md) 🧹
- [Architecture Guide](docs/guides/ARCHITECTURE.md)

### Adding New Features

1. Keep collaboration features in `src/collaboration/`
2. UI controls go in `src/ui/`
3. Core visualization in `src/core/`
4. Update `src/index.js` to initialize new features

### Database Management

**Reset Database (with confirmation):**

```bash
./scripts/reset-database.sh
```

This will:

- Stop all Docker containers
- Delete PostgreSQL and MinIO volumes
- Restart containers with fresh migrations
- Seed database with 7 sample VTP files

**Quick Reset (no confirmation, for rapid development):**

```bash
./scripts/reset-database-quick.sh
```

**Sample Files Included:**

- Bones.vtp (27.3 MB)
- diskout.vtp (483 KB)
- earth.vtp (1.2 MB)
- Lungs.vtp (10.8 MB)
- LungVessels.vtp (28.8 MB)
- Skull.vtp (20 MB)
- Ventricles.vtp (16.5 MB)

### Memory Management

- TensorFlow.js operations use `tf.tidy()` for automatic cleanup
- Large datasets automatically trigger optimization strategies
- Monitor memory usage via debug API: `window.debugAPI.logMemory()`

### Debugging

Access the debug API in browser console:

```javascript
window.debugAPI.toggleReduction(); // Toggle dimensionality reduction
window.debugAPI.logMemory(); // Log current memory usage
window.debugAPI.cleanup(); // Force cleanup TensorFlow tensors
window.debugAPI.voiceChat; // Access voice chat instance
window.debugAPI.textChat; // Access text chat instance
```

---

## 🙏 Acknowledgments

- Built with [VTK.js](https://kitware.github.io/vtk-js/) by Kitware
- Voice chat powered by [LiveKit](https://livekit.io/)
- Collaboration framework by [Yjs](https://yjs.dev/)
- Dimensionality reduction algorithms from [TensorFlow.js](https://www.tensorflow.org/js)

---

**Happy Collaborating! 🎉**

_Remember: This setup is for development only. See the Security & Deployment section before going to production!_
