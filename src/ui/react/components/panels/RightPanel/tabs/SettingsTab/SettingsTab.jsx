/**
 * @file SettingsTab.jsx
 * @description Settings tab for the right panel.
 * Displays user preferences, project info, admin settings, and danger zone.
 *
 * @example
 * <SettingsTab workspaceId="ws-1" projectId="project-1" />
 */

import React from 'react';
import { Icon } from '@UI/react/components/common/Icon';
import {
    ResizableSectionsContainer,
    ResizableSection,
    useSectionStates,
} from '@UI/react/components/common/ResizableSections';
import { useSettingsTab } from './hooks/useSettingsTab';
import { YourPreferences } from './sections/YourPreferences';
import { ProjectInfo } from './sections/ProjectInfo';
import { AdminSettings } from './sections/AdminSettings';
import { DangerZone } from './sections/DangerZone';
import './SettingsTab.scss';

/**
 * @typedef {Object} SettingsTabProps
 * @property {string} [workspaceId] - Current workspace ID
 * @property {string} [projectId] - Current project ID
 */

/**
 * Settings tab panel content component.
 * Headless wrapper for SettingsTab that manages its own state.
 *
 * @param {SettingsTabProps} props - Component props
 * @returns {React.ReactElement} The rendered panel content
 */
export function SettingsPanelContent({ workspaceId, projectId }) {
    const settingsState = useSettingsTab(projectId);
    return <SettingsTab {...settingsState} workspaceId={workspaceId} />;
}

/**
 * @typedef {Object} SettingsTabInternalProps
 * @property {string} [workspaceId] - Current workspace ID
 * @property {Object} project - Project data
 * @property {string} userRole - Current user's role
 * @property {Object} roleConfig - Role configuration
 * @property {boolean} isAdmin - Whether user is admin or owner
 * @property {boolean} isOwner - Whether user is owner
 * @property {Object} preferences - User preferences
 * @property {Function} updatePreferences - Preference update handler
 * @property {boolean} loading - Loading state
 */

/**
 * Settings tab component.
 * Displays settings sections based on user role.
 *
 * @param {SettingsTabInternalProps} props - Component props
 * @returns {React.ReactElement} The rendered tab
 */
export function SettingsTab({
    workspaceId,
    project,
    userRole,
    roleConfig,
    isAdmin,
    isOwner,
    preferences,
    updatePreferences,
    loading,
}) {
    // Section states for resizable sections
    const { states: sectionStates, toggleSection } = useSectionStates({
        preferences: { expanded: true, flexGrow: 2 },
        project: { expanded: true, flexGrow: 1 },
        admin: { expanded: true, flexGrow: 1 },
        danger: { expanded: false, flexGrow: 1 },
    });

    if (loading) {
        return (
            <div className="settings-tab settings-tab--loading">
                <Icon name="loader" size={24} className="spin" />
            </div>
        );
    }

    return (
        <div className="settings-tab">
            <ResizableSectionsContainer
                className="settings-tab__sections"
                sectionStates={sectionStates}
                onSectionToggle={toggleSection}
            >
                <ResizableSection
                    id="preferences"
                    icon="user"
                    iconColorClass="icon-blue"
                    label="Your Preferences"
                >
                    <YourPreferences
                        preferences={preferences}
                        onUpdate={updatePreferences}
                    />
                </ResizableSection>

                <ResizableSection
                    id="project"
                    icon="building"
                    iconColorClass="icon-purple"
                    label="Project Info"
                >
                    <ProjectInfo project={project} />
                </ResizableSection>

                {isAdmin && (
                    <ResizableSection
                        id="admin"
                        icon="settings"
                        iconColorClass="icon-amber"
                        label="Admin Settings"
                    >
                        <AdminSettings
                            project={project}
                            roleConfig={roleConfig}
                        />
                    </ResizableSection>
                )}

                {isOwner && (
                    <ResizableSection
                        id="danger"
                        icon="alertTriangle"
                        iconColorClass="icon-red"
                        label="Danger Zone"
                    >
                        <DangerZone project={project} />
                    </ResizableSection>
                )}
            </ResizableSectionsContainer>
        </div>
    );
}

export default SettingsTab;