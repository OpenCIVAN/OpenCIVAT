# CIA Web - Architecture Decision Log
## Decisions Made - Do Not Re-Ask These Questions

This document captures architectural decisions that have been made. Claude Code should follow these decisions without re-asking or second-guessing.

---

## Data Architecture

### DEC-001: Three-Layer Data Model
**Decision:** Dataset → ViewConfiguration → InstanceWindow
**Rationale:** Clean separation of data, view state, and rendering
**Implications:** 
- Annotations belong to Dataset, NOT ViewConfiguration
- ViewConfiguration is the collaborative unit
- InstanceWindow is ephemeral (can be destroyed without losing state)

### DEC-002: Server Authority for Persistent State
**Decision:** All persistent state must go through server API
**Rationale:** Audit trails, compliance, scientific reproducibility
**Implications:**
- Y.js is for presence ONLY (cursors, avatars)
- No localStorage/IndexedDB as source of truth
- Every state change creates audit log entry

### DEC-003: Server-Generated IDs for ViewConfigurations
**Decision:** ViewConfiguration IDs come from server, not client
**Rationale:** Auditing, reproducibility, preventing duplicates
**Implications:**
- Client must call API to create new view
- Duplication creates NEW server ID (independent entity)
- Client can use temporary IDs until server confirms

### DEC-004: Client-Generated IDs for InstanceWindows
**Decision:** InstanceWindow IDs are generated client-side
**Rationale:** Ephemeral, not persisted, no need for server round-trip
**Implications:**
- No API calls to create/destroy instance windows
- Instance windows not synced between users
- Each user has their own instance windows

---

## Canvas & Workspace

### DEC-005: Infinite Pinboard Canvas Model
**Decision:** Canvas is an infinite 2D grid that users navigate via viewport
**Rationale:** Flexibility for different workflow sizes, scalable
**Implications:**
- Only views in viewport are rendered (GPU optimization)
- Viewport snaps to whole rows/columns (no partial views)
- Canvas grows on demand (add rows/columns)

### DEC-006: View Spanning (Merge Cells)
**Decision:** Views can span 1-3 rows and 1-3 columns
**Rationale:** "Excel merge cells" flexibility for different view importance
**Implications:**
- Maximum span is 3×3 (one view fills viewport)
- Resize via drag handle, context menu, or layout panel
- Spanning stored in CanvasPlacement, not ViewConfiguration

### DEC-007: Workspace Hierarchy
**Decision:** Three levels - Personal, Breakout Room, Project Room
**Rationale:** Different collaboration scopes needed
**Implications:**
- Personal: Only user can see, for private exploration
- Breakout: Subset of team, for focused group work
- Project: All members, for presentations/shared work
- Users can spawn new breakout rooms on demand

### DEC-008: Subsets Replace Viewport Temporarily
**Decision:** Activating a subset replaces the main viewport with subset views only
**Rationale:** Focus mode for deep analysis without losing canvas context
**Implications:**
- Store previous viewport position for "exit focus"
- Subset views auto-arranged in optimal grid
- Subset is a saved entity (persisted, shareable)

### DEC-009: Notes and Images on Canvas
**Decision:** Canvas can contain notes blocks and image blocks alongside views
**Rationale:** Research context belongs with the views being analyzed
**Implications:**
- NotesBlock and ImageBlock are server-persisted entities
- Can be attached to Subsets (research artifacts)
- Visibility can be private or shared (like annotations)

---

## Plugin Architecture

### DEC-010: Handlers Provide Data, Not React Components
**Decision:** Toolbar configs are plain objects, UI renders generically
**Rationale:** Core UI must not know about specific visualization types
**Implications:**
- `getToolbarConfig()` returns `{ groups: [{ tools: [...] }] }`
- UI has generic renderers for each tool type
- New handlers don't require UI code changes

### DEC-011: VTK Handler is Reference Implementation
**Decision:** VTK handler in `src/core/instances/types/vtk/` is the example to follow
**Rationale:** Contributors need a complete, well-documented example
**Implications:**
- VTK handler must be perfectly organized
- Other handlers should copy its patterns
- Don't add VTK-specific code to core

### DEC-012: Handlers Define Their Own VR Support
**Decision:** Each handler declares `supportsVR()` and implements VR methods
**Rationale:** Not all visualization types make sense in VR
**Implications:**
- VR methods are optional in interface
- Graceful fallback if handler doesn't support VR
- VR config per handler (scale, interaction mode, etc.)

### DEC-013: Handlers Define Their Own Render Modes
**Decision:** Each handler declares supported render modes (client/server/hybrid)
**Rationale:** Some types need server rendering, others don't
**Implications:**
- `getSupportedRenderModes()` returns array
- Handler implements mode switching
- Simple handlers can be client-only

---

## VR Design

### DEC-014: VR-First, Desktop-First Implementation
**Decision:** Architecture designed for VR, implemented on desktop first
**Rationale:** Debug easier on desktop, VR requires solid foundation
**Implications:**
- VR stubs created NOW, implementation later
- Every component considers VR from start
- Desktop is a "VR lite" mode, not separate system

### DEC-015: Curved Grid Layout in VR (Fiesta-style)
**Decision:** Views surround user in curved arc in VR mode
**Rationale:** Natural viewing, no need to turn completely around
**Implications:**
- VRGridLayout calculates 3D positions from canvas positions
- Gaze/point to select views
- Grab to pull into isolation mode

### DEC-016: Isolation Mode for Deep VR Analysis
**Decision:** Pull single view to room-scale, walk around 3D model
**Rationale:** VR's killer feature is spatial exploration
**Implications:**
- View scales up to room size
- Other VR users appear as avatars in same space
- Desktop users' cursors visible as floating pointers
- "Return to grid" gesture/button to exit

### DEC-017: Cross-Platform Cursor Visibility
**Decision:** Desktop cursors visible in VR, VR pointers visible on desktop
**Rationale:** Collaboration requires seeing what others are pointing at
**Implications:**
- Desktop: mouse position → 3D world position → Y.js
- VR: controller ray → 3D intersection → Y.js
- Each platform renders others' cursors appropriately

---

## Server-Side Rendering

### DEC-018: Hybrid Rendering Model
**Decision:** Support client, server, and hybrid rendering per handler
**Rationale:** VR needs server rendering, desktop can use client
**Implications:**
- RenderMode enum: 'client' | 'server' | 'hybrid'
- Handler can switch modes at runtime
- Server streams video, client sends interactions

### DEC-019: WebRTC for Video Streaming
**Decision:** Use WebRTC for server-rendered frames
**Rationale:** Low latency, browser-native, handles NAT traversal
**Implications:**
- Signaling server needed
- DataChannel for interactions (low latency)
- Video track for frames

### DEC-020: Target <32ms Total Latency for VR
**Decision:** Interaction-to-photon must be under 32ms for VR
**Rationale:** Above this causes motion sickness
**Implications:**
- NVENC hardware encoding (<2ms)
- Regional render servers
- Predictive rendering for head movement
- May need to sacrifice quality for latency

---

## UI/UX

### DEC-021: Layout Panel on Right Side
**Decision:** Layout/canvas controls in right panel, not left
**Rationale:** Left is data (what), right is context (how, who)
**Implications:**
- Right panel tabs: Layout, People, Voice, Chat, Activity
- Layout tab has sub-tabs: Map, Subsets
- Mini-map shows canvas overview

### DEC-022: Mode Toggle in Top Bar
**Decision:** Desktop/VR toggle prominently in top bar
**Rationale:** Mode switching should be obvious and accessible
**Implications:**
- Shows current mode for all users
- Other users' modes shown on avatars
- Disabled if WebXR not available

### DEC-023: Workspace Tabs in Top Bar
**Decision:** Tabs for Project Room, Breakout Rooms, Personal Workspace
**Rationale:** Easy switching between collaboration contexts
**Implications:**
- Each tab has independent canvas state
- Can create new breakout rooms
- Personal workspace always available

### DEC-024: Glassmorphism Design System
**Decision:** Dark theme with glass/blur effects
**Rationale:** Modern aesthetic, depth without clutter
**Implications:**
- Use `@include glassmorphism` mixin
- Background blur on panels
- Subtle borders and shadows
- Accent colors for different panel types

---

## Technical Conventions

### DEC-025: Webpack Aliases Required
**Decision:** Always use @Core, @UI, @Collaboration aliases
**Rationale:** Clean imports, easy refactoring
**Implications:**
- No relative imports like `../../../`
- Aliases defined in webpack config
- Same aliases in jsconfig.json for IDE support

### DEC-026: BEM Naming for CSS
**Decision:** Block__Element--Modifier naming convention
**Rationale:** Predictable, scalable CSS architecture
**Implications:**
- `.component-name__element--modifier`
- No nested selectors beyond BEM structure
- Co-located SCSS with components

### DEC-027: Component Logic Separation
**Decision:** Logic in `.logic.js`, presentation in `.jsx`
**Rationale:** Designers can modify UI without touching logic
**Implications:**
- Hooks export data and callbacks
- JSX imports from logic file
- No business logic in render functions

---

## What's Deferred (Don't Implement Yet)

### DEF-001: Actual VR Implementation
Create stubs and interfaces, but don't implement VR rendering or interactions yet.

### DEF-002: Server-Side Rendering Implementation
Create stubs and interfaces, but don't implement actual GPU rendering server yet.

### DEF-003: Additional Handlers
Focus on VTK handler as reference. Molecule, Plotly, etc. come later.

### DEF-004: Session Recording
Architecture supports it, but implementation is future sprint.

### DEF-005: Matrix-CRDT for Chat
Current text chat works, migration to Matrix is future.

---

## How to Use This Document

**When implementing a feature:**
1. Check if there's a relevant decision
2. Follow the decision without re-asking
3. If decision seems wrong for your case, flag it explicitly

**When facing a new decision:**
1. Check this document first
2. If not covered, make decision and document it
3. Consider implications for existing decisions

**When reviewing code:**
1. Verify code follows relevant decisions
2. Flag violations as issues
3. Don't merge code that contradicts decisions without discussion
