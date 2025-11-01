// ----------------------------------------------------------------------------
// VR Controllers - Handle Meta Quest / Oculus Controllers
// ----------------------------------------------------------------------------

import { modeManager } from '../core/modeManager.js';
import { getSceneObjects } from '../core/scene.js';
import { logInfo, logSuccess } from '../ui/react/hooks/useLogging.js';

class VRControllers {
  constructor() {
    this.controllers = [];
    this.initialized = false;
  }

  initialize() {
    // Wait for VR mode
    modeManager.onModeChange((mode) => {
      if (mode === 'vr') {
        this.setupControllers();
      } else {
        this.cleanupControllers();
      }
    });

    logInfo('VR controller system ready');
  }

  setupControllers() {
    const { fullScreenRenderer } = getSceneObjects();
    
    if (!fullScreenRenderer) {
      console.warn('Cannot setup VR controllers: no renderer');
      return;
    }

    try {
      // VTK.js handles controllers automatically through fullScreenRenderer
      // We just need to set up event listeners
      
      const session = modeManager.getVRSession();
      if (session) {
        // Listen for controller events
        session.addEventListener('selectstart', (event) => {
          console.log('Controller select start:', event);
          this.onSelectStart(event);
        });

        session.addEventListener('selectend', (event) => {
          console.log('Controller select end:', event);
          this.onSelectEnd(event);
        });

        session.addEventListener('squeezestart', (event) => {
          console.log('Controller squeeze start:', event);
          this.onSqueezeStart(event);
        });

        session.addEventListener('squeezeend', (event) => {
          console.log('Controller squeeze end:', event);
          this.onSqueezeEnd(event);
        });
      }

      this.initialized = true;
      logSuccess('VR controllers initialized');
      
    } catch (error) {
      console.error('Failed to setup VR controllers:', error);
    }
  }

  onSelectStart(event) {
    // Handle trigger press
    console.log('Trigger pressed on controller');
    // TODO: Implement interaction (e.g., select annotation, grab object)
  }

  onSelectEnd(event) {
    // Handle trigger release
    console.log('Trigger released');
  }

  onSqueezeStart(event) {
    // Handle grip press
    console.log('Grip pressed on controller');
    // TODO: Implement grab/move functionality
  }

  onSqueezeEnd(event) {
    // Handle grip release
    console.log('Grip released');
  }

  cleanupControllers() {
    this.controllers = [];
    this.initialized = false;
    logInfo('VR controllers cleaned up');
  }

  isInitialized() {
    return this.initialized;
  }
}

export const vrControllers = new VRControllers();