/**
 * @file DeleteViewGroupDialog.jsx
 * @description Confirmation dialog for deleting a view group.
 *
 * @see Modal_Design_Specification.md - Group 1: Confirmation Dialogs
 *
 * @example
 * <DeleteViewGroupDialog
 *   isOpen={showDelete}
 *   onClose={() => setShowDelete(false)}
 *   viewGroup={{ id: 'vg-1', name: 'My Group' }}
 *   onConfirm={() => handleConfirmDelete()}
 * />
 */

import React from 'react';
import ConfirmationDialog from '../ConfirmationDialog';

/**
 * Confirmation dialog for deleting a view group.
 * The view group and its canvas placements will be permanently deleted.
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether dialog is visible
 * @param {() => void} props.onClose - Close handler
 * @param {Object} props.viewGroup - View group to delete
 * @param {() => void} props.onConfirm - Delete confirmation handler
 * @returns {React.ReactElement} The rendered dialog
 */
export function DeleteViewGroupDialog({
    isOpen,
    onClose,
    viewGroup,
    onConfirm,
}) {
    const handleConfirm = () => {
        onConfirm?.();
        onClose();
    };

    return (
        <ConfirmationDialog
            isOpen={isOpen}
            onClose={onClose}
            title="Delete View Group?"
            description={`"${viewGroup?.name || 'This view group'}" and its canvas placements will be permanently deleted.`}
            severity="danger"
            confirmLabel="Delete"
            onConfirm={handleConfirm}
            testId="delete-vg-dialog"
        />
    );
}

export default DeleteViewGroupDialog;
