// src/core/vr/avatars/VRMAvatar.js
// VRM avatar loader using @pixiv/three-vrm + Three.js.
//
// Rendering approach: Three.js renders the VRM to a hidden <canvas>, then the
// pixel data is uploaded to a VTK.js texture on a billboard plane each time
// the pose changes. This avoids sharing the WebGL context between VTK.js and
// Three.js, which is fragile in WebXR.
//
// Performance note: readPixels() stalls the GPU pipeline. Texture upload only
// happens when the pose is updated (dirty flag), not every render frame. At
// 20fps avatar updates and typical session sizes (2–8 users) the overhead is
// acceptable. For larger sessions, switch to SimpleAvatarFallback.

import { vr as log } from '@Utils/logger.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, VRMHumanBoneName } from '@pixiv/three-vrm';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkPlaneSource from '@kitware/vtk.js/Filters/Sources/PlaneSource';
import vtkTexture from '@kitware/vtk.js/Rendering/Core/Texture';
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import { AvatarLabel } from './AvatarLabel.js';

const CANVAS_W = 256;
const CANVAS_H = 512;
const BILLBOARD_W = 0.35; // meters wide in VR
const BILLBOARD_H = 0.70; // meters tall

/** Cache loaded VRM models by URL to avoid redundant network fetches. */
const _vrmCache = new Map();

export class VRMAvatar {
  constructor() {
    this._renderer = null;      // VTK.js renderer
    this._userInfo = null;

    // Three.js off-DOM canvas for VRM rendering
    this._canvas = null;
    this._threeRenderer = null;
    this._threeScene = null;
    this._threeCamera = null;
    this._ambientLight = null;
    this._dirLight = null;

    // VRM model
    this._vrm = null;

    // VTK.js billboard
    this._vtkActor = null;
    this._vtkTexture = null;
    this._vtkImage = null;
    this._planeSource = null;

    this._label = new AvatarLabel();
    this._dirty = false;
    this._loaded = false;
    this._failed = false;
    this._speaking = false;

    this._loadListeners = [];
    this._failListeners = [];
  }

  /**
   * @param {string} url - URL to a .vrm file
   * @param {import('./AvatarTypes.js').AvatarUserInfo} userInfo
   * @param {object} vtkRenderer - VTK.js renderer to add the billboard actor to
   */
  async load(url, userInfo, vtkRenderer) {
    this._userInfo = userInfo;
    this._renderer = vtkRenderer;

    this._initThreeRenderer();
    this._createBillboard(vtkRenderer);
    this._label.create(vtkRenderer, userInfo.displayName, userInfo.color);

    try {
      const vrm = await this._loadVRM(url);
      this._vrm = vrm;
      this._threeScene.add(vrm.scene);
      this._loaded = true;
      this._dirty = true;
      this._renderFrame();
      this._uploadTexture();
      this._loadListeners.forEach((fn) => fn());
      log.debug('VRMAvatar loaded:', url);
    } catch (err) {
      log.warn('VRMAvatar failed to load, falling back:', err.message);
      this._failed = true;
      this._failListeners.forEach((fn) => fn(err));
    }
  }

  /** @param {import('./AvatarTypes.js').AvatarPose} pose - Scene-space positions */
  updatePose(pose) {
    if (!pose || !this._vrm) return;

    const humanoid = this._vrm.humanoid;
    if (!humanoid) return;

    // Head rotation — map XR orientation to VRM head bone
    if (pose.head?.orientation) {
      const { x, y, z, w } = pose.head.orientation;
      const headNode = humanoid.getBoneNode(VRMHumanBoneName.Head);
      if (headNode) headNode.quaternion.set(x, y, z, w);
    }

    // Rough upper-body arm direction from hand positions relative to head
    if (pose.head?.position) {
      this._updateArmPose(humanoid, pose, 'left', VRMHumanBoneName.LeftUpperArm, VRMHumanBoneName.LeftLowerArm);
      this._updateArmPose(humanoid, pose, 'right', VRMHumanBoneName.RightUpperArm, VRMHumanBoneName.RightLowerArm);
    }

    // Update VRM internals
    this._vrm.update(0);

    // Reposition billboard actor at head location
    if (pose.head?.position) {
      const { x, y, z } = pose.head.position;
      // Center the billboard at eye level
      this._vtkActor.setPosition(x - BILLBOARD_W / 2, y - BILLBOARD_H * 0.8, z);
      this._label.setPosition(x, y, z);
    }

    this._dirty = true;
    this._renderFrame();
    this._uploadTexture();
  }

  faceLabelToward(x, y, z) {
    this._label.faceToward(x, y, z);
    // Orient billboard to face the same direction
    const pos = this._vtkActor?.getPosition() || [0, 0, 0];
    const dx = x - pos[0];
    const dz = z - pos[2];
    const yaw = Math.atan2(dx, dz) * (180 / Math.PI);
    this._vtkActor?.setOrientation(0, yaw, 0);
  }

  setSpeaking(speaking) {
    if (this._speaking === speaking) return;
    this._speaking = speaking;
    this._label.setSpeaking(speaking);
  }

  setVisible(visible) {
    this._vtkActor?.setVisibility(visible);
    this._label.setVisible(visible);
  }

  get isLoaded() { return this._loaded; }
  get isFailed() { return this._failed; }

  onLoad(fn) { this._loadListeners.push(fn); }
  onFail(fn) { this._failListeners.push(fn); }

  dispose(renderer) {
    const r = renderer || this._renderer;
    if (this._vtkActor) r?.removeActor(this._vtkActor);
    this._label.dispose(r);

    if (this._threeRenderer) {
      this._threeRenderer.dispose();
      this._threeRenderer = null;
    }
    if (this._vrm) {
      VRMUtils.deepDispose(this._vrm.scene);
      this._vrm = null;
    }
    if (this._canvas?.parentNode) {
      this._canvas.parentNode.removeChild(this._canvas);
    }
    this._canvas = null;
    this._vtkActor = null;
    this._vtkTexture = null;
    this._vtkImage = null;
    this._loadListeners = [];
    this._failListeners = [];
  }

  // ---------------------------------------------------------------------------

  _initThreeRenderer() {
    // Create a hidden canvas for off-DOM Three.js rendering
    this._canvas = document.createElement('canvas');
    this._canvas.width = CANVAS_W;
    this._canvas.height = CANVAS_H;
    this._canvas.style.display = 'none';
    document.body.appendChild(this._canvas);

    this._threeRenderer = new THREE.WebGLRenderer({
      canvas: this._canvas,
      alpha: true,
      antialias: false,
      preserveDrawingBuffer: true, // needed for readPixels
    });
    this._threeRenderer.setSize(CANVAS_W, CANVAS_H);
    this._threeRenderer.outputColorSpace = THREE.SRGBColorSpace;

    this._threeScene = new THREE.Scene();

    // Lighting
    this._ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    this._threeScene.add(this._ambientLight);
    this._dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    this._dirLight.position.set(1, 2, 1.5);
    this._threeScene.add(this._dirLight);

    // Camera positioned to frame a standing avatar (eye-level shot)
    this._threeCamera = new THREE.PerspectiveCamera(45, CANVAS_W / CANVAS_H, 0.1, 20);
    this._threeCamera.position.set(0, 1.2, 1.4);
    this._threeCamera.lookAt(0, 0.9, 0);
  }

  _createBillboard(vtkRenderer) {
    // A plane that will carry the VRM texture
    this._planeSource = vtkPlaneSource.newInstance({
      origin: [0, 0, 0],
      point1: [BILLBOARD_W, 0, 0],
      point2: [0, BILLBOARD_H, 0],
    });

    const mapper = vtkMapper.newInstance();
    mapper.setInputConnection(this._planeSource.getOutputPort());

    this._vtkTexture = vtkTexture.newInstance();
    this._vtkTexture.setInterpolate(true);

    this._vtkActor = vtkActor.newInstance();
    this._vtkActor.setMapper(mapper);
    this._vtkActor.addTexture(this._vtkTexture);
    this._vtkActor.getProperty().setOpacity(1.0);
    this._vtkActor.setVisibility(false);
    // The VR renderer IS the desktop renderer, and VR raycasting
    // (VTKInstanceHandler._getVRPickTargets) filters candidates by
    // pickability — an unpickable-by-default VRM avatar billboard would
    // otherwise stand between the user and the data and absorb probe/
    // measure/teleport hits.
    this._vtkActor.setPickable(false);

    vtkRenderer.addActor(this._vtkActor);
  }

  async _loadVRM(url) {
    if (_vrmCache.has(url)) return _vrmCache.get(url);

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    const gltf = await loader.loadAsync(url);
    const vrm = gltf.userData.vrm;

    if (!vrm) throw new Error('No VRM data found in GLTF');

    // Fix VRM 0.x coordinate system to VRM 1.x convention
    VRMUtils.rotateVRM0(vrm);
    _vrmCache.set(url, vrm);

    return vrm;
  }

  _updateArmPose(humanoid, pose, hand, upperBoneName, lowerBoneName) {
    const handPose = hand === 'left' ? pose.leftHand : pose.rightHand;
    if (!handPose?.position || !handPose.visible) return;

    const head = pose.head.position;
    const hp = handPose.position;

    // Direction vector from head to hand in scene space
    const dx = hp.x - head.x;
    const dy = hp.y - head.y;
    const dz = hp.z - head.z;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

    // Rough pitch/yaw for upper arm
    const pitch = Math.asin(-dy / len);
    const yaw = Math.atan2(dx, dz);

    const upperNode = humanoid.getBoneNode(upperBoneName);
    if (upperNode) {
      upperNode.rotation.set(pitch, yaw * (hand === 'left' ? 1 : -1), 0, 'XYZ');
    }
  }

  _renderFrame() {
    if (!this._threeRenderer || !this._threeScene || !this._threeCamera) return;
    this._threeRenderer.render(this._threeScene, this._threeCamera);
  }

  _uploadTexture() {
    if (!this._dirty || !this._threeRenderer) return;
    this._dirty = false;

    const gl = this._threeRenderer.getContext();
    const pixels = new Uint8Array(CANVAS_W * CANVAS_H * 4);
    gl.readPixels(0, 0, CANVAS_W, CANVAS_H, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    // WebGL reads bottom-to-top; flip to top-to-bottom for VTK texture
    const flipped = new Uint8Array(CANVAS_W * CANVAS_H * 4);
    for (let row = 0; row < CANVAS_H; row++) {
      const src = (CANVAS_H - 1 - row) * CANVAS_W * 4;
      const dst = row * CANVAS_W * 4;
      flipped.set(pixels.subarray(src, src + CANVAS_W * 4), dst);
    }

    if (!this._vtkImage) {
      this._vtkImage = vtkImageData.newInstance();
      this._vtkImage.setDimensions(CANVAS_W, CANVAS_H, 1);
      this._vtkImage.setSpacing(1, 1, 1);
      this._vtkImage.setOrigin(0, 0, 0);
    }

    const scalars = vtkDataArray.newInstance({
      numberOfComponents: 4,
      values: flipped,
      dataType: 'Uint8Array',
    });
    scalars.setName('scalars');
    this._vtkImage.getPointData().setScalars(scalars);
    this._vtkImage.modified();

    this._vtkTexture.setInputData(this._vtkImage);
    this._vtkTexture.modified();

    // Show billboard once first upload is complete
    this._vtkActor.setVisibility(true);
  }
}

export default VRMAvatar;
