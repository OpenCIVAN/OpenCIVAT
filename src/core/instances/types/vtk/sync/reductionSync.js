import { yDoc } from "@Collaboration/yjs/yjsSetup.js";
import { getCurrentActor } from "@VTK/scene/sceneManager.js";
import { logInfo } from "@UI/react/hooks/useLogging.js";

let reductionMethod = "pca";
let reductionComponents = 3;
let toggleReductionCallback = null;

export function setupReductionSync(
  toggleCallback,
  getMethod,
  getComponents,
  setMethod,
  setComponents
) {
  toggleReductionCallback = toggleCallback;

  // yReductionMap.observe((event) => {
  //   // event.transaction.local === true if *this tab* made the change
  //   if (event.transaction.local) {
  //     logInfo("this is the host tab!");
  //     // Don't run toggle here — we already applied it locally
  //     return;
  //   }

  //   const state = yReductionMap.get("state");
  //   logInfo("reduction observed from another tab!");

  //   if (!state) return;

  //   // const applied = state.applied;
  //   const method = state.method;
  //   const components = state.components;

  //   // if (applied !== undefined && method && components) {
  //   if (method && components) {
  //     setMethod(method);
  //     setComponents(components);
  //     if (toggleReductionCallback) {
  //       toggleDimensionalityReduction(true);
  //     }
  //   }
  // });
}

export function broadcastReductionState(method, components) {
  // const currentActor = getCurrentActor();
  // if (currentActor) {
  //   yActorForReduction.set("orientation", currentActor.getOrientation());
  //   yReductionMap.set("state", {
  //     method: method,
  //     components: components,
  //   });
  // }
}
