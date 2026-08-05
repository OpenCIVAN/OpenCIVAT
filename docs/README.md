# OpenCIVAN Documentation

Welcome to the OpenCIVAN documentation. OpenCIVAN is a VR-first collaborative
visualization toolkit — if you are new, start with [getting-started.md](getting-started.md)
(step-by-step run instructions), then [installation.md](installation.md) for the full
configuration reference.

---

## Getting Started

| Document | Description |
|---|---|
| [getting-started.md](getting-started.md) | Step-by-step run instructions for every workflow |
| [installation.md](installation.md) | Full installation and configuration reference |

## Immersive / VR

OpenCIVAN targets two headsets as first-class VR clients — **Apple Vision Pro** and
**Oculus/Meta Quest 2** — alongside standard desktop browsers.

| Document | Description |
|---|---|
| [apple-vision-pro.md](apple-vision-pro.md) | Apple Vision Pro browser client guide — architecture, tunneling, gripless (pinch) input |
| [quest-voice-setup.md](quest-voice-setup.md) | Oculus/Meta Quest 2 multi-headset voice, avatars & synchronous collaboration setup |
| [windows-gpu-setup.md](windows-gpu-setup.md) | Windows + NVIDIA + WSL2 + Docker GPU rendering setup (dev/render-server machine) |
| [avatars.md](avatars.md) | VR avatar subsystem — representation, pose sync, coordinate transforms |
| [demo-runbook.md](demo-runbook.md) | Live demo script for desktop + VR feature walkthroughs |
| [vision-pro-validation-checklist.md](vision-pro-validation-checklist.md) | On-device Vision Pro test checklist |

## Architecture

| Document | Description |
|---|---|
| [architecture.md](architecture.md) | System architecture, data flow, design decisions |
| [synchronization.md](synchronization.md) | Dual-channel sync architecture (Y.js presence vs. REST persistence), conflict resolution |
| [session-room-workspace-management.md](session-room-workspace-management.md) | Permissions, workspaces, rooms, breakout/merge, DMs |
| [visualization-state-layers.md](visualization-state-layers.md) | Dataset / ViewConfiguration / VTKInstanceHandler layering |
| [server-rendering.md](server-rendering.md) | Server-side rendering architecture and protocol |

## Research

| Document | Description |
|---|---|
| [user-study-protocol.md](user-study-protocol.md) | Formal HCI user-study protocol (research questions, task design, measures) |
| [paper/OpenCIVAN_collaborative_toolkit_paper_draft.md](paper/OpenCIVAN_collaborative_toolkit_paper_draft.md) | Academic paper draft |

## Tutorials & Examples

| Document | Description |
|---|---|
| [tutorials.md](tutorials.md) | Step-by-step tutorials for users and developers |
| [examples.md](examples.md) | Example datasets and research use cases |

---

## Other Resources

| Resource | Location |
|---|---|
| Agent/developer reference (stack, commands, architecture) | [CLAUDE.md](../CLAUDE.md) |
| How to contribute | [CONTRIBUTING.md](../CONTRIBUTING.md) |
| Project roadmap | [ROADMAP.md](../ROADMAP.md) |
| Community Q&A | [GitHub Discussions](../../discussions) |

Documentation contributions are welcome. See the
[documentation issue template](../.github/ISSUE_TEMPLATE/documentation_issue.md) to report gaps.
