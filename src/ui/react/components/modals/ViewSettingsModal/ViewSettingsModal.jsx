/**
 * @file ViewSettingsModal.jsx
 * @description Comprehensive settings modal for ViewItem configuration.
 * Uses the base Modal component for consistent styling and behavior.
 *
 * Features:
 * - Inline name editing with double-click
 * - Quick action toggles (star, save state, lock)
 * - Multiple collapsible sections
 * - Sharing management
 * - Canvas size selection
 * - Link properties configuration
 * - Annotation display filters
 * - Display options
 * - Danger zone with delete
 *
 * @example
 * <ViewSettingsModal
 *   isOpen={showSettings}
 *   view={selectedView}
 *   dataset={viewDataset}
 *   onClose={() => setShowSettings(false)}
 *   onRename={handleRename}
 *   onTrash={handleDelete}
 * />
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    Settings,
    Folder,
    Globe,
    Save,
    RefreshCw,
    Lock,
    Users,
    Layers,
    ExternalLink,
    Maximize2,
    Link2,
    Camera,
    Filter,
    Palette,
    Target,
    Zap,
    MousePointer2,
    Move,
    Trash2,
    Copy,
    Pencil,
    X,
} from 'lucide-react';

import { Modal } from '@UI/react/components/modals/Modal';

import './ViewSettingsModal.scss';

// Link property configuration
const LINK_PROPERTIES = [
    { id: 'camera', icon: Camera, label: 'Link Camera', color: 'teal' },
    { id: 'filters', icon: Filter, label: 'Link Filters', color: 'purple' },
    { id: 'colorMap', icon: Palette, label: 'Link Color Map', color: 'pink' },
    { id: 'widgets', icon: Layers, label: 'Link Widgets', color: 'amber' },
    { id: 'cursor', icon: Target, label: 'Link Cursor', color: 'blue' },
];

export function ViewSettingsModal({
    isOpen,
    view,
    dataset,
    availableViews = [],
    sharedUsers = [],
    onClose,
    onRename,
    onStarWorkspace,
    onStarPersonal,
    onSaveState,
    onLoadState,
    onLock,
    onShare,
    onUpdateSharing,
    onSizeChange,
    onLinkPropertyChange,
    onAnnotationFilterChange,
    onDisplayOptionChange,
    onTrash,
}) {
    // Local state for editing
    const [isEditingName, setIsEditingName] = useState(false);
    const [editName, setEditName] = useState(view.name);
    const [localSharedUsers, setLocalSharedUsers] = useState(sharedUsers);
    const [newShareEmail, setNewShareEmail] = useState('');
    const nameInputRef = useRef(null);

    // Extract dataset info from view or dataset prop
    const datasetInfo = useMemo(() => {
        if (dataset && dataset.name && dataset.name !== 'Unknown') {
            return dataset;
        }

        // Try to extract from view name (e.g., "View of LungVessels.vtp" -> "LungVessels.vtp")
        let name = 'Unknown Dataset';
        if (view.datasetName) {
            name = view.datasetName;
        } else if (view.filename) {
            name = view.filename;
        } else if (view.name) {
            // Extract from "View of X" pattern
            const match = view.name.match(/^View of (.+)$/i);
            if (match) {
                name = match[1];
            } else {
                name = view.name;
            }
        }

        return {
            name,
            dimensions: view.dimensions || dataset?.dimensions || '---',
            size: view.size || dataset?.size || '---',
            type: view.instanceType || view.type || dataset?.type || 'VTK',
        };
    }, [view, dataset]);

    // Focus input when editing name
    useEffect(() => {
        if (isEditingName && nameInputRef.current) {
            nameInputRef.current.focus();
            nameInputRef.current.select();
        }
    }, [isEditingName]);

    // Handlers
    const handleNameSubmit = () => {
        if (editName.trim() && editName !== view.name) {
            onRename?.(editName.trim());
        } else {
            setEditName(view.name);
        }
        setIsEditingName(false);
    };

    const handleAddShare = () => {
        if (newShareEmail.trim()) {
            const newUser = {
                id: Date.now(),
                name: newShareEmail.split('@')[0],
                email: newShareEmail,
                role: 'Viewer',
            };
            const updated = [...localSharedUsers, newUser];
            setLocalSharedUsers(updated);
            onUpdateSharing?.(updated);
            setNewShareEmail('');
        }
    };

    const handleRemoveShare = (userId) => {
        const updated = localSharedUsers.filter(u => u.id !== userId);
        setLocalSharedUsers(updated);
        onUpdateSharing?.(updated);
    };

    const handleRoleChange = (userId, role) => {
        const updated = localSharedUsers.map(u =>
            u.id === userId ? { ...u, role } : u
        );
        setLocalSharedUsers(updated);
        onUpdateSharing?.(updated);
    };

    // ---------------------------------------------------------------------------
    // RENDER FOOTER
    // ---------------------------------------------------------------------------

    const renderFooter = () => (
        <button className="view-settings-modal__footer-btn" onClick={onClose}>
            Close
        </button>
    );

    // ---------------------------------------------------------------------------
    // RENDER
    // ---------------------------------------------------------------------------

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="View Settings"
            icon={Settings}
            size="md"
            footer={renderFooter()}
        >
            <div className="view-settings-modal">
                {/* Editable Name Section */}
                <div className="view-settings-modal__name-section">
                    {isEditingName ? (
                        <input
                            ref={nameInputRef}
                            type="text"
                            className="view-settings-modal__name-input"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={handleNameSubmit}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleNameSubmit();
                                if (e.key === 'Escape') {
                                    setEditName(view.name);
                                    setIsEditingName(false);
                                }
                            }}
                        />
                    ) : (
                        <div
                            className="view-settings-modal__name"
                            onDoubleClick={() => setIsEditingName(true)}
                            title="Double-click to rename"
                        >
                            <span>{editName}</span>
                            <Pencil size={10} className="view-settings-modal__name-hint" />
                        </div>
                    )}
                    <span className="view-settings-modal__subtitle">
                        {isEditingName ? 'Press Enter to save' : 'Double-click to rename'}
                    </span>
                </div>

                {/* Quick Actions Bar */}
                <div className="view-settings-modal__quick-actions">
                    <span className="view-settings-modal__quick-label">Quick Actions:</span>
                    <QuickToggle
                        icon={Folder}
                        label="Workspace"
                        active={view.starredWorkspace}
                        activeColor="purple"
                        onClick={onStarWorkspace}
                    />
                    <QuickToggle
                        icon={Globe}
                        label="Personal"
                        active={view.starredPersonal}
                        activeColor="amber"
                        onClick={onStarPersonal}
                    />
                    <div className="view-settings-modal__quick-divider" />
                    <QuickToggle
                        icon={Save}
                        label="Save State"
                        active={view.hasSavedState}
                        activeColor="amber"
                        onClick={onSaveState}
                    />
                    <QuickToggle
                        icon={RefreshCw}
                        label="Load State"
                        onClick={onLoadState}
                    />
                    <div className="view-settings-modal__quick-divider" />
                    <QuickToggle
                        icon={Lock}
                        label="Lock"
                        active={view.isLocked}
                        activeColor="amber"
                        onClick={onLock}
                    />
                </div>

                {/* Sections */}
                <div className="view-settings-modal__sections">
                    {/* Source Dataset */}
                    <ModalSection icon={Layers} title="Source Dataset">
                        <div className="view-settings-modal__dataset">
                            <div className="view-settings-modal__dataset-icon">
                                <Layers size={18} />
                            </div>
                            <div className="view-settings-modal__dataset-info">
                                <div className="view-settings-modal__dataset-name">
                                    {datasetInfo.name}
                                </div>
                                <div className="view-settings-modal__dataset-meta">
                                    {datasetInfo.dimensions} • {datasetInfo.size} • {datasetInfo.type}
                                </div>
                            </div>
                            <button className="view-settings-modal__dataset-btn">
                                <ExternalLink size={10} />
                                Open
                            </button>
                        </div>
                    </ModalSection>

                    {/* Sharing */}
                    <ModalSection
                        icon={Users}
                        title="Sharing"
                        badge={view.isShared ? `${localSharedUsers.length} people` : 'Private'}
                    >
                        {!view.isShared ? (
                            <div className="view-settings-modal__sharing-private">
                                <p>This view is private. Share it to collaborate.</p>
                                <button
                                    className="view-settings-modal__share-btn"
                                    onClick={onShare}
                                >
                                    <Users size={12} />
                                    Share View
                                </button>
                            </div>
                        ) : (
                            <div className="view-settings-modal__sharing">
                                {/* Add people */}
                                <div className="view-settings-modal__share-input-row">
                                    <input
                                        type="email"
                                        placeholder="Add people by email..."
                                        className="view-settings-modal__share-input"
                                        value={newShareEmail}
                                        onChange={(e) => setNewShareEmail(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddShare()}
                                    />
                                    <button
                                        className="view-settings-modal__share-add-btn"
                                        onClick={handleAddShare}
                                    >
                                        Add
                                    </button>
                                </div>

                                {/* Shared users list */}
                                <div className="view-settings-modal__share-list">
                                    {localSharedUsers.map(user => (
                                        <div key={user.id} className="view-settings-modal__share-user">
                                            <div
                                                className={`view-settings-modal__share-avatar ${user.isGroup ? 'view-settings-modal__share-avatar--group' : ''}`}
                                            >
                                                {user.avatar || user.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="view-settings-modal__share-user-info">
                                                <div className="view-settings-modal__share-user-name">{user.name}</div>
                                                <div className="view-settings-modal__share-user-email">{user.email}</div>
                                            </div>
                                            <select
                                                className="view-settings-modal__share-role"
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                            >
                                                <option value="Editor">Editor</option>
                                                <option value="Viewer">Viewer</option>
                                                <option value="Can Share">Can Share</option>
                                            </select>
                                            <button
                                                className="view-settings-modal__share-remove"
                                                onClick={() => handleRemoveShare(user.id)}
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    className="view-settings-modal__stop-sharing"
                                    onClick={() => {
                                        setLocalSharedUsers([]);
                                        onUpdateSharing?.([]);
                                    }}
                                >
                                    Stop Sharing (Make Private)
                                </button>
                            </div>
                        )}
                    </ModalSection>

                    {/* Canvas Size */}
                    <ModalSection icon={Maximize2} title="Canvas Size">
                        <div className="view-settings-modal__size-grid">
                            {[1, 2, 3].map(row =>
                                [1, 2, 3].map(col => (
                                    <button
                                        key={`${row}x${col}`}
                                        className={`view-settings-modal__size-btn ${row === (view.rowSpan || 1) && col === (view.colSpan || 1)
                                            ? 'view-settings-modal__size-btn--active'
                                            : ''
                                            }`}
                                        onClick={() => onSizeChange?.({ rows: row, cols: col })}
                                    >
                                        {row}×{col}
                                    </button>
                                ))
                            )}
                        </div>
                    </ModalSection>

                    {/* Link Properties */}
                    <ModalSection
                        icon={Link2}
                        title="Link Properties"
                        badge={view.linkedCount > 0 ? `${view.linkedCount} linked` : null}
                    >
                        <div className="view-settings-modal__links">
                            {LINK_PROPERTIES.map(prop => {
                                const Icon = prop.icon;
                                const linkConfig = view.linkConfig?.[prop.id] || {};
                                return (
                                    <div key={prop.id} className="view-settings-modal__link-row">
                                        <Icon size={12} data-color={prop.color} />
                                        <span className="view-settings-modal__link-label">{prop.label}</span>
                                        <select
                                            className="view-settings-modal__link-select"
                                            value={linkConfig.parentId || ''}
                                            onChange={(e) => onLinkPropertyChange?.(prop.id, {
                                                enabled: !!e.target.value,
                                                parentId: e.target.value || null,
                                            })}
                                        >
                                            <option value="">Not linked</option>
                                            {availableViews
                                                .filter(v => v.id !== view.id)
                                                .map(v => (
                                                    <option key={v.id} value={v.id}>{v.name}</option>
                                                ))
                                            }
                                        </select>
                                    </div>
                                );
                            })}
                        </div>
                    </ModalSection>

                    {/* Annotation Display */}
                    <ModalSection icon={Target} title="Annotation Display" badge="Dataset Level">
                        <div className="view-settings-modal__note view-settings-modal__note--info">
                            Annotations belong to the <strong>Dataset</strong>. This view can filter which annotations to display.
                        </div>
                        <div className="view-settings-modal__annotation-filters">
                            <ToggleRow
                                label="Show My Annotations"
                                checked={view.annotationFilters?.showMine !== false}
                                onChange={(checked) => onAnnotationFilterChange?.('showMine', checked)}
                            />
                            <ToggleRow
                                label="Show Team Annotations"
                                checked={view.annotationFilters?.showTeam !== false}
                                onChange={(checked) => onAnnotationFilterChange?.('showTeam', checked)}
                            />
                            <ToggleRow
                                label="Show Verified Only"
                                checked={view.annotationFilters?.verifiedOnly === true}
                                onChange={(checked) => onAnnotationFilterChange?.('verifiedOnly', checked)}
                            />
                        </div>
                        <div className="view-settings-modal__annotation-copy">
                            <span>Copy annotation filters from:</span>
                            <div className="view-settings-modal__annotation-copy-row">
                                <select className="view-settings-modal__annotation-select">
                                    <option>Select a view...</option>
                                    {availableViews
                                        .filter(v => v.id !== view.id)
                                        .map(v => (
                                            <option key={v.id} value={v.id}>{v.name}</option>
                                        ))
                                    }
                                </select>
                                <button className="view-settings-modal__annotation-copy-btn">
                                    <Copy size={10} />
                                    Copy
                                </button>
                            </div>
                        </div>
                    </ModalSection>

                    {/* Display Options (Handler-specific) */}
                    <ModalSection icon={Palette} title="Display Options" badge={view.instanceType || 'VTK'}>
                        <div className="view-settings-modal__note view-settings-modal__note--warning">
                            <Zap size={10} />
                            <span>Options from <strong>{view.instanceType || 'VTK'}InstanceHandler</strong> — varies by type</span>
                        </div>
                        <div className="view-settings-modal__display-options">
                            <ToggleRow
                                label="Show Grid Lines"
                                checked={view.displayOptions?.gridLines === true}
                                onChange={(checked) => onDisplayOptionChange?.('gridLines', checked)}
                            />
                            <ToggleRow
                                label="Orientation Widget"
                                checked={view.displayOptions?.orientationWidget !== false}
                                onChange={(checked) => onDisplayOptionChange?.('orientationWidget', checked)}
                            />
                            <div className="view-settings-modal__color-row">
                                <span>Background</span>
                                <div
                                    className="view-settings-modal__color-swatch"
                                    style={{ background: view.displayOptions?.background || '#1a1a1a' }}
                                />
                            </div>
                        </div>
                        <p className="view-settings-modal__hint">
                            Other instance types (2D Image, Chart, etc.) will show different options.
                        </p>
                    </ModalSection>

                    {/* Advanced (Stub) */}
                    <ModalSection icon={Zap} title="Advanced" badge="Stub">
                        <div className="view-settings-modal__advanced">
                            <div className="view-settings-modal__advanced-row">
                                <MousePointer2 size={12} />
                                <span>Cursor Style</span>
                                <select disabled>
                                    <option>Crosshair</option>
                                    <option>Sphere</option>
                                    <option>Ring</option>
                                </select>
                            </div>
                            <div className="view-settings-modal__advanced-row">
                                <Move size={12} />
                                <span>Interaction Mode</span>
                                <select disabled>
                                    <option>Trackball</option>
                                    <option>Flight</option>
                                    <option>2D Pan/Zoom</option>
                                </select>
                            </div>
                        </div>
                        <div className="view-settings-modal__note">
                            <strong>Future:</strong> Cursor style (3D cursor appearance), Interaction mode (how input maps to camera). May also be handler-specific.
                        </div>
                    </ModalSection>

                    {/* Danger Zone */}
                    <ModalSection icon={Trash2} title="Danger Zone">
                        <button className="view-settings-modal__delete-btn" onClick={onTrash}>
                            <Trash2 size={14} />
                            Delete View Permanently
                        </button>
                        <p className="view-settings-modal__delete-hint">
                            Moves to Recently Deleted for 30 days.
                        </p>
                    </ModalSection>
                </div>
            </div>
        </Modal>
    );
}

// Quick Toggle Button
function QuickToggle({ icon: Icon, label, active, activeColor, onClick }) {
    return (
        <button
            className={`view-settings-modal__quick-toggle ${active ? `view-settings-modal__quick-toggle--active view-settings-modal__quick-toggle--${activeColor}` : ''}`}
            onClick={onClick}
            title={label}
        >
            <Icon size={14} />
        </button>
    );
}

// Modal Section Component
function ModalSection({ icon: Icon, title, badge, children }) {
    return (
        <div className="view-settings-modal__section">
            <div className="view-settings-modal__section-header">
                <Icon size={14} className="view-settings-modal__section-icon" />
                <span className="view-settings-modal__section-title">{title}</span>
                {badge && (
                    <span className="view-settings-modal__section-badge">{badge}</span>
                )}
            </div>
            <div className="view-settings-modal__section-content">
                {children}
            </div>
        </div>
    );
}

// Toggle Row Component
function ToggleRow({ label, checked, onChange }) {
    return (
        <div className="view-settings-modal__toggle-row">
            <span>{label}</span>
            <button
                className={`view-settings-modal__toggle ${checked ? 'view-settings-modal__toggle--checked' : ''}`}
                onClick={() => onChange?.(!checked)}
            >
                <div className="view-settings-modal__toggle-knob" />
            </button>
        </div>
    );
}

export default ViewSettingsModal;