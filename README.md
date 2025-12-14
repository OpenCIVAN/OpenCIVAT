# 🌐 CIA_Web
### Collaborative Immersive Analysis on the Web

A web-based, real-time collaborative platform for immersive scientific data visualization and analysis.
CIA_Web leverages VTK.js, WebXR, and TensorFlow.js to support multi-user interaction and high-dimensional data exploration in both desktop and VR environments.

## ✨ Features
- **Immersive Visualization**: Built-in WebXR support allows users to explore data in Virtual Reality directly from the browser.
- **High-Performance Rendering**:
  - **WebGPU Support**: Next-generation graphics API integration for superior rendering performance.
  - **WASM Backend**: Utilizes C++ compiled to WebAssembly (VTK-wasm) for native-like computational speed.
- **Real-time Performance Monitoring**: Integrated dashboard to track:
  - Frame Rate (FPS) with min/max/average stats.
  - Memory usage (Heap size/limit).
  - Data utilization and load/parse times.
- **Interactive Tools**: Full support for mouse and VR controller interactions (Zoom, Rotate, Pan).
- **Data Support**: Seamless loading and rendering of `.vtp` (XML PolyData) files.

## �️ Built With

### Core Libraries
- **[@kitware/vtk.js](https://kitware.github.io/vtk-js/)**: Core visualization library for rendering scientific data.
- **[TensorFlow.js](https://www.tensorflow.org/js)**: Machine learning integration for data analysis.
- **[Three.js](https://threejs.org/)**: 3D graphics library.
- **[WebXR Polyfill](https://github.com/immersive-web/webxr-polyfill)**: Ensures VR compatibility across different browsers.

### Collaboration & Networking
- **[Yjs](https://github.com/yjs/yjs)**: CRDT framework for real-time collaboration.
- **[ws](https://github.com/websockets/ws)** & **y-websocket**: WebSocket implementations for connecting users.

### Build Tools
- **[Webpack](https://webpack.js.org/)**: JavaScript module bundler.
- **[Babel](https://babeljs.io/)**: JavaScript compiler.

## �🚀 Getting Started

### Prerequisites
- Node.js (v16+ recommended)
- npm

### 📥 Installation
1. Clone or download the repository, including:
   - `src/`
   - `package.json`
   - `package-lock.json`
   - `webpack.config.js`

2. Install dependencies:
   ```bash
   npm install
   ```
   *Or manually install core packages:*
   ```bash
   npm install @kitware/vtk.js webpack webpack-cli webpack-dev-server html-webpack-plugin
   ```

3. Start the development server:
   ```bash
   npm run start
   ```
   This will automatically open the app in your default browser.

4. Upload a `.vtp` file from the `vtp_files` folder to begin visualizing data.

5. Open Developer Tools in Chrome: Right click > Inspect > WebXR

## 🥽 Accessing WebXR

### Supported Browsers
- Google Chrome (Recommended)
- Immersive Web Emulator Extension
- Microsoft Edge
- Firefox Nightly

### Browser Configuration
- **On Chrome and Edge**, WebXR is supported out of the box — no extra setup needed.
- **On Firefox Nightly**, you may need to enable `dom.vr.enabled` and `dom.vr.webxr.enabled` in `about:config`.
- If you don’t have a VR headset, install the **Immersive Web Emulator Extension** to simulate WebXR.

### Entering VR Mode
1. Click the 'Enter VR' button.
2. Put on your VR headset and enjoy the experience!

## 📂 Project Structure
```text
CIA_Web/
├── emsdk/               # Emscripten SDK for C++ to WASM compilation
├── node_modules/        # Project dependencies
├── src/                 # Frontend Application Source
│   └── index.js         # Main entry point for the JS application
├── VTK-src/             # VTK (Visualization Toolkit) source code
├── vtk-wasm-app/        # C++ Source for WASM Backend
│   └── main.cxx         # C++ application logic
├── vtp_files/           # Sample .vtp datasets for visualization
├── .babelrc             # Babel configuration
├── .gitignore           # Git ignore configuration
├── build_log.txt        # Build process logs
├── package.json         # Project metadata and dependencies
├── webpack.config.js    # Webpack bundle configuration
└── README.md            # Project documentation
```
