# Tutorials

Step-by-step guides for common tasks in OpenCIVAN. These assume a working local installation — see [installation.md](installation.md) first.

---

## Navigation

| Tutorial | Audience |
|---|---|
| [1. Load and view a dataset](#1-load-and-view-a-dataset) | All users |
| [2. Start a shared session](#2-start-a-shared-session) | Collaborators |
| [3. Apply visualization filters](#3-apply-visualization-filters) | All users |
| [4. Enter VR on a Quest 2](#4-enter-vr-on-a-quest-2) | VR users |
| [5. Add a VTK feature module](#5-add-a-vtk-feature-module) | Frontend developers |
| [6. Write a backend API route](#6-write-a-backend-api-route) | Backend developers |

---

## 1. Load and View a Dataset

**Supported formats:** VTK PolyData (`.vtp`, `.vtk`).

1. Start the app and enter your username at the login screen.
2. Click **Load Data** in the top bar.
3. The **Dataset Selector** modal opens. Click **Upload** and select a `.vtp` file from your local machine.
4. The file uploads to MinIO and registers in the database. It appears in the available datasets list.
5. The dataset is placed automatically on the canvas (or click an empty cell and select it).
6. A VTK.js view opens showing the dataset with default scalar coloring.

To change the coloring:

- Open the **Instance Tools** panel (press `T` or click the floating tools icon).
- Choose a scalar array from the **Color By** dropdown.
- Adjust the color map and range.

---

## 2. Start a Shared Session

Sessions are identified by a **room**. All users in the same room see each other's cursors, camera changes, and data actions in real time.

### Create a room

1. Click **Session** in the top bar.
2. In the **Create Room** modal, enter a room name and click **Create**.
3. Share the room URL (copy from the browser address bar — the `?room=...` parameter) with your collaborators.

### Join an existing room

1. Open the URL your collaborator shared.
2. Enter your username at the login screen.
3. You are placed in the room automatically.

### What is shared

| Shared in real time | Not shared |
|---|---|
| Cursor positions and 3D world coordinates | Local UI panel state |
| Camera state (when following another user) | Keyboard shortcuts |
| VR avatar poses and controller positions | Local filter draft state |
| Dataset load/delete events | |
| Annotation create/edit/delete | |

---

## 3. Apply Visualization Filters

1. Load a dataset (see Tutorial 1).
2. Open the **Instance Tools** panel (press `T`).
3. The tools panel shows the active view's feature list. Available features:

| Feature | What it does |
|---|---|
| **Scalar coloring** | Color geometry by a data array |
| **Volume rendering** | 3D volumetric display with transfer function |
| **Slice (MPR)** | Orthogonal cross-sections |
| **Isosurface** | Extract a surface at a scalar value |
| **Clipping** | Clip dataset with a box or plane |
| **Threshold** | Show only points within a scalar range |
| **Glyph** | Represent vector data as arrows |
| **Time series** | Animate temporal datasets |

4. Toggle a feature on with the switch next to its name.
5. Adjust parameters using the controls that appear.

Filter state is shared with all users in the room — changing a filter updates the view for all collaborators.

---

## 4. Enter VR on a Quest 2

**Requirements:**

- Quest 2 with browser access to the dev machine's HTTPS URL.
- Both devices on the same local network.

### First time setup

1. On the Quest, open the browser and navigate to `https://<dev-machine-ip>:8081`.
2. Accept the self-signed certificate warning.
3. Enter your username and join the same room as your desktop collaborators.

### Enter VR

1. Click **Enter VR** in the top bar. The browser requests permission to enter immersive VR.
2. The session switches to stereo rendering. Your desktop collaborators see your avatar.

### Controls (Quest 2)

| Action | Input |
|---|---|
| Teleport | Point right controller, hold trigger, release |
| Turn | Left thumbstick left/right |
| Fly forward/back | Right thumbstick up/down |
| Open wrist menu | Look at your left wrist |
| Select tool | Gaze at wrist menu item, hold trigger |
| Place annotation | Point at surface, press trigger |

### Return to desktop

Look at your left wrist → wrist menu → **Exit VR**, or remove the headset (the browser automatically exits the XR session).

---

## 5. Add a VTK Feature Module

VTK features live in `src/core/instances/types/vtk/features/`. Each feature is a class that manages state per VTK instance and exposes `apply` / `restore` methods.

### Minimum structure

Create `src/core/instances/types/vtk/features/VTKMyFeature.js`:

```javascript
export class VTKMyFeature {
  constructor() {
    this.instanceStates = new Map();
  }

  /**
   * Apply the feature to a VTK instance.
   * @param {string} instanceId
   * @param {object} options  - feature-specific parameters
   * @param {object} context  - { renderer, renderWindow, mapper, actor, … }
   */
  async applyFeature(instanceId, options, context) {
    // 1. Compute or configure the VTK pipeline
    // 2. Store state for later restore
    this.instanceStates.set(instanceId, { options, /* … */ });
    // 3. Re-render
    context.renderWindow.render();
  }

  async restoreOriginal(instanceId, context) {
    const state = this.instanceStates.get(instanceId);
    if (!state) return;
    // Reverse the pipeline changes
    this.instanceStates.delete(instanceId);
    context.renderWindow.render();
  }

  getState(instanceId) {
    return this.instanceStates.get(instanceId) ?? null;
  }
}
```

### Register the feature

Open `src/core/instances/types/instanceTypesInit.js` (or the relevant feature registry) and add your feature to the list.

### Add a UI control

Add a toggle in the Instance Tools panel by following the pattern of an existing feature control component in `src/ui/react/components/organisms/` or `src/ui/react/components/panels/`.

### Test

```bash
npm run test:run
```

Add a test file at `src/core/instances/types/vtk/features/__tests__/VTKMyFeature.test.js`.

---

## 6. Write a Backend API Route

Routes live in `server/src/routes/`. Each route file is an Express router mounted in `server/src/app.js` (or the main server entry).

### Example

Create `server/src/routes/myresource.js`:

```javascript
const express = require('express');
const router = express.Router({ mergeParams: true });
const { getUser } = require('../middleware/auth');
const { createLogger } = require('../utils/logger');

const log = createLogger('myresource');

// GET /api/projects/:projectId/myresource
router.get('/', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const user = getUser(req);
    const { pool } = req.app.locals;

    const result = await pool.query(
      'SELECT * FROM myresource WHERE project_id = $1',
      [projectId]
    );

    res.json({ items: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

Mount in the main server file:

```javascript
const myresource = require('./routes/myresource');
app.use('/api/projects/:projectId/myresource', myresource);
```

### Authentication

The `getUser(req)` helper returns the authenticated user from the Keycloak JWT or the dev bypass header. It throws if the request is unauthenticated.

### Database migrations

Add new tables via SQL files in `server/database/`. Run `./scripts/reset-database.sh --rebuild` to apply during development (destructive — data is lost).
