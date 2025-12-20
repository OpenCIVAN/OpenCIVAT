/**
 * @file WorkspaceSelector.jsx
 * @description Dropdown for selecting workspace with type indicators.
 *
 * Workspace Types:
 * - Project (Globe, blue) - Main project workspace
 * - Breakout (GitBranch, purple) - Breakout room workspace
 * - Personal (User, green) - Personal workspace
 */

import React from 'react';
import { Globe, GitBranch, User, ChevronDown, Plus } from 'lucide-react';
import { Dropdown } from '@UI/react/components/common/Dropdown';

import './WorkspaceSelector.scss';

const WORKSPACE_TYPES = {
    project: { icon: Globe, color: 'blue', label: 'Project' },
    breakout: { icon: GitBranch, color: 'purple', label: 'Breakout' },
    personal: { icon: User, color: 'green', label: 'Personal' },
};

/**
 * Workspace selector dropdown component.
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
    const typeConfig =
        WORKSPACE_TYPES[workspace?.type] || WORKSPACE_TYPES.project;
    const TypeIcon = typeConfig.icon;

    // Group workspaces by type
    const grouped = workspaces.reduce((acc, ws) => {
        const type = ws.type || 'project';
        if (!acc[type]) acc[type] = [];
        acc[type].push(ws);
        return acc;
    }, {});

    const handleSelect = (ws) => {
        onSelect?.(ws);
    };

    const handleCreate = () => {
        onCreate?.();
    };

    return (
        <Dropdown
            trigger={
                <button
                    className="workspace-selector"
                    data-color={typeConfig.color}
                    type="button"
                >
                    <TypeIcon size={16} className="workspace-selector__icon" />
                    <span className="workspace-selector__name">
                        {workspace?.name || 'Select Workspace'}
                    </span>
                    <ChevronDown size={14} />
                </button>
            }
            placement="bottom-start"
        >
            <div className="workspace-selector__dropdown">
                {Object.entries(WORKSPACE_TYPES).map(([type, config]) => {
                    const items = grouped[type] || [];
                    if (items.length === 0) return null;

                    const Icon = config.icon;
                    return (
                        <div key={type} className="workspace-selector__group">
                            <div
                                className="workspace-selector__group-header"
                                data-color={config.color}
                            >
                                <Icon size={12} />
                                {config.label}
                            </div>
                            {items.map((ws) => (
                                <button
                                    key={ws.id}
                                    className={`workspace-selector__item ${ws.id === workspace?.id ? 'active' : ''
                                        }`}
                                    onClick={() => handleSelect(ws)}
                                    type="button"
                                >
                                    {ws.name}
                                </button>
                            ))}
                        </div>
                    );
                })}

                {/* Show empty state if no workspaces */}
                {workspaces.length === 0 && (
                    <div className="workspace-selector__empty">
                        No workspaces available
                    </div>
                )}

                <div className="workspace-selector__footer">
                    <button
                        className="workspace-selector__create"
                        onClick={handleCreate}
                        type="button"
                    >
                        <Plus size={14} />
                        New Workspace
                    </button>
                </div>
            </div>
        </Dropdown>
    );
}

export default WorkspaceSelector;