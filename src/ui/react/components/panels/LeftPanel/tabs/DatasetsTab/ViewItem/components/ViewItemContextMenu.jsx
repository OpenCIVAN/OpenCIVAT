/**
 * ViewItemContextMenu Component
 *
 * Right-click context menu for ViewItem actions.
 * Contains common actions with keyboard shortcuts.
 */

import React, { useRef, useEffect, useMemo } from 'react';
import {
    Navigation,
    LayoutGrid,
    Pencil,
    Copy,
    Settings,
    X,
    Trash2,
} from 'lucide-react';
import './ViewItemContextMenu.scss';

export function ViewItemContextMenu({
    view,
    position,
    isPlaced,
    onClose,
    onRename,
    onNavigate,
    onPlace,
    onDuplicate,
    onCloseView,
    onTrash,
    onOpenSettings,
}) {
    const menuRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };

        // Small delay to prevent immediate close from triggering click
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 10);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    // Close on escape
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    // Position the menu within viewport
    const style = useMemo(() => {
        const menuWidth = 200;
        const menuHeight = 300;

        let x = position.x;
        let y = position.y;

        // Keep in viewport
        if (x + menuWidth > window.innerWidth) {
            x = window.innerWidth - menuWidth - 8;
        }
        if (y + menuHeight > window.innerHeight) {
            y = window.innerHeight - menuHeight - 8;
        }
        if (x < 8) x = 8;
        if (y < 8) y = 8;

        return {
            position: 'fixed',
            left: x,
            top: y,
        };
    }, [position]);

    return (
        <div ref={menuRef} className="view-context-menu" style={style}>
            {/* Header */}
            <div className="view-context-menu__header">
                <span
                    className="view-context-menu__color-dot"
                    style={{ background: view.color || '#60a5fa' }}
                />
                <span className="view-context-menu__title">{view.name}</span>
            </div>

            <div className="view-context-menu__divider" />

            {/* Primary Action */}
            {isPlaced ? (
                <MenuItem
                    icon={Navigation}
                    label="Go to Location"
                    shortcut={view.position ? `[${view.position.row + 1},${view.position.col + 1}]` : null}
                    onClick={onNavigate}
                />
            ) : (
                <MenuItem
                    icon={LayoutGrid}
                    label="Place on Canvas"
                    primary
                    onClick={onPlace}
                />
            )}

            <div className="view-context-menu__divider" />

            {/* Edit Actions */}
            <MenuItem icon={Pencil} label="Rename" shortcut="F2" onClick={onRename} />
            <MenuItem icon={Copy} label="Duplicate View" onClick={onDuplicate} />
            <MenuItem icon={Settings} label="View Settings..." onClick={onOpenSettings} />

            <div className="view-context-menu__divider" />

            {/* Destructive Actions */}
            {isPlaced && (
                <MenuItem icon={X} label="Remove from Canvas" onClick={onCloseView} />
            )}
            <MenuItem icon={Trash2} label="Move to Trash" danger onClick={onTrash} />
        </div>
    );
}

// Menu Item Component
function MenuItem({ icon: Icon, label, shortcut, primary, danger, onClick }) {
    return (
        <button
            className={`view-context-menu__item ${primary ? 'view-context-menu__item--primary' : ''} ${danger ? 'view-context-menu__item--danger' : ''}`}
            onClick={onClick}
        >
            <Icon size={14} />
            <span>{label}</span>
            {shortcut && (
                <span className="view-context-menu__shortcut">{shortcut}</span>
            )}
        </button>
    );
}

export default ViewItemContextMenu;