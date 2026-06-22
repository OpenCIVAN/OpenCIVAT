# Roadmap

This document describes the current direction and planned milestones for OpenCIVAN. It is a living document — priorities may shift based on contributor availability, community feedback, and research needs.

To propose a new item, open an issue with the `feature` label or start a discussion in the [Ideas](../../discussions/categories/ideas) category.

---

## Navigation

| | |
|---|---|
| [Current Status](#current-status) | [Near Term](#near-term-v01) |
| [Medium Term](#medium-term-v02) | [Long Term](#long-term) |
| [Out of Scope](#out-of-scope) | |

---

## Current Status

OpenCIVAN is in **active pre-release development** (v0.x). Core functionality is working but the API and data formats are not yet stable.

**Working now:**

- VTK.js 3D visualization (volume rendering, isosurfaces, slicing, scalar coloring, glyphs, clipping, thresholding, time series)
- Synchronous multi-user collaboration (Y.js presence layer: cursors, avatars, cameras)
- WebXR mode for Quest 2 browser (controller and hand tracking, fly and teleport navigation, VR wrist menu)
- Server-authoritative state (REST API + WebSocket broadcast)
- Dataset upload and server-side VTK compute jobs
- Username-based session join (no Keycloak required in dev mode)
- Docker-based backend (PostgreSQL, MinIO, Redis, BullMQ)
- VR flat-grid panel layout

---

## Near Term (v0.1)

*Goal: a stable, documented base that external contributors can build on.*

<details>
<summary>Show items</summary>

- [ ] Public GitHub repository with complete documentation
- [ ] Reproducible development environment (single `docker compose up` + `npm start`)
- [ ] Automated CI (lint, tests) on pull requests
- [ ] Example dataset (public-domain scientific data with loading instructions)
- [ ] Quest 2 end-to-end test pass (enter VR, load dataset, interact)
- [ ] Session join flow: shareable session URL for collaborators
- [ ] Basic filter UI surfaced in VR wrist menu (threshold, color-by-scalar)
- [ ] `MAINTAINERS.md` and first release tag

</details>

---

## Medium Term (v0.2)

*Goal: support real research workflows and first external user deployments.*

<details>
<summary>Show items</summary>

- [ ] Curved/spatial VR panel layout (improve readability in headset)
- [ ] Room-scale isolation mode (pull one dataset view to full room scale)
- [ ] Annotation system: create, edit, and share annotations in 3D space
- [ ] Bookmark system: save and restore camera + filter state
- [ ] Multi-dataset support: load and compare multiple datasets in one session
- [ ] Role-based collaboration: viewer vs. editor permissions
- [ ] Persistent sessions: resume a session after disconnect
- [ ] MinIO pre-signed URL support for large dataset uploads
- [ ] Documentation: architecture deep-dive, tutorial videos (linked externally)

</details>

---

## Long Term

*Aspirational items. No committed timeline.*

<details>
<summary>Show items</summary>

- [ ] Plugin system for custom VTK features and custom UI panels
- [ ] ParaView interoperability (import ParaView state files)
- [ ] Support for additional file formats beyond VTP/VTK (HDF5, DICOM, NetCDF)
- [ ] Streaming large datasets in tiles / LOD
- [ ] Desktop-native app packaging (Electron or Tauri)
- [ ] Keycloak-free production auth option (OAuth2 PKCE direct)
- [ ] Accessibility audit and improvements for VR interactions
- [ ] Localization (i18n)

</details>

---

## Out of Scope

The following are explicitly **not** planned for OpenCIVAN:

- A hosted/SaaS version (this is a self-hosted open-source tool)
- General-purpose video conferencing or screensharing
- Non-scientific visualization use cases (business intelligence, maps, etc.)

---

*Last updated: 2026. Roadmap items without milestones are aspirational and subject to change.*
