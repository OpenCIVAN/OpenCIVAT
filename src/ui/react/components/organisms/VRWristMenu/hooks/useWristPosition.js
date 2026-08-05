/**
 * @file useWristPosition.js
 * @description Hook to get wrist position from VRManager hand tracking.
 *
 * Returns the position of the specified wrist in world space.
 * Position is 5cm above the wrist joint, facing the user.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { vrManager } from '@Core/vr/VRManager.js';

/**
 * Default position when not tracking
 */
const DEFAULT_POSITION = {
    x: 0,
    y: 0,
    z: 0,
    rotation: { x: 0, y: 0, z: 0 },
    isTracking: false,
};

// Below this, a frame-to-frame position/rotation change is not worth a React
// re-render — this menu's DOM output is invisible in-headset during an actual
// WebXR immersive session anyway (immersive sessions don't composite the
// page DOM; see VTKVRSpatialUI.js's header comment for why the in-world panel
// exists instead), so there is no visual cost to coalescing sub-threshold
// motion. Without this, handleFrame previously called setState with a brand
// new object EVERY XR frame (90Hz on Quest 2) whenever hand tracking was
// active, forcing a React re-render every frame — and since
// useIsLookingAtWrist's effect depends on this hook's returned object
// reference, that ALSO tore down and re-subscribed its own frame listener
// every frame. Both ran on the same main thread that must synchronously
// execute the stereo VR render loop, which is what actually caused the
// reported "shaky, distorted" world on Quest 2.
const POSITION_EPSILON_M = 0.003; // 3mm
const ROTATION_EPSILON_RAD = 0.02;

/**
 * Hook to get wrist position from VR hand tracking
 *
 * @param {string} hand - 'left' or 'right'
 * @param {number} offsetY - Offset above wrist in meters (default 0.05 = 5cm)
 * @returns {Object} Position and rotation data
 */
export function useWristPosition(hand = 'left', offsetY = 0.05) {
    const [position, setPosition] = useState(DEFAULT_POSITION);
    // Mirrors `position` but updates synchronously (no React batching delay),
    // so consecutive frames within one tick still compare against the latest
    // value rather than a stale pre-render snapshot.
    const lastEmittedRef = useRef(DEFAULT_POSITION);

    useEffect(() => {
        if (!vrManager) return;

        // Only setState when the new value differs meaningfully from the last
        // emitted one (see POSITION_EPSILON_M/ROTATION_EPSILON_RAD above) —
        // this is the fix for the 90Hz re-render storm.
        const maybeEmit = (next) => {
            const prev = lastEmittedRef.current;
            const changed =
                next.isTracking !== prev.isTracking ||
                Math.abs(next.x - prev.x) > POSITION_EPSILON_M ||
                Math.abs(next.y - prev.y) > POSITION_EPSILON_M ||
                Math.abs(next.z - prev.z) > POSITION_EPSILON_M ||
                Math.abs(next.rotation.x - prev.rotation.x) > ROTATION_EPSILON_RAD ||
                Math.abs(next.rotation.y - prev.rotation.y) > ROTATION_EPSILON_RAD ||
                Math.abs(next.rotation.z - prev.rotation.z) > ROTATION_EPSILON_RAD;
            if (!changed) return;
            lastEmittedRef.current = next;
            setPosition(next);
        };

        const handleFrame = (frameData) => {
            // Get hand data from VRManager
            const hands = vrManager.getHands?.();
            const handData = hands?.[hand];

            if (!handData || !handData.joints) {
                if (lastEmittedRef.current.isTracking) {
                    maybeEmit({ ...lastEmittedRef.current, isTracking: false });
                }
                return;
            }

            // Get wrist joint position
            const wristJoint = handData.joints['wrist'];
            if (!wristJoint) {
                if (lastEmittedRef.current.isTracking) {
                    maybeEmit({ ...lastEmittedRef.current, isTracking: false });
                }
                return;
            }

            // Calculate menu position (offset above wrist)
            const menuPosition = {
                x: wristJoint.position?.x || 0,
                y: (wristJoint.position?.y || 0) + offsetY,
                z: wristJoint.position?.z || 0,
                rotation: {
                    x: wristJoint.rotation?.x || 0,
                    y: wristJoint.rotation?.y || 0,
                    z: wristJoint.rotation?.z || 0,
                },
                isTracking: true,
            };

            maybeEmit(menuPosition);
        };

        // Also support controller-based positioning (fallback)
        const handleControllerUpdate = (event) => {
            const { handedness, gripPose } = event.detail || event;

            if (handedness !== hand || !gripPose) return;

            // Use grip pose position with offset
            const menuPosition = {
                x: gripPose.position?.x || 0,
                y: (gripPose.position?.y || 0) + offsetY,
                z: gripPose.position?.z || 0,
                rotation: {
                    x: gripPose.rotation?.x || 0,
                    y: gripPose.rotation?.y || 0,
                    z: gripPose.rotation?.z || 0,
                },
                isTracking: true,
            };

            maybeEmit(menuPosition);
        };

        vrManager.on('frame', handleFrame);
        vrManager.on('controllerUpdate', handleControllerUpdate);

        return () => {
            vrManager.off('frame', handleFrame);
            vrManager.off('controllerUpdate', handleControllerUpdate);
        };
    }, [hand, offsetY]);

    return position;
}

/**
 * Hook to check if user is looking at their wrist
 *
 * @param {Object} wristPosition - Position from useWristPosition
 * @param {number} threshold - Angle threshold in degrees (default 30)
 * @returns {boolean} Whether user is looking at wrist
 */
export function useIsLookingAtWrist(wristPosition, threshold = 30) {
    const [isLooking, setIsLooking] = useState(false);

    useEffect(() => {
        if (!vrManager || !wristPosition.isTracking) {
            setIsLooking(false);
            return;
        }

        const checkGaze = () => {
            // Get head position and direction from VRManager
            const headPose = vrManager.getHeadPose?.();
            if (!headPose) return;

            // Calculate direction from head to wrist
            const toWrist = {
                x: wristPosition.x - (headPose.position?.x || 0),
                y: wristPosition.y - (headPose.position?.y || 0),
                z: wristPosition.z - (headPose.position?.z || 0),
            };

            // Normalize
            const length = Math.sqrt(toWrist.x ** 2 + toWrist.y ** 2 + toWrist.z ** 2);
            if (length === 0) return;

            toWrist.x /= length;
            toWrist.y /= length;
            toWrist.z /= length;

            // Get head forward direction (simplified - assumes -Z is forward)
            const forward = headPose.forward || { x: 0, y: 0, z: -1 };

            // Calculate dot product for angle
            const dot = toWrist.x * forward.x + toWrist.y * forward.y + toWrist.z * forward.z;
            const angle = Math.acos(Math.min(1, Math.max(-1, dot))) * (180 / Math.PI);

            setIsLooking(angle < threshold);
        };

        const frameHandler = () => checkGaze();
        vrManager.on('frame', frameHandler);

        return () => {
            vrManager.off('frame', frameHandler);
        };
    }, [wristPosition, threshold]);

    return isLooking;
}

export default useWristPosition;
