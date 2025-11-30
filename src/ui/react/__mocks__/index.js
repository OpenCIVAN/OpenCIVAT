// src/ui/react/__mocks__/index.js
// Central export for all mock data and hooks
//
// Usage in Storybook stories:
//   import { MOCK_FILES, useMockProjectFiles } from '@UI/react/__mocks__';
//
// Usage with MockDataProvider:
//   import { MockDataProvider } from '@UI/react/__mocks__';
//   <MockDataProvider><YourComponent /></MockDataProvider>

// =============================================================================
// DATA EXPORTS
// =============================================================================

export {
  MOCK_USERS,
  MOCK_OTHER_USERS,
  MOCK_ALL_USERS,
  MOCK_ONLINE_USERS,
  MOCK_PRESENCE,
  getRandomUsers,
} from "./data/users.mock.js";

export {
  MOCK_FOLDERS_TREE,
  MOCK_FOLDERS_FLAT,
  getFolderById,
  getFolderPath,
  getFolderChildren,
  getRootFolders,
} from "./data/folders.mock.js";

export {
  MOCK_FILES,
  MOCK_STARRED_IDS,
  MOCK_FILES_UI,
  getStarredFiles,
  getRecentFiles,
  getFilesInFolder,
  getRootFiles,
  formatFileSize,
} from "./data/files.mock.js";

export {
  MOCK_DATASETS,
  MOCK_VIEWS,
  MOCK_DATASETS_GROUPED,
  MOCK_DATASETS_WITH_VIEWS,
  getViewsForDataset,
  getActiveDatasets,
  getInactiveDatasets,
  getSharedDatasets,
  getLoadingDatasets,
} from "./data/datasets.mock.js";

// =============================================================================
// MOCK HOOK EXPORTS
// =============================================================================

export {
  useMockProjectFiles,
  useMockAllAccessibleFiles,
} from "./hooks/useProjectFiles.mock.js";

export {
  useMockDatasets,
  useMockDatasetActions,
  useMockViewConfigurations,
  useMockDatasetsWithViews,
} from "./hooks/useDatasets.mock.js";

// =============================================================================
// LEGACY EXPORTS (Deprecated - migrate to new structure)
// =============================================================================

// Re-export from old panelMockData for backward compatibility
// TODO: Migrate stories to use new imports, then remove this
export * from "./panelMockData.js";
