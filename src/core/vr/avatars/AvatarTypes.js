// src/core/vr/avatars/AvatarTypes.js
// Shared type definitions for the VR avatar system

/**
 * @typedef {Object} AvatarUserInfo
 * @property {string} userId
 * @property {string} displayName
 * @property {string} color - CSS hex color, e.g. '#ff6b6b'
 * @property {string} [avatarUrl] - URL to a .vrm file; omit to use procedural fallback
 * @property {boolean} [isLocal] - True for the local user's own avatar
 */

/**
 * @typedef {Object} AvatarPosePoint
 * @property {number} x
 * @property {number} y
 * @property {number} z
 */

/**
 * @typedef {Object} AvatarPoseOrientation
 * @property {number} x
 * @property {number} y
 * @property {number} z
 * @property {number} w
 */

/**
 * @typedef {Object} AvatarLimbPose
 * @property {AvatarPosePoint|null} position - Position in VR floor space (meters)
 * @property {AvatarPoseOrientation|null} orientation
 * @property {boolean} visible
 */

/**
 * @typedef {Object} AvatarPointer
 * @property {AvatarPosePoint|null} origin - SENDER's XR metres (converted on receipt)
 * @property {AvatarPosePoint|null} direction - Unit vector; frame-independent
 * @property {'left'|'right'} [hand]
 * @property {boolean} visible
 */

/**
 * All limb positions are in the SENDER's own WebXR local-floor reference
 * space (meters, Y-up) — each VR participant has a physically independent
 * session/reference space, so vrScale/vrOrigin travel alongside the pose.
 * RemoteAvatarController converts to VTK scene (data) space using THIS
 * sender's transform, not the local viewer's own, before rendering.
 *
 * @typedef {Object} AvatarPose
 * @property {AvatarLimbPose} head
 * @property {AvatarLimbPose} leftHand
 * @property {AvatarLimbPose} rightHand
 * @property {AvatarPointer} pointer
 * @property {AvatarPosePoint|null} [pointerHit] - Where the sender's ray met the
 *   shared geometry. THE ONE FIELD HERE THAT IS NOT IN THE SENDER'S XR SPACE:
 *   it is already in data/scene space and identical for every viewer, so it is
 *   passed through untransformed (see RemoteAvatarController._toScenePose).
 * @property {number} timestamp - Date.now()
 * @property {number} vrScale - sender's vrScale at the time of this pose
 * @property {number[]} vrOrigin - sender's vrOrigin [x,y,z] at the time of this pose
 */

/**
 * @typedef {Object} AvatarPresenceState
 * @property {AvatarUserInfo} userInfo
 * @property {AvatarPose|null} pose
 * @property {boolean} speaking
 * @property {string|null} [selectedObjectId]
 * @property {string|null} [currentTool]
 * @property {string|null} [activity] - what this user is currently
 *   manipulating ('dataset' | 'filter'), driving the avatar's halo + "EDITING"
 *   badge. Presence-rate, never per frame.
 */

/**
 * Adapter interface implemented by AvatarNetworkSync.
 * Decouples AvatarManager from specific transport (Y.js, WebRTC, etc.)
 *
 * @typedef {Object} AvatarNetworkAdapter
 * @property {function(AvatarPresenceState): void} sendLocalPresence
 * @property {function(function(string, AvatarPose): void): void} onRemotePose
 * @property {function(function(string, AvatarPresenceState): void): void} onRemotePresence
 * @property {function(function(string): void): void} onRemoteLeave
 * @property {function(): void} dispose
 */
