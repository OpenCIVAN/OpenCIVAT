/**
 * @file FileContextMenu.jsx
 * @description Context menu for file actions.
 * Supports submenus for processing operations.
 *
 * @example
 * <FileContextMenu x={100} y={200} file={file} onClose={handleClose} onAction={handleAction} />
 */

import React, { useState, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@UI/react/components/common/Icon';
import { ui as log } from '@Utils/logger.js';
import { config } from '@Core/config/clientConfig.js';
import { getHandlerForFileType } from '@Core/instances/types/instanceTypesInit.js';

/**
 * @typedef {Object} FileContextMenuProps
 * @property {number} x - X position
 * @property {number} y - Y position
 * @property {Object} file - File object
 * @property {Function} onClose - Close handler
 * @property {Function} onAction - Action handler
 */

/**
 * Context menu component with submenu support.
 *
 * @param {FileContextMenuProps} props - Component props
 * @returns {React.ReactElement} The rendered context menu
 */
export const FileContextMenu = memo(function FileContextMenu({ x, y, onClose, onAction, file }) {
    const [activeSubmenu, setActiveSubmenu] = useState(null);
    const [operations, setOperations] = useState([]);
    const [loadingOps, setLoadingOps] = useState(false);

    // Fetch available operations when Process submenu is hovered
    useEffect(() => {
        if (activeSubmenu !== 'process' || !file) return;

        const fetchOperations = async () => {
            setLoadingOps(true);
            try {
                const handler = getHandlerForFileType(file.fileType);
                if (!handler) {
                    setOperations([]);
                    return;
                }

                const handlerType = handler.id || 'vtk';
                const url = new URL(`${config.apiBaseUrl}/compute/operations`);
                url.searchParams.set('handlerType', handlerType);
                url.searchParams.set('fileType', file.fileType);

                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    setOperations(data.operations || []);
                } else {
                    setOperations([]);
                }
            } catch (err) {
                log.error('Failed to fetch operations:', err);
                setOperations([]);
            } finally {
                setLoadingOps(false);
            }
        };

        fetchOperations();
    }, [activeSubmenu, file]);

    const menuItems = [
        { id: 'open', icon: 'eye', label: 'Load in Instance' },
        { id: 'info', icon: 'info', label: 'File Details...' },
        { divider: true },
        { id: 'process', icon: 'cpu', label: 'Process', hasSubmenu: true },
        { divider: true },
        { id: 'rename', icon: 'edit', label: 'Rename...' },
        { id: 'star', icon: 'star', label: file?.starred ? 'Unstar' : 'Star' },
    ];

    const handleMouseEnter = (itemId) => {
        if (itemId === 'process') {
            setActiveSubmenu('process');
        } else {
            setActiveSubmenu(null);
        }
    };

    return createPortal(
        <>
            <div className="context-menu-backdrop" onClick={onClose} />
            <div
                className="context-menu"
                style={{ top: y, left: x }}
                onClick={(e) => e.stopPropagation()}
            >
                {menuItems.map((item, index) =>
                    item.divider ? (
                        <div key={index} className="context-menu__divider" />
                    ) : (
                        <div
                            key={item.id}
                            className="context-menu__item-wrapper"
                            onMouseEnter={() => handleMouseEnter(item.id)}
                        >
                            <button
                                className={`context-menu__item ${item.hasSubmenu ? 'has-submenu' : ''}`}
                                onClick={() => {
                                    if (!item.hasSubmenu) {
                                        onAction(item.id, file);
                                        onClose();
                                    }
                                }}
                            >
                                <Icon name={item.icon} size={12} />
                                <span>{item.label}</span>
                                {item.hasSubmenu && (
                                    <Icon name="chevronRight" size={10} className="submenu-arrow" />
                                )}
                            </button>

                            {/* Process submenu */}
                            {item.id === 'process' && activeSubmenu === 'process' && (
                                <div className="context-menu__submenu">
                                    {loadingOps ? (
                                        <div className="context-menu__item context-menu__item--loading">
                                            <Icon name="loader" size={12} className="spin" />
                                            <span>Loading...</span>
                                        </div>
                                    ) : operations.length === 0 ? (
                                        <div className="context-menu__item context-menu__item--disabled">
                                            <span>No operations available</span>
                                        </div>
                                    ) : (
                                        operations.map((op) => (
                                            <button
                                                key={op.id}
                                                className="context-menu__item"
                                                onClick={() => {
                                                    onAction('process', file, op);
                                                    onClose();
                                                }}
                                            >
                                                <span>{op.name}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )
                )}
            </div>
        </>,
        document.body
    );
});

export default FileContextMenu;