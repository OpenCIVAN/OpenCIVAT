/**
 * @file index.jsx
 * @description Public exports for FilesTab.
 */

export { FilesPanelContent, default } from './FilesTab';
export { useFilesTab, canVisualize } from './hooks/useFilesTab';
export { FileItemList, FileItemGrid, getFileTypeConfig } from './components/FileItem';
export { FileThumbnail } from './components/FileThumbnail';
export { FileContextMenu } from './components/FileContextMenu';
export { UploadDropzone } from './components/UploadDropzone';