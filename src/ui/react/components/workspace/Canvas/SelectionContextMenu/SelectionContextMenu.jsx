// src/ui/react/components/workspace/Canvas/SelectionContextMenu/SelectionContextMenu.jsx
// Context menu for selected cells per Canvas Area Design Specification
//
// Shows on right-click when cells are selected
// Menu Options:
// - Swap (2 views only), Merge Cells, Align (Left/Right/Top/Bottom)
// - Copy Layout, Save as Bookmark, Link Selected
// - Close All, Delete All (with confirmation)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    ArrowLeftRight,
    Combine,
    AlignLeft,
    AlignRight,
    AlignStartVertical,
    AlignEndVertical,
    Copy,
    Bookmark,
    Link,
    X,
    Trash2,
} from 'lucide-react';
import './SelectionContextMenu.scss';

/**
 * SelectionContextMenu - Context menu for cell selection operations
 */
export function SelectionContextMenu({
    isOpen,
    position,  // { x, y } - screen coordinates
    selectedCells,  // Array of { row, col, placement? }
    onClose,
    onSwap,
    onMerge,
    onAlign,
    onCopyLayout,
    onSaveBookmark,
    onLinkSelected,
    onCloseAll,
    onDeleteAll,
}) {
    const menuRef = useRef(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const selectedCount = selectedCells?.length || 0;
    const hasViews = selectedCells?.some(c => c.placement?.content?.type === 'view');
    const viewCount = selectedCells?.filter(c => c.placement?.content?.type === 'view').length || 0;

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose?.();
            }
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose?.();
            }
        };

        // Small delay to prevent immediate close from right-click
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }, 10);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    // Adjust position to keep menu in viewport
    const adjustedPosition = useCallback(() => {
        if (!position || !menuRef.current) return position;

        const menu = menuRef.current;
        const menuRect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let { x, y } = position;

        // Adjust horizontal position
        if (x + menuRect.width > viewportWidth - 8) {
            x = viewportWidth - menuRect.width - 8;
        }

        // Adjust vertical position
        if (y + menuRect.height > viewportHeight - 8) {
            y = viewportHeight - menuRect.height - 8;
        }

        return { x: Math.max(8, x), y: Math.max(8, y) };
    }, [position]);

    if (!isOpen || !position) return null;

    const handleDeleteClick = () => {
        if (showDeleteConfirm) {
            onDeleteAll?.();
            onClose?.();
        } else {
            setShowDeleteConfirm(true);
        }
    };

    const pos = adjustedPosition();

    return (
        <>
            {/* Backdrop */}
            <div className="selection-context-menu__backdrop" onClick={onClose} />

            {/* Menu */}
            <div
                ref={menuRef}
                className="selection-context-menu"
                style={{
                    left: pos?.x,
                    top: pos?.y,
                }}
            >
                {/* Header */}
                <div className="selection-context-menu__header">
                    <span className="selection-context-menu__count">
                        {selectedCount} cell{selectedCount !== 1 ? 's' : ''} selected
                    </span>
                    {viewCount > 0 && (
                        <span className="selection-context-menu__view-count">
                            ({viewCount} view{viewCount !== 1 ? 's' : ''})
                        </span>
                    )}
                </div>

                <div className="selection-context-menu__divider" />

                {/* Arrangement Section */}
                <div className="selection-context-menu__section">
                    {/* Swap - only for exactly 2 views */}
                    <button
                        className="selection-context-menu__item"
                        disabled={viewCount !== 2}
                        onClick={() => {
                            onSwap?.();
                            onClose?.();
                        }}
                    >
                        <ArrowLeftRight size={14} />
                        <span>Swap Positions</span>
                        {viewCount !== 2 && <span className="selection-context-menu__hint">2 views</span>}
                    </button>

                    {/* Merge Cells */}
                    <button
                        className="selection-context-menu__item"
                        disabled={selectedCount < 2}
                        onClick={() => {
                            onMerge?.();
                            onClose?.();
                        }}
                    >
                        <Combine size={14} />
                        <span>Merge Cells</span>
                    </button>

                    {/* Align submenu */}
                    <div className="selection-context-menu__submenu-container">
                        <button className="selection-context-menu__item" disabled={selectedCount < 2}>
                            <AlignLeft size={14} />
                            <span>Align</span>
                            <span className="selection-context-menu__arrow">▶</span>
                        </button>
                        <div className="selection-context-menu__submenu">
                            <button
                                className="selection-context-menu__item"
                                onClick={() => { onAlign?.('left'); onClose?.(); }}
                            >
                                <AlignLeft size={14} />
                                <span>Left</span>
                            </button>
                            <button
                                className="selection-context-menu__item"
                                onClick={() => { onAlign?.('right'); onClose?.(); }}
                            >
                                <AlignRight size={14} />
                                <span>Right</span>
                            </button>
                            <button
                                className="selection-context-menu__item"
                                onClick={() => { onAlign?.('top'); onClose?.(); }}
                            >
                                <AlignStartVertical size={14} />
                                <span>Top</span>
                            </button>
                            <button
                                className="selection-context-menu__item"
                                onClick={() => { onAlign?.('bottom'); onClose?.(); }}
                            >
                                <AlignEndVertical size={14} />
                                <span>Bottom</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="selection-context-menu__divider" />

                {/* Actions Section */}
                <div className="selection-context-menu__section">
                    <button
                        className="selection-context-menu__item"
                        onClick={() => {
                            onCopyLayout?.();
                            onClose?.();
                        }}
                    >
                        <Copy size={14} />
                        <span>Copy Layout</span>
                    </button>

                    <button
                        className="selection-context-menu__item"
                        onClick={() => {
                            onSaveBookmark?.();
                            onClose?.();
                        }}
                    >
                        <Bookmark size={14} />
                        <span>Save as Bookmark</span>
                    </button>

                    <button
                        className="selection-context-menu__item"
                        disabled={viewCount < 2}
                        onClick={() => {
                            onLinkSelected?.();
                            onClose?.();
                        }}
                    >
                        <Link size={14} />
                        <span>Link Selected</span>
                        {viewCount < 2 && <span className="selection-context-menu__hint">2+ views</span>}
                    </button>
                </div>

                <div className="selection-context-menu__divider" />

                {/* Danger Section */}
                <div className="selection-context-menu__section">
                    <button
                        className="selection-context-menu__item"
                        disabled={viewCount === 0}
                        onClick={() => {
                            onCloseAll?.();
                            onClose?.();
                        }}
                    >
                        <X size={14} />
                        <span>Close All Views</span>
                    </button>

                    <button
                        className={`selection-context-menu__item selection-context-menu__item--danger ${showDeleteConfirm ? 'selection-context-menu__item--confirm' : ''}`}
                        disabled={viewCount === 0}
                        onClick={handleDeleteClick}
                    >
                        <Trash2 size={14} />
                        <span>{showDeleteConfirm ? 'Click again to confirm' : 'Delete All Views'}</span>
                    </button>
                </div>
            </div>
        </>
    );
}

export default SelectionContextMenu;