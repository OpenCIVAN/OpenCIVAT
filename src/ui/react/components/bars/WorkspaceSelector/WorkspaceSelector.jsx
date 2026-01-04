/**
 * @file WorkspaceSelector.jsx
 * @description Tall dropdown for selecting workspace with type indicators.
 * 
 * ENHANCED VERSION - Matches design spec with:
 * - "Workspace" label above name
 * - Colored border based on workspace type
 * - Glassmorphism styling
 *
 * Workspace Types:
 * - Project (Globe, blue) - Main project workspace
 * - Breakout (GitBranch, purple) - Breakout room workspace
 * - Personal (User, green) - Personal workspace
 */

import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '@UI/react/components/atoms/Icon';

import './WorkspaceSelector.scss';

// =============================================================================
// CONSTANTS
// =============================================================================

const WORKSPACE_TYPES = {
    project: {
        icon: 'globe',
        color: 'blue',
        label: 'Project',
        rgb: '96, 165, 250',
    },
    breakout: {
        icon: 'gitBranch',
        color: 'purple',
        label: 'Breakout',
        rgb: '167, 139, 250',
    },
    personal: {
        icon: 'user',
        color: 'green',
        label: 'Personal',
        rgb: '74, 222, 128',
    },
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Workspace selector dropdown component.
 * Tall dropdown with label showing current workspace.
 *
 * @param {Object} props - Component props
 * @param {Object} [props.workspace] - Currently selected workspace
 * @param {Array} [props.workspaces] - List of available workspaces
 * @param {Function} [props.onSelect] - Callback when workspace is selected
 * @param {Function} [props.onCreate] - Callback to create new workspace
 */
export function WorkspaceSelector({
    workspace,
    workspaces = [],
    onSelect,
    onCreate,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Get type config for current workspace
    const typeConfig = WORKSPACE_TYPES[workspace?.type] || WORKSPACE_TYPES.project;
    const typeIcon = typeConfig.icon;

    // Close dropdown when clicking outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setIsOpen(false);
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // Group workspaces by type
    const grouped = workspaces.reduce((acc, ws) => {
        const type = ws.type || 'project';
        if (!acc[type]) acc[type] = [];
        acc[type].push(ws);
        return acc;
    }, {});

    const handleSelect = (ws) => {
        onSelect?.(ws);
        setIsOpen(false);
    };

    const handleCreate = () => {
        onCreate?.();
        setIsOpen(false);
    };

    // Style with CSS custom properties for workspace color
    const triggerStyle = {
        '--ws-color-rgb': typeConfig.rgb,
        '--ws-color': `rgb(${typeConfig.rgb})`,
    };

    return (
        <div className="workspace-selector" ref={containerRef}>
            {/* Trigger Button - Tall style with label */}
            <button
                className="workspace-selector__trigger"
                onClick={() => setIsOpen(!isOpen)}
                style={triggerStyle}
                type="button"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                <Icon name={typeIcon} size={14} className="workspace-selector__icon" />

                <div className="workspace-selector__info">
                    <span className="workspace-selector__label">Workspace</span>
                    <span className="workspace-selector__name">
                        {workspace?.name || 'Select Workspace'}
                    </span>
                </div>

                <Icon name="chevronDown"
                    size={12}
                    className={`workspace-selector__chevron ${isOpen ? 'workspace-selector__chevron--open' : ''}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="workspace-selector__dropdown" role="listbox">
                    {/* Project Workspaces */}
                    {grouped.project?.length > 0 && (
                        <div className="workspace-selector__section">
                            <div className="workspace-selector__section-header" data-color="blue">
                                <Icon name="globe" size={10} />
                                <span>Project Workspaces</span>
                            </div>
                            {grouped.project.map((ws) => {
                                const isActive = workspace?.id === ws.id;
                                return (
                                    <button
                                        key={ws.id}
                                        className={`workspace-selector__item ${isActive ? 'workspace-selector__item--active' : ''}`}
                                        onClick={() => handleSelect(ws)}
                                        type="button"
                                        role="option"
                                        aria-selected={isActive}
                                        style={{ '--ws-color-rgb': WORKSPACE_TYPES.project.rgb }}
                                    >
                                        <Icon name="globe" size={12} className="workspace-selector__item-icon" />
                                        <span className="workspace-selector__item-name">{ws.name}</span>
                                        {isActive && <Icon name="check" size={12} className="workspace-selector__item-check" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Breakout Workspaces */}
                    {grouped.breakout?.length > 0 && (
                        <div className="workspace-selector__section">
                            <div className="workspace-selector__section-header" data-color="purple">
                                <Icon name="gitBranch" size={10} />
                                <span>Breakout Rooms</span>
                            </div>
                            {grouped.breakout.map((ws) => {
                                const isActive = workspace?.id === ws.id;
                                return (
                                    <button
                                        key={ws.id}
                                        className={`workspace-selector__item ${isActive ? 'workspace-selector__item--active' : ''}`}
                                        onClick={() => handleSelect(ws)}
                                        type="button"
                                        role="option"
                                        aria-selected={isActive}
                                        style={{ '--ws-color-rgb': WORKSPACE_TYPES.breakout.rgb }}
                                    >
                                        <Icon name="gitBranch" size={12} className="workspace-selector__item-icon" />
                                        <span className="workspace-selector__item-name">{ws.name}</span>
                                        {isActive && <Icon name="check" size={12} className="workspace-selector__item-check" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Personal Workspaces */}
                    {grouped.personal?.length > 0 && (
                        <div className="workspace-selector__section">
                            <div className="workspace-selector__section-header" data-color="green">
                                <Icon name="user" size={10} />
                                <span>Personal</span>
                            </div>
                            {grouped.personal.map((ws) => {
                                const isActive = workspace?.id === ws.id;
                                return (
                                    <button
                                        key={ws.id}
                                        className={`workspace-selector__item ${isActive ? 'workspace-selector__item--active' : ''}`}
                                        onClick={() => handleSelect(ws)}
                                        type="button"
                                        role="option"
                                        aria-selected={isActive}
                                        style={{ '--ws-color-rgb': WORKSPACE_TYPES.personal.rgb }}
                                    >
                                        <Icon name="user" size={12} className="workspace-selector__item-icon" />
                                        <span className="workspace-selector__item-name">{ws.name}</span>
                                        {isActive && <Icon name="check" size={12} className="workspace-selector__item-check" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Empty State */}
                    {workspaces.length === 0 && (
                        <div className="workspace-selector__empty">
                            No workspaces available
                        </div>
                    )}

                    {/* Create Action */}
                    <div className="workspace-selector__actions">
                        <button
                            className="workspace-selector__create-btn"
                            onClick={handleCreate}
                            type="button"
                        >
                            <Icon name="add" size={12} />
                            <span>New Workspace</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default WorkspaceSelector;