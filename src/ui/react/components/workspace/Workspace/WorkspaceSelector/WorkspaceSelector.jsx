// src/ui/react/components/workspace/WorkspaceSelector.jsx
// Workspace selector dropdown component
//
// Allows switching between workspaces and creating new ones

import React, { useState, useCallback, useEffect } from 'react';
import { Globe, User, Briefcase, ChevronDown, Check, Plus } from 'lucide-react';
import { workspaceManager } from '@Core/data/managers/WorkspaceManager.js';
import { WorkspaceType } from '@Core/data/models/Workspace.js';
import { workspace as log } from '@Utils/logger.js';
import './WorkspaceSelector.scss';

// Helper to convert hex to RGB values
const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
        : '96, 165, 250';
};

// Workspace type configurations
const WORKSPACE_CONFIG = {
    [WorkspaceType.PERSONAL]: { icon: User, color: '#4ade80', colorRgb: '74, 222, 128', label: 'Personal' },
    [WorkspaceType.PROJECT]: { icon: Globe, color: '#60a5fa', colorRgb: '96, 165, 250', label: 'Project Rooms' },
    [WorkspaceType.BREAKOUT]: { icon: Briefcase, color: '#a78bfa', colorRgb: '167, 139, 250', label: 'Breakout' },
};

/**
 * WorkspaceSelector - Dropdown for workspace selection
 */
export function WorkspaceSelector({ userId, onWorkspaceChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const [workspaces, setWorkspaces] = useState({
        personal: null,
        projects: [],
    });
    const [activeWorkspace, setActiveWorkspace] = useState(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    // Load workspaces
    useEffect(() => {
        const loadData = async () => {
            const data = await workspaceManager.loadWorkspaces(userId);
            setWorkspaces(data);
            setActiveWorkspace(workspaceManager.getActiveWorkspace());
        };

        loadData();

        const unsubscribe = workspaceManager.subscribe((event, data) => {
            if (event.startsWith('workspace:')) {
                loadData();
            }
        });

        return unsubscribe;
    }, [userId]);

    // Handle workspace selection
    const handleSelect = useCallback(
        (workspace) => {
            workspaceManager.setActiveWorkspace(workspace.getEffectiveId());
            setActiveWorkspace(workspace);
            setIsOpen(false);
            if (onWorkspaceChange) {
                onWorkspaceChange(workspace);
            }
        },
        [onWorkspaceChange]
    );

    // Get workspace config
    const getConfig = (type) => {
        return WORKSPACE_CONFIG[type] || { icon: Globe, color: '#60a5fa', colorRgb: '96, 165, 250', label: 'Workspace' };
    };

    // Helper to create style object with both hex and RGB color variables
    const getColorStyle = (config) => ({
        '--ws-color': config.color,
        '--ws-color-rgb': config.colorRgb,
    });

    const currentConfig = activeWorkspace ? getConfig(activeWorkspace.type) : null;
    const CurrentIcon = currentConfig?.icon || Globe;

    return (
        <div className="workspace-selector">
            {/* Selected workspace button */}
            <button
                className="workspace-selector__trigger"
                onClick={() => setIsOpen(!isOpen)}
                style={currentConfig ? getColorStyle(currentConfig) : undefined}
            >
                {activeWorkspace ? (
                    <>
                        <CurrentIcon size={14} className="workspace-selector__icon" />
                        <div className="workspace-selector__info">
                            <span className="workspace-selector__label">Workspace</span>
                            <span className="workspace-selector__name">{activeWorkspace.name}</span>
                        </div>
                    </>
                ) : (
                    <span className="workspace-selector__placeholder">Select Workspace</span>
                )}
                <ChevronDown
                    size={12}
                    className={`workspace-selector__chevron ${isOpen ? 'workspace-selector__chevron--open' : ''}`}
                />
            </button>

            {/* Dropdown menu */}
            {isOpen && (
                <>
                    <div
                        className="workspace-selector__backdrop"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="workspace-selector__dropdown">
                        {/* Project workspaces */}
                        {workspaces.projects.length > 0 && (
                            <div className="workspace-selector__section">
                                <div className="workspace-selector__section-header">
                                    <Globe size={10} />
                                    <span>Project Rooms</span>
                                </div>
                                {workspaces.projects.map((project) => {
                                    const config = getConfig(project.type);
                                    const ItemIcon = config.icon;
                                    const isActive = activeWorkspace?.getEffectiveId() === project.getEffectiveId();

                                    return (
                                        <button
                                            key={project.getEffectiveId()}
                                            className={`workspace-selector__item ${isActive ? 'workspace-selector__item--active' : ''}`}
                                            onClick={() => handleSelect(project)}
                                            style={getColorStyle(config)}
                                        >
                                            <ItemIcon size={14} className="workspace-selector__item-icon" />
                                            <span className="workspace-selector__item-name">{project.name}</span>
                                            {isActive && <Check size={12} className="workspace-selector__item-check" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Personal workspace */}
                        {workspaces.personal && (
                            <div className="workspace-selector__section">
                                <div className="workspace-selector__section-header">
                                    <User size={10} />
                                    <span>Personal</span>
                                </div>
                                {(() => {
                                    const config = getConfig(workspaces.personal.type);
                                    const ItemIcon = config.icon;
                                    const isActive = activeWorkspace?.getEffectiveId() === workspaces.personal.getEffectiveId();

                                    return (
                                        <button
                                            className={`workspace-selector__item ${isActive ? 'workspace-selector__item--active' : ''}`}
                                            onClick={() => handleSelect(workspaces.personal)}
                                            style={getColorStyle(config)}
                                        >
                                            <ItemIcon size={14} className="workspace-selector__item-icon" />
                                            <span className="workspace-selector__item-name">
                                                {workspaces.personal.name}
                                            </span>
                                            {isActive && <Check size={12} className="workspace-selector__item-check" />}
                                        </button>
                                    );
                                })()}
                            </div>
                        )}

                        {/* Create new workspace */}
                        <div className="workspace-selector__actions">
                            <button
                                className="workspace-selector__create-btn"
                                onClick={() => {
                                    setShowCreateDialog(true);
                                    setIsOpen(false);
                                }}
                            >
                                <Plus size={12} />
                                <span>Create Workspace</span>
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Create dialog */}
            {showCreateDialog && (
                <CreateWorkspaceDialog
                    userId={userId}
                    onClose={() => setShowCreateDialog(false)}
                    onCreated={(workspace) => {
                        setShowCreateDialog(false);
                        handleSelect(workspace);
                    }}
                />
            )}
        </div>
    );
}

/**
 * CreateWorkspaceDialog - Dialog for creating new workspace
 */
function CreateWorkspaceDialog({ userId, onClose, onCreated }) {
    const [name, setName] = useState('');
    const [type, setType] = useState(WorkspaceType.PROJECT);
    const [description, setDescription] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsCreating(true);
        try {
            let workspace;
            if (type === WorkspaceType.PERSONAL) {
                workspace = await workspaceManager.createPersonalWorkspace(userId, name.trim());
            } else {
                workspace = await workspaceManager.createProjectWorkspace(
                    name.trim(),
                    userId,
                    description.trim()
                );
            }
            onCreated(workspace);
        } catch (err) {
            log.error('Failed to create workspace:', err);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="create-workspace-dialog__overlay" onClick={onClose}>
            <div
                className="create-workspace-dialog"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="create-workspace-dialog__header">
                    <h3>Create Workspace</h3>
                    <button onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleCreate}>
                    <div className="create-workspace-dialog__body">
                        <div className="create-workspace-dialog__field">
                            <label>Type</label>
                            <div className="create-workspace-dialog__type-options">
                                <button
                                    type="button"
                                    className={type === WorkspaceType.PROJECT ? 'active' : ''}
                                    onClick={() => setType(WorkspaceType.PROJECT)}
                                >
                                    📁 Project
                                </button>
                                <button
                                    type="button"
                                    className={type === WorkspaceType.PERSONAL ? 'active' : ''}
                                    onClick={() => setType(WorkspaceType.PERSONAL)}
                                >
                                    👤 Personal
                                </button>
                            </div>
                        </div>

                        <div className="create-workspace-dialog__field">
                            <label>Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Workspace name..."
                                autoFocus
                            />
                        </div>

                        {type === WorkspaceType.PROJECT && (
                            <div className="create-workspace-dialog__field">
                                <label>Description (optional)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="What is this workspace for?"
                                    rows={3}
                                />
                            </div>
                        )}
                    </div>

                    <div className="create-workspace-dialog__footer">
                        <button type="button" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" disabled={!name.trim() || isCreating}>
                            {isCreating ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default WorkspaceSelector;