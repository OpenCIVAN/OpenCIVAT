// src/ui/react/components/panels/__mocks__/panelMockData.js
// Centralized mock data for panel components and Storybook stories
// This data was extracted from the component files for reuse in stories

// =============================================================================
// COMMON / SHARED
// =============================================================================

export const USERS = {
  current: {
    id: "current",
    name: "You",
    color: "#2dd4bf",
    email: "you@example.com",
  },
  drSmith: {
    id: "u1",
    name: "Dr. Sarah Smith",
    email: "sarah@hospital.org",
    color: "#fb7185",
  },
  drJones: {
    id: "u2",
    name: "Dr. Michael Jones",
    email: "mjones@hospital.org",
    color: "#fbbf24",
  },
  alexChen: {
    id: "u3",
    name: "Alex Chen",
    email: "alex@research.edu",
    color: "#60a5fa",
  },
  bobWilson: { id: "u4", name: "Bob Wilson", color: "#c084fc" },
  emilyWilson: {
    id: "u5",
    name: "Dr. Emily Wilson",
    email: "ewilson@hospital.org",
    color: "#2dd4bf",
  },
  guest: {
    id: "u6",
    name: "Guest User",
    email: "guest@temp.com",
    color: "#6b7280",
  },
};

// =============================================================================
// RIGHT PANEL - ROOMS TAB
// =============================================================================

export const ROOMS_MOCK = {
  currentUser: USERS.current,
  rooms: [
    {
      id: "main",
      name: "Main Room",
      type: "project",
      access: "open",
      hasVoice: true,
      hasText: true,
      isPersistent: true,
      members: [
        { ...USERS.drSmith, isOwner: true },
        { ...USERS.drJones },
        { ...USERS.current },
      ],
      isCurrentRoom: true,
    },
    {
      id: "breakout-1",
      name: "Tumor Analysis",
      type: "breakout",
      access: "open",
      hasVoice: true,
      hasText: true,
      isPersistent: false,
      members: [{ ...USERS.alexChen, isOwner: true }, { ...USERS.bobWilson }],
      isCurrentRoom: false,
    },
    {
      id: "breakout-2",
      name: "Private Discussion",
      type: "breakout",
      access: "invite",
      hasVoice: false,
      hasText: true,
      isPersistent: false,
      members: [{ ...USERS.drSmith, isOwner: true }],
      isCurrentRoom: false,
    },
    {
      id: "personal-1",
      name: "My Scratch Space",
      type: "personal",
      access: "invisible",
      hasVoice: false,
      hasText: false,
      isPersistent: true,
      members: [{ ...USERS.current, isOwner: true }],
      isCurrentRoom: false,
    },
  ],
};

// =============================================================================
// RIGHT PANEL - VOICE TAB
// =============================================================================

export const VOICE_MOCK = {
  channels: [
    { id: "main", name: "Main Room", participants: 3, active: true },
    { id: "breakout-1", name: "Breakout 1", participants: 2, active: false },
    { id: "breakout-2", name: "Breakout 2", participants: 0, active: false },
  ],
  participants: [
    {
      id: "u1",
      name: "Dr. Smith",
      color: "#fb7185",
      speaking: true,
      muted: false,
      deafened: false,
    },
    {
      id: "u2",
      name: "Dr. Jones",
      color: "#fbbf24",
      speaking: false,
      muted: true,
      deafened: false,
    },
    {
      id: "u3",
      name: "Alice Chen",
      color: "#2dd4bf",
      speaking: false,
      muted: false,
      deafened: false,
    },
  ],
};

// =============================================================================
// RIGHT PANEL - ACTIVITY TAB
// =============================================================================

export const ACTIVITY_MOCK = {
  activities: [
    {
      id: "a1",
      type: "view",
      user: { name: "Dr. Smith", color: "#fb7185" },
      action: "created a new view",
      target: "Brain MRI - Sagittal",
      timestamp: new Date(Date.now() - 2 * 60 * 1000),
    },
    {
      id: "a2",
      type: "dataset",
      user: { name: "Alice Chen", color: "#2dd4bf" },
      action: "loaded dataset",
      target: "patient_scan_001.nii",
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
    },
    {
      id: "a3",
      type: "annotation",
      user: { name: "Dr. Jones", color: "#fbbf24" },
      action: "added annotation",
      target: "Tumor ROI marker",
      timestamp: new Date(Date.now() - 12 * 60 * 1000),
    },
    {
      id: "a4",
      type: "share",
      user: { name: "Dr. Smith", color: "#fb7185" },
      action: "shared view with",
      target: "Team",
      timestamp: new Date(Date.now() - 25 * 60 * 1000),
    },
    {
      id: "a5",
      type: "edit",
      user: { name: "Alice Chen", color: "#2dd4bf" },
      action: "modified filter",
      target: "High contrast preset",
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
    },
    {
      id: "a6",
      type: "system",
      user: null,
      action: "Auto-saved workspace",
      target: null,
      timestamp: new Date(Date.now() - 60 * 60 * 1000),
    },
    {
      id: "a7",
      type: "join",
      user: { name: "Dr. Jones", color: "#fbbf24" },
      action: "joined the session",
      target: null,
      timestamp: new Date(Date.now() - 90 * 60 * 1000),
    },
  ],
  filters: [
    { id: "all", label: "All Activity" },
    { id: "views", label: "Views" },
    { id: "datasets", label: "Datasets" },
    { id: "annotations", label: "Annotations" },
    { id: "system", label: "System" },
  ],
};

// =============================================================================
// RIGHT PANEL - PEOPLE TAB
// =============================================================================

export const PEOPLE_MOCK = {
  statusConfig: {
    active: { color: "green", label: "Active" },
    idle: { color: "amber", label: "Idle" },
    away: { color: "muted", label: "Away" },
    presenting: { color: "purple", label: "Presenting" },
    recording: { color: "red", label: "Recording" },
  },
  workspaceConfig: {
    personal: { color: "green", label: "Personal" },
    project: { color: "blue", label: "Project Room" },
    breakout: { color: "purple", label: "Team Breakout" },
  },
  members: [
    {
      id: "me",
      name: "You",
      email: "you@example.com",
      color: "green",
      status: "active",
      workspace: "personal",
      isMe: true,
      role: "owner",
      mic: true,
      video: false,
      handRaised: false,
    },
    {
      id: "u1",
      name: "Dr. Sarah Smith",
      email: "sarah@hospital.org",
      color: "pink",
      status: "active",
      workspace: "personal",
      isMe: false,
      role: "editor",
      mic: true,
      video: true,
      handRaised: false,
    },
    {
      id: "u2",
      name: "Dr. Michael Jones",
      email: "mjones@hospital.org",
      color: "amber",
      status: "presenting",
      workspace: "project",
      isMe: false,
      role: "editor",
      mic: true,
      video: true,
      handRaised: false,
    },
    {
      id: "u3",
      name: "Alex Chen",
      email: "alex@research.edu",
      color: "purple",
      status: "active",
      workspace: "breakout",
      isMe: false,
      role: "viewer",
      mic: false,
      video: false,
      handRaised: true,
    },
    {
      id: "u4",
      name: "Dr. Emily Wilson",
      email: "ewilson@hospital.org",
      color: "teal",
      status: "idle",
      workspace: "project",
      isMe: false,
      role: "editor",
      mic: false,
      video: false,
      handRaised: false,
    },
    {
      id: "u5",
      name: "Guest User",
      email: "guest@temp.com",
      color: "muted",
      status: "away",
      workspace: null,
      isMe: false,
      role: "viewer",
      mic: false,
      video: false,
      handRaised: false,
    },
  ],
};

// =============================================================================
// RIGHT PANEL - CHAT TAB
// =============================================================================

export const CHAT_MOCK = {
  tabs: [
    { id: "room", label: "Room", color: "blue", unread: 0 },
    { id: "breakout", label: "Breakout", color: "purple", unread: 3 },
    { id: "dm", label: "Direct", color: "pink", unread: 1 },
  ],
  messages: {
    room: [
      {
        id: "m1",
        user: "Dr. Smith",
        color: "pink",
        text: "Can everyone see the tumor region highlighted?",
        time: "10:32 AM",
        isMe: false,
      },
      {
        id: "m2",
        user: "You",
        color: "green",
        text: "Yes, I can see it clearly. The margins look well-defined.",
        time: "10:33 AM",
        isMe: true,
      },
      {
        id: "m3",
        user: "Dr. Jones",
        color: "amber",
        text: "I agree. Let me add a measurement annotation.",
        time: "10:34 AM",
        isMe: false,
      },
      {
        id: "m4",
        user: "Dr. Smith",
        color: "pink",
        text: "@You can you zoom in on the left hemisphere?",
        time: "10:35 AM",
        isMe: false,
        mention: true,
      },
      {
        id: "m5",
        user: "System",
        color: "muted",
        text: 'Dr. Jones added annotation: "Tumor diameter - 24.5mm"',
        time: "10:36 AM",
        isSystem: true,
      },
    ],
    breakout: [
      {
        id: "b1",
        user: "Alex Chen",
        color: "purple",
        text: "Should we discuss the surgical approach here?",
        time: "10:40 AM",
        isMe: false,
      },
      {
        id: "b2",
        user: "Dr. Smith",
        color: "pink",
        text: "Yes, let's review the options.",
        time: "10:41 AM",
        isMe: false,
      },
      {
        id: "b3",
        user: "You",
        color: "green",
        text: "I'll share my screen with the 3D model.",
        time: "10:42 AM",
        isMe: true,
      },
    ],
    dm: [
      {
        id: "d1",
        user: "Dr. Smith",
        color: "pink",
        text: "Hey, do you have a minute to discuss the case privately?",
        time: "9:15 AM",
        isMe: false,
      },
      {
        id: "d2",
        user: "You",
        color: "green",
        text: "Sure, what's on your mind?",
        time: "9:16 AM",
        isMe: true,
      },
      {
        id: "d3",
        user: "Dr. Smith",
        color: "pink",
        text: "I wanted to get your opinion on the prognosis before we present to the team.",
        time: "9:17 AM",
        isMe: false,
      },
    ],
  },
  dmConversations: [
    {
      id: "dm1",
      user: "Dr. Smith",
      color: "pink",
      lastMessage: "I wanted to get your opinion...",
      time: "9:17 AM",
      unread: 1,
    },
    {
      id: "dm2",
      user: "Dr. Jones",
      color: "amber",
      lastMessage: "Thanks for the file!",
      time: "Yesterday",
      unread: 0,
    },
    {
      id: "dm3",
      user: "Alex Chen",
      color: "purple",
      lastMessage: "See you in the meeting",
      time: "Mon",
      unread: 0,
    },
  ],
};

// =============================================================================
// RIGHT PANEL - NOTES TAB
// =============================================================================

export const NOTES_MOCK = {
  notes: [
    {
      id: "n1",
      title: "Session Summary",
      content:
        "Discussed tumor boundaries and potential surgical approaches. Dr. Smith highlighted the importance of the 2cm margin.",
      createdBy: "You",
      timestamp: "10:45 AM",
      pinned: true,
      shared: true,
      hasImage: false,
    },
    {
      id: "n2",
      title: "Measurement Notes",
      content:
        "Tumor diameter: 24.5mm\nDistance to critical structure: 8.2mm\nMargin assessment: Adequate",
      createdBy: "Dr. Smith",
      timestamp: "10:38 AM",
      pinned: false,
      shared: true,
      hasImage: true,
    },
    {
      id: "n3",
      title: "Follow-up Items",
      content:
        "- Review with radiology\n- Schedule follow-up scan\n- Prepare surgical plan document",
      createdBy: "You",
      timestamp: "10:30 AM",
      pinned: false,
      shared: false,
      hasImage: false,
    },
    {
      id: "n4",
      title: "Quick note",
      content: "Check left hemisphere detail in next session",
      createdBy: "Dr. Jones",
      timestamp: "Yesterday",
      pinned: false,
      shared: true,
      hasImage: false,
    },
  ],
};

// =============================================================================
// RIGHT PANEL - RECORDINGS TAB
// =============================================================================

export const RECORDINGS_MOCK = {
  modes: [
    {
      id: "full",
      label: "Full Session",
      description: "Record entire workspace grid",
    },
    {
      id: "isolation",
      label: "Isolation",
      description: "Record single focused instance",
    },
    {
      id: "subset",
      label: "Subset",
      description: "Record selected instances only",
    },
  ],
  recordings: [
    {
      id: "r1",
      title: "Tumor Analysis Session",
      duration: "45:32",
      date: "Today, 10:30 AM",
      participants: ["You", "Dr. Smith", "Dr. Jones"],
      mode: "full",
    },
    {
      id: "r2",
      title: "Surgical Planning Review",
      duration: "28:15",
      date: "Yesterday, 2:00 PM",
      participants: ["You", "Dr. Smith"],
      mode: "isolation",
    },
    {
      id: "r3",
      title: "Team Discussion - Case 451",
      duration: "1:12:08",
      date: "Nov 25, 9:00 AM",
      participants: ["You", "Dr. Smith", "Dr. Jones", "Alex Chen"],
      mode: "full",
    },
  ],
};

// =============================================================================
// LEFT PANEL - ANNOTATIONS TAB
// =============================================================================

export const ANNOTATIONS_MOCK = {
  types: {
    point: { label: "Point", color: "blue" },
    ruler: { label: "Ruler", color: "green" },
    region: { label: "Region", color: "purple" },
    note: { label: "Note", color: "amber" },
  },
  datasets: [
    {
      id: "ds1",
      name: "Brain_Scan_001.nii",
      color: "blue",
      annotations: [
        {
          id: "a1",
          type: "ruler",
          text: "Tumor diameter",
          value: "24.5mm",
          createdBy: "You",
          timestamp: "2h ago",
          visible: true,
        },
        {
          id: "a2",
          type: "point",
          text: "Region of interest",
          createdBy: "Dr. Smith",
          timestamp: "1d ago",
          visible: true,
          shared: true,
        },
        {
          id: "a3",
          type: "region",
          text: "Affected area outline",
          createdBy: "You",
          timestamp: "1d ago",
          visible: false,
        },
      ],
    },
    {
      id: "ds2",
      name: "CT_Overlay.dcm",
      color: "teal",
      annotations: [
        {
          id: "a4",
          type: "point",
          text: "Reference point A",
          createdBy: "You",
          timestamp: "1w ago",
          visible: true,
        },
        {
          id: "a5",
          type: "ruler",
          text: "Distance to landmark",
          value: "12.3mm",
          createdBy: "You",
          timestamp: "1w ago",
          visible: true,
        },
      ],
    },
  ],
  workspace: [
    {
      id: "wa1",
      type: "note",
      text: "Compare these two views",
      linkedInstances: ["Main Analysis", "CT Overlay"],
      createdBy: "You",
      timestamp: "1h ago",
    },
    {
      id: "wa2",
      type: "region",
      text: "Focus area for presentation",
      linkedInstances: ["Main Analysis"],
      createdBy: "Dr. Smith",
      timestamp: "2d ago",
      shared: true,
    },
  ],
};

// =============================================================================
// LEFT PANEL - INSTANCE TOOLS TAB
// =============================================================================

export const INSTANCE_TOOLS_MOCK = {
  focusedInstance: {
    id: "inst-1",
    name: "Main Analysis",
    type: "vtk",
    dataset: "Brain_Scan_001.nii",
    color: "blue",
  },
  widgets: [
    { id: "w1", name: "Orientation", visible: true },
    { id: "w2", name: "Axis Actor", visible: true },
    { id: "w3", name: "Clip Plane A", visible: true, selected: true },
    { id: "w4", name: "Clip Plane B", visible: false },
  ],
  layers: {
    cursors: { enabled: true, opacity: 1.0, count: 3, total: 5 },
    annotations: { enabled: true, opacity: 1.0, count: 12, total: 45 },
    segmentations: { enabled: true, opacity: 0.7, count: 2, total: 3 },
  },
};

// =============================================================================
// LEFT PANEL - SAVED FILTERS TAB
// =============================================================================

export const SAVED_FILTERS_MOCK = {
  filters: [
    {
      id: "f1",
      name: "Bone View",
      type: "composite",
      description: "Colormap + threshold for bone visualization",
      components: ["colormap", "threshold", "opacity"],
      starred: true,
      shared: false,
      createdBy: "You",
      usageCount: 24,
    },
    {
      id: "f2",
      name: "Soft Tissue",
      type: "composite",
      description: "Low threshold with pink colormap",
      components: ["colormap", "threshold"],
      starred: true,
      shared: true,
      createdBy: "You",
      usageCount: 18,
    },
    {
      id: "f3",
      name: "MIP Preset",
      type: "composite",
      description: "Maximum intensity projection settings",
      components: ["opacity", "colormap"],
      starred: false,
      shared: false,
      createdBy: "You",
      usageCount: 7,
    },
    {
      id: "f4",
      name: "Dr. Smith's Tumor View",
      type: "composite",
      description: "Optimized for tumor visualization",
      components: ["colormap", "threshold", "clip"],
      starred: false,
      shared: true,
      createdBy: "Dr. Smith",
      usageCount: 12,
    },
    {
      id: "f5",
      name: "Quick Clip X",
      type: "clip",
      description: "Sagittal clip plane preset",
      components: ["clip"],
      starred: false,
      shared: false,
      createdBy: "You",
      usageCount: 3,
    },
  ],
};

// =============================================================================
// LEFT PANEL - BOOKMARKS TAB
// =============================================================================

export const BOOKMARKS_MOCK = {
  bookmarks: [
    {
      id: "b1",
      name: "Tumor Overview",
      dataset: "Brain_Scan_001.nii",
      workspace: "My Workspace",
      timestamp: "2 hours ago",
      createdBy: "You",
      shared: false,
      tags: ["tumor", "review"],
      color: "blue",
    },
    {
      id: "b2",
      name: "Left Hemisphere Detail",
      dataset: "Brain_Scan_001.nii",
      workspace: "My Workspace",
      timestamp: "1 day ago",
      createdBy: "You",
      shared: true,
      tags: ["hemisphere", "detail"],
      color: "blue",
    },
    {
      id: "b3",
      name: "Comparison View",
      dataset: "CT_Overlay.dcm",
      workspace: "Project Room",
      timestamp: "3 days ago",
      createdBy: "Dr. Smith",
      shared: true,
      tags: ["comparison"],
      color: "teal",
    },
    {
      id: "b4",
      name: "Bone Structure A",
      dataset: "Reference_Atlas.nii",
      workspace: "Team A Breakout",
      timestamp: "1 week ago",
      createdBy: "You",
      shared: false,
      tags: ["bone", "structure"],
      color: "amber",
    },
    {
      id: "b5",
      name: "Pre-op Planning",
      dataset: "Tumor_Region.vtk",
      workspace: "Project Room",
      timestamp: "1 week ago",
      createdBy: "Dr. Jones",
      shared: true,
      tags: ["planning", "surgery"],
      color: "pink",
    },
  ],
};

// =============================================================================
// LEFT PANEL - LAYOUT TAB
// =============================================================================

export const LAYOUT_MOCK = {
  currentWorkspace: {
    id: "personal",
    name: "My Workspace",
    type: "personal",
    color: "green",
  },
  canvasSize: { rows: 4, cols: 5 },
  viewport: { row: 0, col: 0, rows: 2, cols: 3 },
  cells: [
    {
      id: "c1",
      row: 0,
      col: 0,
      rowSpan: 1,
      colSpan: 2,
      instance: {
        id: "i1",
        name: "Brain MRI - Axial",
        dataset: "Brain_Scan_001.nii",
        color: "blue",
      },
    },
    {
      id: "c2",
      row: 0,
      col: 2,
      rowSpan: 2,
      colSpan: 1,
      instance: {
        id: "i2",
        name: "Spine CT",
        dataset: "CT_Overlay.dcm",
        color: "purple",
      },
    },
    {
      id: "c3",
      row: 1,
      col: 0,
      rowSpan: 1,
      colSpan: 1,
      instance: {
        id: "i3",
        name: "PCA Plot",
        dataset: "Analysis.vtk",
        color: "green",
      },
    },
    { id: "c4", row: 1, col: 1, rowSpan: 1, colSpan: 1, instance: null },
    {
      id: "c5",
      row: 2,
      col: 0,
      rowSpan: 1,
      colSpan: 3,
      instance: {
        id: "i4",
        name: "Timeline",
        dataset: "Timeline.csv",
        color: "amber",
      },
    },
    { id: "c6", row: 3, col: 0, rowSpan: 1, colSpan: 2, instance: null },
    {
      id: "c7",
      row: 3,
      col: 2,
      rowSpan: 1,
      colSpan: 1,
      instance: {
        id: "i5",
        name: "Comparison View",
        dataset: "Reference.nii",
        color: "pink",
      },
    },
    {
      id: "c8",
      row: 0,
      col: 3,
      rowSpan: 2,
      colSpan: 2,
      instance: {
        id: "i6",
        name: "Full Scan",
        dataset: "FullBody.dcm",
        color: "teal",
      },
    },
    { id: "c9", row: 2, col: 3, rowSpan: 2, colSpan: 2, instance: null },
  ],
  availableDatasets: [
    { id: "d1", name: "Brain MRI", color: "blue" },
    { id: "d2", name: "Spine CT", color: "purple" },
    { id: "d3", name: "PCA Results", color: "green" },
    { id: "d7", name: "Knee X-Ray", color: "amber" },
    { id: "d8", name: "Heart Echo", color: "pink" },
  ],
  workspaceMembers: [
    {
      id: "me",
      name: "You",
      color: "teal",
      isMe: true,
      status: "active",
      cursorVisible: true,
    },
    {
      id: "u1",
      name: "Dr. Smith",
      color: "pink",
      isMe: false,
      status: "active",
      cursorVisible: true,
    },
    {
      id: "u2",
      name: "Dr. Jones",
      color: "amber",
      isMe: false,
      status: "idle",
      cursorVisible: true,
    },
  ],
  layoutPresets: [
    { id: "single", name: "Single", grid: "1x1" },
    { id: "split-h", name: "Split H", grid: "1x2" },
    { id: "split-v", name: "Split V", grid: "2x1" },
    { id: "quad", name: "Quad", grid: "2x2" },
    { id: "focus", name: "Focus", grid: "1+2" },
  ],
  viewModes: [
    {
      id: "normal",
      label: "Normal",
      color: "green",
      description: "Standard grid view with all instances visible.",
    },
    {
      id: "isolation",
      label: "Isolation",
      color: "purple",
      description: "Focus on a single instance.",
    },
    {
      id: "subset",
      label: "Subset",
      color: "teal",
      description: "Select multiple instances to view together.",
    },
  ],
};

// =============================================================================
// LEFT PANEL - FILES TAB (Sample data for stories)
// =============================================================================

export const FILES_MOCK = {
  files: [
    {
      id: 1,
      name: "Brain_Scan_001.nii",
      fileType: "nii",
      size: "45.2 MB",
      starred: true,
      loaded: true,
      thumbnail: true,
      date: new Date(),
    },
    {
      id: 2,
      name: "CT_Overlay.dcm",
      fileType: "dcm",
      size: "128.5 MB",
      starred: false,
      loaded: true,
      thumbnail: true,
      date: new Date(Date.now() - 86400000),
    },
    {
      id: 3,
      name: "Reference_Atlas.nii",
      fileType: "nii",
      size: "89.1 MB",
      starred: true,
      loaded: false,
      thumbnail: true,
      date: new Date(Date.now() - 172800000),
    },
    {
      id: 4,
      name: "Analysis_Results.vtk",
      fileType: "vtk",
      size: "12.3 MB",
      starred: false,
      loaded: false,
      thumbnail: true,
      date: new Date(Date.now() - 259200000),
    },
    {
      id: 5,
      name: "Surface_Model.vtp",
      fileType: "vtp",
      size: "34.7 MB",
      starred: false,
      loaded: true,
      thumbnail: true,
      date: new Date(Date.now() - 345600000),
    },
  ],
};

// =============================================================================
// LEFT PANEL - DATASETS TAB (Sample data for stories)
// =============================================================================

export const DATASETS_MOCK = {
  datasets: [
    {
      id: "ds1",
      name: "Brain_Scan_001.nii",
      fileType: "nii",
      annotations: 5,
      pointCount: 1250000,
      cellCount: 0,
      uploadedByName: "You",
      views: [
        {
          id: "v1",
          name: "Axial View",
          workspace: "personal",
          status: "active",
          instanceColor: "#60a5fa",
          filters: ["threshold"],
          isShared: false,
        },
        {
          id: "v2",
          name: "Sagittal View",
          workspace: "personal",
          status: "active",
          instanceColor: "#fb7185",
          filters: [],
          isShared: true,
          sharedWith: ["Dr. Smith"],
        },
      ],
    },
    {
      id: "ds2",
      name: "CT_Overlay.dcm",
      fileType: "dcm",
      annotations: 2,
      pointCount: 890000,
      cellCount: 0,
      uploadedByName: "Dr. Smith",
      views: [
        {
          id: "v3",
          name: "CT Overview",
          workspace: "project",
          status: "active",
          instanceColor: "#2dd4bf",
          filters: ["colormap", "opacity"],
          isShared: true,
        },
      ],
    },
    {
      id: "ds3",
      name: "Surface_Model.vtp",
      fileType: "vtp",
      annotations: 0,
      pointCount: 45000,
      cellCount: 90000,
      uploadedByName: "You",
      views: [
        {
          id: "v4",
          name: "3D Surface",
          workspace: "personal",
          status: "inactive",
          instanceColor: "#c084fc",
          filters: [],
          isShared: false,
          lastActive: "2h ago",
        },
      ],
    },
  ],
};

// =============================================================================
// CURSORS TAB CONFIG
// =============================================================================

export const CURSORS_CONFIG = {
  colors: [
    { name: "Green", value: "#34d399" },
    { name: "Blue", value: "#60a5fa" },
    { name: "Purple", value: "#c084fc" },
    { name: "Pink", value: "#fb7185" },
    { name: "Amber", value: "#fbbf24" },
    { name: "Teal", value: "#7dd3fc" },
    { name: "Red", value: "#f87171" },
    { name: "White", value: "#ffffff" },
  ],
  followModes: [
    { id: "none", label: "None" },
    { id: "follow", label: "Follow" },
    { id: "broadcast", label: "Broadcast" },
  ],
};
