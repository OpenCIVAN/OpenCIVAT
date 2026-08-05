// src/core/vr/__tests__/VREnvironment.test.js
//
// jsdom-safe: only exercises vtk.js source/mapper/actor construction (pure
// JS, no WebGL context needed) plus the plain-object fake renderer below.

import { describe, it, expect, beforeEach } from "vitest";
import { VREnvironment, VR_CLEAR_COLOR } from "../environment/VREnvironment.js";

function createFakeRenderer() {
  const actors = [];
  return {
    actors,
    addActor: (actor) => actors.push(actor),
    removeActor: (actor) => {
      const idx = actors.indexOf(actor);
      if (idx >= 0) actors.splice(idx, 1);
    },
    getBackground: () => [0, 0, 0],
    setBackground: () => {},
    setBackground2: () => {},
    setGradientBackground: () => {},
  };
}

describe("VREnvironment", () => {
  let env;
  let renderer;

  beforeEach(() => {
    env = new VREnvironment();
    renderer = createFakeRenderer();
  });

  it("adds all environment actors to the renderer on initialize", () => {
    env.initialize(renderer, { vrScale: 1, vrOrigin: [0, 0, 0] });

    // floor solid + floor grid + wall + 4 cardinal markers = 7
    expect(renderer.actors.length).toBe(7);
  });

  it("marks every environment actor as unpickable", () => {
    env.initialize(renderer, { vrScale: 1, vrOrigin: [0, 0, 0] });

    for (const actor of renderer.actors) {
      expect(actor.getPickable()).toBe(false);
    }
  });

  it("removes all actors from the renderer on dispose", () => {
    env.initialize(renderer, { vrScale: 1, vrOrigin: [0, 0, 0] });
    expect(renderer.actors.length).toBe(7);

    env.dispose();
    expect(renderer.actors.length).toBe(0);
  });

  it("repositions/rescales all actors together via updateTransform", () => {
    env.initialize(renderer, { vrScale: 1, vrOrigin: [0, 0, 0] });

    env.updateTransform(2, [1, 2, 3]);

    for (const actor of renderer.actors) {
      expect(actor.getPosition()).toEqual([1, 2, 3]);
      expect(actor.getScale()).toEqual([0.5, 0.5, 0.5]);
    }
  });

  it("exports VR_CLEAR_COLOR matching the bright bottom-of-gradient color", () => {
    expect(VR_CLEAR_COLOR).toEqual([0.93, 0.92, 0.9]);
  });
});
