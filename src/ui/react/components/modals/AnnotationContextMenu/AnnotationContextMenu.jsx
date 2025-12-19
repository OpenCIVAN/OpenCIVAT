// AnnotationContextMenu.jsx
// Context menu for annotation actions (edit, move, delete)

import React, { useEffect, useRef, useCallback } from 'react';
import { Edit3, Move, Trash2, Eye, EyeOff, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import './AnnotationContextMenu.scss';

export function AnnotationContextMenu({
    isOpen,
    onClose,
    annotation,
    screenPosition = { x: 0, y: 0 },
    onEdit,
    onMove,
    onDelete,
    onToggleVisibility,
}) {
    const menuRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        // Delay adding listener to prevent immediate close
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }, 10);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    // Handle menu item click
    const handleAction = useCallback((action) => {
        action?.();
        onClose();
    }, [onClose]);

    if (!isOpen || !annotation) return null;

    const isVisible = annotation.visible !== false;

    // Position the menu, ensuring it stays within viewport
    const menuStyle = {
        left: Math.min(screenPosition.x, window.innerWidth - 180),
        top: Math.min(screenPosition.y, window.innerHeight - 200),
    };

    const content = (
        <div
            ref={menuRef}
            className="annotation-context-menu"
            style={menuStyle}
        >
            <div className="annotation-context-menu__header">
                <span className="annotation-context-menu__title">
                    {annotation.label || annotation.text?.substring(0, 20) || 'Annotation'}
                </span>
                <button
                    className="annotation-context-menu__close"
                    onClick={onClose}
                >
                    <X size={12} />
                </button>
            </div>

            <div className="annotation-context-menu__items">
                <button
                    className="annotation-context-menu__item"
                    onClick={() => handleAction(onEdit)}
                >
                    <Edit3 size={14} />
                    <span>Edit</span>
                </button>

                <button
                    className="annotation-context-menu__item"
                    onClick={() => handleAction(onMove)}
                >
                    <Move size={14} />
                    <span>Move</span>
                </button>

                <button
                    className="annotation-context-menu__item"
                    onClick={() => handleAction(onToggleVisibility)}
                >
                    {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                    <span>{isVisible ? 'Hide' : 'Show'}</span>
                </button>

                <div className="annotation-context-menu__divider" />

                <button
                    className="annotation-context-menu__item annotation-context-menu__item--danger"
                    onClick={() => handleAction(onDelete)}
                >
                    <Trash2 size={14} />
                    <span>Delete</span>
                </button>
            </div>
        </div>
    );

    return createPortal(content, document.body);
}

export default AnnotationContextMenu;