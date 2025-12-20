/**
 * @file index.js
 * @description Exports for confirmation dialog components.
 *
 * These dialogs are specialized wrappers around ConfirmationDialog and Modal
 * for common confirmation scenarios in CIA Web.
 *
 * @example
 * import {
 *   DeleteRecordingDialog,
 *   DeleteNoteDialog,
 *   DeleteProjectDialog,
 *   ClearChatDialog,
 *   ArchiveProjectDialog,
 *   TransferOwnershipDialog
 * } from '@UI/react/components/modals/confirmations';
 */

export {
  DeleteRecordingDialog,
  default as DeleteRecordingDialogDefault,
} from "./DeleteRecordingDialog";
export {
  DeleteNoteDialog,
  default as DeleteNoteDialogDefault,
} from "./DeleteNoteDialog";
export {
  DeleteProjectDialog,
  default as DeleteProjectDialogDefault,
} from "./DeleteProjectDialog";
export {
  ClearChatDialog,
  default as ClearChatDialogDefault,
} from "./ClearChatDialog";
export {
  ArchiveProjectDialog,
  default as ArchiveProjectDialogDefault,
} from "./ArchiveProjectDialog";
export {
  TransferOwnershipDialog,
  default as TransferOwnershipDialogDefault,
} from "./TransferOwnershipDialog";
