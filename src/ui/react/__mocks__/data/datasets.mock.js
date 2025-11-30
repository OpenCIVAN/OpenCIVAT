// src/ui/react/__mocks__/data/datasets.mock.js
// Dataset and ViewConfiguration mock data for DatasetsTab Storybook stories
//
// Provides:
// - Datasets loaded in client memory (from DatasetManager)
// - ViewConfigurations for each dataset
// - Various states (active, inactive, shared)

import { MOCK_USERS } from "./users.mock.js";

/**
 * Datasets loaded in client memory
 * Matches the shape returned by useDatasets() hook
 */
export const MOCK_DATASETS = [
  {
    id: "ds-brain-scan",
    name: "Brain_Scan_001.nii",
    fileType: "nii",
    serverId: "file-brain-scan", // Links to server file
    pointCount: 1250000,
    cellCount: 0,
    bounds: [-100, 100, -100, 100, -100, 100],
    dataArrays: ["intensity", "segmentation"],
    annotations: 5,
    hasPolydata: true,
    isAnalyzed: true,
    isLoading: false,
    loadProgress: 100,
    uploadedByName: "You",
    status: "active",
    sharedWith: null,
  },
  {
    id: "ds-ct-overlay",
    name: "CT_Overlay.dcm",
    fileType: "dcm",
    serverId: "file-ct-overlay",
    pointCount: 890000,
    cellCount: 0,
    bounds: [-150, 150, -150, 150, -200, 200],
    dataArrays: ["hounsfield"],
    annotations: 2,
    hasPolydata: true,
    isAnalyzed: true,
    isLoading: false,
    loadProgress: 100,
    uploadedByName: "Dr. Smith",
    status: "active",
    sharedWith: ["Dr. Jones"],
  },
  {
    id: "ds-analysis-results",
    name: "Analysis_Results.vtk",
    fileType: "vtk",
    serverId: "file-analysis-results",
    pointCount: 45000,
    cellCount: 12000,
    bounds: [-50, 50, -50, 50, -50, 50],
    dataArrays: ["scalars", "vectors"],
    annotations: 0,
    hasPolydata: true,
    isAnalyzed: false,
    isLoading: false,
    loadProgress: 100,
    uploadedByName: "Alex Chen",
    status: "inactive", // Not currently visualized
    sharedWith: null,
  },
  {
    id: "ds-surface-model",
    name: "Surface_Model.vtp",
    fileType: "vtp",
    serverId: "file-surface-model",
    pointCount: 25000,
    cellCount: 48000,
    bounds: [-30, 30, -30, 30, -30, 30],
    dataArrays: ["normals", "curvature"],
    annotations: 1,
    hasPolydata: true,
    isAnalyzed: true,
    isLoading: false,
    loadProgress: 100,
    uploadedByName: "You",
    status: "active",
    sharedWith: ["Team"],
  },
  {
    id: "ds-loading-example",
    name: "Large_Dataset.nii",
    fileType: "nii",
    serverId: null, // Still loading
    pointCount: 0,
    cellCount: 0,
    bounds: null,
    dataArrays: [],
    annotations: 0,
    hasPolydata: false,
    isAnalyzed: false,
    isLoading: true,
    loadProgress: 45,
    uploadedByName: "You",
    status: "loading",
    sharedWith: null,
  },
];

/**
 * ViewConfigurations for datasets
 * Matches the shape from ViewConfigurationManager
 */
export const MOCK_VIEWS = [
  // Brain scan views
  {
    id: "view-brain-axial",
    datasetId: "ds-brain-scan",
    name: "Axial View",
    workspaceId: "ws-personal",
    workspaceScope: "personal",
    status: "active",
    instanceColor: "#60a5fa",
    camera: { position: [0, 0, 200], focalPoint: [0, 0, 0], viewUp: [0, 1, 0] },
    filters: [{ type: "threshold", min: 50, max: 200 }],
    widgetStates: {},
    isShared: false,
    sharedWith: [],
    createdBy: MOCK_USERS.current,
    createdAt: "2025-11-20T10:00:00Z",
    updatedAt: "2025-11-28T15:30:00Z",
  },
  {
    id: "view-brain-sagittal",
    datasetId: "ds-brain-scan",
    name: "Sagittal View",
    workspaceId: "ws-personal",
    workspaceScope: "personal",
    status: "active",
    instanceColor: "#fb7185",
    camera: { position: [200, 0, 0], focalPoint: [0, 0, 0], viewUp: [0, 0, 1] },
    filters: [],
    widgetStates: {},
    isShared: true,
    sharedWith: [MOCK_USERS.drSmith],
    createdBy: MOCK_USERS.current,
    createdAt: "2025-11-20T10:15:00Z",
    updatedAt: "2025-11-27T09:00:00Z",
  },
  {
    id: "view-brain-coronal",
    datasetId: "ds-brain-scan",
    name: "Coronal View",
    workspaceId: "ws-project",
    workspaceScope: "project",
    status: "inactive",
    instanceColor: "#fbbf24",
    camera: { position: [0, 200, 0], focalPoint: [0, 0, 0], viewUp: [0, 0, 1] },
    filters: [],
    widgetStates: {},
    isShared: true,
    sharedWith: [],
    createdBy: MOCK_USERS.current,
    createdAt: "2025-11-21T14:00:00Z",
    updatedAt: "2025-11-21T14:00:00Z",
  },
  // CT overlay view
  {
    id: "view-ct-overview",
    datasetId: "ds-ct-overlay",
    name: "CT Overview",
    workspaceId: "ws-project",
    workspaceScope: "project",
    status: "active",
    instanceColor: "#34d399",
    camera: { position: [0, 0, 300], focalPoint: [0, 0, 0], viewUp: [0, 1, 0] },
    filters: [{ type: "windowLevel", window: 400, level: 40 }],
    widgetStates: {},
    isShared: true,
    sharedWith: [],
    createdBy: MOCK_USERS.drSmith,
    createdAt: "2025-11-22T11:00:00Z",
    updatedAt: "2025-11-28T16:00:00Z",
  },
  // Surface model view
  {
    id: "view-surface-default",
    datasetId: "ds-surface-model",
    name: "Default View",
    workspaceId: "ws-personal",
    workspaceScope: "personal",
    status: "active",
    instanceColor: "#c084fc",
    camera: {
      position: [50, 50, 50],
      focalPoint: [0, 0, 0],
      viewUp: [0, 1, 0],
    },
    filters: [],
    widgetStates: {
      clipPlane: { enabled: true, origin: [0, 0, 0], normal: [1, 0, 0] },
    },
    isShared: false,
    sharedWith: [],
    createdBy: MOCK_USERS.current,
    createdAt: "2025-11-25T09:00:00Z",
    updatedAt: "2025-11-28T14:00:00Z",
  },
];

/**
 * Get views for a specific dataset
 */
export function getViewsForDataset(datasetId) {
  return MOCK_VIEWS.filter((v) => v.datasetId === datasetId);
}

/**
 * Get active datasets (currently visualized)
 */
export function getActiveDatasets() {
  return MOCK_DATASETS.filter((d) => d.status === "active");
}

/**
 * Get inactive datasets
 */
export function getInactiveDatasets() {
  return MOCK_DATASETS.filter((d) => d.status === "inactive");
}

/**
 * Get shared datasets
 */
export function getSharedDatasets() {
  return MOCK_DATASETS.filter((d) => d.sharedWith && d.sharedWith.length > 0);
}

/**
 * Get loading datasets
 */
export function getLoadingDatasets() {
  return MOCK_DATASETS.filter((d) => d.isLoading);
}

/**
 * Datasets grouped by status for UI sections
 */
export const MOCK_DATASETS_GROUPED = {
  my: MOCK_DATASETS.filter((d) => d.uploadedByName === "You" && !d.sharedWith),
  shared: getSharedDatasets(),
  inactive: getInactiveDatasets(),
};

/**
 * Datasets with their views attached (for tree display)
 */
export const MOCK_DATASETS_WITH_VIEWS = MOCK_DATASETS.map((dataset) => ({
  ...dataset,
  views: getViewsForDataset(dataset.id),
}));
