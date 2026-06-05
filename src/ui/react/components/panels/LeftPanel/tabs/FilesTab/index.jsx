/**
 * @file index.jsx
 * @description Public exports for FilesTab.
 */

export { FilesTab as default, FilesTab, FilesTab as FilesPanelContent } from './FilesTab';

// Hooks
export { useFilesTab, canVisualize } from './hooks/useFilesTab';

// Components
export { FileItemList, FileItemGrid, getFileTypeConfig } from './components/FileItem';
export { FileThumbnail } from './components/FileThumbnail';
export { FileContextMenu } from './components/FileContextMenu';
export { UploadDropzone } from './components/UploadDropzone';
export { DatasetTreeItem } from './components/DatasetTreeItem';
export { FolderNode } from './components/FolderNode';

// Section organisms
export { StarredSection, TabbedFilesBrowser, CompactFilesPanel } from './sections';