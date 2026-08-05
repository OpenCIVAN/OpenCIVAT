// src/services/voice/voiceAvatarBridge.js
// Glue between the LiveKit voice service and the collaboration/VR avatar systems.
//
// RESPONSIBILITIES:
// 1. Speaking -> avatar/presence: when the local participant becomes an active
//    speaker, pulse the local user's VR avatar head (via vrAvatarSystem) and
//    reflect it in the desktop presence roster (via presenceSystem).
// 2. WebXR audio continuity: Quest / mobile browsers suspend media and the
//    shared AudioContext across an immersive-session transition, so resume voice
//    audio whenever a VR session is entered or exited.
//
// Initialized once from appInitializer. Idempotent.

import { ws as log } from "@Utils/logger.js";
import { voiceRoomService } from "@Services/voice/voiceRoomService.js";
import { vrAvatarSystem } from "@VTK/vr/VTKVRAvatars.js";
import { vrManager } from "@Core/vr/VRManager.js";
import { presenceSystem } from "@Collaboration/presence/presenceSystem.js";

let _initialized = false;
const _disposers = [];

/**
 * Wire the voice <-> avatar/presence bridges. Safe to call multiple times.
 */
export function initializeVoiceAvatarBridge() {
  if (_initialized) return;
  _initialized = true;

  // 1. Local speaking state -> avatar pulse + presence roster.
  _disposers.push(
    voiceRoomService.onLocalSpeakingChange((speaking) => {
      try {
        vrAvatarSystem.setLocalSpeaking(speaking); // no-op outside VR
        presenceSystem.updateVoiceState({ isSpeaking: speaking });
      } catch (e) {
        log.debug("voiceAvatarBridge speaking update failed:", e?.message);
      }
    })
  );

  // 2. Keep voice audio alive across VR enter/exit, and re-sync the current
  //    speaking state into the freshly-initialized avatar system on entry.
  const onVrTransition = (entering) => {
    voiceRoomService.resumeAudio();
    if (entering) {
      // The avatar system just (re)initialized with isSpeaking=false; push the
      // real current state so a user who was already speaking still pulses.
      try {
        vrAvatarSystem.setLocalSpeaking(voiceRoomService.isLocalSpeaking());
      } catch (e) {
        log.debug("voiceAvatarBridge VR-enter speaking sync failed:", e?.message);
      }
    }
  };
  _disposers.push(vrManager.on("vrEntered", () => onVrTransition(true)));
  _disposers.push(vrManager.on("vrExited", () => onVrTransition(false)));

  log.debug("voiceAvatarBridge initialized");
}

/** Tear down the bridge (mainly for tests / hot reload). */
export function disposeVoiceAvatarBridge() {
  _disposers.forEach((off) => {
    try {
      off?.();
    } catch {
      /* ignore */
    }
  });
  _disposers.length = 0;
  _initialized = false;
}
