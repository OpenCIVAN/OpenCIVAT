/**
 * @file Modal.jsx
 * @description Base Modal component for CIA Web.
 * This is the foundation component for all 21 modals in the application.
 * Provides accessibility, focus trapping, animations, and consistent styling.
 *
 * Features:
 * - Full accessibility support (role="dialog", aria-modal, aria-labelledby, aria-describedby)
 * - Focus trapping with Tab/Shift+Tab cycling
 * - Return focus to trigger element on close
 * - Auto-focus first interactive element on open
 * - Escape key closes modal (configurable)
 * - Click backdrop to close (configurable)
 * - CSS animations for enter/exit transitions
 * - Portal rendering at document.body
 * - Body scroll lock when modal is open
 * - Three size variants: sm (400px), md (520px), lg (640px)
 * - Four severity levels: info, warning, danger, success
 *
 * @example
 * import { Modal, useModal } from '@UI/react/components/modals/Modal';
 * import { Icon, getIconComponent } from '@UI/react/components/common/Icon';
 *
 * function DeleteConfirmation({ itemName, onDelete }) {
 *   const { isOpen, open, close } = useModal();
 *
 *   const handleConfirm = () => {
 *     onDelete();
 *     close();
 *   };
 *
 *   return (
 *     <>
 *       <button onClick={open}>Delete</button>
 *       <Modal
 *         isOpen={isOpen}
 *         onClose={close}
 *         title="Delete Item?"
 *         icon="delete"
 *         severity="danger"
 *         size="sm"
 *         footer={
 *           <>
 *             <button className="btn btn--secondary" onClick={close}>Cancel</button>
 *             <button className="btn btn--danger" onClick={handleConfirm}>Delete</button>
 *           </>
 *         }
 *       >
 *         <p>Are you sure you want to delete "{itemName}"? This action cannot be undone.</p>
 *       </Modal>
 *     </>
 *   );
 * }
 */

import React, { useRef, useEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import ModalHeader from './ModalHeader';
import ModalContent from './ModalContent';
import ModalFooter from './ModalFooter';
import { useFocusTrap } from './useFocusTrap';
import './Modal.scss';

/**
 * @typedef {Object} ModalProps
 * @property {boolean} isOpen - Whether the modal is visible
 * @property {() => void} onClose - Callback when modal should close
 * @property {string} title - Modal title text
 * @property {React.ComponentType} [icon] - Lucide icon component
 * @property {'info'|'warning'|'danger'|'success'} [severity='info'] - Severity level
 * @property {'sm'|'md'|'lg'} [size='md'] - Modal width (400px|520px|640px)
 * @property {boolean} [showCloseButton=true] - Show X button in header
 * @property {boolean} [closeOnEscape=true] - Close when Escape pressed
 * @property {boolean} [closeOnBackdrop=true] - Close when backdrop clicked
 * @property {React.ReactNode} children - Modal content
 * @property {React.ReactNode} [footer] - Footer content (buttons)
 * @property {string} [className] - Additional CSS class
 * @property {string} [testId] - Data-testid for testing
 */

/**
 * Base Modal component for CIA Web.
 * Serves as the foundation for all modal dialogs in the application.
 *
 * @param {ModalProps} props - Component props
 * @returns {React.ReactPortal|null} Portal containing the modal, or null if not open
 */
function Modal({
    isOpen,
    onClose,
    title,
    icon,
    severity = 'info',
    size = 'md',
    showCloseButton = true,
    closeOnEscape = true,
    closeOnBackdrop = true,
    children,
    footer,
    className = '',
    testId
}) {
    // Generate unique IDs for accessibility
    const uniqueId = useId();
    const titleId = `modal-title-${uniqueId}`;
    const descriptionId = `modal-description-${uniqueId}`;

    // Refs for DOM elements
    const containerRef = useRef(null);

    // Focus trap hook
    const { returnFocus } = useFocusTrap(containerRef, isOpen);

    /**
     * Handles closing the modal.
     * Returns focus to the trigger element before calling onClose.
     */
    const handleClose = useCallback(() => {
        returnFocus();
        onClose();
    }, [returnFocus, onClose]);

    /**
     * Handles backdrop click.
     * Only closes if closeOnBackdrop is true.
     */
    const handleBackdropClick = useCallback((event) => {
        // Only close if clicking directly on the backdrop, not on the modal content
        if (event.target === event.currentTarget && closeOnBackdrop) {
            handleClose();
        }
    }, [closeOnBackdrop, handleClose]);

    /**
     * Handles keydown events for the modal.
     * Closes on Escape if closeOnEscape is true.
     */
    const handleKeyDown = useCallback((event) => {
        if (event.key === 'Escape' && closeOnEscape) {
            event.preventDefault();
            handleClose();
        }
    }, [closeOnEscape, handleClose]);

    /**
     * Prevents click propagation from modal container.
     * This ensures clicks inside the modal don't trigger backdrop close.
     */
    const handleContainerClick = useCallback((event) => {
        event.stopPropagation();
    }, []);

    // Effect: Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';

            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isOpen]);

    // Effect: Add escape key listener at document level
    useEffect(() => {
        if (isOpen && closeOnEscape) {
            document.addEventListener('keydown', handleKeyDown);
            return () => {
                document.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [isOpen, closeOnEscape, handleKeyDown]);

    // Don't render anything if modal is not open
    if (!isOpen) {
        return null;
    }

    // Build class names
    const modalClasses = [
        'modal',
        `modal--${size}`,
        `modal--${severity}`,
        className
    ].filter(Boolean).join(' ');

    // Render the modal content
    const modalContent = (
        <div
            className="modal__backdrop"
            onClick={handleBackdropClick}
            data-testid={testId ? `${testId}-backdrop` : undefined}
        >
            <div
                ref={containerRef}
                className={modalClasses}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                onClick={handleContainerClick}
                data-testid={testId}
            >
                <ModalHeader
                    title={title}
                    titleId={titleId}
                    icon={icon}
                    severity={severity}
                    showCloseButton={showCloseButton}
                    onClose={handleClose}
                />

                <ModalContent descriptionId={descriptionId}>
                    {children}
                </ModalContent>

                {footer && (
                    <ModalFooter>
                        {footer}
                    </ModalFooter>
                )}
            </div>
        </div>
    );

    // Render via portal to document.body
    return createPortal(modalContent, document.body);
}

export default Modal;