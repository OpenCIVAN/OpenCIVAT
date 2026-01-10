# VR Tools & Handler Extensions

## 1. VR Tool System

### 1.1 VRToolManager (NEW FILE)

**File**: `src/core/vr/tools/VRToolManager.js`

```javascript
// src/core/vr/tools/VRToolManager.js
// Manages VR tool lifecycle and input routing

import { vr as log } from '@Utils/logger.js';
import { VRSlicePlaneTool } from './VRSlicePlaneTool.js';
import { VRMeasureTool } from './VRMeasureTool.js';
import { VRAnnotationTool } from './VRAnnotationTool.js';
import { VRClipBoxTool } from './VRClipBoxTool.js';
import { VRProbeTool } from './VRProbeTool.js';

export class VRToolManager {
  constructor(handler, vrContext) {
    this._handler = handler;
    this._vrContext = vrContext;
    this._activeTool = null;
    
    // Register available tools
    this._tools = new Map([
      ['slice', new VRSlicePlaneTool()],
      ['measure', new VRMeasureTool()],
      ['annotate', new VRAnnotationTool()],
      ['clip', new VRClipBoxTool()],
      ['probe', new VRProbeTool()],
    ]);
    
    // Context passed to tools
    this._toolContext = {
      handler: this._handler,
      vrContext: this._vrContext,
      manager: this,
    };
  }
  
  /**
   * Activate a tool
   */
  async activateTool(toolId) {
    // Deactivate current tool
    if (this._activeTool) {
      await this._activeTool.deactivate();
    }
    
    // Activate new tool
    const tool = this._tools.get(toolId);
    if (!tool) {
      log.warn(`Unknown tool: ${toolId}`);
      return;
    }
    
    await tool.activate(this._toolContext);
    this._activeTool = tool;
    
    log.debug(`Activated tool: ${toolId}`);
  }
  
  /**
   * Deactivate current tool
   */
  async deactivateTool() {
    if (this._activeTool) {
      await this._activeTool.deactivate();
      this._activeTool = null;
    }
  }
  
  /**
   * Get active tool
   */
  getActiveTool() {
    return this._activeTool;
  }
  
  /**
   * Update - called every frame
   */
  update(inputState, frame) {
    if (!this._activeTool) return null;
    
    // Let active tool handle input
    const action = this._activeTool.handleInput(inputState, frame);
    
    // Render tool visuals
    this._activeTool.render(this._vrContext.renderer);
    
    return action;
  }
  
  /**
   * Get controller hints for UI
   */
  getControllerHints() {
    if (!this._activeTool) {
      return {
        left: {},
        right: { trigger: 'Select tool' },
      };
    }
    return this._activeTool.getControllerHints();
  }
  
  /**
   * Get available tools
   */
  getAvailableTools() {
    return Array.from(this._tools.entries()).map(([id, tool]) => ({
      id,
      name: tool.name,
      icon: tool.icon,
      category: tool.category,
    }));
  }
  
  /**
   * Cleanup
   */
  async cleanup() {
    await this.deactivateTool();
  }
}

export default VRToolManager;
```

### 1.2 VRSlicePlaneTool (NEW FILE)

**File**: `src/core/vr/tools/VRSlicePlaneTool.js`

```javascript
// src/core/vr/tools/VRSlicePlaneTool.js
// Interactive slicing plane tool for VR

import { VRToolInterface } from './VRToolInterface.js';
import { vr as log } from '@Utils/logger.js';

export class VRSlicePlaneTool extends VRToolInterface {
  constructor() {
    super({
      id: 'slice',
      name: 'Slice Plane',
      icon: 'scissors',
      category: 'visualization',
    });
    
    this._planes = [];
    this._activePlane = null;
    this._grabbedBy = null;
    this._initialGrabPose = null;
    this._initialPlaneTransform = null;
  }
  
  async activate(context) {
    await super.activate(context);
    
    // Create initial plane at data center if none exist
    if (this._planes.length === 0) {
      const bounds = context.vrContext.dataBounds;
      const center = [
        (bounds[0] + bounds[1]) / 2,
        (bounds[2] + bounds[3]) / 2,
        (bounds[4] + bounds[5]) / 2,
      ];
      
      this._activePlane = await this._createPlane(center, [0, 1, 0]);
      this._planes.push(this._activePlane);
    }
    
    log.debug('Slice plane tool activated');
  }
  
  async deactivate() {
    await super.deactivate();
    this._grabbedBy = null;
  }
  
  handleInput(inputState, frame) {
    const { controllers } = inputState;
    
    // Handle grab start (grip button)
    if (!this._grabbedBy) {
      for (const hand of ['left', 'right']) {
        const ctrl = controllers[hand];
        if (ctrl?.squeezePressed && this._isNearPlane(ctrl.pose)) {
          this._grabbedBy = hand;
          this._initialGrabPose = this._clonePose(ctrl.pose);
          this._initialPlaneTransform = {
            origin: [...this._activePlane.origin],
            normal: [...this._activePlane.normal],
          };
          return { type: 'grab-start', plane: this._activePlane };
        }
      }
    }
    
    // Handle active grab
    if (this._grabbedBy) {
      const ctrl = controllers[this._grabbedBy];
      
      // Released grip
      if (!ctrl?.squeezePressed) {
        this._grabbedBy = null;
        return { type: 'grab-end', plane: this._activePlane };
      }
      
      // Update plane position
      const delta = this._computePoseDelta(this._initialGrabPose, ctrl.pose);
      
      this._activePlane.origin = [
        this._initialPlaneTransform.origin[0] + delta.position.x,
        this._initialPlaneTransform.origin[1] + delta.position.y,
        this._initialPlaneTransform.origin[2] + delta.position.z,
      ];
      
      // Rotate normal
      this._activePlane.normal = this._rotateVector(
        this._initialPlaneTransform.normal,
        delta.rotation
      );
      
      // Update in handler
      this._context.handler.updateSlicePlane(
        this._context.vrContext,
        this._activePlane
      );
      
      return { 
        type: 'slice-plane-updated', 
        data: this._activePlane 
      };
    }
    
    // Thumbstick to slide along normal
    const right = controllers.right;
    if (right && Math.abs(right.thumbstick?.y) > 0.1 && !this._grabbedBy) {
      const slideSpeed = 0.02;
      const slideAmount = right.thumbstick.y * slideSpeed;
      
      this._activePlane.origin = [
        this._activePlane.origin[0] + this._activePlane.normal[0] * slideAmount,
        this._activePlane.origin[1] + this._activePlane.normal[1] * slideAmount,
        this._activePlane.origin[2] + this._activePlane.normal[2] * slideAmount,
      ];
      
      this._context.handler.updateSlicePlane(
        this._context.vrContext,
        this._activePlane
      );
      
      return { type: 'slice-plane-updated', data: this._activePlane };
    }
    
    // Trigger to create new plane
    const rightTrigger = controllers.right?.triggerPressed;
    if (rightTrigger && !this._lastTriggerState) {
      // Raycast to find position
      const hit = this._performRaycast(controllers.right, frame);
      if (hit) {
        const newPlane = await this._createPlane(hit.position, hit.normal);
        this._planes.push(newPlane);
        this._activePlane = newPlane;
        return { type: 'slice-plane-created', data: newPlane };
      }
    }
    this._lastTriggerState = rightTrigger;
    
    return null;
  }
  
  getControllerHints() {
    return {
      left: {
        grip: 'Grab plane to move',
      },
      right: {
        grip: 'Grab plane to move',
        thumbstick: 'Slide along normal',
        trigger: 'Create new plane',
      },
    };
  }
  
  async _createPlane(origin, normal) {
    const plane = {
      id: `slice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      origin: [...origin],
      normal: [...normal],
      visible: true,
      color: [1, 0.5, 0],
      opacity: 0.5,
    };
    
    await this._context.handler.addSlicePlane(
      this._context.vrContext,
      plane
    );
    
    return plane;
  }
  
  _isNearPlane(pose) {
    if (!pose || !this._activePlane) return false;
    
    const distance = this._distanceToPlane(
      pose.position,
      this._activePlane.origin,
      this._activePlane.normal
    );
    
    return Math.abs(distance) < 0.2; // 20cm threshold
  }
  
  _distanceToPlane(point, planeOrigin, planeNormal) {
    const d = 
      (point.x - planeOrigin[0]) * planeNormal[0] +
      (point.y - planeOrigin[1]) * planeNormal[1] +
      (point.z - planeOrigin[2]) * planeNormal[2];
    return d;
  }
  
  _clonePose(pose) {
    return {
      position: { ...pose.position },
      orientation: { ...pose.orientation },
    };
  }
  
  _computePoseDelta(initial, current) {
    return {
      position: {
        x: current.position.x - initial.position.x,
        y: current.position.y - initial.position.y,
        z: current.position.z - initial.position.z,
      },
      rotation: this._getRotationDelta(initial.orientation, current.orientation),
    };
  }
  
  _getRotationDelta(q1, q2) {
    // Simplified quaternion delta
    return {
      x: q2.x - q1.x,
      y: q2.y - q1.y,
      z: q2.z - q1.z,
      w: q2.w - q1.w,
    };
  }
  
  _rotateVector(vec, rotation) {
    // Simplified rotation - should use proper quaternion rotation
    return vec; // TODO: Implement proper rotation
  }
  
  _performRaycast(controller, frame) {
    // Delegate to handler
    return this._context.handler.raycastVR?.(
      this._context.vrContext,
      controller.targetRay
    );
  }
}

export default VRSlicePlaneTool;
```

---

## 2. Handler Interface Extensions

**File**: `src/core/instances/types/InstanceTypeInterface.js` (ADD)

Add these methods to the existing InstanceTypeHandler class:

```javascript
// =========================================================================
// VR EXPLORATION (NEW SECTION)
// These methods enable immersive VR exploration features
// =========================================================================

/**
 * Does this handler support immersive VR exploration?
 * 
 * Different from supportsInstanceVR() which just views in VR.
 * Exploration means fly-through, scaling, slicing, etc.
 * 
 * @returns {boolean}
 */
supportsVRExploration() {
  return false;
}

/**
 * Get VR exploration capabilities
 * 
 * @returns {Object}
 */
getVRExplorationCapabilities() {
  return {
    supported: this.supportsVRExploration(),
    explorationModes: [],  // ['fly', 'teleport', 'walk', 'scale']
    tools: [],             // ['slice', 'measure', 'annotate', 'clip', 'probe']
    maxRegionSize: null,
    supportsLiveSync: false,
    requiresPreprocessing: [],
  };
}

/**
 * Prepare data for VR exploration
 * 
 * Called before entering VR to check if preprocessing is needed.
 * May return status indicating preprocessing required.
 * 
 * @param {Object} instanceData
 * @param {VRExplorationSession} session
 * @returns {Promise<Object>} { ready: boolean, message?: string }
 */
async prepareForVRExploration(instanceData, session) {
  return { ready: true };
}

/**
 * Enter VR exploration mode
 * 
 * @param {Object} instanceData
 * @param {VRExplorationSession} session
 * @param {XRSession} xrSession
 * @returns {Promise<Object>} VR exploration context
 */
async enterVRExploration(instanceData, session, xrSession) {
  throw new Error(
    `${this.getDisplayName()} does not support VR exploration. ` +
    `Set supportsVRExploration() to true and implement this method.`
  );
}

/**
 * Update VR exploration frame
 * 
 * @param {Object} vrContext - From enterVRExploration
 * @param {XRFrame} frame
 * @param {Object} inputState
 */
async updateVRExploration(vrContext, frame, inputState) {
  // Default: do nothing
}

/**
 * Exit VR exploration
 * 
 * @param {Object} vrContext
 * @returns {Promise<Object>} Final state for archival
 */
async exitVRExploration(vrContext) {
  return {};
}

// =========================================================================
// VR TOOL SUPPORT
// =========================================================================

/**
 * Add a slice plane
 * 
 * @param {Object} vrContext
 * @param {Object} plane - { id, origin, normal, visible, color, opacity }
 */
async addSlicePlane(vrContext, plane) {
  // Override in handler
}

/**
 * Update a slice plane
 * 
 * @param {Object} vrContext
 * @param {Object} plane
 */
async updateSlicePlane(vrContext, plane) {
  // Override in handler
}

/**
 * Remove a slice plane
 * 
 * @param {Object} vrContext
 * @param {string} planeId
 */
async removeSlicePlane(vrContext, planeId) {
  // Override in handler
}

/**
 * Perform raycast in VR
 * 
 * @param {Object} vrContext
 * @param {Object} ray - { origin, direction }
 * @returns {Object|null} { hit, position, normal, distance }
 */
raycastVR(vrContext, ray) {
  return null;
}

/**
 * Get data value at position
 * 
 * @param {Object} vrContext
 * @param {Object} position - { x, y, z }
 * @returns {Object|null} Data value info
 */
probeDataVR(vrContext, position) {
  return null;
}
```

---

## 3. VTK Handler VR Exploration Implementation

**File**: `src/core/instances/types/vtk/VTKInstanceHandler.js` (ADD)

Add to the existing VTKInstanceHandler class:

```javascript
// =========================================================================
// VR EXPLORATION IMPLEMENTATION
// =========================================================================

supportsVRExploration() {
  return true;
}

getVRExplorationCapabilities() {
  return {
    supported: true,
    explorationModes: ['fly', 'teleport', 'walk', 'scale'],
    tools: ['slice', 'measure', 'annotate', 'clip', 'probe'],
    maxRegionSize: null,
    supportsLiveSync: true,
    requiresPreprocessing: ['lod-generation'],
  };
}

async prepareForVRExploration(instanceData, session) {
  const dataset = instanceData.dataset;
  
  if (!dataset?.vrReadiness) {
    return { ready: false, message: 'VR readiness not available' };
  }
  
  if (dataset.vrReadiness.status === 'ready') {
    return { ready: true };
  }
  
  if (dataset.vrReadiness.status === 'processing') {
    return { 
      ready: false, 
      message: 'VR preprocessing in progress',
      progress: dataset.vrReadiness.progress,
    };
  }
  
  return { ready: false, message: 'VR preprocessing required' };
}

async enterVRExploration(instanceData, session, xrSession) {
  const { instanceId, sceneObjects } = instanceData;
  
  log.info(`Entering VR exploration for instance ${instanceId}`);
  
  const { renderer, renderWindow, camera, openGLRenderWindow } = sceneObjects;
  
  // Get dataset bounds
  const dataset = instanceData.dataset;
  const bounds = dataset?.vrReadiness?.bounds || this._computeBounds(instanceData);
  
  // Store original camera state
  const originalCameraState = {
    position: camera.getPosition(),
    focalPoint: camera.getFocalPoint(),
    viewUp: camera.getViewUp(),
  };
  
  // Initialize VR-specific rendering
  const vrContext = {
    instanceId,
    session,
    xrSession,
    sceneObjects,
    dataBounds: bounds,
    originalCameraState,
    
    // VR state
    vrScale: session.defaultVRScale,
    vrOrigin: [0, 0, 0],
    
    // Slice planes
    slicePlanes: new Map(),
    
    // Measurements
    measurements: [],
    
    // Clipping
    clipBox: null,
  };
  
  // Set up XR layer
  await this._setupXRLayer(vrContext);
  
  // Initialize VR controllers visualization
  await this._initVRControllers(vrContext);
  
  return vrContext;
}

async updateVRExploration(vrContext, frame, inputState) {
  const { sceneObjects, xrSession } = vrContext;
  const { renderWindow, renderer } = sceneObjects;
  
  // Get reference space
  const refSpace = await xrSession.requestReferenceSpace('local-floor');
  const viewerPose = frame.getViewerPose(refSpace);
  
  if (!viewerPose) return;
  
  // Update camera based on head pose
  this._updateCameraFromPose(vrContext, viewerPose);
  
  // Update controller visuals
  this._updateControllerVisuals(vrContext, inputState);
  
  // Render
  renderWindow.render();
}

async exitVRExploration(vrContext) {
  const { sceneObjects, originalCameraState, slicePlanes } = vrContext;
  const { camera, renderWindow, renderer } = sceneObjects;
  
  // Restore original camera
  camera.setPosition(...originalCameraState.position);
  camera.setFocalPoint(...originalCameraState.focalPoint);
  camera.setViewUp(...originalCameraState.viewUp);
  
  // Clean up slice planes
  for (const [id, planeData] of slicePlanes) {
    if (planeData.actor) {
      renderer.removeActor(planeData.actor);
    }
  }
  slicePlanes.clear();
  
  // Clean up controller visuals
  this._cleanupVRControllers(vrContext);
  
  renderWindow.render();
  
  log.info('Exited VR exploration');
  
  return {
    finalSlicePlanes: Array.from(slicePlanes.values()),
    measurements: vrContext.measurements,
  };
}

// =========================================================================
// VR SLICE PLANE SUPPORT
// =========================================================================

async addSlicePlane(vrContext, plane) {
  const { sceneObjects, slicePlanes } = vrContext;
  const { renderer, renderWindow } = sceneObjects;
  
  // Create VTK plane actor
  const planeSource = vtkPlaneSource.newInstance();
  planeSource.setOrigin(...plane.origin);
  planeSource.setNormal(...plane.normal);
  
  // Size plane appropriately
  const size = this._computePlaneSize(vrContext.dataBounds);
  planeSource.setXResolution(1);
  planeSource.setYResolution(1);
  // Set corners based on size...
  
  const mapper = vtkMapper.newInstance();
  mapper.setInputConnection(planeSource.getOutputPort());
  
  const actor = vtkActor.newInstance();
  actor.setMapper(mapper);
  actor.getProperty().setColor(...(plane.color || [1, 0.5, 0]));
  actor.getProperty().setOpacity(plane.opacity || 0.5);
  actor.getProperty().setRepresentationToSurface();
  
  renderer.addActor(actor);
  
  slicePlanes.set(plane.id, {
    ...plane,
    source: planeSource,
    actor,
  });
  
  renderWindow.render();
}

async updateSlicePlane(vrContext, plane) {
  const planeData = vrContext.slicePlanes.get(plane.id);
  if (!planeData) return;
  
  planeData.source.setOrigin(...plane.origin);
  planeData.source.setNormal(...plane.normal);
  planeData.source.modified();
  
  Object.assign(planeData, plane);
  
  vrContext.sceneObjects.renderWindow.render();
}

async removeSlicePlane(vrContext, planeId) {
  const planeData = vrContext.slicePlanes.get(planeId);
  if (!planeData) return;
  
  vrContext.sceneObjects.renderer.removeActor(planeData.actor);
  vrContext.slicePlanes.delete(planeId);
  
  vrContext.sceneObjects.renderWindow.render();
}

// =========================================================================
// VR RAYCASTING
// =========================================================================

raycastVR(vrContext, ray) {
  const { sceneObjects } = vrContext;
  
  // Create VTK picker
  const picker = vtkCellPicker.newInstance();
  picker.setTolerance(0.001);
  
  // Convert ray to VTK format
  const p1 = [ray.origin.x, ray.origin.y, ray.origin.z];
  const direction = [ray.direction.x, ray.direction.y, ray.direction.z];
  const p2 = [
    p1[0] + direction[0] * 1000,
    p1[1] + direction[1] * 1000,
    p1[2] + direction[2] * 1000,
  ];
  
  const hit = picker.pick(p1, p2, sceneObjects.renderer);
  
  if (hit) {
    const position = picker.getPickPosition();
    const normal = picker.getPickNormal();
    
    return {
      hit: true,
      position: { x: position[0], y: position[1], z: position[2] },
      normal: { x: normal[0], y: normal[1], z: normal[2] },
      distance: Math.sqrt(
        (position[0] - p1[0]) ** 2 +
        (position[1] - p1[1]) ** 2 +
        (position[2] - p1[2]) ** 2
      ),
    };
  }
  
  return null;
}

probeDataVR(vrContext, position) {
  // Find data value at position
  // This depends on the data type (points, volume, etc.)
  const { sceneObjects } = vrContext;
  
  // For point data, find nearest point
  // For volume, sample at position
  
  return null; // TODO: Implement based on data type
}

// =========================================================================
// VR HELPER METHODS
// =========================================================================

async _setupXRLayer(vrContext) {
  const { xrSession, sceneObjects } = vrContext;
  const { openGLRenderWindow } = sceneObjects;
  
  // Get WebGL context with XR compatibility
  const canvas = openGLRenderWindow.getCanvas();
  const gl = canvas.getContext('webgl2', { xrCompatible: true });
  
  // Create XR layer
  const xrLayer = new XRWebGLLayer(xrSession, gl);
  
  await xrSession.updateRenderState({
    baseLayer: xrLayer,
  });
  
  vrContext.xrLayer = xrLayer;
}

async _initVRControllers(vrContext) {
  // Create controller visual representations
  // Uses VTK actors for controller models
  vrContext.controllerActors = {
    left: this._createControllerActor('left'),
    right: this._createControllerActor('right'),
  };
  
  for (const actor of Object.values(vrContext.controllerActors)) {
    if (actor) {
      vrContext.sceneObjects.renderer.addActor(actor);
    }
  }
}

_createControllerActor(handedness) {
  const color = handedness === 'left' ? [0.8, 0.2, 0.2] : [0.2, 0.2, 0.8];
  
  const cylinderSource = vtkCylinderSource.newInstance({
    height: 0.1,
    radius: 0.015,
    resolution: 16,
  });
  
  const mapper = vtkMapper.newInstance();
  mapper.setInputConnection(cylinderSource.getOutputPort());
  
  const actor = vtkActor.newInstance();
  actor.setMapper(mapper);
  actor.getProperty().setColor(...color);
  
  return actor;
}

_updateControllerVisuals(vrContext, inputState) {
  const { controllerActors } = vrContext;
  
  for (const hand of ['left', 'right']) {
    const ctrl = inputState.controllers[hand];
    const actor = controllerActors[hand];
    
    if (ctrl?.pose && actor) {
      const pos = ctrl.pose.position;
      actor.setPosition(pos.x, pos.y, pos.z);
      // Would also set orientation from quaternion
    }
  }
}

_cleanupVRControllers(vrContext) {
  const { controllerActors, sceneObjects } = vrContext;
  
  for (const actor of Object.values(controllerActors)) {
    if (actor) {
      sceneObjects.renderer.removeActor(actor);
    }
  }
}

_updateCameraFromPose(vrContext, viewerPose) {
  const { sceneObjects, vrScale, vrOrigin } = vrContext;
  const { camera } = sceneObjects;
  
  const pos = viewerPose.transform.position;
  const orient = viewerPose.transform.orientation;
  
  // Convert VR position to data coordinates
  const dataPos = [
    pos.x / vrScale + vrOrigin[0],
    pos.y / vrScale + vrOrigin[1],
    pos.z / vrScale + vrOrigin[2],
  ];
  
  camera.setPosition(...dataPos);
  
  // Compute focal point from orientation
  // (forward direction from quaternion)
  const forward = this._forwardFromQuaternion(orient);
  camera.setFocalPoint(
    dataPos[0] + forward[0],
    dataPos[1] + forward[1],
    dataPos[2] + forward[2]
  );
}

_forwardFromQuaternion(q) {
  // Extract forward vector from quaternion
  const x = 2 * (q.x * q.z + q.w * q.y);
  const y = 2 * (q.y * q.z - q.w * q.x);
  const z = 1 - 2 * (q.x * q.x + q.y * q.y);
  return [x, y, z];
}

_computePlaneSize(bounds) {
  const sizeX = bounds[1] - bounds[0];
  const sizeY = bounds[3] - bounds[2];
  const sizeZ = bounds[5] - bounds[4];
  return Math.max(sizeX, sizeY, sizeZ) * 1.5;
}

_computeBounds(instanceData) {
  // Fallback bounds computation
  return [-1, 1, -1, 1, -1, 1];
}
```
