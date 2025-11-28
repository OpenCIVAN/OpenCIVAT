# CIA Web Server-Side Rendering Architecture
## Low-Latency GPU Rendering for VR and Scalability

---

## Why Server-Side Rendering?

### Current Architecture (Client-Side)
```
┌─────────────────┐     ┌─────────────────┐
│  User Browser   │     │     Server      │
│                 │     │                 │
│  VTK.js ───────►│◄───►│  REST API       │
│  WebGL          │     │  WebSocket      │
│  GPU Required   │     │  Data only      │
└─────────────────┘     └─────────────────┘

Problems:
❌ VR headsets have limited GPU (Quest 2/3)
❌ Large datasets overwhelm client memory
❌ Inconsistent experience across devices
❌ Can't render on thin clients (tablets, phones)
```

### Target Architecture (Hybrid)
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  User Device    │     │  Render Server  │     │   Data Server   │
│                 │     │                 │     │                 │
│  Video Decoder  │◄────│  VTK (Python/   │◄────│  PostgreSQL     │
│  Interaction TX │────►│  C++) + NVENC   │     │  S3/MinIO       │
│  Low latency    │     │  GPU Rendering  │     │  Dataset Cache  │
└─────────────────┘     └─────────────────┘     └─────────────────┘

Benefits:
✅ Server GPU handles complex scenes
✅ Consistent 90fps for VR
✅ Works on any device with video decoder
✅ Centralized resource management
```

---

## Rendering Modes

### Mode 1: Client-Side (Default for Desktop)
- Used when: Desktop browser with capable GPU
- How: VTK.js runs in browser, WebGL rendering
- Latency: ~0ms (local)
- Best for: Interactive exploration, low-latency needs

### Mode 2: Server-Side (Default for VR)
- Used when: VR headset, thin client, large dataset
- How: Server renders frames, streams H.264/VP9 video
- Latency: 16-50ms (target <20ms for VR)
- Best for: VR, mobile, complex visualizations

### Mode 3: Hybrid
- Used when: Desktop with server-assist for heavy scenes
- How: Client renders simple, server renders complex on demand
- Best for: Progressive loading, level-of-detail

---

## Server Architecture

### Render Server Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                         RENDER SERVER                               │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Session    │  │   Render     │  │   Encode     │              │
│  │   Manager    │  │   Workers    │  │   Pipeline   │              │
│  │              │  │              │  │              │              │
│  │ • User auth  │  │ • VTK/ParaV. │  │ • NVENC      │              │
│  │ • View state │  │ • GPU alloc  │  │ • H.264/VP9  │              │
│  │ • Routing    │  │ • Scene mgmt │  │ • WebRTC out │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│         └─────────────────┼─────────────────┘                       │
│                           │                                         │
│  ┌────────────────────────┼────────────────────────────────────┐   │
│  │              GPU Resource Pool                               │   │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │   │
│  │  │GPU 0│ │GPU 1│ │GPU 2│ │GPU 3│ │GPU 4│ │GPU 5│           │   │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘           │   │
│  │                                                              │   │
│  │  • Dynamic allocation per session                           │   │
│  │  • Priority: VR > Interactive > Batch                       │   │
│  │  • Memory quotas per tenant                                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Session Flow

```
1. Client connects
   ├── Auth token validated
   ├── Session created in SessionManager
   └── Render worker allocated from pool

2. Client requests view
   ├── ViewConfiguration loaded from DB
   ├── Dataset loaded to GPU memory
   └── Initial frame rendered & streamed

3. Client sends interaction
   ├── Camera rotation, zoom, pan
   ├── Widget interactions
   └── ~5-10KB/interaction

4. Server renders & streams
   ├── Render at target FPS (60 desktop, 90 VR)
   ├── Encode with NVENC (<2ms)
   └── Stream via WebRTC (<10ms network)

5. Session ends
   ├── GPU memory freed
   ├── Worker returned to pool
   └── Session state persisted
```

---

## Protocol Design

### WebRTC for Video Streaming
```typescript
// Client-side setup
const pc = new RTCPeerConnection(config);

// Receive video track from server
pc.ontrack = (event) => {
  if (event.track.kind === 'video') {
    videoElement.srcObject = event.streams[0];
  }
};

// Data channel for interactions (low-latency)
const interactionChannel = pc.createDataChannel('interactions', {
  ordered: false,      // Allow out-of-order for lower latency
  maxRetransmits: 0,   // No retransmits, just send latest
});
```

### Interaction Protocol
```typescript
interface InteractionMessage {
  type: 'camera' | 'widget' | 'select' | 'annotate';
  timestamp: number;
  sequence: number;    // For ordering
  payload: InteractionPayload;
}

interface CameraInteraction {
  type: 'camera';
  action: 'rotate' | 'pan' | 'zoom' | 'set';
  delta?: { x: number; y: number; z?: number };
  absolute?: CameraState;
}

interface WidgetInteraction {
  type: 'widget';
  widgetId: string;
  action: string;
  params: Record<string, unknown>;
}
```

### Server Frame Protocol
```typescript
interface FrameMetadata {
  frameId: number;
  timestamp: number;
  renderTime: number;     // ms to render
  encodeTime: number;     // ms to encode
  viewConfigId: string;
  cameraState: CameraState;
}

// Sent via data channel alongside video
// Client uses to detect sync issues
```

---

## Handler Integration for Server Rendering

### RenderMode in Handler

```typescript
// src/core/instances/types/InstanceTypeHandler.ts

export type RenderMode = 'client' | 'server' | 'hybrid';

export interface InstanceTypeHandler {
  // ... existing methods ...
  
  /**
   * What rendering modes does this handler support?
   * VTK supports all three, simple image viewer only supports client
   */
  getSupportedRenderModes(): RenderMode[];
  
  /**
   * Current render mode
   */
  getRenderMode(): RenderMode;
  
  /**
   * Switch render mode
   * Called when user toggles, enters VR, or system decides
   */
  setRenderMode(mode: RenderMode): Promise<void>;
  
  /**
   * For server mode: Handle incoming video frame
   * Default implementation renders to video element
   */
  handleServerFrame?(frame: VideoFrame, metadata: FrameMetadata): void;
  
  /**
   * For server mode: Send interaction to server
   * Called by handler's interaction handlers
   */
  sendInteraction?(interaction: InteractionMessage): void;
  
  /**
   * Get server-side rendering config for this handler
   * Tells server which rendering backend to use
   */
  getServerRenderConfig?(): ServerRenderConfig;
}

interface ServerRenderConfig {
  /** Server-side renderer to use */
  renderer: 'vtk-python' | 'vtk-cpp' | 'paraview' | 'blender' | 'custom';
  
  /** Target frame rate */
  targetFPS: number;
  
  /** Resolution scaling (0.5 = half res for performance) */
  resolutionScale: number;
  
  /** Quality vs latency tradeoff */
  encodingPreset: 'ultrafast' | 'fast' | 'medium' | 'quality';
  
  /** Features required on server */
  requiredFeatures: string[];
}
```

### VTK Handler: Server Mode Implementation

```typescript
// src/core/instances/types/vtk/VTKHandler.ts

export class VTKHandler implements InstanceTypeHandler {
  private renderMode: RenderMode = 'client';
  private serverConnection?: ServerRenderConnection;
  private videoElement?: HTMLVideoElement;
  
  getSupportedRenderModes(): RenderMode[] {
    return ['client', 'server', 'hybrid'];
  }
  
  getRenderMode(): RenderMode {
    return this.renderMode;
  }
  
  async setRenderMode(mode: RenderMode): Promise<void> {
    if (mode === this.renderMode) return;
    
    if (mode === 'server' || mode === 'hybrid') {
      // Connect to render server
      this.serverConnection = await ServerRenderConnection.create({
        viewConfigId: this.viewConfig.id,
        renderConfig: this.getServerRenderConfig(),
      });
      
      // Set up video element for receiving frames
      this.videoElement = document.createElement('video');
      this.videoElement.autoplay = true;
      this.videoElement.muted = true;
      this.container.appendChild(this.videoElement);
      
      // Connect WebRTC
      await this.serverConnection.connect(this.videoElement);
      
      // If hybrid, keep client renderer but lower quality
      if (mode === 'hybrid') {
        this.setClientQuality('low');
      } else {
        // Pure server mode: destroy client renderer
        this.destroyClientRenderer();
      }
    } else {
      // Switching to client mode
      if (this.serverConnection) {
        await this.serverConnection.disconnect();
        this.serverConnection = undefined;
      }
      if (this.videoElement) {
        this.videoElement.remove();
        this.videoElement = undefined;
      }
      // Recreate client renderer
      await this.initializeClientRenderer();
    }
    
    this.renderMode = mode;
  }
  
  getServerRenderConfig(): ServerRenderConfig {
    return {
      renderer: 'vtk-python',
      targetFPS: this.isVRMode ? 90 : 60,
      resolutionScale: this.isVRMode ? 1.0 : 0.75,
      encodingPreset: this.isVRMode ? 'ultrafast' : 'fast',
      requiredFeatures: ['volume-rendering', 'gpu-ray-casting'],
    };
  }
  
  // Override interaction handlers to route to server
  private handleCameraInteraction(action: string, delta: any) {
    if (this.renderMode === 'client') {
      // Local rendering
      this.camera.rotate(delta);
      this.render();
    } else {
      // Send to server
      this.sendInteraction({
        type: 'camera',
        action: action as any,
        delta,
        timestamp: performance.now(),
        sequence: this.interactionSequence++,
      });
    }
  }
}
```

---

## Server-Side Render Worker (Python)

```python
# server/render_worker.py

import vtk
import numpy as np
from typing import Optional
import asyncio

class RenderWorker:
    def __init__(self, gpu_id: int, session_id: str):
        self.gpu_id = gpu_id
        self.session_id = session_id
        self.renderer = vtk.vtkRenderer()
        self.render_window = vtk.vtkRenderWindow()
        self.render_window.SetOffScreenRendering(1)
        self.render_window.AddRenderer(self.renderer)
        
        # Set up GPU
        self.render_window.SetDeviceIndex(gpu_id)
        
        # Encoder (NVENC)
        self.encoder = NVENCEncoder(
            width=1920,
            height=1080,
            fps=60,
            preset='ultrafast'
        )
    
    async def load_dataset(self, dataset_path: str, view_config: dict):
        """Load dataset and apply view configuration"""
        # Load data
        reader = self._get_reader_for_path(dataset_path)
        reader.SetFileName(dataset_path)
        reader.Update()
        
        # Create mapper and actor
        mapper = vtk.vtkPolyDataMapper()
        mapper.SetInputConnection(reader.GetOutputPort())
        
        actor = vtk.vtkActor()
        actor.SetMapper(mapper)
        
        # Apply view config
        self._apply_view_config(actor, view_config)
        
        self.renderer.AddActor(actor)
        self.renderer.ResetCamera()
    
    async def render_frame(self) -> tuple[bytes, dict]:
        """Render a frame and return encoded bytes + metadata"""
        start = time.perf_counter()
        
        # Render
        self.render_window.Render()
        render_time = time.perf_counter() - start
        
        # Get frame buffer
        w2i = vtk.vtkWindowToImageFilter()
        w2i.SetInput(self.render_window)
        w2i.Update()
        
        # Convert to numpy
        vtk_array = w2i.GetOutput().GetPointData().GetScalars()
        numpy_array = vtk.util.numpy_support.vtk_to_numpy(vtk_array)
        
        # Encode
        encode_start = time.perf_counter()
        encoded_frame = self.encoder.encode(numpy_array)
        encode_time = time.perf_counter() - encode_start
        
        metadata = {
            'frameId': self.frame_count,
            'timestamp': time.time(),
            'renderTime': render_time * 1000,
            'encodeTime': encode_time * 1000,
            'cameraState': self._get_camera_state(),
        }
        
        self.frame_count += 1
        return encoded_frame, metadata
    
    def handle_interaction(self, interaction: dict):
        """Handle interaction from client"""
        if interaction['type'] == 'camera':
            self._handle_camera_interaction(interaction)
        elif interaction['type'] == 'widget':
            self._handle_widget_interaction(interaction)
    
    def _handle_camera_interaction(self, interaction: dict):
        camera = self.renderer.GetActiveCamera()
        action = interaction['action']
        
        if action == 'rotate':
            delta = interaction['delta']
            camera.Azimuth(delta['x'])
            camera.Elevation(delta['y'])
        elif action == 'zoom':
            camera.Zoom(interaction['delta']['z'])
        elif action == 'pan':
            # ... pan implementation
            pass
        elif action == 'set':
            self._set_camera_state(interaction['absolute'])
```

---

## Latency Optimization

### Target Latencies

| Stage | Target | Technique |
|-------|--------|-----------|
| Interaction → Server | <5ms | UDP/WebRTC DataChannel |
| Server Processing | <2ms | Pre-parsed interactions |
| Render | <11ms | GPU, 90fps |
| Encode | <2ms | NVENC hardware encoder |
| Network | <10ms | Regional servers |
| Decode | <2ms | Hardware decoder |
| **Total** | **<32ms** | Under 3 frames at 90fps |

### Techniques

1. **Predictive Rendering**: Server predicts next frame based on interaction velocity
2. **Time Warp**: Client-side reprojection for head movement
3. **Foveated Rendering**: Full resolution only where user looks (VR)
4. **Level of Detail**: Reduce complexity during fast interaction
5. **Frame Interpolation**: Generate intermediate frames client-side

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AWS / Cloud                                 │
│                                                                     │
│  ┌─────────────┐    ┌─────────────────────────────────────────┐    │
│  │   CloudFront │    │           ECS / Kubernetes              │    │
│  │   (Static)   │    │                                         │    │
│  └──────┬──────┘    │  ┌─────────┐  ┌─────────┐  ┌─────────┐ │    │
│         │           │  │ API     │  │ Y.js    │  │ LiveKit │ │    │
│         │           │  │ Server  │  │ Server  │  │ (Voice) │ │    │
│         │           │  └────┬────┘  └────┬────┘  └────┬────┘ │    │
│         │           │       │            │            │       │    │
│         │           └───────┼────────────┼────────────┼───────┘    │
│         │                   │            │            │             │
│         │           ┌───────┼────────────┼────────────┼───────┐    │
│         │           │       │     GPU Render Cluster  │       │    │
│         │           │  ┌────┴────┐  ┌────┴────┐  ┌────┴────┐ │    │
│         │           │  │ g4dn.xl │  │ g4dn.xl │  │ g4dn.xl │ │    │
│         │           │  │ (T4 GPU)│  │ (T4 GPU)│  │ (T4 GPU)│ │    │
│         │           │  └─────────┘  └─────────┘  └─────────┘ │    │
│         │           └─────────────────────────────────────────┘    │
│         │                                                           │
│  ┌──────┴──────┐    ┌─────────────┐    ┌─────────────┐             │
│  │     RDS     │    │     S3      │    │ ElastiCache │             │
│  │ (PostgreSQL)│    │ (Datasets)  │    │   (Redis)   │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
```

### GPU Instance Selection

| Instance | GPU | Use Case | Cost/hr |
|----------|-----|----------|---------|
| g4dn.xlarge | T4 (16GB) | 1-2 concurrent users | ~$0.50 |
| g4dn.2xlarge | T4 (16GB) | 2-4 concurrent users | ~$0.75 |
| g5.xlarge | A10G (24GB) | 4-6 users, large datasets | ~$1.00 |
| p4d.24xlarge | 8x A100 | Massive multi-tenant | ~$32.00 |

---

## Integration with Existing Code

### What Changes

| Component | Current | With Server Rendering |
|-----------|---------|----------------------|
| VTKHandler | Always client-side | Mode-aware, can delegate |
| InstanceManager | Creates client renderers | Creates client OR connects to server |
| ViewStateAdapter | Local state sync | + Server frame metadata |
| Y.js Presence | Cursor positions | + Render mode per user |

### What Stays the Same

- **Data models** (Dataset, ViewConfiguration, etc.)
- **API endpoints** (add render session management)
- **UI components** (just display video instead of WebGL)
- **Collaboration** (still Y.js for presence)
- **Plugin architecture** (handlers still work)

---

## Implementation Phases

### Phase 1: Infrastructure (Sprint N)
- [ ] Set up GPU render server (Docker + NVIDIA)
- [ ] Implement basic WebRTC signaling
- [ ] Create RenderSession management

### Phase 2: VTK Server Renderer (Sprint N+1)
- [ ] Port VTK rendering to Python server
- [ ] Implement NVENC encoding
- [ ] Basic interaction protocol

### Phase 3: Handler Integration (Sprint N+2)
- [ ] Add RenderMode to InstanceTypeHandler
- [ ] Update VTKHandler with server mode
- [ ] Client-side video decoding

### Phase 4: VR Optimization (Sprint N+3)
- [ ] 90fps pipeline
- [ ] Foveated rendering
- [ ] Time warp / reprojection

### Phase 5: Multi-Tenant Scaling (Sprint N+4)
- [ ] GPU resource pooling
- [ ] Session routing
- [ ] Auto-scaling
