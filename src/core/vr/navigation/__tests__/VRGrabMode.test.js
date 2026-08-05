// src/core/vr/navigation/__tests__/VRGrabMode.test.js
// Grab locomotion: pinch-and-drag pulls the data around by shifting vrOrigin.
// The grabbed data point must track the hand exactly, so the origin moves by
// -delta/vrScale (see the sign derivation in VRGrabMode.js).
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@Utils/logger.js", () => {
  const mkLog = () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() });
  return { vr: mkLog(), app: mkLog(), sync: mkLog(), view: mkLog(), createLogger: () => mkLog() };
});

import { VRGrabMode } from "../VRGrabMode.js";

/** Build an input state with a right-hand pose + trigger. */
function rightHand(x, y, z, pressed) {
  return {
    controllers: {
      left: null,
      right: { pose: { position: { x, y, z } }, triggerPressed: pressed },
    },
  };
}

describe("VRGrabMode", () => {
  let ctx;
  let mode;

  beforeEach(() => {
    ctx = { vrScale: 1.0, vrOrigin: [0, 0, 0] };
    mode = new VRGrabMode(ctx);
  });

  it("does nothing without a controller", () => {
    const r = mode.update({ controllers: {} });
    expect(r.position).toBeNull();
    expect(r.grabEnded).toBeFalsy();
    expect(mode.isGrabbing()).toBe(false);
  });

  it("no locomotion before the pinch (idle)", () => {
    const r = mode.update(rightHand(0, 0, 0, false));
    expect(r.position).toBeNull();
    expect(mode.isGrabbing()).toBe(false);
  });

  it("rising edge anchors the grab; first frame does not move the origin", () => {
    ctx.vrOrigin = [10, 10, 10];
    const r = mode.update(rightHand(1, 2, 3, true));
    expect(mode.isGrabbing()).toBe(true);
    expect(r.position).toEqual({ x: 10, y: 10, z: 10 });
  });

  it("drag shifts vrOrigin by -delta/scale (scale = 1) so the grabbed point tracks the hand", () => {
    mode.update(rightHand(0, 0, 0, true)); // anchor at origin [0,0,0]
    // Pull the hand toward the chest (+z) and sideways/up a little.
    const r = mode.update(rightHand(0.5, 0.25, 0.5, true));
    expect(r.position.x).toBeCloseTo(-0.5, 6);
    expect(r.position.y).toBeCloseTo(-0.25, 6);
    expect(r.position.z).toBeCloseTo(-0.5, 6);
  });

  it("full 3-axis drag from a non-zero start origin", () => {
    ctx.vrOrigin = [10, 10, 10];
    mode.update(rightHand(1, 2, 3, true)); // anchor: hand (1,2,3), origin [10,10,10]
    const r = mode.update(rightHand(1.5, 2.25, 3.5, true)); // delta (0.5,0.25,0.5)
    expect(r.position.x).toBeCloseTo(9.5, 6);
    expect(r.position.y).toBeCloseTo(9.75, 6);
    expect(r.position.z).toBeCloseTo(9.5, 6);
  });

  it("vrScale = 2 halves the origin delta (gesture stays 1:1 in physical space)", () => {
    ctx.vrScale = 2.0;
    mode.update(rightHand(0, 0, 0, true)); // anchor
    const r = mode.update(rightHand(0, 0, 1, true)); // delta.z = 1
    expect(r.position.z).toBeCloseTo(-0.5, 6); // -1 / 2
  });

  it("falling edge ends the grab, emits grabEnded once, and holds the last pose", () => {
    mode.update(rightHand(0, 0, 0, true));
    const dragged = mode.update(rightHand(0, 0, 1, true)); // origin.z = -1
    expect(dragged.position.z).toBeCloseTo(-1, 6);

    const released = mode.update(rightHand(0, 0, 1, false));
    expect(released.grabEnded).toBe(true);
    expect(released.position.z).toBeCloseTo(-1, 6); // last computed origin
    expect(mode.isGrabbing()).toBe(false);

    // A subsequent idle frame is a plain no-op (grabEnded fires only once).
    const after = mode.update(rightHand(0, 0, 1, false));
    expect(after.grabEnded).toBeFalsy();
    expect(after.position).toBeNull();
  });

  it("pose loss while grabbing ends the grab (grabEnded, hold last)", () => {
    mode.update(rightHand(0, 0, 0, true));
    mode.update(rightHand(0, 0, 2, true)); // origin.z = -2
    // Trigger still 'pressed' but the hand pose vanished.
    const r = mode.update({ controllers: { right: { triggerPressed: true } } });
    expect(r.grabEnded).toBe(true);
    expect(r.position.z).toBeCloseTo(-2, 6);
    expect(mode.isGrabbing()).toBe(false);
  });

  it("re-anchors after a suppressed frame instead of jumping", () => {
    mode.update(rightHand(0, 0, 0, true)); // anchor: hand (0,0,0), origin [0,0,0]
    mode.update(rightHand(0, 0, 1, true)); // origin.z = -1

    // Two-hand scale suppressed this frame; meanwhile vrOrigin/scale moved.
    mode.onFrameSkipped();
    ctx.vrOrigin = [5, 5, 5];

    // Resume with the hand somewhere new: must re-anchor to (0,0,2)/[5,5,5],
    // NOT continue from the stale anchor (which would give z = -2).
    const reanchored = mode.update(rightHand(0, 0, 2, true));
    expect(reanchored.position).toEqual({ x: 5, y: 5, z: 5 });

    // Continuing from the re-anchored state drags normally again.
    const r = mode.update(rightHand(0, 0, 3, true)); // delta.z = 1 from re-anchor
    expect(r.position.z).toBeCloseTo(4, 6); // 5 - 1
  });

  it("falls back to the left hand when the right has no pose", () => {
    const input = {
      controllers: {
        right: { triggerPressed: true }, // no pose
        left: { pose: { position: { x: 0, y: 0, z: 0 } }, triggerPressed: true },
      },
    };
    const r = mode.update(input);
    expect(mode.isGrabbing()).toBe(true);
    expect(r.position).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("reset() drops all grab state", () => {
    mode.update(rightHand(0, 0, 0, true));
    expect(mode.isGrabbing()).toBe(true);
    mode.reset();
    expect(mode.isGrabbing()).toBe(false);
  });
});

/** Build an input state with both hands posed, each with its own squeeze value. */
function bothHands(rightPos, rightSqueeze, leftPos, leftSqueeze) {
  return {
    controllers: {
      right: rightPos && {
        pose: { position: rightPos },
        squeezeValue: rightSqueeze,
      },
      left: leftPos && {
        pose: { position: leftPos },
        squeezeValue: leftSqueeze,
      },
    },
  };
}

// Schmitt-trigger predicate matching VRExplorationManager's gripPredicate:
// engage above 0.7, stay engaged down to 0.4 once already engaged.
const GRIP_ENGAGE = 0.7;
const GRIP_RELEASE = 0.4;
function hysteresisPredicate(hand, engaged = false) {
  if (!hand) return false;
  if (hand.isTransientPointer) return hand.triggerPressed === true;
  return (hand.squeezeValue || 0) > (engaged ? GRIP_RELEASE : GRIP_ENGAGE);
}

describe("VRGrabMode grip hysteresis + hand latch (A3)", () => {
  let ctx;
  let mode;

  beforeEach(() => {
    ctx = { vrScale: 1.0, vrOrigin: [0, 0, 0] };
    mode = new VRGrabMode(ctx, { isEngaged: hysteresisPredicate });
  });

  it("grip at 0.8 engages; dropping to 0.5 (below engage, above release) keeps it engaged and tracking", () => {
    const engaged = mode.update(bothHands({ x: 0, y: 0, z: 0 }, 0.8, null, 0));
    expect(mode.isGrabbing()).toBe(true);
    expect(engaged.position).toEqual({ x: 0, y: 0, z: 0 });

    // Squeeze sags to 0.5 — below the 0.7 engage threshold but above the 0.4
    // release threshold. With hysteresis this must NOT end the grab.
    const sagging = mode.update(bothHands({ x: 0, y: 0, z: 1 }, 0.5, null, 0));
    expect(mode.isGrabbing()).toBe(true);
    expect(sagging.grabEnded).toBeFalsy();
    // The world keeps tracking the hand (origin moves by -delta/scale).
    expect(sagging.position.z).toBeCloseTo(-1, 6);

    // Dropping further to 0.3 (below the release threshold) ends the grab.
    const released = mode.update(bothHands({ x: 0, y: 0, z: 1 }, 0.3, null, 0));
    expect(released.grabEnded).toBe(true);
    expect(mode.isGrabbing()).toBe(false);
  });

  it("latches the grabbing hand: engaging the other hand mid-grab does not steal it or jump vrOrigin", () => {
    // Start the grab with the right hand only.
    const started = mode.update(bothHands({ x: 0, y: 0, z: 0 }, 0.8, null, 0));
    expect(mode.isGrabbing()).toBe(true);
    expect(started.position).toEqual({ x: 0, y: 0, z: 0 });

    // Now the left hand ALSO becomes engaged, far away from the right hand,
    // while the right hand has moved only a little. If hand selection were
    // re-evaluated every frame it would jump to picking the (now-preferred)
    // right-vs-left tie differently or, worse, compute delta against the
    // wrong hand's anchor. The delta must still come from the right hand.
    const bothEngaged = mode.update(
      bothHands({ x: 0, y: 0, z: 0.2 }, 0.8, { x: 5, y: 5, z: 5 }, 0.8)
    );
    expect(mode.isGrabbing()).toBe(true);
    // Delta computed from the right hand's motion only (0.2 on z), not any
    // combination involving the left hand's far-away position.
    expect(bothEngaged.position.z).toBeCloseTo(-0.2, 6);
    expect(bothEngaged.position.x).toBeCloseTo(0, 6);
    expect(bothEngaged.position.y).toBeCloseTo(0, 6);
  });

  it("losing the latched hand's pose ends the grab rather than switching to the other hand", () => {
    mode.update(bothHands({ x: 0, y: 0, z: 0 }, 0.8, null, 0));
    expect(mode.isGrabbing()).toBe(true);

    // Right hand loses tracking (no pose); left hand is posed and engaged.
    const input = {
      controllers: {
        right: { squeezeValue: 0.8 }, // no pose
        left: { pose: { position: { x: 1, y: 1, z: 1 } }, squeezeValue: 0.8 },
      },
    };
    const r = mode.update(input);
    expect(r.grabEnded).toBe(true);
    expect(mode.isGrabbing()).toBe(false);
  });

  it("a transient-pointer hand engages purely on triggerPressed, with no hysteresis", () => {
    const tpMode = new VRGrabMode(ctx, { isEngaged: hysteresisPredicate });
    const input = (pressed) => ({
      controllers: {
        right: {
          pose: { position: { x: 0, y: 0, z: 0 } },
          isTransientPointer: true,
          triggerPressed: pressed,
          squeezeValue: 0, // gripless — always 0
        },
        left: null,
      },
    });

    const engaged = tpMode.update(input(true));
    expect(tpMode.isGrabbing()).toBe(true);
    expect(engaged.position).toEqual({ x: 0, y: 0, z: 0 });

    const released = tpMode.update(input(false));
    expect(released.grabEnded).toBe(true);
    expect(tpMode.isGrabbing()).toBe(false);
  });
});
