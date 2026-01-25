# Specification Archive Notes

**Last Updated:** January 25, 2026

This document tracks which specifications have been archived and what supersedes them.

---

## Archive History

### January 25, 2026

The following specifications were archived as part of the toolsandcanvas redesign consolidation.

---

## Archived Specifications

### 1. Canvas_Area_Design_Specification.md

**Archived:** January 25, 2026
**Reason:** Partially superseded by newer toolsandcanvas specifications

| Section | Status | Superseded By |
|---------|--------|---------------|
| CanvasGrid, CanvasCell | ✅ Still relevant | Extracted to `Canvas_Interaction_Systems_Specification.md` |
| Drop Zone System | ✅ Still relevant | Extracted to `Canvas_Interaction_Systems_Specification.md` |
| InstanceViewport | ✅ Still relevant | Base component still applies |
| **InstanceHeader** | ❌ Superseded | `toolsandcanvas/RoomHeader/` → Mini Canvas Header, Full Canvas Header |
| **InstanceToolbar (mini)** | ❌ Superseded | `toolsandcanvas/Widget_Creation_Part2` → Canvas Toolbar Footer (shared toolbar) |
| ThumbnailLayer | ✅ Still relevant | Extracted to `Canvas_Interaction_Systems_Specification.md` |
| SelectionManager | ✅ Still relevant | Extracted to `Canvas_Interaction_Systems_Specification.md` |
| **Canvas Navigator Popout** | ❌ Superseded | `toolsandcanvas/RoomHeader/` → Popout Windows with snap behavior |
| **Floating Instance Tools Panel** | ❌ Superseded | `toolsandcanvas/Widget_Creation_Part2` → Panel is now floating + Canvas Toolbar Footer |
| FloatingPanels System | Partial | Detailed in `FloatingPanel_Component_Specification.md` |

**Notes:**
- The new architecture introduces Rooms → Workspaces → Views hierarchy
- Per-instance toolbars replaced by shared Canvas Toolbar Footer (better for small viewports)
- Popout windows now have snap-to-edge behavior and are managed by PopoutManager

---

### 2. Adaptive_Components_Implementation_Prompt.md

**Archived:** January 25, 2026
**Reason:** Components are already adaptive by default

**What happened:**
- The base components (Button, Toggle, Slider, Section, Icon, etc.) already use `useAdaptive()` internally
- They automatically adapt sizing for Desktop vs VR modes
- No separate "Adaptive" wrapper components needed
- The AdaptiveContext with tokens already exists at `src/ui/react/context/AdaptiveContext.jsx`

**Superseded by:**
- Built-in adaptive behavior in `/src/ui/react/components/atoms/` and `/src/ui/react/components/molecules/`
- AdaptiveContext at `/src/ui/react/context/AdaptiveContext.jsx`

---

## Current Active Specifications

### Root Level (Oldest)
| File | Status | Notes |
|------|--------|-------|
| `CIAUI_Framework_Specification.md` | ✅ Active | Framework-level spec |
| `Atomic_Component_Decomposition_Spec.md` | ✅ Active | Component architecture |
| `Left_Panel_Design_Specification.md` | ✅ Active | Left panel tabs |
| `Right_Panel_Design_Specification.md` | ✅ Active | Right panel tabs |
| `FloatingPanel_Component_Specification.md` | ✅ Active | Floating/Priority panel system |
| `VR_First_Architecture_Migration_Strategy.md` | ✅ Active | VR migration strategy |
| `VR_Interface_Design_Specification_v2.md` | ✅ Active | VR interface design |
| `TransformControl_Implementation_Package.md` | ✅ Active | Transform controls |
| `Canvas_Interaction_Systems_Specification.md` | ✅ Active | **NEW** - Drop zones, thumbnails, selection |

### Folders (Newest → Oldest)

**toolsandcanvas/** (Newest)
- `Widget_Creation_Part2_Claude_Code_Handoff.md` - Display Section, Annotations Tab, Canvas Toolbar Footer, Camera enhancements
- `RoomHeader/Room_Header_Canvas_Tabs_Claude_Code_Handoff.md` - Room Header, Canvas Tabs Bar, Tiled/Tabbed views, Popouts, Breakouts

**instancetools/**
- `Instance_Tools_V2_Claude_Code_Handoff.md` - Instance Tools panel redesign

**navigator/**
- `Navigator_V5_Claude_Code_Handoff.md` - Canvas Navigator redesign

**layouttab/**
- `Layout_Tab_V4-6_Claude_Code_Handoff.md` - Layout tab redesign

**filestab/**
- `Files_Tab_V2_Claude_Code_Handoff.md` - Files tab with tags

**linking/** (Oldest folder)
- View linking system implementation guides

---

## Folder Age Order

From oldest to newest:
1. `linking/` - View linking system
2. `filestab/` - Files tab redesign
3. `layouttab/` - Layout tab redesign
4. `navigator/` - Navigator redesign
5. `instancetools/` - Instance tools redesign
6. `toolsandcanvas/` - **Newest** - Room/Canvas architecture, shared toolbar

---

## How to Use This Archive

1. **Before implementing:** Check if the spec you're reading is archived here
2. **If archived:** Look at the "Superseded By" column to find the current spec
3. **If active:** The spec is authoritative for its domain
4. **Folder specs trump root specs:** Newer folder-based specs take precedence

---

## Previously Archived (Before This Update)

These were already in the archive folder:
- `volumetric/` - Volumetric data handling specs
- `panel_overlay/` - Panel overlay system (replaced by FloatingPanel)
- `VR_Accessibility_Settings_Panel_Specification.md` - VR accessibility settings
