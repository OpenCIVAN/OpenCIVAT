/**
 * @file ProjectInfo.jsx
 * @description View-only project information section.
 * Displays project details, stats, and owner info.
 */

import React from 'react';
import { Calendar, Users, DoorOpen, HardDrive, Crown } from 'lucide-react';
import '../SettingsTab.scss';

/**
 * Info row component
 */
function InfoRow({ icon: Icon, label, value }) {
    return (
        <div className="settings-tab__info-row">
            <Icon size={12} className="settings-tab__info-icon" />
            <span className="settings-tab__info-label">{label}</span>
            <span className="settings-tab__info-value">{value}</span>
        </div>
    );
}

/**
 * @typedef {Object} Project
 * @property {string} id - Project ID
 * @property {string} name - Project name
 * @property {string} description - Project description
 * @property {string} createdAt - Creation timestamp
 * @property {number} memberCount - Number of members
 * @property {number} roomCount - Number of rooms
 * @property {string} storageUsed - Storage usage
 * @property {Object} owner - Project owner
 */

/**
 * @typedef {Object} ProjectInfoProps
 * @property {Project} project - Project data
 */

/**
 * Project Information section component.
 *
 * @param {ProjectInfoProps} props - Component props
 * @returns {React.ReactElement} The rendered section
 */
export function ProjectInfo({ project }) {
    if (!project) {
        return (
            <div className="settings-tab__section settings-tab__section--empty">
                No project information available
            </div>
        );
    }

    const createdDate = new Date(project.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <div className="settings-tab__section">
            {/* Project header */}
            <div className="settings-tab__project-header">
                <h3 className="settings-tab__project-name">{project.name}</h3>
                {project.description && (
                    <p className="settings-tab__project-desc">{project.description}</p>
                )}
            </div>

            {/* Project stats */}
            <div className="settings-tab__info-grid">
                <InfoRow
                    icon={Calendar}
                    label="Created"
                    value={createdDate}
                />
                <InfoRow
                    icon={Users}
                    label="Members"
                    value={project.memberCount}
                />
                <InfoRow
                    icon={DoorOpen}
                    label="Rooms"
                    value={project.roomCount}
                />
                <InfoRow
                    icon={HardDrive}
                    label="Storage"
                    value={project.storageUsed}
                />
            </div>

            {/* Owner info */}
            {project.owner && (
                <div className="settings-tab__owner-info">
                    <Crown size={12} />
                    <span>Owned by</span>
                    <span className="settings-tab__owner-name">{project.owner.name}</span>
                </div>
            )}

            {/* Project ID (for support) */}
            <div className="settings-tab__project-id">
                <span className="settings-tab__id-label">Project ID:</span>
                <code className="settings-tab__id-value">{project.id}</code>
            </div>
        </div>
    );
}

export default ProjectInfo;