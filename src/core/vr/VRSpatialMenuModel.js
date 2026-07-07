// src/core/vr/VRSpatialMenuModel.js
// ----------------------------------------------------------------------------
// VR Spatial Menu Model — pure layout + hit-test + action-dispatch logic
// ----------------------------------------------------------------------------
//
// WHY THIS EXISTS
// WebXR immersive sessions (Safari/visionOS and most browsers) do NOT render
// the DOM, so a React component like VRWristMenu is invisible in-headset. The
// guaranteed in-session UI is therefore drawn as in-scene VTK geometry by
// VTKVRSpatialUI. This module is the geometry-free brain of that panel:
//
//   - button layout (id → local-space rect on the panel quad)
//   - hit testing (a UV point on the panel → which button, if any)
//   - action dispatch (button id → a call on the injected manager surface)
//   - show/hide bookkeeping keyed on VR session start/end
//   - selected-tool / isolation reflection so the panel never disagrees with
//     the manager (single source of truth = VRExplorationManager state)
//
// It holds NO React and NO VTK references — everything visual/stateful lives
// behind the `manager` surface injected at construction. That keeps it unit
// testable in jsdom and keeps core/ free of UI deps.
//
// COORDINATE CONVENTION
// The panel is a unit quad in "panel UV" space: u ∈ [0,1] left→right,
// v ∈ [0,1] bottom→top. Buttons are laid out as a single horizontal row of
// equal-width cells. VTKVRSpatialUI maps this UV space onto a world-space quad
// anchored in front of the head; the raycast hit it feeds back in is already
// reduced to a (u, v) pair, so this module stays free of 3D math.

import { vr as log } from "@Utils/logger.js";

/**
 * Button descriptors, left→right. `kind` drives dispatch:
 *   - "tool":      toggles a VR tool (annotate/measure) via the manager
 *   - "action":    a one-shot command (undo)
 *   - "toggle":    a stateful toggle (isolation) reflected back from manager
 *   - "exit":      leave the VR session
 * @type {ReadonlyArray<{id:string,label:string,icon:string,kind:string,toolId?:string}>}
 */
export const VR_MENU_BUTTONS = Object.freeze([
  { id: "annotate", label: "Annotate", icon: "edit", kind: "tool", toolId: "annotate" },
  { id: "measure", label: "Measure", icon: "ruler", kind: "tool", toolId: "measure" },
  { id: "undo", label: "Undo", icon: "rotateCcw", kind: "action" },
  { id: "isolation", label: "Isolate", icon: "expand", kind: "toggle" },
  { id: "grid", label: "Grid", icon: "layoutGrid", kind: "toggle" },
  { id: "exit", label: "Exit VR", icon: "doorOpen", kind: "exit" },
]);

// Fraction of each cell's width/height left as inner padding (per side).
const CELL_PADDING = 0.06;

/**
 * VRSpatialMenuModel
 *
 * @param {object} manager - Injected manager surface (VRExplorationManager).
 *   Only the methods used below are required; each call is guarded so a
 *   partial mock (or a manager without an active session) never throws.
 */
export class VRSpatialMenuModel {
  constructor(manager) {
    this._manager = manager || null;
    this._visible = false;
    // Local mirror of the active tool id, kept in sync via syncFromManager()
    // and updated optimistically on tap so highlight feedback is immediate.
    this._activeToolId = null;
    this._isolated = false;
    this._gridEnabled = false;
  }

  // ===========================================================================
  // LAYOUT
  // ===========================================================================

  /**
   * Compute button hit regions in panel-UV space (u,v ∈ [0,1]).
   * One equal-width horizontal row. Returned rects are inset by CELL_PADDING
   * so adjacent buttons don't share an edge (avoids ambiguous hits).
   *
   * @returns {Array<{id:string,label:string,icon:string,kind:string,
   *   toolId?:string, u0:number,u1:number,v0:number,v1:number,
   *   cu:number,cv:number}>} cu/cv = cell center (for placing labels/icons)
   */
  getButtonLayout() {
    const n = VR_MENU_BUTTONS.length;
    const cellW = 1 / n;
    const padU = cellW * CELL_PADDING;
    const padV = CELL_PADDING;

    return VR_MENU_BUTTONS.map((btn, i) => {
      const u0 = i * cellW + padU;
      const u1 = (i + 1) * cellW - padU;
      const v0 = padV;
      const v1 = 1 - padV;
      return {
        ...btn,
        u0,
        u1,
        v0,
        v1,
        cu: (u0 + u1) / 2,
        cv: (v0 + v1) / 2,
      };
    });
  }

  // ===========================================================================
  // HIT TESTING
  // ===========================================================================

  /**
   * Which button (if any) a panel-UV point lands on.
   * Out-of-range or non-finite input returns null (a miss), never throws.
   *
   * @param {number} u - horizontal fraction across the panel [0,1]
   * @param {number} v - vertical fraction up the panel [0,1]
   * @returns {object|null} the layout entry hit, or null
   */
  hitTest(u, v) {
    if (!Number.isFinite(u) || !Number.isFinite(v)) return null;
    if (u < 0 || u > 1 || v < 0 || v > 1) return null;

    for (const region of this.getButtonLayout()) {
      if (u >= region.u0 && u <= region.u1 && v >= region.v0 && v <= region.v1) {
        return region;
      }
    }
    return null;
  }

  // ===========================================================================
  // ACTION DISPATCH
  // ===========================================================================

  /**
   * Dispatch the action for a button id against the injected manager.
   * Returns a small result object describing what happened (handy for tests
   * and for the render layer to update highlights) rather than throwing on a
   * missing/absent manager method.
   *
   * Single source of truth: tool selection goes through
   * manager.activateTool/deactivateTool, isolation through
   * manager.toggleIsolation (same path as the B-button), undo emits the same
   * annotation-removed action the A-button uses, and exit calls leaveSession.
   *
   * @param {string} buttonId
   * @returns {{handled:boolean, action?:string, toolId?:string|null,
   *   isolated?:boolean}}
   */
  activate(buttonId) {
    const btn = VR_MENU_BUTTONS.find((b) => b.id === buttonId);
    if (!btn) {
      log.warn(`VRSpatialMenu: unknown button "${buttonId}"`);
      return { handled: false };
    }

    switch (btn.kind) {
      case "tool":
        return this._activateTool(btn.toolId);
      case "action":
        // Currently only "undo"
        return this._undo();
      case "toggle":
        return btn.id === "grid" ? this._toggleGrid() : this._toggleIsolation();
      case "exit":
        return this._exit();
      default:
        return { handled: false };
    }
  }

  _activateTool(toolId) {
    // Toggle semantics: tapping the already-active tool turns it off, so the
    // user can drop back to plain navigation without a separate "none" button.
    if (this._activeToolId === toolId) {
      this._call("deactivateTool");
      this._activeToolId = null;
      return { handled: true, action: "tool-deactivated", toolId: null };
    }
    this._call("activateTool", toolId);
    this._activeToolId = toolId;
    return { handled: true, action: "tool-activated", toolId };
  }

  _undo() {
    // Routes to the same tool-level undo the controller A-button drives, so
    // there is one undo path (and persistence/broadcast stays consistent).
    const undone = this._call("undoLastToolAction");
    return { handled: true, action: "undo", undone: undone === true };
  }

  _toggleIsolation() {
    let isolated = this._isolated;
    if (typeof this._manager?.toggleIsolation === "function") {
      // toggleIsolation returns the new isolated state (true/false)
      isolated = this._manager.toggleIsolation();
    } else {
      isolated = !this._isolated;
    }
    this._isolated = !!isolated;
    return { handled: true, action: "isolation-toggled", isolated: this._isolated };
  }

  _toggleGrid() {
    let enabled = this._gridEnabled;
    if (typeof this._manager?.toggleGridMode === "function") {
      // toggleGridMode returns the new enabled state (true/false)
      enabled = this._manager.toggleGridMode();
    } else {
      enabled = !this._gridEnabled;
    }
    this._gridEnabled = !!enabled;
    return { handled: true, action: "grid-toggled", gridEnabled: this._gridEnabled };
  }

  _exit() {
    // leaveSession is async; fire-and-forget — the panel is torn down by the
    // subsequent session-end signal, not by this promise resolving.
    try {
      const r = this._manager?.leaveSession?.();
      if (r && typeof r.catch === "function") {
        r.catch((err) => log.warn("VR exit failed:", err?.message));
      }
    } catch (err) {
      log.warn("VR exit threw:", err?.message);
    }
    return { handled: true, action: "exit" };
  }

  _call(method, ...args) {
    const fn = this._manager?.[method];
    if (typeof fn === "function") {
      try {
        return fn.apply(this._manager, args);
      } catch (err) {
        log.warn(`VRSpatialMenu: manager.${method} threw:`, err?.message);
      }
    }
    return undefined;
  }

  // ===========================================================================
  // SHOW / HIDE  (driven by VR session lifecycle)
  // ===========================================================================

  /** Called on VR session start. Panel becomes visible and re-syncs state. */
  onSessionStart() {
    this._visible = true;
    this.syncFromManager();
    return this._visible;
  }

  /** Called on VR session end. Panel hides and forgets transient state. */
  onSessionEnd() {
    this._visible = false;
    this._activeToolId = null;
    this._isolated = false;
    this._gridEnabled = false;
    return this._visible;
  }

  isVisible() {
    return this._visible;
  }

  // ===========================================================================
  // STATE REFLECTION (keep panel == manager)
  // ===========================================================================

  /**
   * Pull authoritative state from the manager so the panel highlights match
   * whatever the manager actually has active (e.g. a tool activated by the
   * DOM wrist menu, or isolation entered via the B-button). Safe to call any
   * time; missing manager methods are treated as "nothing active".
   */
  syncFromManager() {
    const active = this._manager?.getActiveTool?.();
    // getActiveTool() returns a tool instance (with .id) or null/undefined.
    this._activeToolId = active?.id ?? null;

    if (typeof this._manager?.isIsolated === "function") {
      this._isolated = !!this._manager.isIsolated();
    }
    if (typeof this._manager?.isGridModeEnabled === "function") {
      this._gridEnabled = !!this._manager.isGridModeEnabled();
    }
    return {
      activeToolId: this._activeToolId,
      isolated: this._isolated,
      gridEnabled: this._gridEnabled,
    };
  }

  getActiveToolId() {
    return this._activeToolId;
  }

  isIsolated() {
    return this._isolated;
  }

  /**
   * Render-time button states for the geometry layer: which button is the
   * active tool and whether isolation is on, so it can tint/highlight them.
   * @returns {Array<{id:string, active:boolean}>}
   */
  getButtonStates() {
    return VR_MENU_BUTTONS.map((btn) => {
      let active = false;
      if (btn.kind === "tool") active = this._activeToolId === btn.toolId;
      else if (btn.id === "isolation") active = this._isolated;
      else if (btn.id === "grid") active = this._gridEnabled;
      return { id: btn.id, active };
    });
  }
}

export default VRSpatialMenuModel;
