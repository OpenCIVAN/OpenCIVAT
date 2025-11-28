// src/core/vr/VRManager.js
// Manages VR session lifecycle and mode transitions
//
// STUB: Structure only, implementation deferred per DEC-014
// Architecture designed for VR, implemented desktop-first for debugging
//
// VR Modes:
// - 'inactive': Desktop mode, no VR session
// - 'grid': Views arranged in curved arc around user (Fiesta-style)
// - 'isolated': Single view at room-scale, user can walk around

/**
 * VRManager - Manages VR session lifecycle
 *
 * Responsibilities:
 * - Check WebXR availability and capabilities
 * - Enter/exit VR sessions
 * - Switch between grid and isolation modes
 * - Coordinate with handlers for VR rendering
 */
export class VRManager {
  constructor() {
    this._mode = 'inactive'; // 'inactive' | 'grid' | 'isolated'
    this._xrSession = null;
    this._isolatedViewId = null;
    this._referenceSpace = null;

    // Event listeners
    this._listeners = {
      modeChanged: [],
      sessionStarted: [],
      sessionEnded: [],
      isolationEntered: [],
      isolationExited: [],
    };

    // Bind methods for event handlers
    this._handleSessionEnd = this._handleSessionEnd.bind(this);
  }

  // ===========================================================================
  // CAPABILITY DETECTION
  // ===========================================================================

  /**
   * Check if WebXR is available in the browser
   */
  isVRSupported() {
    return (
      typeof navigator !== 'undefined' &&
      'xr' in navigator &&
      typeof navigator.xr.isSessionSupported === 'function'
    );
  }

  /**
   * Check for specific VR capabilities
   * @returns {Promise<{supported: boolean, reason: string|null, features: string[]}>}
   */
  async checkVRCapabilities() {
    if (!this.isVRSupported()) {
      return {
        supported: false,
        reason: 'WebXR not available in this browser',
        features: [],
      };
    }

    try {
      const immersiveSupported = await navigator.xr.isSessionSupported(
        'immersive-vr'
      );

      if (!immersiveSupported) {
        return {
          supported: false,
          reason: 'Immersive VR not supported on this device',
          features: [],
        };
      }

      // Check for optional features
      const features = ['immersive-vr'];

      // These checks would need actual session to verify, so we just list potential
      const potentialFeatures = [
        'local-floor',
        'bounded-floor',
        'hand-tracking',
        'layers',
      ];

      return {
        supported: true,
        reason: null,
        features,
        potentialFeatures,
      };
    } catch (error) {
      return {
        supported: false,
        reason: `WebXR check failed: ${error.message}`,
        features: [],
      };
    }
  }

  // ===========================================================================
  // SESSION MANAGEMENT
  // ===========================================================================

  /**
   * Enter VR mode
   * @returns {Promise<void>}
   */
  async enterVR() {
    console.log('VRManager.enterVR() - STUB: Not fully implemented');

    if (this._xrSession) {
      console.warn('VR session already active');
      return;
    }

    if (!this.isVRSupported()) {
      throw new Error('WebXR is not supported in this browser');
    }

    // TODO: Full implementation
    // 1. Request XR session with required features
    // 2. Set up XR render loop
    // 3. Initialize VRGridLayout
    // 4. Switch handlers to VR mode
    // 5. Set up input sources (controllers, hands)

    try {
      // Request immersive session
      // this._xrSession = await navigator.xr.requestSession('immersive-vr', {
      //   requiredFeatures: ['local-floor'],
      //   optionalFeatures: ['hand-tracking', 'bounded-floor'],
      // });

      // this._xrSession.addEventListener('end', this._handleSessionEnd);

      // Get reference space
      // this._referenceSpace = await this._xrSession.requestReferenceSpace('local-floor');

      this._mode = 'grid';
      this._emit('sessionStarted', { session: this._xrSession });
      this._emit('modeChanged', { mode: this._mode });

      console.log('VR session started (stub mode)');
    } catch (error) {
      console.error('Failed to enter VR:', error);
      throw new Error(`Failed to enter VR: ${error.message}`);
    }
  }

  /**
   * Exit VR mode
   * @returns {Promise<void>}
   */
  async exitVR() {
    console.log('VRManager.exitVR() - STUB: Not fully implemented');

    if (!this._xrSession) {
      console.warn('No VR session to exit');
      return;
    }

    // TODO: Full implementation
    // 1. End XR session
    // 2. Restore desktop rendering
    // 3. Clean up VR resources
    // 4. Switch handlers back to desktop mode

    try {
      // await this._xrSession.end();
      this._cleanup();

      console.log('VR session ended');
    } catch (error) {
      console.error('Error exiting VR:', error);
      this._cleanup();
    }
  }

  /**
   * Handle XR session end event
   */
  _handleSessionEnd() {
    console.log('VR session ended by system');
    this._cleanup();
  }

  /**
   * Clean up after VR session
   */
  _cleanup() {
    if (this._xrSession) {
      this._xrSession.removeEventListener('end', this._handleSessionEnd);
    }

    this._xrSession = null;
    this._referenceSpace = null;
    this._mode = 'inactive';
    this._isolatedViewId = null;

    this._emit('sessionEnded', {});
    this._emit('modeChanged', { mode: this._mode });
  }

  // ===========================================================================
  // ISOLATION MODE (Room-scale single view)
  // ===========================================================================

  /**
   * Enter isolation mode - pull single view to room-scale
   * User can walk around the 3D model
   *
   * @param {string} viewId - The ViewConfiguration ID to isolate
   */
  enterIsolationMode(viewId) {
    console.log(
      `VRManager.enterIsolationMode(${viewId}) - STUB: Not fully implemented`
    );

    if (this._mode !== 'grid') {
      console.warn('Must be in VR grid mode to enter isolation');
      return;
    }

    // TODO: Full implementation
    // 1. Scale up selected view to room size
    // 2. Hide other views (fade out)
    // 3. Enable room-scale tracking
    // 4. Show "return to grid" UI
    // 5. Position model at comfortable viewing distance

    this._mode = 'isolated';
    this._isolatedViewId = viewId;

    this._emit('isolationEntered', { viewId });
    this._emit('modeChanged', { mode: this._mode, isolatedViewId: viewId });

    console.log(`Entered isolation mode for view: ${viewId}`);
  }

  /**
   * Exit isolation mode - return to grid view
   */
  exitIsolationMode() {
    console.log('VRManager.exitIsolationMode() - STUB: Not fully implemented');

    if (this._mode !== 'isolated') {
      console.warn('Not in isolation mode');
      return;
    }

    // TODO: Full implementation
    // 1. Scale down view
    // 2. Restore grid layout (fade in)
    // 3. Return to grid tracking mode

    const previousViewId = this._isolatedViewId;
    this._mode = 'grid';
    this._isolatedViewId = null;

    this._emit('isolationExited', { viewId: previousViewId });
    this._emit('modeChanged', { mode: this._mode });

    console.log('Exited isolation mode, returned to grid');
  }

  // ===========================================================================
  // STATE GETTERS
  // ===========================================================================

  /**
   * Get current VR state
   */
  getState() {
    return {
      mode: this._mode,
      isolatedViewId: this._isolatedViewId,
      hasSession: this._xrSession !== null,
      isInVR: this._mode !== 'inactive',
      isIsolated: this._mode === 'isolated',
    };
  }

  /**
   * Get current mode
   */
  getMode() {
    return this._mode;
  }

  /**
   * Check if currently in VR
   */
  isInVR() {
    return this._mode !== 'inactive';
  }

  /**
   * Check if in isolation mode
   */
  isIsolated() {
    return this._mode === 'isolated';
  }

  /**
   * Get the isolated view ID (if in isolation mode)
   */
  getIsolatedViewId() {
    return this._isolatedViewId;
  }

  // ===========================================================================
  // EVENT HANDLING
  // ===========================================================================

  /**
   * Subscribe to VR events
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this._listeners[event]) {
      console.warn(`Unknown VR event: ${event}`);
      return () => {};
    }

    this._listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from VR events
   */
  off(event, callback) {
    if (this._listeners[event]) {
      this._listeners[event] = this._listeners[event].filter(
        (cb) => cb !== callback
      );
    }
  }

  /**
   * Emit event to listeners
   */
  _emit(event, data) {
    if (this._listeners[event]) {
      this._listeners[event].forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`VR event handler error (${event}):`, error);
        }
      });
    }
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  /**
   * Dispose of VR manager resources
   */
  dispose() {
    if (this._xrSession) {
      this.exitVR();
    }

    // Clear all listeners
    Object.keys(this._listeners).forEach((event) => {
      this._listeners[event] = [];
    });
  }
}

// Singleton instance
export const vrManager = new VRManager();
