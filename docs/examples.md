# Examples and Use Cases

This page documents example scenarios and research use cases for OpenCIVAN. It is intended to grow over time — contributions welcome via the [research use case issue template](../.github/ISSUE_TEMPLATE/research_use_case.md).

---

## Navigation

| | |
|---|---|
| [Demo Datasets](#demo-datasets) | [Research Use Cases](#research-use-cases) |
| [Configuration Examples](#configuration-examples) | [Community Showcase](#community-showcase) |

---

## Demo Datasets

The repository includes scripts to load public-domain demo datasets:

```bash
./scripts/load-demo-files.sh
```

This uploads sample `.vtp` files to MinIO so they appear in the dataset picker. The demo files are small enough for quick loading and cover the main visualization types.

### Available demo types

| Dataset | Visualization type | Notes |
|---|---|---|
| Simple mesh | Surface rendering | Basic geometry, good for testing scalar coloring |
| Volume data | Volume rendering | Tests transfer function controls |
| Multi-array mesh | Scalar coloring | Multiple data arrays for color-by testing |

> **Adding your own demo data:** Place `.vtp` files in `public/demo-data/` and update `scripts/load-demo-files.sh` to upload them.

---

## Research Use Cases

OpenCIVAN is designed for research scenarios where teams need to explore 3D scientific data together, in person or remotely. Below are illustrative scenarios — not claimed deployments.

<details>
<summary>Multi-user medical imaging review</summary>

**Scenario:** A radiology team reviews volumetric CT data together. One radiologist controls the slice view; a surgeon observes from a different angle in the same session.

**Relevant features:**
- MPR slice view (VTKSliceFeature, VTKResliceCursorFeature)
- Linked views (ViewLinkingService)
- Shared cursor positions (Y.js yCursors)
- Annotations in 3D space

</details>

<details>
<summary>CFD / simulation data exploration in VR</summary>

**Scenario:** An engineering team loads a large computational fluid dynamics mesh. A researcher enters VR with a Quest 2 and physically moves around the flow field. Glyphs show vector direction; clipping reveals interior flow.

**Relevant features:**
- VTKGlyphFeature (vector arrows)
- VTKClippingFeature (box/plane clip)
- WebXR immersive mode (VRManager, VRFlyMode, VRTeleportMode)
- Python VTK compute worker (server-side decimation for large meshes)

</details>

<details>
<summary>Geospatial point cloud review</summary>

**Scenario:** A team reviews LiDAR point cloud data. One user applies threshold filtering to isolate ground returns; others observe the filtered view in real time.

**Relevant features:**
- VTKThresholdPointsFeature
- VTKScalarColoringFeature
- Real-time collaborative state sync (WebSocket broadcast)

</details>

<details>
<summary>Dimensionality reduction + 3D scatter</summary>

**Scenario:** A data scientist runs t-SNE on a high-dimensional dataset in the browser, then explores the 3D embedding collaboratively with a domain expert.

**Relevant features:**
- Client-side t-SNE / UMAP / PCA (algorithms/)
- VTK.js 3D scatter rendering
- Collaborative session

</details>

---

## Configuration Examples

### Minimal dev setup (no auth, no voice)

```env
DEV_BYPASS_AUTH=true
USE_HTTP=true
# LiveKit vars omitted — voice disabled
```

### Dev setup with voice

```env
DEV_BYPASS_AUTH=true
USE_HTTP=true
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_TOKEN_URL=http://localhost:7881
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devsecret
```

Run `npm run dev:full` to start the LiveKit token server alongside everything else.

### Custom MinIO bucket

Edit `server/src/services/minioService.js` to change the default bucket name, then update `./scripts/start.sh` to create the bucket on first run.

---

## Community Showcase

> This section will feature visualizations and deployments contributed by the community.

If you have used OpenCIVAN in research or a project and would like to share it, open a [research use case issue](../.github/ISSUE_TEMPLATE/research_use_case.md) or post in [GitHub Discussions → Show and Tell](../../discussions).
