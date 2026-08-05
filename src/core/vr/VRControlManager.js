// src/core/vr/VRControlManager.js
// Manages desktop-to-VR control handoff

import { vr as log } from '@Utils/logger.js';
import { getUserId, getUserName } from '@Collaboration/presence/userManagement.js';
import { ydoc } from '@Collaboration/yjs/yjsSetup.js';

export class VRControlManager {
  constructor(session) {
    this._session = session;
    this._yControlRequests = ydoc.getMap(`vr-control-${session.id}`);
    this._pendingRequest = null;
    this._observers = [];

    this._setupObservers();
  }

  _setupObservers() {
    const observer = (event) => {
      event.changes.keys.forEach((change, key) => {
        const data = this._yControlRequests.get(key);

        if (data?.type === 'request' && data.toUserId === getUserId()) {
          // Someone is requesting to control us. No approval UI exists yet —
          // requests surface only through respondToControl() being called
          // programmatically (e.g. auto-approval when the session allows it).
          log.info(`VR control requested by ${data.fromUserName} (${data.fromUserId})`);
        }

        if (data?.type === 'response' && data.toUserId === getUserId()) {
          // Response to our request
          if (data.approved) {
            this._session.establishControl(getUserId(), data.fromUserId);
          }
          log.info(`VR control request ${data.approved ? 'approved' : 'denied'} by ${data.fromUserId}`);
          this._pendingRequest = null;
        }
      });
    };

    this._yControlRequests.observe(observer);
    this._observers.push(() => this._yControlRequests.unobserve(observer));
  }

  /**
   * Request control of a VR user
   */
  async requestControl(targetUserId) {
    if (this._pendingRequest) {
      throw new Error('Control request already pending');
    }

    const target = this._session.getParticipant(targetUserId);
    if (!target) {
      throw new Error('Target user not found');
    }

    if (!target.isVR()) {
      throw new Error('Can only control VR users');
    }

    if (target.isBeingControlled()) {
      throw new Error('User is already being controlled');
    }

    this._pendingRequest = { targetUserId };

    // Broadcast request via Y.js
    const requestId = `req_${Date.now()}`;
    this._yControlRequests.set(requestId, {
      type: 'request',
      fromUserId: getUserId(),
      fromUserName: getUserName(),
      toUserId: targetUserId,
      timestamp: Date.now(),
    });

    if (!this._session.requireControlApproval) {
      // Auto-approve
      this._session.establishControl(getUserId(), targetUserId);
      this._pendingRequest = null;
      return { status: 'established' };
    }

    return { status: 'pending' };
  }

  /**
   * Respond to a control request
   */
  respondToRequest(approved) {
    const responseId = `resp_${Date.now()}`;

    // Get the pending request for us
    let requestData = null;
    this._yControlRequests.forEach((data, key) => {
      if (data.type === 'request' && data.toUserId === getUserId()) {
        requestData = data;
      }
    });

    if (!requestData) return;

    if (approved) {
      this._session.establishControl(requestData.fromUserId, getUserId());
    } else {
      this._session.declineControlRequest(requestData.fromUserId, getUserId());
    }

    // Broadcast response
    this._yControlRequests.set(responseId, {
      type: 'response',
      fromUserId: getUserId(),
      toUserId: requestData.fromUserId,
      approved,
      timestamp: Date.now(),
    });
  }

  /**
   * Release control
   */
  async releaseControl() {
    this._session.releaseControl(getUserId());

    // Broadcast release
    const releaseId = `release_${Date.now()}`;
    this._yControlRequests.set(releaseId, {
      type: 'release',
      fromUserId: getUserId(),
      timestamp: Date.now(),
    });
  }

  /**
   * Check if we have a pending control request
   */
  hasPendingRequest() {
    return this._pendingRequest !== null;
  }

  /**
   * Get pending request info
   */
  getPendingRequest() {
    return this._pendingRequest;
  }

  /**
   * Re-key onto a different Y.js session id (session convergence — see
   * VRExplorationManager.startExploration / VRParticipantSync.rekey). Unlike
   * VRParticipantSync, this map is bound once in the CONSTRUCTOR
   * (`vr-control-<session.id>`), so without this method a re-keyed session
   * would silently keep reading/writing the pre-rekey map forever.
   *
   * @param {string} newSessionId
   */
  rekey(newSessionId) {
    if (!newSessionId || newSessionId === this._session.id) return;

    this._observers.forEach(cleanup => cleanup());
    this._observers = [];

    this._session.id = newSessionId;
    this._yControlRequests = ydoc.getMap(`vr-control-${newSessionId}`);
    this._pendingRequest = null;

    this._setupObservers();

    log.info(`VRControlManager re-keyed to session ${newSessionId}`);
  }

  cleanup() {
    this._observers.forEach(cleanup => cleanup());
    this._observers = [];
  }
}

export default VRControlManager;
