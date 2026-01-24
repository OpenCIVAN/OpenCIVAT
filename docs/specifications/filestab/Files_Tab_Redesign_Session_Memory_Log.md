# Files Tab Redesign - Design Session Memory Log & Implementation Handoff

**Date:** January 21, 2025  
**Session Focus:** Complete redesign of the Files Tab with VR-first principles  
**Status:** Design complete, ready for implementation

---

## Executive Summary

This session redesigned the Files Tab for CIA Web's collaborative immersive analytics platform. The new design features:

1. **Responsive two-mode layout** (Full mode ≥300px, Compact mode <300px)
2. **Global search and filtering** with smart per-section behavior
3. **Project-level folder system** with breadcrumb navigation
4. **Resizable starred section** for workspace-specific quick access
5. **Tabbed bottom section** (Loaded Datasets / All Files)
6. **View scope hierarchy** (Ephemeral → Personal → Shared → Workspace → Project)
7. **VR-friendly floating panels** for promotion/demotion dialogs
8. **Panel footer** with Help, Upload, and Refresh actions

---

## Design Decisions Summary

### 1. Layout Architecture

**Decision:** Two-mode responsive layout with height threshold at 300px

**Full Mode (≥300px height):**
```
┌─────────────────────────────────────┐
│ 📁 Files                    8 total │ ← Header
├─────────────────────────────────────┤
│ 🔍 [Search all files...          ]  │ ← Global search
│ [NIfTI][DICOM][Docs][Img]    Sort▼  │ ← Global filters + sort
├─────────────────────────────────────┤
│ ▼ ⭐ Starred               2 of 3 ⓘ │ ← Collapsible + resizable
│   brain_scan.nii.gz          ● 45MB │
│   [Show all ↗]                      │ ← Bypass filter link
│ ═══════════════════════════════════ │ ← Resize handle
├─────────────────────────────────────┤
│ [📦 Loaded (2)] [📁 All Files (5)] │ ← Tabs
│ 🏠 Root / Raw Scans                 │ ← Breadcrumb (All Files only)
│   (file/folder list...)             │
├─────────────────────────────────────┤
│ [?]  [    ⬆ Upload Files    ]  [⟳] │ ← Footer
└─────────────────────────────────────┘
```

**Compact Mode (<300px height):**
```
┌─────────────────────────────────────┐
│ 📁 Files                    8 total │
├─────────────────────────────────────┤
│ 🔍 [Search...                    ]  │ ← Global search
│ [NIfTI][DICOM][Docs]         Sort▼  │ ← Global filters
├─────────────────────────────────────┤
│ [⭐ Starred 3] [📦 2] [📁 All 8]   │ ← 3 tabs (labels show when width > 280px)
├─────────────────────────────────────┤
│   (content for active tab)          │
├─────────────────────────────────────┤
│ [?]  [    ⬆ Upload Files    ]  [⟳] │
└─────────────────────────────────────┘
```

**Rationale:** Maximizes usability across different panel sizes while maintaining all functionality.

---

### 2. Global Filtering Strategy (Option C - Hybrid)

**Decision:** Global search + filters at top, with smart per-section behavior

| Section | Search | Type Filter | Sort | Special Behavior |
|---------|--------|-------------|------|------------------|
| **Starred** | ✅ Applies | ✅ Applies | ✅ Applies | "Show all" toggle to bypass filters |
| **Loaded Datasets** | ✅ Applies to dataset names | ✅ Applies to dataset types | ✅ Applies | Has own view-level filters (Active/Inactive/Shared) |
| **All Files** | ✅ Applies | ✅ Applies | ✅ Applies | Folder navigation with breadcrumbs |

**Filter Behavior Details:**
- When filters active, Starred shows "2 of 3" count format
- "Show all" link appears in Starred when items are hidden by filters
- Search clears folder context and searches all files globally

**Type Filters:**
- NIfTI (color: teal)
- DICOM (color: teal)
- Documents (color: blue)
- Images (color: purple)

**Sort Options:**
- Name (A-Z) - default for most sections
- Date Modified (newest first)
- Size (largest first)
- Type (grouped)

---

### 3. Folder System (Option C - Hybrid)

**Decision:** Project-level folders + workspace-level quick access

**Project-Level Folders:**
- Canonical file organization visible to all project members
- Created/managed at project level
- Supports nested folders
- Good for compliance/auditing
- Breadcrumb navigation in "All Files" tab

**Workspace-Level Quick Access:**
- Starred section = workspace-specific shortcuts
- Each workspace can have different starred items
- Future: Recent files per workspace

**Example Structure:**
```
📁 Raw Scans/
   📁 Session 1/
      📦 lung_ct.nii
   📦 brain_scan.nii.gz ● (loaded)
   📦 heart_mri.dcm ● (processing)
📁 Processed/
   📦 segmented_brain.nii.gz
📁 Reports/
   📄 project_notes.md
   📄 analysis_report.pdf
🖼️ thumbnail.png (unfiled - at root)
```

---

### 4. View Scope Hierarchy

**Decision:** 5-level scope system with promotion/demotion rules

| Scope | Icon | Color | Description | Can Promote To | Can Demote To |
|-------|------|-------|-------------|----------------|---------------|
| **Ephemeral** | ○ (dashed circle) | Gray (#6b7280) | Unsaved working view (session only) | Personal | - |
| **Personal** | 👤 User | Purple (#a855f7) | Saved to your account | Shared, Workspace | - |
| **Shared** | 👥 Users | Blue (#3b82f6) | Shared with specific people | Workspace | Personal |
| **Workspace** | ⊞ LayoutGrid | Green (#34d399) | Available to workspace members | Project | Personal |
| **Project** | 📁 FolderOpen | Amber (#fbbf24) | Project-level template | - | Workspace |

**Promotion Flow:**
1. Choose target scope
2. If Shared: Select people to share with
3. Confirm action

**Demotion Rules:**
- Warning when other users will lose access
- Requires explicit confirmation checkbox
- Suggest creating copy for affected users

---

### 5. Load State Indicators

| State | Indicator | Color | Description |
|-------|-----------|-------|-------------|
| **Stored** | No indicator | - | File in storage, not loaded |
| **Loading** | Blue spinner | #3b82f6 | Currently loading into memory |
| **Loaded** | Green dot | #34d399 | In memory, ready to use |
| **Processing** | Amber spinner | #fbbf24 | Compute operation in progress |
| **Error** | Red dot | #ef4444 | Failed to load or process |

**Load Button Behavior:**
- Appears on hover for stored NIfTI/DICOM files
- Explicit action (loading is expensive)
- Shows "Load" text + upload icon

---

### 6. VR-Friendly Floating Panels

**Decision:** Use anchored floating cards instead of traditional modals

**Why Not Modals:**
- Block entire view (disorienting in VR)
- 2D overlay doesn't feel spatial
- Can't be grabbed/moved with controllers
- Break immersion and context

**Floating Card Features:**
- Drag handle at top for repositioning
- 44px minimum touch targets (VR requirement)
- Clear escape hatch (X button)
- Progressive disclosure (step-by-step flows)
- Anchored near trigger element

**Panels Designed:**
1. **Help Panel** - 3 tabs: Overview, View Scopes, Actions
2. **Promote Panel** - 3 steps: Choose scope → Select users (if shared) → Confirm
3. **Demote Panel** - Warning + confirmation checkbox
4. **Context Menu** - Focus, Duplicate, Rename, Delete actions

---

### 7. Panel Footer

**Decision:** Three-button footer always visible

| Position | Button | Icon | Purpose |
|----------|--------|------|---------|
| Left | Help | HelpCircle (cyan) | Opens contextual help panel |
| Center | Upload Files | Upload (white on blue) | Primary action - upload new files |
| Right | Refresh | RefreshCw (muted) | Reload file list |

**Rationale:** 
- Help is essential since VR can't use tooltips
- Upload is most common user action
- Refresh is standard utility

---

### 8. Starred Section Behavior

**When Empty:**
- Shows hint: "Star files for quick access"
- Section header disabled (can't collapse nothing)
- In compact mode, tab still visible with (0) count

**When Has Items:**
- Collapsible header (click to toggle)
- Resizable when expanded (drag handle at bottom)
- Filter chips: All / Datasets / Files
- Min height: 80px, Max height: 250px

**Filter Bypass:**
- When global filters hide items, shows "X items hidden by filters [Show all ↗]"
- Clicking "Show all" temporarily bypasses filters for Starred only

---

### 9. Dataset Tree in Loaded Tab

**Structure:**
```
📦 brain_scan.nii.gz ✓ Loaded    [3 views]
   ├─ 🎨 Axial Slice      ⊞ Active
   ├─ 🎨 3D Volume        👤 
   ├─ 🎨 Sagittal View    📁 Active
   ├─ 🎨 Working View     ○ Active
   └─ + Create View
```

**Dataset Row:**
- Expand/collapse chevron
- Database icon (teal)
- Dataset name
- Load state indicator (✓ Loaded)
- View count badge

**View Row:**
- Color dot (with glow if active)
- Eye icon
- View name
- Scope indicator icon
- "Active" badge if on canvas
- Quick actions on hover: Focus, Promote, More

---

### 10. Responsive Compact Mode Labels

**Width-based label visibility in compact mode:**
- Width > 280px: Show "⭐ Starred 3"
- Width ≤ 280px: Show "⭐ 3" (icon + count only)

---

## Component Architecture

### New Atoms

```
atoms/
├── LoadStateIndicator/
│   ├── LoadStateIndicator.jsx    # Dot + optional spinner
│   ├── LoadStateIndicator.scss
│   └── index.js
│
├── ScopeIndicator/
│   ├── ScopeIndicator.jsx        # Scope icon with color
│   ├── ScopeIndicator.scss
│   └── index.js
│
└── ColorDot/
    ├── ColorDot.jsx              # Simple colored circle with optional glow
    ├── ColorDot.scss
    └── index.js
```

### New/Modified Molecules

```
molecules/
├── SearchBar/                    # Already exists, may need enhancement
│   └── SearchBar.jsx
│
├── FilterChips/
│   ├── FilterChips.jsx           # Horizontal chip group with multi/single select
│   ├── FilterChips.scss
│   └── index.js
│
├── SortDropdown/
│   ├── SortDropdown.jsx          # Dropdown with sort options
│   ├── SortDropdown.scss
│   └── index.js
│
├── ViewModeToggle/
│   ├── ViewModeToggle.jsx        # List/Grid toggle buttons
│   ├── ViewModeToggle.scss
│   └── index.js
│
├── Breadcrumb/
│   ├── Breadcrumb.jsx            # Folder path navigation
│   ├── Breadcrumb.scss
│   └── index.js
│
├── FileItemList/
│   ├── FileItemList.jsx          # Enhanced file row with load state, hover actions
│   ├── FileItemList.scss
│   └── index.js
│
├── FolderItem/
│   ├── FolderItem.jsx            # Expandable folder row
│   ├── FolderItem.scss
│   └── index.js
│
├── DatasetTreeItem/
│   ├── DatasetTreeItem.jsx       # Dataset with expandable views
│   ├── DatasetTreeItem.scss
│   └── index.js
│
├── ViewItem/
│   ├── ViewItem.jsx              # View row with scope, actions (may already exist)
│   ├── ViewItem.scss
│   └── index.js
│
└── PanelFooter/
    ├── PanelFooter.jsx           # Help + Upload + Refresh buttons
    ├── PanelFooter.scss
    └── index.js
```

### New Organisms

```
organisms/
├── GlobalFiltersBar/
│   ├── GlobalFiltersBar.jsx      # Search + type filters + sort
│   ├── GlobalFiltersBar.scss
│   ├── useGlobalFilters.js       # Filter state management hook
│   └── index.js
│
├── StarredSection/
│   ├── StarredSection.jsx        # Collapsible + resizable starred area
│   ├── StarredSection.scss
│   └── index.js
│
├── TabbedFilesBrowser/
│   ├── TabbedFilesBrowser.jsx    # Loaded/All tabs with content
│   ├── TabbedFilesBrowser.scss
│   └── index.js
│
├── CompactFilesPanel/
│   ├── CompactFilesPanel.jsx     # 3-tab compact layout
│   ├── CompactFilesPanel.scss
│   └── index.js
│
├── FloatingCard/
│   ├── FloatingCard.jsx          # VR-friendly draggable panel container
│   ├── FloatingCard.scss
│   └── index.js
│
├── HelpPanel/
│   ├── HelpPanel.jsx             # Contextual help with tabs
│   ├── HelpPanel.scss
│   └── index.js
│
├── PromotePanel/
│   ├── PromotePanel.jsx          # View promotion wizard
│   ├── PromotePanel.scss
│   └── index.js
│
└── DemotePanel/
    ├── DemotePanel.jsx           # View demotion confirmation
    ├── DemotePanel.scss
    └── index.js
```

### Modified Tab

```
panels/LeftPanel/tabs/FilesTab/
├── FilesTab.jsx                  # Main orchestrator - MAJOR REFACTOR
├── FilesTab.scss
├── hooks/
│   ├── useFilesTab.js            # Existing - enhance with folder support
│   ├── useGlobalFilters.js       # New - filter state management
│   └── useResponsiveMode.js      # New - height-based mode detection
└── components/
    └── (local components if needed)
```

---

## Implementation Order

### Phase 1: Core Atoms (Day 1)
1. LoadStateIndicator
2. ScopeIndicator  
3. ColorDot (if not exists)

### Phase 2: Filter Molecules (Day 1-2)
4. FilterChips (with single/multi select modes)
5. SortDropdown
6. ViewModeToggle
7. GlobalFiltersBar (compose above)

### Phase 3: File/Folder Molecules (Day 2-3)
8. FileItemList (enhanced)
9. FolderItem
10. Breadcrumb
11. DatasetTreeItem
12. ViewItem (with scope + actions)

### Phase 4: Section Organisms (Day 3-4)
13. StarredSection
14. TabbedFilesBrowser
15. CompactFilesPanel
16. PanelFooter

### Phase 5: Floating Panels (Day 4-5)
17. FloatingCard (base component)
18. HelpPanel
19. PromotePanel
20. DemotePanel

### Phase 6: Integration (Day 5-6)
21. useGlobalFilters hook
22. useResponsiveMode hook
23. FilesTab.jsx refactor
24. Testing and polish

---

## Key Implementation Notes

### 1. Adaptive/VR-First Pattern

All atoms MUST use `useAdaptive()` hook:

```jsx
const FileItemList = ({ file, ...props }) => {
  const { tokens, isVR } = useAdaptive();
  
  return (
    <div style={{ 
      minHeight: Math.max(tokens.buttonHeight, tokens.touchTarget),
      padding: tokens.gap,
      fontSize: tokens.fontSize,
    }}>
      {/* ... */}
    </div>
  );
};
```

### 2. Filter State Shape

```javascript
const filterState = {
  searchQuery: '',
  typeFilters: [], // ['nifti', 'dicom', 'document', 'image']
  sortBy: 'name', // 'name' | 'date' | 'size' | 'type'
  sortOrder: 'asc', // 'asc' | 'desc'
};
```

### 3. Folder Data Shape

```javascript
const folder = {
  id: 'folder-1',
  name: 'Raw Scans',
  parentId: null, // null = root level
  projectId: 'project-1',
  createdAt: '2025-01-15',
  createdBy: 'user-1',
};
```

### 4. View Scope Constants

```javascript
export const VIEW_SCOPES = {
  EPHEMERAL: 'ephemeral',
  PERSONAL: 'personal',
  SHARED: 'shared',
  WORKSPACE: 'workspace',
  PROJECT: 'project',
};

export const SCOPE_CONFIG = {
  ephemeral: {
    label: 'Unsaved',
    color: '#6b7280',
    icon: 'circle-dashed', // or custom component
    canPromoteTo: ['personal'],
    canDemoteTo: [],
  },
  // ... etc
};
```

### 5. Responsive Mode Detection

```javascript
const useResponsiveMode = (containerRef, threshold = 300) => {
  const [height, setHeight] = useState(500);
  
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setHeight(entry.contentRect.height);
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);
  
  return {
    height,
    isCompact: height < threshold,
    showLabels: containerRef.current?.offsetWidth > 280,
  };
};
```

### 6. Floating Card Positioning

Cards should appear:
- Near the trigger element (not centered on screen)
- Within viewport bounds (clamp position)
- At a reasonable z-index (50+)
- With backdrop for focus (optional)

---

## Prototype Files

Four prototype iterations were created during this session:

| Version | File | Features |
|---------|------|----------|
| V1 | files-tab-prototype.jsx | Basic layout, starred section, tabs |
| V2 | files-tab-prototype-v2.jsx | View scopes, dataset load states, responsive labels |
| V3 | files-tab-prototype-v3.jsx | VR-friendly floating panels, panel footer, help panel |
| V4 | files-tab-prototype-v4.jsx | **FINAL** - Folders, search, filter, sort, all features |

**Use V4 as the reference implementation.**

---

## Open Questions / Future Considerations

1. **Grid view implementation** - Prototype has toggle but grid layout not fully designed
2. **Drag-and-drop** - For file organization, view reordering
3. **Folder creation UI** - How do users create new folders?
4. **Folder permissions** - Can folders have different access levels?
5. **Recent files section** - Add per-workspace recent files?
6. **File preview** - Thumbnail generation for datasets?
7. **Batch operations** - Multi-select and batch actions?
8. **Upload progress** - How to show upload progress in VR?

---

## Continuation Prompt

```
I'm continuing the CIA Web Files Tab implementation. Please search project knowledge for:

1. "Files_Tab_Redesign_Session_Memory_Log.md" (this document)
2. The existing FilesTab implementation in the codebase
3. Atomic_Component_Decomposition_Spec.md for component patterns
4. AdaptiveContext.jsx for the useAdaptive hook

KEY DESIGN REQUIREMENTS:

1. **Two-mode responsive layout**
   - Full mode (≥300px): Starred section (resizable) + tabbed browser
   - Compact mode (<300px): 3 tabs (Starred/Loaded/All)

2. **Global filtering at top**
   - Search applies to all sections
   - Type filters: NIfTI, DICOM, Docs, Images
   - Sort: Name, Date, Size, Type
   - Starred shows "X of Y" and "Show all" link when filtered

3. **Project-level folders + workspace starred**
   - Nested folders with breadcrumb navigation
   - Starred is workspace-specific quick access

4. **View scope hierarchy**
   - Ephemeral → Personal → Shared → Workspace → Project
   - Promotion/demotion with VR-friendly floating panels

5. **VR-first principles**
   - All atoms use useAdaptive() hook
   - 44px minimum touch targets
   - Floating cards instead of modals
   - No hover-dependent features (provide alternatives)

6. **Panel footer**
   - Help (?) + Upload Files + Refresh (⟳)

IMPLEMENTATION ORDER:
1. Core atoms (LoadStateIndicator, ScopeIndicator)
2. Filter molecules (FilterChips, SortDropdown, GlobalFiltersBar)
3. File/folder molecules (FileItemList, FolderItem, Breadcrumb)
4. Section organisms (StarredSection, TabbedFilesBrowser)
5. Floating panels (FloatingCard, HelpPanel, PromotePanel)
6. Integration and FilesTab refactor

Reference the V4 prototype for visual design.
```

---

*Memory log created: January 21, 2025*
*Session duration: Extended design session*
*Next steps: Implementation with Claude Code*
