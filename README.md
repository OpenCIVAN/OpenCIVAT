# 🌐 CIA_Web: Collaborative Immersive Analysis on the Web

**CIA_Web** is a high-performance, web-based platform for the real-time collaborative exploration of high-dimensional scientific data. By combining **WebXR** for immersive visualization and **WebGPU** for client-side acceleration, it enables researchers to analyze complex datasets directly in the browser.

## ✨ Key Features

- **🥽 Immersive Visualization**: Built with **VTK.js** and **WebXR**, allowing users to explore 3D datasets in Virtual Reality.
- **⚡ WebGPU Acceleration**: Leverages WebGPU compute shaders for expensive operations like **K-Nearest Neighbors (KNN)** and pairwise distance calculations in **t-SNE**, demonstrating measurable performance improvements over CPU-based methods for selected workloads.
- **🤝 Real-Time Collaboration**: Synchronizes camera views and analysis states across multiple users using **Yjs** and **WebSockets**, powered by a dedicated Node.js server.
- **📊 Dimensionality Reduction**: Includes implementations for **PCA** (Principal Component Analysis) and **t-SNE** (t-Distributed Stochastic Neighbor Embedding) to visualize high-dimensional data in 3D.
- **📁 Drag-and-Drop Support**: Seamlessly load **.vtp** (VTK PolyData) files from the local system or the provided `vtp_files/` directory.

---

## 🚀 Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- A browser with **WebXR** and **WebGPU** support (e.g., Google Chrome or Edge).
  - *Note: WebGPU support is experimental and performance may vary across browsers and devices. Specific flags might need to be enabled.*

### 📥 Installation

1. **Clone the repository**:
   ```bash
  git clone https://github.com/Tarun-max-arch/CIA_Web-main.git

   cd CIA_Web-main
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

---

## 🏃‍♂️ Usage

To enable full functionality (including collaboration), you must run both the collaboration server and the web client.

> **Note**: `npm run build` generates production assets in `dist/`. For development and demos, the Webpack dev server (`npm start`) is sufficient.

### 1. Start the Collaboration Server
This Node.js server handles WebSocket connections for real-time synchronization.

```bash
node server.js
```
*Server runs on `ws://localhost:9001`. Note: This is a WebSocket address, so it will not work if you try to open it directly in a browser.*

### 2. Start the Web Client
Open a new terminal window to start the Webpack development server.

```bash
npx webpack serve --mode development
```
*The application will open in your browser, usually at `http://localhost:8080` (check terminal output for the exact URL).*

### 3. Exploring Data
- **Load Data**: Drag a `.vtp` file (e.g., from the `vtp_files/` folder) into the browser window.
- **Enter VR**: Click the **"Enter VR"** button to start an immersive session (requires a VR headset or emulator).
- **Collaborate**: Open the URL in a second browser window (or on another device on the same network) to test synchronization.

---

## 📈 Performance Evaluation

- Compared CPU vs. WebGPU implementations for K-Nearest Neighbors (KNN) and pairwise distance computations.
- Metrics: Execution time, frame rate (FPS), and interaction latency.
- Evaluated across multiple VTP datasets of varying sizes to ensure scalability.

---

## ⚠️ Limitations

- **Browser Support**: WebGPU is still experimental; support varies by browser and OS.
- **Hardware Dependency**: Performance improvements depend heavily on the client's GPU capabilities.

---

## 🛠️ WebXR & Browser Support

For the best experience, use **Google Chrome**.

- **VR Headset**: Compatible with WebXR-enabled headsets (e.g., Meta Quest via Air Link/Link).
- **Emulation**: Developers without a headset can use the **Immersive Web Emulator** extension for Chrome.
  - [Download Extension](https://chromewebstore.google.com/detail/immersive-web-emulator/cgffilbpcibhmcfbgggfhfolhkfbhmik)

---

## 📂 Project Structure

```
CIA_Web-main/
├── src/
│   ├── index.js          # Main application logic (VTK.js, UI, Algorithms)
│   ├── webgpu-compute.js # WebGPU compute shaders (KNN, Pairwise Distances)
│   ├── index.html        # HTML entry point
│   └── controller.html   # VR controller UI templates
├── vtp_files/            # Sample VTK PolyData datasets
├── dist/                 # Compiled assets (generated after build)
├── server.js             # WebSocket server for Yjs collaboration
├── package.json          # Dependencies and scripts
└── webpack.config.js     # Webpack configuration
```

> This project was developed as part of **CS 692: Mobile Immersive Computing** at **George Mason University**.
