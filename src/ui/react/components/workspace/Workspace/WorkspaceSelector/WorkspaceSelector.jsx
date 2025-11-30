// src/ui/react/components/workspace/WorkspaceSelector.jsx
// Workspace selector dropdown component
//
// Allows switching between workspaces and creating new ones

import React, { useState, useCallback, useEffect } from 'react';
import { workspaceManager } from '@Core/data/managers/WorkspaceManager.js';
import { WorkspaceType } from '@Core/data/models/Workspace.js';
import { workspace as log } from '@Utils/logger.js';
import './WorkspaceSelector.scss';

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

    // Get workspace icon
    const getIcon = (type) => {
        switch (type) {
            case WorkspaceType.PERSONAL:
                return '👤';
            case WorkspaceType.PROJECT:
                return '📁';
            case WorkspaceType.BREAKOUT:
                return '💬';
            default:
                return '📋';
        }
    };

    // Get workspace type label
    const getTypeLabel = (type) => {
        switch (type) {
            case WorkspaceType.PERSONAL:
                return 'Personal';
            case WorkspaceType.PROJECT:
                return 'Project';
            case WorkspaceType.BREAKOUT:
                return 'Breakout';
            default:
                return 'Workspace';
        }
    };

    return (
        <div className="workspace-selector">
            {/* Selected workspace button */}
            <button
                className="workspace-selector__trigger"
                onClick={() => setIsOpen(!isOpen)}
            >
                {activeWorkspace ? (
                    <>
                        <span className="workspace-selector__icon">
                            {getIcon(activeWorkspace.type)}
                        </span>
                        <span className="workspace-selector__name">{activeWorkspace.name}</span>
                        <span className="workspace-selector__type">
                            {getTypeLabel(activeWorkspace.type)}
                        </span>
                    </>
                ) : (
                    <span className="workspace-selector__placeholder">Select Workspace</span>
                )}
                <span className="workspace-selector__arrow">{isOpen ? '▲' : '▼'}</span>
            </button>

            {/* Dropdown menu */}
            {isOpen && (
                <div className="workspace-selector__dropdown">
                    {/* Personal workspace */}
                    {workspaces.personal && (
                        <div className="workspace-selector__section">
                            <div className="workspace-selector__section-header">Personal</div>
                            <button
                                className={`workspace-selector__item ${activeWorkspace?.getEffectiveId() ===
                                    workspaces.personal.getEffectiveId()
                                    ? 'active'
                                    : ''
                                    }`}
                                onClick={() => handleSelect(workspaces.personal)}
                            >
                                <span className="workspace-selector__item-icon">👤</span>
                                <span className="workspace-selector__item-name">
                                    {workspaces.personal.name}
                                </span>
                            </button>
                        </div>
                    )}

                    {/* Project workspaces */}
                    {workspaces.projects.length > 0 && (
                        <div className="workspace-selector__section">
                            <div className="workspace-selector__section-header">Projects</div>
                            {workspaces.projects.map((project) => (
                                <button
                                    key={project.getEffectiveId()}
                                    className={`workspace-selector__item ${activeWorkspace?.getEffectiveId() === project.getEffectiveId()
                                        ? 'active'
                                        : ''
                                        }`}
                                    onClick={() => handleSelect(project)}
                                >
                                    <span className="workspace-selector__item-icon">📁</span>
                                    <span className="workspace-selector__item-name">{project.name}</span>
                                    <span className="workspace-selector__item-members">
                                        {project.members.length + 1} members
                                    </span>
                                </button>
                            ))}
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
                            + Create Workspace
                        </button>
                    </div>
                </div>
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